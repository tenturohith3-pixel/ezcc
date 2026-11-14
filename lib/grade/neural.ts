/**
 * EffectCraft Neural Level-Up — a learned x2 super-resolution pass that runs
 * entirely in the browser (TensorFlow.js, WebGL where available).
 *
 * The classical Detail Engine resamples + adds micro-contrast; it can make a
 * soft frame crisper but it cannot invent texture that was never sampled.
 * This pipeline uses the ESRGAN-slim generator to hallucinate plausible
 * high-frequency detail, then tiles the image so 2K/4K frames fit in GPU
 * memory. Everything is local: the 888 KB model ships with the site and the
 * frame never leaves the tab.
 *
 * Imported lazily from `upscaleCanvas` so the ~1 MB TFJS runtime is only
 * fetched when someone actually switches to the neural engine.
 */

import type { UpscaleEngine, UpscaleOptions, UpscaleResult } from "./upscale";
import { planUpscale } from "./upscale";

const MODEL_PATH = "/models/esrgan-slim-x2/model.json";

type TfModule = typeof import("@tensorflow/tfjs");
type UpscalerCtor = (typeof import("upscaler"))["default"];
type UpscalerInstance = InstanceType<UpscalerCtor>;

interface NeuralStack {
  tf: TfModule;
  upscaler: UpscalerInstance;
  backend: string;
}

let stackPromise: Promise<NeuralStack> | null = null;
let backendName: string | null = null;

/** True once the runtime + weights are in memory. */
export function neuralReady(): boolean {
  return stackPromise !== null;
}

export function neuralBackend(): string | null {
  return backendName;
}

async function loadStack(): Promise<NeuralStack> {
  if (stackPromise) return stackPromise;
  stackPromise = (async () => {
    /* Keep the heavy imports out of the initial bundle. Turbopack will
       still code-split them into their own lazy chunk. */
    const [tf, upscalerMod, modelMod] = await Promise.all([
      import("@tensorflow/tfjs"),
      import("upscaler"),
      import("@upscalerjs/esrgan-slim/2x"),
    ]);
    await tf.ready();
    /* WebGL is dramatically faster than the JS CPU backend. If this
       browser has no GPU / blocked WebGL, tfjs keeps its CPU fallback and
       the run still completes — just tell the UI the truth. */
    try {
      if (tf.getBackend() !== "webgl") await tf.setBackend("webgl");
    } catch {
      /* CPU is fine */
    }
    backendName = tf.getBackend();

    const modelDef = modelMod.default as unknown as Record<string, unknown>;
    const upscaler = new upscalerMod.default({
      model: { ...modelDef, path: MODEL_PATH },
    });
    await upscaler.ready;
    return { tf, upscaler, backend: backendName ?? "unknown" };
  })().catch((err) => {
    stackPromise = null;
    backendName = null;
    throw err;
  });
  return stackPromise;
}

/** Warm the runtime + weights ahead of a run (used by the panel on intent). */
export async function warmNeural(): Promise<void> {
  await loadStack();
}

export function abortNeural(): void {
  if (!stackPromise) return;
  void stackPromise
    .then((s) => s.upscaler.abort())
    .catch(() => {
      /* nothing running */
    });
}

function isAbort(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && /abort/i.test(err.message))
  );
}

function tileFor(w: number, h: number): { patchSize: number; padding: number } {
  const short = Math.min(w, h);
  if (short < 96) return { patchSize: 32, padding: 4 };
  if (short < 256) return { patchSize: 64, padding: 6 };
  return { patchSize: 128, padding: 8 };
}

/**
 * Light unsharp on the model's output. ESRGAN reconstructs texture but its
 * generator is deliberately conservative, so a small edge pass restores the
 * crispness people expect from an "AI upscale" without the halos the pure
 * classical kernel produces. `amount` is 0..100 (the panel's Detail slider).
 */
