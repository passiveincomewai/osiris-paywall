import { describe, expect, it } from "vitest";
import {
  currentKp,
  decideAuroraAlert,
  formatKp,
  geomagneticLatitude,
  kpBandLabel,
  kpToGScale,
  localNightWindow,
  maxKpOverlapping,
  outlookFor,
  parseKpProduct,
  requiredKpForMagLat,
  zonedTimeToUtc,
} from "./logic";
import { AURORA_PLACES, auroraPlace } from "./places";
import { ARRAY_PRODUCT_SAMPLE, FORECAST_PRODUCT_SAMPLE, OBSERVED_PRODUCT_SAMPLE } from "./fixtures";

describe("parseKpProduct — real NOAA payloads", () => {
  it("parses the observed product (capital-Kp object rows)", () => {
    const pts = parseKpProduct(OBSERVED_PRODUCT_SAMPLE);
    expect(pts).toHaveLength(6);
    expect(pts[0]).toEqual({ time: "2026-10-17T00:00:00.000Z", kp: 2, flag: "observed" });
    expect(pts[5]).toEqual({ time: "2026-10-24T15:00:00.000Z", kp: 1.67, flag: "observed" });
  });

  it("parses the forecast product with observed/estimated/predicted flags", () => {
    const pts = parseKpProduct(FORECAST_PRODUCT_SAMPLE);
    expect(pts).toHaveLength(20);
    expect(pts.filter((p) => p.flag === "observed")).toHaveLength(10);
    expect(pts.filter((p) => p.flag === "estimated")).toHaveLength(2);
    expect(pts.filter((p) => p.flag === "predicted")).toHaveLength(8);
    // The G1-tagged row keeps its Kp; the parser ignores noaa_scale.
    const g1 = pts.find((p) => p.time.startsWith("2026-10-21T21:00"));
    expect(g1?.kp).toBe(4.67);
  });

  it("parses the legacy array-of-arrays shape, skipping the header row", () => {
    const pts = parseKpProduct(ARRAY_PRODUCT_SAMPLE);
    expect(pts).toHaveLength(3);
    expect(pts[0].kp).toBe(2.33);
    expect(pts[2].time).toBe("2026-10-24T06:00:00.000Z");
  });

  it("sorts ascending and drops garbage instead of throwing", () => {
    expect(parseKpProduct(null)).toEqual([]);
    expect(parseKpProduct({ nope: true })).toEqual([]);
    expect(parseKpProduct([{ time_tag: "not-a-date", Kp: 3 }, { time_tag: "2026-10-24T00:00:00", Kp: 99 }])).toEqual([]);
    const shuffled = parseKpProduct([
      { time_tag: "2026-10-24T03:00:00", kp: 1 },
      { time_tag: "2026-10-24T00:00:00", kp: 2 },
    ]);
    expect(shuffled.map((p) => p.kp)).toEqual([2, 1]);
  });
});

describe("currentKp", () => {
  it("takes the last measured (non-predicted) reading from the forecast product", () => {
    const cur = currentKp(parseKpProduct(FORECAST_PRODUCT_SAMPLE));
    expect(cur).toEqual({ kp: 1.33, time: "2026-10-24T21:00:00.000Z" });
  });

  it("takes the last row of the observed product", () => {
    expect(currentKp(parseKpProduct(OBSERVED_PRODUCT_SAMPLE))).toEqual({
      kp: 1.67,
      time: "2026-10-24T15:00:00.000Z",
    });
  });

  it("is null on an empty series", () => {
    expect(currentKp([])).toBeNull();
  });
});

