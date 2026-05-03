import { getTextureData } from './data';

export interface Pin {
  lat: number;
  long: number;
  char?: string;
  size?: number;
}

export interface GlobeOptions {
  size?: number;
  land?: string;
  water?: string;
  background?: string;
  margin?: number;
  marginBlock?: number;
  marginInline?: number;
  pin?: string;
  pinSize?: number;
  pins?: Pin[];
  format?: (type: number, length: number) => string;
}

const INV_PI = 1 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;
const HYST_HI = 176;
const HYST_LO = 80;

export default class Globe {
  private cols: number;
  private rows: number;
  private radius: number;
  private aspect = 2.0;
  private land: string;
  private water: string;
  private background: string;
  private marginBlock: number;
  private marginInline: number;
  private pinChar: string;
  private pinSize: number;
  private pins: Pin[];
  private formatFn?: (type: number, length: number) => string;
  private texW: number;
  private texH: number;
  private texMask: Uint8Array;
  private prevLand: Uint8Array;

  constructor(options: GlobeOptions = {}) {
    const size = options.size ?? 1.4;
    this.land = options.land ?? '#';
    this.water = options.water ?? '-';
    this.background = options.background ?? ' ';
    const m = options.margin ?? 0;
    this.marginBlock = options.marginBlock ?? m;
    this.marginInline = options.marginInline ?? m;
    this.pinChar = options.pin ?? '@';
    this.pinSize = options.pinSize ?? 1;
    this.pins = options.pins ?? [];
    this.formatFn = options.format;

    this.cols = Math.round(120 * size);
    this.rows = Math.round(60 * size);
    this.radius = 27 * size;

    const tex = getTextureData();
    this.texW = tex.width;
    this.texH = tex.height;
    this.texMask = tex.mask;
    this.prevLand = new Uint8Array(this.cols * this.rows);
  }

  render(rotation: number | [number, number]): string {
    const rotH = Array.isArray(rotation) ? rotation[0] : rotation;
    const rotV = Array.isArray(rotation) ? rotation[1] : 0;
    const angleH = ((rotH % 360) + 360) % 360 * DEG_TO_RAD;
    const angleV = ((-rotV % 360) + 360) % 360 * DEG_TO_RAD;
    const cosA = Math.cos(angleH);
    const sinA = Math.sin(angleH);
    const cosB = Math.cos(angleV);
    const sinB = Math.sin(angleV);
    const cx = this.cols * 0.5;
    const cy = this.rows * 0.5;
    const invR = 1 / this.radius;
    const { cols, rows, texW, texH, texMask, prevLand, land, water, background, aspect, pins, pinChar, pinSize, formatFn } = this;
    const baseThreshold = 1.5 / this.radius;
    const pinsRad = pins.map(p => ({
      lat: p.lat * DEG_TO_RAD,
      long: p.long * DEG_TO_RAD,
      char: p.char ?? pinChar,
      threshold: baseThreshold * (p.size ?? pinSize),
    }));

    const grid = new Uint8Array(rows * cols);

    for (let row = 0; row < rows; row++) {
      const sy = (cy - row) * invR * aspect;
      const sy2 = sy * sy;

      for (let col = 0; col < cols; col++) {
        const sx = (col - cx) * invR;
        const r2 = sx * sx + sy2;

        if (r2 > 1) {
          continue;
        }

        const sz = Math.sqrt(1 - r2);

        // X-axis rotation (vertical tilt)
        const rx = sx;
        const ry = sy * cosB - sz * sinB;
        const rz = sy * sinB + sz * cosB;

        // Y-axis rotation (horizontal)
        const wx = rx * cosA - rz * sinA;
        const wy = ry;
        const wz = rx * sinA + rz * cosA;

        const lon = Math.atan2(-wz, wx);
        const lat = Math.asin(wy < -1 ? -1 : wy > 1 ? 1 : wy);

        const uf = ((lon * INV_PI) * 0.5 + 0.5) * texW;
        const vf = (0.5 - lat * INV_PI) * texH;

        let u0 = uf | 0;
        let v0 = vf | 0;
        const ufrac = uf - u0;
        const vfrac = vf - v0;

        let u1 = u0 + 1;
        if (u0 < 0) u0 += texW; else if (u0 >= texW) u0 -= texW;
        if (u1 < 0) u1 += texW; else if (u1 >= texW) u1 -= texW;
        let v1 = v0 + 1;
        if (v0 < 0) v0 = 0; else if (v0 >= texH) v0 = texH - 1;
        if (v1 < 0) v1 = 0; else if (v1 >= texH) v1 = texH - 1;

        const m00 = texMask[v0 * texW + u0];
        const m01 = texMask[v0 * texW + u1];
        const m10 = texMask[v1 * texW + u0];
        const m11 = texMask[v1 * texW + u1];

        const a = m00 + (m01 - m00) * ufrac;
        const b = m10 + (m11 - m10) * ufrac;
        const interp = a + (b - a) * vfrac;

        const cellIdx = row * cols + col;
        const prev = prevLand[cellIdx];
        const threshold = prev ? HYST_LO : HYST_HI;
        prevLand[cellIdx] = interp >= threshold ? 1 : 0;

        let cellType = prevLand[cellIdx] ? 2 : 1;
        for (let p = 0; p < pinsRad.length; p++) {
          const pin = pinsRad[p];
          const dLat = lat - pin.lat;
          let dLon = lon - pin.long;
          if (dLon > Math.PI) dLon -= 2 * Math.PI;
          if (dLon < -Math.PI) dLon += 2 * Math.PI;
          const lonScaled = dLon * (Math.cos(pin.lat) || 0.01);
          if (dLat * dLat + lonScaled * lonScaled < pin.threshold * pin.threshold) {
            cellType = 3 + p;
            break;
          }
        }
        grid[cellIdx] = cellType;
      }
    }

    const radV = this.radius / aspect;
    const mi = this.marginInline;
    const mb = this.marginBlock;
    const left = Math.max(0, Math.ceil(cx - this.radius) - mi);
    const right = Math.min(cols, Math.floor(cx + this.radius) + 1 + mi);
    const top = Math.max(0, Math.ceil(cy - radV) - mb);
    const bottom = Math.min(rows, Math.floor(cy + radV) + 1 + mb);

    const out: string[] = [];

    if (formatFn) {
      for (let row = top; row < bottom; row++) {
        let line = '';
        let runType = grid[row * cols + left];
        let runLen = 1;
        for (let col = left + 1; col < right; col++) {
          const t = grid[row * cols + col];
          if (t === runType) {
            runLen++;
          } else {
            line += formatFn(runType, runLen);
            runType = t;
            runLen = 1;
          }
        }
        line += formatFn(runType, runLen);
        out.push(line);
      }
    } else {
      for (let row = top; row < bottom; row++) {
        let line = '';
        for (let col = left; col < right; col++) {
          const t = grid[row * cols + col];
          if (t === 0) line += background;
          else if (t === 1) line += water;
          else if (t === 2) line += land;
          else line += pinsRad[t - 3].char;
        }
        out.push(line);
      }
    }

    return out.join('\n');
  }
}
