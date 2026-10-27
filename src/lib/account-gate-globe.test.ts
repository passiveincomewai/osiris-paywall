import { describe, expect, it } from "vitest";
import { ACCOUNT_GATE_UNTIL, accountGateActive } from "./account-gate";

describe("time-boxed globe account gate (2026-10-27 conversion test)", () => {
  it("ends at 2026-10-27T15:00:00.000Z — 09:00 MDT", () => {
    expect(ACCOUNT_GATE_UNTIL.toISOString()).toBe("2026-10-27T15:00:00.000Z");
  });

  it("is active before the deadline", () => {
    // Test start: 2026-10-27 01:00 MDT = 07:00 UTC.
    expect(accountGateActive(new Date("2026-10-27T07:00:00.000Z"))).toBe(true);
    expect(accountGateActive(new Date("2026-10-27T14:59:59.999Z"))).toBe(true);
  });

  it("is inactive at and after the deadline", () => {
    expect(accountGateActive(new Date("2026-10-27T15:00:00.000Z"))).toBe(false);
    expect(accountGateActive(new Date("2026-10-27T15:00:00.001Z"))).toBe(false);
    expect(accountGateActive(new Date("2026-10-28T00:00:00.000Z"))).toBe(false);
  });
});
