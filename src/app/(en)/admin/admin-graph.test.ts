/* Regression tests for the admin visits graphs (per-visit strip + traffic
   trend). Renders the real AdminDashboardPage with @/lib/db mocked over
   synthetic PageView rows.

   The bug this guards: both graph SVGs combined a fluid width (w-full) with a
   FIXED pixel height style. On any viewport narrower than the viewBox, the
   browser letterboxes the drawing (preserveAspectRatio="meet") into a thin
   centered band inside a tall empty box — on a phone the visits graph
   effectively didn't display even though the data and markup were correct.
   The fix renders both SVGs with h-auto so height follows the viewBox aspect
   ratio at any width.

   Also guards the traffic trend's measurement truth: views are rows with
   event IS NULL only (interaction events are never views), buckets are
   America/Denver days/hours, sessions are COUNT(DISTINCT sessionId), and
   camera opens are event='camera_open' rows. (The previous trend query had
   no event filter and bucketed by UTC day — it reported 27 "page views"
   for the fixtures below instead of 25.) */
import { describe, it, expect, vi, beforeAll } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

type Row = { t: number; path: string; sid: string; event: string | null };
const H = 3600_000;
const now0 = Date.now();
const rows: Row[] = [];
// 24 plain visits inside the last 24h (spread across the last 5 hours)
for (let i = 0; i < 24; i++) {
  rows.push({ t: now0 - Math.floor(i / 5) * H - (i % 5) * 600_000 - 60_000, path: "/", sid: `s${i % 6}`, event: null });
}
// 3 interaction-event rows (excluded from the visits graph AND from view
// counts in the traffic trend; the camera_open one counts as an open)
for (let i = 0; i < 3; i++) {
  rows.push({ t: now0 - i * H - 30_000, path: "/", sid: `s${i}`, event: i === 0 ? "camera_open" : "globe_reached" });
}
// 1 plain visit 3 days ago (outside the 24h strip, inside the 30d trend)
rows.push({ t: now0 - 3 * 24 * H, path: "/pricing", sid: "old", event: null });

const plain = rows.filter((r) => r.event === null);

const fakeDb = {
  pageView: {
    count: async ({ where }: any = {}) => {
      let out = plain;
      const gte = where?.createdAt?.gte as Date | undefined;
      if (gte) out = out.filter((r) => r.t >= gte.getTime());
      return out.length;
    },
    findMany: async ({ where, orderBy, take }: any = {}) => {
      let out = rows.filter((r) => r.event === null);
      const gte = where?.createdAt?.gte as Date | undefined;
      const lt = where?.createdAt?.lt as Date | undefined;
      if (gte) out = out.filter((r) => r.t >= gte.getTime());
      if (lt) out = out.filter((r) => r.t < lt.getTime());
      out = [...out].sort((a, b) => a.t - b.t);
      if (orderBy?.createdAt === "desc") out.reverse();
      if (take) out = out.slice(0, take);
      return out.map((r) => ({ createdAt: new Date(r.t), path: r.path }));
    },
    groupBy: async () => [],
  },
  user: { count: async () => 0, findMany: async () => [] },
  account: { groupBy: async () => [] },
  subscription: { findMany: async () => [], groupBy: async () => [], count: async () => 0 },
  newsletterSubscriber: { count: async () => 0 },
  checkoutAttempt: { groupBy: async () => [] },
  competitor: { count: async () => 0 },
  affiliateProfile: { count: async () => 0 },
  commission: { aggregate: async () => ({ _sum: { amountCents: null } }) },
  creatorApplication: { findMany: async () => [] },
  marketingTemplate: { findMany: async () => [] },
  lifecycleEmailLog: { findMany: async () => [] },
  $queryRaw: async (strings: TemplateStringsArray, ...values: any[]) => {
    const sql = strings.join("?");
    if (sql.includes("camera_open") && sql.includes("GROUP BY")) {
      // Traffic bucket aggregate — mirrors the real query: rows inside the
      // [start, end) params window, bucketed by Denver day/hour, with
      // FILTER semantics (views = event IS NULL, opens = camera_open).
      const start = (values[0] as Date).getTime();
      const end = (values[1] as Date).getTime();
      const hourly = sql.includes("HH24");
      const keyOf = (t: number) => {
        const p = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Denver", hourCycle: "h23",
          year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit",
        }).formatToParts(new Date(t));
        const g = (ty: string) => p.find((x) => x.type === ty)?.value ?? "0";
        const d = `${g("year")}-${g("month")}-${g("day")}`;
        return hourly ? `${d} ${g("hour")}` : d;
      };
      const byKey = new Map<string, Row[]>();
      for (const r of rows) {
        if (r.t < start || r.t >= end) continue;
        const k = keyOf(r.t);
        byKey.set(k, [...(byKey.get(k) ?? []), r]);
      }
      return [...byKey.entries()]
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([k, rs]) => ({
          k,
          views: BigInt(rs.filter((r) => r.event === null).length),
          sessions: BigInt(new Set(rs.filter((r) => r.event === null).map((r) => r.sid)).size),
          opens: BigInt(rs.filter((r) => r.event === "camera_open").length),
        }));
    }
    if (sql.includes("COUNT(DISTINCT") && sql.includes("event IS NULL") && sql.includes('"createdAt" <')) {
      // Traffic sessions total: distinct sessions over view rows in the
      // [start, end) window. The upper-bound predicate is required in the
      // match: the page's live-visitor counts (page.tsx) are also
      // COUNT(DISTINCT …) with event IS NULL but carry only a lower
      // bound — they must fall through to the generic branch below.
      const start = (values[0] as Date).getTime();
      const end = (values[1] as Date).getTime();
      const sids = new Set(rows.filter((r) => r.event === null && r.t >= start && r.t < end).map((r) => r.sid));
      return [{ c: BigInt(sids.size) }];
    }
    if (sql.includes("TO_CHAR") && sql.includes('"PageView"')) {
      // Mirrors the real query: ALL PageView rows (no event filter), by day.
      const byDay = new Map<string, number>();
      for (const r of rows) {
        const d = new Date(r.t).toISOString().slice(0, 10);
        byDay.set(d, (byDay.get(d) ?? 0) + 1);
      }
      return [...byDay.entries()].map(([d, c]) => ({ d, c: BigInt(c) }));
    }
    if (sql.includes("TO_CHAR")) return [];
    if (sql.includes("COUNT(DISTINCT")) return [{ c: BigInt(new Set(rows.map((r) => r.sid)).size) }];
    if (sql.includes("AVG")) return [{ sessions: BigInt(6), bounces: BigInt(1), avg_secs: 95.5, avg_views: 4.2 }];
    return [];
  },
};