describe("geomagneticLatitude + requiredKpForMagLat", () => {
  it("puts the preset places in their known bands", () => {
    const expected: Record<string, number> = {
      reykjavik: 2,
      akureyri: 2,
      tromso: 2,
      alta: 2,
      abisko: 3,
      kiruna: 3,
      rovaniemi: 4,
      inari: 3,
      fairbanks: 3,
      anchorage: 4,
      yellowknife: 2,
      whitehorse: 4,
      churchill: 2,
    };
    for (const place of AURORA_PLACES) {
      const req = requiredKpForMagLat(geomagneticLatitude(place.lat, place.lng));
      expect(req, place.slug).toBe(expected[place.slug]);
    }
  });

  it("matches reference points outside the preset list", () => {
    // Edinburgh: magnetic latitude ~58 → the Kp-5 line the site's FAQ cites for Scotland.
    expect(requiredKpForMagLat(geomagneticLatitude(55.9533, -3.1883))).toBe(5);
    // The magnetic equator stays near zero.
    expect(Math.abs(geomagneticLatitude(0, -72.68 + 90))).toBeLessThan(12);
    // Southern hemisphere goes negative (bands use the absolute value).
    expect(geomagneticLatitude(-42.8821, 147.3302)).toBeLessThan(-40);
  });

  it("bands step every 3 degrees from the oval outward", () => {
    expect(requiredKpForMagLat(70)).toBe(2);
    expect(requiredKpForMagLat(67)).toBe(2);
    expect(requiredKpForMagLat(66.9)).toBe(3);
    expect(requiredKpForMagLat(58)).toBe(5);
    expect(requiredKpForMagLat(45)).toBe(9);
    expect(requiredKpForMagLat(-62)).toBe(4);
  });
});

describe("G-scale + labels", () => {
  it("maps Kp to NOAA's G-scale at storm levels only", () => {
    expect(kpToGScale(4.9)).toBeNull();
    expect(kpToGScale(5)).toBe("G1");
    expect(kpToGScale(6.7)).toBe("G2");
    expect(kpToGScale(7)).toBe("G3");
    expect(kpToGScale(8.3)).toBe("G4");
    expect(kpToGScale(9)).toBe("G5");
  });

  it("labels bands in plain language", () => {
    expect(kpBandLabel(1.67)).toBe("Quiet");
    expect(kpBandLabel(2)).toBe("Low");
    expect(kpBandLabel(3.33)).toBe("Unsettled");
    expect(kpBandLabel(4.67)).toBe("Active");
    expect(kpBandLabel(5)).toBe("Geomagnetic storm (G1)");
  });

  it("formats Kp without float noise", () => {
    expect(formatKp(5)).toBe("5");
    expect(formatKp(4.67)).toBe("4.7");
    expect(formatKp(3.33)).toBe("3.3");
    expect(formatKp(0.67)).toBe("0.7");
  });
});

describe("localNightWindow", () => {
  it("daytime → tonight, not yet started (Reykjavík = UTC)", () => {
    const w = localNightWindow("Atlantic/Reykjavik", new Date("2026-10-24T12:00:00Z"));
    expect(w.nightKey).toBe("2026-10-24");
    expect(w.start.toISOString()).toBe("2026-10-24T20:00:00.000Z");
    expect(w.end.toISOString()).toBe("2026-10-25T04:00:00.000Z");
    expect(w.inProgress).toBe(false);
  });

  it("evening → tonight, in progress", () => {
    const w = localNightWindow("Atlantic/Reykjavik", new Date("2026-10-24T21:30:00Z"));
    expect(w.nightKey).toBe("2026-10-24");
    expect(w.inProgress).toBe(true);
  });

  it("after midnight → the night that began yesterday evening", () => {
    const w = localNightWindow("Atlantic/Reykjavik", new Date("2026-10-25T02:00:00Z"));
    expect(w.nightKey).toBe("2026-10-24");
    expect(w.start.toISOString()).toBe("2026-10-24T20:00:00.000Z");
    expect(w.end.toISOString()).toBe("2026-10-25T04:00:00.000Z");
    expect(w.inProgress).toBe(true);
  });

  it("resolves Alaska time (AKDT, UTC-8) across the date line of the window", () => {
    const w = localNightWindow("America/Anchorage", new Date("2026-10-24T19:00:00Z")); // 11:00 local
    expect(w.nightKey).toBe("2026-10-24");
    expect(w.start.toISOString()).toBe("2026-10-25T04:00:00.000Z");
    expect(w.end.toISOString()).toBe("2026-10-25T12:00:00.000Z");
    expect(w.inProgress).toBe(false);
  });

  it("handles the Helsinki DST fall-back night (9-hour window)", () => {
    const start = zonedTimeToUtc("Europe/Helsinki", 2026, 10, 24, 20);
    expect(start.toISOString()).toBe("2026-10-24T17:00:00.000Z"); // 20:00 EEST
    const end = zonedTimeToUtc("Europe/Helsinki", 2026, 10, 25, 4);
    expect(end.toISOString()).toBe("2026-10-25T02:00:00.000Z"); // 04:00 EET, post-fallback
  });
});

