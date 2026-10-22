import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  session: null as { user?: { id?: string } } | null,
  sub: null as { status: string; currentPeriodEnd: Date; stripePriceId: string } | null,
  viewCount: 0,
}));

vi.mock("@/auth", () => ({ auth: vi.fn(async () => mocks.session) }));
vi.mock("@/lib/db", () => ({
  db: {
    subscription: { findUnique: vi.fn(async () => mocks.sub) },
    savedView: {
      findMany: vi.fn(async () => []),
      count: vi.fn(async () => mocks.viewCount),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: "view-new",
        cameraId: null,
        cameraName: null,
        createdAt: new Date("2026-10-21T12:00:00Z"),
        ...data,
      })),
      findFirst: vi.fn(async () => null),
      update: vi.fn(async () => ({})),
      delete: vi.fn(async () => ({})),
    },
  },
}));

import { GET, POST } from "./route";

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

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/vip/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as Parameters<typeof POST>[0],
  );

beforeEach(() => {
  process.env.STRIPE_WEEKLY_PRICE_ID = "price_weekly";
  process.env.STRIPE_MONTHLY_PRICE_ID = "price_monthly";
  process.env.STRIPE_ANNUAL_PRICE_ID = "price_annual";
  mocks.session = null;
  mocks.sub = null;
  mocks.viewCount = 0;
  vi.clearAllMocks();
});

describe("/api/vip/views gating", () => {
  it("401s signed-out callers on read and write", async () => {
    expect((await GET()).status).toBe(401);
    expect((await post({ name: "X", layers: ["cctv"] })).status).toBe(401);
  });
  it("403s pro and free on create, but lets them read", async () => {
    asUser("pro");
    expect((await GET()).status).toBe(200);
    expect((await post({ name: "X", layers: ["cctv"] })).status).toBe(403);
    asUser("free");
    expect((await post({ name: "X", layers: ["cctv"] })).status).toBe(403);
  });
});

describe("POST /api/vip/views — a VIP saves views", () => {
  it("saves a manual layer stack and returns its restore URL", async () => {
    asUser("vip");
    const res = await post({ name: "Storm watch", layers: ["fires", "hurricanes", "bogus"] });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.view.layers).toEqual(["fires", "hurricanes"]);
    expect(body.view.url).toBe("/?layers=fires%2Churricanes");
  });
  it("captures a view from a pasted globe URL", async () => {
    asUser("vip");
    const res = await post({
      name: "Cam view",
      fromUrl: "https://worldeye.app/?layers=cctv&camera=occ-42",
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.view).toMatchObject({ layers: ["cctv"], cameraId: "occ-42" });
  });
  it("rejects empty views and unreadable URLs", async () => {
    asUser("vip");
    expect((await post({ name: "Empty", layers: [] })).status).toBe(400);
    const bad = await post({ name: "Bad", fromUrl: "https://worldeye.app/pricing" });
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toBe("url_unreadable");
  });
});
