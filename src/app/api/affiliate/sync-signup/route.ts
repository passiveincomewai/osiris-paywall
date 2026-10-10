// POST /api/affiliate/sync-signup — link a signed-in user to their referrer.
// Called client-side once after sign-in; the server reads the httpOnly
// referral cookie and creates the attribution row (idempotent).
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { attributeUserToAffiliate } from "@/lib/affiliate/attribution";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const attr = await attributeUserToAffiliate(userId);
  return NextResponse.json({ attributed: !!attr, affiliateProfileId: attr?.affiliateProfileId ?? null });
}
