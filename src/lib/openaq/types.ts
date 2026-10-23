/**
 * OSIRIS — OpenAQ API v3 normalized types.
 *
 * OpenAQ aggregates ground-station air-quality measurements worldwide.
 * Its terms require source attribution wherever its data is displayed —
 * every reading here carries `attribution: 'OpenAQ'` and the UI must
 * render it (see PlaceWeatherPanel).
 */

export interface OpenAqLocation {
  id: number;
  name: string;
  locality: string | null;
  countryCode: string | null;
  countryName: string | null;
  lat: number | null;
  lng: number | null;
  /** Parameter names this station reports, e.g. ['pm25', 'pm10', 'o3']. */
  parameters: string[];
}

export interface OpenAqMeasurement {
  parameter: string;
  value: number;
  units: string | null;
  measuredAt: string | null;
}

/** The latest readings from the nearest OpenAQ station to a point. */
export interface OpenAqReading {
  location: OpenAqLocation;
  measurements: OpenAqMeasurement[];
  /** Convenience extracts — null when the station does not report them. */
  pm25: number | null;
  pm10: number | null;
  o3: number | null;
  no2: number | null;
  so2: number | null;
  co: number | null;
  measuredAt: string | null;
  fetchedAt: number;
  stale: boolean;
  /** Mandatory attribution — display it wherever the reading is shown. */
  attribution: 'OpenAQ';
}

export const OPENAQ_SOURCE_LABEL = 'OpenAQ';
