import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { fileURLToPath } from "node:url";
import { GET } from "./route";

const FIXTURES = fileURLToPath(
  new URL("../../../../../lib/fraud-radar/__fixtures__/geo", import.meta.url),
);
beforeAll(() => { vi.stubEnv("FRAUD_RADAR_GEO_ARTIFACT_ROOT", FIXTURES); });
afterEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("FRAUD_RADAR_GEO_ARTIFACT_ROOT", FIXTURES);
});
const req = (qs: string) =>
  new NextRequest(`http://localhost/api/fraud-radar/geo/states?${qs}`);

describe("/api/fraud-radar/geo/states", () => {
  it("404s while the flag is off", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    expect((await GET(req("engine=grants&measure=grants_recipient_state"))).status).toBe(404);
  });
  it("serves state cells with coverage + withheld states intact", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const res = await GET(req("engine=grants&measure=grants_recipient_state"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.coverageStatement).toContain("Coverage");
    const as = body.states.find((s: { stateCode: string }) => s.stateCode === "AS");
    expect(as.withheld).toBe(true);
  });
});
