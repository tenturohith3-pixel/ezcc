/**
 * Detail Engine verification harness.
 *
 *   1. PARITY   — kernel (f32 caches) vs the f64 TS reference, pixel by pixel.
 *   2. SEAMS    — banded output must be byte-identical to one-shot output.
 *   3. QUALITY  — Lanczos3 must beat linear-light bilinear against a known
 *                 high-resolution ground truth (PSNR, RGB).
 *
 * Run: bun run verify-upscale
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ensureKernel, loadKernelNow } from "../lib/grade/kernel";
import { upscaleJSData } from "../lib/grade/upscale-js";

type Rgba = Uint8ClampedArray;

function rngImage(w: number, h: number, seed: number): Rgba {
  let s = seed >>> 0;
  const next = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
  const a = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h * 4; i += 4) {
    a[i] = Math.floor(next() * 256);
    a[i + 1] = Math.floor(next() * 256);
    a[i + 2] = Math.floor(next() * 256);
    a[i + 3] = 255;
  }
  return a;
}

const BAND = 37;

/** Run the wasm upscaler; returns null if the kernel is unavailable. */
async function kernelUpscale(
  src: Rgba,
  sw: number,
  sh: number,
  dw: number,
  dh: number,
  detail: number,
  denoise: number,
  bandRows = BAND,
): Promise<Rgba | null> {
  const k = await ensureKernel();
  if (!k) return null;
  const srcBytes = sw * sh * 4;
  const bandBytes = dw * Math.min(bandRows, dh) * 4;
  const srcPtr = k.ec_alloc(srcBytes);
  const bandPtr = k.ec_alloc(bandBytes);
  if (!srcPtr || !bandPtr) return null;
  try {
    new Uint8Array(k.memory.buffer, srcPtr, srcBytes).set(src);
    const st = k.ec_up_begin(srcPtr, sw, sh, dw, dh, detail, denoise);
    if (st !== 0) throw new Error(`ec_up_begin → ${st}`);
    const out = new Uint8ClampedArray(dw * dh * 4);
    for (let y0 = 0; y0 < dh; y0 += bandRows) {
      const rows = Math.min(bandRows, dh - y0);
      const bst = k.ec_up_band(bandPtr, y0, rows);
      if (bst !== 0) throw new Error(`ec_up_band(${y0}) → ${bst}`);
      const band = new Uint8Array(k.memory.buffer, bandPtr, dw * rows * 4);
      out.set(band, y0 * dw * 4);
    }
    k.ec_up_end();
    return out;
  } finally {
    k.ec_up_end();
    k.ec_dealloc(srcPtr, srcBytes);
    k.ec_dealloc(bandPtr, bandBytes);
  }
}

function maxDiff(a: Rgba, b: Rgba): { diff: number; count: number } {
  let diff = 0;
  let count = 0;
  for (let i = 0; i < a.length; i++) {
    const d = Math.abs(a[i]! - b[i]!);
    if (d > diff) diff = d;
    if (d !== 0) count++;
  }
  return { diff, count };
}

/* ── synthetic ground truth ─────────────────────────────────────── */

function scene(w: number, h: number): Rgba {
  const a = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const v = y / h;
      // warm-to-cool base gradient
      let r = 26 + 205 * u;
      let g = 34 + 185 * v;
      let b = 60 + 150 * (1 - u) + 40 * Math.sin(v * Math.PI * 2);
      // hard-edged discs (stress anti-ringing)
      const d1 = Math.hypot(x - w * 0.32, y - h * 0.42);
      const d2 = Math.hypot(x - w * 0.71, y - h * 0.63);
      if (d1 < w * 0.13) {
        r = 236;
        g = 205;
        b = 158;
      }
      if (d2 < w * 0.09) {
        r = 24;
        g = 86;
        b = 104;
      }
      // diagonal edge
      if (x - y * 1.7 > w * 0.62) {
        r = Math.min(255, r + 36);
        b = Math.max(0, b - 30);
      }
      // fine texture near the source Nyquist limit
      const tex =
        13 * Math.sin(u * Math.PI * 2 * (w / 5.1)) *
          Math.sin(v * Math.PI * 2 * (h / 6.7)) +
        7 * Math.cos(u * Math.PI * 2 * (w / 3.3));
      r += tex;
      g += tex * 0.6;
      b -= tex * 0.35;
      const i = (y * w + x) * 4;
      a[i] = Math.max(0, Math.min(255, Math.round(r)));
      a[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
      a[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
      a[i + 3] = 255;
    }
  }
  return a;
}

