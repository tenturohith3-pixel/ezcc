import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { CatalogExplorer } from "@/components/plugins/CatalogExplorer";
import {
  plugins,
  pluginCategories,
  pluginCount,
} from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Prism Plugins",
  description: `${pluginCount} premium WASM plugins — blur, light, stylize, keying, time and more. Binaries you keep.`,
};

const ID = "catalog";

export default function PluginsPage() {
  return (
    <main className="relative overflow-x-clip pt-36">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div
          className="aurora-blob -right-40 -top-20 size-[38rem]"
          style={{
            background:
              "radial-gradient(circle, rgba(201,255,63,0.16), transparent 66%)",
          }}
        />
        <div
          className="aurora-blob -left-44 top-1/3 size-[34rem]"
          style={{
            background:
              "radial-gradient(circle, rgba(139,92,255,0.14), transparent 66%)",
          }}
        />
      </div>

      <section className="relative px-6 md:px-10">
        <div className="mx-auto max-w-[92rem]">
          <Reveal>
            <div className="flex flex-col gap-10 border-b border-line pb-12 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="hud-label">
                  <span className="text-bronze">[05]</span> The prism vault
                </p>
                <h1 className="display mt-5 text-[clamp(3rem,7.2vw,6.8rem)] font-bold uppercase leading-[0.84]">
                  {pluginCount} modules.
                  <br />
                  <span className="spectrum-text">Eight disciplines.</span>
                </h1>
              </div>
              <div className="max-w-sm lg:pb-2 lg:text-right">
                <p className="text-[14px] leading-relaxed text-ink-muted">
                  GPU-class effects built as WASM binaries — S_Glow, S_Twixtor
                  Pro, S_Light Rays and friends. Every entry ships its binary
                  and a rendered reference frame. Yours to keep.
                </p>
                <div className="mt-7 flex items-center gap-6 lg:justify-end">
                  {[
                    [`${pluginCount}/${pluginCount}`, "binaries"],
                    [`0${pluginCategories.length}`, "disciplines"],
                    ["0", "uploads"],
                  ].map(([value, label]) => (
                    <div key={label}>
                      <p className="mono-num text-[12px] text-ink">{value}</p>
                      <p className="hud-label mt-1.5 !text-[7px]">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section id={ID} className="relative px-6 py-14 md:px-10 md:py-16">
        <div className="mx-auto max-w-[92rem]">
          <Reveal>
            <div className="prism-border relative mb-8 overflow-hidden rounded-2xl border border-bronze/30 bg-bronze/[0.05] p-6 md:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="max-w-2xl">
                  <p className="hud-label !text-bronze-bright">
                    Paid · sold as one bundle
                  </p>
                  <h2 className="display mt-3 text-2xl font-bold uppercase leading-none md:text-3xl">
                    The Prism Bundle —{" "}
                    <span className="spectrum-text">$29</span>
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                    All {pluginCount} WASM modules, every category, all future
                    additions. One-time purchase, no subscription. Included free
                    with Studio and Lifetime keys.
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-2.5">
                  <Link
                    href="/pricing#bundle"
                    className="btn-primary group justify-center gap-2"
                  >
                    Get the bundle
                    <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    href="/pricing"
                    className="btn-ghost justify-center text-[13px]"
                  >
                    Compare tiers
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
          <CatalogExplorer plugins={[...plugins]} categories={pluginCategories} />
        </div>
      </section>
    </main>
  );
}
