// POST /api/share/identity — get-or-mint the anonymous share
// identity for this device. The device token lives in the browser's
// localStorage and is only ever stored server-side as a hash.
// Idempotent per token; minting is rate limited per IP (in the lib).
import { NextRequest, NextResponse } from "next/server";
import { hashIp } from "@/lib/affiliate/attribution";
import { isValidDeviceToken, mintShareIdentity } from "@/lib/share/identity";

export const runtime = "nodejs";

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const deviceToken = body?.deviceToken;
  if (!isValidDeviceToken(deviceToken)) {
    return NextResponse.json({ error: "Invalid device token" }, { status: 400 });
  }
  const result = await mintShareIdentity(deviceToken, hashIp(clientIp(req)));
  if (!result.ok) {
    return NextResponse.json(
      { error: "Too many share links created from this network — try again later." },
      { status: 429 },
    );
  }
  return NextResponse.json({
    code: result.identity.code,
    claimed: !!result.identity.claimedByUserId,
    created: result.created,
  });
}
