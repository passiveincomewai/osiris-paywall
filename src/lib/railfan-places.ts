/**
 * Railfan place walls — the registry behind /train-webcams and
 * /train-webcams/[place] (keyword wave B, Oct 2026).
 *
 * Each place is a stated geographic rule, the same discipline as the
 * surf walls (lib/surf-spots) and the airport walls
 * (lib/airport-pages): every catalogue camera within 15 km of the
 * place's rail anchor point over its country chunk, nearest first —
 * registered as scope `rail-<slug>` in lib/explore-data. Pages compute
 * their counts from that scope (countForDef / recordsForDef) and count
 * the wall's rail-named feeds with the 'rail' theme
 * (lib/explore-scopes matchesRailName), never from figures typed
 * here; the yields pinned in lib/railfan-page-scopes.test.ts were
 * recomputed from the raw chunks (catalogue generated 2026-10-20).
 *
 * Selection: measured, not famous. Every candidate rail place was
 * tested at this family's rule, and a wall exists only where the
 * catalogue holds a genuine cluster: at least 15 cameras within
 * 15 km AND at least two that name a railway — or at least one
 * dedicated rail anchor (a station cam, a Shinkansen cam, a railyard
 * cam). The famous names that failed are named on the hub as gaps:
 * Tehachapi measures 4 cameras in range, Rochelle 0, Folkston 3,
 * North Platte 4. There is no wall for them because there is nothing
 * honest to build one from.
 *
 * Honesty rules for this family:
 *  - WorldEye shows cameras. It does not track trains: no live train
 *    positions, no schedules, no arrival boards, no Amtrak status —
 *    and no copy here may promise them. The framing is "the rail
 *    place on camera": the station, the yard, the bridge and the
 *    town around them, live.
 *  - A wall is the place on camera, not a dedicated train feed:
 *    where a camera names the railway the copy says so and counts
 *    them; where the wall is the town's river, road and municipal
 *    networks, the copy says that instead. Japan dominates this
 *    family for a stated reason: its river-camera networks name
 *    their railway bridges, and its cities publish station cams.
 *  - `about` / `knownFor` are standing geographic and historical
 *    facts about the place — never claims about today's trains.
 */

export interface RailPlace {
  slug: string;
  /** Display name, e.g. "Tokyo Station & the City Stations". */
  name: string;
  /** Short name for cards and breadcrumbs, e.g. "Tokyo". */
  shortName: string;
  /** Place line, e.g. "Tokyo, Japan". */
  place: string;
  /** Country chunk slug (src/data/countries/<slug>.json). */
  countrySlug: string;
  countryName: string;
  /** The rail anchor point the 15 km rule is measured from — the
   *  station, the yard or the bridge cluster the page is about. */
  lat: number;
  lng: number;
  radiusKm: number;
  /** EXPLORE_SCOPES key: rail-<slug>. */
  scopeKey: string;
  /** The rail fact the place is known for, in one line. */
  knownFor: string;
  /** Two short paragraphs of standing rail/geographic context. */
  about: string[];
  /** What the wall's cameras actually are — from the verified
   *  record mix, stated factually. */
  watchNotes: string[];
  /** Verified city directory page (src/data/city-pages.json). */
  cityPage?: { slug: string; label: string };
  /** US state camera directory (/us-traffic-cameras/<state>). */
  stateHub?: { slug: string; label: string };
}

const RADIUS_KM = 15;

function place(
  def: Omit<RailPlace, "radiusKm" | "scopeKey"> & { radiusKm?: number },
): RailPlace {
  return {
    ...def,
    radiusKm: def.radiusKm ?? RADIUS_KM,
    scopeKey: `rail-${def.slug}`,
  };
}

