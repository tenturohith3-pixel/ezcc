import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check, ShieldCheck, Boxes } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { PricingTools } from "@/components/pricing/PricingTools";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Pricing & Keys",
  description:
    "Start free forever. Pro $9 · Studio $19 · Lifetime $59 · Prism Plugin Bundle $29 — one key, no accounts, no uploads.",
};

const MAIL = "support@effectcraft.studio";

const TIERS: {
  name: string;
  price: string;
  note: string;
  perks: string[];
  cta: { label: string; href: string };
  featured: boolean;
}[] = [
  {
    name: "Basic",
    price: "Free",
    note: "forever · no key needed",
    perks: [
      "Synthetic sample + upload grading",
      "All 6 free film looks",
      "Exposure, contrast, saturation, WB",
      "Vignette & texture suite",
      "1080p export · 3 level-ups / 24h",
    ],
    cta: { label: "Open Studio", href: "/studio" },
    featured: false,
  },
  {
    name: "Pro",
    price: "$9",
    note: "30-day key",
    perks: [
      "Everything in Basic",
      "All 10 film looks",
      "3-way color wheels",
      "8-channel HSL isolation",
      ".cube 3D LUT import",
      "4K export · unlimited level-ups",
    ],
    cta: {
      label: "Get Pro — $9",
      href: `mailto:${MAIL}?subject=${encodeURIComponent("Order: Pro key ($9)")}`,
    },
    featured: true,
  },
  {
    name: "Studio",
    price: "$19",
    note: "365-day key",
    perks: [
      "Everything in Pro",
      "Film grain · halation · bloom",
      "HDR curve & highlight recovery",
      "Prism Bundle included — free",
      "4K export, priority support",
    ],
    cta: {
      label: "Get Studio — $19",
      href: `mailto:${MAIL}?subject=${encodeURIComponent("Order: Studio key ($19)")}`,
    },
    featured: false,
  },
  {
    name: "Lifetime",
    price: "$59",
    note: "one key · never expires",
    perks: [
      "Everything in Studio, forever",
      "Prism Bundle included — free",
      "All future looks & modules",
      "Commercial usage license",
      "Best value — one payment",
    ],
    cta: {
      label: "Own it — $59",
      href: `mailto:${MAIL}?subject=${encodeURIComponent("Order: Lifetime key ($59)")}`,
    },
    featured: false,
  },
];

const STEPS = [
  {
    n: "01",
    title: "Pick your unlock",
    body: "Grading tools ride on Pro, Studio or Lifetime keys. Plugins are never sold one-by-one — the whole catalog ships as the Prism Bundle ($29), already included free with Studio and Lifetime.",
  },
  {
    n: "02",
    title: "Get your key",
    body: "Keys are minted privately by the EffectCraft team (HMAC-signed, hard to forge). Hit a purchase button above or write to support — you'll get your key by email, usually within a day.",
  },
  {
    n: "03",
    title: "Activate & grade",
    body: "Paste the key into Studio, the badge lights up, every locked control unlocks. Devices are independent — activate each machine you grade on.",
  },
];

const FAQ = [
  {
    q: "How do I buy a key?",
    a: "Click any tier's button (or the Prism Bundle card) — it opens a pre-filled email to support. We confirm payment and send your key by email, usually within 24 hours. Then paste it into Studio.",
  },
  {
    q: "Do I need an account?",
    a: "No. The Studio runs entirely in your browser — nothing to sign up for. Your key is the only state, and it lives in your browser.",
  },
  {
    q: "Can I buy plugins individually?",
    a: "No — that's the point of the bundle. All 65 modules ship together for $29 (one-time), and the bundle is already included free with Studio and Lifetime keys.",
  },
  {
    q: "What happens when my key expires?",
    a: "The Studio quietly drops back to Free — your parameters stay, locked tools grey out, exports ceiling to 1080p, plugin downloads pause. Activate a fresh key and everything returns.",
  },
  {
    q: "Can I use exports commercially?",
    a: "Graded outputs you create are yours. The Lifetime tier explicitly includes a commercial license; free-tier exports are for personal and evaluation use.",
  },
];

