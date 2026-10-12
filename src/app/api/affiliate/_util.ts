// Shared: resolve the caller's affiliate profile (401/404 as JSON).
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { resolveMembership } from "@/lib/studio/access";
import type { AffiliateProfile } from "@prisma/client";

type Ok = { profile: AffiliateProfile; userId: string; error?: undefined };
type Err = { profile?: undefined; userId?: undefined; error: NextResponse };

export async function requireAffiliate(): Promise<Ok | Err> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: NextResponse.json({ error: "Sign in required" }, { status: 401 }) };
  const profile = await db.affiliateProfile.findUnique({ where: { userId } });
  if (!profile) return { error: NextResponse.json({ error: "Not an affiliate", join: true }, { status: 404 }) };
  return { profile, userId };
}

export function activeOnly<T extends { status: string }>(profile: T) {
  if (profile.status !== "active") {
    return NextResponse.json({ error: `Affiliate account is ${profile.status}` }, { status: 403 });
  }
  return null;
}

/**
 * Studio gate: an active affiliate profile PLUS an active WorldEye
 * membership (see src/lib/studio/access.ts). Same Ok/Err shape as
 * requireAffiliate, so Studio routes can swap it in directly.
 */
export async function requireStudioAccess(): Promise<Ok | Err> {
  const result = await requireAffiliate();
  if (result.error) return result;
  const { profile, userId } = result;
  const blocked = activeOnly(profile);
  if (blocked) return { error: blocked };
  const member = await resolveMembership(userId);
  if (!member) {
    return { error: NextResponse.json({ error: "membership_required" }, { status: 403 }) };
  }
  return { profile, userId };
}
