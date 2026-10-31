import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import { fileURLToPath } from "node:url";

/**
 * Grants landing tests (Phase 4): flag gate + the Neon yearly grain
 * rendered with the award-cumulative / attributed-fiscal-year
 * definitions on the page, top ALN/agency rows, and the FAC strip
 * with flag counts (never amounts). The artifact meta runs for real
 * against schema-true fixtures; the Neon grain is mocked.
 */
vi.mock("@/lib/fraud-radar/grants-neon", () => ({
  listGrantsYearly: async () => [
    {
      fiscalYear: 2025,
      awards: 100,
      distinctRecipients: 50,
      obligatedAwardCumulativeUsd: 1234567.5,
      outlayAwardCumulativeUsd: 900000,
      subawardsCount: 7,
      subawardAmountUsd: 123000,
    },
  ],
  listGrantsAln: async () => ({
    total: 1,
    rows: [
      {
        aln: "93.498",
        alnTitle: "Example Program",
        attributedFiscalYear: 2025,
        awards: 5,
        distinctRecipients: 4,
        obligatedAwardCumulativeUsd: 2000000,
      },
    ],
  }),
  listGrantsAgency: async () => ({
    total: 1,
    rows: [
      {
        agency: "Dept of Health",
        attributedFiscalYear: 2025,
        awards: 5,
        distinctRecipients: 4,
        obligatedAwardCumulativeUsd: 2000000,
      },
    ],
  }),
  getGrantsAlnSummary: async () => null,
  listFacYearly: async () => [
    {
      auditYear: 2024,
      reports: 3,
      totalExpendedUsd: 4500000,
      findingsCount: 4,
      repeatFindingsCount: 1,
      questionedCostFlagCount: 2,
      distinctAuditees: 1,
    },
  ],
}));

import GrantsPage from "./page";

const FIXTURES = fileURLToPath(
  new URL("../../../../lib/fraud-radar/__fixtures__/grants", import.meta.url),
);

beforeAll(() => {
  vi.stubEnv("FRAUD_RADAR_GRANTS_ARTIFACT_ROOT", FIXTURES);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("FRAUD_RADAR_GRANTS_ARTIFACT_ROOT", FIXTURES);
});

describe("/fraud-radar/grants — flag gate + landing", () => {
  it("404s while FRAUD_RADAR_ENABLED is off", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    let digest = "";
    try {
      await GrantsPage();
    } catch (e) {
      digest = (e as { digest?: string })?.digest ?? "";
    }
    expect(
      digest === "NEXT_NOT_FOUND" ||
        digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404"),
    ).toBe(true);
  });

  it("renders yearly grain with the measure definitions when on", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = renderToString(await GrantsPage());
    expect(html).toContain("Federal grants, from the official record");
    expect(html).toContain("2025");
    expect(html).toContain("$1,234,567.50");
    expect(html).toContain("award-cumulative");
    expect(html).toContain("attributed fiscal year");
    expect(html).toContain("93.498");
    expect(html).toContain("Example Program");
    expect(html).toContain("Dept of Health");
    expect(html).toContain("/fraud-radar/grants/recipients");
    expect(html).toContain("/fraud-radar/grants/aln");
    expect(html).toContain("/fraud-radar/grants/fac");
    // FAC strip: findings + questioned-cost FLAG counts, withheld note.
    expect(html).toContain("audit findings");
    expect(html).toContain("questioned-cost flags");
    expect(html).toContain("4,908");
    expect(html).toContain("research lead");
  });
});
