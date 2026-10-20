import { describe, it, expect, vi, beforeEach } from "vitest";

const store = vi.hoisted(() => ({
  rules: [] as Record<string, unknown>[],
  events: [] as Record<string, unknown>[],
  seq: 0,
}));

vi.mock("@/auth", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/lib/db", () => ({
  db: {
    alertRule: {
      findMany: vi.fn(async ({ where, take }: { where: { active: boolean }; take: number }) =>
        store.rules
          .filter((r) => r.active === where.active)
          .sort((a, b) => {
            const at = (a.lastCheckedAt as Date | null)?.getTime() ?? -1;
            const bt = (b.lastCheckedAt as Date | null)?.getTime() ?? -1;
            return at - bt;
          })
          .slice(0, take)
          .map((r) => ({ ...r })),
      ),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const r = store.rules.find((x) => x.id === where.id);
        if (r) Object.assign(r, data);
        return r ?? {};
      }),
    },
    alertEvent: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const e = { id: `evt-${++store.seq}`, createdAt: new Date(), readAt: null, emailSent: false, ...data };
        store.events.push(e);
        return e;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const e = store.events.find((x) => x.id === where.id);
        if (e) Object.assign(e, data);
        return e ?? {};
      }),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    user: { findUnique: vi.fn(async () => ({ email: "vip@example.com" })) },
    subscription: { findUnique: vi.fn(async () => null) },
  },
}));

import { runAlertChecks, type AlertCheckDeps } from "./checker";
import { MAX_RULES_PER_RUN } from "./logic";

const NOW = new Date("2026-10-20T12:00:00Z");
const FRAME = {
  name: "Powder Mountain Rd",
  at: "2026-10-20T11:40:00.000Z",
  image: { mime: "image/jpeg", data: "BASE64STILL" },
};

function rule(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "rule-1",
    userId: "user-1",
    cameraId: "cam-1",
    cameraName: "Powder Mountain Rd",
    condition: "snow on the road",
    emailEnabled: true,
    inAppEnabled: true,
    active: true,
    matchNotified: false,
    lastAlertedAt: null,
    lastCheckedAt: null,
    ...over,
  };
}

function deps(over: Partial<AlertCheckDeps> = {}): AlertCheckDeps {
  return {
    now: () => NOW,
    frame: vi.fn(async () => FRAME),
    vision: vi.fn(async () => ({ verdict: "matches" as const, observation: "Snow covers both lanes." })),
    tierOf: vi.fn(async () => "vip" as const),
    mail: vi.fn(async () => true),
    userEmail: vi.fn(async () => "vip@example.com"),
    ...over,
  };
}

beforeEach(() => {
  store.rules = [];
  store.events = [];
  store.seq = 0;
  vi.clearAllMocks();
});

