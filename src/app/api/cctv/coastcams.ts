import type { CctvCamera } from './types';
import { cachedSource } from '@/lib/sourceCache';

/**
 * OSIRIS — USGS CoastCams
 * Source: USGS CoastCam network (https://www.usgs.gov/coastcams).
 * U.S. Government public domain (CC0-1.0) — "freely distributable with
 * proper metadata and source attribution" per USGS data-release
 * metadata; credit the U.S. Geological Survey. Not for navigational use.
 *
 * Unlike the DOT modules there is no inventory API to poll: USGS
 * publishes no machine-readable camera list WITH positions, so this is
 * a curated list — a camera is included only when BOTH hold, verified
 * 2026-10-22 (full audit in REPORT.md):
 *   1. its `latest/` S3 snapshot is live and updating (HTTP 200,
 *      image/jpeg, Last-Modified within ~36 h of the check); and
 *   2. USGS itself publishes the camera's position (station page,
 *      EXIF/calibration metadata) — never a geocoded guess.
 *
 * That bar admits 5 cameras at 3 stations today. Eleven further live
 * cameras (Santa Cruz, Sunset State Beach, Shishmaref, Golovin,
 * Teller, Madeira Beach c2) are deliberately NOT listed: their feeds
 * verify, but USGS publishes no position for them. Stale/dead feeds
 * (Dorado — dead since Jan 2025; Unalakleet; Sand Key) and the
 * decommissioned stations (Head of the Meadow, Nuvuk, Tyndall AFB)
 * are likewise excluded. The `/latest/` objects are overwritten in
 * place each cycle (30–60 min, daylight), so these URLs stay current.
 *
 * Isla Verde note: the pole longitude USGS prints (66.01224° W) is
 * digit-identical to its wave-buoy longitude on the same page — a
 * suspected USGS typo, carried here exactly as published and flagged
 * in REPORT.md for a sanity re-check.
 */

export interface CoastCamStation {
  slug: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  cameras: Array<{ n: 1 | 2; file: string }>;
}

export const COASTCAM_STATIONS: CoastCamStation[] = [
  {
    slug: 'caco-05',
    name: 'Marconi Beach',
    city: 'Wellfleet',
    state: 'MA',
    // RTK-GNSS pole position in USGS EXIF metadata (station CACO-02
    // record; the live deployment is CACO-05 at the same CoastCam site).
    lat: 41.892622,
    lng: -69.963194,
    cameras: [
      { n: 1, file: 'c1.snap.jpg' },
      { n: 2, file: 'c2.snap.jpg' },
    ],
  },
  {
    slug: 'madeira_beach',
    name: 'Madeira Beach',
    city: 'Madeira Beach',
    state: 'FL',
    // USGS calibration EO (UTM 17N) for camera 1's rooftop position.
    // Camera 2 is live but has no USGS-published position — excluded.
    lat: 27.796214,
    lng: -82.796098,
    cameras: [{ n: 1, file: 'c1_snap.jpg' }],
  },
  {
    slug: 'islaverde',
    name: 'Isla Verde',
    city: 'San Juan',
    state: 'PR',
    // Pole coordinates printed on the USGS CMGDS station page.
    lat: 18.44382,
    lng: -66.01224,
    cameras: [
      { n: 1, file: 'c1_snap.jpg' },
      { n: 2, file: 'c2_snap.jpg' },
    ],
  },
];

const IMAGE_BASE = 'https://cmgp-coastcam.s3-us-west-2.amazonaws.com/cameras';

/** The stable latest-snapshot URL for one CoastCam. */
export function coastCamUrl(slug: string, file: string): string {
  return `${IMAGE_BASE}/${slug}/latest/${file}`;
}

/** Map the curated station list to catalogue records. Exported for tests. */
export function mapStations(stations: CoastCamStation[]): CctvCamera[] {
  const out: CctvCamera[] = [];
  for (const s of stations) {
    if (!Number.isFinite(s.lat) || !Number.isFinite(s.lng)) continue;
    for (const cam of s.cameras) {
      out.push({
        id: `usgs-coastcam-${s.slug}-c${cam.n}`,
        lat: s.lat,
        lng: s.lng,
        name: `${s.name} Camera ${cam.n}`,
        city: s.city,
        country: 'US',
        feed_url: coastCamUrl(s.slug, cam.file),
        source: 'USGS CoastCam',
      });
    }
  }
  return out;
}

async function loadCoastCameras(): Promise<CctvCamera[]> {
  const cams = mapStations(COASTCAM_STATIONS);
  console.log(`[OSIRIS] CoastCams — USGS CoastCam: ${cams.length}`);
  return cams;
}

export const fetchCoastCameras = cachedSource('coastcams', loadCoastCameras);
