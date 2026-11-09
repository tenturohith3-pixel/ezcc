import Link from "next/link";
import { Check } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";

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
    <section className="relative py-32 px-6 md:px-12">
      <div className="max-w-7xl mx-auto">
        <Reveal className="text-center max-w-2xl mx-auto">
          <p className="mono-label mb-4">Pricing</p>
          <h2 className="display text-4xl md:text-6xl gradient-text">
            Start free. Unlock with a key.
          </h2>
          <p className="mt-5 text-lg text-ink-muted font-light">
            No account. No uploads. Keys are one-time, verified client-side, and
            the free tier never nags you.
          </p>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TIERS.map((t, i) => (
            <Reveal key={t.name} delay={i * 90}>
              <div
                className={
                  t.featured
                    ? "glass card-hover h-full p-7 border-bronze/40 relative"
                    : "glass card-hover h-full p-7 relative"
                }
              >
                {t.featured ? (
                  <span className="absolute top-4 right-4 mono-label !text-[9px] text-bronze-bright">
                    POPULAR
                  </span>
                ) : null}
                <p className="display text-lg">{t.name}</p>
                <p className="mt-4">
                  <span className="display text-3xl">{t.price}</span>
                </p>
                <p className="mono-label !text-[9px] mt-1.5">{t.note}</p>
                <ul className="mt-6 space-y-2.5">
                  {t.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2 text-[13px] text-ink-muted">
                      <Check className="size-3.5 mt-0.5 text-bronze-bright shrink-0" strokeWidth={2} />
                      {perk}
                    </li>
                  ))}
                </ul>
                <Link
                  href={t.href}
                  className={
                    t.featured
                      ? "btn-primary w-full mt-7 !py-2.5 text-[13px] justify-center"
                      : "btn-ghost w-full mt-7 !py-2.5 text-[13px] justify-center"
                  }
                >
                  {t.cta}
                </Link>
              </div>
            </Reveal>
          ))}
          <Reveal delay={360} className="sm:col-span-2 lg:col-span-4">
            <p className="text-center mono-label !text-[10px] mt-2">
              PLUGINS ARE PAID ·{" "}
              <Link href="/pricing#bundle" className="text-bronze-bright hover:underline underline-offset-2">
                PRISM BUNDLE — $29 · ALL 65 MODULES · INCLUDED WITH STUDIO &amp; LIFETIME
              </Link>
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
