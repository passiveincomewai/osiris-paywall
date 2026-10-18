/**
 * Competitor SEO report (admin) — FIRST-PARTY analytics only.
 *
 * Everything here is computed from real PageView rows written by our own
 * tracker. Google Search Console is NOT connected, so there is no search
 * impression / position / query data anywhere in this report, and nothing
 * is estimated or simulated to look like it. What first-party data can
 * honestly show: which competitor pages visitors LAND on, which channel
 * the landing view arrived through (referrer / UTM on that view),
 * whether those sessions reached the globe or opened a camera, and
 * same-session signup attribution (the main admin dashboard's method:
 * a user's earliest tracked session, then that session's landing page).
 *
 * A session's landing view = its earliest plain page view (event IS NULL)
 * inside the window. Sessions are counted distinctly everywhere.
 */
import { db } from "@/lib/db";

export type CompetitorSeoReport = {
  windowDays: number;
  capped: boolean;
  totalSessions: number;
  competitorSessions: number;
  searchReferredSessions: number;
  byPage: {
    path: string;
    label: string;
    sessions: number;
    searchSessions: number;
    globeSessions: number;
    cameraSessions: number;
    pricingSessions: number;
  }[];
  channels: { channel: string; sessions: number }[];
  funnel: {
    landingSessions: number;
    globeSessions: number;
    cameraSessions: number;
    pricingSessions: number;
    sitewideGlobeRate: number; // 0..1 across ALL sessions in window
  };
  signups: { path: string; count: number }[];
  opportunities: { path: string; label: string; sessions: number; globeRate: number }[];
};

/** The competitor-intent pages this campaign owns or optimizes. */
export const COMPETITOR_PAGES: { path: string; label: string }[] = [
  { path: "/gods-eye-view", label: "God's Eye View (experience)" },
  { path: "/alternatives/gods-eye-view", label: "God's Eye View alternatives" },
  { path: "/alternatives/osiris", label: "OSIRIS alternatives" },
  { path: "/alternatives/godsview-ai", label: "GodsView AI alternatives" },
  { path: "/alternatives/war-monitor", label: "War Monitor alternatives" },
  { path: "/alternatives/world-monitor", label: "World Monitor alternatives" },
  { path: "/alternatives/liveuamap", label: "LiveUAMap alternatives" },
  { path: "/compare/worldeye-vs-osiris", label: "WorldEye vs OSIRIS" },
  { path: "/compare/world-monitor", label: "WorldEye vs World Monitor" },
  { path: "/blog/gods-eye-view-vs-world-monitor-vs-worldeye", label: "Blog: GEV vs World Monitor vs WorldEye" },
  { path: "/blog/live-3d-globe-without-installing", label: "Blog: live globe, no install" },
  { path: "/blog/open-source-vs-hosted-intelligence-dashboards", label: "Blog: open-source vs hosted dashboards" },
];

const PAGE_LABEL = new Map(COMPETITOR_PAGES.map((p) => [p.path, p.label]));

function groupFor(path: string): { key: string; label: string } | null {
  const label = PAGE_LABEL.get(path);
  if (label) return { key: path, label };
  if (path.startsWith("/compare/")) return { key: "__compare_other", label: "Other /compare/* pages" };
  if (path.startsWith("/alternatives/")) return { key: "__alt_other", label: "Other /alternatives/* pages" };
  return null;
}

const PAID_MEDIUMS = new Set(["cpc", "ppc", "paid", "paid-social", "ad", "ads", "display", "social-paid"]);
const SEARCH_HOSTS = ["google.", "bing.", "duckduckgo.", "yahoo.", "ecosia.", "brave.", "startpage."];
const SOCIAL_HOSTS = ["instagram.", "facebook.", "twitter.", "x.com", "youtube.", "tiktok.", "linkedin.", "reddit.", "threads."];

function hostOf(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.toLowerCase();
  } catch {
    return referrer.toLowerCase();
  }
}

export function classifyChannel(referrer: string | null, utmSource: string | null, utmMedium: string | null): string {
  const medium = (utmMedium ?? "").toLowerCase();
  if (PAID_MEDIUMS.has(medium) || medium.includes("paid")) return "Paid";
  const host = hostOf(referrer);
  if (host) {
    if (SEARCH_HOSTS.some((h) => host.includes(h))) return "Search (organic)";
    if (SOCIAL_HOSTS.some((h) => host.includes(h))) return "Social";
    if (host.includes("worldeye.app")) return "Internal";
    return "Referral";
  }
  if (utmSource) return "Campaign (UTM, no referrer)";
  return "Direct / unknown";
}

type LandingRow = {
  sessionId: string;
  path: string;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
};

const SESSION_CAP = 50_000;

