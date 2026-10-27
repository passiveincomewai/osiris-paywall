/**
 * OSIRIS — the national park webcam registry.
 *
 * One row per US national park whose page the catalogue can honestly
 * back. A park qualifies only when a radius wall around a named
 * centre — the park's own ground, its entrance, or its gateway
 * settlement — holds at least four catalogue cameras AND the wall is
 * anchored to the park (a park-service camera, an entrance/road
 * corridor camera, or the gateway town the park's visitors actually
 * pass through). Walls that would just be a nearby city's traffic
 * grid do not qualify, however big the count: Biscayne's radius is
 * Miami, Saguaro's is Tucson, Cuyahoga Valley's is the Cleveland
 * freeway system — those parks are listed as gaps on the hub instead.
 *
 * Every count a page quotes is computed from the wall's EXPLORE_SCOPES
 * definition (src/lib/explore-data.ts, keys `park-*`) over the same
 * catalogue chunks the explorer serves; src/lib/national-parks.test.ts
 * reconciles each wall's yield against the raw chunks with its own
 * haversine, and pins the famous gaps (no Old Faithful camera exists
 * in the catalogue; Katmai, Big Bend, Death Valley and the Everglades
 * have no park wall at all).
 *
 * Method note: a radius is not a boundary. Yellowstone is 8,991 km²;
 * no honest single radius is "the park". Each page states its rule —
 * every catalogue camera within N km of a named centre, nearest
 * first — and describes what the wall actually contains (park-service
 * viewpoints, entrance roads, gateway streets), never more.
 */

import { sunEventIso, sunEventOffsetMinutes } from './sunrise';

export interface NationalPark {
  slug: string;
  /** Full park name, e.g. "Yellowstone National Park". */
  name: string;
  /** Short name for titles and cards, e.g. "Yellowstone". */
  short: string;
  /** State / territory display, e.g. "Wyoming". */
  state: string;
  /** schema.org addressRegion. */
  region: string;
  /** EXPLORE_SCOPES key of this park's wall. */
  scopeKey: string;
  /** Wall centre — the point the stated radius is measured from. */
  lat: number;
  lng: number;
  radiusKm: number;
  /** What the centre is, for the page's stated rule. */
  centreLabel: string;
  /** Gateway settlement the wall leans on, when it has one. */
  gateway: string | null;
  /** IANA timezone for the sunrise/sunset block. */
  tz: string;
  /** Named cameras verified inside the wall (audit, Oct 2026). */
  highlights: string[];
  /** Two intro paragraphs: what the wall is, honestly. */
  intro: [string, string];
  /** Best-time-to-watch note: sun math + what the cameras are for. */
  watch: string;
  faqs: Array<{ q: string; a: string }>;
}

