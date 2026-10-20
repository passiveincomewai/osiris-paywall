import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  session: null as { user?: { id?: string } } | null,
  sub: null as { status: string; currentPeriodEnd: Date; stripePriceId: string } | null,
  activeCount: 0,
  ruleById: new Map<string, Record<string, unknown>>(),
}));

vi.mock("@/auth", () => ({ auth: vi.fn(async () => mocks.session) }));
vi.mock("@/lib/db", () => ({
  db: {
    subscription: { findUnique: vi.fn(async () => mocks.sub) },
    alertRule: {
      findMany: vi.fn(async () => []),
      count: vi.fn(async () => mocks.activeCount),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: "rule-new",
        lastVerdict: "unknown",
        lastCheckedAt: null,
        lastAlertedAt: null,
        createdAt: new Date("2026-10-20T12:00:00Z"),
        ...data,
      })),
      findFirst: vi.fn(async ({ where }: { where: { id: string; userId: string } }) => {
        const r = mocks.ruleById.get(where.id);
        return r && r.userId === where.userId ? r : null;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const r = mocks.ruleById.get(where.id) ?? {};
        return { ...r, ...data };
      }),
      delete: vi.fn(async () => ({})),
    },
    alertEvent: {
      findMany: vi.fn(async () => []),
      count: vi.fn(async () => 0),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
  },
}));
vi.mock("@/lib/vision/frames", () => ({
  catalogue: vi.fn(async () => ({
    cameras: new Map([
      ["cam-still", { id: "cam-still", name: "Server Camera Name", still: "https://x/still.jpg" }],
      ["cam-stream", { id: "cam-stream", name: "Stream Only", still: null }],
    ]),
  })),
}));

import { GET, POST } from "./route";
import { PATCH, DELETE } from "./[id]/route";
import { CAP_MESSAGE } from "@/lib/camera-alerts/logic";

const FUTURE = new Date("2027-10-20T12:00:00Z");
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
    new Request("http://localhost/api/camera-alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as Parameters<typeof POST>[0],
  );
const patch = (id: string, body: unknown) =>
  PATCH(
    new Request(`http://localhost/api/camera-alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as Parameters<typeof PATCH>[0],
    { params: Promise.resolve({ id }) },
  );
const del = (id: string) =>
  DELETE(new Request(`http://localhost/api/camera-alerts/${id}`, { method: "DELETE" }) as Parameters<typeof DELETE>[0], {
    params: Promise.resolve({ id }),
  });

beforeEach(() => {
  process.env.STRIPE_WEEKLY_PRICE_ID = "price_weekly";
  process.env.STRIPE_MONTHLY_PRICE_ID = "price_monthly";
  process.env.STRIPE_ANNUAL_PRICE_ID = "price_annual";
  mocks.session = null;
  mocks.sub = null;
  mocks.activeCount = 0;
  mocks.ruleById = new Map();
  vi.clearAllMocks();
});

describe("GET /api/camera-alerts", () => {
  it("401s signed-out callers", async () => {
    expect((await GET()).status).toBe(401);
  });
  it("reports the tier and the cap to the owner", async () => {
    asUser("vip");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ tier: "vip", vip: true, maxActive: 10, rules: [], events: [] });
  });
});

describe("POST /api/camera-alerts — creation is VIP-only", () => {
  const good = { cameraId: "cam-still", condition: "snow on the road" };
  it("401 signed out, 403 for pro and free members", async () => {
    expect((await post(good)).status).toBe(401);
    asUser("pro");
    const res = await post(good);
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("vip");
    asUser("free");
    expect((await post(good)).status).toBe(403);
  });
  it("creates with the catalogue's own camera name, not the client's", async () => {
    asUser("vip");
    const res = await post({ ...good, cameraName: "Forged Name" });
    expect(res.status).toBe(201);
    expect((await res.json()).rule.cameraName).toBe("Server Camera Name");
  });
  it("refuses the 11th active rule with the honest cap message", async () => {
    asUser("vip");
    mocks.activeCount = 10;
    const res = await post(good);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(CAP_MESSAGE);
  });
  it("refuses unknown cameras and stream-only cameras, in plain words", async () => {
    asUser("vip");
    expect((await post({ cameraId: "nope", condition: "snow" })).status).toBe(400);
    const res = await post({ cameraId: "cam-stream", condition: "snow" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("live stream without still images");
  });
  it("validates the condition and the channels", async () => {
    asUser("vip");
    expect((await post({ cameraId: "cam-still", condition: "no" })).status).toBe(400);
    expect(
      (await post({ cameraId: "cam-still", condition: "snow", emailEnabled: false, inAppEnabled: false })).status,
    ).toBe(400);
  });
});

describe("PATCH/DELETE — owner-only management", () => {
  const own = {
    id: "rule-1",
    userId: "user-1",
    cameraId: "cam-still",
    cameraName: "Server Camera Name",
    condition: "snow on the road",
    emailEnabled: true,
    inAppEnabled: true,
    active: true,
    lastVerdict: "unknown",
    lastCheckedAt: null,
    lastAlertedAt: null,
    createdAt: new Date(),
  };
  it("404s for another member's rule, for both verbs", async () => {
    asUser("vip");
    mocks.ruleById.set("rule-9", { ...own, id: "rule-9", userId: "someone-else" });
    expect((await patch("rule-9", { active: false })).status).toBe(404);
    expect((await del("rule-9")).status).toBe(404);
  });
  it("pauses the owner's rule; resuming at the cap is refused", async () => {
    asUser("vip");
    mocks.ruleById.set("rule-1", { ...own });
    const res = await patch("rule-1", { active: false });
    expect(res.status).toBe(200);
    expect((await res.json()).rule.active).toBe(false);

    mocks.ruleById.set("rule-1", { ...own, active: false });
    mocks.activeCount = 10;
    expect((await patch("rule-1", { active: true })).status).toBe(409);
  });
  it("deletes the owner's rule", async () => {
    asUser("vip");
    mocks.ruleById.set("rule-1", { ...own });
    expect((await del("rule-1")).status).toBe(200);
  });
  it("a lapsed (pro-tier) owner can still pause and delete — management is not trapped", async () => {
    asUser("pro");
    mocks.ruleById.set("rule-1", { ...own });
    expect((await patch("rule-1", { active: false })).status).toBe(200);
    expect((await del("rule-1")).status).toBe(200);
  });
});
