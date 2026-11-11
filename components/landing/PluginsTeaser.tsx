import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { pluginById, pluginCount } from "@/lib/catalog";
import { cn } from "@/lib/cn";

const FEATURED = [
  "prism-glow",
  "prism-light-rays",
  "twixtor-pro",
  "prism-aurora",
  "deep-glow",
  "prism-oil-paint",
];

export function PluginsTeaser() {
  const items = FEATURED.map((id) => pluginById(id)).filter(
    (p): p is NonNullable<typeof p> => p !== null,
  );

  return (
    <section
      id="vault"
      className="relative border-y border-line px-6 py-24 md:px-10 md:py-32"
    >
      <div className="mx-auto max-w-[92rem]">
        <Reveal className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="hud-label">
              <span className="text-bronze">[06]</span> The prism vault
            </p>
            <h2 className="display mt-4 text-[clamp(2.7rem,5.6vw,4.9rem)] font-bold uppercase leading-[0.88]">
              Sixty-five modules.
              <br />
              <span className="spectrum-text">No host required.</span>
            </h2>
          </div>
          <div className="flex max-w-sm flex-col items-start gap-4 md:items-end md:pb-2 md:text-right">
            <p className="text-[14px] leading-relaxed text-ink-muted">
              Real WASM effects, each measured against its After Effects
              reference. Loaded on demand, rendered on your machine.
            </p>
            <Link
              href="/plugins"
              className="group inline-flex items-center gap-2 text-[13px] text-ink transition-colors hover:text-bronze-bright"
            >
              Browse the full catalog
              <span className="grid size-6 place-items-center rounded-full border border-line-strong/60 transition-colors group-hover:border-bronze/60">
                <ArrowRight className="size-3" />
              </span>
            </Link>
          </div>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          {items.map((p, i) => (
            <Reveal
              key={p.id}
              delay={(i % 3) * 80}
              className={cn(
                "h-full",
                i === 0 && "sm:col-span-2 md:row-span-2",
                i === 5 && "sm:col-span-2 md:col-span-2",
              )}
            >
              <Link
                href={`/plugins/${p.id}`}
                className={cn(
                  "group relative block h-full overflow-hidden rounded-2xl border border-line bg-bg-raised",
                  i === 0 ? "min-h-[460px]" : "min-h-[240px]",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.imagePath.replace(/_p3(\.[a-z]+)$/, "_card$1")}
                  alt={p.name}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover object-center opacity-70 transition-all duration-700 group-hover:scale-[1.05] group-hover:opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/10" />
                <div className="absolute inset-0 opacity-20 mix-blend-overlay [background-image:radial-gradient(rgba(255,255,255,0.55)_0.5px,transparent_0.5px)] [background-size:4px_4px]" />

                <div className="relative flex h-full flex-col">
                  <div className="flex items-start justify-between gap-2 p-5">
                    <span className="chip !border-white/15 !bg-black/35 !text-[8px] !text-white/70">
                      {p.category}
                    </span>
                    <span className="mono-num text-[9px] text-white/45">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="relative mt-auto">
                    <div className="pointer-events-none absolute inset-x-0 -top-20 h-20 bg-gradient-to-t from-bg-raised to-transparent" />
                    <div className="relative border-t border-line bg-bg-raised px-5 pb-5 pt-4">
                      <p
                        className={cn(
                          "display font-bold uppercase leading-[0.95] text-ink",
                          i === 0
                            ? "text-[2.4rem] md:text-[2.8rem]"
                            : "text-[1.5rem]",
                        )}
                      >
                        {p.name}
                      </p>
                      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                        <span className="hud-label !text-ink-faint">
                          WASM · on device
                        </span>
                        <span className="grid size-8 place-items-center rounded-full border border-line-strong text-ink-muted transition-colors duration-300 group-hover:border-bronze group-hover:bg-bronze group-hover:text-[color:var(--btn-ink)]">
                          <ArrowUpRight className="size-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <span className="absolute inset-x-0 bottom-0 z-10 h-px bg-[linear-gradient(90deg,#c9ff3f,#3ce8ff,#8b5cff,#ff4d9d)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              </Link>
            </Reveal>
          ))}

          <Reveal
            delay={160}
            className="h-full sm:col-span-2 md:col-span-2"
          >
            <Link
              href="/pricing#bundle"
              className="group relative flex h-full min-h-[240px] flex-col justify-between overflow-hidden rounded-2xl border border-bronze/35 bg-bronze/[0.06] p-5"
            >
              <div
                aria-hidden
                className="absolute -right-14 -top-16 size-40 rounded-full bg-bronze/20 blur-3xl transition-opacity duration-500 group-hover:opacity-80"
              />
              <div className="flex items-start justify-between">
                <span className="chip !border-bronze/30 !text-[8px] !text-bronze-bright">
                  Prism bundle
                </span>
                <span className="mono-num text-[9px] text-ink-faint">
                  {pluginCount} / {pluginCount}
                </span>
              </div>
              <div>
                <p className="display max-w-xs text-[1.7rem] font-bold uppercase leading-[0.95]">
                  Every module.
                  <br />
                  <span className="text-ink-faint">One key.</span>
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-bronze/20 pt-3">
                  <span className="hud-label !text-bronze-bright/80">
                    $29 · included with Studio
                  </span>
                  <span className="grid size-8 place-items-center rounded-full bg-bronze text-[color:var(--btn-ink)] transition-transform duration-300 group-hover:rotate-45">
                    <ArrowUpRight className="size-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
