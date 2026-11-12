"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeftRight,
  ArrowUpRight,
  Download,
  LoaderCircle,
  Maximize2,
  Sparkles,
  X,
} from "lucide-react";
import { TIER_LABEL, TIER_MAX_EXPORT, TIER_MAX_UPSCALE, type Tier } from "@/lib/license";
import { planUpscale, upscaleCanvas, type UpscaleLevel } from "@/lib/grade/upscale";
import {
  FREE_UPSCALES_PER_24H,
  UPSCALE_EVENT,
  formatQuotaWindow,
  nextFreeUpscaleIn,
  remainingUpscales,
} from "@/lib/upscale/quota";
import type { ExportOutcome, ExportPayload } from "./ExportPanel";
import { Panel, Slider } from "./ui";
import { cn } from "@/lib/cn";

const LEVELS: { value: UpscaleLevel; label: string }[] = [
  { value: 0, label: "Off" },
  { value: 2, label: "×2" },
  { value: 4, label: "×4" },
];

/** Crop size for the 1:1 loupe — a native 110px window shown at 2×. */
const LOUPE_CROP = 110;

/**
 * Pick the most detailed `cropSize` window of the source so the loupe never
 * lands on a flat patch — on smooth skies or gradients even a great upscaler
 * looks like it does nothing. Uses an integral image of gradient energy over
 * a small proxy, so the scan is cheap even for huge sources.
 */
function pickDetailRegion(
  img: HTMLImageElement,
  cropSize: number,
): { x: number; y: number; w: number; h: number } {
  const sw = img.naturalWidth || img.width;
  const sh = img.naturalHeight || img.height;
  const w = Math.min(cropSize, sw);
  const h = Math.min(cropSize, sh);
  if (w >= sw && h >= sh) return { x: 0, y: 0, w, h };

  const proxyW = Math.min(240, sw);
  const scale = proxyW / sw;
  const proxyH = Math.max(1, Math.round(sh * scale));
  const proxy = document.createElement("canvas");
  proxy.width = proxyW;
  proxy.height = proxyH;
  const pctx = proxy.getContext("2d", { willReadFrequently: true });
  if (!pctx) return { x: 0, y: 0, w, h };
  pctx.drawImage(img, 0, 0, proxyW, proxyH);
  const d = pctx.getImageData(0, 0, proxyW, proxyH).data;

  /* integral image of |dx| + |dy| on luma */
  const iw = proxyW + 1;
  const integ = new Float64Array(iw * (proxyH + 1));
  const luma = (x: number, y: number) => {
    const i = (y * proxyW + x) * 4;
    return 0.2126 * d[i]! + 0.7152 * d[i + 1]! + 0.0722 * d[i + 2]!;
  };
  for (let y = 0; y < proxyH; y++) {
    let rowSum = 0;
    for (let x = 0; x < proxyW; x++) {
      const l = luma(x, y);
      const gx = Math.abs(l - (x > 0 ? luma(x - 1, y) : l));
      const gy = Math.abs(l - (y > 0 ? luma(x, y - 1) : l));
      rowSum += gx + gy;
      integ[(y + 1) * iw + (x + 1)] =
        integ[y * iw + (x + 1)]! + rowSum;
    }
  }

  const bw = Math.max(1, Math.round(w * scale));
  const bh = Math.max(1, Math.round(h * scale));
  const stepX = Math.max(1, Math.round(bw / 4));
  const stepY = Math.max(1, Math.round(bh / 4));
  let best = -1;
  let bx = 0;
  let by = 0;
  for (let y = 0; y + bh <= proxyH; y += stepY) {
    for (let x = 0; x + bw <= proxyW; x += stepX) {
      const x2 = x + bw;
      const y2 = y + bh;
      const sum =
        integ[y2 * iw + x2]! -
        integ[y * iw + x2]! -
        integ[y2 * iw + x]! +
        integ[y * iw + x]!;
      if (sum > best) {
        best = sum;
        bx = x;
        by = y;
      }
    }
  }
  return {
    x: Math.max(0, Math.min(sw - w, Math.round(bx / scale))),
    y: Math.max(0, Math.min(sh - h, Math.round(by / scale))),
    w,
    h,
  };
}

