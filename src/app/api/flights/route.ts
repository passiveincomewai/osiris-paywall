
import { NextResponse } from 'next/server';
import { stealthFetch } from '@/lib/stealthFetch';
import { extractAircraft } from '@/lib/flights/feeds';
import { aircraftTypeName } from '@/lib/flights/type-names';
import { classifyDropReason } from '@/lib/flights/diagnostics';

export const maxDuration = 60;

// 40 regions covering every major aviation corridor at 250 nm radius.
// Focused on high-density airspace: US domestic, North Atlantic, Europe,
// Middle East hub, India, East Asia, SE Asia, Australia, South America.
//
// The Mountain West / Front Range / Arizona centres (added 2026-10-19)
// close a measured coverage HOLE: at the 250 nm provider cap, Salt Lake
// City sat 925 km from the nearest centre (Central US), Denver 555 km,
// Phoenix 552 km, Boise 589 km, Reno 636 km — no sweep response could
// contain an aircraft over Utah at all (a direct adsb.fi query centred
// on SLC returns ~50 aircraft inside Utah's bbox). Three centres put
// every one of those metros inside a queried radius.
//
// The Mid-South (Memphis) and Florida centres (added 2026-10-27) close
// the same kind of hole in the Southeast: Memphis sat 230 km from the
// nearest covered point (0 payload aircraft within 200 km of the FedEx
// superhub) and peninsular Florida was outside EVERY circle (Orlando
// 554 km, Tampa 576 km, Miami 881 km from the nearest centre; the whole
// state held 4 aircraft in the payload). Both centres sit inside the
// existing Southeast/Texas circles' overlap so the SE also gains a
// second chance when one centre's fetch fails.
export const REGIONS = [
  // North America
  { lat: 39.8,  lon: -98.5 }, // Central US
  { lat: 41.0,  lon: -74.0 }, // Northeast (NYC/Boston/DC)
  { lat: 33.0,  lon: -84.0 }, // Southeast (Atlanta)
  { lat: 35.0,  lon: -90.0 }, // Mid-South (Memphis)
  { lat: 42.0,  lon: -88.0 }, // Midwest (Chicago)
  { lat: 39.7,  lon:-105.0 }, // Front Range (Denver)
  { lat: 30.0,  lon: -97.0 }, // Texas (Dallas/Houston)
  { lat: 28.5,  lon: -81.7 }, // Florida (Orlando/Tampa/Miami)
  { lat: 19.4,  lon: -99.1 }, // Mexico City
  { lat: 47.0,  lon:-122.0 }, // Pacific Northwest (Seattle)
  { lat: 34.0,  lon:-118.0 }, // SoCal (LA)
  { lat: 40.8,  lon:-111.9 }, // Mountain West (Salt Lake City / Utah)
  { lat: 33.4,  lon:-112.1 }, // Arizona (Phoenix)
  { lat: 45.0,  lon: -73.0 }, // Canada East (Montreal/Toronto)
  { lat: 49.0,  lon: -97.0 }, // Canada Prairies
  // Europe
  { lat: 50.0,  lon:  15.0 }, // Central Europe
  { lat: 51.5,  lon:  -1.0 }, // UK / Ireland
  { lat: 47.0,  lon:   2.0 }, // France / Alps
  { lat: 40.0,  lon:  -4.0 }, // Iberia
  { lat: 42.0,  lon:  13.0 }, // Italy / Adriatic
  { lat: 60.0,  lon:  15.0 }, // Scandinavia
  { lat: 52.0,  lon:  22.0 }, // Eastern Europe / Baltics
  { lat: 39.0,  lon:  35.0 }, // Turkey / Aegean
  // Middle East & South Asia
  { lat: 25.1,  lon:  51.5 }, // Arabian Gulf (Dubai/Doha/Abu Dhabi)
  { lat: 22.0,  lon:  78.0 }, // India
  // East Asia & Pacific
  { lat: 35.0,  lon: 105.0 }, // China
  { lat: 35.0,  lon: 136.0 }, // Japan
  { lat: 37.0,  lon: 127.0 }, // Korea
  { lat: 13.0,  lon: 100.0 }, // SE Asia (Bangkok)
  { lat:  1.0,  lon: 104.0 }, // Singapore / Malacca Strait
  { lat: -6.2,  lon: 106.8 }, // Indonesia (Jakarta)
  // Australia
  { lat:-25.0,  lon: 133.0 }, // Central Australia
  { lat:-33.0,  lon: 151.0 }, // Eastern Australia (Sydney)
  { lat:-37.0,  lon: 174.8 }, // New Zealand (Auckland)
  // Africa
  { lat:  6.5,  lon:   3.4 }, // Nigeria (Lagos)
  { lat: -1.3,  lon:  36.8 }, // Kenya (Nairobi)
  { lat:  0.0,  lon:  20.0 }, // Central Africa
  { lat:-26.0,  lon:  28.0 }, // South Africa
  // South America
  { lat:-15.0,  lon: -60.0 }, // Brazil Central
  { lat:-23.0,  lon: -46.0 }, // São Paulo / Rio
];

const HELI_TYPES = new Set([
  'R22','R44','R66','B06','B06T','B204','B205','B206','B212','B222','B230',
  'B407','B412','B427','B429','B430','B505','B525',
  'AS32','AS35','AS50','AS55','AS65',
  'EC20','EC25','EC30','EC35','EC45','EC55','EC75',
  'H125','H130','H135','H145','H155','H160','H175','H215','H225',
  'S55','S58','S61','S64','S70','S76','S92',
  'A109','A119','A139','A169','A189','AW09',
  'MD52','MD60','MDHI','MD90','NOTR',
  'B47G','HUEY','GAMA','CABR','EXE',
  // Rotorcraft designators measured missing live (2026-10-27): NH90,
  // the Cabri G2's real designator (GAMA/CABR above are not it), the
  // Hughes/MD 500 family, the US military H- fleet (a CH-47 files as
  // H47, a Black Hawk as H60 — both previously rendered as planes),
  // and the Schweizer 269/300 line.
  'NH90','G2CA','H500','MD50','MD53',
  'H47','H53','H60','H64','H269','S269','S300',
]);

