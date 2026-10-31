/**
 * Test fixtures: REAL NOAA SWPC payloads, captured live from the build
 * environment on 2026-10-24 (~19:04 UTC) and trimmed to the rows the
 * tests exercise — values, timestamps and flags are byte-faithful to
 * what services.swpc.noaa.gov served. Full captures: research/ in the
 * build staging.
 *
 * Forecast fixture spans three stretches of the one payload:
 *  - 2026-10-21 evening: an observed G1 row (kp 4.67, noaa_scale "G1");
 *  - 2026-10-24 morning: the tail of the observed run;
 *  - 2026-10-24 evening → 2026-10-25: estimated rows giving way to
 *    predicted rows (the tonight-forecast transition the feature uses).
 */

export const OBSERVED_PRODUCT_SAMPLE: unknown = [
  { time_tag: "2026-10-17T00:00:00", Kp: 2.0, a_running: 7, station_count: 8 },
  { time_tag: "2026-10-17T03:00:00", Kp: 1.0, a_running: 4, station_count: 8 },
  { time_tag: "2026-10-17T06:00:00", Kp: 0.67, a_running: 3, station_count: 8 },
  { time_tag: "2026-10-24T09:00:00", Kp: 2.0, a_running: 7, station_count: 8 },
  { time_tag: "2026-10-24T12:00:00", Kp: 1.67, a_running: 6, station_count: 8 },
  { time_tag: "2026-10-24T15:00:00", Kp: 1.67, a_running: 6, station_count: 8 },
];

export const FORECAST_PRODUCT_SAMPLE: unknown = [
  { time_tag: "2026-10-21T09:00:00", kp: 2.33, observed: "observed", noaa_scale: null },
  { time_tag: "2026-10-21T12:00:00", kp: 1.67, observed: "observed", noaa_scale: null },
  { time_tag: "2026-10-21T15:00:00", kp: 3.33, observed: "observed", noaa_scale: null },
  { time_tag: "2026-10-21T18:00:00", kp: 3.67, observed: "observed", noaa_scale: null },
  { time_tag: "2026-10-21T21:00:00", kp: 4.67, observed: "observed", noaa_scale: "G1" },
  { time_tag: "2026-10-22T00:00:00", kp: 2.33, observed: "observed", noaa_scale: null },
  { time_tag: "2026-10-24T06:00:00", kp: 0.67, observed: "observed", noaa_scale: null },
  { time_tag: "2026-10-24T09:00:00", kp: 2.0, observed: "observed", noaa_scale: null },
  { time_tag: "2026-10-24T12:00:00", kp: 1.67, observed: "observed", noaa_scale: null },
  { time_tag: "2026-10-24T15:00:00", kp: 1.67, observed: "observed", noaa_scale: null },
  { time_tag: "2026-10-24T18:00:00", kp: 1.33, observed: "estimated", noaa_scale: null },
  { time_tag: "2026-10-24T21:00:00", kp: 1.33, observed: "estimated", noaa_scale: null },
  { time_tag: "2026-10-25T00:00:00", kp: 3.0, observed: "predicted", noaa_scale: null },
  { time_tag: "2026-10-25T03:00:00", kp: 3.33, observed: "predicted", noaa_scale: null },
  { time_tag: "2026-10-25T06:00:00", kp: 3.67, observed: "predicted", noaa_scale: null },
  { time_tag: "2026-10-25T09:00:00", kp: 3.33, observed: "predicted", noaa_scale: null },
  { time_tag: "2026-10-25T12:00:00", kp: 3.67, observed: "predicted", noaa_scale: null },
  { time_tag: "2026-10-25T15:00:00", kp: 3.0, observed: "predicted", noaa_scale: null },
  { time_tag: "2026-10-25T18:00:00", kp: 3.33, observed: "predicted", noaa_scale: null },
  { time_tag: "2026-10-25T21:00:00", kp: 3.0, observed: "predicted", noaa_scale: null },
];

/**
 * SYNTHETIC rows in NOAA's legacy array-of-arrays shape (header row +
 * data rows) — exists only to prove the parser accepts that shape.
 * The object-row fixtures above are the real captured payloads.
 */
export const ARRAY_PRODUCT_SAMPLE: unknown = [
  ["time_tag", "Kp", "a_running", "station_count"],
  ["2026-10-24 00:00:00", "2.33", "10", "8"],
  ["2026-10-24 03:00:00", "1.67", "6", "8"],
  ["2026-10-24 06:00:00", "0.67", "3", "8"],
];
