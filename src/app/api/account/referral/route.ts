// GET/POST /api/account/referral — the "Referred by a friend?" section
// of account settings. Two independent, set-once facts:
//   1. A friend's affiliate code. Crediting runs through the EXISTING
//      signup attribution path (lib/affiliate/attribution) — the same
//      validation (real, active affiliate; aliases honoured), the same
//      self-referral rejection and the same one-attribution-ever rule
//      (unique referredUserId) as a /ref/[code] signup. Nothing here
//      forks that logic.
//   2. "How did you find out about us?" — stored on the user record
//      (discoverySource/discoveryDetail), also set-once.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { attributeUserToAffiliate, findAffiliateByCode, REF_CODE_RE } from "@/lib/affiliate/attribution";
import { grantInviteCameraBonus } from "@/lib/camera-bonus";
import { isDiscoverySourceKey } from "@/lib/discovery-sources";

export const runtime = "nodejs";

async function stateFor(userId: string) {
  const [attr, user] = await Promise.all([
    db.referralAttribution.findUnique({
      where: { referredUserId: userId },
      select: {
        createdAt: true,
        affiliate: {
          select: {
            referralCode: true,
            customCode: true,
            user: { select: { name: true } },
          },
        },
      },
    }),
    db.user.findUnique({
      where: { id: userId },
      select: { discoverySource: true, discoveryDetail: true },
    }),
  ]);
  return {
    attribution: attr
      ? {
          code: attr.affiliate.customCode ?? attr.affiliate.referralCode,
          affiliateName: attr.affiliate.user.name,
          creditedAt: attr.createdAt,
        }
      : null,
    discoverySource: user?.discoverySource ?? null,
    discoveryDetail: user?.discoveryDetail ?? null,
  };
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  return NextResponse.json(await stateFor(userId));
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  // ── Friend's affiliate code ──────────────────────────────────────
  if (typeof body.code === "string" && body.code.trim() !== "") {
    const code = body.code.trim().toLowerCase();
    const existing = await db.referralAttribution.findUnique({ where: { referredUserId: userId } });
    if (existing) {
      return NextResponse.json(
        { error: "You've already credited a friend's code — it can't be changed." },
        { status: 409 },
      );
    }
    if (!REF_CODE_RE.test(code)) {
      return NextResponse.json({ error: "That doesn't look like an affiliate code." }, { status: 400 });
    }
    const affiliate = await findAffiliateByCode(code);
    if (!affiliate) {
      return NextResponse.json({ error: "That code doesn't match an active WorldEye affiliate." }, { status: 400 });
    }
    if (affiliate.userId === userId) {
      return NextResponse.json({ error: "That's your own affiliate code — a friend has to invite you." }, { status: 400 });
    }
    const attr = await attributeUserToAffiliate(userId, code);
    if (!attr) {
      return NextResponse.json({ error: "That code couldn't be credited. Double-check it and try again." }, { status: 400 });
    }
    // Same invite bonus the signup sync grants when an attribution
    // lands (idempotent per invitee; best-effort like the sync route).
    try {
      await grantInviteCameraBonus(userId);
    } catch (e) {
      console.error("[account/referral] invite camera bonus failed:", e);
    }
    return NextResponse.json(await stateFor(userId));
  }

  // ── How did you find out about us? ───────────────────────────────
  if ("discoverySource" in body) {
    if (!isDiscoverySourceKey(body.discoverySource)) {
      return NextResponse.json({ error: "Pick one of the options." }, { status: 400 });
    }
    const detail =
      typeof body.discoveryDetail === "string" ? body.discoveryDetail.trim().slice(0, 200) || null : null;
    const user = await db.user.findUnique({ where: { id: userId }, select: { discoverySource: true } });
    if (user?.discoverySource) {
      return NextResponse.json(
        { error: "You've already told us how you found us — thanks!" },
        { status: 409 },
      );
    }
    await db.user.update({
      where: { id: userId },
      data: { discoverySource: body.discoverySource, discoveryDetail: detail },
    });
    return NextResponse.json(await stateFor(userId));
  }

  return NextResponse.json({ error: "Nothing to save." }, { status: 400 });
}
