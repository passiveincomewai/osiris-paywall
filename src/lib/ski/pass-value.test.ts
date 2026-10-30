import { describe, it, expect } from "vitest";
import {
  PassValueValidationError,
  computePassValueSummary,
  formatSkiedOn,
  getPassValueState,
  isValidMoneyCents,
  logPassDay,
  parseSkiedOn,
  removePassDay,
  upsertPassSeason,
  validateDayInput,
  validateSeasonInput,
  type SkiPassDayRow,
  type SkiPassDb,
  type SkiPassSeasonRow,
} from "./pass-value";

/* Real slugs from src/data/ski-resorts.json (SKI_RESORTS). */
const SNOWBIRD = "snowbird";
const ALTA = "alta";

describe("isValidMoneyCents", () => {
  it("accepts positive integers", () => {
    expect(isValidMoneyCents(1)).toBe(true);
    expect(isValidMoneyCents(89_900)).toBe(true);
  });
  it("rejects zero, negatives, fractions, non-numbers and absurd values", () => {
    expect(isValidMoneyCents(0)).toBe(false);
    expect(isValidMoneyCents(-100)).toBe(false);
    expect(isValidMoneyCents(99.5)).toBe(false);
    expect(isValidMoneyCents("89900")).toBe(false);
    expect(isValidMoneyCents(null)).toBe(false);
    expect(isValidMoneyCents(100_000_001)).toBe(false);
  });
});

describe("validateSeasonInput", () => {
  it("trims the label and keeps a null day price null", () => {
    expect(
      validateSeasonInput({ label: "  Ikon  ", costCents: 100_000, dayPriceCents: null }),
    ).toEqual({ label: "Ikon", costCents: 100_000, dayPriceCents: null });
  });
  it("rejects empty labels, bad costs and bad day prices", () => {
    expect(() => validateSeasonInput({ label: "", costCents: 100 })).toThrow(
      PassValueValidationError,
    );
    expect(() => validateSeasonInput({ label: "Ikon", costCents: 0 })).toThrow(
      PassValueValidationError,
    );
    expect(() =>
      validateSeasonInput({ label: "Ikon", costCents: 100, dayPriceCents: -5 }),
    ).toThrow(PassValueValidationError);
  });
});

describe("parseSkiedOn", () => {
  it("parses a real calendar date at UTC midnight", () => {
    const d = parseSkiedOn("2026-01-15");
    expect(d?.toISOString()).toBe("2026-01-15T00:00:00.000Z");
    expect(formatSkiedOn(d!)).toBe("2026-01-15");
  });
  it("rejects impossible dates and other formats", () => {
    expect(parseSkiedOn("2026-02-30")).toBeNull();
    expect(parseSkiedOn("2026-13-01")).toBeNull();
    expect(parseSkiedOn("01/15/2026")).toBeNull();
    expect(parseSkiedOn("2026-1-5")).toBeNull();
    expect(parseSkiedOn(20260115)).toBeNull();
    expect(parseSkiedOn(null)).toBeNull();
  });
});

describe("validateDayInput", () => {
  it("accepts a date with and without a known resort", () => {
    expect(validateDayInput({ skiedOn: "2026-01-15", resortSlug: SNOWBIRD })).toEqual({
      skiedOn: parseSkiedOn("2026-01-15"),
      resortSlug: SNOWBIRD,
    });
    expect(validateDayInput({ skiedOn: "2026-01-15" }).resortSlug).toBeNull();
    expect(validateDayInput({ skiedOn: "2026-01-15", resortSlug: "" }).resortSlug).toBeNull();
  });
  it("rejects unknown resorts and bad dates", () => {
    expect(() =>
      validateDayInput({ skiedOn: "2026-01-15", resortSlug: "not-a-real-resort" }),
    ).toThrow(PassValueValidationError);
    expect(() => validateDayInput({ skiedOn: "2026-02-30" })).toThrow(
      PassValueValidationError,
    );
  });
});

describe("computePassValueSummary — no day price entered", () => {
  const season = { costCents: 90_000, dayPriceCents: null };
  it("gives days + cost/day only — no break-even or value claims", () => {
    const s = computePassValueSummary(season, 9);
    expect(s.daysLogged).toBe(9);
    expect(s.costPerDayCents).toBe(10_000);
    expect(s.valueReceivedCents).toBeNull();
    expect(s.breakEvenDays).toBeNull();
    expect(s.paidForItselfOnDay).toBeNull();
    expect(s.daysToBreakEven).toBeNull();
  });
  it("cost per day is null before any day is logged", () => {
    expect(computePassValueSummary(season, 0).costPerDayCents).toBeNull();
  });
  it("rounds cost per day to whole cents", () => {
    expect(computePassValueSummary(season, 7).costPerDayCents).toBe(12_857);
  });
});

