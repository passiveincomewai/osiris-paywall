import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

/**
 * Medicare HCPCS explorer tests (Phase 3): flag gate + Neon-grain
 * rows rendered with derived labels. The Neon module is mocked —
 * this page's contract is the grain shape, not the database.
 */
vi.mock("@/lib/fraud-radar/care-neon", () => ({
  listMedicareYearly: async () => null,
  listMedicareHcpcs: async () => ({
    total: 1,
    rows: [
      {
        hcpcsCode: "99213",
        hcpcsDesc: "Office visit",
        dataYear: 2024,
        distinctProviders: 812345,
        totalServices: 51234567,
        benesReported: 20123456,
        pymtDerivedUsd: 5123456789.5,
        allowedDerivedUsd: 6123456789.5,
        stdzdDerivedUsd: 5023456789.5,
        submittedDerivedUsd: 9123456789.5,
        sourceRows: 812345,
      },
    ],
  }),
  listHospiceProviders: async () => null,
  listHomeHealthAgencies: async () => null,
  CARE_COMPARE_VERSION: "2026-10-refresh",
}));

import MedicareHcpcsPage from "./page";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("/fraud-radar/care/hcpcs — explorer", () => {
  it("404s while the flag is off", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    let digest = "";
    try {
      await MedicareHcpcsPage({ searchParams: Promise.resolve({}) });
    } catch (e) {
      digest = (e as { digest?: string })?.digest ?? "";
    }
    expect(
      digest === "NEXT_NOT_FOUND" ||
        digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404"),
    ).toBe(true);
  });

  it("renders code rows with derived labels when on", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = renderToString(
      await MedicareHcpcsPage({ searchParams: Promise.resolve({}) }),
    );
    expect(html).toContain("99213");
    expect(html).toContain("Office visit");
    expect(html).toContain("$5,123,456,789.50");
    expect(html).toContain("Payments (derived)");
    expect(html).toContain("/fraud-radar/care/hcpcs/99213");
  });
});
