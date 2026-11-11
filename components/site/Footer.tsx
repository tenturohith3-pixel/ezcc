import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { FooterWordmark } from "@/components/site/FooterWordmark";
import { PrismMark } from "@/components/site/PrismMark";

const COLS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/studio", label: "Studio" },
      { href: "/plugins", label: "Prism Plugins" },
      { href: "/pricing", label: "Pricing & Keys" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/support", label: "Contact" },
      { href: "/support#faq", label: "FAQ" },
      { href: "/pricing#how-keys-work", label: "How keys work" },
    ],
  },
  {
    title: "Platform",
    links: [
      { href: "/plugins#catalog", label: "Full catalog" },
      { href: "/studio#export", label: "Export pipeline" },
      { href: "/support#status", label: "Status" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-line bg-bg-raised/20">
      <div className="grid-dots pointer-events-none absolute inset-0 opacity-40" />
      <div
        aria-hidden
        className="aurora-blob -right-32 top-0 size-[30rem]"
        style={{
          background:
            "radial-gradient(circle, rgba(60,232,255,0.14), transparent 66%)",
        }}
      />

      <div className="relative mx-auto max-w-[92rem] px-6 pb-10 pt-20 md:px-10">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <PrismMark className="size-9" />
              <span>
                <span className="display block text-[15px] font-bold uppercase leading-none tracking-[0.16em]">
                  EffectCraft
                </span>
                <span className="hud-label mt-1.5 block !text-[8px]">
                  Spectral lab / 04
                </span>
              </span>
            </Link>

            <p className="mt-6 max-w-xs text-sm leading-relaxed text-ink-muted">
              Studio-grade grading, a Rust detail engine, and the 65-module
              Prism ecosystem — all computed in your browser.
            </p>

            <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5">
              <span className="size-1.5 rounded-full bg-bronze glow-dot" />
              <span className="hud-label !text-[8px] !text-ink-muted">
                All systems nominal
              </span>
            </div>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <p className="hud-label mb-5">{col.title}</p>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      className="group inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
                    >
                      {l.label}
                      <ArrowUpRight className="size-3 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="hairline my-10" />

        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <p className="text-xs text-ink-faint">
            © 2026 EffectCraft. Make light obey.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="hud-label !text-[8px]">Edge IAD1</span>
            <span className="hud-label !text-[8px]">0 bytes uploaded</span>
            <span className="hud-label flex items-center gap-2 !text-[8px]">
              <span className="size-1 rounded-full bg-bronze" />
              Build 4.0
            </span>
          </div>
        </div>
      </div>

      <FooterWordmark />
    </footer>
  );
}
