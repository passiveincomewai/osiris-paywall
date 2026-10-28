import { describe, expect, it } from "vitest";
import {
  BALLOON_FIESTA,
  BOSTON_MARATHON,
  CHERRY_BLOSSOM_FESTIVAL,
  FOLIAGE_REGIONS,
  FOURTH_OF_JULY,
  JULY4_REGIONS,
  MACYS_PARADE,
  MARDI_GRAS,
  NEW_YEARS_EVE,
  NYC_MARATHON,
  OKTOBERFEST,
  ROSE_PARADE,
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
      MACYS_PARADE,
      NYC_MARATHON,
      FOURTH_OF_JULY,
      BOSTON_MARATHON,
      ROSE_PARADE,
      BALLOON_FIESTA,
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

describe("Wave C events (2026-10-27)", () => {
  const dom = (iso: string) => Number(iso.slice(8, 10));

  it("every Macy's Parade row is its year's fourth Thursday of November", () => {
    for (const e of MACYS_PARADE.editions) {
      expect(e.start).toBe(e.end);
      expect(e.start.slice(5, 7)).toBe("11");
      expect(weekdayOf(e.start)).toBe("Thursday");
      // Fourth Thursday falls on the 22nd–28th.
      expect(dom(e.start)).toBeGreaterThanOrEqual(22);
      expect(dom(e.start)).toBeLessThanOrEqual(28);
    }
  });

  it("every NYC Marathon row is its November's first Sunday", () => {
    for (const e of NYC_MARATHON.editions) {
      expect(e.start).toBe(e.end);
      expect(e.start.slice(5, 7)).toBe("11");
      expect(weekdayOf(e.start)).toBe("Sunday");
      expect(dom(e.start)).toBeLessThanOrEqual(7);
    }
    // The 2026 row is the published date the dated hub was built on.
    expect(NYC_MARATHON.editions[0].start).toBe("2026-11-01");
  });

  it("every Fourth of July row is July 4 of its year, starting 2027", () => {
    for (const e of FOURTH_OF_JULY.editions) {
      expect(e.start).toBe(`${e.year}-07-04`);
      expect(e.start).toBe(e.end);
    }
    expect(FOURTH_OF_JULY.editions[0].year).toBe(2027);
  });

  it("every Boston Marathon row is its April's third Monday", () => {
    for (const e of BOSTON_MARATHON.editions) {
      expect(e.start).toBe(e.end);
      expect(e.start.slice(5, 7)).toBe("04");
      expect(weekdayOf(e.start)).toBe("Monday");
      // Third Monday falls on the 15th–21st.
      expect(dom(e.start)).toBeGreaterThanOrEqual(15);
      expect(dom(e.start)).toBeLessThanOrEqual(21);
    }
  });

  it("every Rose Parade row is a January 1 that is not a Sunday", () => {
    for (const e of ROSE_PARADE.editions) {
      expect(e.start).toBe(`${e.year}-01-01`);
      expect(weekdayOf(e.start)).not.toBe("Sunday");
    }
  });

  it("every Balloon Fiesta runs Saturday to the Sunday nine days later", () => {
    for (const e of BALLOON_FIESTA.editions) {
      expect(weekdayOf(e.start)).toBe("Saturday");
      expect(weekdayOf(e.end)).toBe("Sunday");
    }
    // The published rows, checked against the organiser's dates.
    expect(BALLOON_FIESTA.editions[0]).toMatchObject({
      start: "2027-10-02",
      end: "2027-10-10",
    });
    expect(BALLOON_FIESTA.editions[1]).toMatchObject({
      start: "2028-10-07",
      end: "2028-10-15",
    });
  });

  it("nextEdition serves the Wave C pages correctly in late October 2026", () => {
    const now = at("2026-10-27");
    expect(nextEdition(MACYS_PARADE, now)?.start).toBe("2026-11-26");
    expect(nextEdition(NYC_MARATHON, now)?.start).toBe("2026-11-01");
    expect(nextEdition(FOURTH_OF_JULY, now)?.start).toBe("2027-07-04");
    expect(nextEdition(BOSTON_MARATHON, now)?.start).toBe("2027-04-19");
    expect(nextEdition(ROSE_PARADE, now)?.start).toBe("2027-01-01");
    expect(nextEdition(BALLOON_FIESTA, now)?.start).toBe("2027-10-02");
    // The fiesta falls back to season framing once the published
    // table is exhausted — no invented 2029 row.
    expect(nextEdition(BALLOON_FIESTA, at("2029-01-15"))).toBeNull();
  });

  it("JULY4_REGIONS have unique keys, real anchors and named shows", () => {
    const keys = JULY4_REGIONS.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(JULY4_REGIONS.length).toBe(6);
    for (const r of JULY4_REGIONS) {
      expect(r.anchor.lat).toBeGreaterThan(24);
      expect(r.anchor.lat).toBeLessThan(50);
      expect(r.anchor.lng).toBeLessThan(-60);
      expect(r.anchor.lng).toBeGreaterThan(-125);
      expect(r.radiusKm).toBeGreaterThanOrEqual(5);
      expect(r.show.length).toBeGreaterThan(0);
    }
  });
});
