/**
 * Surf & beach spot walls — the per-place registry behind
 * /surf-webcams, /surf-webcams/[spot] and /beach-webcams/[spot].
 *
 * Each spot is a stated geographic rule, the same discipline as the
 * port walls (lib/explore-data EXPLORE_SCOPES): every catalogue
 * camera within `radiusKm` of the spot's centre over its country
 * chunk, nearest first — registered as scope `surf-<slug>` /
 * `beach-<slug>` in lib/explore-data. Pages compute their counts from
 * that scope (countForDef / recordsForDef), never from figures typed
 * here; the yields pinned in lib/surf-page-scopes.test.ts were
 * recomputed from the raw chunks (catalogue generated 2026-10-20).
 *
 * Selection: the coastal places whose 12 km wall is a genuine
 * cluster (the data phase's final selection, verified 22/22 against
 * the raw chunks; Key West added 2026-10-29 by the Keyword Gap
 * Programme — 29 FDOT island cameras verified the same way, 23/23). Famous breaks with no real catalogue cluster —
 * Nazaré, Biarritz, Byron Bay, Jeffrey's Bay and the rest of the
 * candidate list — have no wall and no page; the hub says so.
 *
 * Honesty rules for this family:
 *  - WorldEye shows cameras. It does not publish surf reports,
 *    forecasts, swell height/period/direction data or surf
 *    conditions, and no copy here may promise them. The framing is
 *    "see the break live before you go": the camera is the visual
 *    check, never a forecast.
 *  - A wall is a surf town on camera, not a dedicated break feed:
 *    where a beach-named camera exists the copy says so; where the
 *    wall is the town's road and corridor feeds, the copy says that
 *    instead (the port page's rule: nobody calls a road camera a
 *    berth camera; nobody here calls one a surf camera either).
 *  - `about` / `knownFor` are standing geographic and historical
 *    facts about the place (which way the beach faces, the break's
 *    name, the event it hosts) — never claims about today's surf.
 */

export interface CoastalSpot {
  slug: string;
  family: "surf" | "beach";
  /** Display name, e.g. "Bondi Beach, Sydney". */
  name: string;
  /** Short name for cards and breadcrumbs, e.g. "Bondi". */
  shortName: string;
  /** Place line, e.g. "Sydney, New South Wales, Australia". */
  place: string;
  /** Country chunk slug (src/data/countries/<slug>.json). */
  countrySlug: string;
  countryName: string;
  lat: number;
  lng: number;
  radiusKm: number;
  /** EXPLORE_SCOPES key: surf-<slug> / beach-<slug>. */
  scopeKey: string;
  /** The break or beach surfers and locals know, in one factual line. */
  knownFor: string;
  /** Two short paragraphs of standing geographic context. */
  about: string[];
  /** What the wall's cameras actually are — from the verified
   *  nearest / coast-named records, stated factually. */
  watchNotes: string[];
  /** Verified city directory page (src/data/city-pages.json), if one
   *  genuinely serves this spot. */
  cityPage?: { slug: string; label: string };
  /** US state camera directory (/us-traffic-cameras/<state>). */
  stateHub?: { slug: string; label: string };
}

const RADIUS_KM = 12;

function spot(
  def: Omit<CoastalSpot, "radiusKm" | "scopeKey"> & { radiusKm?: number },
): CoastalSpot {
  return {
    ...def,
    radiusKm: def.radiusKm ?? RADIUS_KM,
    scopeKey: `${def.family}-${def.slug}`,
  };
}