const PRIVATE_JET_TYPES = new Set([
  'G150','G200','G280','GLEX','G500','G550','G600','G650','G700',
  'GLF2','GLF3','GLF4','GLF5','GLF6','GL5T','GL7T','GV','GIV',
  'CL30','CL35','CL60','BD70','BD10',
  'C25A','C25B','C25C','C500','C510','C525','C550','C560','C56X','C680','C700','C750',
  'E35L','E50P','E55P','E545','E550',
  'FA50','FA7X','FA8X','F900','F2TH',
  'LJ35','LJ40','LJ45','LJ60','LJ70','LJ75',
  'PC12','PC24','TBM7','TBM8','TBM9',
  'PRM1','SF50','EA50','VLJ',
]);

const MILITARY_INDICATORS = new Set([
  'C17','C5M','C130','C30J','KC10','KC46','KC35','E3CF','E3TF','E8A',
  'B1B','B2','B52','F16','F15','F18','F22','F35','A10','F117',
  'RC135','E6B','P8A','P3','MQ9','RQ4','U2','EP3','RC12',
  'V22','CH47','UH60','AH64','AH1Z','MV22',
  'EUFI','RFAL','TORD','TYP','GR4',
]);

// Airliner and regional types, hoisted out of the classifier condition it used
// to sit inside. A typed airliner stays commercial whatever its callsign says.
const AIRLINER_TYPES = new Set([
  'A319','A320','A321','A332','A333','A339','A343','A359','A388',
  'B737','B738','B739','B38M','B39M','B752','B753','B763','B764',
  'B772','B77L','B77W','B788','B789','B78X',
  'E170','E175','E190','E195','CRJ7','CRJ9','AT43','AT72','DH8D',
]);

// Fractional-ownership and charter operators file under a 3-letter ICAO
// designator exactly like an airline, so AIRLINE_CODE_RE matches them and they
// would otherwise be counted as commercial traffic.
const BIZJET_OPERATORS = new Set([
  'EJA','EJM','NJE','LXJ','FJO','VJT','XOJ','JTL','WUP','GAJ','DPJ','CLY','TWY',
]);

const AIRLINE_CODE_RE = /^([A-Z]{3})\d/;

// A callsign that is not an airline designator + flight number is a
// registration: what general-aviation aircraft broadcast once the hyphen is
// stripped — DMMKG (D-MMKG), HBYKO (HB-YKO), OEDLH (OE-DLH), N425RS, CGABC.
const CALLSIGN_RE = /^[A-Z0-9]{3,8}$/;

// Business jets cruise in the mid-thirties at transonic speed; nothing flying
// under a civil registration reaches FL280 at 300 kt without turbofans. This is
// the only bizjet/piston discriminator available for OpenSky aircraft, which
// carry no aircraft type at all.
const JET_CRUISE_ALT_M = 8500;
const JET_CRUISE_KTS = 300;

// The regional layer runs on tar1090/ADSBexchange-v2 shaped feeds, so
// classifyFlight() works on them unchanged. Two providers serve that shape
// without an API key today, and every feed races them in a fixed order:
//
//   PRIMARY  api.adsb.lol — ODbL-licensed, so commercial-safe for the paid
//            tiers. Re-measured 2026-10-28: /v2/point at 250 nm and /v2/mil
//            both return full tar1090 data (706 aircraft over NYC, 247 on
//            the military feed). This replaces the note that used to live
//            here claiming adsb.lol answered 200 with {"ac":[],"total":0} —
//            true when written, stale by 2026-10-28.
//   FALLBACK opendata.adsb.fi — the identical shape, but a non-commercial
//            licence, so it serves ONLY where adsb.lol failed or answered
//            empty for that region/feed. It is retired in a later payload
//            once production provider counts (reported per payload below)
//            show adsb.lol carrying the load from Vercel egress.
//
// The providers this route used before both died silently:
//   api.airplanes.live  → 403 on every endpoint (now key-gated)
//   api.adsb.one/v2     → 403 (checked as a replacement, also unusable)
// Because both failure modes are silent (403 bodies are discarded, an empty
// ac[] is indistinguishable from quiet airspace), a single-feed path degrades
// to zero aircraft without ever throwing. Provider counts are reported in
// the response now so the next feed to die is visible instead of silent.
const ADSB_MAX_DIST = 250; // nm — hard cap both providers enforce
const ADSBLOL_BASE = 'https://api.adsb.lol/v2';
const ADSBFI_POINT_BASE = 'https://opendata.adsb.fi/api/v3';
const ADSBFI_MIL_URL = 'https://opendata.adsb.fi/api/v2/mil';

// The point endpoint is a provider's most-metered surface, so the regional
// sweep is paced rather than fanned out in parallel. Pacing is
// start-to-start: a region never STARTS less than ~1.05s after the previous
// one started, which keeps a 40-region sweep inside SWEEP_DEADLINE_MS — the
// old end-of-request + 1100ms gap stacked the full fetch latency of every
// region on top of the gap (~45s at 30 regions). The gap is per REGION, not
// per request: a region's adsb.fi fallback fires inside the same slot, on a
// different host's meter.
const SWEEP_START_GAP_MS = 1050;

/** One tar1090 feed fetch → its aircraft records, or null when the fetch
 *  itself failed (HTTP error, timeout, unparseable body). An OK response
 *  with no aircraft is [] — a different thing, though the callers treat
 *  both as "this provider has nothing for us here" and move to the next. */
async function fetchTar1090(url: string, timeoutMs: number): Promise<any[] | null> {
  try {
    const res = await stealthFetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) {
      await res.body?.cancel();
      return null;
    }
    return extractAircraft(await res.json());
  } catch {
    return null;
  }
}

/** The global military feed: adsb.lol primary, adsb.fi fallback when
 *  adsb.lol fails or answers empty. dbFlags semantics are identical on
 *  both (bit 1 = military) — measured 2026-10-28, all 247 records on
 *  adsb.lol /v2/mil carry the flag. */
export async function fetchMilFeed(): Promise<{ records: any[]; provider: 'adsblol' | 'adsbfi' | null }> {
  const lol = await fetchTar1090(`${ADSBLOL_BASE}/mil`, 15000);
  if (lol && lol.length > 0) return { records: lol, provider: 'adsblol' };
  if (lol === null) console.warn('[OSIRIS] adsb.lol mil feed failed — falling back to adsb.fi');
  const fi = await fetchTar1090(ADSBFI_MIL_URL, 15000);
  if (fi && fi.length > 0) return { records: fi, provider: 'adsbfi' };
  return { records: [], provider: null };
}

