"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import {
  createStage,
  paintSource,
  renderGrade,
  type Stage,
} from "@/lib/grade/stage";
import { defaultParams, type GradeParams } from "@/lib/grade/params";
import { cn } from "@/lib/cn";

const W = 960;
const H = 540;

type Zone = "lift" | "gamma" | "gain";
type WheelVal = { hue: number; sat: number };

const ZERO_WHEELS: Record<Zone, WheelVal> = {
  lift: { hue: 0, sat: 0 },
  gamma: { hue: 0, sat: 0 },
  gain: { hue: 0, sat: 0 },
};

const PRESETS: { id: string; name: string; note: string; patch: Partial<GradeParams> }[] = [
  { id: "neutral", name: "Neutral", note: "unbiased", patch: {} },
  {
    id: "dusk",
    name: "Dusk",
    note: "teal / amber",
    patch: {
      temperature: 26,
      saturation: 12,
      contrast: 8,
      liftHue: -20,
      liftSat: 14,
      gammaHue: 6,
      gammaSat: 8,
      gainHue: 18,
      gainSat: 12,
    },
  },
  {
    id: "noir",
    name: "Noir",
    note: "silver / contrast",
    patch: { saturation: -100, contrast: 34, exposure: -6, vignette: 22 },
  },
  {
    id: "gilded",
    name: "Gilded",
    note: "warm / quiet",
    patch: { temperature: 44, exposure: 7, saturation: -6, filmGrain: 7 },
  },
];

/** A 24-fps-flavoured timecode read-out. Isolated so the frame never re-renders. */
function Timecode({ className }: { className?: string }) {
  const [t, setT] = useState("00:00:00:00");
  useEffect(() => {
    const start = Date.now();
    const pad = (n: number) => String(n).padStart(2, "0");
    const id = window.setInterval(() => {
      const ms = Date.now() - start;
      const s = Math.floor(ms / 1000);
      const f = Math.floor(((ms % 1000) / 1000) * 24);
      setT(
        `00:${pad(Math.floor(s / 60))}:${pad(s % 60)}:${pad(f)}`,
      );
    }, 90);
    return () => window.clearInterval(id);
  }, []);
  return <span className={cn("timecode", className)}>{t}</span>;
}

function wheelParams(
  wheels: Record<Zone, WheelVal>,
): Partial<GradeParams> {
  return {
    liftHue: wheels.lift.hue,
    liftSat: wheels.lift.sat,
    gammaHue: wheels.gamma.hue,
    gammaSat: wheels.gamma.sat,
    gainHue: wheels.gain.hue,
    gainSat: wheels.gain.sat,
  };
}

function wheelsFromParams(p: GradeParams): Record<Zone, WheelVal> {
  return {
    lift: { hue: p.liftHue, sat: p.liftSat },
    gamma: { hue: p.gammaHue, sat: p.gammaSat },
    gain: { hue: p.gainHue, sat: p.gainSat },
  };
}

/**
 * GradeConsole — the hero exhibit. Drag the lift/gamma/gain wheels (or use
 * the sliders) and the frame re-grades live through the Rust/WASM kernel.
 * This is the product feeling itself, in the first five seconds.
 */
