import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { FooterWordmark } from "@/components/site/FooterWordmark";

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
    <footer className="relative border-t border-line mt-40 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 pt-20 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr_1fr_1fr] gap-12">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid place-items-center size-8 rounded-lg border border-line bg-tint">
                <Clapperboard className="size-4 text-bronze-bright" strokeWidth={1.75} />
              </span>
              <span className="display text-[15px] tracking-[0.14em] uppercase">
                EffectCraft
              </span>
            </div>
            <p className="mt-5 text-sm text-ink-muted leading-relaxed max-w-xs">
              Studio-grade grading and a premium Prism plugin ecosystem —
              engineered to run entirely in the browser.
            </p>
            <p className="mt-6 mono-label !text-[10px]">
              SYS.OK — EDGE IAD1
            </p>
          </div>
          {COLS.map((col) => (
            <div key={col.title}>
              <p className="mono-label mb-5">{col.title}</p>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-ink-muted hover:text-ink transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="hairline my-12" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p className="text-xs text-ink-faint">
            © 2026 EffectCraft. Cinematic precision, engineered.
          </p>
          <p className="mono-label !text-[10px]">
            Built on Next.js — Runs on the edge
          </p>
        </div>
      </div>
      <FooterWordmark />
    </footer>
  );
}
