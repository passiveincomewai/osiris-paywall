import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/camera-alerts/checker", () => ({
  runAlertChecks: vi.fn(async () => ({ considered: 3, checked: 2, alerted: 1, skippedNotVip: 0, skippedNotDue: 1 })),
}));

import { GET } from "./route";

const req = (authz?: string) =>
  new Request("http://localhost/api/cron/camera-alerts", {
    headers: authz ? { authorization: authz } : {},
  }) as Parameters<typeof GET>[0];

describe("GET /api/cron/camera-alerts", () => {
  const saved = process.env.CRON_SECRET;
  beforeEach(() => {
    process.env.CRON_SECRET = "test-cron-secret";
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = saved;
  });

  it("401s without the bearer secret", async () => {
    expect((await GET(req())).status).toBe(401);
    expect((await GET(req("Bearer wrong"))).status).toBe(401);
  });

  it("runs the checker with the secret and reports the summary", async () => {
    const res = await GET(req("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, checked: 2, alerted: 1 });
  });
});