export const RAIL_PLACES: RailPlace[] = [
  place({
    slug: "tokyo",
    name: "Tokyo Station & the City Stations",
    shortName: "Tokyo",
    place: "Tokyo, Japan",
    countrySlug: "japan",
    countryName: "Japan",
    lat: 35.6812,
    lng: 139.7671,
    knownFor:
      "Tokyo Station's red-brick Marunouchi building — the hub of the Shinkansen network and the busiest rail crossroads in Japan.",
    about: [
      "Every rail line in Japan eventually answers to this building. Tokyo Station opened in 1914; its restored Marunouchi brick front faces the Imperial Palace grounds, and behind it the Tōhoku, Jōetsu, Hokuriku and Tōkaidō Shinkansen leave for the whole country while the Yamanote loop and a dozen other lines thread the city. The wall centres on the station and takes in central Tokyo at railfan radius — Shinjuku, the world's busiest station, sits inside its western edge.",
      "Tokyo's catalogue cover is its public networks: the MLIT river cameras on the Sumida and Arakawa, the rivergojp feeds, and a set of SkylineWebcams station views. That mix is the wall — a great rail city read through the cameras it actually publishes.",
    ],
    watchNotes: [
      "Five feeds in the wall name a station outright — cams named for Tokyo Station's Marunouchi side, for Shinjuku Station and for Minowa Station among them (their listed positions come from the catalogue, so read the names as the guide, not the metre).",
      "The rest of the wall is the city the lines run through: river crossings on the Sumida and Arakawa, and the street network of the central wards.",
    ],
    // No verified /city-webcams page for Tokyo exists; the Japan hub link covers it.
  }),
  place({
    slug: "osaka",
    name: "Osaka — Shin-Osaka & the Tōkaidō Shinkansen",
    shortName: "Osaka",
    place: "Osaka, Japan",
    countrySlug: "japan",
    countryName: "Japan",
    lat: 34.7335,
    lng: 135.5003,
    knownFor:
      "Shin-Osaka — where the Tōkaidō Shinkansen from Tokyo becomes the San'yō Shinkansen west, the hinge of the whole bullet-train network.",
    about: [
      "Shin-Osaka was built for the 1964 Shinkansen on the north bank of the Yodo River, a short subway ride from the old city centre. Every Tōkaidō bullet train ends here and continues west as the San'yō — which makes this station, not the downtown terminal, the true rail hinge of western Japan. The wall centres on it and runs south across the Yodo into Umeda.",
      "The wall's bulk is the Yodo river system: Osaka's river-camera network is the densest in the catalogue, and the Yodo is the river the railways cross — the Hankyu Kyoto Line bridge is one of the wall's named feeds.",
    ],
    watchNotes: [
      "Four feeds name the railway: two named for Shin-Osaka Station itself (a station view and the station taxi waiting area), one named for the Tōkaidō Shinkansen, and the Yodo River crossing of the Hankyu Kyoto Line.",
      "The rest is river country — over a hundred rivergojp feeds on the Yodo and its channels, the flood-plain network that happens to watch the same crossings the trains use.",
    ],
    cityPage: { slug: "osaka", label: "Osaka city webcams" },
  }),
  place({
    slug: "nagoya",
    name: "Nagoya Station & the Shōnai River Bridges",
    shortName: "Nagoya",
    place: "Aichi, Japan",
    countrySlug: "japan",
    countryName: "Japan",
    lat: 35.1709,
    lng: 136.8815,
    knownFor:
      "The Tōkaidō Shinkansen's great central crossing — where the bullet trains and three private railways bridge the Shōnai River at Kiyosu.",
    about: [
      "Nagoya is the Tōkaidō corridor's middle kingdom: the Shinkansen stops here between Tokyo and Osaka, the JR Tōkaidō and Chūō lines divide, and Meitetsu and Kintetsu run their own networks out of their own terminals. West of the station the lines fan out across the Shōnai River at Kiyosu — and the river's cameras name every one of those crossings.",
      "That is why this small wall is the most rail-named in the family: the river network watches water, and on this river the water passes under a procession of railway bridges.",
    ],
    watchNotes: [
      "Seven feeds name a railway — the highest count in any Japanese wall here: a live station-area feed at Nagoya Station itself, two Shinkansen river crossings, the Meitetsu line downstream at Kiyosu, and the JR Kansai and Chūō line bridges.",
      "The rest of the wall is the Shōnai river plain — rivergojp gauges and road cameras across Kiyosu and western Nagoya.",
    ],
  }),
  place({
    slug: "hiroshima",
    name: "Hiroshima Station",
    shortName: "Hiroshima",
    place: "Hiroshima, Japan",
    countrySlug: "japan",
    countryName: "Japan",
    lat: 34.3976,
    lng: 132.4756,
    knownFor:
      "The San'yō Shinkansen's western gateway — Hiroshima Station, where the bullet trains meet the Hiroden trams that thread the delta city.",
    about: [
      "Hiroshima is built on a river delta, and its station stands on the delta's north arm: the San'yō Shinkansen and the San'yō Main Line arrive here from the east, and Hiroden's trams — the largest tram network in Japan — fan out across the six channels below. The wall centres on the station and covers the delta city around it.",
      "Hiroshima's catalogue is its river network: the Ōta River system cameras watch the delta's bridges and banks, which in this city means watching the same water the railways cross on their way in and out.",
    ],
    watchNotes: [
      "One feed in the wall is a dedicated station cam, named for Hiroshima's train station itself; the wall exists because that anchor is real, and this page says plainly that it is the only rail-named feed in range.",
      "The remaining feeds are the delta's river and street cameras — the city's weather, water and traffic, live, around its station.",
    ],
    cityPage: { slug: "hiroshima-city", label: "Hiroshima city webcams" },
  }),
  place({
    slug: "sapporo",
    name: "Sapporo Station",
    shortName: "Sapporo",
    place: "Hokkaido, Japan",
    countrySlug: "japan",
    countryName: "Japan",
    lat: 43.0686,
    lng: 141.3508,
    knownFor:
      "JR Hokkaido's hub — Sapporo Station, where every line on the northern island begins, under the JR Tower.",
    about: [
      "Hokkaido's railway is a star and Sapporo is its centre: the Hakodate Main Line runs south to the Honshu tunnel, the Sasshō and Chitose lines reach the airport and the east, and the station's JR Tower is the island's landmark. In winter this is also where Japan's great snow-country railway operation begins — the wall centres on the station in the middle of the grid city.",
      "Sapporo's catalogue is the Toyohira River network and the openwebcamdb city set — including one feed from inside the station itself.",
    ],
    watchNotes: [
      "The wall's anchor is a feed named for the station concourse — Sapporo JR Station Concourse, a camera in the station, listed a few hundred metres from the centre point.",
      "Only that one feed names the railway; the rest is the river and city network of the snow country's capital, stated as such.",
    ],
    cityPage: { slug: "sapporo", label: "Sapporo city webcams" },
  }),
  place({
    slug: "ichikawa",
    name: "Ichikawa — the Sōbu Line at the Edo River",
    shortName: "Ichikawa",
    place: "Chiba, Japan",
    countrySlug: "japan",
    countryName: "Japan",
    lat: 35.7321,
    lng: 139.9086,
    knownFor:
      "Ichikawa Station on JR's Sōbu Line — the last Chiba stop before the lines cross the Edo River into Tokyo.",
    about: [
      "Ichikawa is the Sōbu Line's border town: from its platforms the rapid and local trains cross the Edo River and run the last stretch into Tokyo, with the Toei Shinjuku line's terminus at Motoyawata a walk away. The wall centres on the station and — at 15 km in a metro this dense — its edge reaches Tokyo Station itself, which is inside the wall and named in it.",
      "The wall's fabric is the Edo and old Edo river system: the rivergojp network watches the channels that divide Chiba from the capital, and the railways cross every one of them.",
    ],
    watchNotes: [
      "Five feeds name a station — the wall's own Ichikawa Train Station cam, a station cam out at Misato, and, at the wall's western edge, the Tokyo Station and Minowa feeds it shares with the Tokyo wall.",
      "An honest metro overlap: this wall and Tokyo's are neighbours, not duplicates — each centres on its own station, and the shared feeds sit at the seam between them.",
    ],
  }),
  place({
    slug: "tsu",
    name: "Tsu & the Nakamura River Crossings",
    shortName: "Tsu",
    place: "Mie, Japan",
    countrySlug: "japan",
    countryName: "Japan",
    lat: 34.639,
    lng: 136.476,
    knownFor:
      "Three railway bridges within a kilometre — JR's Kansai Main Line and the Kintetsu Nagoya Line crossing the Nakamura River south of Tsu.",
    about: [
      "South of Tsu the Ise Bay plain narrows, and two railways that have raced each other down from Nagoya — JR's Kansai Main Line and the Kintetsu Nagoya Line — cross the Nakamura River almost side by side. The river's cameras watch the crossings for flood duty; what they frame is a working piece of Japan's great private-vs-national railway rivalry, live.",
      "The wall centres on the bridge cluster, not the city hall: Tsu's centre is at its northern edge, and the wall is the river plain between Tsu and Matsusaka.",
    ],
    watchNotes: [
      "Three feeds name their bridges — the Kintetsu Nakamura River Bridge, the JR Nakamura River Bridge and the Kintetsu Nagoya Line Bridge, the nearest a few hundred metres from the centre point.",
      "Every other feed in the wall is a river camera of the same plain — this is a river network that happens to frame three railway bridges, and the page presents it exactly that way.",
    ],
  }),
  place({
    slug: "ise",
    name: "Ise & the Miyagawa Bridges",
    shortName: "Ise",
    place: "Mie, Japan",
    countrySlug: "japan",
    countryName: "Japan",
    lat: 34.502,
    lng: 136.684,
    knownFor:
      "The pilgrim railways of Ise — JR's Sangū Line and the Kintetsu lines crossing the Miyagawa on the approach to the Grand Shrine.",
    about: [
      "For thirteen centuries travellers have come to Ise for the Grand Shrine, and for the last century most have come by train: JR's Sangū Line ends at Iseshi, the Kintetsu lines end at Ujiyamada, and both cross the Miyagawa — the shrine's sacred river — on bridges the river cameras watch. The wall centres on those crossings, between the two termini.",
      "Like its neighbour Tsu, this is a river-network wall: the Miyagawa and Seta rivers' cameras, on the plain where the pilgrim lines converge.",
    ],
    watchNotes: [
      "Four feeds name a railway bridge — the JR and Kintetsu crossings of the Miyagawa, and the JR Seta River Bridge pair toward the shrine side.",
      "The rest of the wall is the river plain's public cameras — water, weather and the approach roads to the shrines.",
    ],
  }),
  place({
    slug: "anjo",
    name: "Anjō & the Tōkaidō Corridor",
    shortName: "Anjō",
    place: "Aichi, Japan",
    countrySlug: "japan",
    countryName: "Japan",
    lat: 34.9197,
    lng: 137.1079,
    knownFor:
      "The Tōkaidō at full stretch — the Shinkansen and the JR Tōkaidō Main Line crossing the river plain between Anjō and Okazaki.",
    about: [
      "Between Nagoya and Toyohashi the Tōkaidō runs straight and fast across the Mikawa plain: the Shinkansen on its viaduct, the JR Tōkaidō Main Line beside it, the Meitetsu lines threading the towns. Anjō sits on that corridor, and the river cameras of the Yahagi plain name both crossings — one feed is named for the Shinkansen itself, at this wall's centre point.",
      "The wall is the family's smallest in Japan, and it is here on the corridor's strength: two named rail crossings and the plain they cross, nothing padded.",
    ],
    watchNotes: [
      "Two feeds name the railway — the Tōkaidō Shinkansen feed at the centre, and the JR Tōkaidō Main Line feed toward Okazaki.",
      "The remaining feeds are the Yahagi river plain's cameras — the corridor's weather and water, live.",
    ],
  }),
  place({
    slug: "busan",
    name: "Busan Station",
    shortName: "Busan",
    place: "Busan, South Korea",
    countrySlug: "south-korea",
    countryName: "South Korea",
    lat: 35.1151,
    lng: 129.0414,
    knownFor:
      "The KTX terminus at the end of the Gyeongbu Line — Busan Station, where Korea's first great railway meets the harbour.",
    about: [
      "The Gyeongbu Line from Seoul ends here, on the harbour's edge: Busan Station is the southern terminus of Korea's spine railway, the KTX's final stop, facing the port across the plaza. Below and around it, Busan Metro's lines climb into the hills — and the city publishes one of the densest municipal camera networks in the catalogue, every feed of it inside this wall.",
      "The wall is that municipal network whole: 283 feeds from a single source, the city's own cameras, with the station and the metro's station areas named among them.",
    ],
    watchNotes: [
      "Seven feeds name the railway — the station's own feeds (including one named for Busan Station's railway pier), four metro station-area cameras (Daeti, Sasang, Minam, Jungdong), and the Daejeo vehicle depot, the metro's depot, at the wall's edge.",
      "The rest is Busan on camera: the harbour districts, the hillside roads, the beach approaches — the city the railway serves.",
    ],
    cityPage: { slug: "busan", label: "Busan city webcams" },
  }),
  place({
    slug: "incheon",
    name: "Incheon — the Station Junctions",
    shortName: "Incheon",
    place: "Incheon, South Korea",
    countrySlug: "south-korea",
    countryName: "South Korea",
    lat: 37.4767,
    lng: 126.6326,
    knownFor:
      "The end of Korea's first railway — the Gyeongin Line of 1899, whose stations still anchor Incheon's street grid.",
    about: [
      "Korea's railway age began on this corridor: the Gyeongin Line opened in 1899 between Incheon and Seoul, and its stations — Incheon, Dongincheon, Jemulpo, Juan, Bucheon — became the nodes the city grew around. Incheon's municipal cameras are named for their junctions, and junction after junction is named for a station: this wall is that pattern, measured.",
      "The wall centres on Incheon Station, the line's terminus by the old port, and takes in the corridor east toward Bucheon and the Songdo new town south.",
    ],
    watchNotes: [
      "Ten feeds name a station — Dongincheon's own camera a few hundred metres from the centre, then Juan, Dongsu, Bucheon and the Songdo metro stations as the wall runs east and south.",
      "These are the city's junction cameras named for the stations they serve — street-level feeds at station squares, not platform cams, and the page labels them that way.",
    ],
    cityPage: { slug: "incheon", label: "Incheon city webcams" },
  }),
  place({
    slug: "yuen-long",
    name: "Yuen Long & the Light Rail",
    shortName: "Yuen Long",
    place: "New Territories, Hong Kong",
    countrySlug: "hong-kong",
    countryName: "Hong Kong",
    lat: 22.4456,
    lng: 114.0349,
    knownFor:
      "Hong Kong's Light Rail — the tram-like trains that run down the middle of Castle Peak Road through Yuen Long and Tuen Mun.",
    about: [
      "The New Territories northwest has a railway like no other in this directory: the Light Rail, whose trains run at street level through Yuen Long and Tuen Mun, sharing the road corridor the Transport Department's cameras watch. Above it, the Tuen Ma line's elevated stations — Kam Sheung Road, Yuen Long, Siu Hong — are named in feed after feed of the highway network.",
      "The result is the fullest wall in the family by far: Hong Kong publishes its road cameras at a density no other network here matches, and this corridor is where those cameras and the railways share the same streets.",
    ],
    watchNotes: [
      "Thirty-seven feeds name the railway — road cameras named for the Light Rail stops they pass (Ping Shan, Fung Tei, Siu Hong) and for the MTR stations on the Tuen Ma line (Kam Sheung Road above all).",
      "The honest framing: these are road cameras along a rail corridor — the Light Rail runs in the same street several of them watch, and the elevated line crosses the highways the rest patrol. None is a platform camera, and the page does not call them that.",
    ],
  }),
  place({
    slug: "ershui",
    name: "Ershui & the Zhuoshui River Bridges",
    shortName: "Ershui",
    place: "Changhua, Taiwan",
    countrySlug: "taiwan",
    countryName: "Taiwan",
    lat: 23.8133,
    lng: 120.6178,
    knownFor:
      "The junction for the Jiji Line — Ershui, where Taiwan's Western Line crosses the Zhuoshui River floodplain.",
    about: [
      "Ershui is a small town with an outsized railway: the TRA Western Line crosses Taiwan's widest river, the Zhuoshui, on the floodplain below it, and the Jiji Line — the branch built for the Sun Moon Lake power works, now the island's beloved country railway — leaves the main line at Ershui station. The river's cameras watch the crossings, as they watch every bridge on this flood-prone river.",
      "The High-Speed Rail crosses the same river some 16 km west at Xiluo — outside this wall's rule, and named here so nobody goes looking for it in the grid: the wall is the conventional line's crossings, and the HSR bridge belongs to the worldwide rail wall on the hub.",
    ],
    watchNotes: [
      "Two feeds name a railway bridge — the Zhuoshui crossings toward Changhua and at Linnei, the Western Line's bridges over the floodplain.",
      "The rest of the wall is the floodplain's public network — river, levee and highway cameras of Taiwan's widest river, in the season they matter most.",
    ],
  }),
  place({
    slug: "lincoln",
    name: "Lincoln, Nebraska — BNSF Country",
    shortName: "Lincoln",
    place: "Nebraska, United States",
    countrySlug: "united-states",
    countryName: "United States",
    lat: 40.8136,
    lng: -96.7026,
    knownFor:
      "BNSF's Lincoln hub — the downtown rail corridor and the great yard west of the city, on the road to the Powder River coal fields.",
    about: [
      "Lincoln is a railroad town in the plain American way: BNSF's lines cross downtown at grade, the yard spreads west of the city, and coal trains from Wyoming's Powder River Basin roll through toward the Midwest's power plants. It is also — the measurement is the measurement — the one place in the United States where this catalogue holds dedicated rail cameras inside a real cluster.",
      "Two of the wall's feeds are those cameras, published by a local streaming source: one on the downtown corridor, one on the railyard itself. Around them, Lincoln's street and research cameras make the family's smallest wall — stated plainly, at 18 feeds.",
    ],
    watchNotes: [
      "Two feeds are dedicated rail cameras: BNSF Downtown Lincoln, about a kilometre from the centre point, and Lincoln BNSF Railyard, about four kilometres west — the yard camera is the reason this page exists.",
      "The other sixteen feeds are Lincoln's street and campus-area cameras — the city around the corridor, not more rail cameras, and not described as such.",
    ],
    stateHub: { slug: "nebraska", label: "Nebraska traffic cameras" },
  }),
];

export const RAIL_PLACE_SLUGS = RAIL_PLACES.map((p) => p.slug);

export function getRailPlace(slug: string): RailPlace | null {
  return RAIL_PLACES.find((p) => p.slug === slug) ?? null;
}

/** Nearest other rail places, by centre distance — the sibling links
 *  a place page offers (surf's siblingSpots, same maths). */
export function siblingPlaces(place: RailPlace, limit = 3): RailPlace[] {
  const t = (x: number) => (x * Math.PI) / 180;
  const dist = (a: RailPlace, b: RailPlace) => {
    const h =
      Math.sin(t(b.lat - a.lat) / 2) ** 2 +
      Math.cos(t(a.lat)) * Math.cos(t(b.lat)) * Math.sin(t(b.lng - a.lng) / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
  };
  return RAIL_PLACES.filter((p) => p.slug !== place.slug)
    .map((p) => ({ p, d: dist(place, p) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map((x) => x.p);
}

/** The public path of a place page. */
export function railPlacePath(place: RailPlace): string {
  return `/train-webcams/${place.slug}`;
}
