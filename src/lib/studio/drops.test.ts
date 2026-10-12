// Studio drops unit tests: the pure UTC date math only. Drops are keyed
// by UTC calendar date (a @db.Date column), so a claim near midnight
// local time must land on the UTC day, never the local one.
import { describe, it, expect } from "vitest";
import { utcDateOnly } from "./drops";

describe("utcDateOnly", () => {
  it("returns UTC midnight of the same UTC day", () => {
    expect(utcDateOnly(new Date("2026-10-12T14:57:00.000Z")).toISOString()).toBe(
      "2026-10-12T00:00:00.000Z",
    );
    expect(utcDateOnly(new Date("2026-10-12T00:00:00.000Z")).toISOString()).toBe(
      "2026-10-12T00:00:00.000Z",
    );
  });

  it("keeps a late-UTC-evening instant on its UTC day (already tomorrow in eastern zones)", () => {
    // 2026-10-12T23:59:59Z is Oct 13 in UTC+ zones — the UTC date is 12.
    expect(utcDateOnly(new Date("2026-10-12T23:59:59.999Z")).toISOString()).toBe(
      "2026-10-12T00:00:00.000Z",
    );
  });

  it("rolls to the next UTC day at exactly UTC midnight", () => {
    expect(utcDateOnly(new Date("2026-10-13T00:00:00.000Z")).toISOString()).toBe(
      "2026-10-13T00:00:00.000Z",
    );
  });

  it("handles month and year boundaries", () => {
    expect(utcDateOnly(new Date("2026-10-31T23:30:00.000Z")).toISOString()).toBe(
      "2026-10-31T00:00:00.000Z",
    );
    expect(utcDateOnly(new Date("2027-01-01T00:30:00.000Z")).toISOString()).toBe(
      "2027-01-01T00:00:00.000Z",
    );
    expect(utcDateOnly(new Date("2026-02-28T12:00:00.000Z")).toISOString()).toBe(
      "2026-02-28T00:00:00.000Z",
    );
  });

  it("is idempotent and does not mutate its input", () => {
    const d = new Date("2026-10-12T08:15:00.000Z");
    const once = utcDateOnly(d);
    expect(utcDateOnly(once).getTime()).toBe(once.getTime());
    expect(d.toISOString()).toBe("2026-10-12T08:15:00.000Z");
  });
});
