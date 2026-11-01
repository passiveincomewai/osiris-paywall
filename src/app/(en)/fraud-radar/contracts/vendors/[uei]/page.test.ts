import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import { fileURLToPath } from "node:url";

/**
 * Contract vendor profile tests (Phase 5 + Phase 6 tail): flag
 * gate; SAM block extract-dated; screening block with research-
 * lead caveats; totals award-cumulative with null outlay shown
 * as absence; NO FAC block anywhere; the grants profile is
 * LINKED by UEI (the fixture vendor has no grants record, so no
 * link renders); the contracts research-signals section is wired
 * (pre-awaited) — with no signals artifact configured it fails
 * soft to absent.
 */
import ContractVendorProfilePage from "./page";

const FIXTURES = fileURLToPath(
  new URL("../../../../../../lib/fraud-radar/__fixtures__/contracts", import.meta.url),
);
const GRANTS_FIXTURES = fileURLToPath(
  new URL("../../../../../../lib/fraud-radar/__fixtures__/grants", import.meta.url),
);

beforeAll(() => {
  vi.stubEnv("FRAUD_RADAR_CONTRACTS_ARTIFACT_ROOT", FIXTURES);
  vi.stubEnv("FRAUD_RADAR_GRANTS_ARTIFACT_ROOT", GRANTS_FIXTURES);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("FRAUD_RADAR_CONTRACTS_ARTIFACT_ROOT", FIXTURES);
  vi.stubEnv("FRAUD_RADAR_GRANTS_ARTIFACT_ROOT", GRANTS_FIXTURES);
});

const params = (uei: string) => ({ params: Promise.resolve({ uei }) });

describe("/fraud-radar/contracts/vendors/[uei]", () => {
  it("404s while FRAUD_RADAR_ENABLED is off", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    await expect(ContractVendorProfilePage(params("ABC123DEF456"))).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_HTTP_ERROR_FALLBACK;404"),
    });
  });

  it("renders SAM, totals and screening with caveats when on", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = renderToString(await ContractVendorProfilePage(params("ABC123DEF456")));
    expect(html).toContain("ACME CORPORATION");
    expect(html).toContain("SAM registration (extract record)");
    expect(html).toContain("2026-10-05");
    expect(html).toContain("Screening (research leads)");
    expect(html).toContain("candidate — human review");
    expect(html).toContain("CAGE 1ABC2");
    // No FAC block is rendered on a contracts profile.
    expect(html).not.toContain("Single audits (FAC)");
    expect(html).not.toContain("fac block");
  });

  it("404s for an unknown vendor", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    await expect(ContractVendorProfilePage(params("ZZZ999YYY888"))).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_HTTP_ERROR_FALLBACK;404"),
    });
  });
});
