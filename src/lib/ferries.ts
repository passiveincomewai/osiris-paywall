/**
 * OSIRIS — the ferry-system tracker registry (Menu #2 Wave B, Oct 2026).
 *
 * One row per ferry system with its own page under /ferry-tracker.
 * A system qualifies only on evidence, audited Oct 2026 against the
 * catalogue (src/data/countries/*.json) and the maritime feed:
 *
 *  - Washington State Ferries — dedicated WSDOT terminal cameras at
 *    essentially every terminal (Colman Dock, Kingston, Clinton,
 *    Anacortes, Port Townsend, Coupeville…) plus a name-identifiable
 *    fleet on AIS. The flagship page: 11 terminal walls.
 *  - BC Ferries — real terminal cameras at Departure Bay (15 in the
 *    wall, incl. the named "Departure Bay Ferry" DriveBC feed) and
 *    Horseshoe Bay, and a name-identifiable fleet. Its three biggest
 *    terminals — Tsawwassen, Swartz Bay, Duke Point — have ZERO
 *    catalogue cameras; the page prints that instead of dressing
 *    distant highway cams up as terminal walls.
 *  - Staten Island Ferry — no catalogue camera inside either
 *    terminal, but the New York Harbor wall frames both shores of
 *    the crossing and its boats are name-identifiable on AIS. The
 *    page says plainly that the terminals themselves have no camera.
 *
 * How the live panel identifies a system's boats (the honest rule):
 * AIS broadcasts a vessel's name and type, never its operator. A
 * contact counts as this system's ferry only when its broadcast
 * name matches the system's own fleet names (fleetNames below —
 * distinctive names, normalised), it sits inside the system's
 * service-area geofence, and it is not a known non-passenger type
 * (a same-named cargo hull whose static data has arrived is
 * excluded). The endpoint returns only vessels reporting right
 * now; when none are, the page shows an empty state — never a
 * timetable, never a last-known position dressed up as live.
 * No repo dataset carries sailing times, so no page prints any:
 * routes are named as terminal pairs only.
 *
 * The WSF/BC "SALISH" name overlap is separated by the geofences:
 * the WSF box tops out at 48.55°N and the BC box starts at 48.6°N —
 * neither fleet's Salish-class boat sails in the gap.
 *
 * Facts discipline: this registry carries terminal/route names, the
 * operators' own fleet names (what the boats broadcast), the
 * catalogue's camera names, and coordinates of terminals/ports the
 * site itself maps. Frequencies, crossing times and fares are not
 * in any repo dataset and appear nowhere.
 */

import {
  haversineKm,
  toVesselView,
  type FeedShip,
  type VesselView,
} from './ais-feed';

export interface FerryWall {
  /** EXPLORE_SCOPES key. */
  scopeKey: string;
  heading: string;
  blurb: string;
}

export interface FerrySystem {
  slug: string;
  /** Full system name, e.g. "Washington State Ferries". */
  name: string;
  /** Short name for titles/cards, e.g. "WSF". */
  short: string;
  country: string;
  countrySlug: string;
  region: string;
  /** Service-area centre (page weather, map links). */
  lat: number;
  lng: number;
  tz: string;
  /** Service-area geofence for AIS matching. */
  geo: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  /** Distinctive broadcast-name fragments of the system's own fleet. */
  fleetNames: string[];
  /** Terminal names the system serves (facts strip). */
  terminals: string[];
  /** Routes as terminal pairs — names only, never times. */
  routes: string[];
  /** Terminal walls that exist in the catalogue. */
  walls: FerryWall[];
  /** Terminals with NO catalogue camera — printed on the page. */
  cameraGaps: string[];
  /** Named cameras verified inside the walls (audit, Oct 2026). */
  highlights: string[];
  intro: [string, string];
  watch: string;
  faqs: Array<{ q: string; a: string }>;
}

