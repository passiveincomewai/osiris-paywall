import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import { fileURLToPath } from "node:url";

/**
 * FAC overview tests (Phase 4): flag gate + explainer discipline
 * (audit findings, never "violations"; questioned costs as flag
 * counts, never amounts) + the yearly public-subset grain and the
 * is_public withholding note with its count.
 */
vi.mock("@/lib/fraud-radar/grants-neon", () => ({
  listGrantsYearly: async () => null,
  listGrantsAln: async () => null,
  listGrantsAgency: async () => null,
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

import GrantsFacPage from "./page";

const FIXTURES = fileURLToPath(
  new URL("../../../../../lib/fraud-radar/__fixtures__/grants", import.meta.url),
);

beforeAll(() => {
  vi.stubEnv("FRAUD_RADAR_GRANTS_ARTIFACT_ROOT", FIXTURES);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("FRAUD_RADAR_GRANTS_ARTIFACT_ROOT", FIXTURES);
});

describe("/fraud-radar/grants/fac — overview", () => {
  it("404s while FRAUD_RADAR_ENABLED is off", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    let digest = "";
    try {
      await GrantsFacPage();
    } catch (e) {
      digest = (e as { digest?: string })?.digest ?? "";
    }
    expect(
      digest === "NEXT_NOT_FOUND" ||
        digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404"),
    ).toBe(true);
  });

  it("renders the explainer and yearly grain with flag discipline", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = renderToString(await GrantsFacPage());
    expect(html).toContain("Single audits: what a finding is");
    expect(html).toContain("audit finding");
    // Findings are never labelled violations — the only use of the
    // word on the page is the explicit disclaimer "never violations".
    expect(html).toContain("never violations");
    expect(html).not.toContain("Violation");
    expect(html).toContain("Questioned-cost flags");
    expect(html).toContain("flags only");
    expect(html).toContain("2024");
    expect(html).toContain("$4,500,000.00");
    expect(html).toContain("auditee-reported");
    // Withholding note: count only, public reports only.
    expect(html).toContain("4,908");
    expect(html).toContain("is_public=false");
    expect(html).toContain("public reports only");
    expect(html).toContain("never zero findings");
  });
});
