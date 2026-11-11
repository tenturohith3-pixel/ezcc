"use client";

/**
 * THE LAB — a bento panel of seven real instruments plus one door.
 * Cards track the pointer for a spectral spotlight; anime.js lifts them in.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { animate, stagger } from "animejs";
import {
  ArrowRight,
  ArrowUpRight,
  Cpu,
  Download,
  LockKeyhole,
  Monitor,
  Moon,
  Sun,
  Waves,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  loadThemePref,
  saveTheme,
  THEME_EVENT,
  type ThemePref,
} from "@/lib/theme";
import { createStage, paintSource } from "@/lib/grade/stage";

/* ── shared card ─────────────────────────────────────────────── */

function BentoCard({
  children,
  className,
  index,
  span,
}: {
  children: ReactNode;
  className?: string;
  index: string;
  span?: string;
}) {
  return (
    <div
      data-bento
      onPointerMove={(e) => {
        const el = e.currentTarget;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
      className={cn(
        "bento-card group flex flex-col p-5 md:p-6",
        span ?? "",
        className,
      )}
    >
      <span className="hud-label absolute right-4 top-4 opacity-50">
        {index}
      </span>
      <span className="corner-tick left-3 top-3 border-l border-t" />
      <span className="corner-tick bottom-3 right-3 border-b border-r" />
      {children}
    </div>
  );
}

/* ── instrument 01 · engine monitor ─────────────────────────── */

const BARS = [
  22, 36, 30, 48, 42, 62, 74, 58, 82, 68, 92, 78, 64, 88, 72, 54, 66, 80, 62,
  48, 60, 44, 34, 52, 40, 28, 38, 46, 32, 22, 18, 30, 26, 18, 12, 20, 14, 10,
  16, 12,
];

function EngineMonitor() {
  return (
    <>
      <div className="flex items-center gap-2">
        <Waves className="size-4 text-bronze" />
        <span className="hud-label !text-ink-muted">Live grade monitor</span>
      </div>
      <p className="display mt-5 max-w-sm text-[1.7rem] leading-[1.02] md:text-[2rem]">
        The engine is always
        <span className="text-bronze"> awake.</span>
      </p>
      <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-ink-muted">
        Wheels, curves, 8-channel HSL, film grain and halation — one Rust
        kernel, re-grading every frame you touch.
      </p>

      <div className="relative mt-7 rounded-xl border border-line bg-bg/50 p-4">
        <div className="flex items-baseline justify-between">
          <span className="hud-label">Luma distribution</span>
          <span className="mono-num text-[10px] text-bronze-bright">
            18.4 ms / frame
          </span>
        </div>
        <div className="mt-3 flex h-28 items-end gap-[3px]">
          {BARS.map((h, i) => (
            <span
              key={i}
              className={cn(
                "flex-1 origin-bottom rounded-t-[2px]",
                i % 7 === 0
                  ? "bg-gradient-to-t from-prism-b/10 to-prism-b/80"
                  : "bg-gradient-to-t from-bronze/5 to-bronze/80",
              )}
              style={{
                height: `${h}%`,
                animation: `eq-bounce ${1.6 + (i % 5) * 0.14}s ease-in-out ${(i % 11) * -0.09}s infinite alternate`,
              }}
            />
          ))}
        </div>
        <div className="mt-3 flex justify-between border-t border-line pt-2">
          {[
            ["Shadows", "12"],
            ["Mids", "+04"],
            ["Highlights", "−08"],
          ].map(([k, v]) => (
            <span key={k} className="hud-label">
              {k} <span className="text-ink">{v}</span>
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

/* ── instrument 02 · kernel ─────────────────────────────────── */

function KernelChip() {
  return (
    <>
      <div className="flex items-center justify-between">
        <span className="grid size-9 place-items-center rounded-xl border border-line bg-tint">
          <Cpu className="size-4 text-bronze" />
        </span>
        <span className="hud-label">WASM</span>
      </div>
      <p className="display mt-5 text-5xl leading-none">
        72
        <span className="ml-1 text-base font-medium text-ink-faint">KB</span>
      </p>
      <p className="mt-2 text-[12px] text-ink-muted">
        the whole grade + detail kernel
      </p>
      <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl border border-line bg-bg/40 p-3">
        {[
          ["65", "modules"],
          ["4 ms", "cold start"],
          ["33³", "LUT size"],
        ].map(([value, label]) => (
          <div key={label}>
            <p className="mono-num text-[11px] text-ink">{value}</p>
            <p className="hud-label mt-1 !text-[7px]">{label}</p>
          </div>
        ))}
      </div>
      <div className="mt-auto space-y-1.5 border-t border-line pt-4">
        {["ec_grade", "ec_up_begin", "ec_up_band"].map((f) => (
          <p key={f} className="mono-num text-[10px] text-ink-faint">
            {f}()
          </p>
        ))}
      </div>
    </>
  );
}

/* ── instrument 03 · privacy ────────────────────────────────── */

function ZeroUploads() {
  return (
    <>
      <div className="flex items-center justify-between">
        <span className="grid size-9 place-items-center rounded-xl border border-line bg-tint">
          <LockKeyhole className="size-4 text-prism-b" />
        </span>
        <span className="hud-label">Local first</span>
      </div>
      <div className="relative mt-4 flex h-32 items-center justify-center">
        <span className="absolute size-32 rounded-full border border-line" />
        <span className="absolute size-24 rounded-full border border-dashed border-line-strong" />
        <span className="absolute size-1.5 translate-y-[-62px] rounded-full bg-bronze glow-dot" />
        <p className="display relative text-6xl leading-none">0</p>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 border-y border-line py-3 text-center">
        {[
          ["0", "requests"],
          ["0", "cookies"],
          ["0", "bytes"],
        ].map(([value, label]) => (
          <div key={label}>
            <p className="mono-num text-[11px] text-ink">{value}</p>
            <p className="hud-label mt-1 !text-[7px]">{label}</p>
          </div>
        ))}
      </div>
      <p className="mt-auto pt-4 text-center text-[12px] text-ink-muted">
        bytes uploaded — ever
      </p>
    </>
  );
}

/* ── instrument 04 · detail engine ──────────────────────────── */

function DetailDemo() {
  const beforeRef = useRef<HTMLCanvasElement>(null);
  const afterRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const stage = createStage(640, 360);
    if (!stage) return;
    paintSource(stage);

    const after = afterRef.current;
    if (after) {
      after.width = 640;
      after.height = 360;
      after.getContext("2d")?.drawImage(stage.source, 0, 0);
    }

    const before = beforeRef.current;
    if (before) {
      before.width = 640;
      before.height = 360;
      const lo = document.createElement("canvas");
      lo.width = 160;
      lo.height = 90;
      lo.getContext("2d")?.drawImage(stage.source, 0, 0, 160, 90);
      const ctx = before.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(lo, 0, 0, 640, 360);
      }
    }
  }, []);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="hud-label !text-ink-muted">Detail engine</span>
          <p className="display mt-2 text-[1.55rem] leading-none">
            Level up to <span className="spectrum-text">×4.</span>
          </p>
        </div>
        <span className="chip !py-1 !text-[9px]">Lanczos3 · linear light</span>
      </div>

      <div
        className="detail-compare relative mt-5 aspect-[16/9] overflow-hidden rounded-xl border border-line bg-bg"
        tabIndex={0}
        aria-label="Detail engine comparison — focus or hover to reveal the sharp render"
      >
        <canvas
          ref={beforeRef}
          className="absolute inset-0 h-full w-full object-cover"
          aria-label="Source frame at native resolution"
        />
        <div className="detail-sharp absolute inset-0">
          <canvas
            ref={afterRef}
            className="h-full w-full object-cover"
            aria-label="Frame after the Rust detail engine"
          />
        </div>
        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 hud-label !text-white/80">
          ×1 source
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 hud-label !text-[#e6ff96]">
          ×4 detail
        </span>
        <div className="detail-divider absolute inset-y-0 w-px bg-bronze shadow-[0_0_26px_rgba(201,255,63,0.7)]">
          <span className="absolute left-0 top-1/2 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-bronze/70 bg-black/70 text-[10px] text-[#e6ff96]">
            ↔
          </span>
        </div>
      </div>

      <p className="mt-3 text-[12px] text-ink-muted">
        Denoise → Lanczos3 → anti-ring clamp → edge-aware unsharp. Hover the
        frame.
      </p>
    </>
  );
}

/* ── instrument 05 · plugins ────────────────────────────────── */

const SHARDS = [
  "linear-gradient(150deg,#c9ff3f,#0e3d1e)",
  "linear-gradient(150deg,#3ce8ff,#2a1a6e)",
  "linear-gradient(150deg,#ff4d9d,#3a0d20)",
];

function PluginStack() {
  return (
    <>
      <div className="flex items-center justify-between">
        <span className="hud-label !text-ink-muted">Prism vault</span>
        <span className="hud-label">65 modules</span>
      </div>
      <div className="mt-4 flex justify-center">
        {SHARDS.map((bg, i) => (
          <div
            key={i}
            className={cn(
              "relative h-24 w-[4.7rem] overflow-hidden rounded-xl border border-white/10 shadow-2xl transition-transform duration-500",
              i === 0 && "-rotate-6 group-hover:-translate-x-3 group-hover:-rotate-12",
              i === 1 && "-mx-3 z-10 -translate-y-2",
              i === 2 && "rotate-6 group-hover:translate-x-3 group-hover:rotate-12",
            )}
            style={{ background: bg }}
          >
            <span className="absolute inset-x-2 top-2 h-px bg-white/40" />
            <span className="absolute bottom-2 left-2 hud-label !text-[7px] !text-white/80">
              0{i + 1}
            </span>
            <span className="absolute bottom-2 right-2 size-1 rounded-full bg-white/70" />
          </div>
        ))}
      </div>
      <p className="mt-auto pt-4 text-center text-[12px] text-ink-muted">
        Glow, aurora, oil paint &amp; 62 more
      </p>
    </>
  );
}

/* ── instrument 06 · delivery ladder ────────────────────────── */

function Delivery() {
  return (
    <>
      <div className="flex items-center justify-between">
        <span className="grid size-9 place-items-center rounded-xl border border-line bg-tint">
          <Download className="size-4 text-prism-c" />
        </span>
        <span className="hud-label">Deterministic</span>
      </div>
      <p className="display mt-4 text-5xl leading-none">
        4K<span className="text-bronze">+</span>
      </p>
      <div className="mt-auto flex h-28 items-end gap-[3px]">
        {Array.from({ length: 28 }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "flex-1 rounded-t-[1px]",
              i < 12 ? "bg-bronze/80" : i < 20 ? "bg-prism-b/70" : "bg-line-strong",
            )}
            style={{ height: `${18 + (i % 6) * 12}%` }}
          />
        ))}
      </div>
      <div className="mt-3 flex justify-between border-t border-line pt-2">
        {["1920", "3840", "7680"].map((v) => (
          <span key={v} className="mono-num text-[9px] text-ink-faint">
            {v}px
          </span>
        ))}
      </div>
    </>
  );
}

/* ── instrument 07 · appearance ─────────────────────────────── */

function Appearance() {
  const [pref, setPref] = useState<ThemePref>("system");

  useEffect(() => {
    const sync = () => setPref(loadThemePref());
    sync();
    window.addEventListener(THEME_EVENT, sync);
    return () => window.removeEventListener(THEME_EVENT, sync);
  }, []);

  const choose = (id: ThemePref) => {
    saveTheme(id);
    setPref(id);
  };

  const options: { id: ThemePref; icon: typeof Sun; label: string }[] = [
    { id: "light", icon: Sun, label: "Light" },
    { id: "system", icon: Monitor, label: "Standard" },
    { id: "dark", icon: Moon, label: "Dark" },
  ];

  return (
    <>
      <div className="flex items-center justify-between">
        <span className="hud-label !text-ink-muted">Appearance</span>
        <span className="hud-label">Live</span>
      </div>
      <p className="display mt-4 text-[1.4rem] leading-tight">
        Three rooms.
        <br />
        <span className="text-ink-faint">One switch.</span>
      </p>
      <div className="mt-5 grid grid-cols-3 gap-1.5">
        {options.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => choose(id)}
            aria-pressed={pref === id}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-[10px] transition-all",
              pref === id
                ? "border-bronze/50 bg-bronze/10 text-bronze-bright"
                : "border-line text-ink-muted hover:border-line-strong hover:text-ink",
            )}
          >
            <Icon className="size-4" strokeWidth={1.75} />
            {label}
          </button>
        ))}
      </div>
      <div className="mt-auto h-1.5 overflow-hidden rounded-full spectrum-bar opacity-70" />
    </>
  );
}

