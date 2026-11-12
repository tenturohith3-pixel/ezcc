/**
 * Detail Engine — pure-TS reference implementation.
 *
 * The exact same pipeline as `engine-kernel/src/upscale.rs` (linear-light
 * Lanczos3, anti-ring clamp, 3×3 unsharp, denoise prepass) in f64. It has
 * two jobs:
 *   1. fallback when WebAssembly is unavailable, and
 *   2. the oracle for `scripts/verify-upscale.ts` parity tests.
 *
 * It is intentionally not optimised — the Rust kernel is the fast path.
 */

const A = 3;
const TAPS = 6;
const LUT_N = 4096;

function lanczos(x: number): number {
  const ax = Math.abs(x);
  if (ax < 1e-9) return 1;
  if (ax >= A) return 0;
  const pix = Math.PI * ax;
  return (Math.sin(pix) / pix) * (Math.sin(pix / A) / (pix / A));
}

function buildLinLut(): Float64Array {
  const t = new Float64Array(256);
  for (let i = 0; i < 256; i++) {
    const c = i / 255;
    t[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  return t;
}

function buildOutLut(): Uint8Array {
  const t = new Uint8Array(LUT_N);
  for (let i = 0; i < LUT_N; i++) {
    const l = i / (LUT_N - 1);
    const s = l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055;
    t[i] = Math.floor(Math.min(1, Math.max(0, s)) * 255 + 0.5);
  }
  return t;
}

export function upscaleJSData(
  src: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
  detail: number,
  denoise: number,
): Uint8ClampedArray {
  const lin = buildLinLut();
  const outLut = buildOutLut();
  const work = new Uint8ClampedArray(src); // mutate freely (denoise)
  const k = Math.min(100, Math.max(0, denoise)) / 100 * 0.85;

  /* 1) denoise — 3×3 box blend, amount-weighted */
  if (k > 0) {
    const orig = new Uint8ClampedArray(work);
    for (let y = 0; y < srcH; y++) {
      const y0 = Math.max(0, y - 1);
      const y1 = Math.min(srcH - 1, y + 1);
      for (let x = 0; x < srcW; x++) {
        const x0 = Math.max(0, x - 1);
        const x1 = Math.min(srcW - 1, x + 1);
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          for (let yy = y0; yy <= y1; yy++)
            for (let xx = x0; xx <= x1; xx++)
              sum += orig[(yy * srcW + xx) * 4 + c]!;
          const avg = sum / 9;
          const here = orig[(y * srcW + x) * 4 + c]!;
          work[(y * srcW + x) * 4 + c] = Math.floor(
            here * (1 - k) + avg * k + 0.5,
          );
        }
      }
    }
  }

  /* 2) horizontal geometry */
  const scaleX = dstW / srcW;
  const scaleY = dstH / srcH;
  const xt = new Int32Array(dstW * TAPS);
  const xw = new Float64Array(dstW * TAPS);
  const nearX = new Int32Array(dstW);
  for (let o = 0; o < dstW; o++) {
    const center = (o + 0.5) / scaleX - 0.5;
    const base = Math.floor(center);
    let sum = 0;
    const ws = new Float64Array(TAPS);
    for (let j = 0; j < TAPS; j++) {
      const i = base - 2 + j;
      ws[j] = lanczos(center - i);
      xt[o * TAPS + j] = Math.min(srcW - 1, Math.max(0, i));
      sum += ws[j]!;
    }
    if (Math.abs(sum) > 1e-12)
      for (let j = 0; j < TAPS; j++) ws[j] = ws[j]! / sum;
    for (let j = 0; j < TAPS; j++) xw[o * TAPS + j] = ws[j]!;
    nearX[o] = Math.min(srcW - 1, Math.floor((o + 0.5) / scaleX));
  }

  const stride = dstW * 3;
  const hcache = new Float64Array(TAPS * stride);
  const hrow = new Int32Array(TAPS).fill(-1);
  const ring = new Float64Array(3 * stride);
  const ringY = new Int32Array(3).fill(-1);
  const scratch = new Float64Array(stride);
  const blur = new Float64Array(stride);

  const computeHrow = (si: number) => {
    const slot = si % TAPS;
    const off = slot * stride;
    for (let o = 0; o < dstW; o++) {
      let r = 0, g = 0, b = 0;
      for (let j = 0; j < TAPS; j++) {
        const sx = xt[o * TAPS + j]!;
        const w = xw[o * TAPS + j]!;
        const p = (si * srcW + sx) * 4;
        r += lin[work[p]!]! * w;
        g += lin[work[p + 1]!]! * w;
        b += lin[work[p + 2]!]! * w;
      }
      hcache[off + o * 3] = r;
      hcache[off + o * 3 + 1] = g;
      hcache[off + o * 3 + 2] = b;
    }
    hrow[slot] = si;
  };

  const ensureHrow = (si: number) => {
    const slot = si % TAPS;
    if (hrow[slot] !== si) computeHrow(si);
    return slot;
  };

  const computeRawRow = (y: number) => {
    const center = (y + 0.5) / scaleY - 0.5;
    const base = Math.floor(center);
    const is = new Int32Array(TAPS);
    const ws = new Float64Array(TAPS);
    let sum = 0;
    for (let j = 0; j < TAPS; j++) {
      const si = Math.min(srcH - 1, Math.max(0, base - 2 + j));
      is[j] = si;
      ws[j] = lanczos(center - (base - 2 + j));
      sum += ws[j]!;
    }
    if (Math.abs(sum) > 1e-12)
      for (let j = 0; j < TAPS; j++) ws[j] = ws[j]! / sum;
    for (let j = 0; j < TAPS; j++) ensureHrow(is[j]!);
    const slots = Array.from(is, (si) => si % TAPS);

    const ny = Math.min(srcH - 1, Math.floor((y + 0.5) / scaleY));
    const ny1 = Math.min(srcH - 1, ny + 1);

    for (let o = 0; o < dstW; o++) {
      let vr = 0, vg = 0, vb = 0;
      for (let j = 0; j < TAPS; j++) {
        const off = slots[j]! * stride + o * 3;
        vr += hcache[off]! * ws[j]!;
        vg += hcache[off + 1]! * ws[j]!;
        vb += hcache[off + 2]! * ws[j]!;
      }
      const nx = nearX[o]!;
      const nx1 = Math.min(srcW - 1, nx + 1);
      const p00 = (ny * srcW + nx) * 4;
      const p10 = (ny * srcW + nx1) * 4;
      const p01 = (ny1 * srcW + nx) * 4;
      const p11 = (ny1 * srcW + nx1) * 4;
      const v = [vr, vg, vb];
      for (let c = 0; c < 3; c++) {
        const a = lin[work[p00 + c]!]!;
        const b = lin[work[p10 + c]!]!;
        const d = lin[work[p01 + c]!]!;
        const e = lin[work[p11 + c]!]!;
        const lo = Math.min(a, b, d, e);
        const hi = Math.max(a, b, d, e);
        v[c] = Math.min(hi, Math.max(lo, v[c]!));
      }
      scratch[o * 3] = v[0]!;
      scratch[o * 3 + 1] = v[1]!;
      scratch[o * 3 + 2] = v[2]!;
    }
    const slot = y % 3;
    ring.set(scratch, slot * stride);
    ringY[slot] = y;
  };

  const ensureRawRow = (y: number) => {
    if (ringY[y % 3] !== y) computeRawRow(y);
  };

  const out = new Uint8ClampedArray(dstW * dstH * 4);
  const kk = (Math.min(100, Math.max(0, detail)) / 100) * 2.2;

  const emitRow = (ey: number) => {
    const r0 = Math.max(0, Math.min(dstH - 1, ey - 1)) % 3;
    const r1 = ey % 3;
    const r2 = Math.max(0, Math.min(dstH - 1, ey + 1)) % 3;

    for (let o = 0; o < dstW; o++) {
      for (let c = 0; c < 3; c++) {
        const a = ring[r0 * stride + o * 3 + c]!;
        const b = ring[r1 * stride + o * 3 + c]!;
        const d = ring[r2 * stride + o * 3 + c]!;
        blur[o * 3 + c] = (a + 2 * b + d) * 0.25;
      }
    }

    const ny = Math.min(srcH - 1, Math.floor((ey + 0.5) / scaleY));
    const rowOff = ey * dstW * 4;
    for (let o = 0; o < dstW; o++) {
      const xl = Math.max(0, o - 1) * 3;
      const xc = o * 3;
      const xr = Math.min(dstW - 1, o + 1) * 3;
      for (let c = 0; c < 3; c++) {
        const raw = ring[r1 * stride + xc + c]!;
        const hb =
          (blur[xl + c]! + 2 * blur[xc + c]! + blur[xr + c]!) * 0.25;
        let val = raw + (raw - hb) * kk;

        /* halo guard — same as the Rust kernel */
        let lo = Infinity;
        let hi = -Infinity;
        for (const rr of [r0, r1, r2]) {
          for (const cc of [xl, xc, xr]) {
            const n = ring[rr * stride + cc + c]!;
            if (n < lo) lo = n;
            if (n > hi) hi = n;
          }
        }
        val = Math.min(hi + 0.045, Math.max(lo - 0.045, val));

        const idx = Math.min(
          LUT_N - 1,
          Math.floor(Math.min(1, Math.max(0, val)) * (LUT_N - 1) + 0.5),
        );
        out[rowOff + o * 4 + c] = outLut[idx]!;
      }
      const nx = nearX[o]!;
      out[rowOff + o * 4 + 3] = work[(ny * srcW + nx) * 4 + 3]!;
    }
  };

  for (let ey = 0; ey < dstH; ey++) {
    for (let dy = -1; dy <= 1; dy++) {
      const ry = Math.max(0, Math.min(dstH - 1, ey + dy));
      ensureRawRow(ry);
    }
    emitRow(ey);
  }
  return out;
}