/** One region of the sweep: adsb.lol /v2/point primary (path segments,
 *  dist in nm), adsb.fi /v3 fallback when adsb.lol fails or answers empty
 *  for the region. Both serve the {ac: [...], total} shape
 *  extractAircraft() reads, so parsing is unchanged.
 *
 *  adsb.fi's /v2 point endpoint is NOT a fallback candidate: it answers
 *  in a deprecated shape ({aircraft: [...], resultCount}) and this route
 *  read only `ac` from it for months, ingesting ZERO aircraft while the
 *  provider returned hundreds per region (measured 2026-10-18: London
 *  725, Tokyo 203, NYC 71 → parsed as 0). extractAircraft() accepts both
 *  shapes as a safety net, and the sweep runs on /v3, adsb.fi's
 *  documented current API. adsb.fi serves /mil but returns 400 for
 *  /ladd, /pia and /squawk/{code}, so the global type feeds collapse to
 *  the military one. */
export async function fetchRegion(lat: number, lon: number): Promise<{ records: any[]; provider: 'adsblol' | 'adsbfi' | null }> {
  const lol = await fetchTar1090(`${ADSBLOL_BASE}/point/${lat}/${lon}/${ADSB_MAX_DIST}`, 8000);
  if (lol && lol.length > 0) return { records: lol, provider: 'adsblol' };
  const fi = await fetchTar1090(`${ADSBFI_POINT_BASE}/lat/${lat}/lon/${lon}/dist/${ADSB_MAX_DIST}`, 8000);
  if (fi && fi.length > 0) return { records: fi, provider: 'adsbfi' };
  return { records: [], provider: null };
}

/**
 * Whether a raw record is a helicopter, from the three pieces of
 * evidence the feeds carry:
 *
 *  1. The type designator (HELI_TYPES) — precise, but incomplete:
 *     designators the set lacked (NH90, G2CA, H500, the military
 *     H47/H60/H64 line) rendered as planes.
 *  2. OpenSky's numeric emitter category (category_os 8 = rotorcraft).
 *     OpenSky records carry no other category field.
 *  3. The tar1090 emitter category, a STRING in `category`
 *     ('A7' = rotorcraft). The classifier never read this field, so
 *     for the entire regional source — the feed actually serving
 *     production — emitter-category evidence was dead. But the field
 *     is set by each aircraft's transponder and is occasionally
 *     miscoded (measured live 2026-10-27: a B77W and a balloon
 *     reporting A7), so A7 only counts when the type designator does
 *     not positively identify a fixed-wing aircraft or a non-aircraft.
 */
export function isHelicopterRecord(f: any): boolean {
  const t = (f?.t || '').toUpperCase();
  if (HELI_TYPES.has(t)) return true;
  if (f?.category_os === 8) return true;
  if (typeof f?.category === 'string' && f.category.toUpperCase() === 'A7') {
    return !AIRLINER_TYPES.has(t) && !PRIVATE_JET_TYPES.has(t) && t !== 'BALL' && t !== 'GLID';
  }
  return false;
}

function classifyFlight(f: any) {
  const modelUpper = (f.t || '').toUpperCase();
  const flightStr = (f.flight || '').trim().toUpperCase();
  const dbFlags = (f.dbFlags || 0);

  // The only two refusals: a ground "tower" pseudo-record, or a record with
  // no position to draw. classifyDropReason() owns the conditions so the
  // classify loop can count the same drops for the coverage diagnostics.
  if (classifyDropReason(f)) return null;

  const lat = f.lat;
  const lon = f.lon;

  const callsign = flightStr || f.hex || 'UNKNOWN';
  const altRaw = f.alt_baro;
  const altMeters = typeof altRaw === 'number' ? altRaw * 0.3048 : 0;
  const speedKnots = typeof f.gs === 'number' ? Math.round(f.gs * 10) / 10 : null;
  const heading = f.track || 0;
  const isHeli = isHelicopterRecord(f);
  const isGrounded = typeof altRaw === 'number' && altRaw < 100;

  const isOsMilitary = f.category_os === 14;
  const isOsHighPerf = f.category_os === 7;
  const isOsLight = f.category_os === 2;
  // Large / high-vortex large / heavy — airline or cargo metal by weight alone.
  const isOsHeavy = f.category_os === 4 || f.category_os === 5 || f.category_os === 6;

  const airlineMatch = AIRLINE_CODE_RE.exec(callsign);
  const airlineCode = airlineMatch ? airlineMatch[1] : '';

  // OpenSky supplies no aircraft type, and its ADS-B emitter category is
  // "no information" for ~96% of aircraft even with extended=1 (measured live:
  // 597 of 620 over central Europe). Every type-based test below therefore only
  // fires on the tar1090 feeds, which is what left all OpenSky traffic in the
  // commercial bucket. The callsign is the field OpenSky always fills, so the
  // airline-designator test is what carries the split for the bulk of the map.
  const isGaCallsign = !airlineCode && CALLSIGN_RE.test(flightStr);
  const cruisesLikeAJet =
    altMeters > JET_CRUISE_ALT_M && (speedKnots ?? 0) > JET_CRUISE_KTS;

  let category: 'commercial' | 'private' | 'jet' | 'military' = 'commercial';
  if (isOsMilitary || dbFlags & 1 || MILITARY_INDICATORS.has(modelUpper) || (f.flight || '').match(/^(RCH|KING|DUKE|EVAC|JAKE|REACH|CONVOY)\d/i)) {
    category = 'military';
  } else if (AIRLINER_TYPES.has(modelUpper) || isOsHeavy) {
    category = 'commercial';
  } else if (
    BIZJET_OPERATORS.has(airlineCode) ||
    PRIVATE_JET_TYPES.has(modelUpper) ||
    isOsHighPerf ||
    (isGaCallsign && cruisesLikeAJet)
  ) {
    category = 'jet';
  } else if (isGaCallsign || isOsLight) {
    category = 'private';
  }

  return {
    callsign,
    lat: Math.round(lat * 100000) / 100000,
    lng: Math.round(lon * 100000) / 100000,
    alt: Math.round(altMeters),
    heading: Math.round(heading),
    speed_knots: speedKnots,
    model: f.t || 'Unknown',
    model_name: aircraftTypeName(f.t),
    icao24: f.hex || '',
    registration: f.r || 'N/A',
    squawk: f.squawk || '',
    airline_code: airlineCode,
    aircraft_category: isHeli ? 'heli' : 'plane',
    category,
    grounded: isGrounded,
    nac_p: f.nac_p,
    type: 'flight',
  };
}

