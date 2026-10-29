import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

/**
 * Home health directory tests (Phase 3): flag gate + Care Compare
 * rows; the star is labelled CMS's own, and an agency without a
 * published star renders "not published" — never a zero rating.
 */
vi.mock("@/lib/fraud-radar/care-neon", () => ({
  listMedicareYearly: async () => null,
  listMedicareHcpcs: async () => null,
  listHospiceProviders: async () => null,
  listHomeHealthAgencies: async () => ({
    total: 2,
    rows: [
      {
        ccn: "467104",
        providerName: "EXAMPLE HOME HEALTH",
        address: "200 MAIN ST",
        city: "OGDEN",
        state: "UT",
        zipCode: "84401",
        phone: "8015550101",
        ownershipType: "Proprietary",
        certificationDate: "1998-06-01",
        qualityStarRating: 3.5,
        qualityStarFootnote: null,
        offersNursing: true,
        offersPhysicalTherapy: true,
        offersOccupationalTherapy: null,
        offersSpeechPathology: null,
        offersMedicalSocial: null,
        offersHomeHealthAide: true,
      },
      {
        ccn: "467105",
        providerName: "UNRATED HOME HEALTH",
        address: null,
        city: "PROVO",
        state: "UT",
        zipCode: "84601",
        phone: null,
        ownershipType: null,
        certificationDate: null,
        qualityStarRating: null,
        qualityStarFootnote: "Too few measures",
        offersNursing: null,
        offersPhysicalTherapy: null,
        offersOccupationalTherapy: null,
        offersSpeechPathology: null,
        offersMedicalSocial: null,
        offersHomeHealthAide: null,
      },
    ],
  }),
  CARE_COMPARE_VERSION: "2026-10-refresh",
}));

import HomeHealthDirectoryPage from "./page";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("/fraud-radar/care/home-health — directory", () => {
  it("404s while the flag is off", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    let digest = "";
    try {
      await HomeHealthDirectoryPage({ searchParams: Promise.resolve({}) });
    } catch (e) {
      digest = (e as { digest?: string })?.digest ?? "";
    }
    expect(
      digest === "NEXT_NOT_FOUND" ||
        digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404"),
    ).toBe(true);
  });

  it("renders CMS's star as CMS's, and absence as not published", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = renderToString(
      await HomeHealthDirectoryPage({ searchParams: Promise.resolve({}) }),
    );
    expect(html).toContain("CMS quality star:");
    expect(html).toContain("3.5");
    expect(html).toContain("CMS quality star: not published");
    expect(html).toContain("Nursing");
    expect(html).toContain("not a Fraud Radar score");
    expect(html).toContain("certification date not published");
  });
});
