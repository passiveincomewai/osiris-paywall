import { describe, it, expect } from "vitest";
import { rampDailyCap } from "./ramp";

const day = 86_400_000;
const t0 = new Date(Math.floor(Date.UTC(2026, 10, 14) / day) * day); // a UTC midnight

describe("rampDailyCap", () => {
  it("starts at 20/day before any send", () => {
    expect(rampDailyCap(null, t0)).toBe(20);
  });
  it("week 1 is 20, week 2 is 50", () => {
    expect(rampDailyCap(t0, new Date(t0.getTime() + 6 * day))).toBe(20);
    expect(rampDailyCap(t0, new Date(t0.getTime() + 7 * day))).toBe(50);
  });
  it("climbs 100 / 200 / 400 and caps at 800 from week 6", () => {
    expect(rampDailyCap(t0, new Date(t0.getTime() + 14 * day))).toBe(100);
    expect(rampDailyCap(t0, new Date(t0.getTime() + 21 * day))).toBe(200);
    expect(rampDailyCap(t0, new Date(t0.getTime() + 28 * day))).toBe(400);
    expect(rampDailyCap(t0, new Date(t0.getTime() + 35 * day))).toBe(800);
    expect(rampDailyCap(t0, new Date(t0.getTime() + 300 * day))).toBe(800);
  });
});
