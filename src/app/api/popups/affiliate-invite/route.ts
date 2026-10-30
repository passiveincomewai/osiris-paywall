import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { affiliateInviteEligible } from "@/lib/popups/affiliate-invite";

export const runtime = "nodejs";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
/** Cap on rows scanned for the distinct-days count (see below). */
const DAY_SCAN_CAP = 3000;

/**
 * affiliate_invite popup (#13) eligibility, server-computed: the
 * caller has NO AffiliateProfile (not already in the programme) and
 * their own PageView record clears the engagement bar in
 * lib/popups/affiliate-invite (≥30 camera opens and ≥5 distinct
 * active days in the last 30 days). Distinct days are counted from
 * up to DAY_SCAN_CAP most recent views — a heavier record can only
 * undercount days, never overcount, so the bar stays honest.
 * Anything uncertain answers eligible:false. The client keys its
 * once-per-user + permanent-dismissal records on userKey.
 */
export async function GET() {
  const none = { eligible: false as const };
  try {
    const session = await auth().catch(() => null);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) return NextResponse.json(none);
    const profile = await db.affiliateProfile
      .findUnique({ where: { userId }, select: { id: true } })
      .catch(() => undefined);
    if (profile === undefined) return NextResponse.json(none);
    const since = new Date(Date.now() - THIRTY_DAYS_MS);
    const [cameraOpens, recent] = await Promise.all([
      db.pageView.count({
        where: {
          userId,
          createdAt: { gte: since },
          OR: [{ event: "camera_open" }, { event: { startsWith: "camera_open:" } }],
        },
      }),
      db.pageView.findMany({
        where: { userId, createdAt: { gte: since } },
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
        take: DAY_SCAN_CAP,
      }),
    ]);
    const days = new Set(
      recent.map((r) => r.createdAt.toISOString().slice(0, 10)),
    );
    const eligible = affiliateInviteEligible({
      hasAffiliateProfile: profile !== null,
      cameraOpens30d: cameraOpens,
      activeDays30d: days.size,
    });
    return NextResponse.json(
      eligible ? { eligible: true as const, userKey: userId } : none,
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(none);
  }
}
