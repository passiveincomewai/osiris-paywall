import { NextRequest, NextResponse } from "next/server";
import { isVipTier, vipAccess } from "@/lib/vip/tier";
import { buildBrief, setBriefEmail } from "@/lib/vip/brief";

export const runtime = "nodejs";

/**
 * The personal brief is VIP-only end to end — unlike rules/places,
 * there is no lapsed-owner read mode: the brief is computed live from
 * paid-tier data (the member's alerts + places), so a non-VIP gets
 * the upgrade answer, not a stale brief.
 */
export async function GET() {
  const a = await vipAccess();
  if (!a.ok) return NextResponse.json({ error: "signin" }, { status: 401 });
  if (!isVipTier(a.tier)) {
    return NextResponse.json(
      { error: "vip", message: "The personal brief is a VIP Pro feature." },
      { status: 403 },
    );
  }
  const brief = await buildBrief(a.userId);
  return NextResponse.json({ tier: a.tier, vip: true, brief });
}

/** Toggle the daily email digest. */
export async function PUT(req: NextRequest) {
  const a = await vipAccess();
  if (!a.ok) return NextResponse.json({ error: "signin" }, { status: 401 });
  if (!isVipTier(a.tier)) {
    return NextResponse.json(
      { error: "vip", message: "The personal brief is a VIP Pro feature." },
      { status: 403 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const enabled = (body as Record<string, unknown>).emailEnabled === true;
  await setBriefEmail(a.userId, enabled);
  return NextResponse.json({ ok: true, emailEnabled: enabled });
}