export function GradeConsole({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<Stage | null>(null);
  const rafRef = useRef(0);
  const [params, setParams] = useState<GradeParams>(defaultParams);
  const [preset, setPreset] = useState("neutral");

  /* one stage for the life of the page */
  useEffect(() => {
    const stage = createStage(W, H);
    if (!stage) return;
    stageRef.current = stage;
    paintSource(stage);
    const ctx = canvasRef.current?.getContext("2d");
    renderGrade(stage, params, { seed: 11 });
    ctx?.drawImage(stage.graded, 0, 0);
    return () => {
      cancelAnimationFrame(rafRef.current);
      stageRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* coalesce every interaction into one grade per frame */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      renderGrade(stage, params, { seed: 11 });
      const ctx = canvasRef.current?.getContext("2d");
      ctx?.drawImage(stage.graded, 0, 0);
    });
  }, [params]);

  const patch = (p: Partial<GradeParams>) =>
    setParams((prev) => ({ ...prev, ...p }));

  const applyPreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setPreset(id);
    setParams({ ...defaultParams(), ...p.patch });
  };

  const setWheel = (zone: Zone, v: WheelVal) => {
    setPreset("custom");
    setParams((prev) => ({
      ...prev,
      [`${zone}Hue`]: v.hue,
      [`${zone}Sat`]: v.sat,
    }));
  };

  const wheels = wheelsFromParams(params);

  return (
    <div className={cn("relative", className)}>
      {/* ── exhibit frame ── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)]">
        <div className="spectrum-bar opacity-90" />
        <div className="relative aspect-[16/9] overflow-hidden">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="absolute inset-0 h-full w-full"
            aria-label="Live grade console — drag the colour wheels to grade this frame"
          />

          {/* registration marks */}
          {(
            [
              "left-2 top-2",
              "right-2 top-2",
              "left-2 bottom-2",
              "right-2 bottom-2",
            ] as const
          ).map((pos) => (
            <span
              key={pos}
              aria-hidden
              className={cn("absolute size-2.5 opacity-50", pos)}
            >
              <span className="absolute left-1/2 top-0 h-full w-px bg-bronze" />
              <span className="absolute top-1/2 left-0 w-full h-px bg-bronze" />
            </span>
          ))}

          <span className="absolute left-4 top-3.5 flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 backdrop-blur-sm">
            <span className="size-1 rounded-full bg-bronze-bright pulse-soft" />
            <span className="hud-label !text-[#e6ff96]">
              Live grade
            </span>
          </span>
          <Timecode className="timecode absolute right-4 top-3.5 rounded-full bg-black/45 px-3 py-1.5 text-[9px] text-white/70 backdrop-blur-sm" />
          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
        </div>

        {/* caption rail */}
        <div className="flex items-center justify-between border-t border-white/10 bg-black/60 px-4 py-2.5 backdrop-blur-sm">
          <span className="hud-label !text-white/45">
            Exhibit 01 — the flat frame
          </span>
          <span className="hud-label !text-[#e6ff96]/80">
            Rust kernel · local
          </span>
        </div>
      </div>

      {/* ── console tray ── */}
      <div className="relative mt-3 overflow-hidden rounded-2xl border border-line bg-bg-raised/60 backdrop-blur-xl">
        <div className="spectrum-bar opacity-50" />
        <div className="grid gap-5 p-4 sm:p-5 md:grid-cols-[auto_1fr] md:items-center">
          {/* wheels */}
          <div className="flex items-start justify-center gap-4 sm:gap-5">
            {(Object.keys(wheels) as Zone[]).map((zone) => (
              <Wheel
                key={zone}
                label={zone}
                value={wheels[zone]}
                onChange={(v) => setWheel(zone, v)}
              />
            ))}
          </div>

          {/* sliders */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3 md:border-l md:border-line md:pl-6">
            <Slider
              label="Exposure"
              value={params.exposure}
              min={-100}
              max={100}
              onChange={(v) => {
                setPreset("custom");
                patch({ exposure: v });
              }}
              fmt={(v) => `${v > 0 ? "+" : ""}${v}`}
            />
            <Slider
              label="Warmth"
              value={params.temperature}
              min={-100}
              max={100}
              onChange={(v) => {
                setPreset("custom");
                patch({ temperature: v });
              }}
              fmt={(v) => `${v > 0 ? "+" : ""}${v}`}
            />
            <Slider
              label="Saturation"
              value={params.saturation}
              min={-100}
              max={100}
              onChange={(v) => {
                setPreset("custom");
                patch({ saturation: v });
              }}
              fmt={(v) => `${v > 0 ? "+" : ""}${v}`}
            />
          </div>
        </div>

        {/* presets */}
        <div className="flex flex-wrap items-center gap-x-1 gap-y-1 border-t border-line px-4 py-2">
          <span className="hud-label mr-2">Recipes</span>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] transition-colors",
                preset === p.id
                  ? "bg-bronze/15 text-bronze-bright"
                  : "text-ink-muted hover:text-ink",
              )}
              title={p.note}
            >
              {p.name}
            </button>
          ))}
          <button
            onClick={() => {
              setParams(defaultParams());
              setPreset("neutral");
            }}
            className="ml-auto grid size-7 place-items-center rounded-full text-ink-faint hover:text-ink transition-colors"
            title="Reset grade"
            aria-label="Reset grade"
          >
            <RotateCcw className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── the wheel itself ── */

