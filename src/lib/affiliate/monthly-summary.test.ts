// Previous-month range pins (pick 12), incl. the January → December
// year boundary.
import { describe, it, expect } from "vitest";
import { previousMonthRange } from "./monthly-summary";

describe("previousMonthRange", () => {
  it("returns the full previous calendar month (UTC)", () => {
    const r = previousMonthRange(new Date(Date.UTC(2026, 10, 1, 15, 0))); // Nov 1 2026
    expect(r.key).toBe("2026-10");
    expect(r.label).toBe("October 2026");
    expect(r.start.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(r.end.toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });
  it("crosses the year boundary", () => {
    const r = previousMonthRange(new Date(Date.UTC(2027, 0, 1, 0, 30))); // Jan 1 2027
    expect(r.key).toBe("2026-12");
    expect(r.start.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(r.end.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});