let cachedData: any = null;
let lastFetchTime = 0;
// 90s TTL keeps us well within the authenticated OpenSky budget (4000 credits/day,
// 4 credits/call = 1000 calls/day ≈ one per 86s). The old 45s TTL at ~1920 calls/day
// was what got the VPS IP rate-limited on the anonymous pool.
const CACHE_TTL = 90000;

// OpenSky's budget is per day, not per request, so it needs its own interval
// separate from the response cache above. Authenticated it is 4000 credits/day
// and an unbounded /states/all costs 4, which is the 90s the TTL was built for.
// Anonymous it is only 400 credits/day — 100 calls, one per ~864s — so polling
// it on the same 90s TTL burns the whole day's budget in about half an hour,
// after which every call 429s and the route sits permanently in the cooldown
// branch below. That is what emptied the map: no credentials were configured,
// so the budget was gone and the feeds it fell back to were the dead ones above.
const hasOpenSkyCreds = () =>
  Boolean(process.env.OPENSKY_CLIENT_ID && process.env.OPENSKY_CLIENT_SECRET);
const openSkyInterval = () => (hasOpenSkyCreds() ? 90000 : 900000);

// The last good OpenSky snapshot is kept and reused between those calls. On the
// anonymous interval a refetch is only due every 15 minutes, and rebuilding the
// payload from the regional sweep alone in between would swing the map
// aircraft and a few hundred every 90s. Reusing the snapshot keeps the aircraft
// on screen stable; only their age varies, which providers.opensky_age_s reports.
let osSnapshot: any[] = [];
let osSnapshotTime = 0;
let fetchPromise: Promise<any> | null = null;

// ── Delta polls (?since=<token>) ──────────────────────────────────────
// Every completed payload is fingerprinted record by record and the last
// few fingerprints are kept. A poll that carries the token of one of
// them is answered with only what changed — upserts and removals —
// instead of the whole sky again (~2.35 MB every 30 s per visitor, of
// which a typical poll's worth of movement is a few percent). An
// unchanged sky answers in a few hundred bytes. A token the ring no
// longer holds gets the full payload, whose fresh token re-bases the
// client. Tokens ride completed payloads only: a first-paint partial is
// never fingerprinted and never answers a delta request, so the partial
// invariants (≤10 s paint, labelled partial, never cached) are untouched.
const FLIGHT_BUCKETS = ['commercial_flights', 'private_flights', 'private_jets', 'military_flights'] as const;
const SNAPSHOT_RING_SIZE = 4;

interface FlightsFingerprint {
  token: string;
  hashes: Map<string, string>;
  /** The snapshot's records by identity key — a diff base must be able
   *  to answer "which FIELDS changed", not just "that it changed". */
  records: Map<string, { bucket: string; record: any }>;
}
let snapshotRing: FlightsFingerprint[] = [];
let snapshotSeq = 0;

// Snapshot tokens MUST be unique per process, not just per snapshot.
// The ring above is in-memory, and production runs many function
// instances behind one origin: a token minted as a bare sequence
// ("f4") collides with the identical string another instance minted
// for a DIFFERENT snapshot, so a ?since= poll landing on that instance
// is answered with a delta — or an "unchanged" — computed against the
// wrong base. The client accepts it (it can only check the token
// string), applies removals for aircraft it actually holds, and its
// sky silently diverges from the server's until a reload (measured
// 2026-10-27: Atlanta rendered empty in the browser while the payload
// itself carried its aircraft). Namespacing every token with a random
// per-process id makes a foreign token unfindable in this ring, so the
// delta lookup misses and the caller re-bases on the full payload —
// the protocol's existing safe path.
const SNAPSHOT_TOKEN_NS = Math.random().toString(36).slice(2, 8);

/** The token the `seq`-th snapshot built by THIS process carries. */
export function snapshotToken(seq: number): string {
  return `f${SNAPSHOT_TOKEN_NS}.${seq}`;
}

/** Index a payload's records by identity key (see flightRecordKey). */
export function flightsRecordIndex(data: any): Map<string, { bucket: string; record: any }> {
  const index = new Map<string, { bucket: string; record: any }>();
  for (const bucket of FLIGHT_BUCKETS) {
    for (const record of data[bucket] ?? []) index.set(flightRecordKey(record), { bucket, record });
  }
  return index;
}

/** A flight record's identity across snapshots: its transponder code,
 *  or — for the rare records classified without one — callsign and
 *  position. The client merge (lib/flights/delta.ts) keys on the same. */
export function flightRecordKey(record: any): string {
  const hex = typeof record?.icao24 === 'string' ? record.icao24.trim() : '';
  if (hex) return hex;
  return `${record?.callsign ?? ''}|${record?.lat ?? ''}|${record?.lng ?? ''}`;
}

export function fingerprintFlightsPayload(data: any): Map<string, string> {
  const hashes = new Map<string, string>();
  for (const bucket of FLIGHT_BUCKETS) {
    for (const record of data[bucket] ?? []) {
      const serialized = `${bucket}:${JSON.stringify(record)}`;
      let hash = 0x811c9dc5;
      for (let i = 0; i < serialized.length; i++) {
        hash ^= serialized.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
      }
      hashes.set(flightRecordKey(record), (hash >>> 0).toString(36));
    }
  }
  return hashes;
}

/** Stamp a completed payload with its snapshot token and remember its
 *  fingerprint. Called exactly once per build, where the payload enters
 *  the response cache — never for a partial. */
function registerFlightsSnapshot(data: any): void {
  const token = snapshotToken(++snapshotSeq);
  data.token = token;
  snapshotRing.push({
    token,
    hashes: fingerprintFlightsPayload(data),
    records: flightsRecordIndex(data),
  });
  if (snapshotRing.length > SNAPSHOT_RING_SIZE) snapshotRing = snapshotRing.slice(-SNAPSHOT_RING_SIZE);
}

/** What changed between two fingerprinted snapshots, per bucket, and
 *  the identity keys that vanished. Pure — the protocol's whole
 *  contract in one place.
 *
 *  An upsert for an aircraft the base already holds IN THE SAME BUCKET
 *  is a FIELD PATCH: its identity plus only the fields whose values
 *  changed (between 90 s snapshots that is position/altitude/heading/
 *  speed — the static identity fields are most of a record's bytes and
 *  sending them again would make the delta nearly the full payload).
 *  New aircraft, and aircraft whose bucket changed, ride as full
 *  records. A record keyed by callsign+position whose position changed
 *  has a new key by construction: it arrives as a full record under the
 *  new key and its old key lands in `removed`. A field that disappears
 *  between snapshots cannot be expressed in a patch — classifyFlight
 *  emits a fixed field set, so the case does not arise in practice. */