/** Native crop used by the full-size compare modal (240 → 480 at 2×). */
const BIG_CROP = 240;

/** Render the same native crop through the browser and the Detail Engine. */
async function renderLoupe(
  image: HTMLImageElement,
  cropSize: number,
  detail: number,
  denoise: number,
): Promise<{ before: string; after: string } | null> {
  const region = pickDetailRegion(image, cropSize);
  const crop = document.createElement("canvas");
  crop.width = region.w;
  crop.height = region.h;
  const cctx = crop.getContext("2d");
  if (!cctx) return null;
  /* native pixels, no downscale — both sides start from the same data */
  cctx.drawImage(
    image,
    region.x,
    region.y,
    region.w,
    region.h,
    0,
    0,
    region.w,
    region.h,
  );

  const naive = document.createElement("canvas");
  naive.width = region.w * 2;
  naive.height = region.h * 2;
  const nctx = naive.getContext("2d");
  if (!nctx) return null;
  nctx.imageSmoothingEnabled = true;
  nctx.imageSmoothingQuality = "high";
  nctx.drawImage(crop, 0, 0, region.w * 2, region.h * 2);

  const out = await upscaleCanvas(crop, {
    factor: 2,
    detail,
    denoise,
    maxLongEdge: cropSize * 4,
  });
  return {
    before: naive.toDataURL("image/png"),
    after: out.canvas.toDataURL("image/png"),
  };
}

/**
 * Draggable before/after wipe. Both halves are the same crop at the same
 * output size, so the seam is a direct A/B — the fastest way to see what the
 * Detail Engine is actually adding.
 */
function CompareWipe({
  before,
  after,
  className,
  labels = true,
}: {
  before: string | null;
  after: string | null;
  className?: string;
  labels?: boolean;
}) {
  const [wipe, setWipe] = useState(50);
  const ref = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  const move = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setWipe(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };

  return (
    <div
      ref={ref}
      className={cn(
        "relative touch-none select-none overflow-hidden rounded-md border border-line bg-black/40",
        before && after ? "cursor-ew-resize" : "",
        className,
      )}
      onPointerDown={(e) => {
        if (!before || !after) return;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* synthetic / unsupported pointer — dragging still works */
        }
        dragging.current = true;
        move(e.clientX);
      }}
      onPointerMove={(e) => {
        if (dragging.current) move(e.clientX);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
    >
      {before && after ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={before}
            alt="Browser smoothing"
            className="block w-full"
            draggable={false}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={after}
            alt="Detail Engine"
            className="absolute inset-0 block h-full w-full"
            style={{ clipPath: `inset(0 0 0 ${wipe}%)` }}
            draggable={false}
          />
          <div
            className="pointer-events-none absolute inset-y-0 w-px bg-white/85 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
            style={{ left: `${wipe}%` }}
          >
            <span className="absolute left-1/2 top-1/2 grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/60 bg-black/65 backdrop-blur-sm">
              <ArrowLeftRight className="size-3 text-white/90" />
            </span>
          </div>
          {labels ? (
            <>
              <span className="pointer-events-none absolute left-1.5 top-1.5 rounded bg-black/55 px-1 py-0.5 text-[7px] uppercase tracking-[0.14em] text-white/60 backdrop-blur-sm">
                Browser
              </span>
              <span className="pointer-events-none absolute right-1.5 top-1.5 rounded bg-bronze/30 px-1 py-0.5 text-[7px] uppercase tracking-[0.14em] text-bronze-bright backdrop-blur-sm">
                Engine
              </span>
            </>
          ) : null}
        </>
      ) : (
        <div className="grid aspect-square place-items-center">
          <LoaderCircle className="size-3.5 animate-spin text-ink-faint" />
        </div>
      )}
    </div>
  );
}

/**
 * Level-Up — the Detail Engine control surface, always visible in the Studio.
 * Same planner, quota and kernel as the export dialog; this panel is the
 * front door so upscaling isn't buried behind Export.
 *
 * The loupe is the point: a browser bilinear stretch and the engine render the
 * same 1:1 crop at the same pixel size, so the difference is visible without
 * exporting anything.
 */