/** Area-average downsample by an integer factor — the "optical" source. */
function boxDown(src: Rgba, sw: number, sh: number, f: number): {
  data: Rgba;
  w: number;
  h: number;
} {
  const w = Math.floor(sw / f);
  const h = Math.floor(sh / f);
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0;
      for (let yy = 0; yy < f; yy++) {
        for (let xx = 0; xx < f; xx++) {
          const i = ((y * f + yy) * sw + (x * f + xx)) * 4;
          r += src[i]!;
          g += src[i + 1]!;
          b += src[i + 2]!;
        }
      }
      const n = f * f;
      const o = (y * w + x) * 4;
      out[o] = Math.round(r / n);
      out[o + 1] = Math.round(g / n);
      out[o + 2] = Math.round(b / n);
      out[o + 3] = 255;
    }
  }
  return { data: out, w, h };
}

const TO_LIN = (() => {
  const t = new Float64Array(256);
  for (let i = 0; i < 256; i++) {
    const c = i / 255;
    t[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  return t;
})();

function toSrgb(v: number): number {
  const l = Math.min(1, Math.max(0, v));
  const s = l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(s * 255)));
}

/** Plain bilinear in linear light — the baseline the engine must beat. */
function bilinearLinear(src: Rgba, sw: number, sh: number, dw: number, dh: number): Rgba {
  const out = new Uint8ClampedArray(dw * dh * 4);
  const sx = sw / dw;
  const sy = sh / dh;
  for (let y = 0; y < dh; y++) {
    const fy = Math.min(sh - 1, Math.max(0, (y + 0.5) * sy - 0.5));
    const y0 = Math.floor(fy);
    const y1 = Math.min(sh - 1, y0 + 1);
    const wy = fy - y0;
    for (let x = 0; x < dw; x++) {
      const fx = Math.min(sw - 1, Math.max(0, (x + 0.5) * sx - 0.5));
      const x0 = Math.floor(fx);
      const x1 = Math.min(sw - 1, x0 + 1);
      const wx = fx - x0;
      const o = (y * dw + x) * 4;
      for (let c = 0; c < 3; c++) {
        const p00 = TO_LIN[src[(y0 * sw + x0) * 4 + c]!]!;
        const p10 = TO_LIN[src[(y0 * sw + x1) * 4 + c]!]!;
        const p01 = TO_LIN[src[(y1 * sw + x0) * 4 + c]!]!;
        const p11 = TO_LIN[src[(y1 * sw + x1) * 4 + c]!]!;
        const top = p00 + (p10 - p00) * wx;
        const bot = p01 + (p11 - p01) * wx;
        out[o + c] = toSrgb(top + (bot - top) * wy);
      }
      out[o + 3] = src[(y0 * sw + x0) * 4 + 3]!;
    }
  }
  return out;
}

function psnr(a: Rgba, b: Rgba, w: number, h: number): number {
  let mse = 0;
  let n = 0;
  for (let i = 0; i < w * h * 4; i += 4) {
    for (let c = 0; c < 3; c++) {
      const d = a[i + c]! - b[i + c]!;
      mse += d * d;
      n++;
    }
  }
  mse /= n;
  return mse === 0 ? Infinity : 10 * Math.log10((255 * 255) / mse);
}

/* ── boot ───────────────────────────────────────────────────────── */

let allOk = true;

try {
  const wasmPath = fileURLToPath(
    new URL("../public/wasm/engine.kernel.v2.wasm", import.meta.url),
  );
  const bytes = readFileSync(wasmPath);
  const ok = await loadKernelNow(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  );
  if (!ok) throw new Error("kernel boot returned false");
} catch (err) {
  console.error("✗ kernel failed to boot — check public/wasm/engine.kernel.v2.wasm");
  console.error(err);
  process.exit(1);
}