export const SURF_SPOTS: CoastalSpot[] = [
  spot({
    slug: "haeundae",
    family: "surf",
    name: "Haeundae, Busan",
    shortName: "Haeundae",
    place: "Busan, South Korea",
    countrySlug: "south-korea",
    countryName: "South Korea",
    lat: 35.1631,
    lng: 129.1636,
    knownFor:
      "Busan's great city beach — a wide, south-facing arc under the high-rises at the end of the subway line.",
    about: [
      "Haeundae is the most famous beach in South Korea: a 1.5 km arc of sand in Busan's east, backed by the towers of Marine City and the hills of Dalmaji. In summer it is one of the most crowded beaches in Asia; in the cooler months it belongs to walkers, the coastal path, and the surfers who use its beach breaks when a passing swell or a typhoon out in the East Sea pushes waves into the bay.",
      "The wall's density is a Busan story. South Korea runs one of the densest municipal camera networks in the catalogue, and Haeundae district is covered end to end — the beach, the coastal roads, the estuary and the restaurant streets behind the sand are all on public feeds.",
    ],
    watchNotes: [
      "A feed in the wall is named for the beach itself — Haeundae Beach, Busan — alongside coastal-road cameras on the Haeundae and Gwangalli side (18 of the wall's cameras name a beach, coast or shore in their title).",
      "The rest of the wall is the district around the sand: the estuary by the district office, Dalmaji hill's restaurant road, and the approaches from the city.",
    ],
    cityPage: { slug: "busan", label: "Busan city webcams" },
  }),
  spot({
    slug: "waikiki",
    family: "surf",
    name: "Waikiki & Honolulu",
    shortName: "Waikiki",
    place: "Honolulu, Oahu, Hawaii, United States",
    countrySlug: "united-states",
    countryName: "United States",
    lat: 21.2793,
    lng: -157.8385,
    knownFor:
      "Canoes and Queens, the gentle reef breaks off Waikiki Beach where modern surfing began.",
    about: [
      "Waikiki is where surfing was first shown to the world — the long, rolling reef breaks off this Honolulu shoreline were the sport's original postcard, and the outrigger canoes and longboarders are still out there every day. The wall centres on the beach and takes in the Waikiki strip and the edge of downtown Honolulu.",
      "Honolulu's public cameras are street cameras — the intersections of Kalakaua and Kuhio, the avenues that run the length of the beach strip. That makes this wall a street-level read on Waikiki: the sky over the reefs, the palms moving, the crowds on the sand-side avenues, the traffic that tells you how busy the strip is.",
    ],
    watchNotes: [
      "The nearest feeds are the Kalakaua Avenue intersections — Kalia, Kuhio, Lewers — the beachfront avenue itself, a few hundred metres from the sand.",
      "Only one feed in the wall names the coast outright (out at Nimitz & Sand Island); this is a street-camera wall around a famous shoreline, and the page will not pretend otherwise.",
    ],
    stateHub: { slug: "hawaii", label: "Hawaii traffic cameras" },
  }),
  spot({
    slug: "bondi",
    family: "surf",
    name: "Bondi Beach, Sydney",
    shortName: "Bondi",
    place: "Sydney, New South Wales, Australia",
    countrySlug: "australia",
    countryName: "Australia",
    lat: -33.8915,
    lng: 151.2767,
    knownFor:
      "Australia's most famous beach break — a south-facing arc between two headlands, home of the Bondi Rescue lifeguards.",
    about: [
      "Bondi is the beach Sydney shows the world: a kilometre of south-facing sand between Ben Buckler and Mackenzie's Point, with the Icebergs pool at its southern end and a beach break that works across the banks along the arc. The wall centres on the beach and climbs the ridge behind it to Bondi Junction.",
      "New South Wales publishes its road network as Live Traffic cameras, and that network is what covers Bondi — the ridge roads above the beach, not the sand itself. What the wall gives you is the eastern suburbs live: the weather arriving over the coast, the light on the water's side of the ridge, and the traffic building on the roads every beachgoer uses.",
    ],
    watchNotes: [
      "The nearest feeds sit on the ridge above the beach — Old South Head Road and Syd Einfeld Drive at Bondi Junction — a few minutes' walk from the sand, looking over the suburb rather than at the break.",
      "The coast-named feeds inside the radius are the Sydney Harbour Bridge cameras; there is no dedicated Bondi Beach feed in the catalogue, so this page does not claim one.",
    ],
  }),
  spot({
    slug: "encinitas",
    family: "surf",
    name: "Encinitas & Cardiff",
    shortName: "Encinitas",
    place: "San Diego County, California, United States",
    countrySlug: "united-states",
    countryName: "United States",
    lat: 33.037,
    lng: -117.292,
    knownFor:
      "Swami's, the reef point at the foot of the Self-Realization bluff, and the Cardiff reefs just south.",
    about: [
      "Encinitas is one of California's defining surf towns: the reef at Swami's below the golden towers of the Self-Realization Fellowship, the beach breaks along old Highway 101, and Cardiff-by-the-Sea's reefs a mile south. The wall runs along the coast corridor the town is strung along — the bluff-top streets, the 101, and Interstate 5 on the ridge above.",
      "The catalogue's cameras here are Caltrans feeds, and they are corridor cameras: I-5 at Encinitas and Santa Fe Drive, the freeway every surf check drives. Read this wall for the morning's sky and marine layer over the coast, the state of the drive down, and the look of the town — the break itself is below the bluff, out of the freeway cameras' frame.",
    ],
    watchNotes: [
      "Every feed in the wall is a road camera — the nearest are the I-5 Encinitas cameras — and none is a dedicated beach feed; the coast-named count in this wall is zero, stated plainly.",
      "What the wall does show well: the marine layer. The freeway cameras sit on the ridge above the reefs, and a grey wall over the coast at dawn reads clearly in them.",
    ],
    cityPage: { slug: "san-diego", label: "San Diego city webcams" },
    stateHub: { slug: "california", label: "California traffic cameras" },
  }),
  spot({
    slug: "kamakura",
    family: "surf",
    name: "Kamakura & Shonan",
    shortName: "Kamakura",
    place: "Kanagawa, Japan",
    countrySlug: "japan",
    countryName: "Japan",
    lat: 35.3192,
    lng: 139.5469,
    knownFor:
      "Shichirigahama and the Shonan coast — the surf heartland an hour from Tokyo, under the old capital's hills.",
    about: [
      "Kamakura was Japan's capital in the 12th century; today its coast — the Shonan shore running through Shichirigahama, Koshigoe and Katase toward Enoshima — is the home break of Tokyo surfing, reached by the Enoden line that rattles along the water. On a clear day Mt. Fuji stands over the bay to the west.",
      "The wall mixes Japan's dense public feeds: prefectural and river-network cameras from the OpenCCTV rivergojp set, and a handful of SkylineWebcams feeds — including one named for Shichirigahama itself, the beach at the heart of the Shonan scene.",
    ],
    watchNotes: [
      "A wall feed is named Kamakura – Shichirigahama: the surf beach itself, not a road above it.",
      "The rest of the wall is the coast plain behind the beach — the Ōmachi bridge and river feeds, and cameras across the bay toward Hayama and the Miura side.",
    ],
  }),
  spot({
    slug: "manly",
    family: "surf",
    name: "Manly, Sydney",
    shortName: "Manly",
    place: "Sydney, New South Wales, Australia",
    countrySlug: "australia",
    countryName: "Australia",
    lat: -33.7969,
    lng: 151.2869,
    knownFor:
      "The ferry-side surf beach where board surfing was first demonstrated in Australia, in 1915.",
    about: [
      "Manly is Sydney's other great beach town — the ferry ride from Circular Quay, the pine-lined Corso, and an east-facing beach that takes the same swells as the city's northern beaches. In 1915 Duke Kahanamoku demonstrated Hawaiian board surfing at Freshwater, just north of here, and Australian surfing started on this stretch of coast.",
      "As with Bondi, the catalogue's coverage is the Live Traffic road network: Pittwater Road and the northern beaches approaches, the Spit and Seaforth on the harbour side. The wall is the northern beaches' road grid live — weather, light and traffic over the peninsula the beach sits on.",
    ],
    watchNotes: [
      "The nearest feeds are the peninsula's road junctions — Balgowlah, Seaforth, Dee Why — on the roads that serve the beach, not on the sand.",
      "The coast-named feeds in range are harbour crossings (the Spit side and the Harbour Bridge); no dedicated Manly Beach feed exists in the catalogue.",
    ],
  }),
  spot({
    slug: "new-smyrna-beach",
    family: "surf",
    name: "New Smyrna Beach",
    shortName: "New Smyrna Beach",
    place: "Volusia County, Florida, United States",
    countrySlug: "united-states",
    countryName: "United States",
    lat: 29.0258,
    lng: -80.9274,
    knownFor:
      "One of Florida's most consistent surf towns, built around the Ponce Inlet jetty breaks at its north end.",
    about: [
      "New Smyrna Beach sits at the south side of Ponce Inlet, where the jetty shapes the sandbars that made this town's surfing reputation — it is routinely named among the best surf towns in the United States. Flagler Avenue runs from the river to the sand through the middle of it.",
      "Florida's DOT cameras cover the corridors that feed the town: SR-44, the main road in from I-95, and US-1 along the river. That is this wall — the approach roads, live. They read the weather over the coast and the traffic on the beach run honestly; the inlet itself is beyond their frame.",
    ],
    watchNotes: [
      "The nearest feeds are US-1 at SR-44 and the I-95 mileposts west of town — the two routes every New Smyrna surf trip drives.",
      "No beach-named feed exists in this wall; it is a corridor wall for a surf town, labelled as one.",
    ],
    stateHub: { slug: "florida", label: "Florida traffic cameras" },
  }),
  spot({
    slug: "huntington-beach",
    family: "surf",
    name: "Huntington Beach",
    shortName: "Huntington Beach",
    place: "Orange County, California, United States",
    countrySlug: "united-states",
    countryName: "United States",
    lat: 33.6595,
    lng: -117.9988,
    knownFor:
      "Surf City USA — the pier, the US Open of Surfing, and miles of beach break either side of it.",
    about: [
      "Huntington Beach trademarked its nickname: Surf City USA. Eight and a half miles of west-facing beach break centre on the municipal pier, and every summer the US Open of Surfing turns the sand south of it into a stadium. The wall centres on the pier and takes in the city's grid up to the I-405.",
      "The catalogue's cameras are Caltrans freeway feeds — I-405 at Brookhurst, Ward and Warner, and the Beach Boulevard corridor, the street that runs from the freeway straight to the pier. Read the wall for the coast's sky, the wind in the palms along the boulevard, and the drive in.",
    ],
    watchNotes: [
      "Four feeds in the wall name the coast roads outright — the Harbor and Beach Boulevard cameras on the I-405, the surf run's own exits.",
      "The beach and pier themselves have no dedicated catalogue feed in range; the wall is the city's freeway grid, stated as such.",
    ],
    stateHub: { slug: "california", label: "California traffic cameras" },
  }),
  spot({
    slug: "la-jolla",
    family: "surf",
    name: "La Jolla",
    shortName: "La Jolla",
    place: "San Diego, California, United States",
    countrySlug: "united-states",
    countryName: "United States",
    lat: 32.8328,
    lng: -117.2713,
    knownFor:
      "Windansea's hut and reef, the Cove, and a coastline of cliffs and pocket beaches under Mt. Soledad.",
    about: [
      "La Jolla packs a coastline's worth of surfing into a few miles: Windansea, with its palm hut and heavy reef; the reefs of Bird Rock and Hospitals to the south; the Cove and the sea caves to the north. The village sits above it all on the shoulder of Mt. Soledad.",
      "The wall is the freeway grid above the coast — Caltrans cameras on SR-52 and I-5 at Genesee and Regents, the canyon roads that drop to the shore. They are weather-and-traffic cameras for the mesa; the coves themselves sit below their sightlines, and this page says so rather than dressing a freeway feed as a surf check.",
    ],
    watchNotes: [
      "The nearest feeds are the SR-52 canyon crossings at Regents Road and Genesee Avenue — the top of the drop into La Jolla.",
      "No coast-named feed exists in this wall; its honest use is the sky over the coast and the state of the drive.",
    ],
    cityPage: { slug: "san-diego", label: "San Diego city webcams" },
    stateHub: { slug: "california", label: "California traffic cameras" },
  }),
  spot({
    slug: "san-clemente",
    family: "surf",
    name: "San Clemente",
    shortName: "San Clemente",
    place: "Orange County, California, United States",
    countrySlug: "united-states",
    countryName: "United States",
    lat: 33.4274,
    lng: -117.612,
    knownFor:
      "The Spanish Village by the Sea — pier beach breaks in town, and Trestles just south at San Onofre.",
    about: [
      "San Clemente is the surf town at Orange County's south end: a pier with beach breaks either side, the trails down the bluffs at T-Street and Riviera, and — a short drive south — Lower Trestles, one of the most famous performance waves on earth. Interstate 5 runs the whole length of it, on the bluff directly above the beach.",
      "That geography is the wall: Caltrans cameras on I-5 through San Clemente and San Juan Capistrano, in places a few hundred metres from the water. Freeway feeds, honestly labelled — but of all the corridor walls in this family, this is the one whose cameras sit closest to the surf.",
    ],
    watchNotes: [
      "The nearest feeds are I-5 at Presidio Drive, El Camino Real and Avenida Palizada — the freeway exits for the pier and the beach neighbourhoods.",
      "No beach-named feed exists in the wall; the cameras' value is proximity — the same bluff, the same sky, the same wind you can see bending the palms along the freeway.",
    ],
    cityPage: { slug: "san-diego", label: "San Diego city webcams" },
    stateHub: { slug: "california", label: "California traffic cameras" },
  }),
  spot({
    slug: "ichinomiya",
    family: "surf",
    name: "Ichinomiya & the Chiba Coast",
    shortName: "Ichinomiya",
    place: "Chiba, Japan",
    countrySlug: "japan",
    countryName: "Japan",
    lat: 35.373,
    lng: 140.385,
    knownFor:
      "Tsurigasaki Beach — the surfing venue of the Tokyo 2020 Olympic Games.",
    about: [
      "When surfing made its Olympic debut at the Tokyo Games, it did so here: Tsurigasaki Beach in Ichinomiya, on Chiba's Pacific-facing Kujukuri coast, an hour and a half east of the capital. The coast is a long, open beach plain — river mouths, pine shelterbelts, and beach breaks running for kilometres.",
      "The wall is the coast plain's public camera network — rivergojp river and road feeds over the bridges at Ichinomiya and Isumi, and the Route 128 coast road. River cameras watch water for a living; on this coast that means the same sky and the same onshore wind the surf is getting, read from the plain behind the beach.",
    ],
    watchNotes: [
      "The nearest feeds are the river bridges — Nakanohashi at Ichinomiya, the Route 128 bridge — the low crossings of the coast plain a short way inland of Tsurigasaki.",
      "No beach-named feed exists in the wall (the network names its rivers and roads, in Japanese); the wall is the Olympic coast's countryside on camera, not a break feed.",
    ],
  }),
  spot({
    slug: "surfers-paradise",
    family: "surf",
    name: "Surfers Paradise & the Gold Coast",
    shortName: "Surfers Paradise",
    place: "Gold Coast, Queensland, Australia",
    countrySlug: "australia",
    countryName: "Australia",
    lat: -28.0023,
    lng: 153.4294,
    knownFor:
      "The Superbank at Snapper Rocks, down the coast — and the tower-lined beach strip that took its name from surfing itself.",
    about: [
      "No town is named more plainly: Surfers Paradise is the high-rise heart of the Gold Coast, the 70 km Queensland surf coast that runs from the Spit down to Coolangatta and the Superbank. The wall centres on Surfers Paradise and Broadbeach and reaches across the river suburbs behind the strip.",
      "Queensland's traffic cameras cover the Gold Coast's road grid — Bundall, Southport, Broadbeach Waters — the streets behind the beach rather than the sand. The wall reads the coast's weather and the strip's pulse; the breaks themselves are a drive south, and this page keeps that geography honest.",
    ],
    watchNotes: [
      "The nearest feeds are the Gold Coast's arterial junctions — Bundall Road, Ferry Road at Southport, the Broadbeach Waters crossings.",
      "No coast-named feed exists in the wall; it is the road grid of a surf coast city, labelled as such.",
    ],
  }),
  spot({
    slug: "santa-cruz",
    family: "surf",
    name: "Santa Cruz",
    shortName: "Santa Cruz",
    place: "California, United States",
    countrySlug: "united-states",
    countryName: "United States",
    lat: 36.9517,
    lng: -122.026,
    knownFor:
      "Steamer Lane, the world-class point off West Cliff — one of the places American surfing began.",
    about: [
      "Santa Cruz claims a founding place in mainland US surfing — Hawaiian princes rode redwood boards here in 1885 — and Steamer Lane, the cold, powerful point below the lighthouse on West Cliff Drive, is still its proving ground. The wall centres on the town and the Lane, with the coast highway running through it.",
      "The catalogue's feeds are Caltrans cameras on SR-1, the coast highway itself as it threads Santa Cruz — Ocean Street, Emeline, the Bay Avenue corridor on the west side, a short walk from the Lane. Add one nature camera in the redwoods above town, and the wall is the coast road a surf check drives, with the town's sky on it.",
    ],
    watchNotes: [
      "Two feeds in the wall name the coast highway's west-side corridor — SR-1 at Bay Avenue and Porter Street, the Steamer Lane side of town.",
      "The SR-1 cameras look along the highway, not down at the point; read them for weather, wind in the cypresses, and the drive — as with every wall here, the page names what the cameras are.",
    ],
    stateHub: { slug: "california", label: "California traffic cameras" },
  }),
];

