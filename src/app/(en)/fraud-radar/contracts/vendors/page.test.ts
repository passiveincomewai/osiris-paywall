import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import { fileURLToPath } from "node:url";

/**
 * Contract vendor search page tests (Phase 5): flag gate + a
 * fixture search rendering ranked vendor results.
 */
import ContractVendorsPage from "./page";

const FIXTURES = fileURLToPath(
  new URL("../../../../../lib/fraud-radar/__fixtures__/contracts", import.meta.url),
);

beforeAll(() => {
  vi.stubEnv("FRAUD_RADAR_CONTRACTS_ARTIFACT_ROOT", FIXTURES);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("FRAUD_RADAR_CONTRACTS_ARTIFACT_ROOT", FIXTURES);
});

const sp = (o: Record<string, string>) => ({ searchParams: Promise.resolve(o) });

describe("/fraud-radar/contracts/vendors", () => {
  it("404s while FRAUD_RADAR_ENABLED is off", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    await expect(ContractVendorsPage(sp({}))).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_HTTP_ERROR_FALLBACK;404"),
    });
  });

  it("renders search results when on", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = renderToString(await ContractVendorsPage(sp({ q: "ABC123" })));
    expect(html).toContain("ACME CORPORATION");
    expect(html).toContain("ABC123DEF456");
  });
});
