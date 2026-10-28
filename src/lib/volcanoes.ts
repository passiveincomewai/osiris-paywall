/**
 * OSIRIS — the per-volcano webcam registry (Menu #2 Wave A, Oct 2026).
 *
 * One row per volcano with its own page under /volcano-webcams. A
 * volcano qualifies only when a radius wall around its summit — the
 * same EXPLORE_SCOPES definitions the /volcano-webcams hub sections
 * serve (src/lib/explore-data.ts, keys `event-vo-*`) — holds at least
 * one catalogue camera AND the wall is anchored to the volcano: a
 * dedicated volcano camera, observatory-style monitoring cameras, or
 * the named settlement/road network the hub already describes as that
 * volcano's watch. Walls that are just a nearby city's grid under a
 * volcano's name do not qualify.
 *
 * The famous absences are pinned in src/lib/volcanoes.test.ts, not
 * hidden: Stromboli and Popocatépetl have ZERO catalogue cameras
 * (the hub page already says so of Stromboli), Hekla's only in-range
 * records are one road junction 38.8 km away, and Mauna Loa's radius
 * would just re-centre Kīlauea's island network. Those volcanoes get
 * no page.
 *
 * Facts discipline: this registry carries only what the repo itself
 * holds — the scope definitions (name, country, summit coordinates),
 * the catalogue's own camera names, the observatory the site's hub
 * copy already names as each volcano's status source, and, for
 * Kīlauea, the eruption facts the site already publishes (its hub
 * page and blog). There is no volcano-facts dataset in the repo — no
 * elevation table, no eruption history — so the pages print none
 * rather than invent any. Eruption status always belongs to the
 * responsible observatory; each page links or names it and says so.
 *
 * Every count a page quotes is computed from the wall's
 * EXPLORE_SCOPES definition over the same catalogue chunks the
 * explorer serves; volcanoes.test.ts reconciles each wall's yield
 * against the raw chunks with its own haversine.
 */

export interface Volcano {
  slug: string;
  /** Full name, e.g. "Mount Etna". */
  name: string;
  /** Short name for titles and cards, e.g. "Etna". */
  short: string;
  /** Country display, e.g. "Italy". */
  country: string;
  /** Catalogue/country-page slug, e.g. "italy" (/cameras/countries/italy). */
  countrySlug: string;
  /** Region display for schema.org addressRegion, e.g. "Sicily". */
  region: string;
  /** EXPLORE_SCOPES key of this volcano's wall. */
  scopeKey: string;
  /** Wall centre — the summit point the stated radius is measured from. */
  lat: number;
  lng: number;
  radiusKm: number;
  /** What the centre is, for the page's stated rule. */
  centreLabel: string;
  /** IANA timezone of the volcano. */
  tz: string;
  /** The observatory whose status is canonical for this volcano. */
  observatory: { name: string; url?: string };
  /**
   * Dated status context ONLY where the site already publishes it
   * (today: Kīlauea, from the hub page and blog). Rendered with its
   * as-of date and a pointer to the observatory; never a live claim.
   */
  statusNote?: string;
  /** Named cameras verified inside the wall (audit, Oct 2026). */
  highlights: string[];
  /** Two intro paragraphs: what the wall is, honestly. */
  intro: [string, string];
  /** Best-time-to-watch note. */
  watch: string;
  faqs: Array<{ q: string; a: string }>;
}

