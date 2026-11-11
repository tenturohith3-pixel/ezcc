"use client";

/**
 * HERO / the cockpit.
 * Kinetic grotesk title, a live grade console under glass, floating telemetry.
 * anime.js splits the subhead, masks the title, and staggers the entrance.
 */

import { useEffect, useRef } from "react";
import Link from "next/link";
import { animate, splitText, stagger } from "animejs";
import { ArrowDown, ArrowUpRight, Sparkles } from "lucide-react";
import { GradeConsole } from "@/components/landing/GradeConsole";

const TELEMETRY = [
  { value: "72 KB", label: "Rust WASM" },
  { value: "0", label: "Uploads" },
  { value: "4K+", label: "Delivery" },
];

export function HeroLab() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let split: ReturnType<typeof splitText> | null = null;

    animate(root.querySelectorAll("[data-hero-line]"), {
      y: ["112%", "0%"],
      rotate: [2.5, 0],
      duration: 1050,
      delay: stagger(110, { start: 120 }),
      ease: "outExpo",
    });

    animate(root.querySelectorAll("[data-hero-fade]"), {
      y: [24, 0],
      opacity: [0, 1],
      duration: 820,
      delay: stagger(95, { start: 380 }),
      ease: "outCubic",
    });

    animate(root.querySelectorAll("[data-hero-float]"), {
      scale: [0.86, 1],
      opacity: [0, 1],
      duration: 780,
      delay: stagger(110, { start: 880 }),
      ease: "outBack",
    });

    const sub = root.querySelector<HTMLElement>("[data-hero-sub]");
    if (sub) {
      split = splitText(sub, { words: true });
      animate(split.words, {
        y: [14, 0],
        opacity: [0, 1],
        duration: 620,
        delay: stagger(12, { start: 720 }),
        ease: "outCubic",
      });
    }

    return () => {
      split?.revert();
    };
  }, []);

  return (
    <section
      ref={ref}
      id="scene-open"
      className="relative flex min-h-[100svh] items-center overflow-hidden px-6 pb-20 pt-32 md:px-10"
    >
      {/* deep background word */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[9%] select-none text-center"
      >
        <span className="display outline-text block text-[27vw] font-bold leading-none opacity-[0.16]">
          PRISM
        </span>
      </div>

      <div className="relative mx-auto grid w-full max-w-[92rem] items-center gap-14 lg:grid-cols-[1.02fr_1.12fr] lg:gap-10">
        {/* ── words ── */}
        <div className="relative z-10">
          <div className="hero-fade chip" data-hero-fade>
            <span className="size-1.5 rounded-full bg-bronze glow-dot" />
            Prism Engine 04 — spectral build
            <Sparkles className="size-3 text-bronze" />
          </div>

          <h1 className="display mt-6 text-[clamp(3.9rem,8.4vw,7.8rem)] font-bold uppercase leading-[0.82] tracking-[-0.055em]">
            <span className="hero-line-mask">
              <span className="hero-line-inner" data-hero-line>
                Make
              </span>
            </span>
            <span className="hero-line-mask">
              <span className="hero-line-inner spectrum-text" data-hero-line>
                Light
              </span>
            </span>
            <span className="hero-line-mask">
              <span className="hero-line-inner" data-hero-line>
                <span className="outline-text">Obey</span>
                <span className="text-bronze">.</span>
              </span>
            </span>
          </h1>

          <p
            data-hero-sub
            data-hero-fade
            className="hero-fade mt-7 max-w-lg text-[15px] leading-relaxed text-ink-muted"
          >
            A cinematic color engine, finishing suite, and 65-module Prism
            ecosystem — computed entirely in your browser. No uploads. No
            render queue. Just light, bent to your will.
          </p>

          <div
            data-hero-fade
            className="hero-fade mt-8 flex flex-wrap items-center gap-4"
          >
            <Link href="/studio" className="btn-primary group !px-7">
              Enter the Studio
              <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#looks"
              className="group inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-[13px] text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
            >
              Explore the looks
              <ArrowDown className="size-3.5 transition-transform duration-300 group-hover:translate-y-0.5" />
            </a>
          </div>

          <div
            data-hero-fade
            className="hero-fade mt-10 grid max-w-lg grid-cols-3 divide-x divide-line border-y border-line py-4"
          >
            {TELEMETRY.map((t) => (
              <div key={t.label} className="px-4 first:pl-0">
                <p className="display text-2xl leading-none text-ink">
                  {t.value}
                </p>
                <p className="hud-label mt-2">{t.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── the cockpit ── */}
        <div data-hero-fade className="hero-fade relative z-10">
          {/* floating telemetry */}
          <span
            data-hero-float
            className="hero-float absolute -left-3 -top-5 z-20 hidden items-center gap-2 rounded-full border border-line-strong bg-bg/80 px-3.5 py-2 backdrop-blur-xl md:flex"
          >
            <span className="size-1.5 animate-pulse rounded-full bg-bronze" />
            <span className="hud-label !text-ink-muted">Live · 24 fps</span>
          </span>
          <span
            data-hero-float
            className="hero-float absolute -right-2 -top-7 z-20 hidden rounded-full border border-line-strong bg-bg/80 px-3.5 py-2 backdrop-blur-xl md:block"
          >
            <span className="hud-label !text-ink-muted">
              ec_grade · ec_upscale
            </span>
          </span>
          <div className="prism-border relative rounded-[1.75rem] shadow-[0_60px_140px_-60px_rgba(201,255,63,0.28)]">
            <div className="rounded-[1.7rem] bg-bg/85 p-3 backdrop-blur-2xl md:p-4">
              <div className="mb-3 flex items-center justify-between px-1.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex gap-1.5">
                    <span className="size-2 rounded-full bg-prism-c/80" />
                    <span className="size-2 rounded-full bg-bronze/80" />
                    <span className="size-2 rounded-full bg-prism-b/80" />
                  </span>
                  <span className="hud-label !text-ink-muted">
                    Session / EffectCraft ST-01
                  </span>
                </div>
                <span className="hidden items-center gap-1.5 sm:flex">
                  <span className="size-1 rounded-full bg-bronze glow-dot" />
                  <span className="hud-label">On device</span>
                </span>
              </div>
              <GradeConsole />
            </div>
          </div>

          <p className="mt-3 text-center hud-label">
            Drag a wheel — the frame grades live
          </p>
        </div>
      </div>

      {/* scroll cue */}
      <div className="absolute bottom-6 left-6 hidden flex-col items-start gap-2 md:left-10 md:flex">
        <span className="hud-label">Scroll to refract</span>
        <span className="relative block h-8 w-px overflow-hidden bg-line">
          <span className="absolute inset-x-0 top-0 h-3 animate-[scrolldot_2.2s_ease-in-out_infinite] bg-bronze" />
        </span>
      </div>
    </section>
  );
}
