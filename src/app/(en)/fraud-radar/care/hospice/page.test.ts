import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

/**
 * Hospice directory tests (Phase 3): flag gate + Care Compare rows
 * with certification facts. Neon module mocked to the grain shape.
 */
vi.mock("@/lib/fraud-radar/care-neon", () => ({
  listMedicareYearly: async () => null,
  listMedicareHcpcs: async () => null,
  listHospiceProviders: async () => ({
    total: 1,
    rows: [
      {
        ccn: "461503",
        facilityName: "EXAMPLE HOSPICE OF UTAH",
        addressLine1: "100 MAIN ST",
        addressLine2: null,
        city: "OGDEN",
        state: "UT",
        zipCode: "84401",
        county: "WEBER",
        phone: "8015550100",
        cmsRegion: "Denver",
        ownershipType: "Non-Profit",
        certificationDate: "2001-04-15",
      },
    ],
  }),
  listHomeHealthAgencies: async () => null,
  CARE_COMPARE_VERSION: "2026-10-refresh",
}));

import HospiceDirectoryPage from "./page";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("/fraud-radar/care/hospice — directory", () => {
  it("404s while the flag is off", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    let digest = "";
    try {
      await HospiceDirectoryPage({ searchParams: Promise.resolve({}) });
    } catch (e) {
      digest = (e as { digest?: string })?.digest ?? "";
    }
    expect(
      digest === "NEXT_NOT_FOUND" ||
        digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404"),
    ).toBe(true);
  });

  it("renders certification facts when on", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = renderToString(
      await HospiceDirectoryPage({ searchParams: Promise.resolve({}) }),
    );
    expect(html).toContain("EXAMPLE HOSPICE OF UTAH");
    expect(html).toContain("CCN");
    expect(html).toContain("461503");
    expect(html).toContain("Medicare certified since 2001-04-15");
    expect(html).toContain("2026-10-refresh");
  });
});
