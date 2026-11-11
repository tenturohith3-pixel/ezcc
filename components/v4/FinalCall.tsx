"use client";

import { useRef, type ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/** A button that leans toward the cursor, then springs home. */
function MagneticLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLAnchorElement>(null);

  const move = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * 0.16;
    const y = (e.clientY - (r.top + r.height / 2)) * 0.16;
    el.style.transform = `translate(${x}px, ${y}px)`;
  };
  const leave = () => {
    if (ref.current) ref.current.style.transform = "translate(0,0)";
  };

  return (
    <Link
      ref={ref}
      href={href}
      onPointerMove={move}
      onPointerLeave={leave}
      className={className}
      style={{ transition: "transform .35s cubic-bezier(.22,1,.36,1)" }}
    >
      {children}
    </Link>
  );
}

const STATS = [
  ["72 KB", "Rust kernel"],
  ["65", "Prism modules"],
  ["0", "Uploads, ever"],
  ["4K+", "Deterministic export"],
];

export function FinalCall() {
  return (
    <section id="cut" className="relative px-4 py-20 md:px-10 md:py-28">
      <div className="relative mx-auto max-w-[92rem] overflow-hidden rounded-[2rem] border border-line bg-bg-raised/80 px-6 py-16 backdrop-blur-xl md:px-14 md:py-24">
        <div
          aria-hidden
          className="aurora-blob -right-24 -top-32 size-[32rem]"
          style={{
            background:
              "radial-gradient(circle, rgba(201,255,63,0.4), transparent 66%)",
          }}
        />
        <div
          aria-hidden
          className="aurora-blob -bottom-40 left-1/3 size-[36rem]"
          style={{
            background:
              "radial-gradient(circle, rgba(139,92,255,0.35), transparent 66%)",
          }}
        />

        <div className="relative grid items-end gap-12 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <p className="hud-label">
              <span className="text-bronze">[08]</span> Final cut
            </p>
            <h2 className="display mt-5 text-[clamp(3.2rem,8vw,7rem)] font-bold uppercase leading-[0.84] tracking-[-0.055em]">
              Your frame
              <br />
              <span className="spectrum-text">is next.</span>
            </h2>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ink-muted">
              Bring a still. Leave with a print. The whole lab is already
              loaded in this tab.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <MagneticLink
                href="/studio"
                className="btn-primary group !px-8 !py-3.5 !text-[15px]"
              >
                Open the Studio
                <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </MagneticLink>
              <Link href="/pricing" className="btn-ghost !py-3.5">
                See the keys
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line">
            {STATS.map(([value, label]) => (
              <div key={label} className="bg-bg-raised/90 p-5">
                <p className="display text-2xl leading-none text-ink">
                  {value}
                </p>
                <p className="hud-label mt-2">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <span
          aria-hidden
          className="display pointer-events-none absolute -bottom-10 right-2 select-none text-[18vw] font-bold leading-none text-transparent opacity-[0.12]"
          style={{ WebkitTextStroke: "1px var(--outline-ink)" }}
        >
          EC/04
        </span>
      </div>
    </section>
  );
}
