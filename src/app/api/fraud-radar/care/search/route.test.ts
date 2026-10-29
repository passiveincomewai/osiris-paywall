import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { fileURLToPath } from "node:url";

/**
 * Care search API tests (Phase 3): the flag-off 404 is the
 * isolation contract (AUDIT §13.3); results carry the dataset
 * version and derived amounts under derived names.
 */
import { GET } from "./route";

const FIXTURES = fileURLToPath(
  new URL("../../../../../lib/fraud-radar/__fixtures__/care", import.meta.url),
);

beforeAll(() => {
  vi.stubEnv("FRAUD_RADAR_CARE_ARTIFACT_ROOT", FIXTURES);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("FRAUD_RADAR_CARE_ARTIFACT_ROOT", FIXTURES);
});

const req = (qs: string) =>
  new NextRequest(`http://localhost/api/fraud-radar/care/search?${qs}`);

describe("/api/fraud-radar/care/search", () => {
  it("404s while FRAUD_RADAR_ENABLED is off", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    const res = await GET(req("q=1234"));
    expect(res.status).toBe(404);
  });

  it("serves ranked provider results with the dataset version when on", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const res = await GET(req("q=1234"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.datasetVersion).toBe("2022-2024");
    expect(body.total).toBe(2);
    expect(body.results[0].npi).toBe("1234567890");
    expect(body.results[0].pymtDerivedTotalUsd).toBe(1500.25);
    expect(body.results[0].yearsPresent).toEqual([2022, 2024]);
  });

  it("reports too-short queries honestly", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const res = await GET(req("q=12"));
    const body = await res.json();
    expect(body.error).toBe("too_short");
    expect(body.total).toBe(0);
  });
});
