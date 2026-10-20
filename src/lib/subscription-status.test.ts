// Pins for the session subscriptionStatus mapping (src/auth.ts's
// resolveSubscriptionStatus delegates here). Server entitlement was never
// the bug — this locks its exact behavior so it can't drift.
import { describe, it, expect } from "vitest";
import { subscriptionStatusFromRow } from "./subscription-status";

const NOW = new Date("2026-10-20T12:00:00.000Z");
const future = new Date("2026-10-27T12:00:00.000Z");
const past = new Date("2026-10-13T12:00:00.000Z");

describe("subscriptionStatusFromRow", () => {
  it("active with period end in the future → 'active'", () => {
    expect(subscriptionStatusFromRow({ status: "active", currentPeriodEnd: future }, NOW)).toBe("active");
  });

  it("trialing with trial/period end in the future → 'active' (trial = full Pro)", () => {
    expect(subscriptionStatusFromRow({ status: "trialing", currentPeriodEnd: future }, NOW)).toBe("active");
  });

  it("trialing past its end → NOT active (raw status passes through)", () => {
    expect(subscriptionStatusFromRow({ status: "trialing", currentPeriodEnd: past }, NOW)).toBe("trialing");
  });

  it("active past its period end → raw 'active' passthrough (as implemented; the webhook moves lapsed rows out of 'active')", () => {
    expect(subscriptionStatusFromRow({ status: "active", currentPeriodEnd: past }, NOW)).toBe("active");
  });

  it("other statuses pass through raw and never read as active", () => {
    expect(subscriptionStatusFromRow({ status: "past_due", currentPeriodEnd: future }, NOW)).toBe("past_due");
    expect(subscriptionStatusFromRow({ status: "canceled", currentPeriodEnd: future }, NOW)).toBe("canceled");
  });

  it("no subscription row → 'none'", () => {
    expect(subscriptionStatusFromRow(null, NOW)).toBe("none");
    expect(subscriptionStatusFromRow(undefined, NOW)).toBe("none");
  });
});
