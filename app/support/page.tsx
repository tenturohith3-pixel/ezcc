import type { Metadata } from "next";
import { Mail, Timer, ShieldCheck, ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { ContactForm } from "@/components/support/ContactForm";

export const metadata: Metadata = {
  title: "Support",
  description:
    "FAQs, direct contact and platform status for the EffectCraft ecosystem.",
};

const CHANNELS = [
  {
    icon: Mail,
    label: "Mail",
    value: "support@effectcraft.studio",
    note: "answered first-come, same working week",
    href: "mailto:support@effectcraft.studio",
  },
  {
    icon: Timer,
    label: "SLA",
    value: "24h pivots",
    note: "grading emergencies jump the queue on Studio keys",
    href: "mailto:support@effectcraft.studio?subject=Priority%20grade",
  },
  {
    icon: ShieldCheck,
    label: "Refunds",
    value: "No-questions",
    note: "annual keys refundable inside 14 days, untouched",
    href: "mailto:support@effectcraft.studio?subject=Refund",
  },
];

const FAQ = [
  {
    q: "Where do my files get processed?",
    a: "In your browser. The grading engine writes pixels via Canvas 2D on-device; your frame is never uploaded anywhere. Closing the tab clears everything except your saved key.",
  },
  {
    q: "What can I feed the Studio?",
    a: "PNG, JPEG and WEBP stills — a frame from your timeline is the ideal subject. Reference frames drop in directly or via the file button; the synthetic dusk sample also works from a cold start.",
  },
  {
    q: "How do Plugin binaries fit into my pipeline?",
    a: "Prism modules are standard WASM, sold together in the Prism Bundle ($29 one-time, included with Studio and Lifetime). Unlock once, download every binary, and mount it in your host of choice or reference its deterministic module id (prism://<id>) from EffectCraft-compatible tooling.",
  },
  {
    q: "Why is the export lighter than my source?",
    a: "Resolution tiers: Basic stops at 1920px, Pro/Studio at 3840px, and the cap never upscales — the render stays at or below your source for honesty's sake.",
  },
  {
    q: "Can I run this platform from source?",
    a: "Yes — it is a plain Next.js app: bun install, bun run dev. Studio and catalog work with zero environment variables by design.",
  },
];

const STATUS = [
  ["Studio engine", "Operational", true],
  ["Plugin registry", "Operational", true],
  ["Key verification", "Local-only", true],
] as const;

export default function SupportPage() {
  return (
    <main className="relative overflow-x-clip pt-36">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div
          className="aurora-blob -left-40 -top-24 size-[38rem]"
          style={{
            background:
              "radial-gradient(circle, rgba(60,232,255,0.14), transparent 66%)",
          }}
        />
        <div
          className="aurora-blob -right-32 top-1/3 size-[32rem]"
          style={{
            background:
              "radial-gradient(circle, rgba(255,77,157,0.10), transparent 66%)",
          }}
        />
      </div>

      <section className="relative px-6 md:px-10">
        <div className="mx-auto max-w-[92rem]">
          <Reveal>
            <div className="grid gap-10 border-b border-line pb-12 lg:grid-cols-[1.5fr_1fr] lg:items-end">
              <div>
                <p className="hud-label">
                  <span className="text-bronze">[10]</span> Support dispatch
                </p>
                <h1 className="display mt-5 text-[clamp(3rem,7vw,6.4rem)] font-bold uppercase leading-[0.84]">
                  Quiet dispatch,
                  <br />
                  <span className="spectrum-text">real answers.</span>
                </h1>
              </div>
              <div className="lg:pb-2 lg:text-right">
                <p className="max-w-sm text-[14px] leading-relaxed text-ink-muted lg:ml-auto">
                  A human reads every message. No ticket maze, no chatbot
                  loop — just the team that builds the engine.
                </p>
                <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5">
                  <span className="size-1.5 rounded-full bg-bronze glow-dot" />
                  <span className="hud-label !text-[8px] !text-ink-muted">
                    All systems nominal
                  </span>
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Channels */}
      <section className="relative px-6 py-16 md:px-10">
        <div className="mx-auto grid max-w-[92rem] grid-cols-1 gap-3 md:grid-cols-3">
          {CHANNELS.map((c, i) => (
            <Reveal key={c.label} delay={i * 80} className="h-full">
              <a
                href={c.href}
                className="bento-card group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-bg-raised/40 p-6"
              >
                <div className="flex items-start justify-between">
                  <span className="grid size-10 place-items-center rounded-xl border border-line bg-tint">
                    <c.icon className="size-4 text-bronze" strokeWidth={1.5} />
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full border border-bronze/25 bg-bronze/[0.06] px-2.5 py-1">
                    <span className="size-1 rounded-full bg-bronze" />
                    <span className="hud-label !text-[7px] !text-bronze-bright">
                      Online
                    </span>
                  </span>
                </div>
                <p className="hud-label mt-7">{c.label}</p>
                <p className="display mt-2.5 text-xl font-bold tracking-[-0.02em]">
                  {c.value}
                </p>
                <div className="mt-auto flex items-end justify-between gap-4 pt-7">
                  <p className="text-[12px] leading-relaxed text-ink-muted">
                    {c.note}
                  </p>
                  <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line-strong text-ink-faint transition-colors duration-300 group-hover:border-bronze group-hover:bg-bronze group-hover:text-[color:var(--btn-ink)]">
                    <ArrowUpRight className="size-3" />
                  </span>
                </div>
              </a>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FAQ + Status + Contact */}
      <section id="faq" className="relative border-t border-line px-6 py-20 md:px-10 md:py-24">
        <div className="mx-auto grid max-w-[92rem] grid-cols-1 items-start gap-10 lg:grid-cols-[1.15fr_1fr]">
          <Reveal>
            <p className="hud-label">
              <span className="text-bronze">[11]</span> FAQ
            </p>
            <h2 className="display mt-4 max-w-md text-[clamp(2.2rem,4vw,3.4rem)] font-bold uppercase leading-[0.9]">
              Before you write — it&rsquo;s probably here.
            </h2>
            <div className="mt-8 space-y-2">
              {FAQ.map((f) => (
                <details
                  key={f.q}
                  className="group rounded-xl border border-line bg-bg-raised/40 px-5 py-4 transition-colors open:border-bronze/30 [&_summary::-webkit-details-marker]:hidden"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                    <span className="text-[14px]">{f.q}</span>
                    <span className="mono-num shrink-0 text-sm text-bronze transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>

            <div
              id="status"
              className="mt-8 overflow-hidden rounded-2xl border border-line bg-bg-raised/30 p-6"
            >
              <p className="hud-label mb-5 flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-bronze glow-dot" />
                Platform status
              </p>
              <ul className="space-y-3">
                {STATUS.map(([name, value, ok]) => (
                  <li
                    key={name}
                    className="flex items-center justify-between border-b border-line/60 pb-2.5 last:border-0 last:pb-0"
                  >
                    <span className="text-[12px] text-ink-muted">{name}</span>
                    <span
                      className={
                        ok
                          ? "hud-label !text-[8px] !text-bronze-bright"
                          : "hud-label !text-[8px] !text-ink-faint"
                      }
                    >
                      {value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <ContactForm />
          </Reveal>
        </div>
      </section>
    </main>
  );
}
