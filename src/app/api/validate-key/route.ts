/**
 * POST /api/validate-key
 *
 * Validates an HMAC-signed access key.
 * No database needed — the key itself contains all info and the signature proves authenticity.
 *
 * Body: { keyCode: string }
 * Response: { success, keyCode, tier, expiresAt } or { success: false, error }
 */

import { NextResponse } from "next/server";
import { decodeKey } from "@/lib/token";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { keyCode } = body;

    if (!keyCode || typeof keyCode !== "string") {
      return NextResponse.json(
        { success: false, error: "Key code is required" },
        { status: 400 }
      );
    }

    const normalizedKey = keyCode.trim();

    // Check that TOKEN_SECRET is configured
    const tokenSecret = process.env.TOKEN_SECRET;
    if (!tokenSecret) {
      return NextResponse.json(
        { success: false, error: "Server configuration error: TOKEN_SECRET not set" },
        { status: 500 }
      );
    }

    // Decode and verify the signed token
    const decoded = decodeKey(normalizedKey, tokenSecret);

    if (!decoded) {
      return NextResponse.json(
        { success: false, error: "Invalid key. The signature could not be verified." },
        { status: 400 }
      );
    }

    if (decoded.expired) {
      return NextResponse.json(
        {
          success: false,
          error: `This key expired on ${decoded.expiresAt!.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.`,
        },
        { status: 410 }
      );
    }

    return NextResponse.json({
      success: true,
      keyCode: normalizedKey,
      tier: decoded.tier,
      expiresAt: decoded.expiresAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("Key validation error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
