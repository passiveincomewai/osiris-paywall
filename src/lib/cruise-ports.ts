/**
 * OSIRIS — the cruise-port live board registry (Menu #2 Wave B, Oct 2026).
 *
 * One row per cruise port with its own page under /port-webcams.
 * A port qualifies only on evidence, audited Oct 2026: a real camera
 * wall in the catalogue (an existing `port-*` EXPLORE_SCOPES wall
 * from the /port-webcams hub, or a new one added with this family)
 * AND live AIS coverage of the port area from the maritime feed.
 *
 * What the board is — and is not. The repo holds NO cruise schedule
 * dataset, so the board is a LIVE PRESENCE board: the cruise ships
 * physically inside the port area right now, read off the maritime
 * AIS feed. It is labelled exactly that, everywhere. It never shows
 * "departures today" or sailing times, because no data the site
 * serves carries them. Presence rule: an AIS passenger-type vessel
 * (type codes 60–69) inside the port's board radius; speed under
 * 1 knot reads as "in port" (berthed or anchored), anything faster
 * as "underway in the port area". A ship whose static data has not
 * been received yet carries no type and cannot be identified as a
 * cruise ship — it joins the board when its type broadcast lands;
 * the page states this rather than guessing from names.
 *
 * The famous absences are pinned in cruise-ports.test.ts, not
 * hidden: Port Canaveral — the world's second-busiest cruise port —
 * has NO port camera in the catalogue (within 12 km: six SR-528
 * freeway cameras and an offshore buoy), so it gets no page of
 * freeway footage wearing a port's name. Southampton is at zero
 * (the /port-webcams hub already documents this), as are Cozumel,
 * Nassau, Dover, Piraeus, Copenhagen and Mobile.
 *
 * Every count a page quotes is its wall's EXPLORE_SCOPES yield over
 * the catalogue, computed the same way as every other family.
 */

import {
  haversineKm,
  toVesselView,
  type FeedShip,
  type VesselView,
} from './ais-feed';

export interface CruisePort {
  slug: string;
  /** Port name, e.g. "PortMiami". */
  name: string;
  /** Short name for titles/cards, e.g. "Miami". */
  short: string;
  city: string;
  country: string;
  countrySlug: string;
  region: string;
  /** Port centre — the point the board radius and wall are measured from. */
  lat: number;
  lng: number;
  /** AIS board radius: passenger vessels inside it are "at this port". */
  boardRadiusKm: number;
  /** EXPLORE_SCOPES key of this port's camera wall. */
  scopeKey: string;
  /** The wall's stated radius, for page copy. */
  wallRadiusKm: number;
  tz: string;
  /** Named cameras verified inside the wall (audit, Oct 2026). */
  highlights: string[];
  intro: [string, string];
  watch: string;
  faqs: Array<{ q: string; a: string }>;
}

