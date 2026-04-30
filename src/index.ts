import { getTextureData } from './data';

export interface GlobeOptions {
  size?: number;
  land?: string;
  water?: string;
  background?: string;
  margin?: number;
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
  private margin: number;
  private texW: number;
  private texH: number;
  private texMask: Uint8Array;
  private prevLand: Uint8Array;

  constructor(options: GlobeOptions = {}) {
    const size = options.size ?? 1.4;
    this.land = options.land ?? '#';
    this.water = options.water ?? ' ';
    this.background = options.background ?? ' ';
    this.margin = options.margin ?? 0;

    this.cols = Math.round(120 * size);
    this.rows = Math.round(60 * size);
    this.radius = 27 * size;

    const tex = getTextureData();
    this.texW = tex.width;
    this.texH = tex.height;
    this.texMask = tex.mask;
    this.prevLand = new Uint8Array(this.cols * this.rows);
  }

  render(rotation: number): string {
    const angle = ((rotation % 360) + 360) % 360 * DEG_TO_RAD;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const cx = this.cols * 0.5;
    const cy = this.rows * 0.5;
    const invR = 1 / this.radius;
    const { cols, rows, texW, texH, texMask, prevLand, land, water, background, aspect } = this;

    const rowBuf: string[] = new Array(rows);

    for (let row = 0; row < rows; row++) {
      let line = '';
      const sy = (cy - row) * invR * aspect;
      const sy2 = sy * sy;

      for (let col = 0; col < cols; col++) {
        const sx = (col - cx) * invR;
        const r2 = sx * sx + sy2;

        if (r2 > 1) {
          line += background;
          continue;
        }

        const sz = Math.sqrt(1 - r2);

        const wx = sx * cosA - sz * sinA;
        const wy = sy;
        const wz = sx * sinA + sz * cosA;

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

        line += prevLand[cellIdx] ? land : water;
      }
      rowBuf[row] = line;
    }

    return this.trimToDisk(rowBuf);
  }

  private trimToDisk(rows: string[]): string {
    const cx = this.cols * 0.5;
    const cy = this.rows * 0.5;
    const radV = this.radius / this.aspect;
    const m = this.margin;
    const left = Math.max(0, Math.ceil(cx - this.radius) - m);
    const right = Math.min(this.cols, Math.floor(cx + this.radius) + 1 + m);
    const top = Math.max(0, Math.ceil(cy - radV) - m);
    const bottom = Math.min(rows.length, Math.floor(cy + radV) + 1 + m);
    const out: string[] = [];
    for (let i = top; i < bottom; i++) {
      out.push(rows[i].substring(left, right));
    }
    return out.join('\n');
  }
}