export function diffFlightsSnapshots(
  baseHashes: Map<string, string>,
  baseRecords: Map<string, { bucket: string; record: any }>,
  currentData: any,
  currentHashes: Map<string, string>,
): { upserts: Record<string, any[]>; removed: string[] } {
  const upserts: Record<string, any[]> = {};
  for (const bucket of FLIGHT_BUCKETS) {
    upserts[bucket] = [];
    for (const record of currentData[bucket] ?? []) {
      const key = flightRecordKey(record);
      if (baseHashes.get(key) === currentHashes.get(key)) continue;
      const prev = baseRecords.get(key);
      if (!prev || prev.bucket !== bucket) {
        upserts[bucket].push(record);
        continue;
      }
      const patch: Record<string, unknown> = { icao24: record.icao24 };
      let changed = 0;
      for (const field of Object.keys(record)) {
        if (!Object.is(record[field], prev.record[field])) {
          patch[field] = record[field];
          changed++;
        }
      }
      upserts[bucket].push(changed ? patch : record);
    }
  }
  const removed = [...baseHashes.keys()].filter(key => !currentHashes.has(key));
  return { upserts, removed };
}

/** The delta answering a ?since= poll against the cached snapshot, or
 *  null when no delta can be computed (unknown token, no snapshot yet)
 *  and the caller should serve the full payload instead. */
function flightsDeltaResponse(since: string): NextResponse | null {
  const current = snapshotRing[snapshotRing.length - 1];
  if (!current || !cachedData) return null;
  const headers = { 'Cache-Control': 'no-store, max-age=0' };
  if (since === current.token) {
    return NextResponse.json({
      delta: true, unchanged: true, base: since, token: current.token,
      total: cachedData.total, source: cachedData.source, partial: false,
      timestamp: cachedData.timestamp,
    }, { headers });
  }
  const base = snapshotRing.find(entry => entry.token === since);
  if (!base) return null;
  const { upserts, removed } = diffFlightsSnapshots(base.hashes, base.records, cachedData, current.hashes);
  return NextResponse.json({
    delta: true, base: since, token: current.token,
    upserts, removed,
    gps_jamming: cachedData.gps_jamming, total: cachedData.total,
    source: cachedData.source, providers: cachedData.providers,
    diagnostics: cachedData.diagnostics, partial: false,
    timestamp: cachedData.timestamp,
  }, { headers });
}

const JAMMING_NACAP_THRESHOLD = 4;

// In-flight build progress, published by the builder as it goes so GET
// can answer a first paint from it while a cold build is still running
// (see FIRST_PAINT_WAIT_MS). liveRaw ALIASES the builder's own array —
// ingestAc pushes into it, so its length grows region by region with no
// extra bookkeeping. Reset at the start of every build.
let liveRaw: any[] = [];
let liveMilCount = 0;
let liveAdsblolMil = 0;
let liveAdsbfiMil = 0;
let liveAdsblolRegions = 0;
let liveAdsbfiRegions = 0;
let liveRegionsFallback = 0;
let liveSource = '';

// The regional sweep takes ~40s wall (35 paced requests) and the route cache
// only holds a finished payload for 90s, so without reuse nearly every cycle
// in the no-OpenSky steady state would pay for a full sweep — and any sweep
// that overran maxDuration would empty the layer instead of serving the last
// good result. The last successful sweep is therefore kept and reused for
// five minutes, the same pattern as the OpenSky snapshot above; the /mil feed
// still refreshes every cycle, so military traffic never rides the reuse.
let regionalSnapshot: any[] = [];
let regionalSnapshotTime = 0;
let regionalAdsblolRegions = 0;
let regionalAdsbfiRegions = 0;
let regionalRegionsFallback = 0;
const REGIONAL_REUSE_MS = 5 * 60 * 1000;
// Stop starting new region requests this long into a sweep, so a slow tail
// of timeouts cannot push the route past its 60s maxDuration. 40 regions
// at the ~1.05s pacing floor need ~41s of starts alone, so the deadline
// sits at 50s; callers no longer wait for it in the common case — GET
// serves a partial payload from the in-flight sweep once enough regions
// have answered (see FIRST_PAINT_WAIT_MS below).
const SWEEP_DEADLINE_MS = 50000;

// ── Per-region last-good fallback ─────────────────────────────────────
// A region request that fails or answers empty contributes NOTHING to
// that sweep, and at the 250 nm cap most centres have no neighbour whose
// circle overlaps them — one failed fetch therefore zeroes a whole
// region's sky, and the 5-minute snapshot reuse + 90 s response cache
// above stretch that zero across every reload in the window (measured
// over Atlanta, 2026-10-27: the Southeast circle's aircraft vanished on
// repeated reloads while its neighbours stayed healthy, and the payload
// itself reported 36 of 38 regions answered — failures are routine).
// Each region's last successful (>0) answer is therefore kept, and a
// failed/empty fetch reuses it while it is ≤15 min old — the same
// bounded-staleness bargain as the 5-minute whole-snapshot reuse, one
// level down. Fallback use is reported per payload
// (providers.adsblol_regions_fallback) so a region living on last-good
// data stays visible instead of silently passing as live.
export const REGION_LAST_GOOD_MAX_AGE_MS = 15 * 60 * 1000;

export interface RegionLastGood {
  records: any[];
  time: number;
}

const regionLastGood = new Map<string, RegionLastGood>();

export function regionLastGoodKey(region: { lat: number; lon: number }): string {
  return `${region.lat},${region.lon}`;
}

/** What one region contributes to a sweep: its fresh answer when the
 *  fetch returned aircraft; otherwise its last-good records while they
 *  are young enough; otherwise nothing. Pure. The sweep stores a fresh
 *  answer into the cache itself, and reused records never refresh
 *  their own timestamp, so last-good data goes stale on schedule
 *  instead of becoming immortal. */
export function resolveRegionContribution(
  fresh: any[],
  lastGood: RegionLastGood | undefined,
  now: number,
): { records: any[]; usedFallback: boolean } {
  if (fresh.length > 0) return { records: fresh, usedFallback: false };
  if (
    lastGood &&
    lastGood.records.length > 0 &&
    now - lastGood.time <= REGION_LAST_GOOD_MAX_AGE_MS
  ) {
    return { records: lastGood.records, usedFallback: true };
  }
  return { records: [], usedFallback: false };
}

