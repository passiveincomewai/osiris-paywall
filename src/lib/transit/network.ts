import { extractZipText, parseCsv, routeTypeMode } from './staticGtfs';
import type { TransitMode } from './agencies';

/**
 * OSIRIS — transit NETWORK build: routes, stops and schedules from an
 * agency's static GTFS — the operational layer under the live vehicles.
 *
 * Source choice (audited 2026-10-20 for UTA): the agency's own GTFS
 * static zip is primary. It is the same publication the GTFS-RT feeds
 * join against (identical internal route/trip/stop ids), it carries
 * route colors, full shape geometry, and the complete schedule
 * (stop_times + calendar), and it is already the vehicle layer's join
 * source. UTA's ArcGIS Hub "UTA SERVICE DATA" collection (the datasets
 * Jameson supplied) is a ridership/planning publication — its routes
 * service holds 90 planning lines with boardings fields, not the ~150
 * operational routes, and its ids do not join the realtime feeds — so
 * the hub is provenance and discovery, not the operational source.
 * Hub terms: published data is public data, provided "as is"; the UI
 * credits "Utah Transit Authority (UTA Open Data)".
 *
 * Everything schedule-shaped here is a pure function over parsed GTFS
 * so it unit-tests on fixture CSVs. The parsed network is cached in
 * memory for 12 h (agencies republish on schedule changes, not
 * intraday), with stale-on-error like the trip map in staticGtfs.
 *
 * GTFS times are agency-local wall times that may run past 24:00 —
 * a "25:10" departure belongs to the PREVIOUS service day. All the
 * day math below is done in the agency's IANA timezone; nothing here
 * assumes the server's clock zone.
 */

export interface NetworkRoute {
  /** Internal GTFS route_id — the key realtime feeds join on. */
  id: string;
  /** Public route label (route_short_name), e.g. "701". */
  short: string;
  /** route_long_name, e.g. "Blue Line" (may equal short). */
  long: string;
  mode: TransitMode;
  /** '#RRGGBB' — the agency's own route_color, else a per-mode default. */
  color: string;
  url?: string;
}

export interface NetworkStop {
  id: string;
  code?: string;
  name: string;
  lat: number;
  lng: number;
  /** Public route labels serving this stop, display-sorted. */
  routes: string[];
}

export interface DirectionInfo {
  dir: number;
  headsign: string;
  /** Stop ids in travel order (the representative trip's sequence). */
  stopIds: string[];
  /** [lng, lat] polyline — the representative trip's shape, thinned. */
  line: [number, number][];
}

export interface NetTripStop {
  stopId: string;
  seq: number;
  arrSec: number;
  depSec: number;
}

export interface NetTrip {
  id: string;
  routeId: string;
  serviceId: string;
  dir: number;
  headsign: string;
  stops: NetTripStop[];
}

export interface ServiceCalendar {
  /** Weekday mask, index 0 = Monday … 6 = Sunday. */
  days: boolean[];
  start: string; // YYYYMMDD
  end: string; // YYYYMMDD
}

export interface TransitNetwork {
  routes: NetworkRoute[];
  routeById: Map<string, NetworkRoute>;
  routeByShort: Map<string, NetworkRoute>;
  stops: NetworkStop[];
  stopById: Map<string, NetworkStop>;
  /** routeId → directions with representative stop order + geometry. */
  directions: Map<string, DirectionInfo[]>;
  trips: NetTrip[];
  tripById: Map<string, NetTrip>;
  /** stopId → scheduled calls (trip, sequence, departure seconds). */
  stopCalls: Map<string, Array<{ tripId: string; seq: number; depSec: number }>>;
  services: Map<string, ServiceCalendar>;
  /** "YYYYMMDD|serviceId" → 1 (added) | 2 (removed). */
  exceptions: Map<string, number>;
  feedVersion?: string;
}