function polishCanvas(canvas: HTMLCanvasElement, amount: number): void {
  const k = Math.max(0, Math.min(1.2, amount / 100));
  if (k < 0.02) return;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const src = ctx.getImageData(0, 0, w, h);
  const d = src.data;
  const n = w * h;
  const tmp = new Float32Array(n * 3);
  const blur = new Float32Array(n * 3);

  /* horizontal 1-2-1 */
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const xl = x > 0 ? x - 1 : 0;
      const xr = x < w - 1 ? x + 1 : w - 1;
      const i = (row + x) * 4;
      const il = (row + xl) * 4;
      const ir = (row + xr) * 4;
      const o = (row + x) * 3;
      tmp[o] = (d[il]! + 2 * d[i]! + d[ir]!) * 0.25;
      tmp[o + 1] = (d[il + 1]! + 2 * d[i + 1]! + d[ir + 1]!) * 0.25;
      tmp[o + 2] = (d[il + 2]! + 2 * d[i + 2]! + d[ir + 2]!) * 0.25;
    }
  }
  /* vertical 1-2-1 */
  for (let y = 0; y < h; y++) {
    const yu = y > 0 ? y - 1 : 0;
    const yd = y < h - 1 ? y + 1 : h - 1;
    const row = y * w;
    const rowU = yu * w;
    const rowD = yd * w;
    for (let x = 0; x < w; x++) {
      const o = (row + x) * 3;
      const ou = (rowU + x) * 3;
      const od = (rowD + x) * 3;
      blur[o] = (tmp[ou]! + 2 * tmp[o]! + tmp[od]!) * 0.25;
      blur[o + 1] = (tmp[ou + 1]! + 2 * tmp[o + 1]! + tmp[od + 1]!) * 0.25;
      blur[o + 2] = (tmp[ou + 2]! + 2 * tmp[o + 2]! + tmp[od + 2]!) * 0.25;
    }
  }
  /* combine in place */
  const gain = k * 1.6;
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    const o = p * 3;
    for (let c = 0; c < 3; c++) {
      const v = d[i + c]! + (d[i + c]! - blur[o + c]!) * gain;
      d[i + c] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
  }
  ctx.putImageData(src, 0, 0);
}

/**
 * Run the neural x2 model one or two times, then conform to the tier plan.
 * The plan may clamp the requested factor (e.g. a 1920px source at ×2 on the
 * free ceiling), in which case we downscale the 2× result with high-quality
 * browser sampling instead of discarding the model's work.
 */
export async function neuralUpscaleCanvas(
  source: HTMLCanvasElement,
  opts: UpscaleOptions & { signal?: AbortSignal },
): Promise<UpscaleResult> {
  const srcW = source.width;
  const srcH = source.height;
  const plan = planUpscale(
    srcW,
    srcH,
    opts.factor,
    opts.maxLongEdge,
    opts.maxPixels,
  );
  if (plan.noop) {
    return {
      canvas: source,
      w: srcW,
      h: srcH,
      scale: 1,
      usedKernel: false,
      limited: plan.limited,
      engine: "neural",
    };
  }

  const { tf, upscaler } = await loadStack();
  const passes = opts.factor === 4 ? 2 : 1;
  let current = source;
  opts.onProgress?.(0);

  for (let pass = 0; pass < passes; pass++) {
    if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const { patchSize, padding } = tileFor(current.width, current.height);
    let tensor: import("@tensorflow/tfjs").Tensor3D;
    try {
      tensor = await upscaler.upscale(current, {
        output: "tensor",
        patchSize,
        padding,
        signal: opts.signal,
        progress: (p: number) => {
          opts.onProgress?.((pass + Math.min(1, Math.max(0, p))) / passes);
        },
      });
    } catch (err) {
      if (isAbort(err)) throw new DOMException("Aborted", "AbortError");
      throw err;
    }

    const canvas = document.createElement("canvas");
    canvas.width = current.width * 2;
    canvas.height = current.height * 2;
    /* The model emits float32 0..255; tf.browser.toPixels expects either
       float 0..1 or int 0..255, so quantise explicitly. */
    const pixels = tensor.toInt();
    await tf.browser.toPixels(pixels, canvas);
    pixels.dispose();
    tensor.dispose();
    current = canvas;
    opts.onProgress?.((pass + 1) / passes);
  }

  let out = current;
  if (current.width !== plan.w || current.height !== plan.h) {
    out = document.createElement("canvas");
    out.width = plan.w;
    out.height = plan.h;
    const ctx = out.getContext("2d");
    if (!ctx) throw new Error("Could not allocate the neural output canvas.");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(current, 0, 0, plan.w, plan.h);
  }

  polishCanvas(out, opts.detail);
  opts.onProgress?.(1);

  return {
    canvas: out,
    w: plan.w,
    h: plan.h,
    scale: plan.scale,
    usedKernel: true,
    limited: plan.limited,
    engine: "neural",
  };
}

export type { UpscaleEngine };
