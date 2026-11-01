// GET /api/affiliate/studio/repurpose/performance — per-creative
// performance for the caller's repurposed variations (spec §11 A/F).
//
// Data sources, all WorldEye-measured (labelled in the response):
// - clicks: ReferralClick rows whose utm_content equals the creativeId
//   (captured by /ref since the utm_content migration; earlier clicks
//   were never tagged and are NOT back-filled or guessed).
// - signups / started-plan / paying: ReferralAttribution rows joined
//   through the exact click (clickId), with Subscription state for
//   "started a plan" and convertedAt for "paying".
// - commission: level-1 Commission rows for the referred users a
//   creative converted (the creative drove the direct signup).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { coachInsights, type CreativeStats } from "@/lib/studio/coach";
import { requireStudioAccess } from "../../../_util";

export const runtime = "nodejs";

export async function GET() {
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });

  const variations = await db.studioVariation.findMany({
    where: { project: { profileId: profile.id } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { project: { select: { title: true, campaignTag: true } } },
  });
  if (variations.length === 0) {
    return NextResponse.json({ creatives: [], coach: coachInsights([]), dataNote: null });
  }
  const creativeIds = variations.map((v) => v.creativeId);

  // Clicks per creative.
  const clickRows = await db.referralClick.findMany({
    where: { affiliateProfileId: profile.id, utmContent: { in: creativeIds } },
    select: { id: true, utmContent: true },
    take: 20000,
    orderBy: { createdAt: "desc" },
  });
  const clicksByCreative = new Map<string, string[]>();
  for (const c of clickRows) {
    if (!c.utmContent) continue;
    const arr = clicksByCreative.get(c.utmContent) ?? [];
    arr.push(c.id);
    clicksByCreative.set(c.utmContent, arr);
  }
  const allClickIds = clickRows.map((c) => c.id);

  // Attributions through those exact clicks.
  const attributions = allClickIds.length
    ? await db.referralAttribution.findMany({
        where: { affiliateProfileId: profile.id, clickId: { in: allClickIds } },
        select: { clickId: true, referredUserId: true, convertedAt: true },
      })
    : [];
  const clickToCreative = new Map(clickRows.map((c) => [c.id, c.utmContent as string]));
  const signupsByCreative = new Map<string, Set<string>>();
  const paidByCreative = new Map<string, Set<string>>();
  for (const a of attributions) {
    const cid = a.clickId ? clickToCreative.get(a.clickId) : undefined;
    if (!cid) continue;
    (signupsByCreative.get(cid) ?? signupsByCreative.set(cid, new Set()).get(cid)!).add(a.referredUserId);
    if (a.convertedAt) {
      (paidByCreative.get(cid) ?? paidByCreative.set(cid, new Set()).get(cid)!).add(a.referredUserId);
    }
  }

  // "Started a plan": attributed users holding any Subscription row.
  const attributedUsers = [...new Set(attributions.map((a) => a.referredUserId))];
  const subs = attributedUsers.length
    ? await db.subscription.findMany({
        where: { userId: { in: attributedUsers } },
        select: { userId: true },
      })
    : [];
  const usersWithSub = new Set(subs.map((s) => s.userId));
  const startedByCreative = new Map<string, Set<string>>();
  for (const a of attributions) {
    const cid = a.clickId ? clickToCreative.get(a.clickId) : undefined;
    if (!cid || !usersWithSub.has(a.referredUserId)) continue;
    (startedByCreative.get(cid) ?? startedByCreative.set(cid, new Set()).get(cid)!).add(a.referredUserId);
  }

  // Level-1 commission earned from each creative's converted users.
  const paidUsers = [...new Set([...paidByCreative.values()].flatMap((s) => [...s]))];
  const commissions = paidUsers.length
    ? await db.commission.findMany({
        where: {
          affiliateProfileId: profile.id,
          level: 1,
          referredUserId: { in: paidUsers },
          status: { not: "reversed" },
        },
        select: { referredUserId: true, amountCents: true },
      })
    : [];
  const userToCreative = new Map<string, string>();
  for (const [cid, set] of paidByCreative) for (const u of set) userToCreative.set(u, cid);
  const commissionByCreative = new Map<string, number>();
  for (const c of commissions) {
    const cid = c.referredUserId ? userToCreative.get(c.referredUserId) : undefined;
    if (!cid) continue;
    commissionByCreative.set(cid, (commissionByCreative.get(cid) ?? 0) + c.amountCents);
  }

  const creatives = variations.map((v) => {
    const clicks = clicksByCreative.get(v.creativeId)?.length ?? 0;
    const signups = signupsByCreative.get(v.creativeId)?.size ?? 0;
    const startedPlan = startedByCreative.get(v.creativeId)?.size ?? 0;
    const paid = paidByCreative.get(v.creativeId)?.size ?? 0;
    return {
      creativeId: v.creativeId,
      variationId: v.id,
      projectId: v.projectId,
      projectTitle: v.project.title,
      campaignTag: v.project.campaignTag,
      title: v.title,
      direction: v.direction,
      aspect: v.aspect,
      status: v.status,
      postedPlatform: v.postedPlatform,
      postedUrl: v.postedUrl,
      clicks,
      signups,
      startedPlan,
      paid,
      clickToPaidPct: clicks > 0 ? Math.round((paid / clicks) * 1000) / 10 : null,
      commissionCents: commissionByCreative.get(v.creativeId) ?? 0,
    };
  });

  const stats: CreativeStats[] = creatives.map((c) => ({
    creativeId: c.creativeId,
    title: c.title,
    direction: c.direction,
    aspect: c.aspect,
    clicks: c.clicks,
    signups: c.signups,
    paid: c.paid,
    commissionCents: c.commissionCents,
  }));

  return NextResponse.json({
    creatives,
    coach: coachInsights(stats),
    dataNote:
      "Measured by WorldEye: clicks carry the creative's utm_content tag (captured since the per-creative tracking update — earlier untagged clicks aren't guessed). Signups and paying subscribers join through the exact recorded click. Manual platform metrics (views/likes) aren't collected and are never invented here.",
  });
}
