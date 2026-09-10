import { decodeTextureData } from './decode';
import defaultMap from './maps/earth';

export interface Pin {
  lat: number;
  long: number;
  char?: string;
  size?: number;
}

export interface GlobeOptions {
  size?: number;
  map?: string;
  land?: string;
  water?: string;
  background?: string;
  margin?: number;
  marginBlock?: number;
  marginInline?: number;
  padding?: number;
  border?: string;
  borderWidth?: number;
  pin?: string;
  pinSize?: number;
  pins?: Pin[];
  tilt?: number;
  speed?: number;
  format?: (type: number, length: number) => string;
}

const INV_PI = 1 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;
const HYST_HI = 176;
const HYST_LO = 80;

export default class Globe {
  static maps: Record<string, string> = {
    earth: defaultMap,
  };

  private cols: number;
  private rows: number;
  private radius: number;
  private aspect = 2.0;
  private land: string;
  private water: string;
  private background: string;
  private marginBlock: number;
  private marginInline: number;
  private padding: number;
  private border: string;
  private borderWidth: number;
  private pinChar: string;
  private pinSize: number;
  private pins: Pin[];
  private formatFn?: (type: number, length: number) => string;
  private cosC: number;
  private sinC: number;
  tilt: number;
  speed: number;
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
    this.padding = options.padding ?? 0;
    this.border = options.border ?? '#';
    this.borderWidth = options.borderWidth ?? 0;
    this.pinChar = options.pin ?? '@';
    this.pinSize = options.pinSize ?? 1;
    this.pins = options.pins ?? [];
    this.formatFn = options.format;
    this.tilt = options.tilt ?? 0;
    this.speed = options.speed ?? 0.7;
    const angleT = this.tilt * DEG_TO_RAD;
    this.cosC = Math.cos(angleT);
    this.sinC = Math.sin(angleT);

    this.cols = Math.round(120 * size);
    this.rows = Math.round(60 * size);
    this.radius = 27 * size;

    const tex = decodeTextureData(options.map ?? defaultMap);
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
    const { cols, rows, texW, texH, texMask, prevLand, land, water, background, border, padding, borderWidth, aspect, pins, pinChar, pinSize, formatFn, cosC, sinC } = this;
    const baseThreshold = 1.5 / this.radius;
    const pinsRad = pins.map(p => ({
      lat: p.lat * DEG_TO_RAD,
      long: p.long * DEG_TO_RAD,
      char: p.char ?? pinChar,
      threshold: baseThreshold * (p.size ?? pinSize),
    }));

    const hasPadding = padding > 0;
    const hasBorder = borderWidth > 0;

    let nextType = 1;
    const borderType = hasBorder ? nextType++ : -1;
    const paddingType = hasPadding ? nextType++ : -1;
    const waterType = nextType++;
    const landType = nextType++;
    const pinsStartType = nextType;

    const paddingOuterR = 1 + (hasPadding ? padding / this.radius : 0);
    const borderOuterR = paddingOuterR + (hasBorder ? borderWidth / this.radius : 0);
    const paddingOuterR2 = paddingOuterR * paddingOuterR;
    const borderOuterR2 = borderOuterR * borderOuterR;

    // Each character cell spans a rectangle in normalized (sx, sy) space, and that
    // rectangle is taller than it is wide (rows are spaced `aspect` times farther
    // apart than columns) since aspect-correction is what makes the globe look
    // circular despite non-square character cells. A thin ring tested only at the
    // pixel's center point can fall entirely between two rows near the top/bottom
    // pole, since the row step there covers more radial distance than the ring is
    // thick. The fallback below tests the cell's nearest corner to the center
    // instead of just its own center point, so it still catches the ring there.
    const halfCellX = invR * 0.5;
    const halfCellY = invR * aspect * 0.5;

    const grid = new Uint8Array(rows * cols);