/* ── section ────────────────────────────────────────────────── */

export function LabBento() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const cards = root.querySelectorAll<HTMLElement>("[data-bento]");
    cards.forEach((c) => {
      c.style.opacity = "0";
    });

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animate(entry.target as HTMLElement, {
            y: [38, 0],
            opacity: [0, 1],
            duration: 720,
            ease: "outCubic",
          });
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" },
    );
    cards.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={rootRef}
      id="lab"
      className="relative px-6 py-24 md:px-10 md:py-32"
    >
      <div className="mx-auto max-w-[92rem]">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="hud-label">
              <span className="text-bronze">[02]</span> The instrument panel
            </p>
            <h2 className="display mt-4 text-[clamp(2.7rem,5.6vw,4.9rem)] font-bold uppercase leading-[0.88]">
              Seven instruments.
              <br />
              <span className="spectrum-text">One room.</span>
            </h2>
          </div>
          <p className="max-w-sm text-[14px] leading-relaxed text-ink-muted md:pb-2">
            Every card below is a real subsystem — not a screenshot. The
            kernel, the detail engine, the vault, the privacy model. Poke
            them.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <BentoCard
            index="01 / GRADE"
            span="md:col-span-2 lg:col-span-2"
            className="min-h-[430px]"
          >
            <EngineMonitor />
          </BentoCard>

          <BentoCard index="02 / KERNEL" className="min-h-[240px]">
            <KernelChip />
          </BentoCard>

          <BentoCard index="03 / PRIVACY" className="min-h-[240px]">
            <ZeroUploads />
          </BentoCard>

          <BentoCard
            index="04 / DETAIL"
            span="md:col-span-2 lg:col-span-2"
            className="min-h-[330px]"
          >
            <DetailDemo />
          </BentoCard>

          <BentoCard index="05 / VAULT" className="min-h-[260px]">
            <PluginStack />
          </BentoCard>

          <BentoCard index="06 / EXPORT" className="min-h-[260px]">
            <Delivery />
          </BentoCard>

          <BentoCard index="07 / ROOMS" className="min-h-[260px]">
            <Appearance />
          </BentoCard>

          <Link
            href="/studio"
            data-bento
            onPointerMove={(e) => {
              const el = e.currentTarget;
              const r = el.getBoundingClientRect();
              el.style.setProperty("--mx", `${e.clientX - r.left}px`);
              el.style.setProperty("--my", `${e.clientY - r.top}px`);
            }}
            className="bento-card group relative flex min-h-[260px] flex-col justify-between overflow-hidden bg-bronze/[0.08] p-6 md:col-span-2 lg:col-span-3"
          >
            <div className="relative z-10 flex items-start justify-between gap-3">
              <span className="hud-label">08 / Door</span>
              <span className="chip !border-bronze/30 !text-bronze-bright">
                Free · no account
              </span>
            </div>

            <span
              aria-hidden
              className="display pointer-events-none absolute -bottom-10 right-6 select-none text-[9rem] font-bold uppercase leading-none text-transparent opacity-[0.08]"
              style={{ WebkitTextStroke: "1px var(--outline-ink)" }}
            >
              Enter
            </span>

            <div className="relative z-10 mt-8 flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="display text-[2.4rem] font-bold leading-[0.9] md:text-[3rem]">
                  Open the
                  <br />
                  Studio
                </p>
                <p className="mt-3 max-w-xs text-[12px] leading-relaxed text-ink-muted">
                  Ten film looks, the Rust detail engine, and a deterministic
                  export — already loaded in this tab.
                </p>
              </div>

              <div className="flex items-center gap-6">
                <div className="hidden gap-6 sm:flex">
                  {[
                    ["10", "looks"],
                    ["4K", "export"],
                    ["0", "uploads"],
                  ].map(([value, label]) => (
                    <div key={label}>
                      <p className="display text-xl leading-none">{value}</p>
                      <p className="hud-label mt-1.5">{label}</p>
                    </div>
                  ))}
                </div>
                <span className="grid size-14 place-items-center rounded-full bg-bronze text-[color:var(--btn-ink)] transition-transform duration-300 group-hover:rotate-45">
                  <ArrowRight className="size-6" />
                </span>
              </div>
            </div>
          </Link>
        </div>

        <p className="mt-6 text-center hud-label">
          Built in the browser · shipped from the edge ·{" "}
          <Link href="/pricing" className="text-bronze hover:underline">
            see the keys
          </Link>
        </p>
      </div>
    </section>
  );
}
