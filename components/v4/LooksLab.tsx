"use client";

/**
 * THE LOOKS VAULT — a draggable rail of ten film signatures.
 * Chromatic gradients stand in for the LUTs; the Studio holds the real ones.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, MoveHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";

type VaultLook = {
  id: string;
  name: string;
  tag: string;
  access: "FREE" | "PRO" | "STUDIO";
  art: string;
};

const VAULT: VaultLook[] = [
  { id: "natural", name: "Natural", tag: "Ungraded truth", access: "FREE", art: "linear-gradient(145deg,#deded8,#8b8b90 52%,#26262b)" },
  { id: "kodak-250d", name: "Kodak 250D", tag: "Daylight film", access: "FREE", art: "linear-gradient(145deg,#ffd28a,#e07a3f 42%,#244d6e)" },
  { id: "teal-orange", name: "Teal & Orange", tag: "Blockbuster", access: "FREE", art: "linear-gradient(145deg,#0f5f6b,#128a8f 36%,#f08a3c 76%,#ffc06a)" },
  { id: "golden-hour", name: "Golden Hour", tag: "Warm signature", access: "FREE", art: "linear-gradient(145deg,#ffe7a2,#f2a244 44%,#7a3f1c)" },
  { id: "noir", name: "Slate Noir", tag: "Silver contrast", access: "FREE", art: "linear-gradient(145deg,#f2f2ee,#9a9a9a 38%,#141416)" },
  { id: "bleach-bypass", name: "Bleach Bypass", tag: "High-contrast silver", access: "FREE", art: "linear-gradient(145deg,#d7e3de,#7a8f8b 45%,#2c3230)" },
  { id: "faded-70s", name: "Faded '70s", tag: "Warm decay", access: "FREE", art: "linear-gradient(145deg,#f3d9b0,#c97a4d 45%,#5b2f2a)" },
  { id: "arctic", name: "Arctic", tag: "Cold clean", access: "PRO", art: "linear-gradient(145deg,#dff7ff,#7ec8e3 40%,#1b3a5b)" },
  { id: "neon-tokyo", name: "Neon Tokyo", tag: "Night chrome", access: "PRO", art: "linear-gradient(145deg,#ff4d9d,#8b5cff 45%,#071b33 82%)" },
  { id: "vernacular", name: "Everglade", tag: "Green film", access: "STUDIO", art: "linear-gradient(145deg,#c9ff3f,#2f7a3d 46%,#0a2418)" },
];

export function LooksLab() {
  const railRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, scrollLeft: 0, moved: false });
  const [grabbing, setGrabbing] = useState(false);
  const [progress, setProgress] = useState(0);

  const measure = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setProgress(max <= 0 ? 1 : el.scrollLeft / max);
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const nudge = (dir: 1 | -1) => {
    railRef.current?.scrollBy({ left: dir * 340, behavior: "smooth" });
  };

  return (
    <section
      id="looks"
      className="relative scroll-mt-24 border-y border-line py-24 md:py-32"
    >
      <div className="mx-auto max-w-[92rem] px-6 md:px-10">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="hud-label">
              <span className="text-bronze">[03]</span> The looks vault
            </p>
            <h2 className="display mt-4 text-[clamp(2.7rem,5.6vw,4.9rem)] font-bold uppercase leading-[0.88]">
              Ten signatures.
              <br />
              <span className="outline-text">Zero render time.</span>
            </h2>
          </div>
          <div className="flex items-center gap-4 md:pb-2">
            <MoveHorizontal className="size-4 text-bronze" />
            <p className="max-w-[15rem] text-[13px] leading-relaxed text-ink-muted">
              Drag the rail. Every look is a real grade, applied in the
              browser.
            </p>
            <div className="hidden gap-1.5 sm:flex">
              <button
                onClick={() => nudge(-1)}
                aria-label="Scroll looks left"
                className="grid size-9 place-items-center rounded-full border border-line text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
              >
                <ArrowLeft className="size-4" />
              </button>
              <button
                onClick={() => nudge(1)}
                aria-label="Scroll looks right"
                className="grid size-9 place-items-center rounded-full border border-line text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
              >
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        ref={railRef}
        onScroll={measure}
        onClickCapture={(e) => {
          if (!drag.current.moved) return;
          e.preventDefault();
          e.stopPropagation();
          drag.current.moved = false;
        }}
        onPointerDown={(e) => {
          if (e.pointerType === "touch") return;
          drag.current = {
            active: true,
            startX: e.clientX,
            scrollLeft: e.currentTarget.scrollLeft,
            moved: false,
          };
          setGrabbing(true);
        }}
        onPointerMove={(e) => {
          if (!drag.current.active) return;
          const dx = e.clientX - drag.current.startX;
          if (Math.abs(dx) > 6) drag.current.moved = true;
          e.currentTarget.scrollLeft = drag.current.scrollLeft - dx;
        }}
        onPointerUp={() => {
          drag.current.active = false;
          setGrabbing(false);
        }}
        onPointerCancel={() => {
          drag.current.active = false;
          setGrabbing(false);
        }}
        onPointerLeave={() => {
          drag.current.active = false;
          setGrabbing(false);
        }}
        className={cn(
          "mt-12 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-4 md:gap-4 md:px-10",
          grabbing ? "cursor-grabbing select-none" : "cursor-grab",
        )}
        style={{ touchAction: "pan-x pan-y", scrollbarWidth: "none" }}
      >
        {VAULT.map((look, i) => (
          <article
            key={look.id}
            className="group relative h-[420px] w-[280px] shrink-0 snap-start overflow-hidden rounded-2xl border border-line-strong/60 md:h-[470px] md:w-[330px]"
          >
            <div
              className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              style={{ background: look.art }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/30" />
            <div className="absolute inset-0 opacity-30 mix-blend-overlay [background-image:radial-gradient(rgba(255,255,255,0.5)_0.5px,transparent_0.5px)] [background-size:5px_5px]" />

            <div className="relative flex h-full flex-col justify-between p-5">
              <div className="flex items-start justify-between">
                <span className="mono-num text-[10px] tracking-[0.2em] text-white/70">
                  LOOK {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "rounded-full border px-2 py-1 font-mono text-[8px] tracking-[0.18em]",
                    look.access === "FREE"
                      ? "border-white/25 text-white/70"
                      : "border-bronze/60 bg-black/30 text-[#e6ff96]",
                  )}
                >
                  {look.access}
                </span>
              </div>

              <div>
                <p className="display text-[2.5rem] font-bold uppercase leading-[0.88] text-white md:text-[2.9rem]">
                  {look.name}
                </p>
                <p className="mt-2 text-[12px] text-white/60">{look.tag}</p>
                <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-3">
                  <span className="hud-label !text-white/50">
                    Rust LUT · 33³
                  </span>
                  <Link
                    href="/studio"
                    className="inline-flex items-center gap-1 text-[11px] text-white/80 transition-colors hover:text-[#e6ff96]"
                  >
                    Grade it <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mx-auto mt-4 flex max-w-[92rem] items-center gap-4 px-6 md:px-10">
        <div className="h-px flex-1 bg-line">
          <div
            className="h-px bg-bronze transition-[width] duration-150"
            style={{ width: `${Math.max(6, progress * 100)}%` }}
          />
        </div>
        <span className="mono-num text-[9px] text-ink-faint">
          {String(Math.round(progress * 9) + 1).padStart(2, "0")} / 10
        </span>
      </div>
    </section>
  );
}