/** Aircraft actually ingested from the regional sweep: what the
 *  payload holds once the sweep has run, minus the two feeds that were
 *  ingested before it started (the military feed and the OpenSky
 *  snapshot). The fresh-sweep path used to derive this from a final
 *  re-ingest of the sweep records, but those records already reach
 *  allRaw per region (for the first-paint path), so the re-ingest added
 *  zero and adsblol_regional reported 0 for every fresh sweep. */
export function regionalIngestedCount(
  afterTotal: number,
  milCount: number,
  openSkyCount: number,
): number {
  return Math.max(0, afterTotal - milCount - openSkyCount);
}

// First paint: a cold sweep takes ~40s+, and the first visitor used to
// wait for ALL of it before a single aircraft rendered. GET now races
// the in-flight build against this wait; on timeout it answers from the
// records gathered so far (military feed + the regions already swept —
// North America is swept first, so the busiest home airspace is in) and
// lets the build finish in the background for the next poll. A partial
// payload is labelled (providers.adsblol_regions < REGIONS.length,
// `partial: true`) and never cached — the completed build replaces it.
const FIRST_PAINT_WAIT_MS = 10000;
const MIN_PARTIAL_AIRCRAFT = 200;

// Back off from OpenSky after a 429 so the daily quota can reset.
// Re-poking a limited endpoint on every cache miss keeps the IP throttled.
let openSkyCooldownUntil = 0;
const OPENSKY_COOLDOWN = 15 * 60 * 1000; // 15 min

// OpenSky OAuth2 — optional but recommended for VPS deployments.
// Without keys: anonymous, works fine on residential IPs. VPS IPs can
// be throttled by OpenSky's anonymous per-IP pool. Setting these env
// vars bypasses the per-IP pool (account pool: 4000 credits/day).
let osToken: string | null = null;
let osTokenExpiry = 0;

async function getOpenSkyToken(): Promise<string | null> {
  const id = process.env.OPENSKY_CLIENT_ID;
  const secret = process.env.OPENSKY_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (osToken && Date.now() < osTokenExpiry) return osToken;
  try {
    const res = await fetch(
      'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'client_credentials', client_id: id, client_secret: secret }),
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) { console.warn('[OSIRIS] OpenSky token failed:', res.status); return null; }
    const data = await res.json();
    if (!data.access_token) {
      console.warn('[OSIRIS] OpenSky token response missing access_token');
      return null;
    }
    osToken = data.access_token;
    osTokenExpiry = Date.now() + ((data.expires_in || 1800) - 60) * 1000;
    return osToken;
  } catch (e) {
    console.warn('[OSIRIS] OpenSky token error:', e);
    return null;
  }
}

function ingestAc(raw: any[], into: any[], seen: Set<string>) {
  for (const ac of raw) {
    const hex = (ac.hex || '').toLowerCase().trim();
    if (hex && !seen.has(hex)) { seen.add(hex); into.push(ac); }
  }
}

/** Classify a raw record set into the four buckets + jamming points. */
function classifyAll(allRaw: any[]) {
  const commercial: any[] = [];
  const privateFl: any[] = [];
  const jets: any[] = [];
  const military: any[] = [];
  const gpsJamming: any[] = [];
  let droppedInvalid = 0;

  for (const raw of allRaw) {
    const flight = classifyFlight(raw);
    if (!flight) { droppedInvalid++; continue; }

    if (typeof flight.nac_p === 'number' && flight.nac_p <= JAMMING_NACAP_THRESHOLD && !flight.grounded) {
      gpsJamming.push({ lat: flight.lat, lng: flight.lng, nac_p: flight.nac_p, callsign: flight.callsign });
    }

    switch (flight.category) {
      case 'military': military.push(flight); break;
      case 'jet':      jets.push(flight);     break;
      case 'private':  privateFl.push(flight); break;
      default:         commercial.push(flight);
    }
  }
  return { commercial, privateFl, jets, military, gpsJamming, droppedInvalid };
}

/** Assemble the response payload from classified buckets. One builder
 *  for the completed payload and the first-paint partial, so the two
 *  can never drift in shape. */
function assemblePayload(
  built: ReturnType<typeof classifyAll>,
  total: number,
  meta: { source: string; adsblolMil: number; adsbfiMil: number; regionalIngested: number; adsblolRegions: number; adsbfiRegions: number; regionsFallback: number; partial: boolean },
) {
  return {
    commercial_flights: built.commercial,
    private_flights:    built.privateFl,
    private_jets:       built.jets,
    military_flights:   built.military,
    gps_jamming:        aggregateJamming(built.gpsJamming, JAMMING_NACAP_THRESHOLD),
    total,
    source:             meta.source,
    // True only for a first-paint answer built from an in-flight sweep:
    // the buckets hold the regions swept so far, and the next poll
    // replaces it with the completed payload.
    partial:            meta.partial,
    // Per-feed counts so a provider that starts answering 200 with no aircraft
    // is visible in the payload rather than silently emptying the map.
    providers: {
      adsblol_mil:      meta.adsblolMil,
      adsbfi_mil:       meta.adsbfiMil,
      adsblol_regional: meta.regionalIngested,
      adsblol_regions:  meta.adsblolRegions,
      adsbfi_regions:   meta.adsbfiRegions,
      adsblol_regions_fallback: meta.regionsFallback,
      adsblol_regional_age_s: regionalSnapshotTime ? Math.round((Date.now() - regionalSnapshotTime) / 1000) : null,
      opensky:         osSnapshot.length,
      opensky_auth:    hasOpenSkyCreds(),
      opensky_age_s:   osSnapshotTime ? Math.round((Date.now() - osSnapshotTime) / 1000) : null,
    },
    // Exclusion bookkeeping for the admin coverage diagnostics.
    // dropped_invalid is a genuine count from the classify loop above
    // (tower pseudo-records + records with no position). dropped_stale is
    // null ON PURPOSE: this route applies no staleness filter, so nothing
    // is excluded for age and there is no honest number to report —
    // freshness is bounded by the provider snapshot ages in `providers`.
    diagnostics: {
      dropped_invalid: built.droppedInvalid,
      dropped_stale: null,
    },
    timestamp:          new Date().toISOString(),
  };
}

/** First-paint payload from the in-flight build, or null when the build
 *  has not gathered enough to be worth painting yet. */
