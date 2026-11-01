import { describe, it, expect } from "vitest";
import { runPowderDigest, powderDigestEmail } from "./powder-digest";
import type { SkiEmailDeps, SkiEmailUser } from "./ski-email";
import type { ResortSnowData } from "./openmeteo";
import { getSkiResort } from "@/lib/ski-resorts";

/* Run: Thursday 2026-10-29 15:00 UTC. Resorts at UTC-7: local Thu
   2026-10-29, weekend = Fri Oct 30 / Sat Oct 31 / Sun Nov 1. */
const NOW = new Date("2026-10-29T15:00:00Z");

function snowData(weekend: [number, number, number]): ResortSnowData {
  return {
    daily: [
      { date: "2026-10-29", snowfallCm: 0 },
      { date: "2026-10-30", snowfallCm: weekend[0] },
      { date: "2026-10-31", snowfallCm: weekend[1] },
      { date: "2026-11-01", snowfallCm: weekend[2] },
    ],
    hourly: [],
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

describe("runPowderDigest", () => {
  it("ranks resorts by weekend total and dedupes the same ISO week", async () => {
    const world: FakeWorld = {
      users: { u1: USER },
      access: { u1: true },
      snow: { snowbird: snowData([5, 2, 1]), alta: snowData([10, 4, 2]) },
      sentMail: [],
      log: new Set(),
    };
    const deps = makeDeps(world, [
      { userId: "u1", resortSlug: "snowbird" },
      { userId: "u1", resortSlug: "alta" },
    ]);
    const first = await runPowderDigest({ deps });
    expect(first.sent).toBe(1);
    expect(first.weekKey).toBe("2026-W44");
    const html = world.sentMail[0].html;
    expect(html.indexOf("Alta")).toBeLessThan(html.indexOf("Snowbird")); // ranked desc
    expect(html).toContain("16.0 cm");
    expect(html).toContain("modelled");

    const second = await runPowderDigest({ deps });
    expect(second.sent).toBe(0);
    expect(second.skipped.already_sent).toBe(1);
  });

  it("skips all-zero weeks silently — no send, no log row", async () => {
    const world: FakeWorld = {
      users: { u1: USER },
      access: { u1: true },
      snow: { snowbird: snowData([0, 0, 0]) },
      sentMail: [],
      log: new Set(),
    };
    const deps = makeDeps(world, [{ userId: "u1", resortSlug: "snowbird" }]);
    const s = await runPowderDigest({ deps });
    expect(s.sent).toBe(0);
    expect(s.skipped.all_zero_week).toBe(1);
    expect(world.log.size).toBe(0);
  });

  it("does not email users without ski access", async () => {
    const world: FakeWorld = {
      users: { u1: USER },
      access: { u1: false },
      snow: { alta: snowData([9, 9, 9]) },
      sentMail: [],
      log: new Set(),
    };
    const deps = makeDeps(world, [{ userId: "u1", resortSlug: "alta" }]);
    const s = await runPowderDigest({ deps });
    expect(s.sent).toBe(0);
    expect(s.skipped.no_ski_access).toBe(1);
  });
});

describe("powderDigestEmail", () => {
  it("labels forecasts as modelled with a fetch time; no invented claims", () => {
    const resort = getSkiResort("alta")!;
    const { html } = powderDigestEmail({
      name: "Sam",
      ranked: [
        {
          resort,
          weekendCm: 16,
          days: [
            { date: "2026-10-30", snowfallCm: 10 },
            { date: "2026-10-31", snowfallCm: 4 },
            { date: "2026-11-01", snowfallCm: 2 },
          ],
        },
      ],
      fetchedAt: NOW,
      unsubscribeUrl: null,
    });
    expect(html).toContain("modelled forecasts from Open-Meteo");
    expect(html).toContain("/ski-webcams/alta");
    expect(html).not.toContain("555 E 3200 N");
    expect(html).not.toMatch(/avalanche/i);
  });
});
