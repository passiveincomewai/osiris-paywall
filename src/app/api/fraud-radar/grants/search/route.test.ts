import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { fileURLToPath } from "node:url";

/**
 * Grants search API tests (Phase 4): the flag-off 404 is the
 * isolation contract (AUDIT §13.3); results carry the dataset
 * version and award-cumulative amounts under cumulative names.
 */
import { GET } from "./route";

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

const req = (qs: string) =>
  new NextRequest(`http://localhost/api/fraud-radar/grants/search?${qs}`);

describe("/api/fraud-radar/grants/search", () => {
  it("404s while FRAUD_RADAR_ENABLED is off", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    const res = await GET(req("q=ABC1"));
    expect(res.status).toBe(404);
  });

  it("serves ranked recipient results with the dataset version when on", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const res = await GET(req("q=ABC1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.datasetVersion).toBe("2026-10-06");
    expect(body.total).toBe(2);
    expect(body.results[0].uei).toBe("ABC123DEF456");
    expect(body.results[0].obligatedAwardCumulativeUsd).toBe(5000000.5);
  });

  it("reports too-short queries honestly", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const res = await GET(req("q=AB"));
    const body = await res.json();
    expect(body.error).toBe("too_short");
    expect(body.total).toBe(0);
  });
});
