"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  applyTheme,
  loadThemePref,
  saveTheme,
  THEME_EVENT,
  type ThemePref,
} from "@/lib/theme";

const OPTIONS: { id: ThemePref; icon: typeof Sun; label: string }[] = [
  { id: "light", icon: Sun, label: "Light — the light table" },
  { id: "system", icon: Monitor, label: "Standard — follow the system" },
  { id: "dark", icon: Moon, label: "Dark — the darkroom" },
];

/**
 * Tri-state appearance switch. Light / Standard / Dark.
 * Quiet by design: a hairline pill, bronze only where you are.
 */
export function ThemeToggle({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [pref, setPref] = useState<ThemePref>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      setPref(loadThemePref());
      setReady(true);
    };
    sync();
    window.addEventListener(THEME_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(THEME_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  /* live OS flip when Standard is selected */
  useEffect(() => {
    if (pref !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [pref]);

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-line bg-tint-soft p-0.5",
        className,
      )}
      role="group"
      aria-label="Appearance"
      data-ready={ready ? "true" : "false"}
    >
      {OPTIONS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => saveTheme(id)}
          aria-label={label}
          aria-pressed={pref === id}
          title={label}
          className={cn(
            "grid place-items-center rounded-full transition-all duration-300",
            compact ? "size-6" : "size-7",
            pref === id
              ? "bg-bronze/15 text-bronze-bright ring-1 ring-inset ring-bronze/35"
              : "text-ink-faint hover:text-ink-muted",
          )}
        >
          <Icon className={compact ? "size-3" : "size-3.5"} strokeWidth={1.75} />
        </button>
      ))}
    </div>
  );
}