export async function getCompetitorSeoReport(windowDays: number): Promise<CompetitorSeoReport> {
  const since = new Date(Date.now() - windowDays * 86400_000);

  const [landings, globeRows, cameraRows, pricingRows, signupRows] = await Promise.all([
    db.$queryRaw<LandingRow[]>`
      SELECT DISTINCT ON (pv."sessionId") pv."sessionId", pv.path, pv.referrer, pv."utmSource", pv."utmMedium"
      FROM "PageView" pv
      WHERE pv.event IS NULL AND pv."createdAt" >= ${since}
      ORDER BY pv."sessionId", pv."createdAt" ASC
      LIMIT ${SESSION_CAP}`,
    db.$queryRaw<{ sessionId: string }[]>`
      SELECT DISTINCT "sessionId" FROM "PageView" WHERE event = 'globe_reached' AND "createdAt" >= ${since}`,
    db.$queryRaw<{ sessionId: string }[]>`
      SELECT DISTINCT "sessionId" FROM "PageView" WHERE event = 'camera_open' AND "createdAt" >= ${since}`,
    db.$queryRaw<{ sessionId: string }[]>`
      SELECT DISTINCT "sessionId" FROM "PageView" WHERE event IS NULL AND path = '/pricing' AND "createdAt" >= ${since}`,
    // Signup attribution: users created in the window -> their earliest
    // tracked session -> that session's landing (earliest plain) view.
    db.$queryRaw<{ path: string; c: bigint }[]>`
      SELECT s."landingPath" AS path, COUNT(DISTINCT u."userId") AS c
      FROM (
        SELECT DISTINCT ON (pv."userId") pv."userId", pv."sessionId"
        FROM "PageView" pv
        WHERE pv."userId" IN (SELECT id FROM "User" WHERE "createdAt" >= ${since})
        ORDER BY pv."userId", pv."createdAt" ASC
      ) u
      JOIN LATERAL (
        SELECT pv2.path AS "landingPath" FROM "PageView" pv2
        WHERE pv2."sessionId" = u."sessionId" AND pv2.event IS NULL
        ORDER BY pv2."createdAt" ASC LIMIT 1
      ) s ON true
      GROUP BY s."landingPath" ORDER BY c DESC`,
  ]);

  const globeSet = new Set(globeRows.map((r) => r.sessionId));
  const cameraSet = new Set(cameraRows.map((r) => r.sessionId));
  const pricingSet = new Set(pricingRows.map((r) => r.sessionId));

  const totalSessions = landings.length;
  const sitewideGlobe = landings.filter((l) => globeSet.has(l.sessionId)).length;
  const sitewideGlobeRate = totalSessions ? sitewideGlobe / totalSessions : 0;

  const pageMap = new Map<string, CompetitorSeoReport["byPage"][number]>();
  const channelMap = new Map<string, number>();
  let competitorSessions = 0;
  let searchReferredSessions = 0;
  const funnel = { landingSessions: 0, globeSessions: 0, cameraSessions: 0, pricingSessions: 0, sitewideGlobeRate };

  for (const l of landings) {
    const group = groupFor(l.path);
    if (!group) continue;
    competitorSessions++;
    const channel = classifyChannel(l.referrer, l.utmSource, l.utmMedium);
    channelMap.set(channel, (channelMap.get(channel) ?? 0) + 1);
    const isSearch = channel === "Search (organic)";
    if (isSearch) searchReferredSessions++;

    funnel.landingSessions++;
    if (globeSet.has(l.sessionId)) funnel.globeSessions++;
    if (cameraSet.has(l.sessionId)) funnel.cameraSessions++;
    if (pricingSet.has(l.sessionId)) funnel.pricingSessions++;

    const row = pageMap.get(group.key) ?? {
      path: group.key.startsWith("__") ? group.key : l.path,
      label: group.label,
      sessions: 0,
      searchSessions: 0,
      globeSessions: 0,
      cameraSessions: 0,
      pricingSessions: 0,
    };
    row.sessions++;
    if (isSearch) row.searchSessions++;
    if (globeSet.has(l.sessionId)) row.globeSessions++;
    if (cameraSet.has(l.sessionId)) row.cameraSessions++;
    if (pricingSet.has(l.sessionId)) row.pricingSessions++;
    pageMap.set(group.key, row);
  }

  const byPage = [...pageMap.values()].sort((a, b) => b.sessions - a.sessions);
  const channels = [...channelMap.entries()]
    .map(([channel, sessions]) => ({ channel, sessions }))
    .sort((a, b) => b.sessions - a.sessions);

  const signups = signupRows
    .map((r) => ({ path: r.path, count: Number(r.c) }))
    .filter((r) => groupFor(r.path) !== null)
    .map((r) => ({ path: r.path, count: r.count }));

  // First-party "opportunity" signal — NOT search data: competitor pages
  // drawing real landing sessions whose visitors rarely reach the globe
  // (intent/content mismatch worth a copy look), vs the sitewide rate.
  const opportunities = byPage
    .filter((p) => p.sessions >= 5)
    .map((p) => ({ path: p.path, label: p.label, sessions: p.sessions, globeRate: p.sessions ? p.globeSessions / p.sessions : 0 }))
    .filter((p) => p.globeRate < sitewideGlobeRate * 0.6)
    .sort((a, b) => b.sessions - a.sessions);

  return {
    windowDays,
    capped: totalSessions >= SESSION_CAP,
    totalSessions,
    competitorSessions,
    searchReferredSessions,
    byPage,
    channels,
    funnel,
    signups,
    opportunities,
  };
}
