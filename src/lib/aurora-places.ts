/**
 * OSIRIS — the per-place aurora registry (Menu #2 Wave A, Oct 2026).
 *
 * One row per place with its own page under /northern-lights-webcams —
 * the "northern lights forecast [place] tonight" set. A place
 * qualifies only when a radius wall around the named place holds at
 * least four catalogue cameras (the national-parks threshold) OR a
 * smaller wall that is genuinely the place's own network, stated at
 * its real size (Churchill: four directional feeds of one FAA site).
 * Each wall is an EXPLORE_SCOPES definition (src/lib/explore-data.ts);
 * Fairbanks and Reykjavík reuse the `event-le-*` scopes the aurora
 * and Leonids pages already serve.
 *
 * The famous absences are pinned in src/lib/aurora-places.test.ts:
 * Yellowknife has ZERO catalogue cameras within 40 km (the
 * /aurora-webcams FAQ already publishes that), and Whitehorse (2),
 * Kiruna (2) and Saariselkä (2) fall below the threshold. They get
 * no page; the hub says why.
 *
 * Forecast honesty: the site serves ONE live geomagnetic reading —
 * NOAA SWPC's planetary K index via /api/space-weather, rendered by
 * AuroraKpPanel — and these pages reuse exactly that, labelled as
 * the global index it is. No per-place Kp is derived or invented.
 * What IS place-specific and real: the place's cameras (computed
 * from its wall), tonight's darkness window (computed from the
 * repo's own sun math, src/lib/sunrise.ts, at the place's
 * coordinates), and the Kp band the place's latitude needs — stated
 * qualitatively, in the same bands the aurora hub's FAQ publishes.
 */

import {
  SUN_EVENT_ELEVATION_DEG,
  sunElevationDeg,
  sunEventIso,
  sunEventOffsetMinutes,
} from './sunrise';

export interface AuroraPlace {
  slug: string;
  /** Place name, e.g. "Fairbanks". */
  name: string;
  /** Country display, e.g. "United States". */
  country: string;
  /** Catalogue/country-page slug for the country link. */
  countrySlug: string;
  /** Region display for schema.org addressRegion, e.g. "Alaska". */
  region: string;
  /** EXPLORE_SCOPES key of this place's wall. */
  scopeKey: string;
  /** Wall centre — the place itself. */
  lat: number;
  lng: number;
  radiusKm: number;
  /** What the centre is, for the page's stated rule. */
  centreLabel: string;
  /** IANA timezone of the place. */
  tz: string;
  /** The Kp band this place's latitude needs — qualitative, hub bands. */
  kpNote: string;
  /** Named cameras verified inside the wall (audit, Oct 2026). */
  highlights: string[];
  /** Two intro paragraphs: what the wall is, honestly. */
  intro: [string, string];
  /** Best-viewing guidance for this place. */
  watch: string;
  faqs: Array<{ q: string; a: string }>;
}

