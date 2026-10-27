import { cachedSource } from '@/lib/sourceCache';

/**
 * OSIRIS — Snow plow / winter maintenance vehicles.
 *
 * One verified public feed exists today: the Iowa DOT "Snow Plow Truck
 * Location (AVL)" ArcGIS Online FeatureServer — keyless, republished
 * every ~2 minutes, carrying every active Iowa DOT plow with heading,
 * speed (mph), blade states and material activity. Verified live from
 * this codebase's sandbox on 2026-10-26 (48 trucks in the sample pull).
 *
 * The IBI 511 family we already poll for cameras (UT/NV/FL/GA/NC/AZ/LA)
 * was probed for a sibling `/List/GetData/` plow resource on UDOT the
 * same day: the pattern itself works (`Incidents` answers with a valid
 * DataTables envelope), but every plausible plow resource name
 * (SnowPlows, Plows, PlowTrucks, AVL, VehicleLocations, …) returns the
 * platform's HTTP 500 for unknown resources — the same answer a
 * deliberately bogus name gets. No IBI plow resource is exposed under
 * those names, so no other state is claimed here. Finland's Digitraffic
 * maintenance tracking also answers keyless, but its REST shape is
 * driven-route history (LineStrings, ~80k features / 4 MB), not latest
 * vehicle points, so it is not the cheap add it first looks.
 *
 * Honesty rules, same as the other layers: if the feed is down the
 * layer is empty and the route says `stale` — positions are never
 * fabricated or carried forward as if current. The cache below only
 * bridges a failed refresh with the last good set, and the feed-status
 * flag reports that this happened.
 */

export interface Plow {
  id: string;
  /** The truck's fleet label (Iowa "A-name", e.g. "A31332"), when given. */
  label?: string;
  lat: number;
  lng: number;
  /** Degrees clockwise from north, when the truck reports it. */
  heading?: number;
  /** Ground speed, mph, rounded. */
  speed?: number;
  /**
   * Blade state in words — present only when the truck reports a real
   * blade reading. Iowa codes the four blade-state fields 9999 for
   * "no data", which most trucks report outside an active storm.
   */
  status?: string;
  agency: string;
  /** ISO timestamp of the truck's last AVL ping (UTC at the source). */
  updatedAt: string;
}

/** One feature of the ArcGIS GeoJSON response — only the fields we read. */
export interface IowaAvlFeature {
  type?: string;
  geometry?: { type?: string; coordinates?: [number, number] } | null;
  properties?: {
    OBJECTID?: number | null;
    LABEL?: string | null;
    XPOSITION?: number | null;
    YPOSITION?: number | null;
    HEADING?: number | null;
    VELOCITY?: number | null;
    FRONTPLOWSTATE?: number | null;
    RIGHTWINGPLOWSTATE?: number | null;
    LEFTWINGPLOWSTATE?: number | null;
    UNDERBELLYPLOWSTATE?: number | null;
    MODIFIEDDT?: number | null;
  } | null;
}

/* Iowa's state bounds, slightly padded — drops the occasional
   mis-geocoded row the way the camera loaders drop theirs. */
const IOWA_BOUNDS = { minLat: 40.2, maxLat: 43.7, minLng: -96.9, maxLng: -89.9 };

function finiteIn(v: unknown, min: number, max: number): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null;
}

/**
 * Blade wording from the four blade-state fields. Iowa documents 1 as
 * blade down / engaged and 0 as up; 9999 (and null) mean the truck is
 * not reporting. A truck with no real reading gets no status at all —
 * "unknown" rendered as a status would be a claim the feed didn't make.
 */
export function bladeStatus(props: NonNullable<IowaAvlFeature['properties']>): string | undefined {
  const states = [props.FRONTPLOWSTATE, props.RIGHTWINGPLOWSTATE, props.LEFTWINGPLOWSTATE, props.UNDERBELLYPLOWSTATE]
    .filter((s): s is number => typeof s === 'number' && Number.isFinite(s) && s !== 9999);
  if (!states.length) return undefined;
  return states.some(s => s === 1) ? 'Plowing' : 'Blade up';
}

