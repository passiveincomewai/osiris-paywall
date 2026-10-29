import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { fileURLToPath } from "node:url";

/**
 * Healthcare landing tests (Phase 2): flag gate + the published
 * dataset's headline figures rendered with their provenance. The
 * artifact lib runs for real against schema-true fixtures; the Neon
 * national grain is mocked out (its absence must degrade, not crash).
 */
vi.mock("@/lib/fraud-radar/healthcare-neon", () => ({
  listMonthlyNational: async () => null,
  listHcpcsSummaries: async () => null,
  getHcpcsSummary: async () => null,
}));

import HealthcarePage from "./page";

const FIXTURES = fileURLToPath(
  new URL("../../../../lib/fraud-radar/__fixtures__/healthcare", import.meta.url),
);

beforeAll(() => {
  vi.stubEnv("FRAUD_RADAR_ARTIFACT_ROOT", FIXTURES);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("FRAUD_RADAR_ARTIFACT_ROOT", FIXTURES);
});

function notFoundDigest(fn: () => Promise<unknown>): Promise<string> {
  return fn().then(
    () => "",
    (e: unknown) => (e as { digest?: string })?.digest ?? "",
  );
}

describe("/fraud-radar/healthcare — flag gate + landing", () => {
  it("404s while FRAUD_RADAR_ENABLED is off", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    const digest = await notFoundDigest(() => HealthcarePage());
    expect(digest === "NEXT_NOT_FOUND" || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404")).toBe(true);
  });

  it("renders dataset totals with provenance when enabled", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = renderToString(await HealthcarePage());
    expect(html).toContain("1,842,123");
    expect(html).toContain("$1,104,647,992,692.41");
    expect(html).toContain("excluding flagged outlier cells");
    expect(html).toContain("/fraud-radar/healthcare/providers");
    expect(html).toContain("/fraud-radar/healthcare/hcpcs");
    expect(html).toContain("research lead");
    // Provenance block rides along with the figures:
    expect(html).toContain("About this data");
    expect(html).toContain("2026-301");
  });
});
