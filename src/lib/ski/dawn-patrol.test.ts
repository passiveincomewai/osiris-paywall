import { describe, it, expect } from "vitest";
import { runDawnPatrol, dawnPatrolEmail, DAWN_PATROL_THRESHOLD_CM } from "./dawn-patrol";
import type { SkiEmailDeps, SkiEmailUser } from "./ski-email";
import type { ResortSnowData, HourlySnowfall } from "./openmeteo";
import { getSkiResort } from "@/lib/ski-resorts";

/* snowbird + alta are real slugs in SKI_RESORTS. */
const NOW = new Date("2026-10-30T12:00:00Z"); // 05:00 at UTC-7 resorts

function hourlyWithTotal(totalCm: number): HourlySnowfall[] {
  // 72 hourly entries ending well past NOW; snow concentrated in the
  // trailing-24h window (local Oct 29 05:00 .. Oct 30 04:00 at UTC-7).
  const start = new Date("2026-10-28T00:00:00Z").getTime();
  return Array.from({ length: 72 }, (_, i) => {
    const t = new Date(start + i * 3600_000).toISOString().slice(0, 16);
    return { time: t, snowfallCm: i === 40 ? totalCm : 0 };
  });
}

function snowData(totalCm: number): ResortSnowData {
  return {
    daily: [],
    hourly: hourlyWithTotal(totalCm),
    utcOffsetSeconds: -25200,
    timezone: "America/Denver",
    fetchedAt: NOW,
  };
}

interface FakeWorld {
  users: Record<string, SkiEmailUser>;
  access: Record<string, boolean>;
  snow: Record<string, ResortSnowData | null>;
  sentMail: { to: string; subject: string; html: string }[];
  log: Set<string>;
}

function makeDeps(world: FakeWorld, follows: { userId: string; resortSlug: string }[]): SkiEmailDeps {
  return {
    listAllFollows: async () => follows,
    getUser: async id => world.users[id] ?? null,
    hasSkiAccess: async id => !!world.access[id],
    alreadySent: async (id, kind, key) => world.log.has(`${id}|${kind}|${key}`),
    recordSent: async (id, kind, key) => {
      world.log.add(`${id}|${kind}|${key}`);
    },
    send: async (to, subject, html) => {
      world.sentMail.push({ to, subject, html });
      return true;
    },
    fetchSnow: async resort => world.snow[resort.slug] ?? null,
    now: () => NOW,
  };
}

const USER: SkiEmailUser = { id: "u1", email: "skier@example.com", name: "Sam Skier", emailOptOut: false };

describe("runDawnPatrol", () => {
  it("sends ONE aggregated email for a user with two qualifying resorts, then dedupes the re-run", async () => {
    const world: FakeWorld = {
      users: { u1: USER },
      access: { u1: true },
      snow: { snowbird: snowData(14), alta: snowData(11) },
      sentMail: [],
      log: new Set(),
    };
    const deps = makeDeps(world, [
      { userId: "u1", resortSlug: "snowbird" },
      { userId: "u1", resortSlug: "alta" },
    ]);
    const first = await runDawnPatrol({ deps });
    expect(first.sent).toBe(1);
    expect(world.sentMail).toHaveLength(1);
    expect(world.sentMail[0].html).toContain("Snowbird");
    expect(world.sentMail[0].html).toContain("Alta");
    expect(world.sentMail[0].html).toContain("14.0 cm");
    expect(world.sentMail[0].html).toContain("modelled");
    expect(world.sentMail[0].html).toContain("555 E 3200 N, North Ogden, UT 84414");

    const second = await runDawnPatrol({ deps });
    expect(second.sent).toBe(0);
    expect(second.skipped.already_sent).toBe(1);
    expect(world.sentMail).toHaveLength(1);
  });

  it("sends nothing below the threshold, without ski access, or when opted out", async () => {
    const world: FakeWorld = {
      users: {
        u1: USER,
        u2: { id: "u2", email: "pro@example.com", name: null, emailOptOut: false },
        u3: { id: "u3", email: "out@example.com", name: null, emailOptOut: true },
      },
      access: { u1: true, u2: false, u3: true }, // u2 = Weekly/Monthly Pro: no ski
      snow: { snowbird: snowData(DAWN_PATROL_THRESHOLD_CM - 0.1), alta: snowData(30) },
      sentMail: [],
      log: new Set(),
    };
    const deps = makeDeps(world, [
      { userId: "u1", resortSlug: "snowbird" }, // below threshold
      { userId: "u2", resortSlug: "alta" },     // no ski access
      { userId: "u3", resortSlug: "alta" },     // opted out
    ]);
    const s = await runDawnPatrol({ deps });
    expect(s.sent).toBe(0);
    expect(s.skipped.no_qualifying_resort).toBe(1);
    expect(s.skipped.no_ski_access).toBe(1);
    expect(s.skipped.opted_out).toBe(1);
  });

  it("a failed resort fetch never fails the run or blocks other resorts", async () => {
    const world: FakeWorld = {
      users: { u1: USER },
      access: { u1: true },
      snow: { snowbird: null, alta: snowData(12) },
      sentMail: [],
      log: new Set(),
    };
    const deps = makeDeps(world, [
      { userId: "u1", resortSlug: "snowbird" },
      { userId: "u1", resortSlug: "alta" },
    ]);
    const s = await runDawnPatrol({ deps });
    expect(s.sent).toBe(1);
    expect(s.skipped.snow_fetch_failed).toBe(1);
    expect(world.sentMail[0].html).toContain("Alta");
    expect(world.sentMail[0].html).not.toContain("Snowbird");
  });

  it("dry run counts the send but writes no log row and sends no mail", async () => {
    const world: FakeWorld = {
      users: { u1: USER },
      access: { u1: true },
      snow: { alta: snowData(20) },
      sentMail: [],
      log: new Set(),
    };
    const deps = makeDeps(world, [{ userId: "u1", resortSlug: "alta" }]);
    const s = await runDawnPatrol({ deps, dryRun: true });
    expect(s.sent).toBe(1);
    expect(world.sentMail).toHaveLength(0);
    expect(world.log.size).toBe(0);
  });
});

describe("dawnPatrolEmail", () => {
  it("labels the data modelled with a fetch time and links the resort camera page", () => {
    const resort = getSkiResort("snowbird")!;
    const { subject, html } = dawnPatrolEmail({
      name: "Sam",
      hits: [{ resort, snowCm: 12.3 }],
      fetchedAt: NOW,
      unsubscribeUrl: null,
    });
    expect(subject).toContain("Snowbird");
    expect(html).toContain("modelled by Open-Meteo");
    expect(html).toContain("/ski-webcams/snowbird");
    expect(html).toContain("12:00 UTC");
    expect(html).not.toMatch(/avalanche/i);
    expect(html).not.toMatch(/snow stake/i);
  });
});
