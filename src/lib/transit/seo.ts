import type { TransitAgency, TransitMode } from './agencies';
import {
  activeServiceIds,
  addDaysYmd,
  routeDaySummary,
  weekdayMon0,
  ymdInZone,
  zonedMidnightMs,
  type NetworkRoute,
  type NetworkStop,
  type RouteDayDirection,
  type TransitNetwork,
} from './network';

/**
 * OSIRIS — programmatic transit SEO pages (/transit/…): the pure
 * machinery that turns an agency's static-GTFS network (lib/transit/
 * network) into crawlable route pages. Everything here is a function
 * of the parsed GTFS — slugs, titles, schedule summaries, FAQ answers
 * and JSON-LD are computed from the feed, never hand-written per
 * agency, so any agency that gains a `staticGtfsUrl` (lib/transit/
 * agencies) lights up the full page family automatically.
 *
 * Owner scope call (2026-10-26): NO stop pages. 5,425 indexable stop
 * pages was judged a thin-page risk; stops live on the route pages
 * instead — every route page server-renders its full ordered stop
 * list per direction with per-stop first/last departure times and a
 * `#stop-<id>` anchor per stop, so a stop-name search lands on a
 * route page that names the stop.
 */

/* ── Slugs ───────────────────────────────────────────────────────── */

