/* Render tests for /admin/conversion (merged from the admin-conversion
   branch) and its shared admin nav. The data layer is mocked with a
   fabricated report shaped exactly like ConversionReport, so these tests
   pin the page's structure: all eight funnel stages render, money stages
   carry the owner-exclusion label (the funnel definition must not drift),
   range links point at the real range keys, and the shared AdminNav makes
   every admin section reachable from this page. */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import type { ConversionReport } from "@/lib/conversion-analytics";

const stage = (
  key: ConversionReport["stages"][number]["key"],
  label: string,
  count: number,
  pctOfPrev: number | null,
  pctOfLanded: number | null,
  dropFromPrev: number,
) => ({ key, label, count, pctOfPrev, pctOfLanded, dropFromPrev });

const report: ConversionReport = {
  range: "7d",
  sinceISO: new Date(Date.now() - 7 * 86400_000).toISOString(),
  generatedAtISO: new Date().toISOString(),
  capped: false,
  stages: [
    stage("landed", "Landed", 1000, null, 100, 0),
    stage("globe", "Globe interaction", 800, 80, 80, 200),
    stage("camera", "Camera opened", 500, 62.5, 50, 300),
    stage("pricing", "Pricing viewed", 200, 40, 20, 300),
    stage("checkout", "Checkout started", 60, 30, 6, 140),
    stage("trial", "Free trial started", 40, 66.7, 4, 20),
    stage("first", "First payment", 10, 25, 1, 30),
    stage("renewal", "Renewal payment", 4, 40, 0.4, -6),
  ],
  biggestDropoff: stage("camera", "Camera opened", 500, 62.5, 50, 300),
  checkout: { started: 60, distinctCustomers: 55, stripeCount: 61 },
  stripeOk: true,
  segments: {
    source: [
      { key: "chatgpt.com", label: "chatgpt.com", landed: 400, globe: 320, camera: 200, pricing: 90, trials: 18, paid: 6, endToEndPct: 1.5 },
    ],
    device: [
      { key: "mobile", label: "Mobile", landed: 600, globe: 450, camera: 260, pricing: 110, trials: 20, paid: 7, endToEndPct: 1.2 },
    ],
    landing: [
      { key: "/", label: "/", landed: 700, globe: 600, camera: 350, pricing: 130, trials: 26, paid: 9, endToEndPct: 1.3 },
    ],
  },
};

vi.mock("@/auth", () => ({ auth: async () => ({ user: { email: "admin@example.com" } }) }));
vi.mock("@/lib/affiliate/admin", () => ({ adminEmails: () => ["admin@example.com"] }));
vi.mock("@/lib/conversion-analytics", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/conversion-analytics")>();
  return { ...orig, getConversionReport: async () => report };
});

describe("/admin/conversion page", () => {
  let html = "";
  it("renders with the mocked report", async () => {
    const mod = await import("./page");
    const el = await mod.default({ searchParams: Promise.resolve({}) });
    html = renderToString(el as React.ReactElement);
    expect(html).toContain("Conversion");
  });

  it("renders all eight funnel stages in order", () => {
    // Scope to the funnel section: stage labels also appear earlier in the
    // summary cards (the biggest drop-off card names its stage).
    const funnel = html.slice(html.indexOf("The funnel"), html.indexOf("By traffic source"));
    const labels = [
      "Landed", "Globe interaction", "Camera opened", "Pricing viewed",
      "Checkout started", "Free trial started", "First payment", "Renewal payment",
    ];
    let last = -1;
    for (const label of labels) {
      const idx = funnel.indexOf(label);
      expect(idx, label).toBeGreaterThan(last);
      last = idx;
    }
  });

  it("labels every money stage as owner-excluded and keeps the honesty strip", () => {
    // 4 money stages carry the inline label; the strip above the funnel too.
    expect((html.match(/owner accounts excluded/g) || []).length).toBeGreaterThanOrEqual(4);
    expect(html).toContain("exclude owner/test accounts");
  });

  it("flags the biggest drop-off stage", () => {
    expect(html).toContain("biggest drop-off");
    expect(html).toContain("Biggest drop-off");
  });

  it("range links use the real range keys", () => {
    for (const key of ["24h", "7d", "30d"]) {
      expect(html).toContain(`href="/admin/conversion?range=${key}"`);
    }
  });

  it("renders the three segment tables with their rows", () => {
    expect(html).toContain("By traffic source");
    expect(html).toContain("By device");
    expect(html).toContain("By landing page");
    expect(html).toContain("chatgpt.com");
    expect(html).toContain("Paid % of landed");
  });

  it("shared admin nav reaches every admin section", () => {
    for (const href of ["/admin", "/admin/conversion", "/admin/affiliates", "/admin/competitor-seo", "/admin/contact"]) {
      expect(html).toContain(`href="${href}"`);
    }
    expect(html).toContain('aria-current="page"');
  });
});
