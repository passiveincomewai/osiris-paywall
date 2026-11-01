import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import { fileURLToPath } from "node:url";

/**
 * Contract award detail tests (Phase 5): flag gate; the snapshot
 * renders from the winning row with ceilings labelled as
 * ceilings; the FULL modification timeline renders as reported
 * (the fixture chain has a base action + one modification, read
 * through the gzip award bucket).
 */
import ContractAwardPage from "./page";

const FIXTURES = fileURLToPath(
  new URL("../../../../../../lib/fraud-radar/__fixtures__/contracts", import.meta.url),
);

beforeAll(() => {
  vi.stubEnv("FRAUD_RADAR_CONTRACTS_ARTIFACT_ROOT", FIXTURES);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("FRAUD_RADAR_CONTRACTS_ARTIFACT_ROOT", FIXTURES);
});

const params = (awardKey: string) => ({ params: Promise.resolve({ awardKey }) });

describe("/fraud-radar/contracts/awards/[awardKey]", () => {
  it("404s while FRAUD_RADAR_ENABLED is off", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    await expect(ContractAwardPage(params("CONT_AWD_TEST123_9700"))).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_HTTP_ERROR_FALLBACK;404"),
    });
  });

  it("renders snapshot + full timeline when on", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = renderToString(await ContractAwardPage(params("CONT_AWD_TEST123_9700")));
    expect(html).toContain("TEST123");
    expect(html).toContain("Modification timeline (full, as reported)");
    expect(html).toContain("P00001");
    expect(html).toContain("ceiling");
    expect(html).toContain("federal_action_obligation");
  });

  it("404s for an unknown award key", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    await expect(ContractAwardPage(params("CONT_AWD_UNKNOWN_0000"))).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_HTTP_ERROR_FALLBACK;404"),
    });
  });
});