function buildPartialPayload(): any | null {
  // Gate on gathered records only — NOT on liveSource. liveSource is
  // assigned when phase 2 completes, but phase 1 (mil feed + OpenSky)
  // can stall for the OpenSky fetch's full 30s timeout, and in that
  // window the military feed's aircraft are already in liveRaw and
  // worth painting. Gating on liveSource made the first-paint race
  // fall through to awaiting the whole ~50s build (measured 53s on a
  // cold cache, 2026-10-26) — the partial existed precisely to
  // prevent that. The provisional source label is 'regional': the
  // mil feed is part of every regional build, a partial is labelled
  // partial:true and never cached, and the completed build in the
  // same cycle stamps the exact source.
  if (liveRaw.length < MIN_PARTIAL_AIRCRAFT) return null;
  const regionalIngested = liveSource === 'regional' ? Math.max(0, liveRaw.length - liveMilCount) : 0;
  return assemblePayload(classifyAll(liveRaw), liveRaw.length, {
    source: liveSource || 'regional',
    adsblolMil: liveAdsblolMil,
    adsbfiMil: liveAdsbfiMil,
    regionalIngested,
    adsblolRegions: liveAdsblolRegions,
    adsbfiRegions: liveAdsbfiRegions,
    regionsFallback: liveRegionsFallback,
    partial: true,
  });
}

