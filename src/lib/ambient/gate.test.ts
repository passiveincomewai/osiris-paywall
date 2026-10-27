import { describe, it, expect } from "vitest";
import {
  FREE_DEMO_LIMIT_MS,
  PlaytimeAccumulator,
  demoSecondsLeft,
  shouldGate,
} from "./gate";

describe("PlaytimeAccumulator", () => {
  it("counts only playing time between observations", () => {
    const acc = new PlaytimeAccumulator();
    acc.observe(0, true);
    acc.observe(1_000, true);
    expect(acc.accumulatedMs).toBe(1_000);
    // Paused at 1s; the next 10 s must not count.
    acc.observe(1_000, false);
    acc.observe(11_000, false);
    expect(acc.accumulatedMs).toBe(1_000);
    // Resumed: from the first playing observation onward counts.
    acc.observe(11_000, true);
    acc.observe(12_500, true);
    expect(acc.accumulatedMs).toBe(2_500);
  });

  it("caps a single gap at 5s so a sleeping tab cannot bank hours", () => {
    const acc = new PlaytimeAccumulator();
    acc.observe(0, true);
    acc.observe(3_600_000, true); // an hour later, flag stuck "playing"
    expect(acc.accumulatedMs).toBe(5_000);
  });

  it("ignores backwards clock jumps", () => {
    const acc = new PlaytimeAccumulator();
    acc.observe(5_000, true);
    acc.observe(4_000, true);
    expect(acc.accumulatedMs).toBe(0);
  });

  it("resets cleanly", () => {
    const acc = new PlaytimeAccumulator();
    acc.observe(0, true);
    acc.observe(2_000, true);
    acc.reset();
    expect(acc.accumulatedMs).toBe(0);
    acc.observe(10_000, true);
    acc.observe(11_000, true);
    expect(acc.accumulatedMs).toBe(1_000);
  });
});

describe("shouldGate", () => {
  it("gates at exactly 180 seconds of playing time", () => {
    expect(FREE_DEMO_LIMIT_MS).toBe(180_000);
    expect(shouldGate({ hasAccess: false, accumulatedMs: 179_999 })).toBe(false);
    expect(shouldGate({ hasAccess: false, accumulatedMs: 180_000 })).toBe(true);
    expect(shouldGate({ hasAccess: false, accumulatedMs: 240_000 })).toBe(true);
  });

  it("never gates a viewer with access", () => {
    expect(shouldGate({ hasAccess: true, accumulatedMs: 999_999_999 })).toBe(false);
  });

  it("honours an explicit limit override", () => {
    expect(shouldGate({ hasAccess: false, accumulatedMs: 10, limitMs: 10 })).toBe(true);
    expect(shouldGate({ hasAccess: false, accumulatedMs: 9, limitMs: 10 })).toBe(false);
  });
});

describe("demoSecondsLeft", () => {
  it("counts down in whole seconds and floors at zero", () => {
    expect(demoSecondsLeft(0)).toBe(180);
    expect(demoSecondsLeft(61_000)).toBe(119);
    expect(demoSecondsLeft(180_000)).toBe(0);
    expect(demoSecondsLeft(200_000)).toBe(0);
  });
});