/** GTFS "H:MM:SS" (hours may exceed 23) → seconds since service-day start. */
export function parseGtfsTime(s: string | undefined): number | null {
  if (!s) return null;
  const m = /^(\d{1,3}):(\d{2})(?::(\d{2}))?$/.exec(s.trim());
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3] ?? 0);
}

const MODE_COLORS: Record<TransitMode, string> = {
  bus: '#FFA726', tram: '#66BB6A', metro: '#42A5F5',
  train: '#AB47BC', ferry: '#26C6DA', transit: '#B0BEC5',
};

function normColor(raw: string | undefined, mode: TransitMode): string {
  const c = (raw ?? '').trim();
  return /^[0-9a-fA-F]{6}$/.test(c) ? `#${c.toUpperCase()}` : MODE_COLORS[mode];
}

function round5(n: number): number {
  return Math.round(n * 100000) / 100000;
}

function haversineM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Thin a shape polyline: keep the first point, then any point at least
 * `minM` metres from the last kept one, then the last point. UTA shapes
 * run ~10–25 m apart on curves; 12 m thinning keeps the visual line
 * faithful while cutting the served payload roughly in half. Points are
 * rounded to 5 decimals (~1 m) on the way out.
 */
export function thinLine(pts: [number, number][], minM = 12): [number, number][] {
  if (pts.length <= 2) return pts.map(([lng, lat]) => [round5(lng), round5(lat)]);
  const out: [number, number][] = [[round5(pts[0][0]), round5(pts[0][1])]];
  let last = pts[0];
  for (let i = 1; i < pts.length - 1; i++) {
    if (haversineM(last[1], last[0], pts[i][1], pts[i][0]) >= minM) {
      out.push([round5(pts[i][0]), round5(pts[i][1])]);
      last = pts[i];
    }
  }
  out.push([round5(pts[pts.length - 1][0]), round5(pts[pts.length - 1][1])]);
  return out;
}

/** shapes.txt → shapeId → [lng, lat] points in sequence order.
 *  Line scanner (95k rows of pure numerics) like parseTripStopNames. */
export function parseShapes(csv: string): Map<string, [number, number][]> {
  const lines = csv.split('\n');
  const out = new Map<string, Array<[number, number, number]>>();
  if (lines.length < 2) return new Map();
  const head = lines[0].replace(/^\uFEFF/, '').split(',').map(h => h.trim());
  const iId = head.indexOf('shape_id');
  const iLat = head.indexOf('shape_pt_lat');
  const iLon = head.indexOf('shape_pt_lon');
  const iSeq = head.indexOf('shape_pt_sequence');
  if (iId < 0 || iLat < 0 || iLon < 0 || iSeq < 0) return new Map();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.includes('"')) continue;
    const f = line.split(',');
    const id = f[iId]?.trim();
    const lat = Number(f[iLat]);
    const lon = Number(f[iLon]);
    const seq = Number(f[iSeq]);
    if (!id || !Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(seq)) continue;
    let arr = out.get(id);
    if (!arr) { arr = []; out.set(id, arr); }
    arr.push([lon, lat, seq]);
  }
  const done = new Map<string, [number, number][]>();
  for (const [id, arr] of out) {
    arr.sort((a, b) => a[2] - b[2]);
    done.set(id, arr.map(([lng, lat]) => [lng, lat] as [number, number]));
  }
  return done;
}

/** stop_times.txt → tripId → its calls in sequence order. Line scanner:
 *  stop_times is the big table (UTA ~467k rows); only the five columns
 *  read here, located via the header. Quoted rows are skipped, never
 *  misparsed (the columns read are ids, integers and clock times). */
