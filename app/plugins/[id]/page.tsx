import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Cpu, Box } from "lucide-react";
import { pluginById, plugins } from "@/lib/catalog";
import { Reveal } from "@/components/site/Reveal";
import { DownloadButton } from "@/components/plugins/DownloadButton";

export async function generateStaticParams() {
  return plugins.map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const plugin = pluginById(id);
  if (!plugin) return { title: "Plugin not found" };
  return {
    title: `${plugin.name} — Prism`,
    description: `${plugin.name} — ${plugin.category} WASM module for the EffectCraft pipeline.`,
  };
}

const cardArt = (path: string) => path.replace(/_p3(\.[a-z]+)$/i, "_card$1");

export default async function PluginDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const plugin = pluginById(id);
  if (!plugin) notFound();

  const related = plugins
    .filter((p) => p.category === plugin.category && p.id !== plugin.id)
    .slice(0, 3);
  const binaryFile = plugin.binaryPath.split("/").at(-1) ?? `${plugin.id}.wasm`;

  return (
    <main className="relative overflow-x-clip pt-32">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div
          className="aurora-blob -right-40 -top-24 size-[32rem]"
          style={{
            background:
              "radial-gradient(circle, rgba(60,232,255,0.12), transparent 66%)",
          }}
        />
        <div
          className="aurora-blob -left-40 top-1/3 size-[30rem]"
          style={{
            background:
              "radial-gradient(circle, rgba(139,92,255,0.12), transparent 66%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[92rem] px-6 pb-8 md:px-10">
        <Link
          href="/plugins"
          className="group mb-8 inline-flex items-center gap-2 text-[12px] text-ink-muted transition-colors hover:text-ink"
        >
          <span className="grid size-7 place-items-center rounded-full border border-line transition-colors group-hover:border-bronze/50">
            <ArrowLeft className="size-3.5" />
          </span>
          Back to catalog
        </Link>

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1.35fr_1fr]">
          {/* Visual */}
          <Reveal>
            <div className="relative overflow-hidden rounded-2xl border border-line bg-bg-raised">
              <div className="spectrum-bar opacity-80" />
              <div className="relative aspect-[16/10]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cardArt(plugin.imagePath)}
                  alt={`${plugin.name} rendered reference`}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
                <span className="chip absolute left-4 top-4 !border-white/15 !bg-black/50 !text-[8px] !text-white/75 backdrop-blur-sm">
                  Reference render
                </span>
                <span className="mono-num absolute right-4 top-4 text-[9px] text-white/50">
                  {plugin.category}
                </span>
                <span className="hud-label absolute bottom-4 left-4 !text-white/50">
                  {plugin.name} · wasm32
                </span>
              </div>
            </div>
          </Reveal>

          {/* Spec sheet */}
          <Reveal delay={100}>
            <div className="space-y-6">
              <div>
                <p className="hud-label text-bronze">{plugin.category}</p>
                <h1 className="display mt-3 text-[clamp(2.8rem,5vw,4.6rem)] font-bold uppercase leading-[0.86]">
                  {plugin.name}
                </h1>
                <p className="mono-num mt-3 text-[10px] text-ink-faint">
                  prism://{plugin.id} — wasm/wasi
                </p>
              </div>

              <p className="max-w-xl text-[14px] leading-relaxed text-ink-muted">
                A Prism module from the{" "}
                {plugin.category.toLowerCase()} discipline. Part of the paid{" "}
                <Link
                  href="/pricing#bundle"
                  className="text-bronze-bright underline decoration-bronze/40 underline-offset-4 hover:decoration-bronze"
                >
                  Prism Bundle ($29)
                </Link>{" "}
                — versioned, deterministic and unwatermarked; the binary is
                yours once unlocked.
              </p>

              <dl className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-bg-raised/40 text-sm">
                <Row label="Module ID" value={plugin.id} mono />
                <Row label="Binary" value={binaryFile} mono />
                <Row label="Format" value="WebAssembly (wasm32)" />
                <Row label="Category" value={plugin.category} />
                <Row label="Availability" value="Prism Bundle — $29 one-time" />
              </dl>

              <DownloadButton pluginId={plugin.id} />

              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { icon: Cpu, label: "WASM32" },
                  { icon: Box, label: "Deterministic" },
                  { icon: Box, label: "Bundle · $29" },
                ].map((b) => (
                  <div
                    key={b.label}
                    className="rounded-xl border border-line bg-bg-raised/40 p-4"
                  >
                    <b.icon
                      className="mx-auto size-4 text-bronze"
                      strokeWidth={1.5}
                    />
                    <p className="hud-label mt-2 !text-[7px]">{b.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>

        {/* Related */}
        {related.length > 0 ? (
          <div className="mt-20 border-t border-line pt-10">
            <div className="mb-6 flex items-center justify-between">
              <p className="hud-label">
                More in <span className="text-ink">{plugin.category}</span>
              </p>
              <Link
                href="/plugins"
                className="group inline-flex items-center gap-1.5 text-[11px] text-ink-muted transition-colors hover:text-ink"
              >
                Full catalog
                <ArrowUpRight className="size-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/plugins/${r.id}`}
                  className="group overflow-hidden rounded-2xl border border-line bg-bg-raised transition-colors duration-300 hover:border-bronze/40"
                >
                  <div className="relative aspect-[2.2/1] overflow-hidden bg-bg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cardArt(r.imagePath)}
                      alt={r.name}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover opacity-85 transition-all duration-700 group-hover:scale-[1.04] group-hover:opacity-100"
                    />
                  </div>
                  <div className="flex items-center justify-between border-t border-line p-4">
                    <div>
                      <p className="display text-[14px] font-bold uppercase leading-none">
                        {r.name}
                      </p>
                      <p className="mono-num mt-1.5 text-[9px] text-ink-faint">
                        {r.id}
                      </p>
                    </div>
                    <span className="grid size-7 place-items-center rounded-full border border-line-strong text-ink-faint transition-colors group-hover:border-bronze group-hover:bg-bronze group-hover:text-[color:var(--btn-ink)]">
                      <ArrowUpRight className="size-3" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <dt className="hud-label !text-[8px]">{label}</dt>
      <dd
        className={
          mono
            ? "mono-num truncate text-[10px] text-ink"
            : "text-[12px] text-ink"
        }
      >
        {value}
      </dd>
    </div>
  );
}