/** Map one ArcGIS GeoJSON feature to a plow, or null if it can't be placed. */
export function normalizeIowaFeature(f: IowaAvlFeature): Plow | null {
  const props = f?.properties ?? {};
  const coords = f?.geometry?.coordinates;
  const lng = finiteIn(coords?.[0], -180, 180) ?? finiteIn(props.XPOSITION, -180, 180);
  const lat = finiteIn(coords?.[1], -90, 90) ?? finiteIn(props.YPOSITION, -90, 90);
  if (lat == null || lng == null) return null;
  if (lat < IOWA_BOUNDS.minLat || lat > IOWA_BOUNDS.maxLat || lng < IOWA_BOUNDS.minLng || lng > IOWA_BOUNDS.maxLng) return null;

  const updatedMs = typeof props.MODIFIEDDT === 'number' && Number.isFinite(props.MODIFIEDDT) ? props.MODIFIEDDT : null;
  if (updatedMs == null) return null;

  const label = typeof props.LABEL === 'string' && props.LABEL.trim() ? props.LABEL.trim() : undefined;
  const heading = finiteIn(props.HEADING, 0, 360);
  const speed = finiteIn(props.VELOCITY, 0, 120);
  const status = bladeStatus(props);

  return {
    id: `iowa-${label ?? props.OBJECTID ?? `${lat},${lng}`}`,
    ...(label ? { label } : {}),
    lat,
    lng,
    ...(heading != null ? { heading } : {}),
    ...(speed != null ? { speed: Math.round(speed) } : {}),
    ...(status ? { status } : {}),
    agency: 'Iowa DOT',
    updatedAt: new Date(updatedMs).toISOString(),
  };
}

/** Map a whole ArcGIS GeoJSON FeatureCollection, dropping unplaceable rows. */
export function normalizeIowaFeed(fc: { features?: IowaAvlFeature[] } | null | undefined): Plow[] {
  const out: Plow[] = [];
  const seen = new Set<string>();
  for (const f of fc?.features ?? []) {
    const plow = normalizeIowaFeature(f);
    if (plow && !seen.has(plow.id)) {
      seen.add(plow.id);
      out.push(plow);
    }
  }
  return out;
}

const IOWA_AVL_QUERY =
  'https://services.arcgis.com/8lRhdTsQyJpO52F1/arcgis/rest/services/AVL_Direct_View/FeatureServer/0/query' +
  '?where=1%3D1&outFields=OBJECTID,LABEL,XPOSITION,YPOSITION,HEADING,VELOCITY,' +
  'FRONTPLOWSTATE,RIGHTWINGPLOWSTATE,LEFTWINGPLOWSTATE,UNDERBELLYPLOWSTATE,MODIFIEDDT' +
  '&outSR=4326&f=geojson&resultRecordCount=2000&orderByFields=OBJECTID';

/* Feed health, recorded by the fetcher itself — it only runs on a real
   upstream attempt, which is exactly when the answer changes. The route
   reads this to say `stale` honestly when a refresh failed and the
   cache is bridging with the last good set. */
let lastAttemptOk: boolean | null = null;
let lastFetchedAt: string | null = null;

export function getPlowFeedStatus(): { ok: boolean | null; fetchedAt: string | null } {
  return { ok: lastAttemptOk, fetchedAt: lastFetchedAt };
}

async function fetchIowaPlows(): Promise<Plow[]> {
  try {
    const res = await fetch(IOWA_AVL_QUERY, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Iowa DOT AVL HTTP ${res.status}`);
    const fc = await res.json();
    const plows = normalizeIowaFeed(fc);
    lastAttemptOk = true;
    lastFetchedAt = new Date().toISOString();
    return plows;
  } catch (e) {
    lastAttemptOk = false;
    throw e;
  }
}

/**
 * Every currently-reporting Iowa DOT plow. Cached 90 s server-side —
 * the feed itself republishes about every 2 minutes, so a shorter TTL
 * would only re-ask for the same trucks. On failure the cache keeps
 * the last good set (and `getPlowFeedStatus` reports the failure).
 */
export const getPlows = cachedSource<Plow>('plows-iowa-avl', fetchIowaPlows, 90_000);
