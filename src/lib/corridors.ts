/**
 * Interstate corridor pages — catalogue cameras organised ALONG a route.
 *
 * Method (also stated on the pages themselves): each corridor is a
 * rough reference polyline (src/lib/corridor-paths.ts — city-to-city
 * waypoints, each tagged with the state of the segment that starts
 * there). A catalogue camera belongs to the corridor when its
 * perpendicular distance to the polyline is within MATCH_RADIUS_KM;
 * its position projected onto the polyline gives an along-route order
 * ("chainage", measured from the corridor's first waypoint), and the
 * segment it projected onto gives its state segment. Nothing here
 * reads official mileposts — where a camera's name carries a milepost
 * it is shown in the camera's own name, never recomputed.
 *
 * A corridor earns a page only with real density: CORRIDOR_MIN_TOTAL
 * cameras inside the radius and at least three state segments with
 * CORRIDOR_MIN_SEGMENT cameras. buildCorridor() returns the measured
 * numbers either way; the page decides (and notFound()s when short).
 */

import { CORRIDOR_PATHS, type CorridorWaypoint } from './corridor-paths';
import type { CountryCamera } from './country-cameras';
import { US_STATE_META } from './us-states';

export const MATCH_RADIUS_KM = 3;
export const CORRIDOR_MIN_TOTAL = 250;
export const CORRIDOR_MIN_SEGMENT = 10;
export const CORRIDOR_MIN_RICH_SEGMENTS = 3;
/** Cameras listed per state segment (the rest stay on the live map). */
export const SEGMENT_SAMPLE_CAP = 24;

const EARTH_R_KM = 6371;

export interface CorridorDef {
  slug: string;
  /** "Interstate 70" */
  name: string;
  /** "I-70" */
  short: string;
  /** Terminus labels, in path order. */
  from: string;
  to: string;
  intro: string[];
  /** One corridor-specific FAQ (the rest are built from measured data). */
  faq: { q: string; a: string };
}

