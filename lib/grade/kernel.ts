/**
 * EffectCraft — Rust/WASM pixel kernel loader.
 *
 * The engine's per-pixel `gradePass` lives in `engine-kernel/src/lib.rs`
 * (Rust → wasm32-unknown-unknown, ~31 KB, no wasm-bindgen — raw linear
 * memory + integer/f64 ABI). This module lazily boots it once per session
 * and routes pixel work through it while keeping every fallback:
 *   • boot deferred until first browser render — no layout blocking,
 *   • if wasm is unavailable / mismatched, the JS engine runs silently,
 *   • `.cube` LUT sampling and halation/bloom stay on the JS/canvas path.
 *
 * Param layout — 43 × f64 (little endian), mirrored in the Rust source:
 *   [0]  useHsl         (0/1)          [1]  hslActive   (0/1)
 *   [2]  threeActive    (0/1)          [3]  satFactor   (clamped 0..2)
 *   [4]  vignK                          [5]  grainK
 *   [6]  hdrK                           [7]  recK
 *   [8]  liftH    [9]  gammaH   [10] gainH
 *   [11] liftS    [12] gammaS   [13] gainS
 *   [14] exposure [15] contrast [16] brightness [17] temperature [18] tint
 *   [19..27] bandH ×8  [27..35] bandS ×8  [35..43] bandL ×8
 */
import { HSL_BANDS, type GradeParams } from "./params";

export const KERNEL_URL = "/wasm/engine.kernel.v2.wasm";
const PARAM_COUNT = 43;
const PARAMS_BYTES = PARAM_COUNT * 8;

export interface EcKernel {
  memory: WebAssembly.Memory;
  ec_alloc: (bytes: number) => number;
  ec_dealloc: (ptr: number, bytes: number) => void;
  ec_grade: (
    src: number,
    dst: number,
    w: number,
    h: number,
    params: number,
    seed: number,
  ) => number;
  ec_up_begin: (
    srcPtr: number,
    srcW: number,
    srcH: number,
    dstW: number,
    dstH: number,
    detail: number,
    denoise: number,
  ) => number;
  ec_up_band: (dstPtr: number, y0: number, bandH: number) => number;
  ec_up_end: () => number;
}
type KernelExports = EcKernel;

let kernel: KernelExports | null = null;
let booting: Promise<KernelExports | null> | null = null;
let failed = false;

/* Scratch — reused across renders; only re-allocated when the stage size
   changes (so wasm heap growth, and its buffer detach, stays rare). */
let scratch: {
  srcPtr: number;
  dstPtr: number;
  paramsPtr: number;
  bytes: number;
} | null = null;

function allocateScratch(bytes: number): boolean {
  if (!kernel) return false;
  releaseScratch();
  const srcPtr = kernel.ec_alloc(bytes);
  const dstPtr = kernel.ec_alloc(bytes);
  const paramsPtr = kernel.ec_alloc(PARAMS_BYTES);
  if (srcPtr === 0 || dstPtr === 0 || paramsPtr === 0) {
    if (srcPtr !== 0) kernel.ec_dealloc(srcPtr, bytes);
    if (dstPtr !== 0) kernel.ec_dealloc(dstPtr, bytes);
    if (paramsPtr !== 0) kernel.ec_dealloc(paramsPtr, PARAMS_BYTES);
    scratch = null;
    return false;
  }
  scratch = { srcPtr, dstPtr, paramsPtr, bytes };
  return true;
}

function releaseScratch(): void {
  if (!kernel || !scratch) return;
  kernel.ec_dealloc(scratch.srcPtr, scratch.bytes);
  kernel.ec_dealloc(scratch.dstPtr, scratch.bytes);
  kernel.ec_dealloc(scratch.paramsPtr, PARAMS_BYTES);
  scratch = null;
}

/* ── pack GradeParams into the flat f64 layout ── */
const clampNum = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

