import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { fileURLToPath } from "node:url";

/**
 * HCPCS code detail tests (Phase 2): totals from the Neon grain
 * (mocked) + top providers from the real artifact read path
 * (fixtures), cross-linked to profiles.
 */
const summaryMock = vi.fn();
vi.mock("@/lib/fraud-radar/healthcare-neon", () => ({
  getHcpcsSummary: (code: string) => summaryMock(code),
  listHcpcsSummaries: async () => null,
  listMonthlyNational: async () => null,
}));

import HcpcsDetailPage from "./page";

const FIXTURES = fileURLToPath(
  new URL("../../../../../../lib/fraud-radar/__fixtures__/healthcare", import.meta.url),
);

const SUMMARY = {
  hcpcsCode: "99213",
  reportedCells: 1000,
  totalClaimLines: 5000,
  totalPatientsReported: 9000,
  paidAllCellsUsd: 123456.78,
  outlierCells: 0,
  outlierPaidUsd: 0,
  paidExclOutliersUsd: 123456.78,
  distinctBillingNpis: 321,
  distinctServicingNpis: 654,
  firstClaimMonth: "2018-01-01",
  lastClaimMonth: "2024-12-01",
  activeMonths: 84,
};

beforeAll(() => {
  vi.stubEnv("FRAUD_RADAR_ARTIFACT_ROOT", FIXTURES);
  vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("FRAUD_RADAR_ARTIFACT_ROOT", FIXTURES);
  vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
  summaryMock.mockReset();
});

describe("/fraud-radar/healthcare/hcpcs/[code] — detail", () => {
  it("renders totals and the top-provider cross-links", async () => {
    summaryMock.mockResolvedValue(SUMMARY);
    const html = renderToString(
      await HcpcsDetailPage({ params: Promise.resolve({ code: "99213" }) }),
    ).replace(/<!-- -->/g, "");
    expect(html).toContain("HCPCS 99213");
    expect(html).toContain("$123,456.78");
    expect(html).toContain("Top billing providers for 99213");
    expect(html).toContain("SMITH JOHN");
    expect(html).toContain("/fraud-radar/healthcare/providers/1234567890");
  });

  it("404s for a code in neither the grain nor the artifacts", async () => {
    summaryMock.mockResolvedValue(null);
    let digest = "";
    try {
      await HcpcsDetailPage({ params: Promise.resolve({ code: "ZZZZZ" }) });
    } catch (e) {
      digest = (e as { digest?: string })?.digest ?? "";
    }
    expect(digest === "NEXT_NOT_FOUND" || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404")).toBe(true);
  });
});