/** URL segment from free text: lowercase, non-alphanumerics → '-'. */
export function slugifySegment(text: string): string {
  const s = (text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'x';
}

/**
 * The public slug base for a route: "<short> <long>" ("701-blue-line",
 * "2-200-south", "830x-utah-valley-express-uvx"), or just the short
 * name when the long name adds nothing.
 */
export function routeSlugBase(route: Pick<NetworkRoute, 'short' | 'long'>): string {
  const long = (route.long ?? '').trim();
  if (long && long.toLowerCase() !== route.short.trim().toLowerCase()) {
    return slugifySegment(`${route.short} ${long}`);
  }
  return slugifySegment(route.short);
}

/**
 * Route id → unique slug for a whole network. Bases are unique in
 * UTA's current feed (verified 2026-10-26: 86 bases, 0 collisions);
 * a colliding base gets the internal route id appended, so uniqueness
 * never depends on the feed staying tidy.
 */
export function buildRouteSlugs(routes: NetworkRoute[]): Map<string, string> {
  const bases = routes.map(r => routeSlugBase(r));
  const counts = new Map<string, number>();
  for (const b of bases) counts.set(b, (counts.get(b) ?? 0) + 1);
  const out = new Map<string, string>();
  routes.forEach((r, i) => {
    const base = bases[i];
    out.set(r.id, counts.get(base)! > 1 ? `${base}-${slugifySegment(r.id)}` : base);
  });
  return out;
}

/** In-page anchor id for one stop row on a route page. */
export function stopAnchor(stopId: string): string {
  return `stop-${slugifySegment(stopId)}`;
}

/* ── Display names ───────────────────────────────────────────────── */

/**
 * GTFS long names arrive in two dialects: rail names already
 * title-cased ("Blue Line", "FrontRunner") and bus names SHOUTED
 * ("SOUTH TEMPLE", "200 SOUTH", "UTAH VALLEY EXPRESS (UVX)").
 * Title-case the shouted ones; leave mixed-case names untouched.
 * Brand spellings that title-casing would break are restored after.
 */
const BRAND_FIXES: Array<[RegExp, string]> = [
  [/\bfrontrunner\b/gi, 'FrontRunner'],
  [/\btrax\b/gi, 'TRAX'],
  [/\buvx\b/gi, 'UVX'],
  [/\bbrt\b/gi, 'BRT'],
];

export function displayRouteLong(long: string): string {
  const raw = (long ?? '').trim();
  if (!raw) return '';
  if (raw !== raw.toUpperCase()) return raw; // already mixed case — feed's own styling
  let out = raw
    .toLowerCase()
    .replace(/(^|[\s\-/(])(\S)/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
  for (const [re, fix] of BRAND_FIXES) out = out.replace(re, fix);
  return out;
}

/* ── States ──────────────────────────────────────────────────────── */

export interface StateInfo {
  code: string;
  name: string;
  slug: string;
}

const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin',
  WY: 'Wyoming',
};

/**
 * The US state an agency serves, parsed from its registry region
 * ("Salt Lake City, UT" → Utah). Non-US regions ("Netherlands",
 * "Norway") return null — such an agency still gets its agency hub
 * and route pages, just no state hub.
 */
export function stateForAgency(agency: Pick<TransitAgency, 'region'>): StateInfo | null {
  const m = /,\s*([A-Z]{2})\s*$/.exec(agency.region ?? '');
  if (!m) return null;
  const name = US_STATES[m[1]];
  if (!name) return null;
  return { code: m[1], name, slug: slugifySegment(name) };
}

/* ── Credit ──────────────────────────────────────────────────────── */

/** The per-agency data credit line (mirrors the transit API routes). */
export function creditFor(agency: Pick<TransitAgency, 'id' | 'attribution'>): string {
  return agency.id === 'uta'
    ? 'Data: Utah Transit Authority (UTA Open Data)'
    : `Data: ${agency.attribution}`;
}

/* ── Mode grouping (agency hub) ──────────────────────────────────── */

export type RouteGroupKey = TransitMode | 'brt';

/**
 * Routes the agency markets as bus rapid transit, by public label.
 * GTFS has no BRT route_type (UVX rides as a bus, type 3), so this is
 * an explicit, per-agency list — the only hand-kept fact in the file.
 * UTA: 830X is the Utah Valley Express (UVX), UTA's BRT line.
 */
const BRT_SHORTS: Record<string, string[]> = {
  uta: ['830X'],
};

const MODE_LABELS: Record<string, Partial<Record<RouteGroupKey, string>>> = {
  uta: {
    tram: 'TRAX & S-Line',
    train: 'FrontRunner',
    brt: 'Bus Rapid Transit',
    bus: 'Bus',
    metro: 'Metro',
    ferry: 'Ferry',
    transit: 'Transit',
  },
};

const GENERIC_MODE_LABELS: Record<RouteGroupKey, string> = {
  tram: 'Light Rail & Streetcar',
  train: 'Commuter Rail',
  metro: 'Metro / Subway',
  brt: 'Bus Rapid Transit',
  bus: 'Bus',
  ferry: 'Ferry',
  transit: 'Transit',
};

const GROUP_ORDER: RouteGroupKey[] = ['tram', 'train', 'metro', 'brt', 'bus', 'ferry', 'transit'];

export function routeGroupKey(agencyId: string, route: Pick<NetworkRoute, 'short' | 'mode'>): RouteGroupKey {
  if ((BRT_SHORTS[agencyId] ?? []).includes(route.short)) return 'brt';
  return route.mode;
}

export function modeGroupLabel(agencyId: string, key: RouteGroupKey): string {
  return MODE_LABELS[agencyId]?.[key] ?? GENERIC_MODE_LABELS[key];
}

export interface RouteGroup {
  key: RouteGroupKey;
  label: string;
  routes: NetworkRoute[];
}

export function groupRoutes(agency: Pick<TransitAgency, 'id'>, routes: NetworkRoute[]): RouteGroup[] {
  const byKey = new Map<RouteGroupKey, NetworkRoute[]>();
  for (const r of routes) {
    const k = routeGroupKey(agency.id, r);
    let arr = byKey.get(k);
    if (!arr) { arr = []; byKey.set(k, arr); }
    arr.push(r);
  }
  return GROUP_ORDER
    .filter(k => byKey.has(k))
    .map(k => ({ key: k, label: modeGroupLabel(agency.id, k), routes: byKey.get(k)! }));
}

/* ── Feed version / lastmod ──────────────────────────────────────── */

const MONTHS: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};

/**
 * Honest lastmod for transit URLs: the date stamped in the GTFS
 * feed_version. UTA's current version string is "2026 AUG_20261008" —
 * the trailing YYYYMMDD (the publication date) wins; otherwise a
 * leading "YYYY MMM" gives the first of that month. Unparseable →
 * null (the sitemap then omits lastModified rather than lying).
 */
export function feedVersionDate(version: string | undefined): Date | null {
  if (!version) return null;
  const tail = /(\d{4})(\d{2})(\d{2})\s*$/.exec(version);
  if (tail) {
    const d = new Date(Date.UTC(Number(tail[1]), Number(tail[2]) - 1, Number(tail[3])));
    if (!Number.isNaN(d.getTime())) return d;
  }
  const head = /^(\d{4})\s+([A-Z]{3})/.exec(version.trim().toUpperCase());
  if (head && MONTHS[head[2]] != null) {
    return new Date(Date.UTC(Number(head[1]), MONTHS[head[2]], 1));
  }
  return null;
}

/* ── Clock formatting ────────────────────────────────────────────── */

/** GTFS service-day seconds (may exceed 24 h) → "5:42 AM" (+nextDay). */
export function formatGtfsClock(secOfDay: number): { label: string; nextDay: boolean } {
  const nextDay = secOfDay >= 86400;
  const s = ((secOfDay % 86400) + 86400) % 86400;
  const h24 = Math.floor(s / 3600);
  const min = Math.floor((s % 3600) / 60);
  const ampm = h24 < 12 ? 'AM' : 'PM';
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return { label: `${h}:${String(min).padStart(2, '0')} ${ampm}`, nextDay };
}

/** Epoch ms → "5:42 AM" in the agency's timezone. */
export function formatZonedTime(ms: number, tz: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(ms));
}

