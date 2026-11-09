"use client";

/**
 * SCENE 01 — THE OPENING PLATE.
 * Quiet-luxury title card: a serif headline at gallery scale, the live grade
 * console as the exhibit, and a ghost word drifting deep in the darkroom.
 * Everything is graded by the same Rust kernel the Studio runs.
 */

import { useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { GradeConsole } from "@/components/landing/GradeConsole";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function ActOpen() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const root = sectionRef.current;
      if (!root || reduced) return;

      /* ── entrance: slow, unhurried ── */
      gsap.set(".open-line", { yPercent: 116, rotate: 1.5 });
      gsap.set(".open-fade", { y: 22, opacity: 0 });
      gsap.set(".open-frame", { y: 54, opacity: 0, scale: 0.965 });

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.to(".open-kicker", { opacity: 1, duration: 0.9 }, 0.15)
        .to(".open-line", { yPercent: 0, rotate: 0, duration: 1.35, stagger: 0.11 }, 0.2)
        .to(".open-sub", { y: 0, opacity: 1, duration: 0.9 }, 0.75)
        .to(".open-cta", { y: 0, opacity: 1, duration: 0.8, stagger: 0.08 }, 0.9)
        .to(".open-frame", { y: 0, opacity: 1, scale: 1, duration: 1.35 }, 0.55)
        .to(".open-stat", { y: 0, opacity: 1, duration: 0.7, stagger: 0.06 }, 1.1);

      /* ── the room moves as you pass through ── */
      const pass = (start: string, end: string) => ({
        trigger: root,
        start,
        end,
        scrub: 0.6,
      } as const);

      gsap.to(".open-ghost", {
        yPercent: 22,
        xPercent: -4,
        ease: "none",
        scrollTrigger: pass("top bottom", "bottom top"),
      });
      gsap.to(".open-halo", {
        yPercent: -12,
        opacity: 0.14,
        scale: 1.1,
        ease: "none",
        scrollTrigger: pass("top bottom", "bottom top"),
      });
      gsap.to(".open-copy", {
        yPercent: -34,
        opacity: 0,
        ease: "none",
        scrollTrigger: pass("top top", "65% top"),
      });
      gsap.to(".open-frame", {
        yPercent: -7,
        ease: "none",
        scrollTrigger: pass("top top", "bottom top"),
      });
      gsap.to(".open-cue", {
        opacity: 0,
        y: 12,
        ease: "none",
        scrollTrigger: pass("top top", "20% top"),
      });
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      id="scene-open"
      className="relative flex min-h-[100svh] items-center overflow-hidden px-6 pb-24 pt-28 md:px-10"
    >
      {/* the deepest layer — a word, half-remembered */}
      <div
        aria-hidden
        className="open-ghost pointer-events-none absolute right-[-1%] top-[5%] hidden select-none md:block"
      >
        <span className="ghost-word text-[14vw] italic">LIGHT</span>
      </div>

      {/* safelight */}
      <div
        aria-hidden
        className="open-halo safelight pointer-events-none absolute right-[-12%] top-1/2 size-[46rem] max-w-[120vw] -translate-y-1/2 rounded-full opacity-25 blur-[110px]"
      />

      <div className="relative mx-auto grid w-full max-w-[88rem] items-center gap-14 lg:grid-cols-[1.05fr_1.18fr] lg:gap-12">
        {/* ── the words ── */}
        <div className="open-copy relative">
          <div className="open-kicker flex items-center gap-3 opacity-0">
            <span className="h-px w-10 bg-bronze/60" />
            <p className="mono-label !text-[9px] !tracking-[0.34em]">
              EFFECTCRAFT — A GRADING HOUSE
            </p>
          </div>

          <h1 className="display mt-7 text-balance text-[clamp(3.2rem,7.2vw,6.3rem)] leading-[0.95] max-[379px]:text-[2.7rem]">
            <span className="hero-mask hero-mask-block">
              <span className="open-line block">Every shot</span>
            </span>
            <span className="hero-mask hero-mask-block">
              <span className="open-line block">starts flat.</span>
            </span>
            <span className="hero-mask hero-mask-block">
              <span className="open-line display-italic block text-bronze-bright">
                We make it speak.
              </span>
            </span>
          </h1>

          <p className="open-sub mt-8 max-w-md text-[15px] font-light leading-relaxed text-ink-muted opacity-0">
            A cinematic color engine, finishing suite and plugin ecosystem —
            computed entirely in your browser. No uploads. No render queue.
            Just light, arranged well.
          </p>

          <div className="open-cta mt-9 flex flex-wrap items-center gap-5 opacity-0">
            <Link href="/studio" className="btn-primary group !px-6">
              Open the Studio
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/plugins"
              className="group inline-flex items-center gap-1.5 text-[13px] text-ink-muted transition-colors hover:text-ink"
            >
              Explore Prism plugins
              <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="open-stat mt-12 flex flex-wrap items-center gap-x-5 gap-y-2 opacity-0">
            {[
              "RUST KERNEL · 72 KB",
              "100% ON-DEVICE",
              "UP TO 4K+ DELIVERY",
            ].map((s, i) => (
              <span key={s} className="flex items-center gap-5">
                {i > 0 ? <span className="size-0.5 rounded-full bg-ink-faint" /> : null}
                <span className="mono-label !text-[8px] !tracking-[0.26em] !text-ink-faint">
                  {s}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* ── the exhibit ── */}
        <div className="open-frame relative">
          <GradeConsole />
          <p className="mt-3 text-center mono-label !text-[8px] !text-ink-faint opacity-80">
            DRAG A WHEEL — THE FRAME IS GRADING LIVE
          </p>
        </div>
      </div>

      {/* scroll cue — a patient vertical hairline */}
      <div className="open-cue absolute inset-x-0 bottom-7 flex flex-col items-center gap-3">
        <span className="mono-label !text-[8px] !tracking-[0.3em] !text-ink-faint">
          SCROLL TO DEVELOP
        </span>
        <span className="relative block h-9 w-px overflow-hidden bg-line">
          <span className="absolute inset-x-0 top-0 h-3 animate-[scrolldot_2.2s_ease-in-out_infinite] bg-bronze" />
        </span>
      </div>
    </section>
  );
}
