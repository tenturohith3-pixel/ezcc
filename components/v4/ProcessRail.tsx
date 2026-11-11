"use client";

/**
 * THE PIPELINE — a sticky spectral dial against four scroll-tracked steps.
 * Active step is picked by an IntersectionObserver band at the viewport middle.
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

const STEPS = [
  {
    tag: "Ingest",
    title: "Drop the frame.",
    copy: "Open any browser image and it is decoded locally. No upload, no account, no queue — the frame never leaves the machine.",
    chips: ["Any image", "0 uploads", "Instant"],
  },
  {
    tag: "Grade",
    title: "Shape the light.",
    copy: "Lift, gamma, gain. Exposure, warmth, contrast, 8-channel HSL. Ten film signatures and .cube LUTs, all live.",
    chips: ["3-way wheels", "8-ch HSL", ".cube LUTs"],
  },
  {
    tag: "Detail",
    title: "Level up the pixels.",
    copy: "The Rust Detail Engine denoises, resamples Lanczos3 in linear light, clamps ringing and sharpens edges. ×2 or ×4.",
    chips: ["Lanczos3", "Linear light", "72 KB wasm"],
  },
  {
    tag: "Deliver",
    title: "Cut the print.",
    copy: "A deterministic render at full resolution, encoded straight from the canvas. The same seed, the same file, every time.",
    chips: ["PNG / JPEG", "Seed locked", "4K+"],
  },
];

export function ProcessRail() {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const idx = Number((entry.target as HTMLElement).dataset.step);
          if (!Number.isNaN(idx)) setActive(idx);
        });
      },
      { rootMargin: "-42% 0px -48% 0px", threshold: 0 },
    );
    stepRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <section
      id="pipeline"
      className="relative overflow-x-clip px-6 py-24 md:px-10 md:py-32"
    >
      <div className="mx-auto grid max-w-[92rem] gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        {/* sticky dial */}
        <div className="self-start lg:sticky lg:top-28">
          <p className="hud-label">
            <span className="text-bronze">[04]</span> The pipeline
          </p>
          <h2 className="display mt-4 text-[clamp(2.7rem,5vw,4.4rem)] font-bold uppercase leading-[0.88]">
            Frame in.
            <br />
            <span className="spectrum-text">Final out.</span>
          </h2>
          <p className="mt-5 max-w-sm text-[14px] leading-relaxed text-ink-muted">
            Four movements, one pass, no server. Scroll to walk the print
            through the room.
          </p>

          <div className="relative mt-10 size-52 md:size-60">
            <div
              className="spin-slow absolute inset-0 rounded-full"
              style={{
                background:
                  "conic-gradient(from 0deg,#c9ff3f,#3ce8ff,#8b5cff,#ff4d9d,#c9ff3f)",
                WebkitMask:
                  "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))",
                mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))",
              }}
            />
            <div className="absolute inset-5 rounded-full border border-line" />
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <p className="display text-[4.6rem] leading-none">
                  {String(active + 1).padStart(2, "0")}
                </p>
                <p className="hud-label mt-1">{STEPS[active]?.tag}</p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-2">
            {STEPS.map((s, i) => (
              <button
                key={s.tag}
                onClick={() =>
                  stepRefs.current[i]?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  })
                }
                aria-label={`Jump to ${s.tag}`}
                className={cn(
                  "h-1 rounded-full transition-all duration-500",
                  active === i ? "w-10 bg-bronze" : "w-4 bg-line-strong",
                )}
              />
            ))}
          </div>
        </div>

        {/* steps */}
        <div>
          {STEPS.map((step, i) => (
            <div
              key={step.tag}
              ref={(el) => {
                stepRefs.current[i] = el;
              }}
              data-step={i}
              className={cn(
                "relative flex min-h-[36vh] flex-col justify-center border-t border-line py-10 transition-opacity duration-500 lg:min-h-[40vh]",
                active === i ? "opacity-100" : "opacity-40",
              )}
            >
              <div className="flex items-start gap-5">
                <span
                  className={cn(
                    "mono-num mt-1 grid size-9 shrink-0 place-items-center rounded-full border text-[10px]",
                    active === i
                      ? "border-bronze/60 bg-bronze/10 text-bronze-bright"
                      : "border-line text-ink-faint",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="hud-label">{step.tag}</p>
                  <h3 className="display mt-2 text-[clamp(1.8rem,3vw,2.6rem)] font-bold uppercase leading-none">
                    {step.title}
                  </h3>
                  <p className="mt-4 max-w-md text-[14px] leading-relaxed text-ink-muted">
                    {step.copy}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {step.chips.map((chip) => (
                      <span key={chip} className="chip !py-1.5 !text-[9px]">
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div className="border-t border-line" />
        </div>
      </div>
    </section>
  );
}
