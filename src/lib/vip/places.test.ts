import { describe, it, expect } from "vitest";
import { validatePlaceInput } from "./places";

describe("validatePlaceInput", () => {
  it("accepts a good place and defaults the radius", () => {
    expect(validatePlaceInput({ name: "Home", lat: 41.223, lng: -111.974 })).toEqual({
      ok: true,
      value: { name: "Home", lat: 41.223, lng: -111.974, radiusKm: 250 },
    });
  });
  it("clamps the radius into range", () => {
    const v = validatePlaceInput({ name: "X", lat: 0, lng: 0, radiusKm: 99999 });
    expect(v.ok && v.value.radiusKm).toBe(2000);
    const v2 = validatePlaceInput({ name: "X", lat: 0, lng: 0, radiusKm: 1 });
    expect(v2.ok && v2.value.radiusKm).toBe(25);
  });
  it("rejects missing names and impossible coordinates", () => {
    expect(validatePlaceInput({ lat: 0, lng: 0 })).toMatchObject({ ok: false, error: "name_required" });
    expect(validatePlaceInput({ name: "X", lat: 91, lng: 0 })).toMatchObject({ ok: false, error: "lat_invalid" });
    expect(validatePlaceInput({ name: "X", lat: 0, lng: -181 })).toMatchObject({ ok: false, error: "lng_invalid" });
    expect(validatePlaceInput({ name: "X", lat: "41", lng: 0 })).toMatchObject({ ok: false, error: "lat_invalid" });
  });
});
