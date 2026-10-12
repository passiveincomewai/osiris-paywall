// Analytics unit tests: pure leaderboard ranking + UTC month window.
import { describe, it, expect } from "vitest";
import { monthWindowUtc, rankLeaderboard, type LeaderboardRow } from "./analytics";

function row(
  profileId: string,
  creations: number,
  xpEarned: number,
  campaignsCompleted: number,
): LeaderboardRow {
  return { profileId, name: profileId, creations, xpEarned, campaignsCompleted };
}

describe("monthWindowUtc", () => {
  it("spans a regular month", () => {
    const { start, end, month } = monthWindowUtc(new Date("2026-10-12T14:57:00.000Z"));
    expect(month).toBe("2026-10");
    expect(start.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });

  it("is inclusive at the first instant and exclusive at the next month", () => {
    const first = monthWindowUtc(new Date("2026-10-01T00:00:00.000Z"));
    expect(first.month).toBe("2026-10");
    expect(first.start.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    const lastMs = monthWindowUtc(new Date("2026-10-31T23:59:59.999Z"));
    expect(lastMs.month).toBe("2026-10");
    expect(lastMs.end.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    const next = monthWindowUtc(new Date("2026-11-01T00:00:00.000Z"));
    expect(next.month).toBe("2026-11");
  });

  it("rolls December into January of the next year", () => {
    const { start, end, month } = monthWindowUtc(new Date("2026-12-15T12:00:00.000Z"));
    expect(month).toBe("2026-12");
    expect(start.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("handles January and leap-year February", () => {
    const jan = monthWindowUtc(new Date("2026-01-01T00:00:00.000Z"));
    expect(jan.month).toBe("2026-01");
    expect(jan.end.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    const feb = monthWindowUtc(new Date("2028-02-29T12:00:00.000Z"));
    expect(feb.month).toBe("2028-02");
    expect(feb.start.toISOString()).toBe("2028-02-01T00:00:00.000Z");
    expect(feb.end.toISOString()).toBe("2028-03-01T00:00:00.000Z");
  });
});

describe("rankLeaderboard", () => {
  it("sorts by creations desc, then xp desc, then campaigns desc", () => {
    const entries = rankLeaderboard([
      row("a", 5, 100, 1),
      row("b", 10, 0, 0),
      row("c", 5, 200, 0),
      row("d", 5, 100, 3),
      row("e", 5, 100, 2),
    ]);
    expect(entries.map((e) => e.profileId)).toEqual(["b", "c", "d", "e", "a"]);
    expect(entries.map((e) => e.rank)).toEqual([1, 2, 3, 4, 5]);
  });

  it("keeps input order on a full tie (stable sort)", () => {
    const entries = rankLeaderboard([row("x", 3, 50, 1), row("y", 3, 50, 1), row("z", 3, 50, 1)]);
    expect(entries.map((e) => e.profileId)).toEqual(["x", "y", "z"]);
    expect(entries.map((e) => e.rank)).toEqual([1, 2, 3]);
  });

  it("caps at 25 entries", () => {
    const rows = Array.from({ length: 30 }, (_, i) => row(`p${i}`, 100 - i, 0, 0));
    const entries = rankLeaderboard(rows);
    expect(entries).toHaveLength(25);
    expect(entries[0].profileId).toBe("p0");
    expect(entries[24].profileId).toBe("p24");
    expect(entries[24].rank).toBe(25);
  });

  it("returns an empty list for no rows and does not mutate its input", () => {
    expect(rankLeaderboard([])).toEqual([]);
    const input = [row("b", 1, 0, 0), row("a", 2, 0, 0)];
    rankLeaderboard(input);
    expect(input.map((r) => r.profileId)).toEqual(["b", "a"]);
  });
});
