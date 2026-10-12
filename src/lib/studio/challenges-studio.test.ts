// Studio challenge helpers: distinctUtcDays (pure) + the seeded Studio
// challenges that rely on the new metrics.
import { describe, it, expect } from "vitest";
import { distinctUtcDays, SEEDED_CHALLENGES } from "../affiliate/challenges";

describe("distinctUtcDays", () => {
  it("returns 0 for no dates and 1 for a single date", () => {
    expect(distinctUtcDays([])).toBe(0);
    expect(distinctUtcDays([new Date("2026-10-12T10:00:00.000Z")])).toBe(1);
  });

  it("collapses same-day duplicates (UTC)", () => {
    expect(
      distinctUtcDays([
        new Date("2026-10-12T00:00:00.000Z"),
        new Date("2026-10-12T12:34:56.000Z"),
        new Date("2026-10-12T23:59:59.999Z"),
      ]),
    ).toBe(1);
  });

  it("counts distinct UTC days across a UTC boundary", () => {
    // 23:59:59.999Z and 00:00:00.000Z next day are 1ms apart but 2 UTC days.
    expect(
      distinctUtcDays([
        new Date("2026-10-12T23:59:59.999Z"),
        new Date("2026-10-13T00:00:00.000Z"),
      ]),
    ).toBe(2);
    // Same instant expressed twice still counts once.
    expect(
      distinctUtcDays([
        new Date("2026-10-12T23:59:59.999Z"),
        new Date("2026-10-12T23:59:59.999Z"),
        new Date("2026-10-13T00:00:00.000Z"),
        new Date("2026-10-14T05:00:00.000Z"),
      ]),
    ).toBe(3);
  });

  it("uses UTC days, not local days", () => {
    // 2026-10-12T01:00Z is still Oct 11 in US timezones but Oct 12 in UTC;
    // 2026-10-11T23:00Z is Oct 11 UTC — two distinct UTC days.
    expect(
      distinctUtcDays([
        new Date("2026-10-11T23:00:00.000Z"),
        new Date("2026-10-12T01:00:00.000Z"),
      ]),
    ).toBe(2);
  });
});

describe("seeded Studio challenges", () => {
  it("seeds the four monthly Studio challenges with spec targets/XP", () => {
    const bySlug = new Map(SEEDED_CHALLENGES.map((c) => [c.slug, c]));
    expect(bySlug.get("monthly-studio-creator")).toMatchObject({
      kind: "monthly",
      metric: "studio_creations",
      target: 10,
      xpReward: 600,
      description: "Save 10 creations in the Studio this month",
    });
    expect(bySlug.get("monthly-studio-days")).toMatchObject({
      kind: "monthly",
      metric: "studio_days",
      target: 7,
      xpReward: 500,
      description: "Create on 7 different days this month",
    });
    expect(bySlug.get("monthly-studio-video")).toMatchObject({
      kind: "monthly",
      metric: "studio_videos",
      target: 1,
      xpReward: 300,
      description: "Personalize a video in the Studio",
    });
    expect(bySlug.get("monthly-studio-campaign")).toMatchObject({
      kind: "monthly",
      metric: "campaign_joins",
      target: 1,
      xpReward: 400,
      description: "Join a Studio campaign",
    });
  });
});