export const NATIONAL_PARKS: NationalPark[] = [
  {
    slug: 'yellowstone',
    name: 'Yellowstone National Park',
    short: 'Yellowstone',
    state: 'Wyoming',
    region: 'WY',
    scopeKey: 'park-yellowstone',
    lat: 44.73,
    lng: -110.55,
    radiusKm: 55,
    centreLabel: "a point at the park's centre",
    gateway: 'West Yellowstone',
    tz: 'America/Denver',
    highlights: [
      'Mammoth Hot Springs — Travertine Terraces',
      'Mount Washburn — Southern View',
      'Mount Washburn — Northeastern View',
      'West Entrance',
      'East Entrance',
    ],
    intro: [
      'Yellowstone is too big for one wall — 8,991 square kilometres of caldera — so this page draws the widest honest circle in the set: every catalogue camera within 55 km of the park’s centre. What that catches is the park’s own skeleton. The park’s five National Park Service cameras are here: the travertine terraces at Mammoth Hot Springs, both Mount Washburn lookouts, and the east and west entrance stations, with research phenocams inside the boundary and the gateway town of West Yellowstone at the rim.',
      'The famous absence has to be stated plainly, because it is the first thing most visitors look for: there is no Old Faithful camera in this catalogue, and this page will not pretend otherwise. What the wall offers instead is the Yellowstone that webcams actually cover — terraces steaming in the cold, the Washburn range at dawn, entrance roads telling you the weather before any forecast does.',
    ],
    watch:
      'Terraces and high lookouts are morning subjects: steam reads best against cold air, and Washburn’s views face into the day’s first light over the caldera. Entrance cameras earn their keep an hour before you drive — snow on the approach roads shows here first.',
    faqs: [
      {
        q: 'Can I watch Old Faithful erupt live here?',
        a: 'Not on this page — the catalogue holds no Old Faithful camera, and rather than dress up a substitute we say so. The five park-service cameras the wall does carry are Mammoth Hot Springs’ terraces, Mount Washburn’s two lookouts and the east and west entrances. If an Old Faithful feed is ever published openly, it will join this wall automatically.',
      },
      {
        q: 'Which Yellowstone camera is best in winter?',
        a: 'Mammoth Hot Springs. It is the only park headquarters area open to cars all winter, its terraces steam hardest in cold air, and the entrance cameras beside it show the road you would actually drive. Mount Washburn is a summer lookout — expect snow-bound stills deep into spring.',
      },
    ],
  },
  {
    slug: 'grand-canyon',
    name: 'Grand Canyon National Park',
    short: 'Grand Canyon',
    state: 'Arizona',
    region: 'AZ',
    scopeKey: 'park-grand-canyon',
    lat: 36.0619,
    lng: -112.1077,
    radiusKm: 25,
    centreLabel: 'Grand Canyon Village on the South Rim',
    gateway: 'Grand Canyon Village',
    tz: 'America/Phoenix',
    highlights: [
      'Bright Angel Trailhead View',
      'Live View From Kolb Studio',
      'South Entrance Station',
    ],
    intro: [
      'Four cameras, and every one of them belongs to the National Park Service — the purest wall in this directory. From Grand Canyon Village the wall takes in the Bright Angel Trailhead, where hikers drop below the rim; the view from Kolb Studio, the 1904 photographic studio pinned to the canyon’s edge; and the South Entrance Station on the road in.',
      'The canyon is 446 km long, and this wall makes no claim on most of it: the North Rim, a thousand feet higher and closed by snow half the year, contributes no catalogue cameras, and neither does the western canyon. What is here is the South Rim’s living room — the trailhead, the studio view, and the entrance queue — live.',
    ],
    watch:
      'The canyon is a light instrument: early morning rakes shadows across the Bright Angel corridor, and the Kolb Studio view deepens in colour for an hour before sunset. Midday washes the layers flat — the wall is at its best near the day’s edges, whose times are computed for the rim below.',
    faqs: [
      {
        q: 'Is there a Grand Canyon webcam at the North Rim?',
        a: 'Not in the catalogue. All four cameras on this page are South Rim park-service feeds — Bright Angel Trailhead, Kolb Studio, the South Entrance Station and a State Route 64 camera. The North Rim has no public feed in the directory; if one is published, the wall will pick it up.',
      },
      {
        q: 'Can I check the South Entrance queue live?',
        a: 'Yes — the South Entrance Station camera is in this wall, and it is the practical reason many visitors open the page: entrance lines on summer weekends can stretch well beyond the station, and the camera shows the road as it is, not as anyone hopes it is.',
      },
    ],
  },
  {
    slug: 'yosemite',
    name: 'Yosemite National Park',
    short: 'Yosemite',
    state: 'California',
    region: 'CA',
    scopeKey: 'park-yosemite',
    lat: 37.7459,
    lng: -119.5932,
    radiusKm: 15,
    centreLabel: 'Yosemite Village',
    gateway: 'Yosemite Village',
    tz: 'America/Los_Angeles',
    highlights: [
      'Half Dome',
      'El Capitan',
      'Merced River at Happy Isles',
      'Yosemite High Sierra',
      'Badger Pass Ski Area',
    ],
    intro: [
      'The wall every other park page is measured against: six records from the National Park Service feed inside 15 km of Yosemite Village, and five of them are the icons themselves — Half Dome from across the Valley, El Capitan’s wall, the Merced River at Happy Isles under the footbridges, the High Sierra view, and Badger Pass, California’s oldest ski area, for the winter months. The sixth is a small honesty footnote: a record the catalogue names only “Question 6”, an NPS feed entry whose real title never survived the import. It stays in the wall, labelled as found.',
      'Nothing here is a gateway substitute: every camera in this wall comes from the park’s own published feed — the viewpoints in Yosemite Valley and on its rim, gathered into one wall with the Valley’s weather and the day’s sun times for planning around them.',
    ],
    watch:
      'Half Dome catches alpenglow at sunset; El Capitan is a morning wall, lit full-face early. In late winter, when the sun angle lines up, the High Sierra and Valley cameras are where Horsetail Fall watchers check conditions — the wall cannot promise the firefall, but it shows the light and the water honestly.',
    faqs: [
      {
        q: 'Which Yosemite webcam shows Half Dome?',
        a: 'The park-service Half Dome camera — it leads this wall, framed from across Yosemite Valley. The same wall carries El Capitan, the Merced River at Happy Isles, the High Sierra view and Badger Pass: every record in the wall comes from the National Park Service feed (the sixth is a feed entry the catalogue lists only as “Question 6”).',
      },
      {
        q: 'Can I see Horsetail Fall (the firefall) on these cameras?',
        a: 'The conditions for it, yes; a guaranteed firefall, no — the effect needs clear sunset light and enough meltwater in late February, and it lasts minutes. The Valley cameras show both inputs live: the sunset light on the wall and the season’s snowmelt in the Merced.',
      },
    ],
  },
  {
    slug: 'rocky-mountain',
    name: 'Rocky Mountain National Park',
    short: 'Rocky Mountain',
    state: 'Colorado',
    region: 'CO',
    scopeKey: 'park-rocky-mountain',
    lat: 40.3428,
    lng: -105.6881,
    radiusKm: 15,
    centreLabel: 'Trail Ridge Road’s high country',
    gateway: 'Estes Park & Grand Lake',
    tz: 'America/Denver',
    highlights: [
      'Kawuneeche Valley',
      'Alpine Visitor Center',
      'Fall River Entrance',
      'Grand Lake Entrance',
    ],
    intro: [
      'Rocky Mountain’s wall is an altitude transect. Five records from the National Park Service feed sit inside it: the Kawuneeche Valley on the park’s wet west side, both entrance stations — Fall River on the Estes Park side, Grand Lake on the west — the Alpine Visitor Center at 3,595 metres on Trail Ridge Road, among the highest webcams in the national park system, and a fifth feed entry the catalogue names only “Question 7”.',
      'A research phenocam and a US-34 corridor camera complete the set. Read together, the wall does the thing park visitors actually need in the morning: the valley floor, both gates, and the top of the road, in one glance — the difference between a clear crossing of Trail Ridge and a turnaround at the gate.',
    ],
    watch:
      'Trail Ridge weather turns at altitude first: check the Alpine Visitor Center camera before believing any valley forecast, and use the two entrance cameras at dawn to read the day — clear at the gate and socked-in at 3,600 metres is a normal summer pattern here.',
    faqs: [
      {
        q: 'Can I check Trail Ridge Road conditions on a webcam?',
        a: 'Yes — the Alpine Visitor Center camera sits on Trail Ridge Road at 3,595 m, and the Fall River and Grand Lake entrance cameras show both ends of the crossing. The road is seasonal (snow closes it roughly October to late May); the cameras run all year and show exactly why.',
      },
      {
        q: 'Which side of the park do the cameras cover?',
        a: 'Both. Fall River Entrance and the Alpine Visitor Center are on the east (Estes Park) side; the Kawuneeche Valley and Grand Lake Entrance cameras are on the west side of the Continental Divide, so the wall spans the whole park road system.',
      },
    ],
  },
  {
    slug: 'redwood',
    name: 'Redwood National and State Parks',
    short: 'Redwood',
    state: 'California',
    region: 'CA',
    scopeKey: 'park-redwood',
    lat: 41.4,
    lng: -124.03,
    radiusKm: 45,
    centreLabel: 'the parks’ coastal strip',
    gateway: 'Crescent City & Orick',
    tz: 'America/Los_Angeles',
    highlights: [
      'Elk Prairie at Prairie Creek Redwoods State Park',
      'Thomas H. Kuchel Visitor Center',
      'Bald Hills & Redwood Creek',
      'Jedediah Smith Redwoods State Park',
    ],
    intro: [
      'Redwood is not one park boundary but a 60-kilometre string of federal and state groves along US-101, and the wall follows that shape: a 45 km radius over the coastal strip. Four park-service cameras anchor it — Elk Prairie in Prairie Creek, where Roosevelt elk graze the meadow the camera watches; the Kuchel Visitor Center on the beach at Orick; Bald Hills above Redwood Creek; and Jedediah Smith at the northern end.',
      'Between the groves, the wall fills with the road that stitches them together — US-101’s Caltrans cameras through Del Norte Coast and Crescent City’s streets. That is the honest anatomy of a Redwood trip: old-growth groves, then highway, then groves again, with the fog deciding what you see at each.',
    ],
    watch:
      'Redwood weather is a morning question: coastal fog fills the groves overnight and burns off unevenly, grove by grove. Elk Prairie is the wildlife seat — elk are most active in the cool ends of the day, and the prairie camera shows the meadow before you commit to the drive.',
    faqs: [
      {
        q: 'Which Redwood webcam has elk?',
        a: 'Elk Prairie at Prairie Creek Redwoods State Park — the meadow is named for its herd, and the park-service camera watches it. Roosevelt elk are wild and wander, so an empty frame is a true frame; dawn and dusk are the best odds.',
      },
      {
        q: 'Why does the wall include Crescent City street cameras?',
        a: 'Because the parks are a chain along US-101, and Crescent City sits inside that chain — the wall’s stated rule is every catalogue camera within 45 km of the strip’s centre. The four park-service grove cameras are listed first and named as the highlights; the road cameras show the coast you drive between groves.',
      },
    ],
  },
  {
    slug: 'haleakala',
    name: 'Haleakalā National Park',
    short: 'Haleakalā',
    state: 'Hawaii',
    region: 'HI',
    scopeKey: 'park-haleakala',
    lat: 20.701,
    lng: -156.173,
    radiusKm: 15,
    centreLabel: 'the Haleakalā summit',
    gateway: 'the summit district',
    tz: 'Pacific/Honolulu',
    highlights: ['Live Haleakalā Crater Cam'],
    intro: [
      'One camera carries this wall, and it is the right one: the National Park Service’s Live Haleakalā Crater Cam, looking into the summit depression of the volcano from 3,055 metres. Around it, eight FAA weather cameras on the summit district’s ridges — Manawainui Gulch on the park’s Kaupō side and Puʻunianiau on the upcountry approach — complete the set.',
      'Haleakalā sunrise is a reservation-ticket event at the summit, and the crater cam is the public window onto it: the sea of clouds below the rim, the light arriving over the crater floor, and — on the mornings the trades pile cloud against the mountain — an honest whiteout instead. The wall shows the summit as it is, which is the only useful way to show it.',
    ],
    watch:
      'This is the sunrise wall — today’s summit sunrise time is computed below, and the crater cam is at its best in the half hour around it. The FAA ridge cameras read the cloud deck on the drive up: if Manawainui is clear and the crater is fogged, the summit is in the cloud, not above it.',
    faqs: [
      {
        q: 'Can I watch the Haleakalā sunrise live?',
        a: 'Yes — the park-service crater cam streams the summit, and sunrise over the crater is its signature view. Watching needs no reservation; driving to the summit for sunrise does. The cam also tells you by about 4 a.m. whether the summit is above the clouds or inside them.',
      },
      {
        q: 'What are the FAA cameras on this page?',
        a: 'Aviation weather cameras on the ridges around the summit district — Manawainui Gulch, on the park’s remote Kaupō side, and Puʻunianiau on the upcountry road. They are weather instruments, not scenic cams, but they read the mountain’s cloud cover honestly from three sides.',
      },
    ],
  },
  {
    slug: 'acadia',
    name: 'Acadia National Park',
    short: 'Acadia',
    state: 'Maine',
    region: 'ME',
    scopeKey: 'park-acadia',
    lat: 44.3386,
    lng: -68.2733,
    radiusKm: 15,
    centreLabel: 'Mount Desert Island',
    gateway: 'Bar Harbor',
    tz: 'America/New_York',
    highlights: ['Jordan Pond Webcam'],
    intro: [
      'Acadia’s wall is Mount Desert Island in miniature. Its anchor is a genuine park-service camera — the Jordan Pond Webcam, aimed across the pond at the Bubbles, the twin glacial hills that are the park’s postcard. Around it, FAA weather cameras at Bar Harbor’s helipad and the Hancock County airport complete the island’s coverage.',
      'The mix is stated as it is: one scenic park camera, and the working weather cameras of the island the park shares with Bar Harbor. Together they answer the island’s two daily questions — is Jordan Pond clear this morning, and what is the harbour weather doing — without pretending the airport cams are park views.',
    ],
    watch:
      'Jordan Pond is a morning camera: the Bubbles reflect in still water early, and the pond’s famous clarity shows best before the day’s breeze. In October the wall doubles as a foliage check on the island’s maples; in summer, the Bar Harbor cameras read the fog bank before you drive the Park Loop Road.',
    faqs: [
      {
        q: 'Is there a webcam at Jordan Pond?',
        a: 'Yes — the National Park Service’s Jordan Pond Webcam is in this wall, looking across the pond to North and South Bubble. It is the park’s one catalogue camera; the rest of the wall is Bar Harbor’s FAA weather coverage of the same island.',
      },
      {
        q: 'Where is the Cadillac Mountain webcam?',
        a: 'There isn’t one in the catalogue. Cadillac — first sunrise in the US for much of the year — has no public feed here. The wall’s sunrise seat is Jordan Pond, and today’s island sunrise time is computed on this page.',
      },
    ],
  },
  {
    slug: 'denali',
    name: 'Denali National Park',
    short: 'Denali',
    state: 'Alaska',
    region: 'AK',
    scopeKey: 'park-denali',
    lat: 63.728,
    lng: -148.887,
    radiusKm: 25,
    centreLabel: 'the park entrance on the Parks Highway',
    gateway: 'the Denali Park entrance',
    tz: 'America/Anchorage',
    highlights: ['McKinley Park FAA cameras'],
    intro: [
      'Denali keeps its own counsel: the mountain makes its own weather and shows itself on a minority of days, which is why this wall matters. Four FAA cameras at McKinley Park stand 1.3 km from the park entrance — the closest settlement to the gate — with four more at Healy and the Parks Highway and a research phenocam completing the ten.',
      'No park-service scenic camera exists in the catalogue for Denali, and the wall doesn’t invent one. What it gives you is the entrance district live: the Alaska Range foothills, the highway weather, and — on the clear mornings that make the whole trip — the massif itself standing over the entrance cameras’ frames.',
    ],
    watch:
      'Check the McKinley Park cameras at dawn: Denali’s odds are best early, before the mountain builds its own cloud. In summer the light barely leaves (today’s sunrise and sunset, computed below, are hours apart at most); in winter this wall is a study in blue twilight and headlights on the Parks Highway.',
    faqs: [
      {
        q: 'Can I see Denali itself on these cameras?',
        a: 'On clear days, yes — the entrance-area cameras face the Alaska Range, and the mountain dominates them when it is out. Denali is famously visible only a minority of the time; the cameras’ virtue is that they tell you today’s truth before you drive anywhere.',
      },
      {
        q: 'Are any of these cameras inside the park?',
        a: 'No — the wall is the entrance district: FAA weather cameras at McKinley Park (1.3 km from the entrance) and Healy, a Parks Highway camera and a NEON research phenocam. The park road itself has no public camera in the catalogue, and the page says so rather than borrowing scenery.',
      },
    ],
  },
  {
    slug: 'glacier-bay',
    name: 'Glacier Bay National Park',
    short: 'Glacier Bay',
    state: 'Alaska',
    region: 'AK',
    scopeKey: 'park-glacier-bay',
    lat: 58.413,
    lng: -135.727,
    radiusKm: 10,
    centreLabel: 'Gustavus, the park’s gateway town',
    gateway: 'Gustavus',
    tz: 'America/Anchorage',
    highlights: ['Gustavus Dock cameras'],
    intro: [
      'Glacier Bay has no road in. The gateway is Gustavus — a bush community of one runway and a dock, reached by air or water — and Bartlett Cove, the park headquarters, lies 16 km up the shore. The catalogue’s cameras are Gustavus’s own: four FAA weather cameras at the airfield and four at the dock where the day boats and the ferry tie up.',
      'That is the whole wall, stated plainly: eight working cameras in the park’s front yard. They read the bay’s weather honestly — the marine layer, the rain bands coming off the Fairweather Range, the dock on a cruise morning — which is the information every Glacier Bay day is planned around.',
    ],
    watch:
      'The dock cameras are the day’s first read: tour and day-boat weather in Glacier Bay is made by the marine layer, and Gustavus shows it lifting (or not) in real time. Long summer evenings are the bay’s glory — sunset here, computed below, comes late enough to watch over dinner.',
    faqs: [
      {
        q: 'Is there a webcam at the glaciers themselves?',
        a: 'No — the tidewater glaciers of Glacier Bay have no public cameras in the catalogue. The wall is Gustavus, the gateway town: airfield and dock FAA cameras 10 km from the park boundary’s shore. If a Bartlett Cove or glacier feed is published, it will land on this page.',
      },
      {
        q: 'Why Gustavus?',
        a: 'Because it is the only front door the park has: every visitor arrives through Gustavus’s runway or dock, and its cameras are the live weather for the bay. A Glacier Bay page built from cameras somewhere else would be a label, not a tool.',
      },
    ],
  },
  {
    slug: 'isle-royale',
    name: 'Isle Royale National Park',
    short: 'Isle Royale',
    state: 'Michigan',
    region: 'MI',
    scopeKey: 'park-isle-royale',
    lat: 48.12,
    lng: -88.55,
    radiusKm: 15,
    centreLabel: 'Rock Harbor, the park’s east-end harbour',
    gateway: 'Rock Harbor',
    tz: 'America/Detroit',
    highlights: [
      'Rock Harbor Webcam',
      'Mott Island Southwest Webcam',
      'Greenstone Ridge Southwest Webcam',
      'Middle Islands Passage Webcam',
    ],
    intro: [
      'Four cameras, all of them the park’s own, on an island with no roads to the mainland and a visitor season barely five months long. The Rock Harbor Webcam watches the harbour where the ferries land; Mott Island, the ranger station island, faces southwest; Greenstone Ridge looks along the island’s basalt spine; and the Middle Islands Passage camera covers the water between.',
      'Isle Royale is one of the least-visited and most-revisited parks in the system — a wilderness of wolves and moose that most people experience exactly this way, through a screen, planning. In winter the park closes entirely and the cameras keep watching an island returned to its animals and its weather.',
    ],
    watch:
      'Harbour light is the show: sunrise over Rock Harbor in the open season, and Lake Superior weather arriving in real time at the Passage camera. In the closed winter months the wall is a solitude instrument — check it after a storm for the ice coming in.',
    faqs: [
      {
        q: 'Do the Isle Royale webcams run in winter?',
        a: 'The park closes to visitors from November to mid-April, but the park-service cameras in this wall stream through it — snow, lake ice and an empty harbour. They are the only eyes on the island most winters, which is rather the point of them.',
      },
      {
        q: 'Can I see wolves or moose on the cameras?',
        a: 'Occasionally, and never on schedule — the harbour and ridge cameras have the sightlines, and moose use the Rock Harbor shore. Treat any animal as a gift; the cameras’ daily subject is the lake and the island’s weather.',
      },
    ],
  },
  {
    slug: 'crater-lake',
    name: 'Crater Lake National Park',
    short: 'Crater Lake',
    state: 'Oregon',
    region: 'OR',
    scopeKey: 'park-crater-lake',
    lat: 42.9446,
    lng: -122.109,
    radiusKm: 25,
    centreLabel: 'the caldera rim',
    gateway: 'Rim Village',
    tz: 'America/Los_Angeles',
    highlights: ['Crater Lake', 'Steel Information Center', 'Annie Spring Entrance Station'],
    intro: [
      'The wall is small and exactly aimed: a park-service camera on the lake itself — that impossible blue, when the Oregon Cascades let you see it — the Steel Information Center at Rim Village, and the Annie Spring Entrance Station on the road up, with two state highway cameras on OR-138 completing the approach picture.',
      'Crater Lake’s weather is the park’s gatekeeper: the rim sits above 2,100 metres, takes over ten metres of snow in a normal year, and can be fogged in while the valleys below are clear. These five cameras — lake, village, entrance, highway — are the standard check before anyone drives up, and the page keeps them in that order.',
    ],
    watch:
      'The lake is clearest in the morning before Cascade cloud builds, and the Annie Spring camera is the honest broker: if it shows falling snow in June — which happens — believe it and not the valley forecast. Winter’s long storms are a spectacle on the rim cam between whiteouts.',
    faqs: [
      {
        q: 'Can I check whether Crater Lake is fogged in?',
        a: 'Yes — that is the lake camera’s main job. The rim is above 2,100 m and sits in cloud many days when the lowlands are clear; the Steel Center and Annie Spring cameras show the village and the entrance road so you can judge the whole climb, not just the top.',
      },
      {
        q: 'Is Wizard Island on the camera?',
        a: 'The lake camera’s view takes in the caldera and Wizard Island’s cone when visibility allows. On socked-in days the frame is honest fog — the page would rather show you that than a prettier lie.',
      },
    ],
  },
  {
    slug: 'mount-rainier',
    name: 'Mount Rainier National Park',
    short: 'Mount Rainier',
    state: 'Washington',
    region: 'WA',
    scopeKey: 'park-mount-rainier',
    lat: 46.786,
    lng: -121.735,
    radiusKm: 25,
    centreLabel: 'Paradise, on the mountain’s south side',
    gateway: 'Paradise & Longmire',
    tz: 'America/Los_Angeles',
    highlights: ['Visitor Center (Paradise)', 'Longmire', 'West'],
    intro: [
      'Three park-service cameras hold this wall: Paradise, the mountain’s great south-side meadow at 1,650 metres, where the Visitor Center camera faces the Tatoosh Range and the Nisqually Glacier’s shoulder; Longmire, the historic entrance settlement in the old-growth; and the West camera beside them. Highway cameras on the approach roads fill out the six.',
      'Rainier is a weather factory visible from three cities, and its cameras are how the region checks the mountain’s mood: lenticular cap on, Paradise in cloud, or — the famous days — the whole 4,392-metre bulk standing clear over the lowland murk. The wall shows the mountain’s territory from inside it.',
    ],
    watch:
      '“The mountain is out” is a dawn verdict here: Paradise clears earliest and clouds over first. Wildflower season (late July into August) turns the Visitor Center camera into a meadow watch; in winter it is a snow-depth gauge for the Paradise road, one of the snowiest measured places on Earth.',
    faqs: [
      {
        q: 'Which webcam shows Paradise?',
        a: 'The park-service Visitor Center camera — Paradise is its station, 1,650 m up Rainier’s south side. Longmire’s camera covers the historic district below it, and the pair read the mountain’s two climates in one wall.',
      },
      {
        q: 'Can I see if the mountain is out before driving?',
        a: 'That is exactly what these cameras are for. If Paradise is in cloud but Longmire is clear, the cloud deck sits between them — the classic Rainier pattern — and the wall shows both ends of it live.',
      },
    ],
  },
  {
    slug: 'grand-teton',
    name: 'Grand Teton National Park',
    short: 'Grand Teton',
    state: 'Wyoming',
    region: 'WY',
    scopeKey: 'park-grand-teton',
    lat: 43.6073,
    lng: -110.7374,
    radiusKm: 15,
    centreLabel: 'Jackson Hole Airport, inside the park',
    gateway: 'Jackson Hole Airport',
    tz: 'America/Denver',
    highlights: ['Jackson Hole Airport cameras'],
    intro: [
      'A wall with a distinction no other page here can claim: its four cameras stand inside the national park. Jackson Hole Airport is the only commercial airport within a US national park’s boundaries, grandfathered into Grand Teton, and its FAA weather cameras face the Teton Range across the sagebrush flats of Jackson Hole.',
      'That is the honest extent of it — four aviation weather cameras, not scenic park feeds, and the page says so. But their subject is the range itself: the Grand, Middle and South Tetons over the airfield, in the valley’s dawn cold and under its afternoon thunderheads. As a Teton weather window, they are the real thing.',
    ],
    watch:
      'The Tetons are a sunrise range from the valley floor — first light sets the east faces alight, and the airport cameras catch it before anything else wakes. Winter inversions fill Jackson Hole with fog while the peaks stand clear above it; the four compass views show which side of the valley the weather is on.',
    faqs: [
      {
        q: 'Is Jackson Hole Airport really inside Grand Teton?',
        a: 'Yes — it is the only US commercial airport inside a national park, created before the park’s 1950 expansion surrounded it. Its FAA weather cameras are therefore genuinely in-park cameras, and they face the Teton Range across the airfield.',
      },
      {
        q: 'Are there scenic Grand Teton webcams (Mormon Row, Schwabacher Landing)?',
        a: 'Not in the catalogue. The famous barn and river viewpoints have no public feeds here; the wall is the airport’s four weather cameras, with the range as their backdrop. If a scenic park feed is published openly, it will join this page.',
      },
    ],
  },
  {
    slug: 'kenai-fjords',
    name: 'Kenai Fjords National Park',
    short: 'Kenai Fjords',
    state: 'Alaska',
    region: 'AK',
    scopeKey: 'park-kenai-fjords',
    lat: 60.104,
    lng: -149.442,
    radiusKm: 15,
    centreLabel: 'Seward, the park’s gateway harbour',
    gateway: 'Seward',
    tz: 'America/Anchorage',
    highlights: ['Seward FAA cameras'],
    intro: [
      'Kenai Fjords is a park you enter by boat, and its gateway is Seward: the harbour town at the head of Resurrection Bay, where the tour fleet ties up under Mount Marathon. The catalogue’s four cameras are Seward’s FAA weather set, watching the bay mouth and the town’s weather from four compass points.',
      'The wall is labelled for what it is — gateway cameras, not fjord cameras. The Harding Icefield and its tidewater glaciers have no public feeds in the directory. What Seward’s cameras decide is the day itself: whether Resurrection Bay is lying flat under the icefield’s outflow or standing up in a southerly, which is the only forecast a fjords trip needs.',
    ],
    watch:
      'Resurrection Bay mornings are the calm ones; the Seward cameras show the afternoon southerly arriving before the boats feel it. In May and June the long light (sun times below) makes the bay’s evening glass the wall’s best hour.',
    faqs: [
      {
        q: 'Is there a webcam at Exit Glacier?',
        a: 'No — Exit Glacier, the park’s one road-accessible glacier, has no public camera in the catalogue. The wall is Seward’s four FAA weather cameras at the gateway harbour, 14 km from the Exit Glacier road.',
      },
      {
        q: 'Why does a fjords park page show a harbour town?',
        a: 'Because Kenai Fjords is entered from Seward’s harbour and nowhere else — every boat tour, and the park’s own visitor centre, is on its waterfront. The cameras are the park’s weather, taken at its front door.',
      },
    ],
  },
  {
    slug: 'virgin-islands',
    name: 'Virgin Islands National Park',
    short: 'Virgin Islands',
    state: 'U.S. Virgin Islands',
    region: 'VI',
    scopeKey: 'park-virgin-islands',
    lat: 18.342,
    lng: -64.768,
    radiusKm: 15,
    centreLabel: 'St. John’s north shore',
    gateway: 'Cruz Bay',
    tz: 'America/St_Thomas',
    highlights: [
      'Virgin Islands National Park (Maho Bay)',
      'Honeymoon Beach — St. John',
      'Peter Bay Beach',
      'Panorama of Cruz Bay',
    ],
    intro: [
      'Two-thirds of St. John is national park, so a radius over its north shore is a park wall in the truest sense: thirteen beach cameras, including one the catalogue names for the park itself — Maho Bay, where the turtles graze the seagrass in water the camera looks over. Honeymoon Beach, Peter Bay, the Lovango shore and Cruz Bay’s panorama fill out the set.',
      'These are resort-and-beach webcams (SkylineWebcams’ Caribbean network), not park-service feeds, and the page labels them so. But their ground is the park’s: the north-shore bays of St. John are Virgin Islands National Park shoreline, protected since 1956, and the cameras show them live — trades, squalls, and that impossible gradient of blues.',
    ],
    watch:
      'East-facing bays take the sunrise; Cruz Bay faces the sunset over St. Thomas. Squall lines cross the wall in minutes — watch the Maho Bay camera darken from the east and you are watching the trades arrive. Turtle odds at Maho are best in the calm morning water.',
    faqs: [
      {
        q: 'Is the Maho Bay camera inside the national park?',
        a: 'Maho Bay is park shoreline — the bay and its beach lie within Virgin Islands National Park, and the catalogue’s camera there is named for the park. Most of St. John’s north shore in this wall is park land; the beaches are the park’s most visited places.',
      },
      {
        q: 'Which beach camera is best for sunset?',
        a: 'Cruz Bay — the panorama faces west across Pillsbury Sound to St. Thomas, and it is the wall’s sunset seat. The north-shore park bays (Maho, Honeymoon) are morning cameras.',
      },
    ],
  },
  {
    slug: 'hawaii-volcanoes',
    name: "Hawaiʻi Volcanoes National Park",
    short: 'Hawaiʻi Volcanoes',
    state: 'Hawaii',
    region: 'HI',
    scopeKey: 'park-hawaii-volcanoes',
    lat: 19.4069,
    lng: -155.2834,
    radiusKm: 30,
    centreLabel: 'Kīlauea’s summit caldera',
    gateway: 'Volcano village',
    tz: 'Pacific/Honolulu',
    highlights: ['Holei Pali FAA cameras'],
    intro: [
      'This wall is honest about its geometry: it is centred on Kīlauea’s summit, but the cameras it holds stand down the mountain — four FAA cameras at Holei Pali, on the Chain of Craters Road inside the park where the lava fields meet the sea cliffs, and research phenocams in the wet forest above. Nine cameras in all, and none of them is a crater-rim lava cam.',
      'For the crater itself, WorldEye’s volcano wall follows Kīlauea with the USGS Hawaiian Volcano Observatory’s published views — that page is linked below, and it is the right seat during an eruption episode. This page is the park around the volcano: the coast road, the pali, the rainforest weather that decides what the summit is doing.',
    ],
    watch:
      'Holei Pali reads the park’s two climates at once — summit vog and cloud above, the dry lava coast below. During eruption episodes the summit action is on the volcano wall; this wall shows the park receiving it: gas drift, coast weather, and the Chain of Craters Road in real time.',
    faqs: [
      {
        q: 'Can I watch the Kīlauea eruption live from this page?',
        a: 'The eruption cameras live on WorldEye’s volcano webcams page, which follows Kīlauea’s summit with the observatory feeds — follow the link below. This park page’s wall is the wider park: Holei Pali on the Chain of Craters Road and the forest phenocams. During episodes, watch both.',
      },
      {
        q: 'What is Holei Pali?',
        a: 'The great sea-cliff escarpment where Kīlauea’s south flank drops to the coast, crossed by the Chain of Craters Road inside the park. The FAA cameras there are aviation weather instruments; their view — lava fields, pali and ocean — is the park’s coastal country.',
      },
    ],
  },
  {
    slug: 'zion',
    name: 'Zion National Park',
    short: 'Zion',
    state: 'Utah',
    region: 'UT',
    scopeKey: 'park-zion',
    lat: 37.2982,
    lng: -113.0263,
    radiusKm: 25,
    centreLabel: 'Zion Canyon',
    gateway: 'Springdale',
    tz: 'America/Denver',
    highlights: ['Zion Park Boulevard, Springdale (SR-9)'],
    intro: [
      'Zion’s wall is a corridor, and the page names it as one: fifteen Utah DOT cameras on SR-9, the road that climbs from I-15 through Springdale — the park’s gateway town, whose main street is Zion Park Boulevard — to the south entrance and through the park’s east side. The nearest cameras stand in Springdale itself, a dozen kilometres of red-rock road from the canyon.',
      'No camera in the catalogue stands inside Zion Canyon, and none points at the Narrows or Angels Landing. What this wall watches is the park’s lifeline: the shuttle-town streets, the entrance corridor in flash-flood weather, and the east-side road under snow. For a park whose dangers arrive by road and weather, that is a genuinely useful set of eyes.',
    ],
    watch:
      'The Springdale cameras are the flash-flood tell: summer monsoon cells build over the canyon in the afternoon, and SR-9 shows the storm arriving before the washes rise. In winter they read the east side’s snow line on the Zion–Mt. Carmel road.',
    faqs: [
      {
        q: 'Is there a webcam inside Zion Canyon?',
        a: 'Not in the catalogue — no camera here stands in the canyon or on the shuttle route. The wall is SR-9: Springdale’s Zion Park Boulevard cameras at the park’s doorstep and the corridor roads. The page labels them as road cameras because that is what they are.',
      },
      {
        q: 'Can I check Zion’s weather on these cameras?',
        a: 'Yes — that is their best use. The Springdale and SR-9 cameras show the canyon country’s weather live: monsoon buildups, snow on the east side, and the road state on the only routes into the park.',
      },
    ],
  },
  {
    slug: 'arches',
    name: 'Arches National Park',
    short: 'Arches',
    state: 'Utah',
    region: 'UT',
    scopeKey: 'park-arches',
    lat: 38.7331,
    lng: -109.5925,
    radiusKm: 25,
    centreLabel: 'the park’s entrance country',
    gateway: 'Moab',
    tz: 'America/Denver',
    highlights: ['Arches Entrance Road (NPS-listed UDOT camera)'],
    intro: [
      'One camera in this wall belongs to the park’s own ground — the entrance-road camera at the junction where US-191 meets the Arches entrance, catalogued under the park’s name — and the rest is Moab: the red-rock gateway town five minutes south, its Main Street lined with Utah DOT cameras, and the US-191 corridor that serves both Arches and Canyonlands.',
      'The framing is the honest one: Arches is a drive-in park with a timed-entry gate, and its lived experience starts on that entrance road and in Moab’s streets. The wall watches both — the gate approach, the town at dinner hour, and the desert highway under the La Sal Mountains’ weather.',
    ],
    watch:
      'Moab light is a photographer’s argument for dawn: check the entrance camera early for the queue and the La Sal weather together. In summer the wall’s real subject is heat shimmer and the monsoon cells that build over the La Sals by afternoon.',
    faqs: [
      {
        q: 'Is there a webcam at Delicate Arch?',
        a: 'No — no camera in the catalogue stands at any arch. The wall’s park camera is at the Arches entrance road; the rest are Moab and US-191. Delicate Arch remains, as ever, a walk-in view.',
      },
      {
        q: 'Can I see the entrance queue?',
        a: 'The entrance-road camera at the US-191 junction is the closest live read on the gate approach. Timed-entry days fill early; the camera shows the corridor as it is, and Moab’s Main Street cameras show the town absorbing the same crowd.',
      },
    ],
  },
  {
    slug: 'bryce-canyon',
    name: 'Bryce Canyon National Park',
    short: 'Bryce Canyon',
    state: 'Utah',
    region: 'UT',
    scopeKey: 'park-bryce-canyon',
    lat: 37.6284,
    lng: -112.1676,
    radiusKm: 25,
    centreLabel: 'the Bryce amphitheatre rim',
    gateway: 'Bryce Canyon City',
    tz: 'America/Denver',
    highlights: ['Main Street, Bryce Canyon City (SR-63)'],
    intro: [
      'Five Utah DOT cameras make this wall, and their geography is the park’s: SR-63 is Bryce Canyon’s own entrance road, and the nearest camera stands on Main Street in Bryce Canyon City — the gateway settlement at the park gate, 5 km from the rim — with the rest along SR-12, the scenic byway that delivers the park.',
      'There is no hoodoo camera in the catalogue; the amphitheatre itself has no public feed here. What the wall gives is the rim country’s weather at 2,400–2,700 metres — snow when the valleys have rain, the famous cold, clear dawns — read from the road you will drive to the viewpoints.',
    ],
    watch:
      'Bryce is a sunrise park — the amphitheatre faces east — and its gateway cameras tell you at 5 a.m. whether the rim is clear or in cloud. Winter is the wall’s drama: SR-63 and SR-12 in a storm, at the highest road elevations in Utah’s park country.',
    faqs: [
      {
        q: 'Is there a webcam looking into the Bryce amphitheatre?',
        a: 'Not in the catalogue. The wall’s cameras are on SR-63 (the park entrance road) in Bryce Canyon City and on SR-12 — gateway and approach views. The hoodoos themselves have no public feed here.',
      },
      {
        q: 'Why include Bryce with only road cameras?',
        a: 'Because SR-63 is the park’s own road and Bryce Canyon City is its gate — the wall is anchored at the entrance, not in a distant town. It is labelled a thin wall, and its job is the rim country’s weather and road state, stated plainly.',
      },
    ],
  },
  {
    slug: 'black-canyon-of-the-gunnison',
    name: 'Black Canyon of the Gunnison National Park',
    short: 'Black Canyon of the Gunnison',
    state: 'Colorado',
    region: 'CO',
    scopeKey: 'park-black-canyon',
    lat: 38.5746,
    lng: -107.7416,
    radiusKm: 25,
    centreLabel: 'the South Rim',
    gateway: 'Montrose',
    tz: 'America/Denver',
    highlights: ['Gunnison Point'],
    intro: [
      'The thinnest wall in this directory that still earns its page, because its anchor is real: Gunnison Point, a National Park Service camera on the South Rim looking into the Black Canyon’s painted wall country. Three Colorado highway cameras on US-50 through Montrose, the gateway town 20 km west, complete the four.',
      'Black Canyon is one of the least-visited parks in the system — a 600-metre slot of black gneiss that swallows light — and its single park camera is a genuine rarity. The wall is presented as what it is: one rim view and its approach road, for the travellers who plan around this park precisely because it is empty.',
    ],
    watch:
      'The canyon is a light-and-shadow instrument: morning sun strikes the Painted Wall side while the depths stay black. The Gunnison Point camera at dawn is the park in one frame — and in winter it reads the South Rim road’s snow before you leave Montrose.',
    faqs: [
      {
        q: 'What does the Gunnison Point camera show?',
        a: 'The view from Gunnison Point on the South Rim — across the canyon to the Painted Wall, the tallest cliff in Colorado. It is the park-service camera for the park, and the only in-park feed in the catalogue for Black Canyon.',
      },
      {
        q: 'Is the North Rim covered?',
        a: 'No — the North Rim (reached from Crawford, on the canyon’s far side) has no catalogue camera. The wall is the South Rim and the Montrose approach, which is also how most visitors arrive.',
      },
    ],
  },
  {
    slug: 'shenandoah',
    name: 'Shenandoah National Park',
    short: 'Shenandoah',
    state: 'Virginia',
    region: 'VA',
    scopeKey: 'park-shenandoah',
    lat: 38.473,
    lng: -78.452,
    radiusKm: 40,
    centreLabel: 'Skyline Drive’s mid-point',
    gateway: 'the Skyline Drive gateways',
    tz: 'America/New_York',
    highlights: ['Pinnacles Viewpoint, Shenandoah National Park'],
    intro: [
      'Shenandoah is a road park — 169 km of Skyline Drive along the Blue Ridge crest — and its wall is built the same way: a phenocam viewpoint actually on Skyline Drive at the Pinnacles, Virginia’s cameras where US-211 meets the Drive at Thornton Gap, and then the valley floor the Drive looks down on, I-81 and the Shenandoah Valley towns.',
      'Seventeen cameras sounds like plenty until you read the labels, which the page insists on: one is on the Drive itself, the gateways are the park’s front doors, and the valley cameras are the view’s foreground, not the park. Together they do a real job — the Blue Ridge in fog is a different park from the Blue Ridge in October sun, and this wall shows which one is open today.',
    ],
    watch:
      'Fall is the wall’s season: the Pinnacles viewpoint reads the colour line as it descends the ridge through October. Year-round, the Drive’s fog is the thing to check — the crest can sit in cloud above a clear valley, and the gateway cameras show the exact altitude where the world goes white.',
    faqs: [
      {
        q: 'Is any camera actually on Skyline Drive?',
        a: 'Yes — the Pinnacles Viewpoint phenocam stands on Skyline Drive inside the park (it is a research camera, and its subject is the ridge’s own canopy and weather). The US-211 cameras sit at Thornton Gap, where the highway meets the Drive.',
      },
      {
        q: 'Why are there Interstate 81 cameras on a park page?',
        a: 'Because the wall’s stated rule is every camera within 40 km of Skyline Drive’s mid-point, and I-81 runs the valley the Drive overlooks. They are labelled as valley cameras — useful for the drive to the park and for reading valley-versus-ridge weather — never as park views.',
      },
    ],
  },
  {
    slug: 'olympic',
    name: 'Olympic National Park',
    short: 'Olympic',
    state: 'Washington',
    region: 'WA',
    scopeKey: 'park-olympic',
    lat: 47.9694,
    lng: -123.4968,
    radiusKm: 25,
    centreLabel: 'Hurricane Ridge',
    gateway: 'Port Angeles',
    tz: 'America/Los_Angeles',
    highlights: ['Hurricane Ridge'],
    intro: [
      'Olympic is three parks in one — alpine ridge, rainforest, wild coast — spread around a roadless interior, and its wall is honestly just the first of them: the National Park Service’s Hurricane Ridge camera, at 1,600 metres above Port Angeles, with the town’s US-101 and airport cameras below it as the approach.',
      'The rainforest valleys (Hoh, Quinault) and the coast (Rialto, Kalaloch) contribute no catalogue cameras, and the page will not borrow Port Angeles street views and call them rainforest. What stands here is the ridge — the park’s most visited viewpoint, with the Strait of Juan de Fuca and the Bailey Range in one frame — and its gateway.',
    ],
    watch:
      'Hurricane Ridge is named for its weather; the camera is the check before the 27-km climb from Port Angeles, and the pair of them — town clear, ridge in a gale, or the famous inversion with the ridge above a sea of cloud — is the wall’s whole argument. Winter weekends, the ridge road opens only when the plows win; the camera shows the score.',
    faqs: [
      {
        q: 'Is there a webcam in the Hoh Rainforest?',
        a: 'Not in the catalogue. Olympic’s one park-service camera is Hurricane Ridge, and this wall is the ridge plus its Port Angeles gateway. The rainforest and coast have no public feeds here — a gap this page names rather than papers over.',
      },
      {
        q: 'Can I check the Hurricane Ridge road?',
        a: 'The ridge camera shows conditions at the top, and the Port Angeles cameras show the bottom of the climb. In winter the road is plowed on a limited schedule; the two views together are the practical check before you go.',
      },
    ],
  },
];