    for (let row = 0; row < rows; row++) {
      const sy = (cy - row) * invR * aspect;
      const sy2 = sy * sy;

      for (let col = 0; col < cols; col++) {
        const sx = (col - cx) * invR;
        const r2 = sx * sx + sy2;

        if (r2 > 1) {
          if (r2 <= borderOuterR2) {
            // The cell center unambiguously falls in the padding or border band.
            if (r2 <= paddingOuterR2) {
              if (paddingType >= 0) grid[row * cols + col] = paddingType;
            } else if (borderType >= 0) {
              grid[row * cols + col] = borderType;
            }
          } else if (borderType >= 0 || paddingType >= 0) {
            // The cell center reads as background, but near the poles a single row
            // can be taller (in radial terms) than the whole ring, so its center may
            // skip over a thin band entirely. Check whether the cell's footprint
            // (nearest corner) still dips into it, preferring border since it's the
            // outer, visible edge of the ring.
            const nearX = Math.max(Math.abs(sx) - halfCellX, 0);
            const nearY = Math.max(Math.abs(sy) - halfCellY, 0);
            const rMin2 = nearX * nearX + nearY * nearY;

            if (borderType >= 0 && rMin2 <= borderOuterR2) {
              grid[row * cols + col] = borderType;
            } else if (paddingType >= 0 && rMin2 <= paddingOuterR2) {
              grid[row * cols + col] = paddingType;
            }
          }
          continue;
        }

        const sz = Math.sqrt(1 - r2);

        // X-axis rotation (vertical)
        const rx = sx;
        const ry = sy * cosB - sz * sinB;
        const rz = sy * sinB + sz * cosB;

        // Z-axis rotation (axial tilt)
        const tx = rx * cosC - ry * sinC;
        const ty = rx * sinC + ry * cosC;
        const tz = rz;

        // Y-axis rotation (horizontal)
        const wx = tx * cosA - tz * sinA;
        const wy = ty;
        const wz = tx * sinA + tz * cosA;

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

        let cellType = prevLand[cellIdx] ? landType : waterType;
        for (let p = 0; p < pinsRad.length; p++) {
          const pin = pinsRad[p];
          const dLat = lat - pin.lat;
          let dLon = lon - pin.long;
          if (dLon > Math.PI) dLon -= 2 * Math.PI;
          if (dLon < -Math.PI) dLon += 2 * Math.PI;
          const lonScaled = dLon * (Math.cos(pin.lat) || 0.01);
          if (dLat * dLat + lonScaled * lonScaled < pin.threshold * pin.threshold) {
            cellType = pinsStartType + p;
            break;
          }
        }
        grid[cellIdx] = cellType;
      }
    }

    const outerRadius = this.radius * borderOuterR;
    const outerRadV = outerRadius / aspect;
    // The pole-gap fallback above can classify a cell as border/padding even when its
    // center sits up to half a cell outside outerRadius/outerRadV, so the crop must be
    // widened by a matching margin or that cap row/column gets cut from the output.
    const coverageMargin = borderType >= 0 || paddingType >= 0 ? 1 : 0;
    const mi = this.marginInline;
    const mb = this.marginBlock;
    const left = Math.max(0, Math.ceil(cx - outerRadius) - mi - coverageMargin);
    const right = Math.min(cols, Math.floor(cx + outerRadius) + 1 + mi + coverageMargin);
    const top = Math.max(0, Math.ceil(cy - outerRadV) - mb - coverageMargin);
    const bottom = Math.min(rows, Math.floor(cy + outerRadV) + 1 + mb + coverageMargin);

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
      const charFor: string[] = [background];
      if (hasBorder) charFor[borderType] = border || background;
      if (hasPadding) charFor[paddingType] = background;
      charFor[waterType] = water;
      charFor[landType] = land;

      for (let row = top; row < bottom; row++) {
        let line = '';
        for (let col = left; col < right; col++) {
          const t = grid[row * cols + col];
          line += t < pinsStartType ? charFor[t] : pinsRad[t - pinsStartType].char;
        }
        out.push(line);
      }
    }

    return out.join('\n');
  }
}
