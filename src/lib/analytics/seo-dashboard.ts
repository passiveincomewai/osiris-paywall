/**
 * Unified SEO dashboard data layer (SEO Programme Phase 7 + 8).
 *
 * One server module behind /admin/seo, three views over real stores:
 *  - Rankings & Opportunities: the Phase 1 GSC import, shipped as a
 *    dated JSON snapshot (src/data/seo/gsc-summary.json) because the
 *    Search Analytics API is not connected — the window and source
 *    are labelled wherever the numbers render.
 *  - AI Visibility: first-party PageView referrer analytics (the
 *    continuous series) + the dated manual probe runs
 *    (src/data/seo/ai-probe.json). Impressions / citations / referral
 *    sessions / attributed customers are four separate numbers and
 *    are never blended. GSC Generative-AI and Bing AI Performance
 *    are NOT connected — the page says so instead of showing zeros.
 *  - Search Demand: the Phase 8 aggregation over `search_performed`
 *    PageView events (./search-demand.ts) joined to the committed
 *    catalogue for demand-vs-inventory.
 *
 * Every figure traces to the GSC import, the production DB, the
 * catalogue, or a dated probe run — nothing here is modelled.
 */
import { db } from "@/lib/db";
import gscSummary from "@/data/seo/gsc-summary.json";
import aiProbe from "@/data/seo/ai-probe.json";
import cameraCountries from "@/data/camera-countries.json";
import cityPages from "@/data/city-pages.json";
import {
  aggregateSearchDemand,
  demandVsInventory,
  type PlaceInventory,
  type SearchDemandReport,
} from "./search-demand";

export const GSC = gscSummary;
export const AI_PROBE = aiProbe;

/* ── AI visibility ─────────────────────────────────────────────── */

const AI_REFERRERS: { host: string; engine: string }[] = [
  { host: "chatgpt.com", engine: "ChatGPT" },
  { host: "chat.openai.com", engine: "ChatGPT" },
  { host: "perplexity.ai", engine: "Perplexity" },
  { host: "claude.ai", engine: "Claude" },
  { host: "copilot.microsoft.com", engine: "Copilot" },
  { host: "gemini.google.com", engine: "Gemini" },
  { host: "you.com", engine: "You.com" },
  { host: "poe.com", engine: "Poe" },
];

export function aiEngineForReferrer(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  const r = referrer.toLowerCase();
  for (const { host, engine } of AI_REFERRERS) if (r.includes(host)) return engine;
  return null;
}

export interface AiEngineStat {
  engine: string;
  sessions: number;
  pageviews: number;
  topLandings: { path: string; sessions: number }[];
}

export interface AiVisibilityReport {
  days: number;
  engines: AiEngineStat[];
  totalSessions: number;
  totalPageviews: number;
  /** Accounts whose FIRST-EVER PageView arrived from an AI referrer. */
  attributedAccounts: number;
  attributedTrials: number;
  attributedPaid: number;
}

const ROW_CAP = 60_000;

export async function getAiVisibility(days: number): Promise<AiVisibilityReport> {
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await db.pageView.findMany({
    where: { createdAt: { gte: since }, referrer: { not: null } },
    select: { sessionId: true, userId: true, referrer: true, path: true, createdAt: true },
    orderBy: { createdAt: "asc" },
    take: ROW_CAP,
  });

  const byEngine = new Map<string, { sessions: Set<string>; pageviews: number; landingBySession: Map<string, string> }>();
  const aiUserIds = new Set<string>();
  for (const row of rows) {
    const engine = aiEngineForReferrer(row.referrer);
    if (!engine) continue;
    const e = byEngine.get(engine) ?? { sessions: new Set<string>(), pageviews: 0, landingBySession: new Map() };
    e.sessions.add(row.sessionId);
    e.pageviews += 1;
    if (!e.landingBySession.has(row.sessionId)) e.landingBySession.set(row.sessionId, row.path);
    byEngine.set(engine, e);
    if (row.userId) aiUserIds.add(row.userId);
  }

  // First-touch attribution: an account counts when its earliest
  // PageView of all time arrived from an AI referrer.
  let attributedAccounts = 0;
  const attributedUserIds: string[] = [];
  for (const userId of aiUserIds) {
    const first = await db.pageView.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { referrer: true },
    });
    if (first && aiEngineForReferrer(first.referrer)) {
      attributedAccounts += 1;
      attributedUserIds.push(userId);
    }
  }
  let attributedTrials = 0;
  let attributedPaid = 0;
  if (attributedUserIds.length > 0) {
    const subs = await db.subscription.findMany({
      where: { userId: { in: attributedUserIds } },
      select: { status: true },
    });
    for (const s of subs) {
      if (s.status === "trialing") attributedTrials += 1;
      else if (s.status === "active") attributedPaid += 1;
    }
  }

  const engines: AiEngineStat[] = [...byEngine.entries()]
    .map(([engine, e]) => {
      const landings = new Map<string, number>();
      for (const path of e.landingBySession.values()) landings.set(path, (landings.get(path) ?? 0) + 1);
      return {
        engine,
        sessions: e.sessions.size,
        pageviews: e.pageviews,
        topLandings: [...landings.entries()]
          .map(([path, sessions]) => ({ path, sessions }))
          .sort((a, b) => b.sessions - a.sessions)
          .slice(0, 5),
      };
    })
    .sort((a, b) => b.sessions - a.sessions);

  return {
    days,
    engines,
    totalSessions: engines.reduce((n, e) => n + e.sessions, 0),
    totalPageviews: engines.reduce((n, e) => n + e.pageviews, 0),
    attributedAccounts,
    attributedTrials,
    attributedPaid,
  };
}

/* ── Search demand ─────────────────────────────────────────────── */

export interface SearchDemandSection {
  days: number;
  report: SearchDemandReport;
  vsInventory: ReturnType<typeof demandVsInventory>;
  capped: boolean;
}

const SEARCH_ROW_CAP = 20_000;

function cataloguePlaces(): PlaceInventory[] {
  const places: PlaceInventory[] = [];
  for (const c of cameraCountries.countries) places.push({ name: c.name, cameras: c.count });
  for (const c of cityPages.cities) places.push({ name: c.name, cameras: c.count });
  return places;
}

export async function getSearchDemand(days: number): Promise<SearchDemandSection> {
  const since = new Date(Date.now() - days * 86_400_000);
  const searchRows = await db.pageView.findMany({
    where: { event: { startsWith: "search_performed" }, createdAt: { gte: since } },
    select: { event: true, sessionId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
    take: SEARCH_ROW_CAP,
  });
  const sessionIds = [...new Set(searchRows.map((r) => r.sessionId))];
  const openRows =
    sessionIds.length > 0
      ? await db.pageView.findMany({
          where: { event: "camera_open", sessionId: { in: sessionIds }, createdAt: { gte: since } },
          select: { event: true, sessionId: true, createdAt: true },
          take: SEARCH_ROW_CAP,
        })
      : [];
  const report = aggregateSearchDemand(
    searchRows.map((r) => ({ event: r.event ?? "", sessionId: r.sessionId, createdAt: r.createdAt })),
    openRows.map((r) => ({ event: r.event ?? "", sessionId: r.sessionId, createdAt: r.createdAt })),
  );
  return {
    days,
    report,
    vsInventory: demandVsInventory(report, cataloguePlaces()),
    capped: searchRows.length >= SEARCH_ROW_CAP,
  };
}
