import { describe, expect, it } from "vitest";
import { alertDeliveryDecision, isInQuietHours } from "./delivery";
import { PREFERENCE_DEFAULTS, type Preferences } from "./preferences";

const prefs = (over: Partial<Preferences> = {}): Preferences => ({ ...PREFERENCE_DEFAULTS, ...over });
// 2026-10-22 23:30 UTC = 17:30 in America/Denver (MDT, UTC-6).
const evening = new Date("2026-10-22T23:30:00Z");
// 2026-10-23 05:30 UTC = 23:30 in America/Denver.
const lateNight = new Date("2026-10-23T05:30:00Z");

describe("isInQuietHours", () => {
  it("is off by default", () => {
    expect(isInQuietHours(lateNight, prefs())).toBe(false);
  });

  it("wraps midnight and uses the user's timezone", () => {
    const q = prefs({ quietHoursEnabled: true, quietHoursStart: "22:00", quietHoursEnd: "07:00", timezone: "America/Denver" });
    expect(isInQuietHours(lateNight, q)).toBe(true); // 23:30 local
    expect(isInQuietHours(evening, q)).toBe(false); // 17:30 local
  });

  it("handles a same-day window", () => {
    const q = prefs({ quietHoursEnabled: true, quietHoursStart: "13:00", quietHoursEnd: "18:00", timezone: "America/Denver" });
    expect(isInQuietHours(evening, q)).toBe(true); // 17:30 local
    expect(isInQuietHours(lateNight, q)).toBe(false);
  });
});

describe("alertDeliveryDecision", () => {
  it("email channel sends email only", () => {
    expect(alertDeliveryDecision(prefs(), "camera", evening)).toEqual({ email: true, push: false, reason: null });
  });

  it("both channel sends email and push", () => {
    expect(alertDeliveryDecision(prefs({ cameraAlertChannel: "both" }), "camera", evening)).toEqual({
      email: true,
      push: true,
      reason: null,
    });
  });

  it("none suppresses", () => {
    expect(alertDeliveryDecision(prefs({ cameraAlertChannel: "none" }), "camera", evening).reason).toBe("channel_none");
  });

  it("quiet hours suppress email but are per-type", () => {
    const q = prefs({ quietHoursEnabled: true, quietHoursStart: "22:00", quietHoursEnd: "07:00", timezone: "America/Denver" });
    expect(alertDeliveryDecision(q, "camera", lateNight).reason).toBe("quiet_hours");
    expect(alertDeliveryDecision(q, "event", evening).email).toBe(true);
  });

  it("push-only chooses push and keeps email off", () => {
    const d = alertDeliveryDecision(prefs({ cameraAlertChannel: "push" }), "camera", evening);
    expect(d).toEqual({ email: false, push: true, reason: "push_only" });
  });

  it("quiet hours suppress push too", () => {
    const q = prefs({
      cameraAlertChannel: "both",
      quietHoursEnabled: true,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
      timezone: "America/Denver",
    });
    expect(alertDeliveryDecision(q, "camera", lateNight)).toEqual({
      email: false,
      push: false,
      reason: "quiet_hours",
    });
  });
});