export const FERRY_SYSTEMS: FerrySystem[] = [
  {
    slug: 'washington-state-ferries',
    name: 'Washington State Ferries',
    short: 'Washington State Ferries',
    country: 'United States',
    countrySlug: 'united-states',
    region: 'Washington',
    lat: 47.6026,
    lng: -122.3387,
    tz: 'America/Los_Angeles',
    geo: { minLat: 47.0, maxLat: 48.55, minLng: -123.15, maxLng: -122.15 },
    fleetNames: [
      'TACOMA', 'WENATCHEE', 'PUYALLUP', 'SPOKANE', 'WALLA WALLA',
      'KITSAP', 'KITTITAS', 'CATHLAMET', 'CHELAN', 'ISSAQUAH', 'SEALTH',
      'TILLIKUM', 'KLAHOWYA', 'YAKIMA', 'SUQUAMISH', 'CHIMACUM',
      'KENNEWICK', 'SALISH', 'SAMISH', 'TOKITAE', 'CHETZEMOKA',
      'OLYMPIC',
    ],
    terminals: [
      'Seattle (Colman Dock)', 'Bainbridge Island', 'Bremerton',
      'Edmonds', 'Kingston', 'Mukilteo', 'Clinton', 'Fauntleroy',
      'Vashon Island', 'Southworth', 'Point Defiance (Tacoma)',
      'Tahlequah', 'Anacortes', 'Friday Harbor', 'Orcas Island',
      'Shaw Island', 'Lopez Island', 'Port Townsend',
      'Coupeville (Keystone)',
    ],
    routes: [
      'Seattle – Bainbridge Island',
      'Seattle – Bremerton',
      'Edmonds – Kingston',
      'Mukilteo – Clinton',
      'Fauntleroy – Vashon Island – Southworth',
      'Point Defiance (Tacoma) – Tahlequah',
      'Anacortes – Lopez – Shaw – Orcas – Friday Harbor',
      'Port Townsend – Coupeville (Keystone)',
    ],
    walls: [
      {
        scopeKey: 'ferry-wsf-seattle',
        heading: 'Seattle — Colman Dock',
        blurb:
          "The system's front door: WSDOT's own holding-lane camera sits at Colman Dock itself, inside downtown Seattle's dense street network.",
      },
      {
        scopeKey: 'ferry-wsf-edmonds-kingston',
        heading: 'Edmonds & Kingston',
        blurb:
          'Both ends of the Edmonds–Kingston crossing: the Edmonds dock on the mainland shore and the Kingston terminal across the water.',
      },
      {
        scopeKey: 'ferry-wsf-bainbridge',
        heading: 'Bainbridge Island',
        blurb:
          "The island end of the Seattle run — the Bainbridge holding lanes and the SR 305 approach into Winslow.",
      },
      {
        scopeKey: 'ferry-wsf-bremerton',
        heading: 'Bremerton',
        blurb:
          "Bremerton's terminal holding lanes, at the end of the longest crossing on Puget Sound's west side.",
      },
      {
        scopeKey: 'ferry-wsf-mukilteo-clinton',
        heading: 'Mukilteo & Clinton',
        blurb:
          'The Whidbey Island crossing: Mukilteo’s lighthouse-side dock and the Clinton terminal at the island’s south end.',
      },
      {
        scopeKey: 'ferry-wsf-fauntleroy-vashon',
        heading: 'Fauntleroy, Vashon & Southworth — the Triangle Route',
        blurb:
          'Three docks, one boat, a triangle on the chart: West Seattle’s Fauntleroy dock, Vashon Island’s north end and Southworth on the Kitsap shore.',
      },
      {
        scopeKey: 'ferry-wsf-point-defiance',
        heading: 'Point Defiance & Tahlequah',
        blurb:
          "Tacoma's Point Defiance dock and Tahlequah at Vashon Island's south tip — the shortest crossing in the system.",
      },
      {
        scopeKey: 'ferry-wsf-anacortes',
        heading: 'Anacortes',
        blurb:
          'The mainland gateway to the San Juan Islands: the Anacortes terminal, its holding lanes and the road out to the dock.',
      },
      {
        scopeKey: 'ferry-wsf-san-juans',
        heading: 'San Juan Islands — Friday Harbor, Orcas, Shaw & Lopez',
        blurb:
          'The island docks themselves: Friday Harbor’s holding lanes, the Orcas and Lopez ferry landings, and the islands’ own roads and harbours.',
      },
      {
        scopeKey: 'ferry-wsf-port-townsend',
        heading: 'Port Townsend',
        blurb:
          "Port Townsend's terminal at the edge of the Victorian seaport — the west end of the Admiralty Inlet crossing.",
      },
      {
        scopeKey: 'ferry-wsf-coupeville',
        heading: 'Coupeville (Keystone)',
        blurb:
          "The Keystone landing beside Fort Casey: the terminal camera itself, on Whidbey Island's west shore.",
      },
    ],
    cameraGaps: [],
    highlights: [
      'WSF Kingston Terminal (WSDOT)',
      'WSF Anacortes Ferry Terminal (WSDOT)',
      'WSF Clinton Terminal (WSDOT)',
      'WSF Seattle Ferry Bainbridge Holding — at Colman Dock',
    ],
    intro: [
      "Washington State Ferries runs the largest ferry system in the United States, and it is the rare operator whose terminals are already on camera: Washington's DOT publishes a camera at essentially every dock in the network — the holding lanes, the toll booths, the terminal approaches. This page gathers them all, dock by dock, and pairs them with the boats themselves, tracked live by the names they broadcast on AIS.",
      'The pairing is the point. The live panel above shows the fleet as the feed sees it — each vessel under its own broadcast name, with its speed and destination as reported, nothing older than ten minutes admitted. The walls below show where those boats are going: the dock filling up before a sailing, the holding lanes draining as a boat loads, the queue on the hill above Kingston on a Friday afternoon.',
    ],
    watch:
      'Ferry watching is a rhythm, not an event: the cycle of a dock emptying and refilling runs all day, and the cameras catch it best at the peaks — the morning commute into Seattle, the Friday-evening escape to the islands, the Sunday return. In the San Juans, watch the Anacortes and Friday Harbor walls together: the same boat leaves one frame and, a crossing later, enters the other. Weather is the other drama — Puget Sound fog swallows the docks whole, and the fleet keeps its rhythm inside it.',
    faqs: [
      {
        q: 'Can I see ferry sailing times here?',
        a: 'No — and any page that scrapes them unofficially would be guessing at the times that matter. This page tracks where the boats are (live AIS) and what the docks look like (the terminal cameras). For departure times and service alerts, Washington State Ferries’ own sailing schedule is the source; a boat visible in the live panel, slowing for a dock whose holding lanes are full, is the next best thing to a departure board.',
      },
      {
        q: 'How does the live panel know these are WSF boats?',
        a: 'By the names the boats themselves broadcast. Every vessel on AIS transmits its name; the panel lists only contacts inside Puget Sound whose broadcast name matches the WSF fleet’s own vessel names and that are not identified as another vessel type. It is the same identification the big ship-tracking sites use — the ferry’s name is its own announcement.',
      },
      {
        q: 'Why is a terminal sometimes missing from the live panel?',
        a: 'AIS is a radio system, not a timetable: a boat appears when it is transmitting and drops off the panel when its last report ages past ten minutes — at the dock with its signal quiet, in a coverage shadow, or between the shore stations that hear it. An empty panel means no WSF vessel is reporting at that moment, not that no ferry is running.',
      },
    ],
  },
  {
    slug: 'bc-ferries',
    name: 'BC Ferries',
    short: 'BC Ferries',
    country: 'Canada',
    countrySlug: 'canada',
    region: 'British Columbia',
    lat: 49.194,
    lng: -123.956,
    tz: 'America/Vancouver',
    geo: { minLat: 48.6, maxLat: 54.6, minLng: -133.5, maxLng: -122.7 },
    fleetNames: [
      'QUEEN OF', 'SPIRIT OF BRITISH COLUMBIA', 'SPIRIT OF VANCOUVER ISLAND',
      'COASTAL INSPIRATION', 'COASTAL CELEBRATION', 'COASTAL RENAISSANCE',
      'NORTHERN ADVENTURE', 'NORTHERN EXPEDITION', 'SALISH',
      'ISLAND DISCOVERY', 'ISLAND AURORA', 'SKEENA QUEEN', 'QUINSAM',
      'QUADRA QUEEN', 'TACHEK', 'NORTH ISLAND PRINCESS', 'MAYNE QUEEN',
    ],
    terminals: [
      'Tsawwassen', 'Swartz Bay (Victoria)', 'Horseshoe Bay',
      'Departure Bay (Nanaimo)', 'Duke Point (Nanaimo)',
      'Langdale (Sunshine Coast)', 'Comox (Little River)',
      'Powell River (Westview)', 'Port Hardy (Bear Cove)',
      'Prince Rupert',
    ],
    routes: [
      'Tsawwassen – Swartz Bay (Victoria)',
      'Tsawwassen – Duke Point (Nanaimo)',
      'Horseshoe Bay – Departure Bay (Nanaimo)',
      'Horseshoe Bay – Langdale (Sunshine Coast)',
      'Comox – Powell River',
      'Port Hardy – Prince Rupert (Inside Passage)',
      'Prince Rupert – Skidegate (Haida Gwaii)',
    ],
    walls: [
      {
        scopeKey: 'ferry-bcf-departure-bay',
        heading: 'Departure Bay (Nanaimo)',
        blurb:
          "Nanaimo's Departure Bay terminal through DriveBC's cameras — including the feed named for the ferry terminal itself, and the highway approaches the sailing traffic uses.",
      },
      {
        scopeKey: 'ferry-bcf-horseshoe-bay',
        heading: 'Horseshoe Bay (West Vancouver)',
        blurb:
          "DriveBC's two views above Horseshoe Bay village — the terminal sits in the cove below them, where Howe Sound meets the highway.",
      },
    ],
    cameraGaps: ['Tsawwassen', 'Swartz Bay (Victoria)', 'Duke Point (Nanaimo)'],
    highlights: [
      'Departure Bay Ferry (DriveBC)',
      'Departure Bay — Zorkin Road (DriveBC)',
      'Horseshoe Bay — E/W (DriveBC)',
    ],
    intro: [
      "BC Ferries is one of the largest ferry operators on Earth, running the Inside Passage and the straits between Vancouver Island and the mainland — and its boats are as identifiable on AIS as any fleet afloat: the Queens, the Spirits, the Coastal class, the Salish class, each broadcasting its own name. The live panel above lists the ones reporting now, matched by those names inside BC waters.",
      'The camera story is more partial, and this page prints it straight: DriveBC’s network covers Departure Bay properly — its terminal feed is in the wall below — and looks over Horseshoe Bay, but the catalogue holds no camera at all for Tsawwassen, Swartz Bay or Duke Point, the system’s three busiest mainland-island terminals. Those docks are named here as gaps. A directory that padded them with distant highway shots and called it a terminal wall would be lying about what you’re looking at.',
    ],
    watch:
      'The crossings worth watching are the scenic ones: the Tsawwassen–Swartz Bay run threads Active Pass between Galiano and Mayne islands, and the Inside Passage ships sail some of the finest coastal water on the planet — the live panel’s northern boats are the ones to follow on the globe. At Departure Bay, the wall’s rhythm is the Horseshoe Bay sailing cycle: lanes filling, the ship’s stern swinging out, the bay emptying again.',
    faqs: [
      {
        q: 'Why is there no Tsawwassen or Swartz Bay camera wall?',
        a: 'Because the public camera catalogue this directory is built from contains no feed at either terminal — zero within reach of the docks, checked directly. Rather than borrow a highway camera kilometres away and label it a ferry wall, the page names the gap. If BC or DriveBC publishes terminal feeds, they will join this page automatically.',
      },
      {
        q: 'Can I see BC Ferries sailing times or deck space here?',
        a: 'No. This page shows where the fleet is (live AIS, matched by the vessels’ broadcast names) and what the covered terminals look like (DriveBC cameras). Sailing times, current conditions and reservations live with BC Ferries itself — its sailing status is the authority, especially on the northern routes where weather rewrites the day.',
      },
      {
        q: 'Which BC Ferries routes does the live panel cover?',
        a: 'Any route whose vessel is transmitting: the panel matches the fleet by name across all BC waters, from the Gulf Islands to Haida Gwaii. A boat in refit, out of service or with a quiet transponder simply does not appear — the panel shows the reporting fleet, not the roster.',
      },
    ],
  },
  {
    slug: 'staten-island-ferry',
    name: 'Staten Island Ferry',
    short: 'Staten Island Ferry',
    country: 'United States',
    countrySlug: 'united-states',
    region: 'New York',
    lat: 40.6433,
    lng: -74.0735,
    tz: 'America/New_York',
    geo: { minLat: 40.55, maxLat: 40.75, minLng: -74.15, maxLng: -73.95 },
    fleetNames: [
      'BARBERI', 'NEWHOUSE', 'MOLINARI', 'MARCHI', 'SPIRIT OF AMERICA',
      'ALICE AUSTEN', 'DOROTHY DAY', 'SANDY GROUND', 'OLLIS',
    ],
    terminals: ['St. George (Staten Island)', 'Whitehall (Manhattan)'],
    routes: ['St. George – Whitehall'],
    walls: [
      {
        scopeKey: 'ferry-si-new-york-harbor',
        heading: 'New York Harbor — both shores of the crossing',
        blurb:
          'Every catalogue camera within 6 km of the harbour’s middle: the Lower Manhattan waterfront the ferry leaves, the Staten Island shore it makes for, and the harbour traffic between them.',
      },
    ],
    cameraGaps: ['St. George Terminal', 'Whitehall Terminal'],
    highlights: [
      'New York Harbor waterfront cameras — Manhattan & Staten Island shores',
    ],
    intro: [
      'The Staten Island Ferry makes the most famous short crossing in America: St. George to Whitehall, across the mouth of the Hudson, past the Statue of Liberty, free to ride and running around the clock. Its boats are named for New York — the Barberi, the Molinari, the Marchi, the Dorothy Day — and they announce those names on AIS like every vessel in the harbour. The live panel above lists the ones reporting now.',
      'One gap is stated plainly, because it shapes the page: the catalogue holds no camera inside either terminal — not at St. George, not at Whitehall. What it holds is the harbour itself: the waterfront cameras of both shores within 6 km of the crossing’s midpoint, which is where this ferry is best watched anyway — a big orange boat crossing the busiest harbour in America, in frame with everything else that floats there.',
    ],
    watch:
      'The crossing takes about twenty-five minutes, and the harbour wall earns its keep at the turnarounds: a boat easing into St. George, the next one already mid-harbour. Rush hours are the spectacle — the ferry threading commuter traffic, tugs, barges and the Governors Island boats — and after dark the lit boat crossing a black harbour under the Manhattan skyline is the classic frame.',
    faqs: [
      {
        q: 'Why is there no camera at the St. George or Whitehall terminal?',
        a: 'The public feeds this catalogue is built from include no camera inside either terminal — checked directly at both docks. The page therefore walls the harbour the ferry crosses, which is public and well covered, and says so. If NYC DOT publishes terminal feeds, they will be added here.',
      },
      {
        q: 'Is the Staten Island Ferry really free?',
        a: 'Yes — the crossing has been free since 1997, and it runs around the clock. This page tracks the boats and shows the harbour; for service changes and boarding information, NYC DOT’s ferry pages are the authority.',
      },
      {
        q: 'How does the panel tell the ferry from other harbour traffic?',
        a: 'By name. The harbour is full of tugs, barges, tour boats and freighters; the panel lists only contacts whose broadcast name matches the ferry fleet’s own vessel names inside the harbour geofence. Everything else is on the globe’s full maritime layer for VIP members.',
      },
    ],
  },
];