export const BEACH_SPOTS: CoastalSpot[] = [
  spot({
    slug: "laguna-beach",
    family: "beach",
    name: "Laguna Beach",
    shortName: "Laguna Beach",
    place: "Orange County, California, United States",
    countrySlug: "united-states",
    countryName: "United States",
    lat: 33.5427,
    lng: -117.7854,
    knownFor:
      "A string of coves under the headlands, reached by the Pacific Coast Highway that runs through downtown.",
    about: [
      "Laguna Beach is the artists' colony of the Orange County coast — a downtown of galleries in a canyon mouth, and a shoreline that breaks into coves: Main Beach at the foot of Broadway, then Rockpile, Aliso and a dozen more under the headlands north and south.",
      "Uniquely in this family, the wall's nearest cameras are on the beach's own main street: Caltrans feeds on SR-1 — the Pacific Coast Highway — at Broadway and Ocean Avenue, in the middle of town a block from the sand, backed by the canyon and freeway network behind.",
    ],
    watchNotes: [
      "The nearest feeds are the PCH itself in downtown Laguna — Broadway, Ocean Avenue — the closest thing in this directory to a beach-town main street on camera.",
      "Three feeds name the coast outright, on SR-73 above Newport Coast, the next headland north.",
    ],
    stateHub: { slug: "california", label: "California traffic cameras" },
  }),
  spot({
    slug: "miami-beach",
    family: "beach",
    name: "Miami Beach",
    shortName: "Miami Beach",
    place: "Miami-Dade County, Florida, United States",
    countrySlug: "united-states",
    countryName: "United States",
    lat: 25.7907,
    lng: -80.13,
    knownFor:
      "The barrier island of South Beach and Ocean Drive, reached by causeways across Biscayne Bay.",
    about: [
      "Miami Beach is a barrier island city: seven miles of Atlantic beach behind the Art Deco strip of Ocean Drive, joined to the mainland by causeways over Biscayne Bay. The wall centres on the island's waist and takes in both causeways and the downtown shore across the water.",
      "Florida's DOT cameras stand on those causeways — I-395 and I-195 where they land at Alton Road. They are the classic Miami Beach view in road-camera form: the bay, the skyline, the island spread out ahead, and the weather coming off the Atlantic over all of it.",
    ],
    watchNotes: [
      "The nearest feeds are the two causeway landings at Alton Road — the drives onto the island, with the bay and skyline in frame.",
      "One feed names the port shore (US-1 at Port Boulevard, on the mainland side); the island's own streets are beyond the DOT network's frame.",
    ],
    stateHub: { slug: "florida", label: "Florida traffic cameras" },
  }),
  spot({
    slug: "newport-beach",
    family: "beach",
    name: "Newport Beach",
    shortName: "Newport Beach",
    place: "Orange County, California, United States",
    countrySlug: "united-states",
    countryName: "United States",
    lat: 33.6189,
    lng: -117.9298,
    knownFor:
      "The harbour, the peninsula and the Wedge — and the Newport Coast headlands above Crystal Cove.",
    about: [
      "Newport Beach is two places in one: the great recreational harbour inside the jetties, and the ocean shore outside them — the peninsula, Balboa, and at its end the Wedge, the shorebreak novelty that breaks off the jetty. Above it all, the Newport Coast headlands look down the shore toward Laguna.",
      "The wall is the road network that serves it — SR-55 down to the harbour streets, SR-73 over the Newport Coast, I-405 behind — plus weather cameras from the FAA network. Five feeds in the wall name the coast roads of the headlands themselves.",
    ],
    watchNotes: [
      "Five feeds in the wall name coast roads — the I-405 Harbor exits and the SR-73 Newport Coast crossings above Crystal Cove.",
      "The harbour and the Wedge have no dedicated catalogue feed; the wall is the town's road grid and its headland crossings.",
    ],
    stateHub: { slug: "california", label: "California traffic cameras" },
  }),
  spot({
    slug: "daytona-beach",
    family: "beach",
    name: "Daytona Beach",
    shortName: "Daytona Beach",
    place: "Volusia County, Florida, United States",
    countrySlug: "united-states",
    countryName: "United States",
    lat: 29.2108,
    lng: -81.0228,
    knownFor:
      "Twenty-three miles of wide, hard-packed beach — the shore that made Daytona famous for speed.",
    about: [
      "Daytona's beach is a road as much as a shore: a broad, hard-packed strand where land-speed records were set before the Speedway was built, and where cars still drive the sand in marked lanes. The wall centres on the beachside and the bridges from the mainland.",
      "The feeds are Volusia County's FDOT cameras — US-92 (International Speedway Boulevard, the great beach approach), the Clyde Morris corridor, the streets behind the strand. Corridor cameras for a car-famous beach: the drive in, the weather over the coast, live.",
    ],
    watchNotes: [
      "The nearest feeds are the US-92 corridor at Clyde Morris Boulevard — the main approach to the beachside.",
      "No beach-named feed exists in the wall; it is the road network of the beach city, stated plainly.",
    ],
    stateHub: { slug: "florida", label: "Florida traffic cameras" },
  }),
  spot({
    slug: "virginia-beach",
    family: "beach",
    name: "Virginia Beach",
    shortName: "Virginia Beach",
    place: "Virginia, United States",
    countrySlug: "united-states",
    countryName: "United States",
    lat: 36.8529,
    lng: -75.978,
    knownFor:
      "The long resort strand and boardwalk at the mouth of the Chesapeake Bay.",
    about: [
      "Virginia Beach is the resort city where the Chesapeake meets the Atlantic: miles of oceanfront strand and boardwalk, with the fishing pier and the Neptune statue on the promenade. The wall centres on the oceanfront and the Laskin Road corridor that serves it.",
      "The city's own camera network (published through Virginia's open feeds) covers the oceanfront approaches — Laskin Road at Birdneck, where the resort strip begins, and I-264 running in from Norfolk to its end at the beach. The wall is that approach grid, live.",
    ],
    watchNotes: [
      "The nearest feed is Laskin Road at North Birdneck — the gateway corner of the oceanfront strip itself.",
      "I-264's last mileposts are in the wall: the freeway that ends at the beach, and the traffic that tells the resort's rhythm.",
    ],
    stateHub: { slug: "virginia", label: "Virginia traffic cameras" },
  }),
  spot({
    slug: "galveston",
    family: "beach",
    name: "Galveston",
    shortName: "Galveston",
    place: "Texas, United States",
    countrySlug: "united-states",
    countryName: "United States",
    lat: 29.3013,
    lng: -94.7977,
    knownFor:
      "The historic island city on the Gulf — the Strand, the Seawall, and the ferry across to Bolivar.",
    about: [
      "Galveston is Texas's island city: the Victorian Strand, the ten-mile Seawall along the Gulf shore, and the ferry landing where the free ferry crosses to the Bolivar Peninsula every few minutes, dolphins in its wake. The wall centres on the harbour side and the downtown grid.",
      "Of all the walls in this family, Galveston's has the most genuinely waterfront camera in it: the TxDOT feed at the ferry landing on Harborside Drive, watching the boats load and the harbour water. Around it, the Harborside and causeway cameras cover the island's working edge.",
    ],
    watchNotes: [
      "A wall feed is named for the ferry itself — Galveston Ferry at Harborside — a working waterfront camera, not a road above the beach.",
      "The coast-named feed in the wall is the IH-45 Gulf Freeway at Tiki Island: the causeway onto the island, with the bay in frame.",
    ],
    stateHub: { slug: "texas", label: "Texas traffic cameras" },
  }),
  spot({
    slug: "myrtle-beach",
    family: "beach",
    name: "Myrtle Beach",
    shortName: "Myrtle Beach",
    place: "Horry County, South Carolina, United States",
    countrySlug: "united-states",
    countryName: "United States",
    lat: 33.6959,
    lng: -78.88,
    knownFor:
      "The Grand Strand — sixty miles of Carolina beach towns with Myrtle Beach at its centre.",
    about: [
      "Myrtle Beach anchors the Grand Strand, the long arc of beach towns down South Carolina's north coast — the boardwalk, the SkyWheel, the pavilion blocks along Ocean Boulevard. The wall centres on the town and its US-17 corridor, the Strand's main street.",
      "The wall mixes South Carolina's 511 feeds on US-17 with something rarer in this family: a public webcam named for the town itself. Between them they read the Strand's weather and its traffic — the two things a Myrtle Beach day turns on.",
    ],
    watchNotes: [
      "A feed in the wall is a public webcam named simply Myrtle Beach — a town camera, the wall's closest thing to a beach feed.",
      "The 511 feeds run US-17 at 10th and 29th Avenues — the corridor a block or two behind Ocean Boulevard.",
    ],
    stateHub: { slug: "south-carolina", label: "South Carolina traffic cameras" },
  }),
  spot({
    slug: "palma",
    family: "beach",
    name: "Palma & Mallorca's South Coast",
    shortName: "Palma",
    place: "Mallorca, Balearic Islands, Spain",
    countrySlug: "spain",
    countryName: "Spain",
    lat: 39.5696,
    lng: 2.6502,
    knownFor:
      "The great bay of Palma — cathedral over the harbour, and the Platja de Palma running east from the city.",
    about: [
      "Palma is Mallorca's capital and one of the Mediterranean's great harbour cities: the cathedral above the old port, the marina forest of masts, and the long beach of Platja de Palma curling east around the bay toward S'Arenal. The wall centres on the city and its bay shore.",
      "Spain's DGT publishes the island's motorway cameras — the Ma-19 toward the airport and the beaches, the Ma-20 ring, the Ma-1 west. They are approach-road cameras: the wall is Palma's road grid live, the honest extent of the catalogue on Mallorca, with the bay's weather written across it.",
    ],
    watchNotes: [
      "The nearest feeds are the Ma-19 and Ma-20 junctions — the roads between the city, the airport and the beach suburbs.",
      "No coast-named feed exists in the wall; Palma's harbour and beach have no public catalogue camera, and this page does not invent one.",
    ],
  }),
  spot({
    slug: "santa-monica",
    family: "beach",
    name: "Santa Monica",
    shortName: "Santa Monica",
    place: "Los Angeles County, California, United States",
    countrySlug: "united-states",
    countryName: "United States",
    lat: 34.0095,
    lng: -118.4912,
    knownFor:
      "The pier at the end of Route 66 — where Interstate 10 meets the Pacific.",
    about: [
      "Santa Monica is where America's most famous road dissolves into the ocean: I-10 runs west across Los Angeles and ends at the McClure Tunnel, a few hundred metres from the pier and the wide beach under the Palisades bluff. The wall centres on that meeting point.",
      "The catalogue's feeds are Caltrans cameras on I-10's last mile — the McClure Tunnel approaches, east and west — plus one public webcam in the mix. Freeway-end cameras, honestly labelled: they frame the drive that ends at this beach for half of Los Angeles, and the marine layer that so often sits on it.",
    ],
    watchNotes: [
      "The nearest feeds are I-10 at the McClure Tunnel — the freeway's coastal end, at the top of the bluff above the beach.",
      "One feed in the wall is a public webcam rather than a road camera; the rest are the I-10 corridor's final junctions.",
    ],
    cityPage: { slug: "los-angeles", label: "Los Angeles city webcams" },
    stateHub: { slug: "california", label: "California traffic cameras" },
  }),
  spot({
    slug: "key-west",
    family: "beach",
    name: "Key West",
    shortName: "Key West",
    place: "Florida Keys, Florida, United States",
    countrySlug: "united-states",
    countryName: "United States",
    lat: 24.5551,
    lng: -81.78,
    knownFor:
      "The last island of the Keys — mile marker 0 of the Overseas Highway, Duval Street, and the nightly sunset gathering at Mallory Square.",
    about: [
      "Key West is the end of the road: the final island of the Florida Keys, where US-1 — the Overseas Highway, strung over 42 bridges from the mainland — runs out at mile marker 0. Four miles long and two wide, the island packs its life into the Old Town grid at its western end: Duval Street running from the Gulf side to the Atlantic side, the harbour at the Bight, and Mallory Square, where the town gathers every evening to watch the sun drop into the Gulf.",
      "The catalogue's Key West cameras are Florida DOT's island network — 29 feeds standing over the roads that carry the island: North Roosevelt Boulevard along the north shore, the Truman Avenue corridor through town, and one at the corner of Duval Street itself. They are road cameras, and this page says so: they read the island's weather, its light and its traffic live. The famous private feeds — the Duval Street bar cams, the Southernmost Point camera — are not in the catalogue, and no road feed here is dressed up as one of them.",
    ],
    watchNotes: [
      "The nearest feeds stand on North Roosevelt Boulevard at First Street, 0.6 km from the wall's centre — the island's front door, where the Overseas Highway comes in.",
      "Six feeds name Truman Avenue and one stands at Duval and Truman — the Old Town grid itself. No beach-named feed exists in the catalogue for Key West; the wall is the island's road grid, labelled as one.",
    ],
    stateHub: { slug: "florida", label: "Florida traffic cameras" },
  }),
];

