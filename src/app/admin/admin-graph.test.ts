/* Regression tests for the admin visits graphs (per-visit strip + 30-day
   page-views trend). Renders the real AdminDashboardPage with @/lib/db mocked
   over synthetic PageView rows.

   The bug this guards: both graph SVGs combined a fluid width (w-full) with a
   FIXED pixel height style. On any viewport narrower than the viewBox, the
   browser letterboxes the drawing (preserveAspectRatio="meet") into a thin
   centered band inside a tall empty box — on a phone the visits graph
   effectively didn't display even though the data and markup were correct.
   The fix renders both SVGs with h-auto so height follows the viewBox aspect
   ratio at any width. */
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
// 3 interaction-event rows (must be excluded from the visits graph)
for (let i = 0; i < 3; i++) {
  rows.push({ t: now0 - i * H - 30_000, path: "/", sid: `s${i}`, event: "globe_reached" });
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
  $queryRaw: async (strings: TemplateStringsArray, ..._values: any[]) => {
    const sql = strings.join("?");
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
    const circles = (html.match(/<circle/g) || []).length;
    expect(circles).toBe(24);
  });

  it("renders the 30-day page-views trend chart", () => {
    const idx = html.indexOf("Trends · 30 days");
    expect(idx).toBeGreaterThan(-1);
    const seg = html.slice(idx, idx + 6000);
    expect(seg).toMatch(/<path d="M/);
    expect(seg).toContain("27"); // today's total incl. event rows, per the real query
  });

  it("graph SVGs scale proportionally (h-auto), never a fixed pixel height", () => {
    const svgTags = html.match(/<svg[^>]*>/g) ?? [];
    const graphs = svgTags.filter((t) => t.includes('viewBox="0 0 1120') || t.includes('viewBox="0 0 560'));
    expect(graphs.length).toBe(4); // 1 visit strip + 3 trend charts
    for (const tag of graphs) {
      expect(tag).not.toMatch(/style="[^"]*height:/);
      expect(tag).toContain("h-auto");
      expect(tag).toContain("w-full");
    }
  });
});
