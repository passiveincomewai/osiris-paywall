import { describe, it, expect, vi, afterEach } from "vitest";
import { renderToString } from "react-dom/server";

/**
 * NAICS explorer tests (Phase 5): flag gate + mocked Neon grain
 * rendering with attributed-year / award-cumulative labels.
 */
vi.mock("@/lib/fraud-radar/contracts-neon", () => ({
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
  listContractsNaicsYears: async () => null,
  listContractsPsc: async () => null,
  listContractsPscYears: async () => null,
  listContractsYearly: async () => null,
  listContractsAgency: async () => null,
}));

import ContractsNaicsPage from "./page";

afterEach(() => {
  vi.unstubAllEnvs();
});

const sp = (o: Record<string, string>) => ({ searchParams: Promise.resolve(o) });

describe("/fraud-radar/contracts/naics", () => {
  it("404s while FRAUD_RADAR_ENABLED is off", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    await expect(ContractsNaicsPage(sp({}))).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_HTTP_ERROR_FALLBACK;404"),
    });
  });

  it("renders rows when on", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = renderToString(await ContractsNaicsPage(sp({})));
    expect(html).toContain("541511");
    expect(html).toContain("award-cumulative");
  });
});