export const CORRIDORS: CorridorDef[] = [
  {
    slug: 'i-95',
    name: 'Interstate 95',
    short: 'I-95',
    from: 'Houlton, Maine',
    to: 'Miami, Florida',
    intro: [
      'I-95 is the East Coast\'s main street — the highway from the Canadian border in Maine to Miami, passing through more states than any other Interstate. WorldEye\'s index holds its densest camera coverage in Florida, Delaware and the Northeast Corridor, where state DOTs publish feeds at nearly every interchange.',
      'The cameras below run in driving order from Maine to Miami: Boston and Providence, the New York and Philadelphia metros, Baltimore and Washington, then the long run south through Richmond, the Carolinas and Georgia into Florida. Check the stretch nearest your drive before you leave — the same feeds show rush-hour queues, storm flooding and hurricane evacuation traffic.',
    ],
    faq: {
      q: 'Which part of I-95 has the most cameras?',
      a: 'Florida, by a wide margin — the Miami–West Palm Beach corridor and the Jacksonville and Daytona stretches are covered by Florida DOT feeds at most interchanges. Delaware is the densest small state: its short I-95 run is blanketed end to end.',
    },
  },
  {
    slug: 'i-15',
    name: 'Interstate 15',
    short: 'I-15',
    from: 'the Canadian border in Montana',
    to: 'San Diego, California',
    intro: [
      'I-15 runs from the Canadian border through Montana and Idaho, down Utah\'s Wasatch Front, across the Las Vegas Strip\'s doorstep and into San Diego. Utah carries this page: the Utah DOT publishes one of the densest highway camera networks in the country along the Salt Lake City–Ogden–Provo corridor, and it shows in the counts below.',
      'Cameras run in driving order from Montana to San Diego. In winter the Utah and Idaho stretches are the ones to watch — the same corridor that crawls at rush hour takes the full force of Wasatch snowstorms, and the plow counts on this page come from the live plow layer wherever it reports.',
    ],
    faq: {
      q: 'Why does Utah have so many more I-15 cameras than Montana or Idaho?',
      a: 'Publication policy, not traffic. Utah DOT publishes its full highway camera network openly, while Montana and Idaho publish far fewer public feeds. The counts here measure the public camera index, not how busy the road is.',
    },
  },
  {
    slug: 'i-5',
    name: 'Interstate 5',
    short: 'I-5',
    from: 'Blaine, Washington',
    to: 'San Diego, California',
    intro: [
      'I-5 is the West Coast\'s spine — the only Interstate that runs continuously from Canada to Mexico, through Seattle, Portland, Sacramento, the Grapevine and Los Angeles. Washington and Oregon DOT cameras cover the northern half thickly; Caltrans feeds carry the long California run.',
      'The cameras below are ordered from the Canadian border to San Diego. The stretches drivers check most: Snoqualmie-to-Seattle commuter traffic in the north (on I-90\'s page for the pass itself), Siskiyou Summit on the Oregon–California line, and the Grapevine climb out of the Central Valley, where winter storms and summer fire smoke both close lanes.',
    ],
    faq: {
      q: 'Can I check the Grapevine before driving it?',
      a: 'Yes — the California segment below includes the Caltrans cameras on the I-5 climb between the Central Valley and Los Angeles. In winter, check them alongside the weather line on that segment: the Grapevine closes for snow several times most winters.',
    },
  },
  {
    slug: 'i-90',
    name: 'Interstate 90',
    short: 'I-90',
    from: 'Seattle, Washington',
    to: 'Boston, Massachusetts',
    intro: [
      'I-90 is the longest Interstate in the United States — Seattle to Boston, coast to coast across the northern tier. Its camera coverage is a tale of two ends: Washington and New York publish dense networks, Wisconsin covers its run well, and the long plains and mountain stretches in between are honestly sparse — the page shows exactly where the index is thick and where it is not.',
      'Cameras run in driving order from Seattle: Snoqualmie Pass, Spokane, the Montana passes, South Dakota, then the Midwest through Chicago and east along the Great Lakes and the New York Thruway to Boston.',
    ],
    faq: {
      q: 'Why are there so few I-90 cameras in Montana and South Dakota?',
      a: 'Those states publish few public highway feeds, and the catalogue reflects that — a handful of cameras across hundreds of miles. The gaps on this page are real gaps in public coverage, not missing data on our side.',
    },
  },
  {
    slug: 'i-35',
    name: 'Interstate 35',
    short: 'I-35',
    from: 'Duluth, Minnesota',
    to: 'Laredo, Texas',
    intro: [
      'I-35 is the NAFTA corridor — from Duluth through Minneapolis, Des Moines, Kansas City, Oklahoma City and the Texas triangle to the Mexican border at Laredo. Texas and Minnesota carry the camera counts: TxDOT and MnDOT publish deep networks, and the Austin–San Antonio stretch is one of the most-watched commuter runs in the index.',
      'Cameras are ordered from Duluth to Laredo. Note the split at Dallas–Fort Worth, where I-35 divides into I-35E and I-35W before rejoining — this page follows the corridor as a single route, and the Texas segment lists both branches\' cameras in along-route order.',
    ],
    faq: {
      q: 'Does this page include both I-35E and I-35W in Dallas–Fort Worth?',
      a: 'Yes. The reference route runs through the metroplex and the 3 km match radius takes in cameras on both branches where they run close together; each camera\'s own name says which branch and interchange it watches.',
    },
  },
  {
    slug: 'i-80',
    name: 'Interstate 80',
    short: 'I-80',
    from: 'San Francisco, California',
    to: 'the New York City metro (Teaneck, New Jersey)',
    intro: [
      'I-80 is the second-longest Interstate — San Francisco to the edge of New York City, following the Lincoln Highway and the emigrant trails across the Sierra, the Great Basin, the Rockies and the plains. California and Utah publish its strongest camera coverage; Wyoming, Nebraska and Iowa are working-DOT-camera country with thinner public feeds.',
      'Drivers check this page for two climbs: Donner Pass in the Sierra, where Caltrans cameras show chain-control conditions all winter, and the I-80 corridor across Wyoming, where wind — not snow — is the usual closure cause. The cameras run in driving order from San Francisco east.',
    ],
    faq: {
      q: 'Can I see Donner Pass conditions here?',
      a: 'Yes — the California segment includes the Caltrans cameras over Donner Summit. Pair them with the segment\'s weather line before a winter crossing; chain controls and full closures both show up in the feeds.',
    },
  },
  {
    slug: 'i-70',
    name: 'Interstate 70',
    short: 'I-70',
    from: 'Cove Fort, Utah',
    to: 'Baltimore, Maryland',
    intro: [
      'I-70 runs from its junction with I-15 in Utah to Baltimore — through the San Rafael Swell, over the Colorado Rockies at the Eisenhower Tunnel (the highest point on the Interstate system), across Kansas and Missouri, and east through Indianapolis and Columbus. Colorado and Missouri publish the deepest camera networks on the route.',
      'The Colorado segment is the winter story: the same cameras that show summer tunnel traffic show ski-run queues to Vail and the Eisenhower approaches, chain-law stops and whiteout closures. Cameras below run in driving order from Utah to Baltimore.',
    ],
    faq: {
      q: 'Are the Eisenhower Tunnel cameras on this page?',
      a: 'Yes — the Colorado segment includes the CDOT cameras at the tunnel approaches and through Glenwood Canyon, in along-route order. They are the feeds to check before a ski-country drive: queues at the tunnel and closures in the canyon show up here first.',
    },
  },
  {
    slug: 'i-40',
    name: 'Interstate 40',
    short: 'I-40',
    from: 'Barstow, California',
    to: 'Wilmington, North Carolina',
    intro: [
      'I-40 crosses the country from Barstow to Wilmington, shadowing old Route 66 across Arizona and New Mexico before running through Amarillo, Oklahoma City, Little Rock, Memphis, Nashville and the North Carolina piedmont. Its public camera coverage is the patchiest of the eight corridors here — Tennessee, New Mexico and North Carolina publish real networks; the high desert west is sparse, and this page does not pretend otherwise.',
      'Cameras run in driving order from Barstow. The segments most worth checking before a drive: Flagstaff\'s winter storms, the Albuquerque metro, and the Smoky Mountain run between Knoxville and Asheville, where fog and ice close lanes with little warning.',
    ],
    faq: {
      q: 'Why is I-40\'s camera count lower than the other corridors?',
      a: 'Arizona, Texas and Arkansas publish few public feeds along I-40, and the western stretches cross long empty distances between towns. The count here is the real public index — 290 cameras — concentrated where the state DOTs publish.',
    },
  },
];