/** YYYYMMDD → "Tue, Oct 27" (calendar label, zone-free). */
export function formatDayLabel(ymd: string): string {
  const s = ymd.replace(/-/g, '');
  const d = new Date(Date.UTC(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8))));
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric',
  }).format(d);
}

/* ── Schedule shapes ─────────────────────────────────────────────── */

export type DayKind = 'weekday' | 'saturday' | 'sunday';

export interface RepresentativeDay {
  kind: DayKind;
  /** YYYYMMDD of the concrete day the summary was computed for. */
  ymd: string;
  label: string;
  directions: RouteDayDirection[];
}

/**
 * The next day (from today, agency-local, scanning ≤ 14 days out) of
 * each kind — weekday / Saturday / Sunday — on which this route
 * actually runs. A kind with no service in the window is omitted:
 * the page then says "no Saturday service" from fact, not template.
 */
export function representativeDays(
  net: TransitNetwork,
  routeId: string,
  tz: string,
  nowMs: number = Date.now(),
): RepresentativeDay[] {
  const today = ymdInZone(tz, new Date(nowMs)).replace(/-/g, '');
  const found = new Map<DayKind, RepresentativeDay>();
  for (let delta = 0; delta < 14 && found.size < 3; delta++) {
    const ymd = addDaysYmd(today, delta);
    const wd = weekdayMon0(ymd);
    const kind: DayKind = wd === 5 ? 'saturday' : wd === 6 ? 'sunday' : 'weekday';
    if (found.has(kind)) continue;
    const directions = routeDaySummary(net, routeId, ymd, tz);
    if (!directions.some(d => d.trips > 0)) continue;
    found.set(kind, { kind, ymd, label: formatDayLabel(ymd), directions });
  }
  return ['weekday', 'saturday', 'sunday']
    .map(k => found.get(k as DayKind))
    .filter((d): d is RepresentativeDay => !!d);
}

/**
 * Per-stop first/last scheduled departure (service-day seconds) for
 * one route + direction on one day, from the day's active trips.
 */
export function directionStopTimes(
  net: TransitNetwork,
  routeId: string,
  dir: number,
  ymd: string,
): Map<string, { firstSec: number; lastSec: number; calls: number }> {
  const active = activeServiceIds(net, ymd);
  const out = new Map<string, { firstSec: number; lastSec: number; calls: number }>();
  for (const trip of net.trips) {
    if (trip.routeId !== routeId || trip.dir !== dir || !active.has(trip.serviceId)) continue;
    for (const call of trip.stops) {
      const cur = out.get(call.stopId);
      if (!cur) {
        out.set(call.stopId, { firstSec: call.depSec, lastSec: call.depSec, calls: 1 });
      } else {
        if (call.depSec < cur.firstSec) cur.firstSec = call.depSec;
        if (call.depSec > cur.lastSec) cur.lastSec = call.depSec;
        cur.calls++;
      }
    }
  }
  return out;
}

/**
 * All of today's departures from a direction's first stop (the
 * terminus riders board at), as epoch ms in departure order — the
 * route page's departures table.
 */
export function terminusDepartures(
  net: TransitNetwork,
  routeId: string,
  dir: number,
  ymd: string,
  tz: string,
): number[] {
  const dirInfo = (net.directions.get(routeId) ?? []).find(d => d.dir === dir);
  const firstStop = dirInfo?.stopIds[0];
  if (!firstStop) return [];
  const active = activeServiceIds(net, ymd);
  const base = zonedMidnightMs(ymd, tz);
  const secs: number[] = [];
  for (const trip of net.trips) {
    if (trip.routeId !== routeId || trip.dir !== dir || !active.has(trip.serviceId)) continue;
    const call = trip.stops.find(c => c.stopId === firstStop) ?? trip.stops[0];
    if (call) secs.push(call.depSec);
  }
  return secs.sort((a, b) => a - b).map(s => base + s * 1000);
}

