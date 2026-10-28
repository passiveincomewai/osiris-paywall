/**
 * OSIRIS — the launch-sites registry (Menu #2 Wave A part 2,
 * Oct 2026).
 *
 * One row per launch site with its own page under /launch-sites.
 * Exactly one site qualifies, and the reason is the family's whole
 * discipline: a launch site earns a page only where the catalogue
 * holds real cameras of the site's own ground — and the pads of the
 * world are closed federal or military ground, so almost none do.
 * Starbase, the most-watched launch site on Earth, has NO catalogue
 * camera (see LAUNCH_SITE_GAPS — measured, pinned in
 * src/lib/launch-sites.test.ts, printed on the hub). Kennedy Space
 * Center & Cape Canaveral qualify the way the gateway parks do: a
 * stated radius wall over the Space Coast's road network — SR-528,
 * the Beachline every launch viewer drives; SR-405, the NASA
 * Parkway corridor at Titusville — honestly labelled as corridors,
 * never as pad cameras, because there are none to label.
 *
 * The launch data is NOT this registry's: it is Launch Library 2
 * (The Space Devs), the same live feed the globe's Space Missions
 * layer and /api/launches run on (src/lib/launches). The page
 * filters that payload to the pads inside this site's pad radius —
 * pad names, NETs and statuses are LL2's own fields, shown with
 * their source and fetch time. A NET is displayed at the precision
 * LL2 states for it (formatLaunchNet): a month-precision NET is
 * printed as a month, never dressed up as a countdown. Per-rocket
 * pages were considered and rejected: LL2 is a live feed, not a
 * per-rocket dataset in this repo, so there is no honest page to
 * hang on a rocket — rockets ride the board below as data.
 */

import { haversineKm } from './ski-resorts';
import type { LaunchRecord } from './launches/types';

export interface LaunchSite {
  slug: string;
  /** Full name, e.g. "Kennedy Space Center & Cape Canaveral". */
  name: string;
  /** Short name for titles and cards. */
  short: string;
  /** Region/state display for schema.org addressRegion. */
  region: string;
  country: string;
  countrySlug: string;
  /** EXPLORE_SCOPES key of this site's wall. */
  scopeKey: string;
  /** Wall centre — the point the stated radius is measured from. */
  lat: number;
  lng: number;
  radiusKm: number;
  /** What the centre is, for the page's stated rule. */
  centreLabel: string;
  /**
   * LL2 pads within this distance of the site point belong to this
   * site's board. 20 km from the Banana River midpoint covers every
   * Kennedy and Cape pad (LC-39A/B, SLC-40/41/46, LC-36) and no
   * other spaceport exists within it.
   */
  padRadiusKm: number;
  /** IANA timezone of the site. */
  tz: string;
  /** Named cameras verified inside the wall (audit, Oct 2026). */
  highlights: string[];
  /** Two intro paragraphs: what the wall is, honestly. */
  intro: [string, string];
  /** Launch-day watching note. */
  watch: string;
  faqs: Array<{ q: string; a: string }>;
}