describe("maxKpOverlapping + outlookFor", () => {
  const pts = parseKpProduct(FORECAST_PRODUCT_SAMPLE);

  it("takes the max over periods overlapping the window, edges included", () => {
    // Reykjavík's night of Oct 24: 20:00Z → 04:00Z. Periods: 18:00 (1.33,
    // overlaps by an hour), 21:00 (1.33), 00:00 (3.0), 03:00 (3.33).
    const max = maxKpOverlapping(pts, new Date("2026-10-24T20:00:00Z"), new Date("2026-10-25T04:00:00Z"));
    expect(max).toBe(3.33);
  });

  it("sees the G1 evening in a past window", () => {
    const max = maxKpOverlapping(pts, new Date("2026-10-21T19:00:00Z"), new Date("2026-10-22T03:00:00Z"));
    expect(max).toBe(4.67);
  });

  it("is null when no period covers the window", () => {
    expect(maxKpOverlapping(pts, new Date("2027-01-01T00:00:00Z"), new Date("2027-01-01T08:00:00Z"))).toBeNull();
    expect(maxKpOverlapping([], new Date(), new Date())).toBeNull();
  });

  it("composes a full outlook for Fairbanks at capture time", () => {
    const fairbanks = auroraPlace("fairbanks")!;
    const now = new Date("2026-10-24T19:04:00Z");
    const outlook = outlookFor(fairbanks, 3, pts, now);
    expect(outlook.night.nightKey).toBe("2026-10-24");
    expect(outlook.maxKp).toBe(3.67);
    expect(outlook.meets).toBe(true);
  });

  it("does not meet the threshold when the forecast is short", () => {
    const anchorage = auroraPlace("anchorage")!;
    const outlook = outlookFor(anchorage, 4, pts, new Date("2026-10-24T19:04:00Z"));
    expect(outlook.maxKp).toBe(3.67);
    expect(outlook.meets).toBe(false);
  });
});

describe("decideAuroraAlert", () => {
  const base = {
    active: true,
    emailOptOut: false,
    hasEmail: true,
    tonightMaxKp: 5,
    requiredKp: 3,
    nightKey: "2026-10-24",
    lastAlertNight: null as string | null,
    hoursUntilNightStart: 3,
  };

  it("sends when the forecast crosses the place's threshold", () => {
    expect(decideAuroraAlert(base)).toEqual({ send: true, reason: "threshold-met" });
    expect(decideAuroraAlert({ ...base, tonightMaxKp: 3 })).toEqual({ send: true, reason: "threshold-met" });
    expect(decideAuroraAlert({ ...base, hoursUntilNightStart: 10 })).toEqual({ send: true, reason: "threshold-met" });
    expect(decideAuroraAlert({ ...base, hoursUntilNightStart: -2 })).toEqual({ send: true, reason: "threshold-met" });
  });

  it("skips below threshold, with no forecast, and too early", () => {
    expect(decideAuroraAlert({ ...base, tonightMaxKp: 2.9 }).reason).toBe("below-threshold");
    expect(decideAuroraAlert({ ...base, tonightMaxKp: null }).reason).toBe("no-forecast");
    expect(decideAuroraAlert({ ...base, hoursUntilNightStart: 10.5 }).reason).toBe("too-early");
  });

  it("dedupes per night: the same nightKey never sends twice, the next night can", () => {
    expect(decideAuroraAlert({ ...base, lastAlertNight: "2026-10-24" })).toEqual({
      send: false,
      reason: "already-sent",
    });
    expect(decideAuroraAlert({ ...base, lastAlertNight: "2026-10-23" }).send).toBe(true);
  });

  it("honours inactivity, opt-out and missing email before anything else", () => {
    expect(decideAuroraAlert({ ...base, active: false }).reason).toBe("inactive");
    expect(decideAuroraAlert({ ...base, emailOptOut: true }).reason).toBe("opted-out");
    expect(decideAuroraAlert({ ...base, hasEmail: false }).reason).toBe("no-email");
  });
});