vi.mock("@/auth", () => ({ auth: async () => ({ user: { email: "admin@example.com" } }) }));
vi.mock("@/lib/affiliate/admin", () => ({ adminEmails: () => ["admin@example.com"] }));
vi.mock("@/lib/stripe", () => ({
  stripe: () => {
    throw new Error("no stripe key in test");
  },
}));
vi.mock("@/lib/growth", () => ({ growthDashboardUrl: () => null }));
vi.mock("@/lib/db", () => ({ db: fakeDb }));
const nullComp = { default: () => null };
vi.mock("./NewsletterBroadcast", () => nullComp);
vi.mock("./CompetitorManager", () => nullComp);
vi.mock("./CreatorApplications", () => nullComp);
vi.mock("./MarketingStudio", () => nullComp);
vi.mock("./StudioCredits", () => nullComp);
vi.mock("./StudioCampaigns", () => nullComp);
vi.mock("./StudioAmbassadors", () => nullComp);
vi.mock("./StudioDrops", () => nullComp);
vi.mock("./StudioReport", () => nullComp);
vi.mock("./LiveRefresh", () => nullComp);

describe("admin visits graphs", () => {
  let html = "";
  beforeAll(async () => {
    const mod = await import("./page");
    const el = await mod.default();
    html = renderToString(el as React.ReactElement);
  }, 120_000);

  it("renders one dot per plain visit in the last 24h, events excluded", () => {
    expect(html).toContain("Every visit · last 24 hours");
    expect(html).toContain("24<!-- --> visits · one dot each");
    // Count circles inside the visits section only (the traffic chart
    // further down the page has circles of its own).
    const seg = html.slice(html.indexOf("Every visit"), html.indexOf("Total users"));
    const circles = (seg.match(/<circle/g) || []).length;
    expect(circles).toBe(24);
  });

  it("renders the traffic trend with event-filtered Denver totals (30d default)", () => {
    const idx = html.indexOf(">Traffic<");
    expect(idx).toBeGreaterThan(-1);
    const seg = html.slice(idx, html.indexOf("Signups · 30 days"));
    expect(seg).toContain("Last 30 days · daily · America/Denver");
    expect(seg).toMatch(/<path d="M/);
    // Range totals from the totals row markup: 25 views (24 plain in the
    // last 24h + 1 plain 3 days ago — the 3 interaction rows are NOT
    // views), 7 distinct sessions (s0–s5 + "old"), 1 camera open.
    expect(seg).toContain('font-extrabold text-white tabular-nums">25<');
    expect(seg).toContain('font-extrabold text-white tabular-nums">7<');
    expect(seg).toContain('font-extrabold text-white tabular-nums">1<');
    expect(seg).toContain("Exact values per day");
  });

  it("range=24h renders hourly buckets over the rolling day", async () => {
    const mod = await import("./page");
    const el = await mod.default({ searchParams: Promise.resolve({ range: "24h" }) });
    const h = renderToString(el as React.ReactElement);
    const seg = h.slice(h.indexOf(">Traffic<"), h.indexOf("Signups · 30 days"));
    expect(seg).toContain("Rolling 24 hours · hourly · Denver time");
    // 24 plain views inside the last 24h (the 3-day-old visit falls out),
    // 6 distinct sessions (s0–s5), still 1 camera open.
    expect(seg).toContain('font-extrabold text-white tabular-nums">24<');
    expect(seg).toContain('font-extrabold text-white tabular-nums">6<');
    expect(seg).toContain("Exact values per hour");
  }, 120_000);

  it("graph SVGs scale proportionally (h-auto), never a fixed pixel height", () => {
    const svgTags = html.match(/<svg[^>]*>/g) ?? [];
    const graphs = svgTags.filter((t) => t.includes('viewBox="0 0 1120') || t.includes('viewBox="0 0 560'));
    expect(graphs.length).toBe(4); // 1 visit strip + 3 trend charts (signups, traffic, revenue)
    for (const tag of graphs) {
      expect(tag).not.toMatch(/style="[^"]*height:/);
      expect(tag).toContain("h-auto");
      expect(tag).toContain("w-full");
    }
  });
});