/* 1) parity ─────────────────────────────────────────────────────── */

const PARITY_CASES = [
  { name: "detail 55 · denoise 20", detail: 55, denoise: 20, tol: 1 },
  { name: "detail 0 · denoise 0", detail: 0, denoise: 0, tol: 1 },
  { name: "detail 100 · denoise 55", detail: 100, denoise: 55, tol: 2 },
] as const;

{
  const sw = 97;
  const sh = 73;
  const dw = 233;
  const dh = 175;
  const src = rngImage(sw, sh, 0xc0ffee);
  for (const c of PARITY_CASES) {
    const oracle = upscaleJSData(src, sw, sh, dw, dh, c.detail, c.denoise);
    const kOut = await kernelUpscale(src, sw, sh, dw, dh, c.detail, c.denoise);
    if (!kOut) {
      console.error(`✗ ${c.name} — kernel returned nothing`);
      allOk = false;
      continue;
    }
    const { diff, count } = maxDiff(oracle, kOut);
    const pass = diff <= c.tol;
    console.log(
      `${pass ? "✓" : "✗"} parity · ${c.name.padEnd(26)} maxAbsDiff=${diff} mismatches=${count}/${dw * dh * 4}  (tol ${c.tol})`,
    );
    if (!pass) allOk = false;
  }
}

/* 2) band seams ─────────────────────────────────────────────────── */

{
  const sw = 64;
  const sh = 48;
  const dw = 160;
  const dh = 121; // odd height — the last band is a partial
  const src = rngImage(sw, sh, 0xbeef);
  const oneShot = await kernelUpscale(src, sw, sh, dw, dh, 62, 12, dh);
  const banded = await kernelUpscale(src, sw, sh, dw, dh, 62, 12, 7);
  if (!oneShot || !banded) {
    console.error("✗ band seam test — kernel returned nothing");
    allOk = false;
  } else {
    const { diff, count } = maxDiff(oneShot, banded);
    const pass = diff === 0;
    console.log(
      `${pass ? "✓" : "✗"} band seams · 1×${dh} vs 7-row bands   maxAbsDiff=${diff} mismatches=${count}`,
    );
    if (!pass) allOk = false;
  }
}

/* 3) quality — Lanczos3 vs bilinear against a known ground truth ─── */

{
  const gtW = 768;
  const gtH = 512;
  const f = 2;
  const truth = scene(gtW, gtH);
  const { data: src, w: sw, h: sh } = boxDown(truth, gtW, gtH, f);
  const klass = await kernelUpscale(src, sw, sh, gtW, gtH, 0, 0);
  const bil = bilinearLinear(src, sw, sh, gtW, gtH);
  if (klass) {
    const kp = psnr(truth, klass, gtW, gtH);
    const bp = psnr(truth, bil, gtW, gtH);
    const pass = kp > bp;
    console.log(
      `${pass ? "✓" : "✗"} quality · ×${f} ${sw}×${sh} → ${gtW}×${gtH}   kernel=${kp.toFixed(2)} dB  bilinear=${bp.toFixed(2)} dB  Δ=${(kp - bp).toFixed(2)} dB`,
    );
    if (!pass) allOk = false;
  } else {
    console.error("✗ quality test — kernel returned nothing");
    allOk = false;
  }
}

/* bench ─────────────────────────────────────────────────────────── */

{
  const sw = 960;
  const sh = 540;
  const dw = 1920;
  const dh = 1080;
  const src = rngImage(sw, sh, 4242);
  const t0 = performance.now();
  const out = await kernelUpscale(src, sw, sh, dw, dh, 55, 20, 96);
  const ms = performance.now() - t0;
  if (out) {
    console.log(
      `  bench 960×540 → 1920×1080 (detail 55)  ${ms.toFixed(0)}ms  (${(dw * dh / 1e6).toFixed(1)} MP out)`,
    );
  }
}

console.log(allOk ? "\nDETAIL ENGINE: PASS" : "\nDETAIL ENGINE: FAIL");
process.exit(allOk ? 0 : 1);
