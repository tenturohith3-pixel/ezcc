/**
 * Upscale quota — 3 free level-ups per rolling 24 h; paid tiers unlimited.
 *
 * Best-effort, local-first: this is a client-side tool and the counter is a
 * rolling window in localStorage. It is tamper-resistant against casual
 * resets, not against a determined user — consistent with how browser-local
 * creative tools scoped their trial limits. The tier itself is always
 * license-verified server-side; this only meters the free workflow.
 */

import type { Tier } from "@/lib/license";

export const FREE_UPSCALES_PER_24H = 3;
export const UPSCALE_EVENT = "ec:upscale-changed";

const KEY = "ec:upscale-log";
const WINDOW_MS = 24 * 60 * 60 * 1000;

function readLog(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is number => typeof v === "number" && Number.isFinite(v),
    );
  } catch {
    return [];
  }
}

function writeLog(stamps: number[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(stamps));
  } catch {
    /* storage disabled */
  }
  window.dispatchEvent(new Event(UPSCALE_EVENT));
}

function fresh(stamps: number[], now: number): number[] {
  return stamps.filter((t) => t > now - WINDOW_MS && t <= now + 60_000);
}

export function isPaidTier(tier: Tier): boolean {
  return tier !== "basic";
}

/** Remaining level-ups in the rolling window (Infinity for paid tiers). */
export function remainingUpscales(tier: Tier, now = Date.now()): number {
  if (isPaidTier(tier)) return Infinity;
  return Math.max(0, FREE_UPSCALES_PER_24H - fresh(readLog(), now).length);
}

export function canUpscale(tier: Tier, now = Date.now()): boolean {
  return isPaidTier(tier) || remainingUpscales(tier, now) > 0;
}

/** Milliseconds until the next free level-up returns (0 when available). */
export function nextFreeUpscaleIn(tier: Tier, now = Date.now()): number {
  if (isPaidTier(tier)) return 0;
  const log = fresh(readLog(), now).sort((a, b) => a - b);
  if (log.length < FREE_UPSCALES_PER_24H) return 0;
  const freeing = log[log.length - FREE_UPSCALES_PER_24H] ?? now;
  return Math.max(0, freeing + WINDOW_MS - now);
}

export function recordUpscale(now = Date.now()): void {
  const log = fresh(readLog(), now);
  log.push(now);
  writeLog(log);
}

export function formatQuotaWindow(ms: number): string {
  if (ms <= 0) return "now";
  /* round up to whole minutes first, so 23h 59m 57s reads "24h 0m"
     instead of "23h 60m" */
  const total = Math.ceil(ms / 60_000);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h >= 1) return `${h}h ${m}m`;
  return `${m}m`;
}