export function parseStopTimes(csv: string): Map<string, NetTripStop[]> {
  const lines = csv.split('\n');
  const byTrip = new Map<string, NetTripStop[]>();
  if (lines.length < 2) return byTrip;
  const head = lines[0].replace(/^\uFEFF/, '').split(',').map(h => h.trim());
  const iTrip = head.indexOf('trip_id');
  const iStop = head.indexOf('stop_id');
  const iSeq = head.indexOf('stop_sequence');
  const iArr = head.indexOf('arrival_time');
  const iDep = head.indexOf('departure_time');
  if (iTrip < 0 || iStop < 0 || iSeq < 0 || (iArr < 0 && iDep < 0)) return byTrip;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.includes('"')) continue;
    const f = line.split(',');
    const tripId = f[iTrip]?.trim();
    const stopId = f[iStop]?.trim();
    const seq = Number(f[iSeq]);
    const arr = parseGtfsTime(iArr >= 0 ? f[iArr] : undefined);
    const dep = parseGtfsTime(iDep >= 0 ? f[iDep] : undefined);
    if (!tripId || !stopId || !Number.isFinite(seq) || (arr === null && dep === null)) continue;
    let arrTrip = byTrip.get(tripId);
    if (!arrTrip) { arrTrip = []; byTrip.set(tripId, arrTrip); }
    arrTrip.push({ stopId, seq, arrSec: arr ?? dep!, depSec: dep ?? arr! });
  }
  for (const stops of byTrip.values()) stops.sort((a, b) => a.seq - b.seq);
  return byTrip;
}

export interface NetworkFiles {
  routes: string;
  shapes?: string | null;
  stops: string;
  trips: string;
  stopTimes: string;
  calendar?: string | null;
  calendarDates?: string | null;
  feedInfo?: string | null;
}