describe("runAlertChecks", () => {
  it("alerts on a clear→matches transition: event with the still, one email, rule state updated", async () => {
    store.rules = [rule()];
    const d = deps();
    const s = await runAlertChecks(d);
    expect(s).toMatchObject({ checked: 1, alerted: 1 });
    expect(store.events).toHaveLength(1);
    expect(store.events[0]).toMatchObject({
      ruleId: "rule-1",
      userId: "user-1",
      observation: "Snow covers both lanes.",
      imageJpeg: "BASE64STILL",
      emailSent: true,
      readAt: null,
    });
    expect(store.events[0].frameAt).toEqual(new Date("2026-10-20T11:40:00.000Z"));
    expect(d.mail).toHaveBeenCalledTimes(1);
    const [, subject, html] = (d.mail as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(subject).toContain("Powder Mountain Rd");
    expect(html).toContain("Snow covers both lanes.");
    const r = store.rules[0];
    expect(r.lastVerdict).toBe("matches");
    expect(r.matchNotified).toBe(true);
    expect(r.lastAlertedAt).toEqual(NOW);
    expect(r.lastCheckedAt).toEqual(NOW);
  });

  it("does not alert again while the same episode keeps matching", async () => {
    store.rules = [rule({ matchNotified: true, lastAlertedAt: new Date("2026-10-20T09:00:00Z") })];
    const d = deps();
    const s = await runAlertChecks(d);
    expect(s.alerted).toBe(0);
    expect(store.events).toHaveLength(0);
    expect(d.mail).not.toHaveBeenCalled();
  });

  it("a clear check ends the episode so a later match can alert again", async () => {
    store.rules = [rule({ matchNotified: true, lastAlertedAt: new Date("2026-10-20T06:00:00Z") })];
    const d = deps({ vision: vi.fn(async () => ({ verdict: "clear" as const, observation: "Dry asphalt." })) });
    const s = await runAlertChecks(d);
    expect(s.alerted).toBe(0);
    expect(store.rules[0].matchNotified).toBe(false);
    expect(store.rules[0].lastVerdict).toBe("clear");
  });

  it("respects the 2h cooldown: a fresh match inside it stays pending, no event, no email", async () => {
    store.rules = [rule({ lastAlertedAt: new Date(NOW.getTime() - 3600_000) })];
    const d = deps();
    const s = await runAlertChecks(d);
    expect(s.alerted).toBe(0);
    expect(store.events).toHaveLength(0);
    expect(store.rules[0].matchNotified).toBe(false);
    expect(store.rules[0].lastVerdict).toBe("matches");
  });

  it("a missing still is verdict unknown — recorded, never alerted", async () => {
    store.rules = [rule()];
    const d = deps({ frame: vi.fn(async () => null) });
    const s = await runAlertChecks(d);
    expect(s.alerted).toBe(0);
    expect(store.rules[0].lastVerdict).toBe("unknown");
    expect(store.rules[0].lastCheckedAt).toEqual(NOW);
    expect(store.events).toHaveLength(0);
  });

  it("a vision failure is verdict unknown — never alerted", async () => {
    store.rules = [rule()];
    const d = deps({ vision: vi.fn(async () => { throw new Error("OPENAI_500"); }) });
    const s = await runAlertChecks(d);
    expect(s.alerted).toBe(0);
    expect(store.rules[0].lastVerdict).toBe("unknown");
  });

  it("skips rules whose owner is no longer VIP (paused, not deleted) and never fetches a frame", async () => {
    store.rules = [rule()];
    const d = deps({ tierOf: vi.fn(async () => "pro" as const) });
    const s = await runAlertChecks(d);
    expect(s).toMatchObject({ checked: 0, skippedNotVip: 1 });
    expect(d.frame).not.toHaveBeenCalled();
    expect(store.rules[0].lastCheckedAt).toEqual(NOW); // stamp advances; rule survives
  });

  it("skips rules checked inside the interval window", async () => {
    store.rules = [rule({ lastCheckedAt: new Date(NOW.getTime() - 5 * 60_000) })];
    const d = deps();
    const s = await runAlertChecks(d);
    expect(s).toMatchObject({ checked: 0, skippedNotDue: 1 });
    expect(d.frame).not.toHaveBeenCalled();
  });

  it("caps vision work per run", async () => {
    store.rules = Array.from({ length: MAX_RULES_PER_RUN + 5 }, (_, i) =>
      rule({ id: `rule-${i}`, cameraId: `cam-${i}` }),
    );
    const d = deps({ vision: vi.fn(async () => ({ verdict: "clear" as const, observation: "Fine." })) });
    const s = await runAlertChecks(d);
    expect(s.checked).toBe(MAX_RULES_PER_RUN);
  });

  it("email-only rules create already-read events; in-app-only rules send no email", async () => {
    store.rules = [
      rule({ id: "email-only", emailEnabled: true, inAppEnabled: false }),
      rule({ id: "app-only", cameraId: "cam-2", emailEnabled: false, inAppEnabled: true }),
    ];
    const d = deps();
    await runAlertChecks(d);
    expect(store.events).toHaveLength(2);
    const emailOnly = store.events.find((e) => e.ruleId === "email-only");
    const appOnly = store.events.find((e) => e.ruleId === "app-only");
    expect(emailOnly?.readAt).toEqual(NOW);
    expect(appOnly?.readAt).toBeNull();
    expect(d.mail).toHaveBeenCalledTimes(1);
  });
});
