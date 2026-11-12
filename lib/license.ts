/**
 * EffectCraft — tier licensing (client side).
 *
 * Keys are minted server-side (HMAC-signed — see lib/license-server.ts) and
 * verified through /api/license/validate. This module only persists, loads
 * and exposes license state; it never trusts client-side math for tier
 * decisions that matter (the server re-checks on every sensitive route).
 */

export type Tier = "basic" | "bundle" | "pro" | "studio" | "lifetime";

export const TIER_RANK: Record<Tier, number> = {
  basic: 0,
  bundle: 1,
  pro: 2,
  studio: 3,
  lifetime: 4,
};

export const TIER_LABEL: Record<Tier, string> = {
  basic: "Free",
  bundle: "Bundle",
  pro: "Pro",
  studio: "Studio",
  lifetime: "Lifetime",
};

export const TIER_MAX_EXPORT: Record<Tier, number> = {
  basic: 1920,
  bundle: 1920,
  pro: 3840,
  studio: 3840,
  lifetime: 7680,
};

/**
 * Level-Up ceiling — deliberately higher than the export ceiling.
 * A straight export is the plan's resolution; a level-up is the metered
 * premium action, so free gets 2K (a 720p frame becomes a true 2560×1440)
 * and paid reaches 4K/source. Without this, every free level-up clamped to
 * 1920 and ×2 and ×4 produced identical files.
 */
export const TIER_MAX_UPSCALE: Record<Tier, number> = {
  basic: 2560,
  bundle: 2560,
  pro: 3840,
  studio: 3840,
  lifetime: 7680,
};

export interface StoredLicense {
  key: string;
  tier: Tier;
  issuedAt: number;
  expiresAt: number | null;
  name?: string;
}

const STORAGE_KEY = "ec:license";
const LICENSE_EVENT = "ec:license-changed";
const VALIDATE_ENDPOINT = "/api/license/validate";

export interface KeyValidation {
  ok: boolean;
  tier: Tier;
  error?: string;
  key?: string;
  issuedAt?: number;
  expiresAt?: number | null;
  expired?: boolean;
}

/* ── Persistence ─────────────────────────── */

export function loadLicense(): StoredLicense | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredLicense;
    if (!parsed?.tier || !TIER_RANK[parsed.tier]) return null;
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveLicense(license: StoredLicense): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(license));
  window.dispatchEvent(new Event(LICENSE_EVENT));
}

export function clearLicense(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(LICENSE_EVENT));
}

export const LICENSE_CHANGE_EVENT = LICENSE_EVENT;

export function tierRankOf(license: StoredLicense | null): number {
  if (!license) return 0;
  return TIER_RANK[license.tier] ?? 0;
}

/* ── Server-verified validation ──────────── */

export async function validateKeyRemote(input: string): Promise<KeyValidation> {
  const chars = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (chars.length !== 19 || !chars.startsWith("EC")) {
    return {
      ok: false,
      tier: "basic",
      error: "That is not a valid EffectCraft key format.",
    };
  }
  try {
    const res = await fetch(VALIDATE_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: input }),
    });
    const data = (await res.json().catch(() => null)) as Partial<KeyValidation> | null;
    if (!data) {
      return { ok: false, tier: "basic", error: "Key service returned nothing — try again." };
    }
    if (res.ok && data.ok && data.tier) {
      return {
        ok: true,
        tier: data.tier,
        key: data.key ?? chars,
        issuedAt: data.issuedAt,
        expiresAt: data.expiresAt ?? null,
      };
    }
    return {
      ok: false,
      tier: "basic",
      error: data.error ?? "Key rejected by the server.",
      expired: data.expired,
    };
  } catch {
    return {
      ok: false,
      tier: "basic",
      error: "Could not reach the key service — check your connection and retry.",
    };
  }
}

/** Convenience rank check used by gated UI. */
export function hasRank(license: StoredLicense | null, min: Tier): boolean {
  return tierRankOf(license) >= TIER_RANK[min];
}