const BY_SLUG = new Map(CORRIDORS.map((c) => [c.slug, c]));
export function getCorridor(slug: string): CorridorDef | undefined {
  return BY_SLUG.get(slug);
}

/* ── Geometry ─────────────────────────────────────────────────────── */

interface Seg {
  a: CorridorWaypoint;
  b: CorridorWaypoint;
  chainStartKm: number;
  lengthKm: number;
  state: string;
}

function buildSegs(def: CorridorDef): { segs: Seg[]; totalKm: number } {
  const wps = CORRIDOR_PATHS[def.slug] ?? [];
  const segs: Seg[] = [];
  let chain = 0;
  for (let i = 0; i < wps.length - 1; i++) {
    const lengthKm = segmentLengthKm(wps[i], wps[i + 1]);
    segs.push({ a: wps[i], b: wps[i + 1], chainStartKm: chain, lengthKm, state: wps[i].state });
    chain += lengthKm;
  }
  return { segs, totalKm: chain };
}

/** Local equirectangular projection of a point onto segment a→b. */
function projectOntoSegment(
  lat: number,
  lng: number,
  a: CorridorWaypoint,
  b: CorridorWaypoint,
): { distKm: number; t: number; lengthKm: number } {
  const midLat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const kx = (Math.PI / 180) * EARTH_R_KM * Math.cos(midLat);
  const ky = (Math.PI / 180) * EARTH_R_KM;
  const ax = a.lng * kx;
  const ay = a.lat * ky;
  const bx = b.lng * kx;
  const by = b.lat * ky;
  const px = lng * kx;
  const py = lat * ky;
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = 0;
  if (l2 > 0) t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
  const distKm = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  return { distKm, t, lengthKm: Math.sqrt(l2) };
}

function segmentLengthKm(a: CorridorWaypoint, b: CorridorWaypoint): number {
  return projectOntoSegment(a.lat, a.lng, a, b).lengthKm;
}

export interface CorridorProjection {
  distKm: number;
  chainKm: number;
  state: string;
}

/** Project a point onto a corridor's reference path. */
export function projectOntoCorridor(
  def: CorridorDef,
  lat: number,
  lng: number,
): CorridorProjection | null {
  const { segs } = buildSegs(def);
  let best: CorridorProjection | null = null;
  for (const s of segs) {
    const { distKm, t } = projectOntoSegment(lat, lng, s.a, s.b);
    if (!best || distKm < best.distKm) {
      best = { distKm, chainKm: s.chainStartKm + t * s.lengthKm, state: s.state };
    }
  }
  return best;
}