/** Stops ranked by how many routes serve them (state-hub highlights). */
export function popularStops(net: TransitNetwork, limit = 12): NetworkStop[] {
  return [...net.stops]
    .sort((a, b) => b.routes.length - a.routes.length || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/* ── Titles / descriptions ───────────────────────────────────────── */

export function routeDisplayName(route: Pick<NetworkRoute, 'short' | 'long'>): string {
  const long = displayRouteLong(route.long);
  return long && long.toLowerCase() !== route.short.trim().toLowerCase()
    ? `${route.short} ${long}`
    : route.short;
}

export function routeTitle(agency: Pick<TransitAgency, 'name'>, route: NetworkRoute): string {
  return `${agency.name} Route ${routeDisplayName(route)} — Schedule, Stops & Map`;
}

export function routeDescription(
  agency: Pick<TransitAgency, 'name'>,
  route: NetworkRoute,
  weekday: RepresentativeDay | undefined,
  stopCount: number,
  tz: string,
): string {
  const name = `${agency.name} Route ${routeDisplayName(route)}`;
  const dir = weekday?.directions.find(d => d.trips > 0);
  if (dir && dir.firstDepMs != null && dir.lastDepMs != null) {
    const hw = dir.headwayMin ? `, roughly every ${dir.headwayMin} min` : '';
    return `${name} schedule: first departure ${formatZonedTime(dir.firstDepMs, tz)}, last ${formatZonedTime(dir.lastDepMs, tz)}${hw} on weekdays. All ${stopCount} stops with times, live service alerts and the route on the WorldEye live map. Free, no signup.`;
  }
  return `${name}: full stop list with departure times, schedule summary, live service alerts and the route on the WorldEye live map. Free, no signup.`;
}

/* ── URLs / JSON-LD ──────────────────────────────────────────────── */

export const TRANSIT_BASE = 'https://worldeye.app';

/** The globe with the transit layer lit — the live view of a route.
 *  (The Explorer's route preselect is an in-app event, not a URL
 *  parameter; the layers param is the deepest honest link.) */
export function liveMapUrl(): string {
  return '/?layers=transit';
}

export function routePath(agencyId: string, slug: string): string {
  return `/transit/${agencyId}/routes/${slug}`;
}

export interface TransitSitemapEntry {
  path: string;
  priority: number;
  changeFrequency: 'weekly' | 'monthly';
}

/**
 * Every indexable transit URL for one agency network: state hub (if
 * any) + agency hub + one per route. Deliberately NO stop URLs
 * (owner scope call, 2026-10-26). The sitemap and the tests both
 * consume this, so the sitemap can never drift from the page set.
 */
export function transitPathsForAgency(
  agency: TransitAgency,
  net: TransitNetwork,
  slugs: Map<string, string>,
): TransitSitemapEntry[] {
  const out: TransitSitemapEntry[] = [];
  const state = stateForAgency(agency);
  if (state) out.push({ path: `/transit/${state.slug}`, priority: 0.7, changeFrequency: 'weekly' });
  out.push({ path: `/transit/${agency.id}`, priority: 0.7, changeFrequency: 'weekly' });
  for (const route of net.routes) {
    const slug = slugs.get(route.id);
    if (slug) out.push({ path: routePath(agency.id, slug), priority: 0.6, changeFrequency: 'weekly' });
  }
  return out;
}

/** schema.org BusRoute + breadcrumbs + FAQ for a route page. */
export function routeJsonLd(args: {
  agency: TransitAgency;
  route: NetworkRoute;
  slug: string;
  description: string;
  faqs: Array<{ q: string; a: string }>;
}): object {
  const { agency, route, slug, description, faqs } = args;
  const url = `${TRANSIT_BASE}${routePath(agency.id, slug)}`;
  const state = stateForAgency(agency);
  const crumbs: Array<Record<string, unknown>> = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${TRANSIT_BASE}/` },
    { '@type': 'ListItem', position: 2, name: 'Transit', item: `${TRANSIT_BASE}/transit` },
  ];
  if (state) {
    crumbs.push({ '@type': 'ListItem', position: 3, name: state.name, item: `${TRANSIT_BASE}/transit/${state.slug}` });
    crumbs.push({ '@type': 'ListItem', position: 4, name: agency.name, item: `${TRANSIT_BASE}/transit/${agency.id}` });
    crumbs.push({ '@type': 'ListItem', position: 5, name: `Route ${routeDisplayName(route)}`, item: url });
  } else {
    crumbs.push({ '@type': 'ListItem', position: 3, name: agency.name, item: `${TRANSIT_BASE}/transit/${agency.id}` });
    crumbs.push({ '@type': 'ListItem', position: 4, name: `Route ${routeDisplayName(route)}`, item: url });
  }
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BusRoute',
        name: `${agency.name} Route ${routeDisplayName(route)}`,
        description,
        url,
        provider: { '@type': 'Organization', name: agency.attribution },
        ...(state ? { areaServed: { '@type': 'State', name: state.name } } : {}),
      },
      { '@type': 'BreadcrumbList', itemListElement: crumbs },
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map(f => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  };
}