function Wheel({
  label,
  value,
  onChange,
}: {
  label: string;
  value: WheelVal;
  onChange: (v: WheelVal) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const apply = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const radius = Math.min(1, Math.hypot(dx, dy) / (r.width / 2));
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI; // -180..180
    onChange({
      hue: Math.round((angle / 180) * 100),
      sat: Math.round(radius * 100),
    });
  };

  const rad = ((value.hue / 100) * 180 * Math.PI) / 180;
  const r = Math.min(1, value.sat / 100);
  const kx = 50 + Math.cos(rad) * r * 36;
  const ky = 50 + Math.sin(rad) * r * 36;

  return (
    <div className="flex flex-col items-center gap-1.5 select-none">
      <div
        ref={ref}
        role="slider"
        aria-label={`${label} hue and saturation`}
        aria-valuetext={`hue ${Math.round((value.hue / 100) * 22)}°, sat ${Math.round((value.sat / 100) * 24)}`}
        tabIndex={0}
        className="relative size-[70px] sm:size-[78px] cursor-crosshair rounded-full touch-none"
        style={{
          background:
            "conic-gradient(from 90deg, #f05545, #eecb4a, #68c96a, #4ecfd6, #4d8ef0, #8a6cf0, #e866c4, #f05545)",
          boxShadow: "0 0 0 1px var(--color-line-strong), inset 0 0 18px rgba(0,0,0,0.35)",
        }}
        onPointerDown={(e) => {
          dragging.current = true;
          (e.target as Element).setPointerCapture?.(e.pointerId);
          apply(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return;
          apply(e.clientX, e.clientY);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 20 : 5;
          if (e.key === "ArrowLeft") onChange({ ...value, hue: Math.max(-100, value.hue - step) });
          else if (e.key === "ArrowRight") onChange({ ...value, hue: Math.min(100, value.hue + step) });
          else if (e.key === "ArrowUp") onChange({ ...value, sat: Math.min(100, value.sat + step) });
          else if (e.key === "ArrowDown") onChange({ ...value, sat: Math.max(0, value.sat - step) });
          else return;
          e.preventDefault();
        }}
      >
        {/* desaturated core so the hue ring reads */}
        <span className="absolute inset-[9px] rounded-full bg-bg-raised/95 backdrop-blur-sm" />
        <span className="absolute inset-[9px] rounded-full border border-line" />
        <span className="absolute left-1/2 top-1/2 h-px w-[42%] -translate-x-1/2 -translate-y-1/2 bg-line-strong/60" />
        <span className="absolute left-1/2 top-1/2 h-[42%] w-px -translate-x-1/2 -translate-y-1/2 bg-line-strong/60" />
        <span
          className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/50 bg-bronze-bright"
          style={{
            left: `${kx}%`,
            top: `${ky}%`,
            boxShadow:
              "0 0 10px color-mix(in srgb, var(--color-bronze) 60%, transparent)",
          }}
        />
      </div>
      <span className="mono-label !text-[7px] !tracking-[0.26em] !text-ink-faint">
        {label}
      </span>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
  fmt,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  fmt: (v: number) => string;
}) {
  return (
    <div>
      <div className="mb-0.5 flex items-baseline justify-between">
        <span className="mono-label !text-[8px]">{label}</span>
        <span className="mono-num text-[10px] text-bronze-bright">
          {fmt(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
    </div>
  );
}