export const AURORA_PLACES: AuroraPlace[] = [
  {
    slug: 'fairbanks',
    name: 'Fairbanks',
    country: 'United States',
    countrySlug: 'united-states',
    region: 'Alaska',
    scopeKey: 'event-le-fairbanks',
    lat: 64.8378,
    lng: -147.7164,
    radiusKm: 60,
    centreLabel: 'Fairbanks',
    tz: 'America/Anchorage',
    kpNote:
      "Fairbanks sits under the auroral oval's usual position: at Kp 2–3 its cameras can already show arcs on a dark, clear night, and Kp 4 makes a display likely. This is the benchmark North American wall — the one to check first.",
    highlights: [
      'Airport Way @ Eielson Street (Alaska 511)',
      'Lathrop Street @ 21st Avenue (Alaska 511)',
      'University Avenue @ Chena River Bridge (Alaska 511)',
    ],
    intro: [
      "Fairbanks is Alaska's interior aurora capital — a city that plans its winter tourism around the oval sitting overhead — and its wall is the state road network around it: every catalogue camera within 60 km, from the airport corridor to the Chena River bridge.",
      "The honest framing from the hub applies here too: these are road and weather cameras, not dedicated aurora feeds. But Fairbanks' feeds face dark Interior landscapes at 65°N, and on an active night the arc stands over the highway cameras as reliably as anywhere on Earth.",
    ],
    watch:
      "Fairbanks' season is long and cold: true darkness from late August to late April, with the deepest windows in mid-winter. The routine is the hub's — read the live Kp above, check tonight's darkness window, then open the darkest-facing feeds and give the sky a minute. When Europe is in daylight, this wall is in the middle of its night.",
    faqs: [
      {
        q: 'What Kp do I need for Fairbanks northern lights tonight?',
        a: "Less than almost anywhere: Fairbanks sits under the oval's usual position, so Kp 2–3 can already produce visible arcs on dark, clear nights, and Kp 4 makes a display likely. The live index is at the top of this page — the same NOAA reading the globe's status bar shows.",
      },
      {
        q: 'When is Fairbanks\u2019 aurora season?',
        a: "Roughly late August to late April, when Interior Alaska's nights are long and truly dark. Mid-winter offers the longest windows; the equinox months statistically bring the strongest geomagnetic activity.",
      },
    ],
  },
  {
    slug: 'anchorage',
    name: 'Anchorage',
    country: 'United States',
    countrySlug: 'united-states',
    region: 'Alaska',
    scopeKey: 'aurora-anchorage',
    lat: 61.2181,
    lng: -149.9003,
    radiusKm: 50,
    centreLabel: 'Anchorage',
    tz: 'America/Anchorage',
    kpNote:
      "Anchorage sits south of the oval's usual reach: it typically needs Kp 4 or more — an active night at the G1 threshold — before displays clear its northern horizon. At Kp 5–6, Anchorage's darker-edge cameras can have a genuine show.",
    highlights: [
      'Anchorage — FAA WeatherCams 1–4',
      'Minnesota & Northern Lights (Alaska 511)',
      'Benson & Minnesota (Alaska 511)',
    ],
    intro: [
      "Anchorage is Alaska's big-city aurora compromise: 74 catalogue cameras within 50 km — the state's FAA weather cameras and city road network — under a sky that needs more help from the Sun than Fairbanks' does.",
      "The wall's honesty is in its geography: at 61°N, Anchorage watches the oval rather than living under it. Quiet nights show a dark northern horizon and city weather; storm nights push the display over the Chugach foothills, and one intersection camera is even named for the street it shares with the phenomenon — Minnesota & Northern Lights.",
    ],
    watch:
      "Work the wall's dark edges: the FAA and highway feeds facing away from downtown's glow are the useful ones. Check the live Kp first — below 4, Anchorage is usually a weather watch; at 5 and above, give the northern-facing cameras real time.",
    faqs: [
      {
        q: 'Can you see the northern lights from Anchorage?',
        a: "Yes — on active nights. Anchorage needs roughly Kp 4+ for displays to clear its northern horizon, and Kp 5–6 (storm level) for a strong show. Fairbanks, 360 km north, needs far less; this page exists because Anchorage is where most Alaska searches actually start.",
      },
      {
        q: 'Which Anchorage cameras are best for aurora?',
        a: "The ones facing dark ground: the FAA weather cameras and the highway feeds at the city's edges, away from downtown light. The explorer labels every camera with its source and position — start with the northern and elevated feeds.",
      },
    ],
  },
  {
    slug: 'duluth',
    name: 'Duluth',
    country: 'United States',
    countrySlug: 'united-states',
    region: 'Minnesota',
    scopeKey: 'aurora-duluth',
    lat: 46.7867,
    lng: -92.1005,
    radiusKm: 50,
    centreLabel: 'Duluth',
    tz: 'America/Chicago',
    kpNote:
      "Duluth is a storm-level sky: at 47°N it usually needs Kp 5–6 (a G1–G2 geomagnetic storm) before the oval reaches Lake Superior. Those nights are uncommon — and they are the nights this page exists for.",
    highlights: [
      'I-35 SB @ Lake Ave, Duluth',
      'I-535 EB — Blatnik Bridge approach',
      'T.H.2 WB — Bong Bridge, Superior',
    ],
    intro: [
      "Duluth watches the aurora the way the northern US does: over a huge dark lake, on the nights the oval makes its rare excursions south. Its wall is the Minnesota–Wisconsin bridge-and-highway network within 50 km — the Blatnik and Bong bridge approaches and the I-35 corridor above the harbour.",
      "Most nights this is a Lake Superior weather wall, and the page doesn't pretend otherwise. But the cameras face the right water: when a G1-or-stronger storm pushes the display over the lake, the northern horizon from these feeds is the darkest in the Midwest.",
    ],
    watch:
      "Duluth is an alerts game, not a nightly routine: watch for Kp 5+ forecasts, then check the lake-facing cameras after full dark. The lake horizon is the stage — a display that would drown in a city's glow stands clear over Superior.",
    faqs: [
      {
        q: 'What Kp is needed to see northern lights in Duluth?',
        a: "Typically Kp 5–6 — G1 to G2 storm level. At those levels the oval can reach northern Minnesota, and Duluth's lake-facing cameras have a clear, dark northern horizon to catch it with. Weaker nights rarely show more than a glow.",
      },
      {
        q: 'When was the last big Duluth aurora?',
        a: "Displays over Lake Superior follow the big storm nights that make national news — the same G3+ events that push aurora into the northern states generally. This page's job is to have the cameras ready and labelled before the next one, with the live Kp at the top so the check takes seconds.",
      },
    ],
  },
  {
    slug: 'marquette',
    name: 'Marquette',
    country: 'United States',
    countrySlug: 'united-states',
    region: 'Michigan',
    scopeKey: 'aurora-marquette',
    lat: 46.5436,
    lng: -87.3954,
    radiusKm: 50,
    centreLabel: 'Marquette',
    tz: 'America/Detroit',
    kpNote:
      "Marquette needs the same storm-level sky as Duluth — Kp 5–6 — but brings darker ground to the trade: the Upper Peninsula's sparse road network means very little light pollution between the cameras and the lake.",
    highlights: [
      'US-41 @ Negaunee (MDOT MiDrive)',
      'M-28 @ MDOT Roadside Park (MDOT MiDrive)',
      'M-94 @ Marquette/Alger County Line (MDOT MiDrive)',
    ],
    intro: [
      "Marquette's wall is the thinnest of the US set — six MDOT highway cameras within 50 km, the nearest 10 km out of town — and it is stated at that size. What it lacks in count it returns in darkness: this is the Upper Peninsula, where the road network runs through forest to a Great Lake shore.",
      "Like Duluth, Marquette is a storm-night page. The cameras' ordinary subject is UP weather — lake-effect snow above all — and their aurora value arrives on the same G1+ nights, over the same dark northern water.",
    ],
    watch:
      "On a forecast storm night, start here after Duluth: the UP's skies are darker and its horizon emptier. In winter, the same feeds double as the region's snow truth — lake effect can bury a camera's view in an hour, which is itself worth watching.",
    faqs: [
      {
        q: 'Can you see the northern lights in Marquette, Michigan?',
        a: "On storm nights, yes — the Upper Peninsula is one of the mainland US's recognised aurora-watching regions, needing roughly Kp 5–6. Its advantage is darkness: very little artificial light competes with the display.",
      },
      {
        q: 'Why only six cameras?',
        a: "Because that is the catalogue's real coverage of Marquette County's highways — a sparse network in a sparse county. The page prints six rather than widening the radius into a different region's grid and calling it Marquette.",
      },
    ],
  },
  {
    slug: 'churchill',
    name: 'Churchill',
    country: 'Canada',
    countrySlug: 'canada',
    region: 'Manitoba',
    scopeKey: 'aurora-churchill',
    lat: 58.7684,
    lng: -94.165,
    radiusKm: 50,
    centreLabel: 'Churchill',
    tz: 'America/Winnipeg',
    kpNote:
      "Churchill is the latitude illusion this set exists to correct: at 59°N geographic it looks southern, but its geomagnetic latitude puts it under the auroral oval — Kp 2–3 can already produce overhead displays on dark, clear nights.",
    highlights: ['Churchill — FAA WeatherCams 1–4 (four directional views)'],
    intro: [
      "Churchill, Manitoba is one of the world's famous aurora towns — and its entire catalogue presence is one FAA weather-camera site with four directional views, 5.6 km from the town centre. Four feeds, one installation, stated plainly: this is the smallest wall in the set, and the place earns it anyway.",
      "The four directions matter here. An aurora display is a whole-sky event, and a four-way weather station reads it the way a person standing in the tundra would — north for the arc's home, overhead and south when the storm pushes the oval over the bay.",
    ],
    watch:
      "Churchill's season peaks in the deep-winter months when Hudson Bay is frozen and the nights are longest. The town's other famous season — polar bears in autumn — shares the same cameras' ground; the aurora watch is the winter shift.",
    faqs: [
      {
        q: 'Why is Churchill so good for northern lights at only 59°N?',
        a: "Because the aurora follows geomagnetic latitude, not geographic. Churchill sits nearly under the magnetic pole's ring — the auroral oval passes overhead on most active nights, which is why Kp 2–3 can already produce displays there.",
      },
      {
        q: 'Are four cameras enough to be useful?',
        a: "For this place, yes — they are four simultaneous directions over genuinely dark tundra sky, refreshed as a weather station. The page states the wall's real size rather than inflating it with Winnipeg's grid, 1,000 km south, which would be a different sky entirely.",
      },
    ],
  },
  {
    slug: 'reykjavik',
    name: 'Reykjavík',
    country: 'Iceland',
    countrySlug: 'iceland',
    region: 'Capital Region',
    scopeKey: 'event-le-reykjavik',
    lat: 64.1466,
    lng: -21.9426,
    radiusKm: 30,
    centreLabel: 'Reykjavík',
    tz: 'Atlantic/Reykjavik',
    kpNote:
      "Reykjavík sits at the oval's southern edge: Kp 3 can bring arcs to its darker harbour and edge-of-town cameras, and Kp 4–5 puts displays over the city itself. Iceland's north (Akureyri's wall) needs less.",
    highlights: [
      'Kringlumýrarbraut corridor (Vegagerðin)',
      'Bústaðabrú (Vegagerðin)',
    ],
    intro: [
      "Reykjavík's wall is the biggest in Iceland's set — the capital region's road network within 30 km — and the most light-compromised, which the page states up front: these are city feeds, and city light washes out modest displays.",
      "Its role in the circuit is the gateway role. Reykjavík is where Iceland aurora searches start; its cameras answer the first question (is anything happening over the capital tonight?) and its harbour-facing and edge feeds catch the strong displays that shrug off town light. For the island's dark skies, the Akureyri wall is one link north.",
    ],
    watch:
      "Start with the feeds facing the harbour and the town's dark edges rather than the lit arterials. On Kp 4+ nights, check across an hour — displays pulse, and a frame that shows nothing at 23:00 can be standing over the bay by midnight.",
    faqs: [
      {
        q: 'Can you see the northern lights from Reykjavík itself?',
        a: "Yes, on active nights — Kp 4–5 puts displays over the city, and Kp 3 can show arcs from its darker edges. Tour buses leave the city for darkness because weaker displays drown in street light, not because the aurora skips the capital.",
      },
      {
        q: 'Where in Iceland needs the least Kp?',
        a: "The north and east coasts, under the oval's usual position — the Akureyri wall in this set. Reykjavík trades a higher Kp threshold for the country's densest camera coverage.",
      },
    ],
  },
  {
    slug: 'akureyri',
    name: 'Akureyri',
    country: 'Iceland',
    countrySlug: 'iceland',
    region: 'North Iceland',
    scopeKey: 'aurora-akureyri',
    lat: 65.6835,
    lng: -18.0878,
    radiusKm: 30,
    centreLabel: 'Akureyri',
    tz: 'Atlantic/Reykjavik',
    kpNote:
      "Akureyri sits under the oval on most active nights: Kp 2–3 on a dark, clear night can already produce arcs over the fjord — a full band more generous than Reykjavík's threshold.",
    highlights: [
      'Vaðlaheiðargöng tunnel approaches (Vegagerðin)',
      'Lónsbakki (Vegagerðin)',
      'Víkurskarð (Vegagerðin)',
    ],
    intro: [
      "Akureyri is Iceland's northern capital, set at the head of Eyjafjörður — and its wall is the fjord's road network: the tunnel approaches, the coastal road, and the passes east and west, 18 cameras within 30 km.",
      "North Iceland's skies are the island's darkest populated skies, and its weather often splits from the south's: a clouded-out Reykjavík says nothing about Akureyri. In the circuit's logic, this is Iceland's serious wall — the one to open when the Kp is modest and the capital shows nothing.",
    ],
    watch:
      "The fjord feeds facing open water and the pass cameras are the darkest frames. Winter gives Akureyri long nights and frequent clear, cold air under high pressure — the combination the oval loves. Check the timestamp: a genuinely black frame with stars is a working camera; a grey one is cloud, not calm.",
    faqs: [
      {
        q: 'Akureyri or Reykjavík for northern lights tonight?',
        a: "If the Kp is 2–3, Akureyri — it sits under the oval and needs less activity. At Kp 4+, both walls can show displays, and the deciding factor becomes cloud, which is local: check both.",
      },
      {
        q: 'What are these cameras for, normally?',
        a: "Roads — Iceland's Vegagerðin network watching the tunnel, the fjord road and the passes. Aurora duty is their night shift: cameras placed for weather and road state happen to face some of Europe's darkest inhabited skies.",
      },
    ],
  },
  {
    slug: 'tromso',
    name: 'Tromsø',
    country: 'Norway',
    countrySlug: 'norway',
    region: 'Troms',
    scopeKey: 'aurora-tromso',
    lat: 69.6492,
    lng: 18.956,
    radiusKm: 40,
    centreLabel: 'Tromsø',
    tz: 'Europe/Oslo',
    kpNote:
      "Tromsø lives under the oval: Kp 2–3 on a dark, clear night can already produce arcs, and Kp 4 makes a display likely. This is some of the most reliable aurora ground in Europe.",
    highlights: [
      'Panorama of Tromsø (SkylineWebcams)',
      'Giæverbukta (E8) (Vegvesen)',
      'Breivika (E8) (Vegvesen)',
    ],
    intro: [
      "Tromsø is the aurora city — a university town at 69.7°N that has built a winter culture around the oval overhead. Its wall is a dozen cameras within 40 km: the panorama feed over the island city, and the E8 corridor cameras on the mainland approaches.",
      "The panorama camera is the wall's anchor — a genuine scenic feed over the harbour and the strait, the frame most likely to be showing a display as a picture rather than a road report. The Vegvesen cameras add the weather truth around it: cloud on the approaches is cloud over the city soon after.",
    ],
    watch:
      "Tromsø's polar night runs from late November to mid-January — no sunrise at all — and its aurora season is the directory's longest working window. Coastal weather is the spoiler: the fjords breed cloud, so work the wall across the evening and favour the feeds showing stars.",
    faqs: [
      {
        q: 'What Kp do I need in Tromsø tonight?',
        a: "Little: Kp 2–3 can already light Tromsø's cameras on clear, dark nights, because the oval's usual position is nearly overhead. The live index is at the top of this page; below Kp 2, even Tromsø mostly waits.",
      },
      {
        q: 'When is Tromsø dark enough for aurora?',
        a: "From September to April the nights serve; in the polar-night weeks around the solstice it is dark enough by mid-afternoon. Summer's midnight sun closes the season entirely — no Kp overcomes daylight.",
      },
    ],
  },
  {
    slug: 'alta',
    name: 'Alta',
    country: 'Norway',
    countrySlug: 'norway',
    region: 'Finnmark',
    scopeKey: 'aurora-alta',
    lat: 69.9689,
    lng: 23.2717,
    radiusKm: 40,
    centreLabel: 'Alta',
    tz: 'Europe/Oslo',
    kpNote:
      "Alta sits under the oval like Tromsø — Kp 2–3 can already produce arcs — with a drier inland-fjord climate that historically gives it more clear nights than the outer coast.",
    highlights: [
      'Øvre Alta Bru (F7990) (Vegvesen)',
      'Alta Vest (E6), Kåfjord (Vegvesen)',
      'Storvikeidet (E6), Talvik (Vegvesen)',
    ],
    intro: [
      "Alta calls itself the city of the northern lights — the world's first permanent aurora observatory was built on its mountain in 1899 — and its wall is the Altafjord road network: nine cameras within 40 km, from the Alta river bridges to the E6 along the fjord.",
      "The cameras are road feeds, as everywhere in this set. Alta's claim on a page is position and climate: at 70°N under the oval, in a fjord pocket drier than the coast, its ordinary road cameras stand in some of Europe's best aurora weather.",
    ],
    watch:
      "Alta's darkness window is Tromsø's — polar night around the solstice — with a local edge: when the coast is clouded, Alta's inland fjord often is not. On a modest-Kp night with coastal cloud, this is the Norwegian wall to try second.",
    faqs: [
      {
        q: 'Why does Alta claim the northern lights so strongly?',
        a: "History and geometry: the first permanent aurora observatory stood here (1899), and the oval's usual position passes nearly overhead. Its fjord climate adds clear nights the outer coast doesn't get — the combination is the claim.",
      },
      {
        q: 'What Kp does Alta need tonight?',
        a: "Kp 2–3 can already produce arcs on dark, clear nights. Check the live index above, then tonight's darkness window — in the polar-night weeks, 'tonight' starts in the afternoon.",
      },
    ],
  },
  {
    slug: 'lofoten',
    name: 'Lofoten',
    country: 'Norway',
    countrySlug: 'norway',
    region: 'Nordland',
    scopeKey: 'aurora-lofoten',
    lat: 68.2343,
    lng: 14.5682,
    radiusKm: 40,
    centreLabel: 'Svolvær, Lofoten',
    tz: 'Europe/Oslo',
    kpNote:
      "Lofoten sits at the oval's southern reach: Kp 3 gives its cameras a real chance on dark, clear nights, and Kp 4–5 is display weather over the peaks and the sea.",
    highlights: [
      'Svolvær ferjekai (F81) (Vegvesen)',
      'Gimsøystraumen bru (E10) (Vegvesen)',
      'Raftsundet (E10) (Vegvesen)',
    ],
    intro: [
      "Lofoten's wall is six cameras within 40 km of Svolvær — ferry quays and E10 bridges strung along the archipelago — facing the scenery that makes this the aurora photographer's Norway: sea, steep peaks, and fishing villages under the oval's southern edge.",
      "Six is the real count and the page prints it. The feeds are sparse because Lofoten is sparse; what they frame is not. A display over Raftsundet or the Svolvær harbour is the postcard with the lights actually on.",
    ],
    watch:
      "Work the wall westward as the evening deepens — the E10 cameras step along the islands, and cloud over one fjord is not cloud over the next. The ferry-quay feeds face open water: the darkest horizons in the set.",
    faqs: [
      {
        q: 'What Kp do the Lofoten cameras need?',
        a: "Kp 3 gives a real chance; Kp 4–5 is the reliable band. Lofoten sits slightly south of Tromsø's near-overhead position, so it asks one band more — and repays it with the scenery.",
      },
      {
        q: 'Which Lofoten camera faces the best sky?',
        a: "The water-facing ones: Svolvær's ferry quay and the bridge cameras, whose horizons are sea rather than street light. On a clear, active night, start there.",
      },
    ],
  },
  {
    slug: 'rovaniemi',
    name: 'Rovaniemi',
    country: 'Finland',
    countrySlug: 'finland',
    region: 'Lapland',
    scopeKey: 'aurora-rovaniemi',
    lat: 66.5039,
    lng: 25.7294,
    radiusKm: 40,
    centreLabel: 'Rovaniemi',
    tz: 'Europe/Helsinki',
    kpNote:
      "Rovaniemi sits on the Arctic Circle, under the oval's southern half: Kp 3 can light its lake and fell cameras on dark, clear nights, and Kp 4 makes a display likely.",
    highlights: [
      'City of Rovaniemi (Public Webcam)',
      'vt4 Rovaniemi — Revontuli (Fintraffic)',
      'vt4 Rovaniemi — Napapiiri, the Arctic Circle (Fintraffic)',
    ],
    intro: [
      "Rovaniemi is Lapland's capital and the Arctic Circle's crossing town — its wall is eight cameras within 40 km, including the Fintraffic road cameras at Napapiiri, the Circle line itself, where the Santa Claus Village traffic passes.",
      "The Finnish road network is the aurora watcher's friend across this whole set: maintained in all weather, pointed at dark lake-and-fell country, and honest about cloud. Rovaniemi's feeds mix one city view with highway cameras that leave the town glow behind within kilometres.",
    ],
    watch:
      "Favour the highway cameras over the city feed — a few kilometres out of town the sky is a different instrument. Rovaniemi's season runs September to April; its famous December is as much about the Circle as the sky, and the cameras show both crowds and clear nights.",
    faqs: [
      {
        q: 'What does \u201cRevontuli\u201d mean on the camera names?',
        a: "'Revontuli' is Finnish for the northern lights — literally 'fox fires', from the old tale of a fox sweeping snow into sparks. One of Rovaniemi's road cameras carries the word in its name, which tells you what this town's roads are famous for after dark.",
      },
      {
        q: 'What Kp does Rovaniemi need tonight?',
        a: "Kp 3 can produce arcs on dark, clear nights at the Circle; Kp 4 makes a display likely. The live index and tonight's darkness window are both on this page — read them together.",
      },
    ],
  },
  {
    slug: 'levi',
    name: 'Levi & Kittilä',
    country: 'Finland',
    countrySlug: 'finland',
    region: 'Lapland',
    scopeKey: 'aurora-levi',
    lat: 67.8,
    lng: 24.8,
    radiusKm: 40,
    centreLabel: 'Levi fell, Kittilä',
    tz: 'Europe/Helsinki',
    kpNote:
      "Levi sits deep in the oval's usual band: Kp 2–3 can already produce arcs over the fells on dark, clear nights — among the most generous thresholds in this set.",
    highlights: [
      'Levi Ski Resort (Public Webcam)',
      'kt79 Kittilä — airport road (Fintraffic)',
      'yt9401 Ylläs maisematie (Fintraffic)',
    ],
    intro: [
      "Levi is Finnish Lapland's big fell resort, and its wall is five cameras within 40 km of the fell: the resort's own feed, the Kittilä airport road, and the Ylläs scenic road — ski country infrastructure standing in dark, oval-band Lapland.",
      "A ski resort camera is an accidental aurora instrument of the first rank: aimed at an open fell slope, above the village light, in a region where the season's whole economy runs after dark. The road cameras around it extend the watch across the fells.",
    ],
    watch:
      "The resort feed is the opener; the Ylläs road is the connoisseur's frame — a fell landscape with almost no foreground light. Levi's winter is deep and dark from November; the lights compete only with the slope floodlights, which sleep when the lifts do.",
    faqs: [
      {
        q: 'Can I watch aurora from a ski resort camera?',
        a: "At Levi, genuinely yes: the resort feed faces the open fell at 68°N, inside the oval's usual band, where Kp 2–3 can already produce arcs. Ski infrastructure aims cameras at exactly the open, elevated, dark-facing views aurora watching wants.",
      },
      {
        q: 'Levi or Rovaniemi tonight?',
        a: "Levi, at equal cloud: it sits a band further north and needs less Kp. Rovaniemi's wall is bigger and its town feeds are useful weather truth — check Levi for the display, Rovaniemi for the regional picture.",
      },
    ],
  },
  {
    slug: 'abisko',
    name: 'Abisko corridor',
    country: 'Sweden',
    countrySlug: 'sweden',
    region: 'Norrbotten',
    scopeKey: 'aurora-abisko',
    lat: 68.35,
    lng: 18.82,
    radiusKm: 30,
    centreLabel: 'Abisko, Swedish Lapland',
    tz: 'Europe/Stockholm',
    kpNote:
      "The Abisko corridor is one of the oval's most reliable seats: Kp 2–3 on a clear night is often enough. Its limiting factor is rarely activity — it is cloud, and the corridor's mountain gap is known for clearer skies than the coast.",
    highlights: [
      'Björkliden (Trafikverket)',
      'Live Björkliden Hotel Fjället (CamStreamer)',
      'Riksgränsen (Trafikverket)',
      'Tornehamn (Trafikverket)',
    ],
    intro: [
      "The page is labelled a corridor because the catalogue demands it: there is no camera in Abisko village itself. What exists is better than nothing and honestly framed — five cameras within 30 km along the E10 and the iron-ore line: Björkliden (8.5 km away), Tornehamn, Vassijaure and Riksgränsen on the Norwegian border.",
      "This is Sweden's aurora heartland — the national park, the sky station's mountain, the famous gap in the coastal range that lets clear continental air sit over the lake. The corridor cameras share that sky. Björkliden's hotel feed is the wall's scenic anchor; the road cameras carry its weather.",
    ],
    watch:
      "Start with Björkliden's feeds — the closest to Abisko's own sky. The corridor's trick is patience with cloud: the gap clears when the coast doesn't, so a grey first check is worth a second one an hour later.",
    faqs: [
      {
        q: 'Why is there no camera in Abisko itself?',
        a: "Because the catalogue holds none — the village's famous sky station feed is not in the directory. Rather than stretch a distant city's cameras into an 'Abisko' label, the page covers the corridor the village sits in and says so in its name.",
      },
      {
        q: 'What makes Abisko\u2019s sky special?',
        a: "Position and shelter: it sits under the oval in a rain-shadow gap in the mountain range, beside a large lake that steadies the local air. More clear nights than the coast, under a near-overhead oval — the combination built its reputation.",
      },
    ],
  },
];

