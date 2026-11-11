"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, ArrowRight } from "lucide-react";
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
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search 65 modules — glow, twixtor, key…"
            className="w-full rounded-full border border-line bg-bg-raised/60 py-2.5 pl-11 pr-4 text-sm outline-none backdrop-blur-sm transition-colors placeholder:text-ink-faint focus:border-bronze/50"
          />
        </div>
        <p className="hud-label shrink-0">
          <span className="text-ink">{filtered.length}</span> / {plugins.length}{" "}
          modules
        </p>
      </div>

      {/* Category chips */}
      <div className="mb-10 flex flex-wrap gap-1.5">
        {["All", ...categories].map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[11px] transition-all duration-200",
              cat === c
                ? "bg-bronze font-semibold text-[color:var(--btn-ink)]"
                : "text-ink-muted hover:bg-tint hover:text-ink",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((p, i) => (
          <Link
            key={p.id}
            href={`/plugins/${p.id}`}
            className="group relative block overflow-hidden rounded-2xl border border-line bg-bg-raised transition-colors duration-300 hover:border-bronze/40"
          >
            <div className="relative aspect-[2.6/1] overflow-hidden bg-bg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.imagePath.replace(/_p3(\.[a-z]+)$/i, "_card$1")}
                alt={p.name}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover object-center opacity-85 transition-all duration-700 group-hover:scale-[1.04] group-hover:opacity-100"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />
              <span className="chip absolute bottom-3 left-3 !border-white/15 !bg-black/45 !text-[8px] !text-white/75">
                {p.category}
              </span>
              <span className="mono-num absolute right-3 top-3 text-[9px] text-white/50">
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
            <div className="flex items-end justify-between gap-2 border-t border-line p-4">
              <div className="min-w-0">
                <p className="display truncate text-[15px] font-bold uppercase leading-none tracking-[-0.02em]">
                  {p.name}
                </p>
                <p className="mono-num mt-2 truncate text-[9px] text-ink-faint">
                  {p.id}.wasm
                </p>
              </div>
              <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line-strong text-ink-muted transition-colors duration-300 group-hover:border-bronze group-hover:bg-bronze group-hover:text-[color:var(--btn-ink)]">
                <ArrowRight className="size-3" />
              </span>
            </div>
            <span className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,#c9ff3f,#3ce8ff,#8b5cff,#ff4d9d)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="py-24 text-center">
          <p className="hud-label">No modules match this reel</p>
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
