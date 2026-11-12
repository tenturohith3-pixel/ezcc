"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Download, LoaderCircle, Sparkles } from "lucide-react";
import { TIER_LABEL, TIER_MAX_EXPORT, type Tier } from "@/lib/license";
import { planUpscale, type UpscaleLevel } from "@/lib/grade/upscale";
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

/**
 * Level-Up — the Detail Engine control surface, always visible in the Studio.
 * Same planner, quota and kernel as the export dialog; this panel is the
 * front door so upscaling isn't buried behind Export.
 */
export function UpscalePanel({
  sourceDims,
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

  const [remaining, setRemaining] = useState(FREE_UPSCALES_PER_24H);
  const [nextIn, setNextIn] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] = useState<
    { kind: "ok" | "err"; msg: string } | null
  >(null);

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
          ? planUpscale(base.w, base.h, 2, maxLong)
          : { w: 0, h: 0, scale: 1, limited: false, noop: true },
      4:
        base.w > 0
          ? planUpscale(base.w, base.h, 4, maxLong)
          : { w: 0, h: 0, scale: 1, limited: false, noop: true },
    }),
    [base.w, base.h, maxLong],
  );

  const levelLocked = !paid && remaining <= 0;
  const canLevel = (v: UpscaleLevel) => v === 0 || (!levelLocked && !plans[v].noop);
  const planned = plans[level];

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
        quality: 92,
        maxLongEdge: maxLong,
        upscale: { factor: level, detail, denoise, maxLongEdge: maxLong },
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
        DETAIL ENGINE — LANCZOS3 IN LINEAR LIGHT
      </p>

      {sourceDims ? (
        <p className="mono-num text-[11px] text-ink-muted mb-3">
          {base.w} × {base.h}
          <span className="text-ink-faint"> → </span>
          <span className={level > 0 ? "text-bronze-bright" : "text-ink-faint"}>
            {planned.w} × {planned.h}
          </span>
        </p>
      ) : (
        <p className="text-[12px] text-ink-faint mb-3">
          Open a frame to level up its detail.
        </p>
      )}

      <div className="grid grid-cols-3 gap-1.5">
        {LEVELS.map(({ value, label }) => {
          const plan = plans[value];
          const disabled = !sourceDims || !canLevel(value);
          const dims =
            plan.w > 0 ? `${plan.w} × ${plan.h}` : value === 0 ? "native" : "—";
          return (
            <button
              key={value}
              disabled={disabled}
              onClick={() => onLevel(value)}
              title={
                disabled && value !== 0 && sourceDims
                  ? levelLocked
                    ? "Free level-ups used — resets on a rolling 24h window"
                    : "Already at your export ceiling"
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

      {sourceDims && level > 0 ? (
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
  );
}