export function packParams(p: GradeParams): Float64Array {
  const a = new Float64Array(PARAM_COUNT);
  const wb = p.hsl;
  let hslActive = false;
  for (const band of HSL_BANDS) {
    const b = wb[band];
    if (b && ((b.h ?? 0) !== 0 || (b.s ?? 0) !== 0 || (b.l ?? 0) !== 0)) {
      hslActive = true;
      break;
    }
  }
  const threeActive =
    p.liftHue !== 0 ||
    p.liftSat !== 0 ||
    p.gammaHue !== 0 ||
    p.gammaSat !== 0 ||
    p.gainHue !== 0 ||
    p.gainSat !== 0;
  const useHsl = hslActive || threeActive || p.hdr > 0 || p.highlightRecovery > 0;

  a[0] = useHsl ? 1 : 0;
  a[1] = hslActive ? 1 : 0;
  a[2] = threeActive ? 1 : 0;
  a[3] = clampNum(1 + p.saturation / 100, 0, 2);
  a[4] = (p.vignette / 100) * 0.85;
  a[5] = (p.filmGrain / 100) * 26;
  a[6] = p.hdr / 100;
  a[7] = p.highlightRecovery / 100;
  a[8] = (p.liftHue / 100) * 22;
  a[9] = (p.gammaHue / 100) * 22;
  a[10] = (p.gainHue / 100) * 22;
  a[11] = (p.liftSat / 100) * 0.24;
  a[12] = (p.gammaSat / 100) * 0.24;
  a[13] = (p.gainSat / 100) * 0.24;
  a[14] = p.exposure;
  a[15] = p.contrast;
  a[16] = p.brightness;
  a[17] = p.temperature;
  a[18] = p.tint;
  for (let bi = 0; bi < 8; bi++) {
    const key = HSL_BANDS[bi]!;
    const b = wb[key];
    a[19 + bi] = ((b?.h ?? 0) / 100) * 45;
    a[27 + bi] = ((b?.s ?? 0) / 100) * 0.5;
    a[35 + bi] = ((b?.l ?? 0) / 100) * 0.42;
  }
  return a;
}

async function boot(webBytes?: ArrayBuffer): Promise<KernelExports | null> {
  /* The artifact is 31 KB — a buffered read beats streaming ceremony here. */
  try {
    if (typeof WebAssembly === "undefined") throw new Error("no wasm");
    const bytes =
      webBytes ?? (await (await fetch(KERNEL_URL, { cache: "force-cache" })).arrayBuffer());
    const mod = new WebAssembly.Module(bytes);
    const inst = new WebAssembly.Instance(mod, {});
    const x = inst.exports as unknown as KernelExports;
    if (
      typeof x.ec_alloc !== "function" ||
      typeof x.ec_dealloc !== "function" ||
      typeof x.ec_grade !== "function" ||
      typeof x.ec_up_begin !== "function" ||
      typeof x.ec_up_band !== "function" ||
      typeof x.ec_up_end !== "function" ||
      !x.memory
    ) {
      throw new Error("kernel exports missing");
    }
    return x;
  } catch {
    failed = true;
    return null;
  }
}

/**
 * Boot once. Browser code calls `preloadKernel()` (uses the HTTP artifact);
 * explicit callers may pass `webBytes` to boot from a provided buffer.
 */
export function loadKernelNow(webBytes?: ArrayBuffer): Promise<boolean> {
  if (failed) return Promise.resolve(false);
  if (kernel) return Promise.resolve(true);
  booting = boot(webBytes).then((k) => {
    kernel = k;
    return k;
  });
  return booting.then((k) => k !== null);
}

/** Auto-boot entry for browser code. */
export function preloadKernel(): Promise<boolean> {
  if (kernel) return Promise.resolve(true);
  return loadKernelNow();
}

/** Await the kernel (booting from HTTP if necessary); null on failure. */
export async function ensureKernel(): Promise<EcKernel | null> {
  const ok = await preloadKernel();
  return ok ? kernel : null;
}

/* ── the one entry point the stage uses ── */

/**
 * Grade src → dst through the Rust kernel. Returns false when the kernel
 * is unavailable (the caller then falls back to the JS engine).
 */
export function gradeKernelInto(
  src: Uint8ClampedArray,
  dst: Uint8ClampedArray,
  w: number,
  h: number,
  params: GradeParams,
  seed: number,
): boolean {
  if (failed || !kernel) return false;
  const bytes = w * h * 4;
  if (src.length !== bytes || dst.length !== bytes) return false;
  if (!scratch || scratch.bytes !== bytes) {
    if (!allocateScratch(bytes)) {
      failed = true;
      return false;
    }
  }
  const s = scratch;
  if (!s) return false;
  const packed = packParams(params);
  const buf = kernel.memory.buffer;

  const srcView = new Uint8Array(buf, s.srcPtr, bytes);
  srcView.set(src);
  new Float64Array(buf, s.paramsPtr, PARAM_COUNT).set(packed);
  const st = kernel.ec_grade(s.srcPtr, s.dstPtr, w, h, s.paramsPtr, seed);
  if (st !== 0) return false;
  dst.set(new Uint8Array(buf, s.dstPtr, bytes));
  return true;
}

/** Is the kernel live (used by the rust badge on the landing reveal). */
export function kernelActive(): boolean {
  return kernel !== null;
}

/* Boot in browsers as soon as this module is imported (deferred fetch —
   never blocks hydration, and the first grade render races it). */
if (typeof window !== "undefined") void preloadKernel();
