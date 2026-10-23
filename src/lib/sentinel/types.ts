/**
 * OSIRIS — Copernicus Data Space / Sentinel Hub types.
 *
 * Sentinel-2 true-colour imagery via the Sentinel Hub Process API on
 * the Copernicus Data Space Ecosystem (CDSE). Data is provided on a
 * "free, full and open" basis; access is gated by an OAuth2 client the
 * account owner creates in the Sentinel Hub dashboard.
 */

export interface SentinelBoundingBox {
  /** [west, south, east, north] in WGS84 degrees — the Process API order. */
  bbox: [number, number, number, number];
  crs: 'http://www.opengis.net/def/crs/EPSG/0/4326';
}

export interface SentinelToken {
  accessToken: string;
  /** Epoch ms at which the token stops being usable (with skew applied). */
  expiresAt: number;
  tokenType: string;
}

/** A ready-to-POST Sentinel Hub Process API request. */
export interface SentinelProcessRequest {
  url: string;
  body: {
    input: {
      bounds: { bbox: [number, number, number, number]; properties: { crs: string } };
      data: Array<{
        type: string;
        dataFilter: {
          timeRange: { from: string; to: string };
          maxCloudCoverage: number;
        };
      }>;
    };
    output: {
      width: number;
      height: number;
      responses: Array<{ identifier: string; format: { type: string } }>;
    };
    evalscript: string;
  };
}

export interface SentinelImageResult {
  contentType: string;
  /** Raw image bytes (PNG by default). */
  bytes: Uint8Array;
  bbox: [number, number, number, number];
  from: string;
  to: string;
  fetchedAt: number;
}

export const SENTINEL_SOURCE_LABEL = 'Copernicus Sentinel-2';