export const VOLCANOES: Volcano[] = [
  {
    slug: 'kilauea',
    name: 'Kīlauea',
    short: 'Kīlauea',
    country: 'United States',
    countrySlug: 'united-states',
    region: 'Hawaii',
    scopeKey: 'event-vo-kilauea',
    lat: 19.4069,
    lng: -155.2834,
    radiusKm: 50,
    centreLabel: "Kīlauea's summit",
    tz: 'Pacific/Honolulu',
    observatory: {
      name: 'USGS Hawaiian Volcano Observatory',
      url: 'https://www.usgs.gov/volcanoes/kilauea',
    },
    statusNote:
      "The summit eruption inside Halemaʻumaʻu crater has run in lava-fountaining episodes since December 23, 2024. Episode 55 ended on October 17, 2026 (fountains to about 720 feet), and the USGS Hawaiian Volcano Observatory's daily update of October 27, 2026 forecasts the Episode 56 window at November 1–7 — a window that has already slipped a day once, because the summit's recharge paused before resuming. Treat it as an expectation, not a schedule, and confirm the day's status with the observatory.",
    highlights: [
      'Holei Pali — Cameras 1–4 (FAA WeatherCams)',
      'Pāhala — Cameras 1–4 (FAA WeatherCams)',
      'NEON Puʻu Makaʻala research tower phenocam',
    ],
    intro: [
      "Kīlauea is the most-watched volcano on Earth in 2026, and this page is its island-wide view: every catalogue camera within 50 km of the summit — the rim-road, coastal and research-tower network around Hawaiʻi Volcanoes National Park, including the Holei Pali and Pāhala camera groups on the volcano's own flanks.",
      "One boundary is stated plainly, because the hub page states it too: the canonical crater view during a fountaining episode is the USGS observatory's own summit webcams, which are the observatory's to run. This wall is the island around the crater — the roads that close, the coast the lava approaches, the viewpoints that fill — plus the context the map adds: the earthquake layer carrying the summit seismicity that leads each episode.",
    ],
    watch:
      "Fountaining episodes are at their most legible after dark, when the glow registers on every exposed camera facing the caldera — and the hours around an episode's start are when the regional cameras earn their keep: roads, viewpoints and sky all change before any headline does. Between episodes, watch the flank cameras for weather: the summit sits in cloud often, and a clear dawn over Halemaʻumaʻu is worth setting an alarm for.",
    faqs: [
      {
        q: 'Can I watch Kīlauea erupt live on this page?',
        a: "You can watch the island around the eruption live: the wall below holds the public cameras within 50 km of the summit. For the crater itself during a fountaining episode, the USGS Hawaiian Volcano Observatory's summit webcams are the canonical feed — this page links the observatory, and its daily update is the status source that outranks any single camera frame.",
      },
      {
        q: 'When is the next Kīlauea episode?',
        a: "The eruption proceeds in episodes separated by recharge pauses, and the observatory forecasts each window from summit tilt and seismicity. Its October 27, 2026 update puts Episode 56 at November 1–7 — a forecast that has already moved once. The observatory's daily update is the only schedule worth trusting.",
      },
    ],
  },
  {
    slug: 'reykjanes',
    name: 'Reykjanes Peninsula',
    short: 'Reykjanes',
    country: 'Iceland',
    countrySlug: 'iceland',
    region: 'Southwest Iceland',
    scopeKey: 'event-vo-reykjanes',
    lat: 63.8424,
    lng: -22.4338,
    radiusKm: 30,
    centreLabel: 'Grindavík, beside the Sundhnúkur crater row',
    tz: 'Atlantic/Reykjavik',
    observatory: { name: 'Icelandic Meteorological Office' },
    highlights: [
      'Festarfjall — three road views (Vegagerðin)',
      'Gíghæð — three road views (Vegagerðin)',
    ],
    intro: [
      "The Reykjanes Peninsula is where Iceland's newest volcanic chapter is being written: the Sundhnúkur fissure eruptions outside Grindavík redrew this ground, and the road network that serves the town, the airport road and the evacuated coast is the watch. This wall gathers every catalogue camera within 30 km of Grindavík.",
      "In Iceland the road cam and the volcano cam are often the same camera, and Reykjanes is the proof: these are working road feeds — the peninsula's weather, its closures, its empty streets — that happen to face a live volcanic system. When a fissure opens, this is the network that shows the world's reaction first.",
    ],
    watch:
      "Eruption or not, Reykjanes weather is the drama most days: Atlantic storms cross this low peninsula unimpeded, and the cameras show them arriving. During unrest, check across hours rather than minutes — fissure episodes build over days of seismicity, and the road cameras register the closures and the glow after dark before they register anything else.",
    faqs: [
      {
        q: 'Is Reykjanes erupting right now?',
        a: "Eruption status on the peninsula belongs to the Icelandic Meteorological Office, whose updates are the canonical source — check them before drawing conclusions from any frame. The cameras in this wall show the ground the status is about: the roads, the coast and the town living beside the Sundhnúkur system.",
      },
      {
        q: 'Are these dedicated eruption cameras?',
        a: "No — they are Iceland's road-agency cameras (Vegagerðin) within 30 km of Grindavík, and the page labels them that way. Their value is exactly that: a working network that never looks away, covering the approaches, the coast and the weather of an active volcanic peninsula.",
      },
    ],
  },
  {
    slug: 'katla',
    name: 'Katla',
    short: 'Katla',
    country: 'Iceland',
    countrySlug: 'iceland',
    region: 'Southern Iceland',
    scopeKey: 'event-vo-katla',
    lat: 63.4044,
    lng: -19.0459,
    radiusKm: 40,
    centreLabel: "Katla's ice-hidden caldera under Mýrdalsjökull",
    tz: 'Atlantic/Reykjavik',
    observatory: { name: 'Icelandic Meteorological Office' },
    highlights: [
      'Reynisfjall — three road views (Vegagerðin)',
      'Pétursey — three road views (Vegagerðin)',
    ],
    intro: [
      "Katla hides under Mýrdalsjökull, the ice cap south of the highlands — one of Iceland's most closely watched volcanoes precisely because so much of it cannot be seen. What can be seen is the country beneath it: this wall holds the south-coast road cameras within 40 km of the caldera, around Vík and Reynisfjall.",
      "Here the road cam is the volcano watch. The Ring Road beneath the ice cap is the corridor a Katla flood would cross, and its cameras report the south coast's weather, light and traffic every day of the year — the baseline against which any abnormal day would stand out.",
    ],
    watch:
      "The south coast is a dawn-and-weather watch: first light on Reynisfjara's sea stacks, storms rolling off the Atlantic, and in winter the long blue dark that makes these among the directory's better aurora-side feeds. For Katla itself, the observatory's seismic and status pages are the instrument; these cameras are the landscape it would act on.",
    faqs: [
      {
        q: 'Can I see Katla itself on these cameras?',
        a: "Katla's caldera lies under the Mýrdalsjökull ice cap, so there is no crater view to show — the cameras face the coast and the Ring Road beneath the ice. They show the volcano's country and its weather; the volcano's status is read from the Icelandic Meteorological Office's monitoring, not from a webcam frame.",
      },
      {
        q: 'Why watch road cameras for a hidden volcano?',
        a: "Because the road is what an eruption would interrupt. The cameras under Mýrdalsjökull carry the south coast's ordinary days — its floods, storms and closures — which is the context any Katla event would arrive in. A directory that only showed craters would miss the part of a volcano that people actually live beside.",
      },
    ],
  },
  {
    slug: 'etna',
    name: 'Mount Etna',
    short: 'Etna',
    country: 'Italy',
    countrySlug: 'italy',
    region: 'Sicily',
    scopeKey: 'event-vo-etna',
    lat: 37.751,
    lng: 14.9934,
    radiusKm: 30,
    centreLabel: "Mount Etna's summit craters",
    tz: 'Europe/Rome',
    observatory: { name: "Italy's INGV (Istituto Nazionale di Geofisica e Vulcanologia)" },
    highlights: ['Mount Etna - Volcano (SkylineWebcams)'],
    intro: [
      "Etna's page is the smallest in this set and needs no dressing up: the catalogue holds exactly one camera within 30 km of the summit — and it is the right one, a dedicated volcano camera on Etna itself. One feed, stated plainly, worth more than a wall of street corners.",
      "Etna is one of the world's most active volcanoes, monitored continuously by Italy's INGV, whose status bulletins are the canonical source for its frequent summit activity. This page keeps the directory's one true Etna feed beside that authority: the camera for watching, the observatory for knowing.",
    ],
    watch:
      "Etna's summit activity reads best at dawn and after dark, when gas and incandescence register against a dark sky and the plume's direction tells you which flank is living under ash that day. In daylight, watch the plume and the snow line; in darkness, watch for the glow that means the craters are talking.",
    faqs: [
      {
        q: 'Is there really only one Etna camera?',
        a: "In this catalogue, yes — one camera within 30 km of the summit, and it is a dedicated volcano feed aimed at Etna itself. Rather than pad the wall with Catania street scenes and call them volcano cams, the page states the real count. If more Etna feeds are published openly, they will join this wall automatically.",
      },
      {
        q: 'Is Etna erupting at the moment?',
        a: "Etna's summit craters are active so often that the only honest answer is a dated one: INGV's Etna bulletins carry the current state. The camera on this page shows you the mountain now; the observatory tells you what its activity means.",
      },
    ],
  },
  {
    slug: 'vesuvius',
    name: 'Vesuvius',
    short: 'Vesuvius',
    country: 'Italy',
    countrySlug: 'italy',
    region: 'Campania',
    scopeKey: 'event-vo-vesuvius',
    lat: 40.8217,
    lng: 14.4267,
    radiusKm: 25,
    centreLabel: "Vesuvius' crater",
    tz: 'Europe/Rome',
    observatory: { name: "Italy's INGV (Istituto Nazionale di Geofisica e Vulcanologia)" },
    highlights: [
      'Naples - Mount Vesuvius (SkylineWebcams)',
      'A16 Pomigliano motorway cameras (Autostrade per l\u2019Italia)',
    ],
    intro: [
      "Vesuvius is watched the way Naples has always watched it: as the skyline. This wall holds every catalogue camera within 25 km of the crater — the bay city's dense network of scenic, street and motorway feeds, with the volcano standing in frame as it has for two thousand years.",
      "These are landscape cameras, not crater feeds, and the page says so. Their subject is the relationship between a city of a million people and the mountain in its postcard — the cone over the bay at dawn, the plume-less quiet sky, the weather arriving across the water. INGV monitors the volcano itself; these cameras monitor its presence.",
    ],
    watch:
      "Sunrise is the Vesuvius hour: the cone clears first, the bay light comes up under it, and the dedicated Naples view earns its name. Haze eats the mountain by midday in summer; winter mornings and the hour after rain give the sharpest frames.",
    faqs: [
      {
        q: 'Do any of these cameras look into the crater?',
        a: "No — the catalogue's Vesuvius wall is Naples' city and bay network, including one scenic feed named for its Vesuvius view. They show the volcano as landscape. Crater monitoring is INGV's instrumented work, and the observatory's Vesuvius pages are where its status lives.",
      },
      {
        q: 'Why so many cameras for a quiet volcano?',
        a: "Because the wall's rule is a radius around the crater, and Naples is dense with cameras. The count measures the city's network, not the volcano's restlessness — the page states the rule so the number is never mistaken for anything else.",
      },
    ],
  },
  {
    slug: 'sakurajima',
    name: 'Sakurajima',
    short: 'Sakurajima',
    country: 'Japan',
    countrySlug: 'japan',
    region: 'Kyushu',
    scopeKey: 'event-vo-sakurajima',
    lat: 31.5936,
    lng: 130.6572,
    radiusKm: 20,
    centreLabel: "Sakurajima's summit",
    tz: 'Asia/Tokyo',
    observatory: { name: 'Japan Meteorological Agency' },
    highlights: [
      'Kagoshima - Volcano Sakurajima (SkylineWebcams)',
      'Volcano Sakurajima (SkylineWebcams)',
      'Hitotsu Bridge, Kagoshima',
    ],
    intro: [
      "Sakurajima erupts over Kagoshima so routinely that the city treats ash as a weather forecast item — and its cameras treat the volcano as a neighbour. This wall holds every catalogue camera within 20 km of the summit, including three feeds named for the volcano itself across Kagoshima Bay.",
      "Japan's camera culture extends to its volcanoes like few countries': city, bay and road feeds face the mountain as part of the ordinary view. Most days the show is a smoking cone over the water; on active days it is the ash column, the darkened sky, and a city going about its business underneath both.",
    ],
    watch:
      "Sakurajima is a daylight watch — the plume, the ash drift and the bay light are the picture, and the wind direction decides which shore gets the ash. After an explosive episode, keep watching: the city's response, the ferries and the clearing sky are the second half of the story.",
    faqs: [
      {
        q: 'Does Sakurajima erupt every day?',
        a: "It is one of the world's most routinely active volcanoes, with frequent small explosive episodes at its summit craters — frequent enough that Kagoshima publishes ashfall forecasts like weather. The Japan Meteorological Agency's Sakurajima pages carry its current alert level and activity reports.",
      },
      {
        q: 'Which camera faces the volcano directly?',
        a: "Three feeds in this wall carry the volcano's own name — the Kagoshima and bay-side Sakurajima cameras. Start with those for the mountain itself; the wider wall adds the city's roads and bridges for the ash-day context.",
      },
    ],
  },
  {
    slug: 'merapi',
    name: 'Mount Merapi',
    short: 'Merapi',
    country: 'Indonesia',
    countrySlug: 'indonesia',
    region: 'Central Java',
    scopeKey: 'event-vo-merapi',
    lat: -7.5407,
    lng: 110.4457,
    radiusKm: 30,
    centreLabel: "Mount Merapi's summit",
    tz: 'Asia/Jakarta',
    observatory: { name: "Indonesia's PVMBG (Center for Volcanology and Geological Hazard Mitigation)" },
    highlights: [
      'Volcano Merapi (SkylineWebcams)',
      'Pantauan Merapi - Ngandong monitoring camera',
      'Depan Puskesmas Cangkringan Timur',
    ],
    intro: [
      "Merapi is Indonesia's most active volcano, watched as closely as any mountain on Earth — and this is one of the few walls in the set that is a monitoring network first: a dedicated volcano camera sits 0.1 km from the wall's centre point, flanked by the Pantauan Merapi observation cameras on its slopes and the Yogyakarta-region network beyond.",
      "The mix is the story. Slope cameras read the dome and the gas; the city and district feeds at the wall's edge show the million-person region that lives in Merapi's reach. Indonesia's PVMBG carries the volcano's official alert level; this page carries the ground it applies to.",
    ],
    watch:
      "Merapi's dome glows and sheds at night — the slope cameras earn their keep after dark, when incandescent rockfalls show as brief bright traces. Dawn is the clarity window: the summit is usually clearest before the day's cloud builds, and the gas plume's drift reads cleanly against a morning sky.",
    faqs: [
      {
        q: 'What are the Pantauan Merapi cameras?',
        a: "'Pantauan' means monitoring: they are observation cameras on Merapi's slopes published through the Yogyakarta provincial network, joined in this wall by a dedicated volcano feed. They exist to watch the mountain, which makes this wall unusual — most volcano pages on the open web are landscape views, and this one is closer to the observatory's own wall.",
      },
      {
        q: 'What is Merapi\u2019s current alert level?',
        a: "Alert levels for Indonesian volcanoes are set by PVMBG and change with the mountain's behaviour — check its Merapi reports for the current level before interpreting any frame. This page deliberately prints no level of its own: a stale alert level is worse than none.",
      },
    ],
  },
  {
    slug: 'bromo',
    name: 'Mount Bromo',
    short: 'Bromo',
    country: 'Indonesia',
    countrySlug: 'indonesia',
    region: 'East Java',
    scopeKey: 'event-vo-bromo',
    lat: -7.9425,
    lng: 112.953,
    radiusKm: 30,
    centreLabel: "Mount Bromo's crater",
    tz: 'Asia/Jakarta',
    observatory: { name: "Indonesia's PVMBG (Center for Volcanology and Geological Hazard Mitigation)" },
    highlights: ['Volcano Bromo - Indonesia (SkylineWebcams)'],
    intro: [
      "Bromo's wall is a single camera, like Etna's — a dedicated volcano feed looking across the Tengger caldera at one of the most photographed volcanic landscapes on Earth: Bromo's smoking cone inside a sea of sand, with Semeru, Java's highest volcano, standing in the same volcanic complex behind the caldera.",
      "One feed, stated plainly. The page exists because that feed is real, dedicated and worth having beside the observatory's word: PVMBG sets Bromo's alert level, and this camera shows the caldera the level describes.",
    ],
    watch:
      "Bromo is a sunrise subject — the caldera light in the first hour is why the viewpoints fill before dawn, and the camera catches the same progression: mist in the sand sea, the cone's plume lit from the side, Semeru clearing last. By midday the caldera is usually hazier and flatter.",
    faqs: [
      {
        q: 'Is the one camera really pointed at Bromo?',
        a: "Yes — the wall's single record is a dedicated volcano camera named for Bromo, 6.7 km from the crater, looking across the Tengger caldera. The page prints the count as one rather than padding the wall with distant city feeds.",
      },
      {
        q: 'Can I see Semeru from the Bromo camera?',
        a: "Semeru stands in the same massif, south of the caldera, and the classic Bromo viewpoint frames both mountains — whether it is in this feed's exact frame on a given day depends on haze and the camera's aim, so the page promises the caldera view and treats Semeru as the neighbour it is, not a guaranteed sight.",
      },
    ],
  },
  {
    slug: 'fuji',
    name: 'Mount Fuji',
    short: 'Fuji',
    country: 'Japan',
    countrySlug: 'japan',
    region: 'Honshu',
    scopeKey: 'event-vo-fuji',
    lat: 35.3606,
    lng: 138.7274,
    radiusKm: 30,
    centreLabel: "Mount Fuji's summit",
    tz: 'Asia/Tokyo',
    observatory: { name: 'Japan Meteorological Agency' },
    highlights: [
      'Mt. Fuji Live',
      'Fujikawaguchiko - Mount Fuji (SkylineWebcams)',
      'Hotel Mount Fuji, Shizuoka',
    ],
    intro: [
      "Fuji is the opposite problem from Etna: Japan's most watched mountain is ringed by cameras — a dense wall of lake, town, road and resort feeds within 30 km of the summit, including a live feed registered at the summit point itself and the classic Fujikawaguchiko view across the lake.",
      "Fuji is a monitored volcano under the Japan Meteorological Agency's care, and it is also a landscape icon — which is exactly what this wall is: dozens of angles on the cone, its snow line, its weather. The volcano watch here is a clarity watch: the mountain makes its own cloud, and the first skill is knowing its clear hours.",
    ],
    watch:
      "Early morning is Fuji's reliable window — the cone is clearest at dawn, especially in the colder months, before its cap cloud builds. Winter brings the snow-covered classic; the climbing season brings lights on the summit trails at night, visible on the darker feeds as a slow dotted line.",
    faqs: [
      {
        q: 'Is Mount Fuji an active volcano?',
        a: "Yes — Fuji is classified as an active volcano and is monitored by the Japan Meteorological Agency, though it has been quiet in the modern era of its fame. This page is a viewing wall, not an eruption watch: the cameras serve the mountain's weather, snow line and light, and the JMA's pages carry its official status.",
      },
      {
        q: 'Which Fuji camera is best?',
        a: "For the postcard, start with the Fujikawaguchiko feed — the lake-side classic. For the mountain's mood, the 'Mt. Fuji Live' feed sits at the wall's centre. On a cloudy day, work the wall: one side of the cone is often clear when the other is capped.",
      },
    ],
  },
  {
    slug: 'ruapehu',
    name: 'Mount Ruapehu',
    short: 'Ruapehu',
    country: 'New Zealand',
    countrySlug: 'new-zealand',
    region: 'Manawatū-Whanganui',
    scopeKey: 'event-vo-ruapehu',
    lat: -39.28,
    lng: 175.57,
    radiusKm: 50,
    centreLabel: "Mount Ruapehu's summit",
    tz: 'Pacific/Auckland',
    observatory: { name: 'GeoNet / Earth Sciences NZ (GNS Science)' },
    highlights: [
      'SH1 Desert Rd (NZTA)',
      'SH1 Waihohonu Bridge (NZTA)',
      'SH1 Waiouru (NZTA)',
    ],
    intro: [
      "Just four cameras stand within 50 km of Ruapehu — the thinnest wall in this set, a wide net over the central North Island's volcanic plateau, stated at its real size. They are NZTA highway cameras on SH1, the Desert Road that runs along the mountain's eastern foot.",
      "What they watch is the crossing: the plateau's weather, its winter snow, and the great cone standing over the highway when the air clears. Ruapehu's own monitoring — its crater lake, its seismicity — is GeoNet's instrumented work; these cameras are the public road beneath it, which in New Zealand is its own kind of volcano information.",
    ],
    watch:
      "The Desert Road is a weather instrument in itself: when Ruapehu is visible from it, the whole plateau is having a clear day, and winter dawns give the cone its best light. In storm weeks the same cameras show why the road closes — snow and wind at altitude, read directly.",
    faqs: [
      {
        q: 'Why are there no crater cameras for Ruapehu?',
        a: "The catalogue holds no GeoNet crater feed for Ruapehu — its four in-range cameras are the highway network on the Desert Road. Rather than borrow a distant city's grid and call it a volcano wall, the page keeps the honest four and names GeoNet as where the volcano's real monitoring lives.",
      },
      {
        q: 'Is Ruapehu active?',
        a: "Ruapehu is an active volcano with a crater lake, monitored continuously by GeoNet, whose alert bulletins carry its current state. The cameras here show the mountain's weather and presence; the alert level is GeoNet's to state.",
      },
    ],
  },
];

const BY_SLUG = new Map(VOLCANOES.map((v) => [v.slug, v]));

export function volcanoBySlug(slug: string): Volcano | null {
  return BY_SLUG.get(slug) ?? null;
}
