import { describe, expect, it } from "vitest";
import { eventPhase } from "./lifecycle";

// All `now` values are pinned UTC moments; the phase must depend only
// on the UTC calendar date, never on the time of day or the host zone.

describe("eventPhase — end date only", () => {
  const END = "2026-11-01";

  it("is upcoming on the days before the end date", () => {
    expect(eventPhase(END, new Date("2026-10-26T12:00:00Z"))).toBe("upcoming");
    expect(eventPhase(END, new Date("2026-10-31T23:59:59Z"))).toBe("upcoming");
  });

  it("is live for the whole of the end date itself (first and last second)", () => {
    expect(eventPhase(END, new Date("2026-11-01T00:00:00Z"))).toBe("live");
    expect(eventPhase(END, new Date("2026-11-01T23:59:59Z"))).toBe("live");
  });

  it("turns past at the first second of the day after the end date", () => {
    expect(eventPhase(END, new Date("2026-11-02T00:00:00Z"))).toBe("past");
  });

  it("stays past long after the event", () => {
    expect(eventPhase(END, new Date("2027-06-15T12:00:00Z"))).toBe("past");
  });

  it("ignores time-of-day: a late-evening now on the end date is not past", () => {
    // 23:30 UTC on Nov 1 is already Nov 2 in UTC+13 zones — the phase
    // must still follow the UTC date, not any local date.
    expect(eventPhase(END, new Date("2026-11-01T23:30:00Z"))).toBe("live");
    expect(eventPhase(END, new Date("2026-11-02T00:30:00Z"))).toBe("past");
  });

  it("accepts a full ISO datetime as the end date and uses its UTC date", () => {
    expect(eventPhase("2026-11-01T19:00:00Z", new Date("2026-11-01T20:00:00Z"))).toBe(
      "live",
    );
    expect(eventPhase("2026-11-01T19:00:00Z", new Date("2026-11-02T00:00:00Z"))).toBe(
      "past",
    );
  });

  it("handles month and year boundaries by calendar date", () => {
    expect(eventPhase("2026-12-31", new Date("2026-12-31T12:00:00Z"))).toBe("live");
    expect(eventPhase("2026-12-31", new Date("2027-01-01T00:00:00Z"))).toBe("past");
    expect(eventPhase("2027-01-01", new Date("2026-12-31T12:00:00Z"))).toBe("upcoming");
  });

  it("throws on a non-ISO end date instead of guessing a phase", () => {
    expect(() => eventPhase("next Friday", new Date("2026-11-01T00:00:00Z"))).toThrow(
      TypeError,
    );
    expect(() => eventPhase("2026-13-40", new Date("2026-11-01T00:00:00Z"))).toThrow(
      TypeError,
    );
    expect(() => eventPhase("", new Date("2026-11-01T00:00:00Z"))).toThrow(TypeError);
  });
});

describe("eventPhase — with a start date", () => {
  const START = "2026-10-23";
  const END = "2026-11-01";

  it("is upcoming before the start date", () => {
    expect(eventPhase(END, new Date("2026-10-22T23:59:59Z"), START)).toBe("upcoming");
  });

  it("is live from the start date through the end date inclusive", () => {
    expect(eventPhase(END, new Date("2026-10-23T00:00:00Z"), START)).toBe("live");
    expect(eventPhase(END, new Date("2026-10-26T12:00:00Z"), START)).toBe("live");
    expect(eventPhase(END, new Date("2026-11-01T23:59:59Z"), START)).toBe("live");
  });

  it("is past from the day after the end date", () => {
    expect(eventPhase(END, new Date("2026-11-02T00:00:00Z"), START)).toBe("past");
  });
});
