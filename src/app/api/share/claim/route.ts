// POST /api/share/claim — attach this device's anonymous share
// identity to the signed-in account. First-claim-wins, one-time,
// server-enforced (see lib/share/identity.ts). Called by the
// post-sign-in sync and by the "connect this link" action in the
// share-link block.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { claimShareIdentity, isValidDeviceToken } from "@/lib/share/identity";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const deviceToken = body?.deviceToken;
  if (!isValidDeviceToken(deviceToken)) {
    return NextResponse.json({ error: "Invalid device token" }, { status: 400 });
  }

  const result = await claimShareIdentity(userId, deviceToken);
  switch (result.status) {
    case "no-identity":
      return NextResponse.json({ status: result.status }, { status: 404 });
    case "claimed-by-other":
      // Never say whose — just that this device's link is taken.
      return NextResponse.json({ status: result.status }, { status: 409 });
    default:
      return NextResponse.json({
        status: result.status,
        code: result.code,
        profileCode: result.profileCode,
        profileCreated: result.profileCreated,
        flushed: result.flushed,
      });
  }
}
