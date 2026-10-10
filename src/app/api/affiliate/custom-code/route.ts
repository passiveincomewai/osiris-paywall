// POST /api/affiliate/custom-code — claim a custom referral code (first-come).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { REF_CODE_RE } from "@/lib/affiliate/attribution";
import { audit } from "@/lib/affiliate/admin";
import { requireAffiliate, activeOnly } from "../_util";

export const runtime = "nodejs";
const RESERVED = new Set(["api", "ref", "admin", "affiliates", "pricing", "dashboard", "support", "help", "login", "join", "terms", "privacy", "worldeye", "official"]);

export async function POST(req: Request) {
  const { profile, error, userId } = await requireAffiliate();
  if (error) return error;
  const blocked = activeOnly(profile);
  if (blocked) return blocked;

  const { code } = (await req.json().catch(() => ({}))) as { code?: string };
  const norm = (code ?? "").toLowerCase().trim();
  if (!REF_CODE_RE.test(norm) || RESERVED.has(norm)) {
    return NextResponse.json({ error: "Code unavailable (3-32 chars: letters, numbers, _ -)" }, { status: 400 });
  }
  const taken = await db.affiliateProfile.findFirst({
    where: { OR: [{ referralCode: norm }, { customCode: norm }], NOT: { id: profile.id } },
    select: { id: true },
  });
  if (taken) return NextResponse.json({ error: "Code already taken" }, { status: 409 });

  const updated = await db.affiliateProfile.update({
    where: { id: profile.id }, data: { customCode: norm }, select: { customCode: true },
  });
  await audit("affiliate.custom_code", { actorUserId: userId, targetType: "AffiliateProfile", targetId: profile.id, details: { code: norm } });
  return NextResponse.json({ customCode: updated.customCode });
}
