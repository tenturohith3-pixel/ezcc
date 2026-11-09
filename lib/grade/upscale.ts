/**
 * EffectCraft Detail Engine — the quality level-up pipeline (client).
 *
 * 1. plan the output: factor ×2/×4, clamped by the tier's export ceiling,
 *    a hard dimension cap and a pixel budget (mobile-aware)
 * 2. run the Rust/WASM kernel band-by-band over linear memory, yielding to
 *    the event loop between bands (UI stays alive, progress is honest)
 * 3. if the kernel is unavailable, run the identical TS reference
 *
 * The result is a canvas at the upscaled dimensions — the existing export
 * pipeline encodes it exactly like any other render.
 */

import { ensureKernel } from "./kernel";
import { upscaleJSData } from "./upscale-js";

const BAND_ROWS = 96;

export interface UpscaleOptions {
  factor: 2 | 4;
  detail: number; // 0..100 micro-contrast
  denoise: number; // 0..100 pre-blur
  maxLongEdge: number; // tier export ceiling
  maxPixels?: number;
  onProgress?: (pct: number) => void;
}

export interface UpscalePlan {
  w: number;
  h: number;
  scale: number;
  limited: boolean;
  noop: boolean;
}

export interface UpscaleResult {
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
  scale: number;
  usedKernel: boolean;
  limited: boolean;
}

export function defaultMaxPixels(): number {
  if (typeof window !== "undefined" && window.innerWidth < 768) {
    return 16_000_000;
  }
  return 40_000_000;
}

/** Pure planner — also used by the Export panel for live dimension read-outs. */
export function planUpscale(
  srcW: number,
  srcH: number,
  factor: 2 | 4,
  maxLongEdge: number,
  maxPixels = defaultMaxPixels(),
): UpscalePlan {
  const srcLong = Math.max(srcW, srcH);
  if (srcW <= 0 || srcH <= 0 || srcLong <= 0) {
    return { w: Math.max(1, srcW), h: Math.max(1, srcH), scale: 1, limited: false, noop: true };
  }
  const longLimit = Math.min(maxLongEdge, 16384);
  const scaleByLong = longLimit / srcLong;
  const scaleByPixels = Math.sqrt(maxPixels / (srcW * srcH));
  const scale = Math.min(factor, scaleByLong, scaleByPixels);
  if (!(scale > 1.01)) {
    return { w: srcW, h: srcH, scale: 1, limited: true, noop: true };
  }
  const w = Math.max(2, Math.round(srcW * scale));
  const h = Math.max(2, Math.round(srcH * scale));
  return {
    w,
    h,
    scale,
    limited: scale < factor - 1e-3,
    noop: false,
  };
}

export async function upscaleCanvas(
  source: HTMLCanvasElement,
  opts: UpscaleOptions,
): Promise<UpscaleResult> {
  const srcW = source.width;
  const srcH = source.height;
  const maxPixels = opts.maxPixels ?? defaultMaxPixels();
  const plan = planUpscale(srcW, srcH, opts.factor, opts.maxLongEdge, maxPixels);
  if (plan.noop) {
    return {
      canvas: source,
      w: srcW,
      h: srcH,
      scale: 1,
      usedKernel: false,
      limited: plan.limited,
    };
  }
  const { w: dstW, h: dstH } = plan;

  const sctx = source.getContext("2d", { willReadFrequently: true });
  if (!sctx) throw new Error("Could not read the render for level-up.");
  const srcData = sctx.getImageData(0, 0, srcW, srcH).data;

  const out = document.createElement("canvas");
  out.width = dstW;
  out.height = dstH;
  const octx = out.getContext("2d", { willReadFrequently: true });
  if (!octx) throw new Error("Could not allocate the level-up canvas.");

  /* ── Rust kernel path ── */
  const k = await ensureKernel();
  if (k) {
    const srcBytes = srcW * srcH * 4;
    const bandBytes = dstW * BAND_ROWS * 4;
    const srcPtr = k.ec_alloc(srcBytes);
    const bandPtr = k.ec_alloc(bandBytes);
    if (srcPtr !== 0 && bandPtr !== 0) {
      try {
        new Uint8Array(k.memory.buffer, srcPtr, srcBytes).set(srcData);
        const begun = k.ec_up_begin(
          srcPtr,
          srcW,
          srcH,
          dstW,
          dstH,
          opts.detail,
          opts.denoise,
        );
        if (begun === 0) {
          let ok = true;
          for (let y0 = 0; y0 < dstH; y0 += BAND_ROWS) {
            const rows = Math.min(BAND_ROWS, dstH - y0);
            const st = k.ec_up_band(bandPtr, y0, rows);
            if (st !== 0) {
              ok = false;
              break;
            }
            /* copy out of wasm memory before the next call */
            const band = new Uint8ClampedArray(
              k.memory.buffer,
              bandPtr,
              dstW * rows * 4,
            ).slice();
            octx.putImageData(new ImageData(band, dstW, rows), 0, y0);
            opts.onProgress?.((y0 + rows) / dstH);
            await new Promise<void>((r) => setTimeout(r, 0));
          }
          k.ec_up_end();
          if (ok) {
            return {
              canvas: out,
              w: dstW,
              h: dstH,
              scale: plan.scale,
              usedKernel: true,
              limited: plan.limited,
            };
          }
        }
      } catch {
        /* fall through to the reference pipeline */
      } finally {
        k.ec_up_end();
        k.ec_dealloc(srcPtr, srcBytes);
        k.ec_dealloc(bandPtr, bandBytes);
      }
    }
  }

  /* ── f64 reference fallback ── */
  const data = upscaleJSData(
    new Uint8ClampedArray(srcData),
    srcW,
    srcH,
    dstW,
    dstH,
    opts.detail,
    opts.denoise,
  );
  octx.putImageData(
    new ImageData(data as Uint8ClampedArray<ArrayBuffer>, dstW, dstH),
    0,
    0,
  );
  opts.onProgress?.(1);
  return {
    canvas: out,
    w: dstW,
    h: dstH,
    scale: plan.scale,
    usedKernel: false,
    limited: plan.limited,
  };
}
