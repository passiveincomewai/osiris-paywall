import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

/**
 * HCPCS explorer tests (Phase 2): flag gate + code-grain rendering
 * from the Neon summary read model (mocked — the read model's own
 * fail-soft behavior is what the "not loaded" state pins).
 */
const listMock = vi.fn();
vi.mock("@/lib/fraud-radar/healthcare-neon", () => ({
  listHcpcsSummaries: (opts: unknown) => listMock(opts),
  getHcpcsSummary: async () => null,
  listMonthlyNational: async () => null,
}));

import HcpcsExplorerPage from "./page";

const ROW = {
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

afterEach(() => {
  vi.unstubAllEnvs();
  listMock.mockReset();
});

describe("/fraud-radar/healthcare/hcpcs — explorer", () => {
  it("404s while FRAUD_RADAR_ENABLED is off", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    let digest = "";
    try {
      await HcpcsExplorerPage({ searchParams: Promise.resolve({}) });
    } catch (e) {
      digest = (e as { digest?: string })?.digest ?? "";
    }
    expect(digest === "NEXT_NOT_FOUND" || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404")).toBe(true);
  });

  it("renders code rows with both treatments when enabled", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    listMock.mockResolvedValue({ total: 1, rows: [ROW] });
    const html = renderToString(
      await HcpcsExplorerPage({ searchParams: Promise.resolve({}) }),
    ).replace(/<!-- -->/g, "");
    expect(html).toContain("99213");
    expect(html).toContain("$123,456.78");
    expect(html).toContain("/fraud-radar/healthcare/hcpcs/99213");
    expect(html).toContain("1 codes");
  });

  it("renders the honest not-loaded state when the grain is absent", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    listMock.mockResolvedValue(null);
    const html = renderToString(
      await HcpcsExplorerPage({ searchParams: Promise.resolve({}) }),
    );
    expect(html).toContain("not loaded yet");
    expect(html).toContain("Nothing is estimated");
  });
});
