import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import { fileURLToPath } from "node:url";

/**
 * Contracts landing tests (Phase 5): flag gate + the Neon yearly
 * grain rendered with the award-cumulative / attributed-fiscal-
 * year definitions, the ceilings≠obligations and no-FAC honesty
 * notes, and the modification-history explainer. The artifact
 * meta runs for real against schema-true fixtures; the Neon
 * grain is mocked.
 */
vi.mock("@/lib/fraud-radar/contracts-neon", () => ({
  listContractsYearly: async () => [
    {
      fiscalYear: 2025,
      awards: 100,
      distinctVendors: 50,
      obligatedAwardCumulativeUsd: 1234567.5,
      outlayAwardCumulativeUsd: 900000,
      transactions: 300,
      modifications: 40,
    },
  ],
  listContractsNaics: async () => ({
    total: 1,
    rows: [
      {
        naics: "541511",
        naicsDescription: "Custom Computer Programming",
        attributedFiscalYear: 2025,
        awards: 5,
        distinctVendors: 4,
        distinctPscCodes: 2,
        obligatedAwardCumulativeUsd: 2000000,
        outlayAwardCumulativeUsd: null,
        transactionsInWindow: 9,
        modificationsInWindow: 1,
      },
    ],
  }),
  listContractsAgency: async () => ({
    total: 1,
    rows: [
      {
        agency: "Department of Defense",
        agencyCode: "097",
        attributedFiscalYear: 2025,
        awards: 5,
        distinctVendors: 4,
        obligatedAwardCumulativeUsd: 2000000,
        outlayAwardCumulativeUsd: null,
        transactionsInWindow: 9,
        modificationsInWindow: 1,
      },
    ],
  }),
  listContractsNaicsYears: async () => null,
  listContractsPsc: async () => null,
  listContractsPscYears: async () => null,
}));

import ContractsPage from "./page";

const FIXTURES = fileURLToPath(
  new URL("../../../../lib/fraud-radar/__fixtures__/contracts", import.meta.url),
);

beforeAll(() => {
  vi.stubEnv("FRAUD_RADAR_CONTRACTS_ARTIFACT_ROOT", FIXTURES);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("FRAUD_RADAR_CONTRACTS_ARTIFACT_ROOT", FIXTURES);
});

describe("/fraud-radar/contracts", () => {
  it("404s while FRAUD_RADAR_ENABLED is off", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    await expect(ContractsPage()).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_HTTP_ERROR_FALLBACK;404") });
  });

  it("renders the yearly grain with definitions and honesty notes when on", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = renderToString(await ContractsPage());
    expect(html).toContain("Federal contracts, from the official record.");
    expect(html).toContain("award-cumulative");
    expect(html).toContain("Modifications in window");
    expect(html).toContain("not obligations");
    expect(html).toContain("does not cover contracts");
    expect(html).toContain("81.3834%");
    expect(html).toContain("541511");
  });
});
