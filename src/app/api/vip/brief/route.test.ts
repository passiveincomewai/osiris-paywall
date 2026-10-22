import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  session: null as { user?: { id?: string } } | null,
  sub: null as { status: string; currentPeriodEnd: Date; stripePriceId: string } | null,
  brief: { generatedAt: "2026-10-21T12:00:00Z", places: [] } as unknown,
  prefSet: [] as { userId: string; enabled: boolean }[],
}));

vi.mock("@/auth", () => ({ auth: vi.fn(async () => mocks.session) }));
vi.mock("@/lib/db", () => ({
  db: {
    subscription: { findUnique: vi.fn(async () => mocks.sub) },
  },
}));
vi.mock("@/lib/vip/brief", () => ({
  buildBrief: vi.fn(async () => mocks.brief),
  setBriefEmail: vi.fn(async (userId: string, enabled: boolean) => {
    mocks.prefSet.push({ userId, enabled });
  }),
}));

import { GET, PUT } from "./route";

const FUTURE = new Date("2027-10-21T12:00:00Z");
const asUser = (tier: "vip" | "pro" | "free") => {
  mocks.session = { user: { id: "user-1" } };
  mocks.sub =
    tier === "free"
      ? null
      : {
          status: "active",
          currentPeriodEnd: FUTURE,
          stripePriceId: tier === "vip" ? "price_annual" : "price_monthly",
        };
};

const put = (body: unknown) =>
  PUT(
    new Request("http://localhost/api/vip/brief", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as Parameters<typeof PUT>[0],
  );

beforeEach(() => {
  process.env.STRIPE_WEEKLY_PRICE_ID = "price_weekly";
  process.env.STRIPE_MONTHLY_PRICE_ID = "price_monthly";
  process.env.STRIPE_ANNUAL_PRICE_ID = "price_annual";
  mocks.session = null;
  mocks.sub = null;
  mocks.prefSet = [];
  vi.clearAllMocks();
});

describe("/api/vip/brief — VIP-only end to end", () => {
  it("401s signed-out callers", async () => {
    expect((await GET()).status).toBe(401);
    expect((await put({ emailEnabled: true })).status).toBe(401);
  });
  it("403s pro and free members — the brief has no lapsed read mode", async () => {
    asUser("pro");
    expect((await GET()).status).toBe(403);
    expect((await put({ emailEnabled: true })).status).toBe(403);
    asUser("free");
    expect((await GET()).status).toBe(403);
  });
  it("serves the brief to a VIP and records the email opt-in", async () => {
    asUser("vip");
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).vip).toBe(true);
    const putRes = await put({ emailEnabled: true });
    expect(putRes.status).toBe(200);
    expect(mocks.prefSet).toEqual([{ userId: "user-1", enabled: true }]);
  });
});