export const PARK_BY_SLUG = new Map(NATIONAL_PARKS.map((p) => [p.slug, p]));

export function parkBySlug(slug: string): NationalPark | null {
  return PARK_BY_SLUG.get(slug) ?? null;
}

/* ------------------------------------------------------------------ */
/* Sun times (best-time-to-watch), from lib/sunrise's exact math       */
/* ------------------------------------------------------------------ */

function localDateKey(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export interface ParkSunTimes {
  sunrise: Date | null;
  sunset: Date | null;
  /** Formatted in the park's timezone, e.g. "6:41 AM". */
  sunriseText: string | null;
  sunsetText: string | null;
  /** Daylight length, e.g. "11 h 24 min". */
  dayLengthText: string | null;
}

/**
 * Today's sunrise and sunset at a place, computed with the repo's
 * solar math (lib/sunrise) and rendered in the place's own timezone.
 * Scans the day's crossings and keeps the ones that fall on today's
 * local date; nulls only where the sun never crosses (polar day/night)
 * — no park in the registry is that far north, but the type stays
 * honest.
 */
export function parkSunTimes(
  lat: number,
  lng: number,
  tz: string,
  now: Date = new Date(),
): ParkSunTimes {
  const todayKey = localDateKey(now, tz);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
  });
  const collect = (mode: 'sunrise' | 'sunset'): Date | null => {
    const found: number[] = [];
    // Probe from several bases across ±1 day; keep crossings that land
    // on today's local date, then take the earliest.
    for (const h of [-18, -6, 6, 18, 30]) {
      const base = new Date(now.getTime() + h * 3600_000);
      const off = sunEventOffsetMinutes(lat, lng, base, mode);
      if (off === null) continue;
      const instant = new Date(sunEventIso(base, off));
      if (localDateKey(instant, tz) === todayKey) found.push(instant.getTime());
    }
    if (found.length === 0) return null;
    return new Date(Math.min(...found));
  };
  const sunrise = collect('sunrise');
  const sunset = collect('sunset');
  let dayLengthText: string | null = null;
  if (sunrise && sunset && sunset > sunrise) {
    const mins = Math.round((sunset.getTime() - sunrise.getTime()) / 60000);
    dayLengthText = `${Math.floor(mins / 60)} h ${String(mins % 60).padStart(2, '0')} min`;
  }
  return {
    sunrise,
    sunset,
    sunriseText: sunrise ? fmt.format(sunrise) : null,
    sunsetText: sunset ? fmt.format(sunset) : null,
    dayLengthText,
  };
}
