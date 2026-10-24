import { describe, expect, it } from "vitest";
import { validatePreferencesPatch, PREFERENCE_DEFAULTS } from "./preferences";

describe("validatePreferencesPatch", () => {
  it("accepts a valid patch and drops unknown keys", () => {
    const r = validatePreferencesPatch({ units: "metric", clockFormat: "24", nonsense: 1 });
    expect("data" in r && r.data).toEqual({ units: "metric", clockFormat: "24" });
  });

  it("rejects bad enums", () => {
    expect(validatePreferencesPatch({ units: "kelvin" })).toHaveProperty("error");
    expect(validatePreferencesPatch({ defaultMapStyle: "sepia" })).toHaveProperty("error");
    expect(validatePreferencesPatch({ cameraAlertChannel: "sms" })).toHaveProperty("error");
    expect(validatePreferencesPatch({ shareVisibility: "private" })).toHaveProperty("error");
  });

  it("clamps numeric ranges instead of trusting the client", () => {
    const r = validatePreferencesPatch({ cameraPreviewRefreshSeconds: 9999, recordingClipSeconds: 2 });
    expect("data" in r && r.data.cameraPreviewRefreshSeconds).toBe(300);
    expect("data" in r && r.data.recordingClipSeconds).toBe(10);
  });

  it("validates timezone, quiet-hours and billing email shapes", () => {
    expect(validatePreferencesPatch({ timezone: "America/Denver" })).not.toHaveProperty("error");
    expect(validatePreferencesPatch({ timezone: "Mars/Olympus" })).toHaveProperty("error");
    expect(validatePreferencesPatch({ quietHoursStart: "25:00" })).toHaveProperty("error");
    expect(validatePreferencesPatch({ quietHoursStart: "22:30" })).not.toHaveProperty("error");
    expect(validatePreferencesPatch({ billingEmail: "not-an-email" })).toHaveProperty("error");
    expect(validatePreferencesPatch({ billingEmail: null })).not.toHaveProperty("error");
  });

  it("home location needs both coordinates in range, or both null", () => {
    expect(validatePreferencesPatch({ homeLat: 41.2, homeLng: -111.9 })).not.toHaveProperty("error");
    expect(validatePreferencesPatch({ homeLat: 41.2 })).toHaveProperty("error");
    expect(validatePreferencesPatch({ homeLat: 91, homeLng: 0 })).toHaveProperty("error");
    expect(validatePreferencesPatch({ homeLat: null, homeLng: null })).not.toHaveProperty("error");
  });

  it("defaults mark the profile public and shares public", () => {
    expect(PREFERENCE_DEFAULTS.publicProfile).toBe(true);
    expect(PREFERENCE_DEFAULTS.shareVisibility).toBe("public");
  });
});
