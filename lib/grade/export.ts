/**
 * EffectCraft Studio — deterministic still exporter.
 * Re-runs the exact preview pipeline at full resolution, then optionally
 * hands the graded frame to the Detail Engine (Rust/WASM upscaler) before
 * encoding. One canvas in, one file out — no uploads at any stage.
 */

import { createStage, paintSource, renderGrade } from "./stage";
import type { GradeParams } from "./params";
import { upscaleCanvas, type UpscaleEngine } from "./upscale";

export interface ExportUpscale {
  factor: 2 | 4;
  detail: number; // 0..100 micro-contrast
  denoise: number; // 0..100 pre-blur
  /** Plan ceiling for the enlarged frame (independent of base render size). */
  maxLongEdge: number;
  /** Detail Engine (classical) or the learned ESRGAN model. */
  engine?: UpscaleEngine;
}

export interface ExportRequest {
  img: HTMLImageElement | HTMLCanvasElement;
  params: GradeParams;
  cube: { size: number; data: Float32Array } | null;
  format: "png" | "jpeg";
  quality: number;
  maxLongEdge: number;
  filenameBase?: string;
  /** Detail Engine stage — omit or null for a straight export. */
  upscale?: ExportUpscale | null;
  /** Upscale progress, 0..1. */
  onProgress?: (pct: number) => void;
  /** Abort a long neural level-up. */
  signal?: AbortSignal;
}

export interface ExportResult {
  blob: Blob;
  filename: string;
  w: number;
  h: number;
  /** True when the Detail Engine actually resampled the frame. */
  upscaled: boolean;
  /** Which engine produced the enlarged frame. */
  engine?: UpscaleEngine;
  /** Neural was requested but fell back to the classical engine. */
  fellBack?: boolean;
}

const wait = (ms = 40) => new Promise<void>((r) => setTimeout(r, ms));

export async function renderExportBlob(
  req: ExportRequest,
): Promise<ExportResult> {
  const { img, params, cube, format, quality, maxLongEdge } = req;
  const srcW =
    "naturalWidth" in img ? img.naturalWidth || img.width : img.width;
  const srcH =
    "naturalHeight" in img ? img.naturalHeight || img.height : img.height;
  const srcLong = Math.max(srcW, srcH);
  const targetLong = Math.min(maxLongEdge, srcLong);
  const scale = targetLong / srcLong;
  const tw = Math.max(2, Math.round((srcW * scale) / 2) * 2);
  const th = Math.max(2, Math.round((srcH * scale) / 2) * 2);

  const stage = createStage(tw, th);
  if (!stage) throw new Error("Could not initialize the render stage.");
  paintSource(stage, img);
  await wait(60);
  renderGrade(stage, params, { cube: cube ?? null });
  await wait(30);

  /* ── Detail Engine ──────────────────────────────────────────────
     The graded frame is the source of truth. Upscaling happens after
     the grade so micro-contrast is applied to final pixels, exactly
     like a print enlargement. */
  let output: HTMLCanvasElement = stage.graded;
  let outW = tw;
  let outH = th;
  let upscaled = false;
  let engine: UpscaleEngine | undefined;
  let fellBack = false;
  if (req.upscale) {
    const up = await upscaleCanvas(stage.graded, {
      factor: req.upscale.factor,
      detail: req.upscale.detail,
      denoise: req.upscale.denoise,
      maxLongEdge: req.upscale.maxLongEdge,
      engine: req.upscale.engine,
      signal: req.signal,
      onProgress: req.onProgress,
    });
    output = up.canvas;
    outW = up.w;
    outH = up.h;
    upscaled = up.scale > 1.01;
    engine = up.engine;
    fellBack = up.fellBack ?? false;
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    output.toBlob(
      (b) => resolve(b),
      format === "png" ? "image/png" : "image/jpeg",
      format === "png" ? undefined : quality,
    ),
  );
  if (!blob) throw new Error("Encoder returned nothing — try PNG.");
  const base = req.filenameBase ?? "effectcraft-grade";
  const ext = format === "png" ? "png" : "jpg";
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  return {
    blob,
    filename: `${base}-${outW}x${outH}-${stamp}.${ext}`,
    w: outW,
    h: outH,
    upscaled,
    engine,
    fellBack,
  };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