const BY_SLUG = new Map(FERRY_SYSTEMS.map((s) => [s.slug, s]));

export function ferrySystemBySlug(slug: string): FerrySystem | null {
  return BY_SLUG.get(slug) ?? null;
}

/** Normalise a broadcast AIS name for fleet matching. */
export function normalizeShipName(name: string): string {
  return name
    .toUpperCase()
    .replace(/[.\-_'’/]/g, ' ')
    .replace(/^(M V|MV|MS|MF|RV)\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The vessels from `feed` that are this system's ferries right now:
 * broadcast-name match against the fleet, inside the service-area
 * geofence, not a known non-passenger type, report inside the feed's
 * freshness window. Sorted by name.
 */
export function matchFerryVessels(
  system: FerrySystem,
  feed: FeedShip[],
  now: number,
): VesselView[] {
  const fragments = system.fleetNames.map(normalizeShipName);
  const out: VesselView[] = [];
  for (const ship of feed) {
    if (typeof ship.lat !== 'number' || typeof ship.lng !== 'number') continue;
    if (
      ship.lat < system.geo.minLat ||
      ship.lat > system.geo.maxLat ||
      ship.lng < system.geo.minLng ||
      ship.lng > system.geo.maxLng
    ) {
      continue;
    }
    // A vessel whose static data identifies it as something other
    // than a passenger ship is not a ferry, whatever its name says.
    if (ship.type && ship.type !== 'passenger') continue;
    const name = normalizeShipName(ship.name ?? '');
    if (!name) continue;
    if (!fragments.some((f) => name.includes(f))) continue;
    const view = toVesselView(ship, now);
    if (view) out.push(view);
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** Distance helper re-exported for the port/fleet tests' convenience. */
export { haversineKm };
