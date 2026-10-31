import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { publicApiEnabled } from "@/lib/developer/flag";
import {
  createPublicKey,
  listPublicKeys,
  MAX_PUBLIC_KEYS_PER_USER,
} from "@/lib/developer/keys";
import { API_TIER_LIMITS, apiTierForUser } from "@/lib/developer/limits";

export const runtime = "nodejs";

/**
 * Account-settings API keys for the PUBLIC developer API. Session-gated
 * (any signed-in user — the free tier is self-serve), scoped to
 * scope "public" rows, and dark with the platform: 404 while
 * PUBLIC_API_ENABLED is off.
 */

async function sessionUserId(): Promise<string | null> {
  const session = await auth().catch(() => null);
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}

export async function GET() {
  if (!publicApiEnabled()) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const userId = await sessionUserId();
  if (!userId) return NextResponse.json({ error: "signin" }, { status: 401 });
  const keys = await listPublicKeys(userId);
  const limits = API_TIER_LIMITS[await apiTierForUser(userId)];
  return NextResponse.json({
    keys,
    maxKeys: MAX_PUBLIC_KEYS_PER_USER,
    plan: {
      tier: limits.tier,
      label: limits.planLabel,
      dailyRequests: limits.dailyRequests,
      requestsPerMinute: limits.requestsPerMinute,
    },
  });
}

/** Create a public API key. The plaintext is returned ONCE, here. */
export async function POST(req: NextRequest) {
  if (!publicApiEnabled()) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const userId = await sessionUserId();
  if (!userId) return NextResponse.json({ error: "signin" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim().slice(0, 60)
      : "API key";
  const result = await createPublicKey(userId, name);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ key: result.key, apiKey: result.apiKey }, { status: 201 });
}
