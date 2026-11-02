import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { fileURLToPath } from "node:url";
import { GET } from "./route";

const FIXTURES = fileURLToPath(
  new URL("../../../../../lib/fraud-radar/__fixtures__/graphs", import.meta.url),
);
beforeAll(() => { vi.stubEnv("FRAUD_RADAR_GRAPHS_ARTIFACT_ROOT", FIXTURES); });
afterEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("FRAUD_RADAR_GRAPHS_ARTIFACT_ROOT", FIXTURES);
});
const req = (qs: string) =>
  new NextRequest(`http://localhost/api/fraud-radar/graph/search?${qs}`, {
    headers: { "x-forwarded-for": "10.1.0.1" },
  });

describe("/api/fraud-radar/graph/search", () => {
  it("404s while the flag is off", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    expect((await GET(req("q=ABC"))).status).toBe(404);
  });
  it("reports index_not_published honestly (no idx tree published by G4)", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const res = await GET(req("q=ABC"));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("index_not_published");
  });
});
