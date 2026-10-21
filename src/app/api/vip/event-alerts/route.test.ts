import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  session: null as { user?: { id?: string } } | null,
  sub: null as { status: string; currentPeriodEnd: Date; stripePriceId: string } | null,
  activeCount: 0,
  placeById: new Map<string, { id: string; userId: string }>(),
}));

vi.mock("@/auth", () => ({ auth: vi.fn(async () => mocks.session) }));
vi.mock("@/lib/db", () => ({
  db: {
    subscription: { findUnique: vi.fn(async () => mocks.sub) },
    vipPlace: {
      findFirst: vi.fn(
        async ({ where }: { where: { id: string; userId: string } }) => {
          const p = mocks.placeById.get(where.id);
          return p && p.userId === where.userId ? { ...p, name: "Home" } : null;
        },
      ),
      findMany: vi.fn(async () => []),
      count: vi.fn(async () => 0),
    },
    eventAlertRule: {
      findMany: vi.fn(async () => []),
      count: vi.fn(async () => mocks.activeCount),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: "rule-new",
        place: null,
        lastCheckedAt: null,
        createdAt: new Date("2026-10-21T12:00:00Z"),
        ...data,
      })),
      findFirst: vi.fn(async () => null),
      update: vi.fn(async () => ({})),
      delete: vi.fn(async () => ({})),
    },
    eventAlertEvent: {
      findMany: vi.fn(async () => []),
      count: vi.fn(async () => 0),
      updateMany: vi.fn(async () => ({ count: 0 })),
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
    new Request("http://localhost/api/vip/event-alerts", {
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
  mocks.activeCount = 0;
  mocks.placeById = new Map([["place-1", { id: "place-1", userId: "user-1" }]]);
  vi.clearAllMocks();
});

describe("GET /api/vip/event-alerts", () => {
  it("401s signed-out callers", async () => {
    expect((await GET()).status).toBe(401);
  });
  it("is readable by any signed-in owner and reports the tier honestly", async () => {
    asUser("pro");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ tier: "pro", vip: false, maxActive: 15, rules: [], events: [] });
  });
});

describe("POST /api/vip/event-alerts — creation is VIP-only", () => {
  const quake = { kind: "quake", config: { minMag: 5 } };
  it("401 signed out, 403 for pro and free", async () => {
    expect((await post(quake)).status).toBe(401);
    asUser("pro");
    expect((await post(quake)).status).toBe(403);
    asUser("free");
    expect((await post(quake)).status).toBe(403);
  });
  it("creates a worldwide quake rule for a VIP", async () => {
    asUser("vip");
    const res = await post(quake);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.rule).toMatchObject({ kind: "quake", config: { minMag: 5 }, placeId: null });
  });
  it("creates a place-scoped quake rule and an ISS rule with its place", async () => {
    asUser("vip");
    const scoped = await post({ kind: "quake", config: { minMag: 4.5 }, placeId: "place-1" });
    expect(scoped.status).toBe(201);
    const iss = await post({
      kind: "iss",
      config: { minElevationDeg: 30, leadHours: 6 },
      placeId: "place-1",
    });
    expect(iss.status).toBe(201);
  });
  it("rejects an ISS rule without a place, a foreign place, and bad configs", async () => {
    asUser("vip");
    const noPlace = await post({ kind: "iss", config: { minElevationDeg: 30, leadHours: 6 } });
    expect(noPlace.status).toBe(400);
    expect((await noPlace.json()).error).toBe("place_required");
    const foreign = await post({ kind: "quake", config: { minMag: 5 }, placeId: "place-999" });
    expect(foreign.status).toBe(400);
    expect((await foreign.json()).error).toBe("place_not_found");
    const bad = await post({ kind: "quake", config: { minMag: 1 } });
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toBe("min_mag_invalid");
  });
  it("enforces the active-rule cap", async () => {
    asUser("vip");
    mocks.activeCount = 15;
    const res = await post(quake);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("rule_limit");
  });
});
