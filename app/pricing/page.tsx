import type { Metadata } from "next";
import Link from "next/link";
import { Check, ShieldCheck, Boxes } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { PricingTools } from "@/components/pricing/PricingTools";

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

export default function PricingPage() {
  return (
    <main className="relative overflow-hidden pt-36">
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div
          className="ambient-a absolute -top-40 left-1/3 size-[40rem] rounded-full blur-[150px] opacity-[0.12]"
          style={{
            background:
              "radial-gradient(circle, rgba(201,160,106,0.5), transparent 65%)",
          }}
        />
      </div>

      <section className="px-6 md:px-12">
        <div className="max-w-4xl mx-auto text-center">
          <Reveal>
            <span className="pill-badge">PRICING — USD</span>
            <h1 className="display text-5xl md:text-7xl gradient-text mt-8 text-balance">
              Free until you need more.
            </h1>
            <p className="mt-6 text-lg text-ink-muted font-light leading-relaxed">
              No accounts, no subscriptions, no device locks. Keys are
              server-verified in seconds.
            </p>
          </Reveal>
          <Reveal delay={130}>
            <div className="mt-10 flex justify-center">
              <PricingTools />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Tiers ── */}
      <section className="relative py-24 px-6 md:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {TIERS.map((t, i) => (
            <Reveal key={t.name} delay={i * 90}>
              <div
                className={
                  t.featured
                    ? "glass card-hover h-full p-8 border-bronze/40 relative"
                    : "glass card-hover h-full p-8 relative"
                }
              >
                {t.featured ? (
                  <span className="absolute top-5 right-5 mono-label !text-[9px] text-bronze-bright">
                    POPULAR
                  </span>
                ) : null}
                <p className="display text-xl">{t.name}</p>
                <p className="mt-5">
                  <span className="display text-4xl">{t.price}</span>
                </p>
                <p className="mono-label !text-[9px] mt-2">{t.note}</p>
                <ul className="mt-7 space-y-2.5">
                  {t.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2 text-[13px] text-ink-muted">
                      <Check className="size-3.5 mt-0.5 text-bronze-bright shrink-0" strokeWidth={2} />
                      {perk}
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Link href={t.cta.href} className={t.featured ? "btn-primary w-full justify-center text-[13px]" : "btn-ghost w-full justify-center text-[13px]"}>
                    {t.cta.label}
                  </Link>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Prism Bundle ── */}
      <section id="bundle" className="relative py-16 px-6 md:px-12 scroll-mt-24">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="glass p-8 md:p-12 border-bronze/30 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(201,160,106,0.09),transparent_60%)] pointer-events-none" />
              <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-8 items-center relative">
                <div>
                  <p className="mono-label !text-[9px] !text-bronze-bright flex items-center gap-2">
                    <Boxes className="size-4" /> PLUGINS ARE PAID · ONE BUNDLE
                  </p>
                  <h2 className="display text-3xl md:text-5xl mt-4 gradient-text">
                    The Prism Bundle.
                  </h2>
                  <p className="mt-4 text-[15px] text-ink-muted leading-relaxed max-w-xl">
                    All 65 WASM modules — S_Glow, S_Light Rays, Twixtor Pro, the
                    whole catalog — plus every module we add later. Never sold
                    individually: one key unlocks every binary, forever. Server-
                    verified on each download, unwatermarked, yours to keep.
                  </p>
                  <p className="mono-num text-[11px] text-ink-faint mt-4">
                    INCLUDED FREE WITH STUDIO &amp; LIFETIME KEYS
                  </p>
                </div>
                <div className="md:text-right">
                  <p className="display text-6xl prism-text">$29</p>
                  <p className="mono-label !text-[9px] mt-2">ONE-TIME · NO SUBSCRIPTION</p>
                  <Link
                    href={`mailto:${MAIL}?subject=${encodeURIComponent("Order: Prism Bundle ($29)")}`}
                    className="btn-primary mt-6 w-full md:w-auto justify-center gap-2"
                  >
                    Get the bundle — $29
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── How keys work ── */}
      <section id="how-keys-work" className="relative py-24 px-6 md:px-12 border-t border-line/60">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <p className="mono-label mb-4">How keys work</p>
            <h2 className="display text-4xl md:text-5xl gradient-text max-w-2xl">
              Minted privately. Verified publicly.
            </h2>
          </Reveal>
          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-4">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 100}>
                <div className="glass p-8 h-full">
                  <p className="mono-num text-bronze-bright text-sm">{s.n}</p>
                  <h3 className="display text-xl mt-4">{s.title}</h3>
                  <p className="mt-3 text-sm text-ink-muted leading-relaxed">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={120}>
            <div className="glass mt-8 p-7 flex items-start gap-4">
              <ShieldCheck className="size-5 text-bronze-bright shrink-0 mt-0.5" strokeWidth={1.5} />
              <div>
                <p className="text-sm text-ink leading-relaxed">
                  Keys are cryptographically signed with a secret that lives only
                  on the server — activation checks that signature through the
                  key service, and plugin downloads re-verify it again per
                  download. Reverse-engineering the site doesn&rsquo;t reveal how
                  to mint one.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="pricing-faq" className="relative py-24 px-6 md:px-12 border-t border-line/60">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <p className="mono-label mb-4">FAQ</p>
            <h2 className="display text-4xl md:text-5xl gradient-text">
              Straight answers.
            </h2>
          </Reveal>
          <div className="mt-12 space-y-3">
            {[
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
            ].map((f, i) => (
              <Reveal key={f.q} delay={i * 60}>
                <details className="glass group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex items-center justify-between cursor-pointer list-none">
                    <span className="text-[15px]">{f.q}</span>
                    <span className="mono-num text-bronze-bright text-sm group-open:rotate-45 transition-transform">
                      +
                    </span>
                  </summary>
                  <p className="mt-4 text-sm text-ink-muted leading-relaxed">{f.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
