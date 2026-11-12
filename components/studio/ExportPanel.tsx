"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import { TIER_LABEL, TIER_MAX_EXPORT, TIER_MAX_UPSCALE, type Tier } from "@/lib/license";
import { planUpscale, type UpscaleLevel } from "@/lib/grade/upscale";
import {
  FREE_UPSCALES_PER_24H,
  UPSCALE_EVENT,
  formatQuotaWindow,
  nextFreeUpscaleIn,
  remainingUpscales,
} from "@/lib/upscale/quota";

export interface ExportTarget {
  w: number;
  h: number;
  longEdge: number;
}

export interface ExportPayload {
  format: "png" | "jpeg";
  quality: number;
  maxLongEdge: number;
  upscale: {
    factor: 2 | 4;
    detail: number;
    denoise: number;
    maxLongEdge: number;
  } | null;
  onProgress: (pct: number) => void;
}

export interface ExportOutcome {
  w: number;
  h: number;
  upscaled: boolean;
}

type Level = UpscaleLevel;

const LEVELS: { value: Level; label: string }[] = [
  { value: 0, label: "Off" },
  { value: 2, label: "×2" },
  { value: 4, label: "×4" },
];

export function ExportPanel({
  sourceDims,
  tier,
  onClose,
  onExport,
  level,
  detail,
  denoise,
  onLevel,
  onDetail,
  onDenoise,
}: {
  sourceDims: { w: number; h: number } | null;
  tier: Tier;
  onClose: () => void;
  onExport: (t: ExportPayload) => Promise<ExportOutcome>;
  level: Level;
  detail: number;
  denoise: number;
  onLevel: (v: Level) => void;
  onDetail: (v: number) => void;
  onDenoise: (v: number) => void;
}) {
  const [format, setFormat] = useState<"png" | "jpeg">("jpeg");
  const [quality, setQuality] = useState(92);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] = useState<
    { kind: "ok" | "err"; msg: string } | null
  >(null);

  const paid = tier !== "basic";
  const [remaining, setRemaining] = useState(FREE_UPSCALES_PER_24H);
  const [nextIn, setNextIn] = useState(0);

  /* quota is a rolling window — refresh on record, cross-tab change,
     and once the current window rolls over */
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

  const maxLong = TIER_MAX_EXPORT[tier] ?? 1920;
  /* level-up has its own, higher ceiling — see TIER_MAX_UPSCALE */
  const upMaxLong = TIER_MAX_UPSCALE[tier] ?? 2560;
  const srcLong = useMemo(() => {
    if (!sourceDims) return 0;
    return Math.max(sourceDims.w, sourceDims.h);
  }, [sourceDims]);

  const options = useMemo(() => {
    const out: { label: string; long: number; disabled: boolean; note: string }[] = [];
    const unlockNote =
      tier === "basic" || tier === "bundle"
        ? "Pro unlocks"
        : tier === "pro"
          ? "Studio unlocks"
          : tier === "studio"
            ? "Lifetime unlocks"
            : "";
    /* a native source target whenever the long edge isn't a preset —
       level-up deserves an honest 1:1 base to enlarge from */
    if (sourceDims && srcLong > 0 && ![1920, 2560, 3840, 7680].includes(srcLong)) {
      out.push({
        label: `${sourceDims.w} × ${sourceDims.h}`,
        long: srcLong,
        disabled: srcLong > maxLong,
        note: srcLong > maxLong ? unlockNote : "native",
      });
    }
    const push = (label: string, long: number) => {
      out.push({
        label,
        long,
        disabled: long > maxLong || (srcLong > 0 && long > srcLong),
        note:
          long > maxLong
            ? unlockNote
            : srcLong > 0 && long > srcLong
              ? "larger than source"
              : "",
      });
    };
    push("1920 × HD", 1920);
    push("2560 × 2K", 2560);
    push("3840 × 4K", 3840);
    push("Source max", 7680);
    return out;
  }, [maxLong, srcLong, tier, sourceDims]);

  const selected = options.find(
    (o) => o.long === Math.min(maxLong, srcLong || maxLong) && !o.disabled,
  ) ?? options.find((o) => !o.disabled) ?? options[0];

  const [choiceLong, setChoiceLong] = useState<number | null>(null);
  const active = choiceLong ?? selected?.long ?? 1920;

  /* base render (pre level-up) — mirrors lib/grade/export.ts */
  const base = useMemo(() => {
    if (!sourceDims || srcLong <= 0) return { w: 0, h: 0 };
    const s = Math.min(active, srcLong) / srcLong;
    return {
      w: Math.max(2, Math.round((sourceDims.w * s) / 2) * 2),
      h: Math.max(2, Math.round((sourceDims.h * s) / 2) * 2),
    };
  }, [sourceDims, srcLong, active]);

  /* live plan for each factor — same pure planner the engine runs */
  const plans = useMemo(
    () =>
      ({
        0: { w: base.w, h: base.h, scale: 1, limited: false, noop: true },
        2:
          base.w > 0
            ? planUpscale(base.w, base.h, 2, upMaxLong)
            : { w: 0, h: 0, scale: 1, limited: false, noop: true },
        4:
          base.w > 0
            ? planUpscale(base.w, base.h, 4, upMaxLong)
            : { w: 0, h: 0, scale: 1, limited: false, noop: true },
      }) as const,
    [base.w, base.h, upMaxLong],
  );

  const levelLocked = !paid && remaining <= 0;
  const planned = plans[level];
  /* ×4 on free clamps to the same 2K as ×2 — disable it rather than
     handing back a byte-identical file under a different name. */
  const fourKRedundant =
    plans[2].w > 0 && plans[4].w > 0 && plans[4].w <= plans[2].w;
  const canLevel = (value: Level) =>
    value === 0 ||
    (!levelLocked && !plans[value].noop && !(value === 4 && fourKRedundant));

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center px-4">
      <div className="absolute inset-0 scrim backdrop-blur-sm" onClick={onClose} />
      <div
        id="export"
        className="relative flex max-h-[calc(100svh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-line bg-bg-raised shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-line px-6 py-5">
          <div>
            <h2 className="display text-lg">Export still</h2>
            <p className="mono-label !text-[9px] mt-1">
              {TIER_LABEL[tier]} PLAN — MAX {maxLong >= 7680 ? "SOURCE ×4K+" : maxLong}
            </p>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink text-xl" aria-label="Close">
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {sourceDims ? (
            <p className="mono-num text-[11px] text-ink-faint">
              SOURCE — {sourceDims.w} × {sourceDims.h}
            </p>
          ) : null}

          <div>
            <p className="text-[12px] text-ink-muted mb-2">Resolution</p>
            <div className="grid grid-cols-2 gap-2">
              {options.map((o) => (
                <button
                  key={o.label}
                  disabled={o.disabled}
                  onClick={() => setChoiceLong(o.long)}
                  className={
                    o.disabled
                      ? "rounded-lg border border-line px-3 py-2.5 text-left opacity-35 cursor-not-allowed"
                      : active === o.long
                        ? "rounded-lg border border-bronze/60 bg-bronze/10 px-3 py-2.5 text-left"
                        : "rounded-lg border border-line px-3 py-2.5 text-left hover:border-line-strong"
                  }
                >
                  <span className="text-[13px] block">{o.label}</span>
                  <span className="text-[10px] text-ink-faint block mt-0.5">
                    {o.disabled ? o.note : "available"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Level-Up ─────────────────────────────────────────── */}
          <div className="rounded-xl border border-bronze/25 bg-bronze/[0.045] p-3.5">
            <div className="mb-2.5 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-3.5 text-bronze-bright" />
                <div>
                  <p className="text-[12px] leading-none">Level-Up</p>
                  <p className="mono-label !text-[7px] mt-1 !text-ink-faint">
                    DETAIL ENGINE — LANCZOS3 IN LINEAR LIGHT
                  </p>
                </div>
              </div>
              <span
                className={
                  levelLocked
                    ? "mono-label !text-[7px] !text-[#f05545] text-right"
                    : paid
                      ? "mono-label !text-[7px] !text-bronze-bright text-right"
                      : "mono-label !text-[7px] !text-ink-muted text-right"
                }
              >
                {paid
                  ? `UNLIMITED · ${TIER_LABEL[tier].toUpperCase()}`
                  : levelLocked
                    ? `NEXT IN ${formatQuotaWindow(nextIn)}`
                    : `${remaining} OF ${FREE_UPSCALES_PER_24H} · 24H`}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {LEVELS.map(({ value, label }) => {
                const plan = plans[value];
                const redundant = value === 4 && fourKRedundant;
                const disabled = !canLevel(value);
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
                      disabled && value !== 0
                        ? levelLocked
                          ? "Free level-ups used — resets on a rolling 24h window"
                          : redundant
                            ? `4K level-ups need Pro — ×4 would match ×2 at your ${upMaxLong}px ceiling`
                            : "Already at your export ceiling"
                        : undefined
                    }
                    className={
                      disabled
                        ? "rounded-lg border border-line px-2 py-2 text-left opacity-35 cursor-not-allowed"
                        : level === value
                          ? "rounded-lg border border-bronze/60 bg-bronze/12 px-2 py-2 text-left"
                          : "rounded-lg border border-line px-2 py-2 text-left hover:border-bronze/40"
                    }
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

            {base.w > 0 && plans[2].noop && plans[4].noop ? (
              <p className="mono-label !text-[7px] mt-2 !text-ink-faint">
                {paid
                  ? `ALREADY AT YOUR ${upMaxLong}PX LEVEL-UP CEILING`
                  : `FREE LEVEL-UP REACHES ${upMaxLong}PX — PRO UNLOCKS 4K`}
              </p>
            ) : null}

            {level > 0 ? (
              <div className="mt-3 space-y-2.5 border-t border-bronze/15 pt-3">
                <MiniSlider
                  label="Detail"
                  hint="edge micro-contrast"
                  value={detail}
                  onChange={onDetail}
                />
                <MiniSlider
                  label="Smooth"
                  hint="denoise before resample"
                  value={denoise}
                  onChange={onDenoise}
                />
              </div>
            ) : null}
          </div>

          <div>
            <p className="text-[12px] text-ink-muted mb-2">Format</p>
            <div className="flex gap-2">
              {(["jpeg", "png"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={
                    format === f
                      ? "flex-1 rounded-lg border border-bronze/60 bg-bronze/10 py-2 text-[13px] uppercase"
                      : "flex-1 rounded-lg border border-line py-2 text-[13px] uppercase text-ink-muted hover:border-line-strong"
                  }
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {format === "jpeg" ? (
            <SliderBlock quality={quality} setQuality={setQuality} />
          ) : null}

        </div>

        <footer className="shrink-0 border-t border-line px-6 py-4">
          <p className="mono-num mb-2 text-[10px] text-ink-faint">
            OUTPUT — {planned.w > 0 ? `${planned.w} × ${planned.h}` : "—"}
            {level > 0 ? " · DETAIL ENGINE" : ""}
          </p>

          {status ? (
            <p
              className={
                status.kind === "ok"
                  ? "mb-2 flex items-center gap-2 text-[12px] text-[#68c96a]"
                  : "mb-2 flex items-center gap-2 text-[12px] text-[#f05545]"
              }
            >
              {status.kind === "ok" ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
              {status.msg}
            </p>
          ) : null}

          {busy && progress !== null && progress > 0 ? (
            <div className="mb-3">
              <div className="mb-1 flex items-baseline justify-between">
                <span className="mono-label !text-[8px]">LEVELING UP</span>
                <span className="mono-num text-[10px] text-bronze-bright">
                  {Math.round(progress * 100)}%
                </span>
              </div>
              <div className="h-px w-full overflow-hidden bg-line">
                <div
                  className="h-full bg-bronze transition-[width] duration-150"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            </div>
          ) : null}

          <button
            disabled={busy || !sourceDims || (level > 0 && levelLocked)}
            onClick={async () => {
              setBusy(true);
              setProgress(level > 0 ? 0 : null);
              setStatus(null);
              try {
                const out = await onExport({
                  format,
                  quality: quality / 100,
                  maxLongEdge: active,
                  upscale:
                    level > 0
                      ? {
                          factor: level === 4 ? 4 : 2,
                          detail,
                          denoise,
                          maxLongEdge: upMaxLong,
                        }
                      : null,
                  onProgress: setProgress,
                });
                setStatus({
                  kind: "ok",
                  msg: `Exported ${out.w} × ${out.h}${
                    out.upscaled ? " — leveled up" : ""
                  } — check your downloads.`,
                });
              } catch (err) {
                setStatus({
                  kind: "err",
                  msg: err instanceof Error ? err.message : "Export failed.",
                });
              } finally {
                setBusy(false);
                setProgress(null);
              }
            }}
            className={busy ? "btn-primary w-full justify-center opacity-70" : "btn-primary w-full justify-center gap-2"}
          >
            {busy ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />{" "}
                {progress !== null && progress > 0
                  ? `Leveling up ${Math.round(progress * 100)}%…`
                  : "Compositing…"}
              </>
            ) : (
              <>
                <Download className="size-4" />
                {level > 0 ? "Render, level up & download" : "Render & download"}
              </>
            )}
          </button>
          <p className="mono-label !text-[8px] mt-3 text-center !text-ink-faint">
            DETERMINISTIC RENDER — SEED LOCKED — UPLOADS 0
          </p>
          <button onClick={onClose} className="sr-only">close</button>
        </footer>
      </div>
    </div>
  );
}

function MiniSlider({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="mono-label !text-[8px]">
          {label}
          <span className="ml-2 !normal-case !tracking-normal text-ink-faint">
            {hint}
          </span>
        </span>
        <span className="mono-num text-[10px] text-bronze-bright">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
    </div>
  );
}

function SliderBlock({
  quality,
  setQuality,
}: {
  quality: number;
  setQuality: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[12px] text-ink-muted">Quality</span>
        <span className="mono-num text-[11px] text-ink-faint">{quality}%</span>
      </div>
      <input
        type="range"
        min={40}
        max={100}
        value={quality}
        onChange={(e) => setQuality(Number(e.target.value))}
        aria-label="JPEG quality"
      />
    </div>
  );
}