export function UpscalePanel({
  sourceDims,
  sourceImage,
  tier,
  level,
  detail,
  denoise,
  onLevel,
  onDetail,
  onDenoise,
  onOpenExport,
  onQuickExport,
}: {
  sourceDims: { w: number; h: number } | null;
  sourceImage: HTMLImageElement | null;
  tier: Tier;
  level: UpscaleLevel;
  detail: number;
  denoise: number;
  onLevel: (v: UpscaleLevel) => void;
  onDetail: (v: number) => void;
  onDenoise: (v: number) => void;
  onOpenExport: () => void;
  onQuickExport: (payload: ExportPayload) => Promise<ExportOutcome>;
}) {
  const paid = tier !== "basic";
  const maxLong = TIER_MAX_EXPORT[tier] ?? 1920;
  const upMaxLong = TIER_MAX_UPSCALE[tier] ?? 2560;

  const [remaining, setRemaining] = useState(FREE_UPSCALES_PER_24H);
  const [nextIn, setNextIn] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] = useState<
    { kind: "ok" | "err"; msg: string } | null
  >(null);
  const [loupe, setLoupe] = useState<{ before: string; after: string } | null>(null);
  const [loupeBusy, setLoupeBusy] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [bigLoupe, setBigLoupe] = useState<{ before: string; after: string } | null>(null);
  const [bigBusy, setBigBusy] = useState(false);
  const runId = useRef(0);
  const bigRunId = useRef(0);

  useEffect(() => {
    const refresh = () => {
      setRemaining(remainingUpscales(tier));
      setNextIn(nextFreeUpscaleIn(tier));
    };
    refresh();
    window.addEventListener(UPSCALE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    const id = window.setInterval(refresh, 30_000);
    return () => {
      window.removeEventListener(UPSCALE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
      window.clearInterval(id);
    };
  }, [tier]);

  const srcLong = sourceDims ? Math.max(sourceDims.w, sourceDims.h) : 0;

  /* the 1:1 base is the source, capped at the tier ceiling */
  const base = useMemo(() => {
    if (!sourceDims || srcLong <= 0) return { w: 0, h: 0 };
    const scale = Math.min(maxLong, srcLong) / srcLong;
    return {
      w: Math.max(2, Math.round((sourceDims.w * scale) / 2) * 2),
      h: Math.max(2, Math.round((sourceDims.h * scale) / 2) * 2),
    };
  }, [sourceDims, srcLong, maxLong]);

  const plans = useMemo(
    () => ({
      0: { w: base.w, h: base.h, scale: 1, limited: false, noop: true },
      2:
        base.w > 0
          ? planUpscale(base.w, base.h, 2, upMaxLong)
          : { w: 0, h: 0, scale: 1, limited: false, noop: true },
      4:
        base.w > 0
          ? planUpscale(base.w, base.h, 4, upMaxLong)
          : { w: 0, h: 0, scale: 1, limited: false, noop: true },
    }),
    [base.w, base.h, upMaxLong],
  );

  const levelLocked = !paid && remaining <= 0;
  /* On free, ×4 clamps to the same 2K as ×2 — offering it would silently
     produce a duplicate file. Disable it and point at Pro instead. */
  const fourKRedundant =
    plans[2].w > 0 && plans[4].w > 0 && plans[4].w <= plans[2].w;
  const canLevel = (v: UpscaleLevel) =>
    v === 0 || (!levelLocked && !plans[v].noop && !(v === 4 && fourKRedundant));
  const planned = plans[level];

  /* ── 1:1 loupe: browser smoothing vs the Detail Engine ────────── */
  useEffect(() => {
    if (!sourceImage || level === 0) {
      setLoupe(null);
      return;
    }
    const id = ++runId.current;
    const timer = window.setTimeout(async () => {
      setLoupeBusy(true);
      try {
        const r = await renderLoupe(sourceImage, LOUPE_CROP, detail, denoise);
        if (id === runId.current && r) setLoupe(r);
      } catch {
        /* loupe is decorative — never block the panel */
      } finally {
        if (id === runId.current) setLoupeBusy(false);
      }
    }, 220);
    return () => window.clearTimeout(timer);
  }, [sourceImage, level, detail, denoise]);

  /* ── larger compare render, only while the modal is open ───────── */
  useEffect(() => {
    if (!compareOpen || !sourceImage) {
      setBigLoupe(null);
      return;
    }
    const id = ++bigRunId.current;
    const timer = window.setTimeout(async () => {
      setBigBusy(true);
      try {
        const r = await renderLoupe(sourceImage, BIG_CROP, detail, denoise);
        if (id === bigRunId.current && r) setBigLoupe(r);
      } catch {
        /* ignore */
      } finally {
        if (id === bigRunId.current) setBigBusy(false);
      }
    }, 120);
    return () => window.clearTimeout(timer);
  }, [compareOpen, sourceImage, detail, denoise]);

  useEffect(() => {
    if (!compareOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCompareOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [compareOpen]);

  async function quickExport() {
    if (level === 0 || busy) {
      onOpenExport();
      return;
    }
    setBusy(true);
    setProgress(0);
    setStatus(null);
    try {
      const out = await onQuickExport({
        format: "jpeg",
        quality: 95,
        maxLongEdge: maxLong,
        upscale: { factor: level, detail, denoise, maxLongEdge: upMaxLong },
        onProgress: setProgress,
      });
      setStatus({
        kind: "ok",
        msg: out.upscaled
          ? `Exported ${out.w} × ${out.h} — leveled up`
          : `Exported ${out.w} × ${out.h}`,
      });
    } catch (err) {
      setStatus({
        kind: "err",
        msg: err instanceof Error ? err.message : "Level-up failed.",
      });
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <>
      <Panel
        title="Level-Up"
      side={
        <span
          className={cn(
            "mono-label !text-[8px]",
            levelLocked ? "!text-[#f05545]" : paid ? "!text-bronze-bright" : "!text-ink-muted",
          )}
        >
          {paid
            ? "UNLIMITED"
            : levelLocked
              ? `NEXT IN ${formatQuotaWindow(nextIn)}`
              : `${remaining} OF ${FREE_UPSCALES_PER_24H} · 24H`}
        </span>
      }
    >
      <p className="mono-label !text-[8px] !text-ink-faint -mt-2 mb-3">
        DETAIL ENGINE — LANCZOS3 + MICRO-CONTRAST
      </p>

      {sourceDims ? (
        <p className="mono-num text-[11px] text-ink-muted mb-3">
          {base.w} × {base.h}
          <span className="text-ink-faint"> → </span>
          <span className={level > 0 ? "text-bronze-bright" : "text-ink-faint"}>
            {planned.w} × {planned.h}
          </span>
          {level > 0 ? (
            <span className="text-ink-faint">
              {" "}
              · {planned.w >= 3800 ? "4K" : planned.w >= 2500 ? "2K" : "HD"}
            </span>
          ) : null}
        </p>
      ) : (
        <p className="text-[12px] text-ink-faint mb-3">
          Open a frame to level up its detail.
        </p>
      )}

      <div className="grid grid-cols-3 gap-1.5">
        {LEVELS.map(({ value, label }) => {
          const plan = plans[value];
          const redundant = value === 4 && fourKRedundant;
          const disabled = !sourceDims || !canLevel(value);
          const dims = redundant
            ? "PRO · 4K"
            : plan.w > 0
              ? `${plan.w} × ${plan.h}`
              : value === 0
                ? "native"
                : "—";
          return (
            <button
              key={value}
              disabled={disabled}
              onClick={() => onLevel(value)}
              title={
                disabled && value !== 0 && sourceDims
                  ? levelLocked
                    ? "Free level-ups used — resets on a rolling 24h window"
                    : redundant
                      ? `4K level-ups need Pro — ×4 would match ×2 at your ${upMaxLong}px ceiling`
                      : "Already at your level-up ceiling"
                  : undefined
              }
              className={cn(
                "rounded-lg border px-2 py-2 text-left transition-colors",
                disabled
                  ? "border-line opacity-35 cursor-not-allowed"
                  : level === value
                    ? "border-bronze/60 bg-bronze/12"
                    : "border-line hover:border-bronze/40",
              )}
            >
              <span className="block text-[13px] leading-none">{label}</span>
              <span className="mono-num mt-1 block text-[8px] text-ink-faint">
                {dims}
              </span>
            </button>
          );
        })}
      </div>

      {level > 0 && planned.limited ? (
        <p className="mono-label !text-[7px] mt-2 !text-[#d8a15a]">
          CLAMPED TO YOUR {TIER_LABEL[tier].toUpperCase()} CEILING —{" "}
          {planned.scale.toFixed(2)}× EFFECTIVE
        </p>
      ) : null}

      {/* ── 1:1 detail loupe ── */}
      {level > 0 && sourceDims ? (
        <div className="mt-3 border-t border-line pt-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="mono-label !text-[8px] !text-ink-faint">
              1:1 CROP · DRAG TO COMPARE
            </span>
            {loupeBusy ? (
              <span className="mono-label !text-[8px] !text-bronze-bright">RENDERING</span>
            ) : (
              <span className="mono-label !text-[8px] !text-ink-faint">2×</span>
            )}
          </div>
          <CompareWipe
            before={loupe?.before ?? null}
            after={loupe?.after ?? null}
            className="mx-auto w-full max-w-[220px]"
          />
          <button
            onClick={() => setCompareOpen(true)}
            disabled={!loupe}
            className="btn-ghost mt-2 w-full justify-center !py-2 text-[11px] gap-1.5 disabled:opacity-40"
          >
            <Maximize2 className="size-3" />
            Open full-size compare
          </button>
        </div>
      ) : null}

      {level > 0 && sourceDims ? (
        <div className="mt-3 space-y-2.5 border-t border-line pt-3">
          <Slider label="Detail" value={detail} min={0} max={100} onChange={onDetail} accent />
          <Slider label="Smooth" value={denoise} min={0} max={100} onChange={onDenoise} />
        </div>
      ) : null}

      {status ? (
        <p
          className={cn(
            "mt-3 text-[11px]",
            status.kind === "ok" ? "text-[#68c96a]" : "text-[#f05545]",
          )}
        >
          {status.msg}
        </p>
      ) : null}

      <div className="mt-3.5 flex flex-col gap-2">
        <button
          onClick={quickExport}
          disabled={!sourceDims || busy || (level > 0 && levelLocked)}
          className="btn-primary w-full justify-center !py-2.5 text-[12px] gap-2 disabled:opacity-40"
        >
          {busy ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : level > 0 ? (
            <Sparkles className="size-3.5" />
          ) : (
            <Download className="size-3.5" />
          )}
          {busy
            ? progress !== null && progress > 0
              ? `Leveling up — ${Math.round(progress * 100)}%`
              : "Leveling up…"
            : level > 0
              ? `Level up ${level}× & download`
              : "Export options"}
        </button>
        <button
          onClick={onOpenExport}
          disabled={!sourceDims}
          className="btn-ghost w-full justify-center !py-2 text-[11px] gap-1.5 disabled:opacity-40"
        >
          <ArrowUpRight className="size-3" />
          Format, quality &amp; resolution
        </button>
      </div>
    </Panel>

    {compareOpen
      ? createPortal(
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setCompareOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Detail Engine 1:1 comparison"
          >
            <div
              className="w-full max-w-[520px] rounded-2xl border border-line bg-surface p-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <header className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="mono-label !text-[9px]">DETAIL ENGINE · 1:1</p>
                  <h2 className="display mt-1 text-lg">Drag the seam</h2>
                </div>
                <button
                  onClick={() => setCompareOpen(false)}
                  className="p-1.5 text-ink-muted hover:text-ink"
                  aria-label="Close compare"
                >
                  <X className="size-4" />
                </button>
              </header>

              <CompareWipe
                before={bigLoupe?.before ?? null}
                after={bigLoupe?.after ?? null}
                className="w-full"
              />

              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="mono-label !text-[7px] !text-ink-faint">
                  {BIG_CROP}px NATIVE CROP → 2× · BOTH SIDES {BIG_CROP * 2}px
                </p>
                {bigBusy ? (
                  <span className="mono-label !text-[7px] !text-bronze-bright">RENDERING</span>
                ) : null}
              </div>

              <div className="mt-3 border-t border-line pt-3">
                <Slider
                  label="Detail"
                  value={detail}
                  min={0}
                  max={100}
                  onChange={onDetail}
                  accent
                />
              </div>
            </div>
          </div>,
          document.body,
        )
      : null}
    </>
  );
}
