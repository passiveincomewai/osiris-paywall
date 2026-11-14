// Campaign tick auth pins (GET/POST /api/campaigns/tick):
//  - custom x-campaign-tick-secret header == CAMPAIGN_TICK_SECRET → runs;
//  - Authorization: Bearer <CAMPAIGN_TICK_SECRET> → runs;
//  - Authorization: Bearer <CRON_SECRET> (Vercel cron) → runs, but only
//    while CRON_SECRET is configured;
//  - wrong credential → 401 when any secret is configured;
//  - no credential + admin session → runs;
//  - no credential + no admin session → 401 when configured, and the
//    503 config error when NEITHER secret is configured (fail-closed).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(async () => ({ user: { id: "admin" } }) as unknown),
  runCampaignTick: vi.fn(async () => ({
    campaigns: 0,
    sent: 0,
    failed: 0,
    suppressed: 0,
  })),
}));

vi.mock("@/lib/affiliate/admin", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/campaigns/tick", () => ({
  runCampaignTick: mocks.runCampaignTick,
}));

import { GET, POST } from "./route";

const TICK_SECRET = "tick-secret-value";
const CRON_SECRET = "cron-secret-value";

function req(headers: Record<string, string> = {}) {
  return new Request("https://worldeye.app/api/campaigns/tick", { headers });
}

beforeEach(() => {
  delete process.env.CAMPAIGN_TICK_SECRET;
  delete process.env.CRON_SECRET;
  mocks.requireAdmin.mockReset();
  mocks.requireAdmin.mockRejectedValue(new Error("not admin"));
  mocks.runCampaignTick.mockClear();
});

afterEach(() => {
  delete process.env.CAMPAIGN_TICK_SECRET;
  delete process.env.CRON_SECRET;
});

describe("campaign tick auth", () => {
  it("runs for the custom secret header", async () => {
    process.env.CAMPAIGN_TICK_SECRET = TICK_SECRET;
    const res = await GET(req({ "x-campaign-tick-secret": TICK_SECRET }));
    expect(res.status).toBe(200);
    expect(mocks.runCampaignTick).toHaveBeenCalledTimes(1);
  });

  it("runs for CAMPAIGN_TICK_SECRET presented as a Bearer token", async () => {
    process.env.CAMPAIGN_TICK_SECRET = TICK_SECRET;
    const res = await POST(
      req({ authorization: `Bearer ${TICK_SECRET}` }),
    );
    expect(res.status).toBe(200);
    expect(mocks.runCampaignTick).toHaveBeenCalledTimes(1);
  });

  it("runs for CRON_SECRET presented as a Bearer token (Vercel cron)", async () => {
    process.env.CAMPAIGN_TICK_SECRET = TICK_SECRET;
    process.env.CRON_SECRET = CRON_SECRET;
    const res = await GET(req({ authorization: `Bearer ${CRON_SECRET}` }));
    expect(res.status).toBe(200);
    expect(mocks.runCampaignTick).toHaveBeenCalledTimes(1);
  });

  it("rejects the CRON_SECRET value when CRON_SECRET is not configured", async () => {
    process.env.CAMPAIGN_TICK_SECRET = TICK_SECRET;
    const res = await GET(req({ authorization: `Bearer ${CRON_SECRET}` }));
    expect(res.status).toBe(401);
    expect(mocks.runCampaignTick).not.toHaveBeenCalled();
  });

  it("rejects a wrong custom header with 401", async () => {
    process.env.CAMPAIGN_TICK_SECRET = TICK_SECRET;
    const res = await GET(req({ "x-campaign-tick-secret": "wrong" }));
    expect(res.status).toBe(401);
    expect(mocks.runCampaignTick).not.toHaveBeenCalled();
  });

  it("rejects a wrong Bearer token with 401", async () => {
    process.env.CAMPAIGN_TICK_SECRET = TICK_SECRET;
    process.env.CRON_SECRET = CRON_SECRET;
    const res = await GET(req({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
    expect(mocks.runCampaignTick).not.toHaveBeenCalled();
  });

  it("runs for an admin session with no credential", async () => {
    process.env.CAMPAIGN_TICK_SECRET = TICK_SECRET;
    mocks.requireAdmin.mockResolvedValue({ user: { id: "admin" } });
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(mocks.runCampaignTick).toHaveBeenCalledTimes(1);
  });

  it("401s a credential-less non-admin request once a secret is configured", async () => {
    process.env.CAMPAIGN_TICK_SECRET = TICK_SECRET;
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(mocks.runCampaignTick).not.toHaveBeenCalled();
  });

  it("fails closed with 503 when neither secret is configured", async () => {
    const res = await GET(req());
    expect(res.status).toBe(503);
    expect(mocks.runCampaignTick).not.toHaveBeenCalled();
  });

  it("fails closed with 503 for a presented credential when nothing is configured", async () => {
    const res = await GET(req({ authorization: `Bearer ${CRON_SECRET}` }));
    expect(res.status).toBe(503);
    expect(mocks.runCampaignTick).not.toHaveBeenCalled();
  });
});