export const ALL_SPOTS: CoastalSpot[] = [...SURF_SPOTS, ...BEACH_SPOTS];

export function getSpot(family: "surf" | "beach", slug: string): CoastalSpot | null {
  return ALL_SPOTS.find((s) => s.family === family && s.slug === slug) ?? null;
}

/** Nearest other spots in the same family, by centre distance — the
 *  sibling links a spot page offers. */
export function siblingSpots(spot: CoastalSpot, limit = 3): CoastalSpot[] {
  const t = (x: number) => (x * Math.PI) / 180;
  const dist = (a: CoastalSpot, b: CoastalSpot) => {
    const h =
      Math.sin(t(b.lat - a.lat) / 2) ** 2 +
      Math.cos(t(a.lat)) * Math.cos(t(b.lat)) * Math.sin(t(b.lng - a.lng) / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
  };
  return ALL_SPOTS.filter((s) => s.family === spot.family && s.slug !== spot.slug)
    .map((s) => ({ s, d: dist(spot, s) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map((x) => x.s);
}

/** The public path of a spot page. */
export function spotPath(spot: CoastalSpot): string {
  return spot.family === "surf" ? `/surf-webcams/${spot.slug}` : `/beach-webcams/${spot.slug}`;
}

export const SURF_SPOT_SLUGS = SURF_SPOTS.map((s) => s.slug);
export const BEACH_SPOT_SLUGS = BEACH_SPOTS.map((s) => s.slug);
