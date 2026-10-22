import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  tiers: new Map<string, string>(),
  rules: [] as Record<string, unknown>[],
  created: [] as Record<string, unknown>[],
  emails: [] as { to: string; subject: string }[],
  failNextCreate: false,
}));

vi.mock("@/lib/db", () => ({
  db: {
    eventAlertRule: {
      findMany: vi.fn(async () => mocks.rules),
      update: vi.fn(async () => ({})),
    },
    eventAlertEvent: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        if (mocks.failNextCreate) {
          mocks.failNextCreate = false;
          throw new Error("Unique constraint failed");
        }
        mocks.created.push(data);
        return { id: `evt-${mocks.created.length}` };
      }),
      update: vi.fn(async () => ({})),
    },
  },
}));
vi.mock("@/lib/vip/tier", () => ({
  getUserTier: vi.fn(async (userId: string) => mocks.tiers.get(userId) ?? "free"),
}));
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(async (to: string, subject: string) => {
    mocks.emails.push({ to, subject });
    return true;
  }),
  appUrl: (p: string) => `https://worldeye.app${p}`,
}));
vi.mock("./feeds", () => ({
  fetchQuakes: vi.fn(async () => [
    {
      id: "q-big",
      mag: 6.1,
      place: "Offshore Somewhere",
      timeMs: Date.now() - 10 * 60_000,
      lat: 0,
      lng: 0,
      depthKm: 12,
      url: null,
    },
    {
      id: "q-small",
      mag: 3.0,
      place: "Smallville",
      timeMs: Date.now() - 5 * 60_000,
      lat: 0,
      lng: 0,
      depthKm: 5,
      url: null,
    },
  ]),
  fetchIssTle: vi.fn(async () => null),
}));
vi.mock("@/lib/launches/server", () => ({
  getLaunchesPayload: vi.fn(async () => ({
    upcoming: [
      {
        id: "ll2-x",
        name: "Rocket | Mission",
        net: new Date(Date.now() + 12 * 3_600_000).toISOString(),
        statusName: "Go for Launch",
        providerName: "Provider",
        padLocation: "Pad 39A",
      },
    ],
    previous: [],
    source: "test",
    fetchedAt: Date.now(),
    stale: false,
    upstreamCalls: 1,
  })),
}));

import { runEventAlertChecks } from "./checker";

const rule = (over: Record<string, unknown>) => ({
  id: "rule-1",
  userId: "user-1",
  kind: "quake",
  placeId: null,
  config: { minMag: 5 },
  emailEnabled: true,
  inAppEnabled: true,
  lastCheckedAt: new Date(Date.now() - 15 * 60_000),
  createdAt: new Date(Date.now() - 86_400_000),
  place: null,
  user: { email: "vip@example.com", name: "V" },
  ...over,
});

beforeEach(() => {
  mocks.tiers = new Map([["user-1", "vip"]]);
  mocks.rules = [];
  mocks.created = [];
  mocks.emails = [];
  mocks.failNextCreate = false;
  vi.clearAllMocks();
});

describe("runEventAlertChecks", () => {
  it("fires + emails for a VIP owner's matching quake, not the small one", async () => {
    mocks.rules = [rule({})];
    const summary = await runEventAlertChecks();
    expect(summary.eventsCreated).toBe(1);
    expect(mocks.created[0]).toMatchObject({ dedupeKey: "quake:q-big", kind: "quake" });
    expect(mocks.emails).toHaveLength(1);
    expect(mocks.emails[0].subject).toContain("M6.1");
  });

  it("pauses (skips) rules whose owner is no longer VIP — nothing fires, nothing is deleted", async () => {
    mocks.tiers.set("user-1", "pro");
    mocks.rules = [rule({})];
    const summary = await runEventAlertChecks();
    expect(summary.skippedNotVip).toBe(1);
    expect(summary.eventsCreated).toBe(0);
    expect(mocks.emails).toHaveLength(0);
  });

  it("is idempotent: a duplicate dedupeKey create failure is swallowed, no email", async () => {
    mocks.rules = [rule({})];
    mocks.failNextCreate = true;
    const summary = await runEventAlertChecks();
    expect(summary.eventsCreated).toBe(0);
    expect(mocks.emails).toHaveLength(0);
  });

  it("fires launch lead-window alerts for VIP owners", async () => {
    mocks.rules = [
      rule({ id: "rule-2", kind: "launch", config: { leadHours: [24, 1] } }),
    ];
    const summary = await runEventAlertChecks();
    expect(summary.eventsCreated).toBe(1);
    expect(mocks.created[0]).toMatchObject({ dedupeKey: "launch:ll2-x:24h" });
  });

  it("records email-off rules as events without sending", async () => {
    mocks.rules = [rule({ emailEnabled: false })];
    const summary = await runEventAlertChecks();
    expect(summary.eventsCreated).toBe(1);
    expect(summary.emailsSent).toBe(0);
  });
});
