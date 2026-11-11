import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { cn } from "@/lib/cn";

const TIERS = [
  {
    name: "Basic",
    price: "Free",
    note: "forever — no key",
    perks: ["6 film looks", "Exposure & contrast", "White balance", "1080p · 3 level-ups/24h"],
    cta: "Start free",
    href: "/studio",
    featured: false,
  },
  {
    name: "Pro",
    price: "$9",
    note: "30-day key",
    perks: [
      "All 10 film looks",
      "3-way color wheels",
      "8-channel HSL isolation",
      ".cube LUT import",
      "4K · unlimited level-ups",
    ],
    cta: "Get Pro",
    href: "/pricing",
    featured: true,
  },
  {
    name: "Studio",
    price: "$19",
    note: "365-day key",
    perks: [
      "Everything in Pro",
      "Film grain & halation",
      "Bloom & HDR curve",
      "Prism Bundle included",
    ],
    cta: "Get Studio",
    href: "/pricing",
    featured: false,
  },
  {
    name: "Lifetime",
    price: "$59",
    note: "never expires",
    perks: ["Everything in Studio", "All future looks", "Commercial license", "Free updates"],
    cta: "Own it",
    href: "/pricing",
    featured: false,
  },
];

export function PricingPreview() {
  return (
    <section id="keys" className="relative px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-[92rem]">
        <Reveal className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="hud-label">
              <span className="text-bronze">[07]</span> Ownership
            </p>
            <h2 className="display mt-4 text-[clamp(2.7rem,5.6vw,4.9rem)] font-bold uppercase leading-[0.88]">
              Start free.
              <br />
              <span className="spectrum-text">Unlock with a key.</span>
            </h2>
          </div>
          <p className="max-w-sm text-[14px] leading-relaxed text-ink-muted md:pb-2">
            No account. No uploads. Keys are one-time and verified client-side.
            The free tier never nags you.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((t, i) => (
            <Reveal key={t.name} delay={i * 80} className="h-full">
              <div
                className={cn(
                  "relative flex h-full flex-col overflow-hidden rounded-2xl border p-6 transition-colors duration-300",
                  t.featured
                    ? "prism-border border-bronze/40 bg-bronze/[0.06]"
                    : "border-line bg-bg-raised/40 hover:border-line-strong",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      "hud-label",
                      t.featured && "!text-bronze-bright",
                    )}
                  >
                    {t.name}
                  </span>
                  {t.featured ? (
                    <span className="rounded-full bg-bronze px-2.5 py-1 font-mono text-[7px] font-semibold uppercase leading-none tracking-[0.18em] text-[color:var(--btn-ink)]">
                      Most popular
                    </span>
                  ) : (
                    <span className="mono-num text-[9px] text-ink-faint">
                      0{i + 1}
                    </span>
                  )}
                </div>

                <p className="display mt-6 text-5xl leading-none">{t.price}</p>
                <p className="hud-label mt-2 !text-[8px]">{t.note}</p>

                <div className="my-6 h-px bg-line" />

                <ul className="space-y-2.5">
                  {t.perks.map((perk) => (
                    <li
                      key={perk}
                      className="flex items-start gap-2.5 text-[13px] leading-snug text-ink-muted"
                    >
                      <Check
                        className={cn(
                          "mt-0.5 size-3.5 shrink-0",
                          t.featured ? "text-bronze-bright" : "text-bronze",
                        )}
                        strokeWidth={2.25}
                      />
                      {perk}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-7">
                  <Link
                    href={t.href}
                    className={cn(
                      "group w-full !py-2.5 !text-[12px]",
                      t.featured ? "btn-primary" : "btn-ghost",
                    )}
                  >
                    {t.cta}
                    <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={160}>
          <Link
            href="/pricing#bundle"
            className="group mt-3 flex flex-col items-start justify-between gap-4 rounded-2xl border border-line bg-bg-raised/30 px-6 py-5 transition-colors hover:border-bronze/40 sm:flex-row sm:items-center"
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="chip !border-bronze/30 !text-bronze-bright">
                Prism bundle
              </span>
              <p className="text-[13px] text-ink-muted">
                All 65 modules — <span className="text-ink">$29</span>, included
                with Studio &amp; Lifetime.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted transition-colors group-hover:text-ink">
              See what&rsquo;s inside
              <ArrowUpRight className="size-3.5" />
            </span>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
