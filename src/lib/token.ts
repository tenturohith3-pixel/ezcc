/**
 * Signed Token System for Key-Based Access
 *
 * Keys are HMAC-signed tokens — no database needed.
 * The token itself contains tier + expiry + creation time.
 * Validation = verify HMAC signature + check expiry.
 *
 * Token format: CG-{base64url(signed_payload)}
 *
 * Signed payload = 12 bytes data + 16 bytes HMAC = 28 bytes
 * Base64url encoded ≈ 38 chars, so full key ≈ 41 chars
 */

import { createHmac, randomBytes } from "crypto";

// ── Types ────────────────────────────────────────────

export type KeyTier = "basic" | "pro" | "studio" | "lifetime";

export interface TokenPayload {
  t: string;      // tier: "basic" | "pro" | "studio" | "lifetime"
  e: number;      // expiry: unix timestamp in seconds (0 = never)
  i: number;      // issued at: unix timestamp in seconds
  j: string;      // random ID: 6 hex chars
}

export interface DecodedToken {
  payload: TokenPayload;
  tier: KeyTier;
  expiresAt: Date | null;  // null for lifetime
  issuedAt: Date;
  id: string;
  expired: boolean;
}

// ── Constants ────────────────────────────────────────

const TIER_DAYS: Record<string, number | null> = {
  basic: 7,
  pro: 30,
  studio: 365,
  lifetime: null,
};

const DATA_BYTES = 12;
const SIG_BYTES = 16;
const TOTAL_BYTES = DATA_BYTES + SIG_BYTES;

// Base64url character set (no +, /, or =)
const B64URL_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

// ── Encoding Helpers ─────────────────────────────────

function toBase64url(buf: Buffer): string {
  let result = "";
  for (let i = 0; i < buf.length; i++) {
    result += B64URL_CHARS[buf[i] >> 2];
    if (i < buf.length - 1) {
      result += B64URL_CHARS[((buf[i] & 3) << 4) | (buf[i + 1] >> 4)];
      i++;
      result += B64URL_CHARS[((buf[i] & 15) << 2) | (buf[i + 1] >> 6)];
      i++;
      result += B64URL_CHARS[buf[i] & 63];
    } else {
      result += B64URL_CHARS[(buf[i] & 3) << 4];
    }
  }
  return result;
}

function fromBase64url(str: string): Buffer {
  const cleaned = str.replace(/=/g, "");
  const len = cleaned.length;
  const buf = Buffer.alloc(Math.floor((len * 6) / 8));
  let bits = 0;
  let value = 0;
  let pos = 0;

  for (let i = 0; i < len; i++) {
    const idx = B64URL_CHARS.indexOf(cleaned[i]);
    if (idx === -1) throw new Error("Invalid base64url character");
    value = (value << 6) | idx;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      buf[pos++] = (value >> bits) & 255;
    }
  }
  return buf;
}

// ── Payload Encoding (pack into 12 bytes) ───────────

function encodePayload(payload: TokenPayload): Buffer {
  const buf = Buffer.alloc(DATA_BYTES);

  // Byte 0: tier (0-3)
  const tierNum = { basic: 0, pro: 1, studio: 2, lifetime: 3 }[payload.t] ?? 0;
  buf[0] = tierNum;

  // Bytes 1-4: expiry (uint32 BE)
  buf.writeUInt32BE(payload.e >>> 0, 1);

  // Bytes 5-8: issued at (uint32 BE)
  buf.writeUInt32BE(payload.i >>> 0, 5);

  // Bytes 9-11: random ID from hex
  const randHex = payload.j;
  buf[9] = parseInt(randHex.slice(0, 2), 16);
  buf[10] = parseInt(randHex.slice(2, 4), 16);
  buf[11] = parseInt(randHex.slice(4, 6), 16);

  return buf;
}

function decodePayload(buf: Buffer): TokenPayload {
  const tierNum = buf[0];
  const tierNames: KeyTier[] = ["basic", "pro", "studio", "lifetime"];
  const tier = tierNames[tierNum] ?? "basic";

  const expiry = buf.readUInt32BE(1);
  const issued = buf.readUInt32BE(5);

  const randHex =
    buf[9].toString(16).padStart(2, "0") +
    buf[10].toString(16).padStart(2, "0") +
    buf[11].toString(16).padStart(2, "0");

  return { t: tier, e: expiry, i: issued, j: randHex };
}

// ── Signing / Verification ──────────────────────────

function sign(data: Buffer, secret: string): Buffer {
  return createHmac("sha256", secret).update(data).digest().slice(0, SIG_BYTES);
}

function verify(data: Buffer, sig: Buffer, secret: string): boolean {
  const expected = sign(data, secret);
  // Constant-time comparison
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected[i] ^ sig[i];
  }
  return diff === 0;
}

// ── Public API ──────────────────────────────────────

/**
 * Generate a signed access key.
 * Returns the key string (what users see and paste).
 */
export function generateKey(tier: KeyTier, secret: string): string {
  const now = Math.floor(Date.now() / 1000);
  const days = TIER_DAYS[tier];
  const expiry = days !== null ? now + days * 86400 : 0;

  const payload: TokenPayload = {
    t: tier,
    e: expiry,
    i: now,
    j: randomBytes(3).toString("hex"),
  };

  const data = encodePayload(payload);
  const sig = sign(data, secret);

  // Combine data + sig, then base64url encode
  const full = Buffer.concat([data, sig]);
  return "CG-" + toBase64url(full);
}

/**
 * Decode and verify a key. Returns the decoded token info or null if invalid.
 */
export function decodeKey(key: string, secret: string): DecodedToken | null {
  try {
    // Strip the "CG-" prefix (preserve case — base64url is case-sensitive)
    const encoded = key.trim().replace(/^CG-/i, "");
    if (encoded.length < 10) return null;

    const buf = fromBase64url(encoded);
    if (buf.length !== TOTAL_BYTES) return null;

    const data = buf.slice(0, DATA_BYTES);
    const sig = buf.slice(DATA_BYTES, TOTAL_BYTES);

    // Verify HMAC signature
    if (!verify(data, sig, secret)) return null;

    // Decode payload
    const payload = decodePayload(data);
    const expiresAt = payload.e > 0 ? new Date(payload.e * 1000) : null;
    const issuedAt = new Date(payload.i * 1000);
    const expired = expiresAt !== null && expiresAt < new Date();

    return {
      payload,
      tier: payload.t as KeyTier,
      expiresAt,
      issuedAt,
      id: payload.j,
      expired,
    };
  } catch {
    return null;
  }
}

/**
 * Get tier duration info for display.
 */
export function getTierDuration(tier: KeyTier): string {
  const days = TIER_DAYS[tier];
  if (days === null) return "Never expires";
  if (days === 1) return "1 day";
  if (days < 30) return `${days} days`;
  if (days < 365) return `${Math.floor(days / 30)} months`;
  return `${Math.floor(days / 365)} year`;
}
