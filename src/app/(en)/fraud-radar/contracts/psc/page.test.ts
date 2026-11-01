import { describe, it, expect, vi, afterEach } from "vitest";
import { renderToString } from "react-dom/server";

/**
 * PSC explorer tests (Phase 5): flag gate + mocked Neon grain
 * rendering with attributed-year / award-cumulative labels.
 */
vi.mock("@/lib/fraud-radar/contracts-neon", () => ({
  listContractsPsc: async () => ({
    total: 1,
    rows: [
      {
        psc: "D399",
        pscDescription: "IT Services",
        attributedFiscalYear: 2025,
        awards: 5,
        distinctVendors: 4,
        distinctNaicsCodes: 2,
        obligatedAwardCumulativeUsd: 2000000,
        outlayAwardCumulativeUsd: null,
        transactionsInWindow: 9,
        modificationsInWindow: 1,
      },
    ],
  }),
  listContractsPscYears: async () => null,
  listContractsNaics: async () => null,
  listContractsNaicsYears: async () => null,
  listContractsYearly: async () => null,
  listContractsAgency: async () => null,
}));

import ContractsPscPage from "./page";

afterEach(() => {
  vi.unstubAllEnvs();
});

const sp = (o: Record<string, string>) => ({ searchParams: Promise.resolve(o) });

describe("/fraud-radar/contracts/psc", () => {
  it("404s while FRAUD_RADAR_ENABLED is off", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    await expect(ContractsPscPage(sp({}))).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_HTTP_ERROR_FALLBACK;404"),
    });
  });

  it("renders rows when on", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = renderToString(await ContractsPscPage(sp({})));
    expect(html).toContain("D399");
    expect(html).toContain("award-cumulative");
  });
});
