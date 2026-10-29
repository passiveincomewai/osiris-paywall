import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { fileURLToPath } from "node:url";

/**
 * Care Programs landing tests (Phase 3): flag gate + the published
 * dataset's directory counts and derived-amount framing. The
 * artifact lib runs for real against schema-true fixtures; the Neon
 * yearly grain is mocked out (absence must degrade, not crash).
 */
vi.mock("@/lib/fraud-radar/care-neon", () => ({
  listMedicareYearly: async () => null,
  listMedicareHcpcs: async () => null,
  listHospiceProviders: async () => null,
  listHomeHealthAgencies: async () => null,
  CARE_COMPARE_VERSION: "2026-10-refresh",
}));

import CarePage from "./page";

const FIXTURES = fileURLToPath(
  new URL("../../../../lib/fraud-radar/__fixtures__/care", import.meta.url),
);

beforeAll(() => {
  vi.stubEnv("FRAUD_RADAR_CARE_ARTIFACT_ROOT", FIXTURES);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("FRAUD_RADAR_CARE_ARTIFACT_ROOT", FIXTURES);
});

describe("/fraud-radar/care — flag gate + landing", () => {
  it("404s while FRAUD_RADAR_ENABLED is off", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    let digest = "";
    try {
      await CarePage();
    } catch (e) {
      digest = (e as { digest?: string })?.digest ?? "";
    }
    expect(
      digest === "NEXT_NOT_FOUND" ||
        digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404"),
    ).toBe(true);
  });

  it("renders directory counts and the derived-amount framing when on", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = renderToString(await CarePage());
    expect(html).toContain("Medicare, hospice and home health");
    expect(html).toContain("6,669");
    expect(html).toContain("12,409");
    expect(html).toContain("derived");
    expect(html).toContain("/fraud-radar/care/medicare");
    expect(html).toContain("/fraud-radar/care/hospice");
    expect(html).toContain("research lead");
  });
});
