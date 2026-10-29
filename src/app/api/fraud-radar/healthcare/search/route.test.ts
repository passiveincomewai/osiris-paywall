import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { fileURLToPath } from "node:url";

/**
 * Search API tests (Phase 2): the flag-off 404 is the isolation
 * contract (AUDIT §13.3) — with the flag off the route is
 * indistinguishable from one that does not exist.
 */
import { GET } from "./route";

const FIXTURES = fileURLToPath(
  new URL("../../../../../lib/fraud-radar/__fixtures__/healthcare", import.meta.url),
);

beforeAll(() => {
  vi.stubEnv("FRAUD_RADAR_ARTIFACT_ROOT", FIXTURES);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("FRAUD_RADAR_ARTIFACT_ROOT", FIXTURES);
});

const req = (qs: string) =>
  new NextRequest(`http://localhost/api/fraud-radar/healthcare/search?${qs}`);

describe("/api/fraud-radar/healthcare/search", () => {
  it("404s while FRAUD_RADAR_ENABLED is off", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    const res = await GET(req("q=123"));
    expect(res.status).toBe(404);
  });

  it("serves ranked provider results with the dataset version when on", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const res = await GET(req("q=123"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.datasetVersion).toBe("2026-02-09");
    expect(body.total).toBe(3);
    expect(body.results[0].npi).toBe("1234567891");
    // Absence survives JSON serialization as null, never 0:
    expect(body.results[0].billingPaidExclUsd).toBeNull();
  });

  it("reports too-short queries honestly", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const res = await GET(req("q=12"));
    const body = await res.json();
    expect(body.error).toBe("too_short");
    expect(body.total).toBe(0);
  });
});