export async function GET(request?: Request) {
  const now = Date.now();
  let since: string | null = null;
  try { since = request ? new URL(request.url).searchParams.get('since') : null; } catch { since = null; }

  if (cachedData && now - lastFetchTime < CACHE_TTL) {
    if (since) {
      // A delta the ring can answer is a few KB at most; a token it
      // cannot falls through to the full payload below.
      const delta = flightsDeltaResponse(since);
      if (delta) return delta;
    }
    return NextResponse.json(cachedData, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  }

  if (!fetchPromise) {
    fetchPromise = (async () => {
    const allRaw: any[] = [];
    const seenHex = new Set<string>();
    let source: string;
    // Publish progress for GET's first-paint path (see buildPartialPayload).
    liveRaw = allRaw;
    liveMilCount = 0;
    liveAdsblolMil = 0;
    liveAdsbfiMil = 0;
    liveAdsblolRegions = 0;
    liveAdsbfiRegions = 0;
    liveRegionsFallback = 0;
    liveSource = '';

    // ── Phase 1 + 2 in parallel: global military feed AND OpenSky simultaneously ──
    // Running them together keeps total wall-clock time to max(mil_feed, opensky)
    // instead of sum. The military feed runs every cycle regardless of OpenSky
    // status and is always current, so military traffic stays live even while an
    // anonymous OpenSky snapshot is waiting out its interval.
    const skipOpenSky =
      Date.now() < openSkyCooldownUntil ||
      Date.now() - osSnapshotTime < openSkyInterval();
    const token = skipOpenSky ? null : await getOpenSkyToken();
    const osInit: RequestInit = token
      ? { signal: AbortSignal.timeout(30000), headers: { Authorization: `Bearer ${token}` } }
      : { signal: AbortSignal.timeout(30000) };

    const [milRes, osRes] = await Promise.allSettled([
      fetchMilFeed(),
      skipOpenSky
        ? Promise.reject(new Error('OpenSky in cooldown'))
        // extended=1 appends the ADS-B emitter category as an 18th field. Without
        // it the state vector is 17 long and s[17] below is silently undefined,
        // which is what made every category_os test in classifyFlight() dead.
        // It does not change the credit cost — that is set by the area queried.
        : stealthFetch('https://opensky-network.org/api/states/all?extended=1', osInit),
    ]);

    // Ingest the military feed, split by the provider that served it so
    // the payload's provider counts show which one carried the feed.
    let adsblolMil = 0;
    let adsbfiMil = 0;
    if (milRes.status === 'fulfilled') {
      const before = allRaw.length;
      ingestAc(milRes.value.records, allRaw, seenHex);
      const ingested = allRaw.length - before;
      if (milRes.value.provider === 'adsblol') adsblolMil = ingested;
      else if (milRes.value.provider === 'adsbfi') adsbfiMil = ingested;
      else console.warn('[OSIRIS] both military feeds (adsb.lol primary, adsb.fi fallback) returned no aircraft');
    }
    const milCount = allRaw.length;
    liveMilCount = milCount;
    liveAdsblolMil = adsblolMil;
    liveAdsbfiMil = adsbfiMil;

    // Refresh the OpenSky snapshot when one was due; otherwise the existing one
    // carries over untouched.
    if (osRes.status === 'fulfilled') {
      if (osRes.value.status === 429) {
        openSkyCooldownUntil = Date.now() + OPENSKY_COOLDOWN;
        console.warn('[OSIRIS] OpenSky 429 — cooling down 15 min');
        await osRes.value.body?.cancel();
      } else if (osRes.value.ok) {
        try {
          const data = await osRes.value.json();
          const states = data.states || [];
          if (states.length > 100) {
            osSnapshot = states.map((s: any[]) => ({
              hex: s[0],
              flight: s[1]?.trim(),
              lon: s[5],
              lat: s[6],
              alt_baro: typeof s[7] === 'number' ? s[7] * 3.28084 : null,
              gs: typeof s[9] === 'number' ? s[9] * 1.94384 : null,
              track: s[10],
              squawk: s[14],
              category_os: s[17],
            }));
            osSnapshotTime = Date.now();
          }
        } catch (e) {
          console.warn('[OSIRIS] OpenSky parse error:', e);
        }
      } else {
        // A rejected token surfaces here as a 401 — previously discarded silently.
        console.warn('[OSIRIS] OpenSky returned', osRes.value.status);
        await osRes.value.body?.cancel();
      }
    }

    ingestAc(osSnapshot, allRaw, seenHex);
    const openSkyIngested = allRaw.length - milCount;
    const openSkyWorked = osSnapshot.length > 0;

    // ── Phase 3: Regional sweep — last resort only ────────────────────────────
    // Runs only when there is no OpenSky snapshot at all. The point
    // endpoints are the providers' most-metered surface, so instead of
    // re-sweeping on every cache cycle the last good sweep is reused for
    // REGIONAL_REUSE_MS — the same snapshot pattern as OpenSky above. Paced
    // at ~1 region start/s with a hard deadline inside the 60s maxDuration.
    let regionalIngested = 0;
    if (!openSkyWorked) {
      source = 'regional';
      liveSource = source;

      if (regionalSnapshot.length > 0 && Date.now() - regionalSnapshotTime < REGIONAL_REUSE_MS) {
        const before = allRaw.length;
        ingestAc(regionalSnapshot, allRaw, seenHex);
        regionalIngested = allRaw.length - before;
        liveAdsblolRegions = regionalAdsblolRegions;
        liveAdsbfiRegions = regionalAdsbfiRegions;
        liveRegionsFallback = regionalRegionsFallback;
      } else {
        console.warn('[OSIRIS] no OpenSky snapshot — running the regional sweep (adsb.lol primary, adsb.fi fallback)');
        const sweepRaw: any[] = [];
        const sweepSeen = new Set<string>();
        const sweepStart = Date.now();
        let answeredLol = 0;
        let answeredFi = 0;
        let fallbackRegions = 0;

        let lastStart = 0;
        for (const r of REGIONS) {
          if (Date.now() - sweepStart > SWEEP_DEADLINE_MS) {
            console.warn('[OSIRIS] regional sweep hit its deadline — keeping the partial result');
            break;
          }
          const paceWait = SWEEP_START_GAP_MS - (Date.now() - lastStart);
          if (lastStart && paceWait > 0) {
            await new Promise(resolve => setTimeout(resolve, paceWait));
          }
          lastStart = Date.now();
          const fetched = await fetchRegion(r.lat, r.lon);
          // A failed/empty fetch falls back to the region's last-good
          // records (≤15 min old) instead of contributing zero — see
          // resolveRegionContribution. Only a fresh answer refreshes
          // the cache, so fallback data still ages out on schedule.
          const key = regionLastGoodKey(r);
          const contribution = resolveRegionContribution(
            fetched.records,
            regionLastGood.get(key),
            Date.now(),
          );
          if (fetched.records.length > 0) {
            if (fetched.provider === 'adsblol') answeredLol++;
            else answeredFi++;
            regionLastGood.set(key, { records: fetched.records, time: Date.now() });
          } else if (contribution.usedFallback) {
            fallbackRegions++;
          }
          const regionAc = contribution.records;
          ingestAc(regionAc, sweepRaw, sweepSeen);
          // Publish per region for the first-paint path — the records
          // land in allRaw HERE, not in a later re-ingest (which is
          // why regionalIngested is computed by difference below).
          ingestAc(regionAc, allRaw, seenHex);
          liveAdsblolRegions = answeredLol;
          liveAdsbfiRegions = answeredFi;
          liveRegionsFallback = fallbackRegions;
        }

        if (sweepRaw.length > 0) {
          regionalSnapshot = sweepRaw;
          regionalSnapshotTime = Date.now();
          regionalAdsblolRegions = answeredLol;
          regionalAdsbfiRegions = answeredFi;
          regionalRegionsFallback = fallbackRegions;
        }
        regionalIngested = regionalIngestedCount(allRaw.length, milCount, openSkyIngested);
      }

      if (allRaw.length === 0) {
        console.error(
          '[OSIRIS] every flight provider returned zero aircraft — ' +
          'set OPENSKY_CLIENT_ID/OPENSKY_CLIENT_SECRET (free at opensky-network.org); ' +
          'the anonymous 400 credits/day pool cannot sustain a live map'
        );
      }
    } else {
      source = hasOpenSkyCreds() ? 'opensky-auth' : 'opensky-anon';
      liveSource = source;
    }

    // ── Classify + assemble (shared with the first-paint partial) ─────
    return assemblePayload(classifyAll(allRaw), allRaw.length, {
      source,
      adsblolMil,
      adsbfiMil,
      regionalIngested,
      adsblolRegions: regionalAdsblolRegions,
      adsbfiRegions: regionalAdsbfiRegions,
      regionsFallback: regionalRegionsFallback,
      partial: false,
    });
    })();
    // If GET answers a first-paint partial, this build finishes unwatched;
    // the rejection handler here keeps that path from surfacing as an
    // unhandled rejection. Awaiting callers still see the rejection.
    fetchPromise.catch(() => {});
  }

  try {
    const raced = await Promise.race([
      fetchPromise.then((data) => ({ done: true as const, data })),
      new Promise<{ done: false }>((resolve) =>
        setTimeout(() => resolve({ done: false }), FIRST_PAINT_WAIT_MS),
      ),
    ]);
    if (!raced.done) {
      // First paint: answer from the in-flight build rather than making
      // the first visitor wait out a cold ~40s sweep. The build keeps
      // running; the next poll (30s) picks up the completed payload.
      const partial = buildPartialPayload();
      if (partial) {
        return NextResponse.json(partial, {
          headers: { 'Cache-Control': 'no-store, max-age=0' },
        });
      }
      // Nothing worth painting yet — wait for the real build instead of
      // serving an empty sky.
    }
    const data = raced.done ? raced.data : await fetchPromise;
    cachedData = data;
    lastFetchTime = Date.now();
    fetchPromise = null;
    if (typeof data?.token !== 'string') registerFlightsSnapshot(data);
    if (since) {
      const delta = flightsDeltaResponse(since);
      if (delta) return delta;
    }
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': data.total < 100 ? 'no-store, max-age=0' : 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('[OSIRIS] Flight fetch error:', error);
    fetchPromise = null;
    // Stale-cache fallback: return last known good data instead of blank map
    if (cachedData) {
      console.warn('[OSIRIS] Returning stale flight cache as fallback');
      return NextResponse.json({ ...cachedData, source: (cachedData.source || 'unknown') + '+stale' }, {
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      });
    }
    return NextResponse.json({ error: 'Failed to fetch flight data' }, { status: 500 });
  }
}

function aggregateJamming(points: any[], threshold: number) {
  if (points.length === 0) return [];
  const grid = new Map<string, { lat: number; lng: number; count: number; total_nac_p: number }>();
  const GRID_SIZE = 2;

  for (const p of points) {
    const gLat = Math.floor(p.lat / GRID_SIZE) * GRID_SIZE;
    const gLng = Math.floor(p.lng / GRID_SIZE) * GRID_SIZE;
    const key = `${gLat},${gLng}`;
    if (!grid.has(key)) grid.set(key, { lat: gLat + GRID_SIZE / 2, lng: gLng + GRID_SIZE / 2, count: 0, total_nac_p: 0 });
    const cell = grid.get(key)!;
    cell.count++;
    cell.total_nac_p += p.nac_p;
  }

  return Array.from(grid.values())
    .filter(z => z.count >= 3)
    .map(z => ({
      lat: z.lat,
      lng: z.lng,
      severity: Math.round((1 - (z.total_nac_p / z.count) / threshold) * 100),
      count: z.count,
    }));
}