/* ── Segment building ─────────────────────────────────────────────── */

export interface CorridorSegment {
  /** USPS code, e.g. "CO" */
  state: string;
  stateName: string;
  /** /us-traffic-cameras/[state] slug */
  stateSlug: string;
  /** All matched cameras in this state, ordered along the route. */
  cameras: CountryCamera[];
  /** Camera centroid — the segment's weather/plow anchor. */
  anchorLat: number;
  anchorLng: number;
  /** Route miles from the corridor start to this segment's first camera. */
  startMile: number;
  endMile: number;
}

export interface CorridorBuild {
  def: CorridorDef;
  total: number;
  /** Reference-path length, km (not the official route length). */
  lengthKm: number;
  segments: CorridorSegment[];
  /** Distinct camera sources (DOTs and networks) on this corridor. */
  sources: string[];
  /** Segments meeting CORRIDOR_MIN_SEGMENT. */
  richSegments: number;
  qualifies: boolean;
}

const STATE_BY_USPS = new Map(US_STATE_META.map((s) => [s.usps, s]));

export function buildCorridor(
  def: CorridorDef,
  records: readonly CountryCamera[],
  radiusKm: number = MATCH_RADIUS_KM,
): CorridorBuild {
  const { segs, totalKm } = buildSegs(def);
  const matched: Array<{ cam: CountryCamera; chainKm: number; state: string }> = [];
  for (const cam of records) {
    if (typeof cam.lat !== 'number' || typeof cam.lng !== 'number') continue;
    let best: { distKm: number; chainKm: number; state: string } | null = null;
    for (const s of segs) {
      // Cheap bbox reject (0.045° ≈ 5 km) before the projection.
      if (
        cam.lat < Math.min(s.a.lat, s.b.lat) - 0.045 ||
        cam.lat > Math.max(s.a.lat, s.b.lat) + 0.045 ||
        cam.lng < Math.min(s.a.lng, s.b.lng) - 0.045 ||
        cam.lng > Math.max(s.a.lng, s.b.lng) + 0.045
      ) {
        continue;
      }
      const { distKm, t } = projectOntoSegment(cam.lat, cam.lng, s.a, s.b);
      if (!best || distKm < best.distKm) {
        best = { distKm, chainKm: s.chainStartKm + t * s.lengthKm, state: s.state };
      }
    }
    if (best && best.distKm <= radiusKm) {
      matched.push({ cam, chainKm: best.chainKm, state: best.state });
    }
  }
  matched.sort((x, y) => x.chainKm - y.chainKm);

  const byState = new Map<string, typeof matched>();
  for (const m of matched) {
    const list = byState.get(m.state) ?? [];
    list.push(m);
    byState.set(m.state, list);
  }
  const segments: CorridorSegment[] = [...byState.entries()].map(([state, list]) => {
    const meta = STATE_BY_USPS.get(state);
    const cameras = list.map((m) => m.cam);
    const anchorLat = cameras.reduce((s, c) => s + (c.lat ?? 0), 0) / cameras.length;
    const anchorLng = cameras.reduce((s, c) => s + (c.lng ?? 0), 0) / cameras.length;
    return {
      state,
      stateName: meta?.name ?? state,
      stateSlug: meta?.slug ?? '',
      cameras,
      anchorLat,
      anchorLng,
      startMile: Math.round(list[0].chainKm * 0.621371),
      endMile: Math.round(list[list.length - 1].chainKm * 0.621371),
    };
  });
  // Segments in along-route order (first camera's chainage).
  segments.sort((a, b) => a.startMile - b.startMile);

  const sources = [...new Set(matched.map((m) => m.cam.source).filter(Boolean))] as string[];
  const richSegments = segments.filter((s) => s.cameras.length >= CORRIDOR_MIN_SEGMENT).length;
  return {
    def,
    total: matched.length,
    lengthKm: totalKm,
    segments,
    sources,
    richSegments,
    qualifies: matched.length >= CORRIDOR_MIN_TOTAL && richSegments >= CORRIDOR_MIN_RICH_SEGMENTS,
  };
}