export const CRUISE_PORTS: CruisePort[] = [
  {
    slug: 'miami',
    name: 'PortMiami',
    short: 'Miami',
    city: 'Miami',
    country: 'United States',
    countrySlug: 'united-states',
    region: 'Florida',
    lat: 25.7743,
    lng: -80.17,
    boardRadiusKm: 12,
    scopeKey: 'port-miami',
    wallRadiusKm: 10,
    tz: 'America/New_York',
    highlights: [
      'MacArthur Causeway & I-395 approach cameras (FDOT)',
      'Downtown Miami & Biscayne Bay waterfront network',
    ],
    intro: [
      "PortMiami calls itself the cruise capital of the world, and on a Saturday the turning basin earns it: the biggest cruise ships afloat berth along one channel, in sight of the downtown skyline. This page pairs the port's camera wall — every catalogue camera within 10 km of the port centre, the causeway approaches and the Biscayne Bay waterfront — with the live board above: the cruise ships physically in port right now, read off their own AIS broadcasts.",
      'The board is a presence board, not a departure board, and the distinction is printed here rather than buried: no schedule dataset backs this site, so the page never invents a sailing time. What it can tell you is better in one way — a ship on the board is really there, transmitting, within the last ten minutes.',
    ],
    watch:
      'Sailaway is the show: late afternoon, when the day’s ships back out of the turning basin one by one and thread Government Cut past Fisher Island. The causeway cameras catch the shoreside half of it — traffic stopping, crowds on the baywalk — and the board empties hull by hull as each ship clears the sea buoy and drops off the port’s radius.',
    faqs: [
      {
        q: 'Which cruise ships are in Miami today?',
        a: 'The ones on the board above — that is the honest form of the answer. It lists every AIS passenger-type vessel inside PortMiami’s board radius right now, with its broadcast name, speed and destination. A ship alongside with its transponder quiet, or whose type broadcast has not been received yet, will not appear; the board shows the transmitting fleet, not the port’s paperwork.',
      },
    ],
  },
  {
    slug: 'port-everglades',
    name: 'Port Everglades',
    short: 'Port Everglades',
    city: 'Fort Lauderdale',
    country: 'United States',
    countrySlug: 'united-states',
    region: 'Florida',
    lat: 26.085,
    lng: -80.115,
    boardRadiusKm: 12,
    scopeKey: 'port-fort-lauderdale',
    wallRadiusKm: 8,
    tz: 'America/New_York',
    highlights: [
      'Port Everglades trafficcams — the port’s own published feed',
      'SE 17th Street & Harbour Inlet Drive (Broward County)',
    ],
    intro: [
      "Port Everglades is the working harbour inside Fort Lauderdale's beach city — cruise terminals, the petroleum docks and the inlet all in one frame, and this wall holds a small prize: a camera the port itself publishes, inside a 90-camera wall of inlet, causeway and beach-district feeds within 8 km of the port centre.",
      'The live board above it reads the inlet’s traffic the way a harbourmaster would: passenger vessels inside the board radius, named as they broadcast, marked in port when they are stopped and underway when they are moving through the inlet. On a cruise morning the board fills before the wall shows a single funnel — the ships arrive in the dark.',
    ],
    watch:
      'The inlet is the stage: ships thread the Port Everglades Inlet between the beach and the jetty, close enough that the shore cameras hold them for minutes at a time. Late-afternoon departures are the reliable spectacle; the 17th Street Causeway bridge lifts for the tall ones, and the wall catches both.',
    faqs: [
      {
        q: 'Can I watch my cruise ship leave Port Everglades?',
        a: 'Yes — this is one of the better ports in the world for it. Find your ship on the board (it appears once it is transmitting inside the port area), then watch the wall: the inlet cameras hold a departing ship for the whole transit out to the sea buoy. The board gives you the ship; the wall gives you the goodbye.',
      },
    ],
  },
  {
    slug: 'tampa',
    name: 'Port Tampa Bay',
    short: 'Tampa',
    city: 'Tampa',
    country: 'United States',
    countrySlug: 'united-states',
    region: 'Florida',
    lat: 27.944,
    lng: -82.445,
    boardRadiusKm: 12,
    scopeKey: 'port-tampa',
    wallRadiusKm: 10,
    tz: 'America/New_York',
    highlights: [
      'Channelside at Kennedy — beside the cruise terminals',
      'Downtown Tampa & the Hillsborough River network',
    ],
    intro: [
      "Tampa's cruise terminals sit in the Channelside district, in the middle of the city — which is why this wall is the deepest of the Florida ports: more than 250 catalogue cameras within 10 km of the port centre, the downtown grid and the river included. A Tampa cruise ship does not arrive at a remote dock; it arrives in the middle of town, under the skyline.",
      'The board above reads the port’s live presence off AIS: passenger vessels in Tampa Bay’s upper harbour, named as they broadcast. Tampa’s approach is a long one — under the Sunshine Skyway and up the bay — so a ship shows on the board well before its funnel clears the Channelside cranes.',
    ],
    watch:
      'Tampa’s signature frame is the Skyway: a cruise ship’s funnel clearing the Sunshine Skyway Bridge with metres to spare, on the long run in from the Gulf. In town, watch Channelside at turnaround time — the district wakes up with the ship, and the wall’s downtown cameras catch the whole choreography of taxis, luggage and crew change.',
    faqs: [
      {
        q: 'How long does a cruise ship take to reach Tampa’s terminals?',
        a: 'The transit from the Gulf is one of the longest port approaches in Florida — past Egmont Key, under the Skyway, and up the bay — which is exactly why the live board is useful here: a ship enters the board’s radius with most of its approach still ahead of it, and you can follow the last hour on the globe before it berths.',
      },
    ],
  },
  {
    slug: 'seattle',
    name: 'Port of Seattle',
    short: 'Seattle',
    city: 'Seattle',
    country: 'United States',
    countrySlug: 'united-states',
    region: 'Washington',
    lat: 47.62,
    lng: -122.37,
    boardRadiusKm: 10,
    scopeKey: 'port-seattle',
    wallRadiusKm: 6,
    tz: 'America/Los_Angeles',
    highlights: [
      'Elliott Bay waterfront network (SDOT)',
      'The same harbour the Washington State Ferries cross — see the ferry tracker',
    ],
    intro: [
      "Seattle's cruise berths — Pier 66 on the downtown waterfront and Pier 91 below Magnolia — face Elliott Bay, the same water the ferries cross all day. The wall here is the bay's own network: every catalogue camera within 6 km of the harbour centre the port hub already uses, the waterfront, the downtown grid and the bay's working shores.",
      'In season, the board above reads like an Alaska timetable without the times: the big ships that spend their summers running Seattle to Juneau and back, in port on their turnaround days, named on AIS as they sit at the pier. Off season the board is honestly quiet — Seattle’s cruise trade is a summer business, and the page does not pretend otherwise.',
    ],
    watch:
      'Turnaround day is the watch: a ship that arrives at dawn, empties, reloads and sails by late afternoon, with the bay’s ferries crossing its bow the whole time. The finest frame is a departure down Elliott Bay in evening light, the ship lit, the Olympics ahead of it — the wall’s waterfront cameras hold the first mile of it.',
    faqs: [
      {
        q: 'Why is the Seattle board empty in winter?',
        a: 'Because Seattle’s cruise season is a summer season — the Alaska fleet winters elsewhere, and an honest board shows an empty port rather than borrowing last summer’s names. The ferries, of course, never leave: the same harbour is on the ferry tracker all year.',
      },
    ],
  },
  {
    slug: 'vancouver',
    name: 'Port of Vancouver',
    short: 'Vancouver',
    city: 'Vancouver',
    country: 'Canada',
    countrySlug: 'canada',
    region: 'British Columbia',
    lat: 49.289,
    lng: -123.111,
    boardRadiusKm: 10,
    scopeKey: 'port-vancouver',
    wallRadiusKm: 6,
    tz: 'America/Vancouver',
    highlights: [
      'Downtown Vancouver network — Burrard & Hastings, blocks from Canada Place',
      'Burrard Inlet & the harbour shores',
    ],
    intro: [
      "Canada Place — the white-sailed terminal in the middle of downtown Vancouver — is the Alaska season's southern gate, and its wall is the downtown network itself: the city’s own cameras within 6 km of the harbour centre, Burrard Street a few blocks from the berth. Few cruise ports anywhere are this deep inside a city’s camera grid.",
      'The board above reads Burrard Inlet’s cruise presence off AIS: the Alaska-bound ships at Canada Place and in the anchorage, named as they broadcast. Like Seattle, Vancouver is a seasonal port — the board fills from spring to autumn and empties honestly for winter.',
    ],
    watch:
      'The departure under the Lions Gate Bridge is the frame: a ship easing out from Canada Place, gathering way down the inlet and sliding under the bridge with the North Shore mountains behind it. The downtown cameras hold the first part; for the bridge itself, follow the ship on the globe.',
    faqs: [
      {
        q: 'Do the same ships appear at Seattle and Vancouver?',
        a: 'Often, yes — the Alaska trade runs both ports, sometimes in the same week. Each board is read live from AIS, so a ship appears at the port it is actually in; watch the two boards across a week and you can follow a hull’s whole circuit of the Inside Passage trade.',
      },
    ],
  },
  {
    slug: 'galveston',
    name: 'Port of Galveston',
    short: 'Galveston',
    city: 'Galveston',
    country: 'United States',
    countrySlug: 'united-states',
    region: 'Texas',
    lat: 29.31,
    lng: -94.775,
    boardRadiusKm: 10,
    scopeKey: 'port-galveston',
    wallRadiusKm: 8,
    tz: 'America/Chicago',
    highlights: [
      'Galveston Ferry at Harborside (TxDOT) — the cruise-terminal street',
      'Bolivar Ferry landing cameras, across the channel',
    ],
    intro: [
      "Galveston's cruise terminals stand on Harborside Drive, and Harborside is a ferry street as much as a cruise street: the wall here is TxDOT's port-district network — the Galveston–Bolivar ferry cameras at the landing and along Harborside, the causeway approaches behind them. Twelve cameras, stated at their real size: a small wall for a port whose ships are enormous.",
      'The board above reads the harbour’s live presence off AIS — the Gulf fleet’s homeport ships at the piers and in the channel. Galveston’s trade runs year-round, Caribbean-bound, and the board’s rhythm is the weekly turnaround cycle of very large ships in a compact harbour.',
    ],
    watch:
      'Watch the channel, not just the berth: Galveston’s ships share the water with the Bolivar ferries crossing in front of them and the Houston Ship Channel’s tanker traffic behind them. A sailaway here is a negotiation in a narrow channel, and the Harborside cameras hold the shoreside view of it.',
    faqs: [
      {
        q: 'Why does a cruise port’s wall feature ferry cameras?',
        a: 'Because they are the cameras the port district actually has. The Galveston–Bolivar ferry landing stands on the same Harbourside waterfront as the cruise terminals, and TxDOT’s cameras there are the port’s public eyes. The page labels them for exactly what they are rather than renaming them cruise cams.',
      },
    ],
  },
  {
    slug: 'san-diego',
    name: 'Port of San Diego',
    short: 'San Diego',
    city: 'San Diego',
    country: 'United States',
    countrySlug: 'united-states',
    region: 'California',
    lat: 32.716,
    lng: -117.174,
    boardRadiusKm: 10,
    scopeKey: 'port-san-diego',
    wallRadiusKm: 8,
    tz: 'America/Los_Angeles',
    highlights: [
      'San Diego bayfront webcams (Public Webcam)',
      'Harbor Drive & the downtown bayfront network (Caltrans)',
    ],
    intro: [
      "San Diego's cruise terminal sits on the downtown bayfront, B Street Pier, in a harbour it shares with the Navy — the wall here is the bayfront's own network within 8 km of the port centre: the public bay webcams, Harbor Drive, and the downtown grid behind it. A cruise ship at B Street is in the middle of the city's front room.",
      'The board above reads the bay’s cruise presence off AIS, with a San Diego caveat printed plainly: this harbour’s passenger-type contacts include the naval and excursion traffic of a working military bay, and the board lists what the feed identifies — named vessels, in the port area, right now.',
    ],
    watch:
      'San Diego light is the draw: ships berth and sail in the long Pacific evening, and the bayfront webcams face the right way for it. Watch for the double spectacle of a cruise departure sharing the channel with naval movements — few ports put the two fleets in one frame.',
    faqs: [
      {
        q: 'Which ships on the San Diego board are cruise ships?',
        a: 'The board lists every AIS passenger-type vessel in the port area by its broadcast name — the big cruise hulls are unmistakable by name and size of their signal footprint, alongside harbour excursion boats that share the type code. Each entry is a real transmitting vessel; the names let you tell the fleet from the day boats.',
      },
    ],
  },
  {
    slug: 'barcelona',
    name: 'Port de Barcelona',
    short: 'Barcelona',
    city: 'Barcelona',
    country: 'Spain',
    countrySlug: 'spain',
    region: 'Catalonia',
    lat: 41.352,
    lng: 2.162,
    boardRadiusKm: 10,
    scopeKey: 'port-barcelona',
    wallRadiusKm: 8,
    tz: 'Europe/Madrid',
    highlights: [
      'Ronda Litoral / Moll de la Fusta (Catalonia traffic network)',
      'The old port & the WTC mole approaches',
    ],
    intro: [
      "Barcelona is the Mediterranean's great cruise crossroads — homeport and port of call at once — and its wall is the Catalan traffic network along the Ronda Litoral, the shore road that runs the length of the port: every catalogue camera within 8 km of the port centre, from the old harbour at Moll de la Fusta to the Zona Franca approaches.",
      'The board above reads the port’s live presence off AIS: the Mediterranean fleet in its berths and anchorages, named as broadcast. In high summer this is one of the fullest boards in the family; in winter it thins to the year-round callers — both shown as they are.',
    ],
    watch:
      'Barcelona’s watch is the morning arrival parade: ships making the port from every point of the Mediterranean in the first light, turning for the Adossat quay under Montjuïc. The Ronda Litoral cameras run the whole waterfront, so a single wall holds a ship from sea buoy to berth side.',
    faqs: [
      {
        q: 'Is Barcelona a homeport or a port of call?',
        a: 'Both, at scale — which is why its board mixes ships that live here with ships just passing through on Mediterranean circuits. The board does not distinguish them (AIS does not say), and the page does not pretend to: presence is what is measured, and presence is what is shown.',
      },
    ],
  },
  {
    slug: 'juneau',
    name: 'Port of Juneau',
    short: 'Juneau',
    city: 'Juneau',
    country: 'United States',
    countrySlug: 'united-states',
    region: 'Alaska',
    lat: 58.298,
    lng: -134.404,
    boardRadiusKm: 10,
    scopeKey: 'port-juneau',
    wallRadiusKm: 8,
    tz: 'America/Juneau',
    highlights: [
      'Juneau Tram cameras — looking down on the cruise berths',
      'Douglas Island cameras, across Gastineau Channel',
    ],
    intro: [
      "Juneau's cruise berths line the Gastineau Channel under Mount Roberts, and the wall here has the finest vantage in the family: the Mount Roberts Tram cameras look down the channel at the docks, joined by the Douglas Island feeds across the water. Twelve cameras within 8 km — a small wall with a grandstand view.",
      'The board above reads the channel’s live presence off AIS. Juneau is the Alaska trade in miniature: on a summer day the berths hold more cruise passengers than the town holds residents, and the board fills and empties with the tide of ships; in winter the channel belongs to the ferries and the board is quiet, as it should be.',
    ],
    watch:
      'Watch the channel in the long northern evening: ships that have been alongside all day casting off in sequence, down the Gastineau past Douglas Island, while the tram cameras hold the whole departure from above. Low cloud is Juneau’s other mood — the berths vanish into it and the board becomes the only window in town.',
    faqs: [
      {
        q: 'Why does Juneau get a board when bigger ports do not?',
        a: 'Because the evidence rule cuts both ways: Juneau has real cameras aimed at its cruise waterfront — the tram feeds above the berths — and live AIS in the channel. Ports ten times its size with no camera on their water (Port Canaveral, Southampton) fail the same rule Juneau passes.',
      },
    ],
  },
];