export const LAUNCH_SITES: LaunchSite[] = [
  {
    slug: 'kennedy-space-center',
    name: 'Kennedy Space Center & Cape Canaveral',
    short: 'Kennedy & the Cape',
    region: 'Florida',
    country: 'United States',
    countrySlug: 'united-states',
    scopeKey: 'launch-kennedy',
    lat: 28.52,
    lng: -80.5955,
    radiusKm: 25,
    centreLabel: 'the Banana River shore between the two spaceports',
    padRadiusKm: 20,
    tz: 'America/New_York',
    highlights: [
      'SR-528 at MM 54 — the Beachline’s eastern end (FDOT)',
      'SR-405 at US-1 — the Titusville gateway (FDOT)',
      'SR-405 at SR-407 (FDOT)',
    ],
    intro: [
      "Two spaceports share this coast — NASA's Kennedy Space Center on Merritt Island and Cape Canaveral Space Force Station across the Banana River — and between them they fly most of America's launches. This page is the coast they fly from: every catalogue camera within 25 km of the river shore between them, which in practice is the Space Coast's road network — the SR-528 Beachline from Orlando, the SR-405 corridor at Titusville, SR-520 and the I-95 interchanges.",
      "The boundary is stated plainly, because it is the fact of every launch site on Earth: the pads are closed federal ground, and no camera in this catalogue stands on either centre — the nearest feed in the wall is 13 km from its centre point. What the wall gives you is the coast on a launch day: the causeways filling, Titusville's riverfront roads, the weather moving over the range. For the launch itself, the board below carries the manifest — and each mission's own webcast is the view, linked when the provider publishes one.",
    ],
    watch:
      "Launch day on the Space Coast is a traffic event before it is a space event: the Beachline and the causeways build for hours ahead of a window, and the SR-405 cameras at Titusville watch the town that famously watches from across the Indian River. Check the board's NET and its stated precision before you plan around a time — Florida scrubs for weather are a tradition, and the corridor cameras are where a scrub empties out, live.",
    faqs: [
      {
        q: 'Can I watch a rocket launch on these cameras?',
        a: "Not the launch itself — no camera in the catalogue stands on Kennedy or the Cape, and this page will not pretend a highway camera 15 km away is a pad cam. What you can watch here is the Space Coast around the launch: the roads, the causeways and the weather. The board below gives the mission, the pad and the time from Launch Library 2, and links the provider's webcast when one is published — that webcast is the launch view.",
      },
      {
        q: 'Why are the nearest cameras 13 km from the pads?',
        a: "Because both centres are closed federal ground. Public cameras begin where the public roads are — the Beachline, the Titusville corridor, the causeways — and the wall's rule is stated so the geography is never fudged: a 25 km radius around the shore between the two spaceports, every catalogue camera inside it, most of them FDOT's.",
      },
      {
        q: 'Where does the launch board come from?',
        a: "Launch Library 2, maintained by The Space Devs — the same live feed behind the globe's Space Missions layer. The board filters it to pads within 20 km of this page's centre point, which is every Kennedy and Cape Canaveral pad and nothing else. Times are shown at the precision the source states: a launch listed to the month is printed as a month, not a countdown.",
      },
    ],
  },
];

/**
 * The famous absences — measured against the raw catalogue by name
 * and by radius, pinned in launch-sites.test.ts, and printed on the
 * /launch-sites hub because "is there a Starbase cam?" deserves a
 * true answer.
 */
export const LAUNCH_SITE_GAPS: Array<{ name: string; note: string }> = [
  {
    name: 'Starbase, Texas',
    note: 'The most-watched launch site on Earth has no camera in this catalogue: nothing names Boca Chica or Starbase, and the nearest records are two TxDOT highway cameras on SH 100, 9.9 and 10.4 km away, facing the highway — not the site.',
  },
  {
    name: 'Vandenberg Space Force Base, California',
    note: 'No camera within 10 km. The nearest feeds are Lompoc’s town cameras 14 km away and a nature preserve’s weather cameras at 19–21 km — none at or showing the base.',
  },
  {
    name: 'Wallops Flight Facility, Virginia',
    note: 'No camera within 10 km, and exactly one within 25 km — a highway junction camera on US-13, 16 km from the pad.',
  },
];

const BY_SLUG = new Map(LAUNCH_SITES.map((s) => [s.slug, s]));

export function launchSiteBySlug(slug: string): LaunchSite | null {
  return BY_SLUG.get(slug) ?? null;
}

/**
 * The launches that belong to a site: LL2 records whose pad
 * coordinates fall within the site's pad radius. Records without
 * pad coordinates cannot be placed and are skipped — the board
 * shows what the data can locate, and says its source either way.
 */
export function launchesAtSite(
  records: readonly LaunchRecord[],
  site: LaunchSite,
): LaunchRecord[] {
  return records.filter(
    (l) =>
      typeof l.padLat === 'number' &&
      typeof l.padLon === 'number' &&
      haversineKm(site.lat, site.lng, l.padLat, l.padLon) <= site.padRadiusKm,
  );
}

/**
 * A launch's NET at the precision the source states for it. LL2's
 * netPrecision is the honesty contract: "Minute"/"Hour" earn a
 * clock time; "Day" earns a date; anything coarser ("Month",
 * "Quarter", "Year") is printed at that grain. A null NET is an
 * announcement still to come, not a zero.
 */
export function formatLaunchNet(
  l: Pick<LaunchRecord, 'net' | 'netPrecision'>,
  tz: string,
): string {
  if (!l.net) return 'Date to be announced';
  const d = new Date(l.net);
  if (Number.isNaN(d.getTime())) return 'Date to be announced';
  const p = (l.netPrecision ?? '').toLowerCase();
  if (p.includes('month') || p.includes('quarter') || p.includes('half')) {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      month: 'long',
      year: 'numeric',
    }).format(d);
  }
  if (p.includes('year')) {
    return new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric' }).format(d);
  }
  if (p.includes('day') || p.includes('week')) {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d);
  }
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(d);
}
