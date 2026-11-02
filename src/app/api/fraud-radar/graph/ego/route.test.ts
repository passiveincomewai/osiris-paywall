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
const req = (qs: string, ip: string) =>
  new NextRequest(`http://localhost/api/fraud-radar/graph/ego?${qs}`, {
    headers: { "x-forwarded-for": ip },
  });

describe("/api/fraud-radar/graph/ego", () => {
  it("404s while the flag is off", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    expect((await GET(req("engine=grants&key=ABC123DEF456", "10.0.0.1"))).status).toBe(404);
  });
  it("serves the ego with the composite dataset version when on", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const res = await GET(req("engine=grants&key=ABC123DEF456", "10.0.0.2"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.datasetVersion).toContain("2026-10-06");
    expect(body.ego.entityKey).toBe("UEI:ABC123DEF456");
    expect(body.candidateSentence).toContain("81.3834%");
  });
  it("404s ego_not_published for an entity with no ego entry", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const res = await GET(req("engine=grants&key=ZZZ999YYY888", "10.0.0.3"));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("ego_not_published");
  });
  it("rate-limits past 60 requests/minute/IP with limit + reset stated (§7.3)", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    let last;
    for (let i = 0; i < 61; i++) last = await GET(req("engine=grants&key=ABC123DEF456", "10.0.0.9"));
    expect(last!.status).toBe(429);
    const body = await last!.json();
    expect(body.limit).toBe(60);
    expect(typeof body.resetAt).toBe("number");
  });
});
