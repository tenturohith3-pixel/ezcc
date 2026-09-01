/**
 * Access Key Utilities (Client-Side)
 *
 * Manages signed access keys in localStorage.
 * No database queries — keys are self-contained HMAC-signed tokens.
 */

// ── Types ────────────────────────────────────────────

export type KeyTier = "basic" | "pro" | "studio" | "lifetime";

export interface StoredKey {
  keyCode: string;
  tier: KeyTier;
  expiresAt: string | null;
  validatedAt: string;
}

export interface ValidateKeyResult {
  success: boolean;
  error?: string;
  key?: StoredKey;
}

// ── Constants ────────────────────────────────────────

const STORAGE_KEY = "colorgrade-access-key";

/** Numeric tier levels for comparison (higher = more access) */
const TIER_LEVEL: Record<KeyTier, number> = {
  basic: 0,
  pro: 1,
  studio: 2,
  lifetime: 3,
};

/** Human-readable tier names */
export const TIER_LABELS: Record<KeyTier, string> = {
  basic: "Basic",
  pro: "Pro",
  studio: "Studio",
  lifetime: "Lifetime",
};

/** Duration descriptions for each tier */
export const TIER_DURATIONS: Record<KeyTier, string> = {
  basic: "7 days",
  pro: "30 days",
  studio: "365 days",
  lifetime: "Never expires",
};

// ── localStorage ─────────────────────────────────────

/** Read the stored key, auto-removing if expired */
export function getStoredKey(): StoredKey | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const key = JSON.parse(raw) as StoredKey;
    if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return key;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

/** Persist a validated key */
export function storeKey(key: StoredKey): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(key));
}

/** Remove the stored key */
export function removeStoredKey(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

// ── Tier Checks ──────────────────────────────────────

/** Does the current key grant access to at least `requiredTier`? */
export function hasTierAccess(requiredTier: KeyTier): boolean {
  const key = getStoredKey();
  if (!key) return false;
  return TIER_LEVEL[key.tier] >= TIER_LEVEL[requiredTier];
}

/** Current effective tier, or null if no valid key */
export function getCurrentTier(): KeyTier | null {
  return getStoredKey()?.tier ?? null;
}

/** Milliseconds in a day */
const DAY_MS = 86_400_000;

/** How many ms until the key expires (null if no key or lifetime) */
export function getTimeUntilExpiration(): number | null {
  const key = getStoredKey();
  if (!key?.expiresAt) return null;
  return new Date(key.expiresAt).getTime() - Date.now();
}

/** Key is expiring within the given threshold (default 2 days) */
export function isExpiringSoon(thresholdMs = 2 * DAY_MS): boolean {
  const remaining = getTimeUntilExpiration();
  if (remaining === null) return false;
  return remaining > 0 && remaining <= thresholdMs;
}

/** Expiration urgency level for UI styling */
export type ExpirationLevel = "safe" | "warning" | "urgent" | "expired" | "lifetime";

export function getExpirationLevel(): ExpirationLevel {
  const remaining = getTimeUntilExpiration();
  if (remaining === null) return "lifetime";
  if (remaining <= 0) return "expired";
  if (remaining <= DAY_MS) return "urgent";
  if (remaining <= 2 * DAY_MS) return "warning";
  return "safe";
}

/** Human-readable time remaining for the stored key */
export function getTimeRemaining(): string | null {
  const key = getStoredKey();
  if (!key) return null;
  if (!key.expiresAt) return "Never";

  const diff = new Date(key.expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";

  const days = Math.floor(diff / DAY_MS);
  if (days > 30) {
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? "s" : ""} left`;
  }
  if (days > 0) {
    return `${days} day${days > 1 ? "s" : ""} left`;
  }
  const hours = Math.floor((diff % DAY_MS) / 3_600_000);
  return `${hours} hour${hours > 1 ? "s" : ""} left`;
}

// ── Server Validation ────────────────────────────────

/**
 * Validate a signed key against the server.
 * On success, stores it in localStorage and returns the key info.
 */
export async function validateKey(keyCode: string): Promise<ValidateKeyResult> {
  try {
    const res = await fetch("/api/validate-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyCode: keyCode.trim() }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      return { success: false, error: data.error || "Invalid key" };
    }

    const storedKey: StoredKey = {
      keyCode: data.keyCode,
      tier: data.tier,
      expiresAt: data.expiresAt,
      validatedAt: new Date().toISOString(),
    };

    storeKey(storedKey);
    return { success: true, key: storedKey };
  } catch {
    return { success: false, error: "Could not validate key. Check your connection." };
  }
}