export default function PricingPage() {
  return (
    <main className="relative overflow-x-clip pt-36">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div
          className="aurora-blob -right-40 -top-24 size-[38rem]"
          style={{
            background:
              "radial-gradient(circle, rgba(201,255,63,0.16), transparent 66%)",
          }}
        />
        <div
          className="aurora-blob -left-40 top-1/4 size-[34rem]"
          style={{
            background:
              "radial-gradient(circle, rgba(60,232,255,0.12), transparent 66%)",
          }}
        />
      </div>

      <section className="relative px-6 md:px-10">
        <div className="mx-auto max-w-[92rem]">
          <Reveal>
            <div className="grid gap-10 border-b border-line pb-12 lg:grid-cols-[1.5fr_auto] lg:items-end">
              <div>
                <p className="hud-label">
                  <span className="text-bronze">[07]</span> Ownership · USD
                </p>
                <h1 className="display mt-5 text-[clamp(3rem,7vw,6.4rem)] font-bold uppercase leading-[0.84]">
                  Free until
                  <br />
                  you need <span className="spectrum-text">more.</span>
                </h1>
                <p className="mt-6 max-w-lg text-[14px] leading-relaxed text-ink-muted">
                  No accounts, no subscriptions, no device locks. Keys are
                  server-verified in seconds — and the free tier never nags you.
                </p>
              </div>
              <div className="lg:justify-self-end lg:pb-2">
                <PricingTools />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Tiers ── */}
      <section className="relative px-6 py-16 md:px-10">
        <div className="mx-auto max-w-[92rem]">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

                  <div className="mt-auto pt-8">
                    <Link
                      href={t.cta.href}
                      className={cn(
                        "group w-full justify-center !py-2.5 !text-[12px]",
                        t.featured ? "btn-primary" : "btn-ghost",
                      )}
                    >
                      {t.cta.label}
                      <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={160}>
            <Link
              href="#bundle"
              className="group mt-3 flex flex-col items-start justify-between gap-4 rounded-2xl border border-line bg-bg-raised/30 px-6 py-5 transition-colors hover:border-bronze/40 sm:flex-row sm:items-center"
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="chip !border-bronze/30 !text-bronze-bright">
                  Prism bundle
                </span>
                <p className="text-[13px] text-ink-muted">
                  All 65 modules —{" "}
                  <span className="text-ink">$29</span>, included with Studio
                  &amp; Lifetime.
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

      {/* ── Prism Bundle ── */}
      <section
        id="bundle"
        className="relative scroll-mt-24 border-t border-line px-6 py-24 md:px-10"
      >
        <div className="mx-auto max-w-[92rem]">
          <Reveal>
            <div className="prism-border relative overflow-hidden rounded-2xl border border-bronze/30 bg-bronze/[0.05]">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-bronze/15 blur-3xl"
              />
              <div className="relative grid gap-10 p-8 md:grid-cols-[1.5fr_1fr] md:items-center md:p-12">
                <div>
                  <p className="hud-label flex items-center gap-2 !text-bronze-bright">
                    <Boxes className="size-4" /> Plugins are paid · one bundle
                  </p>
                  <h2 className="display mt-4 text-[clamp(2.4rem,4.6vw,4rem)] font-bold uppercase leading-[0.88]">
                    The Prism
                    <br />
                    <span className="spectrum-text">Bundle.</span>
                  </h2>
                  <p className="mt-5 max-w-xl text-[14px] leading-relaxed text-ink-muted">
                    All 65 WASM modules — S_Glow, S_Light Rays, Twixtor Pro, the
                    whole catalog — plus every module we add later. Never sold
                    individually: one key unlocks every binary, forever.
                    Server-verified on each download, unwatermarked, yours to
                    keep.
                  </p>
                  <p className="hud-label mt-5">
                    Included free with Studio &amp; Lifetime keys
                  </p>
                </div>
                <div className="md:text-right">
                  <p className="display spectrum-text text-6xl font-bold leading-none">
                    $29
                  </p>
                  <p className="hud-label mt-3">One-time · no subscription</p>
                  <Link
                    href={`mailto:${MAIL}?subject=${encodeURIComponent("Order: Prism Bundle ($29)")}`}
                    className="btn-primary group mt-6 w-full justify-center gap-2 md:w-auto"
                  >
                    Get the bundle — $29
                    <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── How keys work ── */}
      <section
        id="how-keys-work"
        className="relative border-t border-line px-6 py-24 md:px-10"
      >
        <div className="mx-auto max-w-[92rem]">
          <Reveal>
            <p className="hud-label">
              <span className="text-bronze">[08]</span> Key protocol
            </p>
            <h2 className="display mt-4 max-w-2xl text-[clamp(2.4rem,4.6vw,4rem)] font-bold uppercase leading-[0.9]">
              Minted privately.
              <br />
              <span className="spectrum-text">Verified publicly.</span>
            </h2>
          </Reveal>
          <div className="mt-12 grid grid-cols-1 gap-3 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 80} className="h-full">
                <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-bg-raised/40 p-7">
                  <span className="mono-num text-[10px] text-bronze">
                    {s.n}
                  </span>
                  <h3 className="display mt-4 text-xl font-bold uppercase tracking-[-0.02em]">
                    {s.title}
                  </h3>
                  <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
                    {s.body}
                  </p>
                  <span className="mt-auto block pt-6">
                    <span className="block h-px w-full bg-line" />
                  </span>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={120}>
            <div className="mt-3 flex items-start gap-4 rounded-2xl border border-line bg-bg-raised/30 p-6">
              <ShieldCheck
                className="mt-0.5 size-5 shrink-0 text-bronze"
                strokeWidth={1.5}
              />
              <p className="max-w-4xl text-[13px] leading-relaxed text-ink-muted">
                Keys are cryptographically signed with a secret that lives only
                on the server — activation checks that signature through the key
                service, and plugin downloads re-verify it again per download.
                Reverse-engineering the site doesn&rsquo;t reveal how to mint
                one.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section
        id="pricing-faq"
        className="relative border-t border-line px-6 py-24 md:px-10"
      >
        <div className="mx-auto grid max-w-[92rem] gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <Reveal>
            <p className="hud-label">
              <span className="text-bronze">[09]</span> FAQ
            </p>
            <h2 className="display mt-4 text-[clamp(2.4rem,4.6vw,4rem)] font-bold uppercase leading-[0.9]">
              Straight
              <br />
              <span className="spectrum-text">answers.</span>
            </h2>
            <p className="mt-5 max-w-xs text-[13px] leading-relaxed text-ink-muted">
              Still unclear? Write to{" "}
              <a
                href={`mailto:${MAIL}`}
                className="text-ink underline decoration-bronze/50 underline-offset-4 hover:text-bronze"
              >
                support
              </a>{" "}
              — a human answers.
            </p>
          </Reveal>
          <div className="space-y-2">
            {FAQ.map((f, i) => (
              <Reveal key={f.q} delay={i * 50}>
                <details className="group rounded-xl border border-line bg-bg-raised/40 px-5 py-4 transition-colors open:border-bronze/30 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                    <span className="text-[14px]">{f.q}</span>
                    <span className="mono-num text-sm text-bronze transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-ink-muted">
                    {f.a}
                  </p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
