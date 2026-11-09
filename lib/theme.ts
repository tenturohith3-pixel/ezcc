/**
 * EffectCraft — appearance system.
 *   light  — the lit light table (warm paper)
 *   dark   — the darkroom (warm near-black, safelight bronze)
 *   system — Standard: follow the OS, live.
 *
 * The preference lives in localStorage; the RESOLVED theme lives on
 * <html data-theme>. `app/layout.tsx` boots it inline before first paint
 * so there is never a flash of the wrong room.
 */

export type ThemePref = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_KEY = "ec:theme";
export const THEME_EVENT = "ec:theme-changed";

const isPref = (v: unknown): v is ThemePref =>
  v === "light" || v === "dark" || v === "system";

export function loadThemePref(): ThemePref {
  if (typeof window === "undefined") return "system";
  try {
    const raw = window.localStorage.getItem(THEME_KEY);
    return isPref(raw) ? raw : "system";
  } catch {
    return "system";
  }
}

export function systemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function resolveTheme(pref: ThemePref): ResolvedTheme {
  return pref === "system" ? systemTheme() : pref;
}

export function applyTheme(pref: ThemePref): ResolvedTheme {
  if (typeof document === "undefined") return resolveTheme(pref);
  const resolved = resolveTheme(pref);
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.dataset.themePref = pref;
  root.style.colorScheme = resolved;
  return resolved;
}

export function saveTheme(pref: ThemePref): void {
  try {
    window.localStorage.setItem(THEME_KEY, pref);
  } catch {
    /* storage disabled — session-only theme */
  }
  applyTheme(pref);
  window.dispatchEvent(new Event(THEME_EVENT));
}

/** Inline boot script source — injected first in <body> before paint. */
export const THEME_BOOT_SCRIPT = `(function(){try{var k='${THEME_KEY}';var p=localStorage.getItem(k);if(p!=='light'&&p!=='dark'&&p!=='system')p='system';var m=window.matchMedia('(prefers-color-scheme: light)').matches;var r=p==='system'?(m?'light':'dark'):p;var d=document.documentElement;d.dataset.theme=r;d.dataset.themePref=p;d.style.colorScheme=r;}catch(e){}})();`;
