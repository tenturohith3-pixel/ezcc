"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, ArrowRight, Cpu } from "lucide-react";
import { cn } from "@/lib/cn";

export interface CatalogEntry {
  id: string;
  name: string;
  category: string;
  imagePath: string;
  binaryPath: string;
}

export function CatalogExplorer({
  plugins,
  categories,
}: {
  plugins: CatalogEntry[];
  categories: string[];
}) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return plugins.filter((p) => {
      const matchesCat = cat === "All" || p.category === cat;
      const matchesQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return matchesCat && matchesQ;
    });
  }, [plugins, query, cat]);

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-8">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search 65 modules — glow, twixtor, key…"
            className="w-full rounded-xl border border-line bg-tint-soft pl-10 pr-4 py-3 text-sm outline-none focus:border-bronze/50 placeholder:text-ink-faint"
          />
        </div>
        <p className="mono-label !text-[10px] shrink-0">
          {filtered.length} / {plugins.length} MODULES
        </p>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2 mb-10">
        {["All", ...categories].map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn(
              "px-4 py-2 rounded-lg text-[12px] border transition-all duration-200",
              cat === c
                ? "border-bronze/50 bg-bronze/10 text-bronze-bright"
                : "border-line text-ink-muted hover:text-ink hover:border-line-strong",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((p) => (
          <Link
            key={p.id}
            href={`/plugins/${p.id}`}
            className="glass card-hover block overflow-hidden group"
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.imagePath}
                alt={p.name}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-[1.04] transition-all duration-500"
              />
              <span className="absolute left-3 bottom-3 mono-label !text-[9px] !bg-black/60 !px-2.5 !py-1 rounded-md border border-white/10 !tracking-[0.2em]">
                {p.category}
              </span>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="display text-base">{p.name}</p>
                <Cpu className="size-3.5 text-ink-faint group-hover:text-bronze-bright transition-colors" />
              </div>
              <p className="mt-1.5 mono-num text-[10px] text-ink-faint truncate">
                {p.id}.wasm
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-[11px] text-bronze-bright/90 opacity-0 group-hover:opacity-100 transition-opacity">
                Details <ArrowRight className="size-3" />
              </span>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="py-24 text-center">
          <p className="mono-label">No modules match this reel</p>
          <button
            onClick={() => {
              setQuery("");
              setCat("All");
            }}
            className="btn-ghost mt-6"
          >
            Reset filters
          </button>
        </div>
      ) : null}
    </div>
  );
}
