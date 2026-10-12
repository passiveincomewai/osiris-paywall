// GET /api/growth/analytics?days=30
// Hybrid integration for the (separate) WorldEye Organic Growth Engine.
// Returns AGGREGATES ONLY — daily traffic, traffic by UTM campaign/referrer,
// signups and subscription starts per day. No per-user rows, no emails,
// no individual visitor data ever leave through this endpoint.
// Auth: Authorization: Bearer <GROWTH_WEBHOOK_SECRET>. 404 when the secret
// is not configured, so the endpoint effectively does not exist until the
// owner wires the integration up in Vercel.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyGrowthBearer } from "@/lib/growth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  if (!process.env.GROWTH_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "not configured" }, { status: 404 });
  }
  if (!verifyGrowthBearer(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const daysParam = Number(req.nextUrl.searchParams.get("days") ?? 30);
  const days = Number.isFinite(daysParam) ? Math.min(90, Math.max(1, Math.floor(daysParam))) : 30;
  const since = new Date(Date.now() - days * 86400_000);

  const [views, users, subs] = await Promise.all([
    db.pageView.findMany({
      where: { createdAt: { gte: since }, event: null },
      select: { createdAt: true, sessionId: true, path: true, referrer: true, utmCampaign: true, utmSource: true },
    }),
    db.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    db.subscription.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true, status: true } }),
  ]);

  const daily = new Map<string, { pageViews: number; sessions: Set<string>; signups: number; subscriptionsStarted: number }>();
  const bump = (key: string) => {
    let row = daily.get(key);
    if (!row) {
      row = { pageViews: 0, sessions: new Set<string>(), signups: 0, subscriptionsStarted: 0 };
      daily.set(key, row);
    }
    return row;
  };
  for (const v of views) bump(dayKey(v.createdAt)).pageViews++;
  for (const v of views) bump(dayKey(v.createdAt)).sessions.add(v.sessionId);
  for (const u of users) bump(dayKey(u.createdAt)).signups++;
  for (const s of subs) bump(dayKey(s.createdAt)).subscriptionsStarted++;

  const byCampaign = new Map<string, { pageViews: number; sessions: Set<string> }>();
  const byReferrer = new Map<string, { pageViews: number; sessions: Set<string> }>();
  const byPath = new Map<string, number>();
  for (const v of views) {
    const campaign = v.utmCampaign ?? "(none)";
    let c = byCampaign.get(campaign);
    if (!c) { c = { pageViews: 0, sessions: new Set<string>() }; byCampaign.set(campaign, c); }
    c.pageViews++; c.sessions.add(v.sessionId);

    let referrerHost = "(direct)";
    if (v.referrer) {
      try { referrerHost = new URL(v.referrer).hostname; } catch { referrerHost = "(other)"; }
    }
    let r = byReferrer.get(referrerHost);
    if (!r) { r = { pageViews: 0, sessions: new Set<string>() }; byReferrer.set(referrerHost, r); }
    r.pageViews++; r.sessions.add(v.sessionId);

    byPath.set(v.path, (byPath.get(v.path) ?? 0) + 1);
  }

  const serialize = (m: Map<string, { pageViews: number; sessions: Set<string> }>) =>
    [...m.entries()]
      .map(([key, v]) => ({ key, pageViews: v.pageViews, sessions: v.sessions.size }))
      .sort((a, b) => b.pageViews - a.pageViews)
      .slice(0, 50);

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    days,
    totals: {
      pageViews: views.length,
      sessions: new Set(views.map((v) => v.sessionId)).size,
      signups: users.length,
      subscriptionsStarted: subs.length,
    },
    daily: [...daily.entries()]
      .map(([date, v]) => ({
        date,
        pageViews: v.pageViews,
        sessions: v.sessions.size,
        signups: v.signups,
        subscriptionsStarted: v.subscriptionsStarted,
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    byCampaign: serialize(byCampaign),
    byReferrer: serialize(byReferrer),
    topPaths: [...byPath.entries()]
      .map(([path, pageViews]) => ({ path, pageViews }))
      .sort((a, b) => b.pageViews - a.pageViews)
      .slice(0, 25),
  });
}