/** Assemble the network from the GTFS text tables. Pure — fixture-fed. */
export function parseNetwork(files: NetworkFiles): TransitNetwork {
  const routes: NetworkRoute[] = [];
  const routeById = new Map<string, NetworkRoute>();
  const routeByShort = new Map<string, NetworkRoute>();
  for (const r of parseCsv(files.routes)) {
    if (!r.route_id) continue;
    const mode = routeTypeMode(r.route_type);
    const route: NetworkRoute = {
      id: r.route_id,
      short: r.route_short_name || r.route_id,
      long: r.route_long_name || r.route_short_name || r.route_id,
      mode,
      color: normColor(r.route_color, mode),
      ...(r.route_url ? { url: r.route_url } : {}),
    };
    routes.push(route);
    routeById.set(route.id, route);
    if (!routeByShort.has(route.short)) routeByShort.set(route.short, route);
  }
  routes.sort((a, b) => a.short.localeCompare(b.short, undefined, { numeric: true }));

  const stops: NetworkStop[] = [];
  const stopById = new Map<string, NetworkStop>();
  for (const s of parseCsv(files.stops)) {
    const lat = Number(s.stop_lat);
    const lng = Number(s.stop_lon);
    if (!s.stop_id || !s.stop_name || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    // location_type 1 = station (a grouping shell); its children carry
    // the boardable points. Stations are kept — they ARE the rail stops
    // riders use, and UTA marks many of them parent-less anyway.
    const stop: NetworkStop = {
      id: s.stop_id,
      ...(s.stop_code ? { code: s.stop_code } : {}),
      name: s.stop_name,
      lat: round5(lat),
      lng: round5(lng),
      routes: [],
    };
    stops.push(stop);
    stopById.set(stop.id, stop);
  }

  const shapes = files.shapes ? parseShapes(files.shapes) : new Map<string, [number, number][]>();
  const callsByTrip = parseStopTimes(files.stopTimes);

  const trips: NetTrip[] = [];
  const tripById = new Map<string, NetTrip>();
  const shapeByTrip = new Map<string, string>();
  for (const t of parseCsv(files.trips)) {
    if (!t.trip_id || !t.route_id || !routeById.has(t.route_id)) continue;
    const calls = callsByTrip.get(t.trip_id);
    if (!calls || calls.length === 0) continue;
    const trip: NetTrip = {
      id: t.trip_id,
      routeId: t.route_id,
      serviceId: t.service_id ?? '',
      dir: t.direction_id === '1' ? 1 : 0,
      headsign: t.trip_headsign ?? '',
      stops: calls,
    };
    trips.push(trip);
    tripById.set(trip.id, trip);
    if (t.shape_id) shapeByTrip.set(trip.id, t.shape_id);
  }

  // Per-stop call index + the routes serving each stop.
  const stopCalls = new Map<string, Array<{ tripId: string; seq: number; depSec: number }>>();
  const routesAtStop = new Map<string, Set<string>>();
  for (const trip of trips) {
    for (const call of trip.stops) {
      let arr = stopCalls.get(call.stopId);
      if (!arr) { arr = []; stopCalls.set(call.stopId, arr); }
      arr.push({ tripId: trip.id, seq: call.seq, depSec: call.depSec });
      let set = routesAtStop.get(call.stopId);
      if (!set) { set = new Set(); routesAtStop.set(call.stopId, set); }
      set.add(trip.routeId);
    }
  }
  for (const stop of stops) {
    const set = routesAtStop.get(stop.id);
    if (!set) continue;
    stop.routes = [...set]
      .map(id => routeById.get(id)?.short ?? id)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  // Representative geometry + stop order per (route, direction): the
  // trip with the most calls (the fullest pattern), its shape thinned.
  const directions = new Map<string, DirectionInfo[]>();
  const best = new Map<string, NetTrip>();
  for (const trip of trips) {
    const key = `${trip.routeId}|${trip.dir}`;
    const cur = best.get(key);
    if (!cur || trip.stops.length > cur.stops.length) best.set(key, trip);
  }
  for (const [key, trip] of best) {
    const [routeId, dirStr] = key.split('|');
    const shapeId = shapeByTrip.get(trip.id);
    const rawLine = (shapeId && shapes.get(shapeId)) || trip.stops
      .map(c => stopById.get(c.stopId))
      .filter((s): s is NetworkStop => !!s)
      .map(s => [s.lng, s.lat] as [number, number]);
    const info: DirectionInfo = {
      dir: Number(dirStr),
      headsign: trip.headsign || routeById.get(routeId)?.long || '',
      stopIds: trip.stops.map(c => c.stopId),
      line: thinLine(rawLine),
    };
    let arr = directions.get(routeId);
    if (!arr) { arr = []; directions.set(routeId, arr); }
    arr.push(info);
  }
  for (const arr of directions.values()) arr.sort((a, b) => a.dir - b.dir);

  const services = new Map<string, ServiceCalendar>();
  if (files.calendar) {
    for (const c of parseCsv(files.calendar)) {
      if (!c.service_id) continue;
      services.set(c.service_id, {
        days: [c.monday, c.tuesday, c.wednesday, c.thursday, c.friday, c.saturday, c.sunday]
          .map(v => v === '1'),
        start: c.start_date ?? '',
        end: c.end_date ?? '',
      });
    }
  }
  const exceptions = new Map<string, number>();
  if (files.calendarDates) {
    for (const c of parseCsv(files.calendarDates)) {
      if (!c.service_id || !c.date) continue;
      const t = Number(c.exception_type);
      if (t === 1 || t === 2) exceptions.set(`${c.date}|${c.service_id}`, t);
    }
  }

  let feedVersion: string | undefined;
  if (files.feedInfo) {
    const info = parseCsv(files.feedInfo)[0];
    if (info?.feed_version) feedVersion = info.feed_version;
  }

  return {
    routes, routeById, routeByShort, stops, stopById, directions,
    trips, tripById, stopCalls, services, exceptions, feedVersion,
  };
}

/* ── Day math in the agency timezone ─────────────────────────────── */

/** YYYY-MM-DD of an instant in an IANA zone. */
export function ymdInZone(tz: string, at: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(at);
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Add days to a YYYYMMDD or YYYY-MM-DD string; returns YYYYMMDD. */
export function addDaysYmd(ymd: string, n: number): string {
  const s = ymd.replace(/-/g, '');
  const d = new Date(Date.UTC(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)) + n));
  const p = (v: number) => String(v).padStart(2, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}`;
}

/** Day of week for a YYYYMMDD string: 0 = Monday … 6 = Sunday. */
export function weekdayMon0(ymd: string): number {
  const s = ymd.replace(/-/g, '');
  const dow = new Date(Date.UTC(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)))).getUTCDay();
  return (dow + 6) % 7;
}

/** Epoch ms of local midnight starting a YYYYMMDD day in an IANA zone. */
export function zonedMidnightMs(ymd: string, tz: string): number {
  const s = ymd.replace(/-/g, '');
  const guess = Date.UTC(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)));
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const localAsUtc = (ms: number) => {
    const parts = fmt.formatToParts(new Date(ms));
    const get = (t: string) => Number(parts.find(p => p.type === t)?.value ?? 0);
    return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
  };
  // Solve base such that base rendered in the zone reads 00:00:00 on the
  // target day: base = guess − offset(base), iterated — the second pass
  // settles DST-transition days where the offset changes overnight.
  let base = guess;
  for (let i = 0; i < 3; i++) base = guess - (localAsUtc(base) - base);
  return base;
}

/** Service ids running on a YYYYMMDD day (calendar + exceptions). */
export function activeServiceIds(net: TransitNetwork, ymd: string): Set<string> {
  const day = ymd.replace(/-/g, '');
  const wd = weekdayMon0(day);
  const out = new Set<string>();
  for (const [id, svc] of net.services) {
    if (svc.start && day < svc.start) continue;
    if (svc.end && day > svc.end) continue;
    if (svc.days[wd]) out.add(id);
  }
  for (const [key, type] of net.exceptions) {
    const [date, id] = key.split('|');
    if (date !== day) continue;
    if (type === 1) out.add(id);
    else out.delete(id);
  }
  return out;
}

/* ── Schedule queries ────────────────────────────────────────────── */

export interface ScheduledDeparture {
  tripId: string;
  routeId: string;
  dir: number;
  headsign: string;
  /** Stop sequence of this call within its trip — the RT join key. */
  seq: number;
  /** Absolute epoch ms of the scheduled departure at the stop. */
  schedMs: number;
  serviceDay: string; // YYYYMMDD the departure belongs to
}

/**
 * Scheduled departures at a stop within [fromMs, toMs]. Service days
 * from yesterday through tomorrow are considered, so a 25:10 trip on
 * yesterday's service day (01:10 today) and tonight's late trips both
 * resolve to real instants.
 */
export function departuresForStop(
  net: TransitNetwork,
  stopId: string,
  fromMs: number,
  toMs: number,
  tz: string,
): ScheduledDeparture[] {
  const calls = net.stopCalls.get(stopId);
  if (!calls || calls.length === 0) return [];
  const today = ymdInZone(tz, new Date(fromMs)).replace(/-/g, '');
  const out: ScheduledDeparture[] = [];
  for (const delta of [-1, 0, 1]) {
    const day = addDaysYmd(today, delta);
    const active = activeServiceIds(net, day);
    if (active.size === 0) continue;
    const base = zonedMidnightMs(day, tz);
    for (const call of calls) {
      const trip = net.tripById.get(call.tripId);
      if (!trip || !active.has(trip.serviceId)) continue;
      const ms = base + call.depSec * 1000;
      if (ms < fromMs || ms > toMs) continue;
      out.push({
        tripId: trip.id, routeId: trip.routeId, dir: trip.dir,
        headsign: trip.headsign, seq: call.seq, schedMs: ms, serviceDay: day,
      });
    }
  }
  out.sort((a, b) => a.schedMs - b.schedMs);
  return out;
}

export interface RouteDayDirection {
  dir: number;
  headsign: string;
  stopIds: string[];
  /** Trips running this direction on the day. */
  trips: number;
  firstDepMs: number | null;
  lastDepMs: number | null;
  /** Median gap between consecutive departures at the first stop, minutes. */
  headwayMin: number | null;
}

/** One route's service picture for a YYYYMMDD day, per direction. */
export function routeDaySummary(net: TransitNetwork, routeId: string, ymd: string, tz: string): RouteDayDirection[] {
  const day = ymd.replace(/-/g, '');
  const active = activeServiceIds(net, day);
  const base = zonedMidnightMs(day, tz);
  const dirs = net.directions.get(routeId) ?? [];
  return dirs.map(d => {
    const firstStop = d.stopIds[0];
    const deps: number[] = [];
    let trips = 0;
    for (const trip of net.trips) {
      if (trip.routeId !== routeId || trip.dir !== d.dir || !active.has(trip.serviceId)) continue;
      trips++;
      const first = trip.stops.find(c => c.stopId === firstStop) ?? trip.stops[0];
      if (first) deps.push(base + first.depSec * 1000);
    }
    deps.sort((a, b) => a - b);
    let headwayMin: number | null = null;
    if (deps.length >= 2) {
      const gaps: number[] = [];
      for (let i = 1; i < deps.length; i++) gaps.push((deps[i] - deps[i - 1]) / 60000);
      gaps.sort((a, b) => a - b);
      headwayMin = Math.round(gaps[Math.floor(gaps.length / 2)]);
    }
    return {
      dir: d.dir,
      headsign: d.headsign,
      stopIds: d.stopIds,
      trips,
      firstDepMs: deps.length ? deps[0] : null,
      lastDepMs: deps.length ? deps[deps.length - 1] : null,
      headwayMin,
    };
  });
}

/** Route lines as a GeoJSON FeatureCollection (one feature per direction). */
export function routeLineFeatures(net: TransitNetwork): object {
  const features: object[] = [];
  for (const route of net.routes) {
    for (const d of net.directions.get(route.id) ?? []) {
      if (d.line.length < 2) continue;
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: d.line },
        properties: {
          routeId: route.id, short: route.short, long: route.long,
          mode: route.mode, color: route.color, dir: d.dir, headsign: d.headsign,
          stops: d.stopIds.length,
        },
      });
    }
  }
  return { type: 'FeatureCollection', features };
}

/* ── Loading + cache (mirrors staticGtfsFor: 12 h, stale-on-error) ── */

export async function loadNetwork(url: string): Promise<TransitNetwork> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'OSIRIS-Intelligence-Platform/3.5' },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`GTFS static ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  const routes = extractZipText(buf, 'routes.txt');
  const stops = extractZipText(buf, 'stops.txt');
  const trips = extractZipText(buf, 'trips.txt');
  const stopTimes = extractZipText(buf, 'stop_times.txt');
  if (!routes || !stops || !trips || !stopTimes) {
    throw new Error('GTFS zip missing routes/stops/trips/stop_times');
  }
  return parseNetwork({
    routes,
    shapes: extractZipText(buf, 'shapes.txt'),
    stops,
    trips,
    stopTimes,
    calendar: extractZipText(buf, 'calendar.txt'),
    calendarDates: extractZipText(buf, 'calendar_dates.txt'),
    feedInfo: extractZipText(buf, 'feed_info.txt'),
  });
}

const NET_TTL_MS = 12 * 3600_000;
interface NetEntry {
  at: number;
  data: TransitNetwork | null;
  inflight: Promise<TransitNetwork> | null;
}
const netStore = new Map<string, NetEntry>();

/**
 * Cached accessor. A failed refresh keeps serving the last good
 * network; a cold failure rejects so the caller can answer an honest
 * error instead of an empty map.
 */
export async function networkFor(agencyId: string, url: string): Promise<TransitNetwork> {
  const now = Date.now();
  let entry = netStore.get(agencyId);
  if (!entry) {
    entry = { at: 0, data: null, inflight: null };
    netStore.set(agencyId, entry);
  }
  if (entry.data && now - entry.at < NET_TTL_MS) return entry.data;
  if (entry.inflight) return entry.inflight;
  const e = entry;
  e.inflight = loadNetwork(url)
    .then(d => {
      e.data = d;
      e.at = Date.now();
      e.inflight = null;
      return d;
    })
    .catch(err => {
      e.inflight = null;
      if (e.data) return e.data;
      throw err;
    });
  return e.inflight;
}
