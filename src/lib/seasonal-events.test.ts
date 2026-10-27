import { describe, expect, it } from "vitest";
import {
  CHERRY_BLOSSOM_FESTIVAL,
  FOLIAGE_REGIONS,
  MARDI_GRAS,
  NEW_YEARS_EVE,
  OKTOBERFEST,
  daysUntil,
  editionIsLive,
  formatDateLong,
  formatDateShort,
  formatRange,
  nextEdition,
  type SeasonalEvent,
} from "./seasonal-events";

const at = (iso: string) => new Date(`${iso}T12:00:00Z`);
const weekdayOf = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(
    new Date(`${iso}T12:00:00Z`),
  );

describe("nextEdition", () => {
  it("picks the upcoming edition for each event in late October 2026", () => {
    const now = at("2026-10-27");
    expect(nextEdition(NEW_YEARS_EVE, now)?.start).toBe("2026-12-31");
    expect(nextEdition(MARDI_GRAS, now)?.start).toBe("2027-02-09");
    expect(nextEdition(CHERRY_BLOSSOM_FESTIVAL, now)?.start).toBe("2027-03-20");
    // The 2026 Oktoberfest ended Oct 4, so the page must already be
    // talking about 2027 — a stale edition is the bug this prevents.
    expect(nextEdition(OKTOBERFEST, now)?.start).toBe("2027-09-18");
  });

  it("keeps the current edition while it is running", () => {
    expect(nextEdition(OKTOBERFEST, at("2026-09-25"))?.year).toBe(2026);
    expect(nextEdition(CHERRY_BLOSSOM_FESTIVAL, at("2027-04-01"))?.year).toBe(2027);
  });

  it("rolls to the next year once an edition ends", () => {
    expect(nextEdition(NEW_YEARS_EVE, at("2027-01-01"))?.start).toBe("2027-12-31");
    expect(nextEdition(MARDI_GRAS, at("2027-02-10"))?.start).toBe("2028-02-29");
  });

  it("returns null when the table is exhausted, so pages fall back to season framing", () => {
    expect(nextEdition(CHERRY_BLOSSOM_FESTIVAL, at("2028-01-15"))).toBeNull();
  });
});

describe("editionIsLive", () => {
  it("is true only inside the edition window", () => {
    const fest2026 = OKTOBERFEST.editions[0];
    expect(editionIsLive(fest2026, at("2026-09-19"))).toBe(true);
    expect(editionIsLive(fest2026, at("2026-10-04"))).toBe(true);
    expect(editionIsLive(fest2026, at("2026-10-05"))).toBe(false);
    expect(editionIsLive(fest2026, at("2026-09-18"))).toBe(false);
  });
});

describe("the calendar tables are internally true", () => {
  it("every Mardi Gras row is a Tuesday (Fat Tuesday, by definition)", () => {
    for (const e of MARDI_GRAS.editions) {
      expect(weekdayOf(e.start)).toBe("Tuesday");
      expect(e.start).toBe(e.end);
    }
  });

  it("every Oktoberfest opens on a Saturday and closes on a Sunday — or Oct 3 in an extension year", () => {
    for (const e of OKTOBERFEST.editions) {
      expect(weekdayOf(e.start)).toBe("Saturday");
      // The closing rule: first Sunday of October, extended to German
      // Unity Day (Oct 3) when that Sunday falls on the 1st or 2nd —
      // which is why 2028 closes on a Tuesday.
      expect(weekdayOf(e.end) === "Sunday" || e.end.endsWith("-10-03")).toBe(true);
    }
  });

  it("every New Year's Eve row is December 31 of its year", () => {
    for (const e of NEW_YEARS_EVE.editions) {
      expect(e.start).toBe(`${e.year}-12-31`);
    }
  });

  it("editions are ascending and start/end within their year", () => {
    const events: SeasonalEvent[] = [
      NEW_YEARS_EVE,
      MARDI_GRAS,
      CHERRY_BLOSSOM_FESTIVAL,
      OKTOBERFEST,
    ];
    for (const ev of events) {
      const starts = ev.editions.map((e) => e.start);
      expect([...starts].sort()).toEqual(starts);
      for (const e of ev.editions) {
        expect(e.start.startsWith(`${e.year}-`)).toBe(true);
        expect(e.end >= e.start).toBe(true);
      }
    }
  });
});

describe("formatting", () => {
  it("computes weekdays rather than trusting prose", () => {
    expect(formatDateLong("2026-12-31")).toBe("Thursday, December 31, 2026");
    expect(formatDateLong("2027-02-09")).toBe("Tuesday, February 9, 2027");
    expect(formatDateShort("2027-09-18")).toBe("Sep 18, 2027");
  });

  it("formats ranges with the year stated once", () => {
    expect(formatRange(CHERRY_BLOSSOM_FESTIVAL.editions[0])).toBe(
      "Mar 20 – Apr 11, 2027",
    );
    expect(formatRange(OKTOBERFEST.editions[1])).toBe("Sep 18 – Oct 3, 2027");
    expect(formatRange(MARDI_GRAS.editions[1])).toBe("Feb 9, 2027");
  });

  it("counts whole days to a date", () => {
    expect(daysUntil("2026-12-31", at("2026-10-27"))).toBe(65);
    expect(daysUntil("2026-10-27", at("2026-10-27"))).toBe(0);
    expect(daysUntil("2026-10-26", at("2026-10-27"))).toBe(-1);
  });
});

describe("FOLIAGE_REGIONS", () => {
  it("has unique keys, real anchors and stated radii", () => {
    const keys = FOLIAGE_REGIONS.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const r of FOLIAGE_REGIONS) {
      expect(r.anchor.lat).toBeGreaterThan(24);
      expect(r.anchor.lat).toBeLessThan(50);
      expect(r.radiusKm).toBeGreaterThanOrEqual(25);
      expect(r.peakWindow.length).toBeGreaterThan(0);
    }
  });
});