const BY_SLUG = new Map(AURORA_PLACES.map((p) => [p.slug, p]));

export function auroraPlaceBySlug(slug: string): AuroraPlace | null {
  return BY_SLUG.get(slug) ?? null;
}

/* ------------------------------------------------------------------ */
/* Tonight's darkness window (the repo's sun math, at the place)       */
/* ------------------------------------------------------------------ */

function localDateKey(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export interface PlaceTonight {
  /** Sunset on today's local date, or null (polar day / no crossing). */
  sunset: Date | null;
  /** Sunrise on tomorrow's local date, or null (polar night runs on). */
  sunrise: Date | null;
  sunsetText: string | null;
  sunriseText: string | null;
  /** Hours of darkness between them, e.g. "11 h 20 min", when both exist. */
  darkLengthText: string | null;
  /**
   * 'night' when the sun never crosses the horizon threshold today
   * (polar night — dark around the clock), 'day' when it never dips
   * below it (midnight sun — no darkness to watch in), else null.
   */
  polar: 'night' | 'day' | null;
}

/**
 * Tonight's darkness at a place: today's sunset and tomorrow's
 * sunrise, computed with the same sun-event primitives
 * (src/lib/sunrise.ts) and probing pattern parkSunTimes uses —
 * astronomy, not a forecast. Nulls are honest: in the polar-night
 * weeks there is no sunrise to print, and in summer no sunset, and
 * the page says which.
 */
export function placeTonight(
  lat: number,
  lng: number,
  tz: string,
  now: Date = new Date(),
): PlaceTonight {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
  });
  const collect = (mode: 'sunrise' | 'sunset', dayOffset: number): Date | null => {
    const target = localDateKey(new Date(now.getTime() + dayOffset * 86400_000), tz);
    const found: number[] = [];
    for (const h of [-18, -6, 6, 18, 30]) {
      const base = new Date(now.getTime() + h * 3600_000);
      const off = sunEventOffsetMinutes(lat, lng, base, mode);
      if (off === null) continue;
      const instant = new Date(sunEventIso(base, off));
      if (localDateKey(instant, tz) === target) found.push(instant.getTime());
    }
    if (found.length === 0) return null;
    return new Date(Math.min(...found));
  };
  const sunset = collect('sunset', 0);
  const sunrise = collect('sunrise', 1);
  let darkLengthText: string | null = null;
  if (sunset && sunrise && sunrise > sunset) {
    const mins = Math.round((sunrise.getTime() - sunset.getTime()) / 60000);
    darkLengthText = `${Math.floor(mins / 60)} h ${String(mins % 60).padStart(2, '0')} min`;
  }
  // Polar discrimination: sample the sun's elevation hourly across
  // the day. All below the horizon threshold = polar night; all
  // above it = midnight sun. Either way there is no sunset/sunrise
  // pair to print, and the page says which regime it is in.
  let polar: 'night' | 'day' | null = null;
  if (!sunset && !sunrise) {
    let allBelow = true;
    let allAbove = true;
    for (let h = 0; h < 24; h += 1) {
      const e = sunElevationDeg(lat, lng, new Date(now.getTime() + h * 3600_000));
      if (e >= SUN_EVENT_ELEVATION_DEG) allBelow = false;
      if (e < SUN_EVENT_ELEVATION_DEG) allAbove = false;
    }
    if (allBelow) polar = 'night';
    else if (allAbove) polar = 'day';
  }
  return {
    sunset,
    sunrise,
    sunsetText: sunset ? fmt.format(sunset) : null,
    sunriseText: sunrise ? fmt.format(sunrise) : null,
    darkLengthText,
    polar,
  };
}