describe("computePassValueSummary — with the user's day price", () => {
  /* $900 pass, user's own $100 day price → break-even = day 9. */
  const season = { costCents: 90_000, dayPriceCents: 10_000 };
  it("break-even is ceil(cost / day price)", () => {
    expect(computePassValueSummary(season, 0).breakEvenDays).toBe(9);
    expect(
      computePassValueSummary({ costCents: 95_000, dayPriceCents: 10_000 }, 0)
        .breakEvenDays,
    ).toBe(10);
  });
  it("value received is days × the user's day price", () => {
    expect(computePassValueSummary(season, 4).valueReceivedCents).toBe(40_000);
  });
  it("before break-even: not paid for itself, counts days remaining", () => {
    const s = computePassValueSummary(season, 8);
    expect(s.paidForItselfOnDay).toBeNull();
    expect(s.daysToBreakEven).toBe(1);
  });
  it("on the break-even day the pass paid for itself on that day", () => {
    const s = computePassValueSummary(season, 9);
    expect(s.paidForItselfOnDay).toBe(9);
    expect(s.daysToBreakEven).toBe(0);
  });
  it("past break-even it stays paid for itself on the same day N", () => {
    expect(computePassValueSummary(season, 20).paidForItselfOnDay).toBe(9);
  });
});

/* ── DB layer against a fake client ─────────────────────────────── */

function fakeDb(): { client: SkiPassDb; seasons: SkiPassSeasonRow[]; days: SkiPassDayRow[] } {
  const seasons: SkiPassSeasonRow[] = [];
  const days: SkiPassDayRow[] = [];
  let seq = 0;
  const client: SkiPassDb = {
    skiPassSeason: {
      async findUnique({ where }) {
        return seasons.find(s => s.userId === where.userId) ?? null;
      },
      async upsert({ where, create, update }) {
        const existing = seasons.find(s => s.userId === where.userId);
        if (existing) {
          Object.assign(existing, update, { updatedAt: new Date() });
          return existing;
        }
        const row: SkiPassSeasonRow = {
          id: `season_${++seq}`,
          ...create,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        seasons.push(row);
        return row;
      },
    },
    skiPassDay: {
      async findMany({ where }) {
        return days
          .filter(d => d.userId === where.userId)
          .sort((a, b) => a.skiedOn.getTime() - b.skiedOn.getTime());
      },
      async findFirst({ where }) {
        return (
          days.find(
            d =>
              d.userId === where.userId &&
              d.skiedOn.getTime() === where.skiedOn.getTime() &&
              d.resortSlug === where.resortSlug,
          ) ?? null
        );
      },
      async create({ data }) {
        const row: SkiPassDayRow = {
          id: `day_${++seq}`,
          ...data,
          createdAt: new Date(),
        };
        days.push(row);
        return row;
      },
      async deleteMany({ where }) {
        const before = days.length;
        for (let i = days.length - 1; i >= 0; i--) {
          if (days[i].id === where.id && days[i].userId === where.userId) days.splice(i, 1);
        }
        return { count: before - days.length };
      },
    },
  };
  return { client, seasons, days };
}

describe("season + day flow", () => {
  it("upserts one season per user and updates it in place", async () => {
    const { client, seasons } = fakeDb();
    await upsertPassSeason("user_1", { label: "Ikon", costCents: 100_000 }, client);
    const updated = await upsertPassSeason(
      "user_1",
      { label: "Epic", costCents: 90_000, dayPriceCents: 10_000 },
      client,
    );
    expect(seasons).toHaveLength(1);
    expect(updated.label).toBe("Epic");
    expect(updated.dayPriceCents).toBe(10_000);
  });

  it("logs days idempotently, including the no-resort case", async () => {
    const { client, days } = fakeDb();
    await logPassDay("user_1", { skiedOn: "2026-01-10", resortSlug: SNOWBIRD }, client);
    await logPassDay("user_1", { skiedOn: "2026-01-10", resortSlug: SNOWBIRD }, client);
    await logPassDay("user_1", { skiedOn: "2026-01-11" }, client);
    await logPassDay("user_1", { skiedOn: "2026-01-11" }, client);
    await logPassDay("user_1", { skiedOn: "2026-01-11", resortSlug: ALTA }, client);
    expect(days).toHaveLength(3);
  });

  it("state carries the computed summary; removing a day updates it", async () => {
    const { client } = fakeDb();
    await upsertPassSeason(
      "user_1",
      { label: "Ikon", costCents: 90_000, dayPriceCents: 10_000 },
      client,
    );
    for (let d = 1; d <= 9; d++) {
      await logPassDay("user_1", { skiedOn: `2026-01-${String(d).padStart(2, "0")}` }, client);
    }
    let state = await getPassValueState("user_1", client);
    expect(state.summary?.paidForItselfOnDay).toBe(9);
    expect(state.days).toHaveLength(9);
    expect(await removePassDay("user_1", state.days[0].id, client)).toBe(true);
    state = await getPassValueState("user_1", client);
    expect(state.summary?.daysLogged).toBe(8);
    expect(state.summary?.paidForItselfOnDay).toBeNull();
    expect(await removePassDay("user_1", "day_missing", client)).toBe(false);
    /* Another user cannot delete this user's day. */
    expect(await removePassDay("user_2", state.days[0].id, client)).toBe(false);
  });

  it("empty state for a new user: no season, no summary", async () => {
    const { client } = fakeDb();
    const state = await getPassValueState("user_new", client);
    expect(state.season).toBeNull();
    expect(state.days).toEqual([]);
    expect(state.summary).toBeNull();
  });
});