const BY_SLUG = new Map(CRUISE_PORTS.map((p) => [p.slug, p]));

export function cruisePortBySlug(slug: string): CruisePort | null {
  return BY_SLUG.get(slug) ?? null;
}

export interface PortShipView extends VesselView {
  /** 'in-port' = stopped inside the board radius; 'in-area' = underway inside it. */
  status: 'in-port' | 'in-area';
  distanceKm: number;
}

/**
 * The cruise ships at `port` right now: AIS passenger-type vessels
 * inside the board radius with a fresh report. In-port (stopped)
 * first, then by name. Vessels whose type broadcast has not been
 * received carry no type and are NOT guessed at — they are absent.
 */
export function shipsInPort(
  port: CruisePort,
  feed: FeedShip[],
  now: number,
): PortShipView[] {
  const out: PortShipView[] = [];
  for (const ship of feed) {
    if (ship.type !== 'passenger') continue;
    if (typeof ship.lat !== 'number' || typeof ship.lng !== 'number') continue;
    const d = haversineKm(port.lat, port.lng, ship.lat, ship.lng);
    if (d > port.boardRadiusKm) continue;
    const view = toVesselView(ship, now);
    if (!view) continue;
    out.push({
      ...view,
      status: (view.speedKn ?? 0) < 1 ? 'in-port' : 'in-area',
      distanceKm: Math.round(d * 10) / 10,
    });
  }
  return out.sort((a, b) =>
    a.status === b.status
      ? a.name.localeCompare(b.name)
      : a.status === 'in-port'
        ? -1
        : 1,
  );
}
