/**
 * OSIRIS — Sentinel Hub Process API request builder (pure).
 *
 * Builds a Sentinel-2 L2A true-colour request for the latest available
 * pass over a lat/lng bounding box: the caller names a centre point, a
 * box size and a look-back window, and gets back the exact JSON body
 * the Process API expects — B04/B03/B02 rendered as a PNG.
 */
import type { SentinelProcessRequest } from './types';

export const SENTINEL_PROCESS_URL = 'https://sh.dataspace.copernicus.eu/api/v1/process';
export const SENTINEL_TOKEN_URL =
  'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';

/** True-colour evalscript: red (B04), green (B03), blue (B02) with a
 *  2.5× gain, the standard Sentinel Hub true-colour recipe. */
export const TRUE_COLOUR_EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: ["B02", "B03", "B04"],
    output: { bands: 3, sampleType: "AUTO" }
  };
}
function evaluatePixel(sample) {
  return [2.5 * sample.B04, 2.5 * sample.B03, 2.5 * sample.B02];
}`;

/**
 * A bounding box centred on a point. `halfSizeKm` is converted with the
 * usual 111.32 km/° latitude and longitude scaled by cos(lat).
 * Returns [west, south, east, north].
 */
export function bboxAround(
  lat: number,
  lng: number,
  halfSizeKm = 5,
): [number, number, number, number] {
  const dLat = halfSizeKm / 111.32;
  const dLng = halfSizeKm / (111.32 * Math.max(0.1, Math.cos((lat * Math.PI) / 180)));
  const clampLat = (v: number) => Math.max(-90, Math.min(90, v));
  const clampLng = (v: number) => Math.max(-180, Math.min(180, v));
  return [
    clampLng(lng - dLng),
    clampLat(lat - dLat),
    clampLng(lng + dLng),
    clampLat(lat + dLat),
  ];
}

export interface TrueColourOptions {
  lat: number;
  lng: number;
  /** Half-size of the square box, km. Default 5 (≈10×10 km at 10 m/px). */
  halfSizeKm?: number;
  /** Look-back window for "latest available pass". Default 30 days. */
  lookbackDays?: number;
  /** Reject scenes cloudier than this (%). Default 30. */
  maxCloudCoverage?: number;
  width?: number;
  height?: number;
  /** Window end; defaults to now. Injectable for tests. */
  now?: Date;
}

export function buildTrueColourRequest(opts: TrueColourOptions): SentinelProcessRequest {
  const now = opts.now ?? new Date();
  const lookbackDays = opts.lookbackDays ?? 30;
  const from = new Date(now.getTime() - lookbackDays * 24 * 60 * 60_000);
  const bbox = bboxAround(opts.lat, opts.lng, opts.halfSizeKm ?? 5);
  return {
    url: SENTINEL_PROCESS_URL,
    body: {
      input: {
        bounds: {
          bbox,
          properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' },
        },
        data: [
          {
            type: 'sentinel-2-l2a',
            dataFilter: {
              timeRange: { from: from.toISOString(), to: now.toISOString() },
              maxCloudCoverage: opts.maxCloudCoverage ?? 30,
            },
          },
        ],
      },
      output: {
        width: opts.width ?? 512,
        height: opts.height ?? 512,
        responses: [{ identifier: 'default', format: { type: 'image/png' } }],
      },
      evalscript: TRUE_COLOUR_EVALSCRIPT,
    },
  };
}
