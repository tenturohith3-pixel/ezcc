"use client";

import { Lock, Palette } from "lucide-react";
import { Panel } from "./ui";
import { cn } from "@/lib/cn";
import { LOOKS } from "@/lib/grade/looks";
import { Slider } from "./ui";
import { TIER_RANK, type Tier } from "@/lib/license";

const LOCK_RANK: Record<"free" | "pro" | "studio", number> = {
  free: 0,
  pro: 2,
  studio: 3,
};

export function LooksRail({
  activeLook,
  lookIntensity,
  onSelect,
  onIntensity,
  tier,
}: {
  activeLook: string;
  lookIntensity: number;
  onSelect: (id: string) => void;
  onIntensity: (v: number) => void;
  tier: Tier;
}) {
  const rank = TIER_RANK[tier];

  return (
    <Panel title="Film Looks">
      <ul className="mt-1 space-y-1.5">
        {LOOKS.map((look) => {
          const locked = LOCK_RANK[look.locked] > rank;
          const active = activeLook === look.id;
          return (
            <li key={look.id}>
              <button
                onClick={() => !locked && onSelect(look.id)}
                className={cn(
                  "w-full text-left px-3.5 py-2.5 rounded-lg border transition-all duration-150 group",
                  active
                    ? "border-bronze/50 bg-bronze/10"
                    : "border-transparent hover:bg-tint-soft hover:border-line",
                  locked && "opacity-45",
                )}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Palette
                    className={cn(
                      "size-3.5 shrink-0",
                      active ? "text-bronze-bright" : "text-ink-faint",
                    )}
                    strokeWidth={1.5}
                  />
                  <span className="text-[13px] truncate flex-1">{look.name}</span>
                  {locked ? <Lock className="size-3 text-bronze-bright/80 shrink-0" /> : null}
                </span>
                <span className="block pl-[26px] text-[10px] text-ink-faint truncate">
                  {locked
                    ? `Requires ${look.locked === "pro" ? "Pro" : "Studio"} key`
                    : look.tag}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 pt-4 border-t border-line">
        <Slider
          label="Look intensity"
          min={0}
          max={100}
          value={lookIntensity}
          onChange={onIntensity}
          accent
        />
      </div>
    </Panel>
  );
}
