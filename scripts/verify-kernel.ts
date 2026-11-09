/**
 * Kernel parity harness — JS engine vs Rust/WASM kernel.
 * Pixel-level diff across representative parameter matrices; PASS if the
 * outputs differ by at most 1 unit per channel (rounding ties), ideally 0.
 * Run: bun run verify-kernel
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { gradePass } from "../lib/grade/engine";
import { gradeKernelInto, loadKernelNow } from "../lib/grade/kernel";
import { defaultParams, type GradeParams } from "../lib/grade/params";

function rngImage(w: number, h: number, seed: number): Uint8ClampedArray {
  let s = seed >>> 0;
  const next = () => {
    // xorshift-ish deterministic noise
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

type Case = { name: string; params: Partial<GradeParams>; seed: number };

const CASES: Case[] = [
  { name: "defaults", params: {}, seed: 11 },
  {
    name: "base curve + temp edge -25 (Math.round(-6.5) ≠ rust round)",
    params: {
      exposure: -40,
      contrast: 30,
      brightness: 18,
      temperature: -25,
      tint: 25,
      saturation: 20,
    },
    seed: 7,
  },
  {
    name: "temp/tint positive edges (t=+25 → +6.5)",
    params: { temperature: 25, tint: -25, exposure: 35, saturation: -20 },
    seed: 11,
  },
  {
    name: "full HSL path (bands + 3-way + hdr + recovery)",
    params: {
      saturation: -30,
      hsl: {
        ...defaultParams().hsl,
        orange: { h: 24, s: -18, l: 12 },
        teal: { h: -30, s: 25, l: -8 },
        blue: { h: 0, s: 30, l: 0 },
        red: { h: -12, s: 10, l: 6 },
      },
      liftHue: 25,
      liftSat: -14,
      gammaHue: -18,
      gammaSat: 16,
      gainHue: -22,
      gainSat: 12,
      hdr: 40,
      highlightRecovery: 35,
    } as Partial<GradeParams>,
    seed: 42,
  },
  {
    name: "grain + vignette heavy (fast path)",
    params: { filmGrain: 60, vignette: 45, saturation: 50, brightness: -24 },
    seed: 3,
  },
  {
    name: "extremes — everything slammed",
    params: {
      exposure: -100,
      contrast: -100,
      brightness: -100,
      temperature: -100,
      tint: -100,
      saturation: 0,
      vignette: 100,
      filmGrain: 100,
    },
    seed: 99,
  },
  {
    name: "hsl micro-values (sub-cent rounding)",
    params: {
      hsl: {
        ...defaultParams().hsl,
        yellow: { h: 0.5, s: 0.5, l: 0.5 },
        aqua: { h: -0.5, s: -0.5, l: -0.5 },
      },
      liftHue: 0.5,
      gammaSat: -0.5,
    } as Partial<GradeParams>,
    seed: 5,
  },
];

function run(params: GradeParams, src: Uint8ClampedArray, w: number, h: number, seed: number) {
  const dstJs = new Uint8ClampedArray(src.length);
  const dstK = new Uint8ClampedArray(src.length);
  const t0 = performance.now();
  gradePass(src, dstJs, w, h, params, null, seed);
  const jsMs = performance.now() - t0;
  const t1 = performance.now();
  const ok = gradeKernelInto(src, dstK, w, h, params, seed);
  const kMs = performance.now() - t1;
  let diff = 0;
  let mismatches = 0;
  if (!ok) return { ok: false as const, jsMs, kMs };
  for (let i = 0; i < src.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const d = Math.abs(dstJs[i + c]! - dstK[i + c]!);
      if (d > diff) diff = d;
      if (d !== 0) mismatches++;
    }
    if (dstJs[i + 3] !== dstK[i + 3]) mismatches++;
  }
  return { ok: true as const, diff, mismatches, jsMs, kMs, pixels: w * h };
}

const W = 160;
const H = 120;
const SRC = rngImage(W, H, 1234567);
let allOk = true;
let kernelLive = false;

try {
  const wasmPath = fileURLToPath(new URL("../public/wasm/engine.kernel.v2.wasm", import.meta.url));
  const wasmBytes = readFileSync(wasmPath);
  kernelLive = await loadKernelNow(
    wasmBytes.buffer.slice(
      wasmBytes.byteOffset,
      wasmBytes.byteOffset + wasmBytes.byteLength,
    ) as ArrayBuffer,
  );
} catch {
  kernelLive = false;
}
if (!kernelLive) {
  console.error("✗ kernel failed to boot — check public/wasm/engine.kernel.v2.wasm");
  process.exit(1);
}

for (const c of CASES) {
  const params = { ...defaultParams(), ...c.params } as GradeParams;
  const r = run(params, SRC, W, H, c.seed);
  if (!r.ok) {
    console.error(`✗ ${c.name} — kernel returned false`);
    allOk = false;
    continue;
  }
  const status =
    r.diff <= 1
      ? `✓ maxAbsDiff=${r.diff}${r.diff === 0 ? " (bit-identical)" : ""}`
      : `✗ maxAbsDiff=${r.diff} — EXCEEDS TOLERANCE`;
  console.log(
    `${r.diff <= 1 ? "✓" : "✗"} ${c.name.padEnd(46)} ${status}  mismatches=${r.mismatches}  js=${r.jsMs.toFixed(1)}ms kernel=${r.kMs.toFixed(1)}ms`,
  );
  if (r.diff > 1) allOk = false;
}

/* bench: bigger frame for a believable number */
{
  const BW = 640;
  const BH = 360;
  const B = rngImage(BW, BH, 777);
  const p = {
    ...defaultParams(),
    temperature: 30,
    saturation: 25,
    hsl: { ...defaultParams().hsl, orange: { h: 20, s: -15, l: 10 } },
  } as GradeParams;
  gradePass(B, new Uint8ClampedArray(B.length), BW, BH, p, null, 11);
  const t0 = performance.now();
  const ok = gradeKernelInto(B, new Uint8ClampedArray(B.length), BW, BH, p, 11);
  const kMs = performance.now() - t0;
  // warm JS timing
  const t1 = performance.now();
  gradePass(B, new Uint8ClampedArray(B.length), BW, BH, p, null, 11);
  const jMs = performance.now() - t1;
  if (ok) {
    console.log(
      `  bench ${BW}×${BH} (HSL path): js=${jMs.toFixed(1)}ms kernel=${kMs.toFixed(1)}ms → ${(jMs / kMs).toFixed(1)}× speedup`,
    );
  }
}

console.log(allOk ? "\nKERNEL PARITY: PASS" : "\nKERNEL PARITY: FAIL");
process.exit(allOk ? 0 : 1);
