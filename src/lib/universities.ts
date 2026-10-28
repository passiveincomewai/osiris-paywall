/**
 * University campus pages (Menu #2 Wave B, 2026-10-27) — the audited
 * registry behind /university-webcams and its per-university pages.
 *
 * The rule for a page: the camera's OWN data must name the institution
 * AND make the campus the subject — a camera on the campus, on a named
 * campus building, or at the university's named gate/entrance. Street,
 * junction, station and hospital cameras that merely carry a
 * university's name ("University Ave", "near X College", a university
 * hospital intersection) are road cameras and were rejected, as were
 * off-campus field and research stations however the institution names
 * them. The audit's rejections are listed in the build report; the
 * tests here pin the accept side: every id exists in the raw chunks
 * (src/data/countries/*.json, catalogue generated 2026-10-20), and
 * every record's name contains the institution token the page claims.
 *
 * The honest yield is modest — 25 institutions, 31 cameras — and the
 * mix is what the catalogue actually holds: PhenoCam research cameras
 * mounted on campus buildings, FAA weather cameras on one California
 * campus, and Korean municipal CCTV whose subject is a university
 * gate. Copy states which kind each page's cameras are; nothing here
 * claims a webcam the data doesn't name.
 */

export interface UniversityFaq {
  q: string;
  a: string;
}

export interface University {
  slug: string;
  /** Institution name, spelled as the records spell it. */
  name: string;
  /** Short name for link labels. */
  short: string;
  /** Place label built from the records' own name/city fields. */
  place: string;
  country: string;
  countrySlug: string;
  /** Catalogue chunk the pinned records live in. */
  chunk: string;
  /** The audited catalogue record ids this page serves. */
  ids: string[];
  /** Substring every pinned record's name must contain — the audit's
   *  evidence that the camera's own data names the institution. */
  token: string;
  /** Verified /city-webcams slug for the institution's city, when a
   *  city page exists (src/data/city-pages.json + the curated tier +
   *  the New York flagship route). Pinned by the tests. */
  citySlug?: string;
  cityName?: string;
  lat: number;
  lng: number;
  intro: [string, string];
  faqs: UniversityFaq[];
}

const UNIVERSITIES_US: University[] = [
  {
    slug: "uc-santa-barbara",
    name: "UC Santa Barbara",
    short: "UCSB",
    place: "Santa Barbara, California",
    country: "United States",
    countrySlug: "united-states",
    chunk: "united-states",
    ids: ["faa-12725", "faa-12726", "faa-12727", "faa-12728"],
    token: "UCSB",
    lat: 34.41567,
    lng: -119.84525,
    intro: [
      "Four cameras, one campus: the catalogue's UCSB set comes from the FAA WeatherCams network, filed under the plainest possible name — UCSB Campus — in four directions: Camera 1 (North), Camera 2 (East), Camera 3 (West) and Camera 4 (NorthWest). Weather cameras first and campus views by the same token: the university's point on the Santa Barbara coast, in four bearings.",
      "It is the richest campus set in this directory — most universities here are a single research camera — and the only one flown by an aviation network. The record's city field spells the town 'Sanda Barbara'; the campus, and this page, use the name the university itself answers to.",
    ],
    faqs: [
      {
        q: "Why does a university have FAA weather cameras?",
        a: "The FAA WeatherCams network publishes cameras for aviation weather awareness, and four of its units are filed on the UCSB campus — named UCSB Campus in the catalogue, looking north, east, west and northwest.",
      },
    ],
  },
  {
    slug: "vanderbilt-university",
    name: "Vanderbilt University",
    short: "Vanderbilt",
    place: "Nashville, Tennessee",
    country: "United States",
    countrySlug: "united-states",
    chunk: "united-states",
    ids: ["occ-phenocam-vandy"],
    token: "Vanderbilt University",
    citySlug: "nashville",
    cityName: "Nashville",
    lat: 36.1429,
    lng: -86.7973,
    intro: [
      "Vanderbilt's catalogue camera is a PhenoCam research unit on the Peabody campus — the record names it exactly: 'Peabody campus, Vanderbilt University'. PhenoCam cameras photograph the same view on a research schedule to track vegetation through the seasons, so this is a campus watched the way scientists watch it: canopy, season, change.",
      "One camera, honestly stated. Peabody is Vanderbilt's education and human development campus in Nashville, and the view the record describes is the campus green itself — the page shows the camera, its Nashville city page carries the wider city.",
    ],
    faqs: [
      {
        q: "What is a PhenoCam?",
        a: "A camera in the PhenoCam research network: it photographs a fixed view of vegetation repeatedly so researchers can measure seasonal change — leaf-out, colour, leaf-fall. Several campus pages in this directory are PhenoCams, and each says so.",
      },
    ],
  },
  {
    slug: "columbia-university",
    name: "Columbia University — Lamont-Doherty Earth Observatory",
    short: "Columbia (Lamont-Doherty)",
    place: "Palisades, New York",
    country: "United States",
    countrySlug: "united-states",
    chunk: "united-states",
    ids: ["occ-phenocam-ldeocam"],
    token: "Columbia University",
    lat: 41.0039,
    lng: -73.9053,
    intro: [
      "Columbia's camera sits not on the Morningside Heights campus but on the university's other great campus: the Lamont-Doherty Earth Observatory in Palisades, New York. The record describes itself at length — a south-facing view over the Palisades Interstate Park's oak-maple forest, from the observatory campus above the Hudson.",
      "It is an earth-science campus watching an earth-science subject: the forest of the Palisades, photographed as PhenoCam research. The catalogue's city field says Bronx; the record's own description and coordinates say Palisades, and the page follows the description.",
    ],
    faqs: [
      {
        q: "Is this Columbia's main campus?",
        a: "No — it is the Lamont-Doherty Earth Observatory, Columbia's earth-science campus in Palisades, NY. The directory holds no camera on the Morningside Heights campus, and the page doesn't imply one.",
      },
    ],
  },
  {
    slug: "boston-university",
    name: "Boston University",
    short: "Boston University",
    place: "Boston, Massachusetts",
    country: "United States",
    countrySlug: "united-states",
    chunk: "united-states",
    ids: ["occ-phenocam-bostonu"],
    token: "Boston University",
    lat: 42.35041,
    lng: -71.10438,
    intro: [
      "'Boston University, Charles River Esplanade, Boston, Massachusetts' — the record's own full name for its PhenoCam, mounted to watch the Esplanade where the campus meets the Charles River. The catalogue's city field files it under Cambridge, across the water; the name and the coordinates both put it on the Boston bank, on the university.",
      "The Esplanade view is the campus's front porch: river, paths and the tree canopy the research camera is really there to measure, season by season.",
    ],
    faqs: [
      {
        q: "Why does the catalogue say Cambridge?",
        a: "The record's city field reads Cambridge, but its name says Boston University, Charles River Esplanade, Boston — and its coordinates sit on the Boston side of the Charles. The page follows the name and the coordinates and flags the field here.",
      },
    ],
  },
  {
    slug: "furman-university",
    name: "Furman University",
    short: "Furman",
    place: "Greenville, South Carolina",
    country: "United States",
    countrySlug: "united-states",
    chunk: "united-states",
    ids: ["occ-phenocam-furmanpheno"],
    token: "Furman University",
    citySlug: "greenville",
    cityName: "Greenville",
    lat: 34.9198,
    lng: -82.4379,
    intro: [
      "Furman's camera has the best seat of any in this directory: the roof of Paladin Stadium. The record names it plainly — 'Paladin Stadium (roof access), Furman University, Greenville, South Carolina' — a PhenoCam whose research view takes in the campus and its trees from above the football field.",
      "One camera, one stadium roof, one campus in the South Carolina foothills. Greenville's own city page carries the rest of the town; this page is the university's single, high vantage.",
    ],
    faqs: [
      {
        q: "Where exactly is the Furman camera?",
        a: "On the roof of Paladin Stadium, the university's football stadium — the record says 'roof access' in its own name. It photographs the campus landscape as part of the PhenoCam network.",
      },
    ],
  },
  {
    slug: "michigan-state-university",
    name: "Michigan State University",
    short: "Michigan State",
    place: "East Lansing, Michigan",
    country: "United States",
    countrySlug: "united-states",
    chunk: "united-states",
    ids: ["occ-phenocam-sanford"],
    token: "Michigan State University",
    lat: 42.72678,
    lng: -84.46448,
    intro: [
      "Michigan State's camera watches the Sanford Natural Area — the record names it 'Sanford Natural Area, Michigan State University, East Lansing, Michigan': a protected woodland on the university's own campus, along the Red Cedar River, kept as a living laboratory in the middle of a very large university.",
      "A natural area is a PhenoCam's natural subject — the camera's work is the woodland's seasons. The page serves that single research camera and says plainly that the campus's one catalogued eye is pointed at its trees.",
    ],
    faqs: [
      {
        q: "What is the Sanford Natural Area?",
        a: "A protected natural area on Michigan State's East Lansing campus — the university keeps it as a teaching and research woodland, and the catalogue's MSU camera is its PhenoCam.",
      },
    ],
  },
  {
    slug: "west-virginia-university",
    name: "West Virginia University",
    short: "West Virginia",
    place: "Granville, West Virginia",
    country: "United States",
    countrySlug: "united-states",
    chunk: "united-states",
    ids: ["occ-phenocam-wvuarboretum"],
    token: "West Virginia University",
    lat: 39.6456,
    lng: -79.9858,
    intro: [
      "The record is three words of institution and one of place: 'West Virginia University Arboretum'. The university's arboretum — its tree collection and woodland grounds in Morgantown, filed by the catalogue under neighbouring Granville — hosts a PhenoCam, and that camera is this page.",
      "An arboretum camera is a phenology camera by birth: the collection exists to be watched through seasons. One camera, honestly framed, in the university's own woods.",
    ],
    faqs: [
      {
        q: "Why does the catalogue file the arboretum under Granville?",
        a: "Granville is the borough at Morgantown's edge where the catalogue places the record; the arboretum is West Virginia University's, on its Morgantown grounds. The page carries the record's place and the university's name, and flags the filing here.",
      },
    ],
  },
  {
    slug: "warren-wilson-college",
    name: "Warren Wilson College",
    short: "Warren Wilson",
    place: "Swannanoa, North Carolina",
    country: "United States",
    countrySlug: "united-states",
    chunk: "united-states",
    ids: ["occ-phenocam-warrenwilson"],
    token: "Warren Wilson College",
    lat: 35.6069,
    lng: -82.4421,
    intro: [
      "'Warren Wilson College, Swannanoa, NC' — the record's whole name, and the whole story: a PhenoCam on the campus of a small work college in the Swannanoa Valley, in North Carolina's Blue Ridge country outside Asheville. A college whose identity is its farm, garden and forest land is a natural home for a landscape research camera.",
      "The catalogue's city field says Asheville; the record's name says Swannanoa, where the college actually sits, and the page follows the name.",
    ],
    faqs: [
      {
        q: "Is Warren Wilson College in Asheville?",
        a: "The college is in Swannanoa, in the valley just east of Asheville — the record's name says Swannanoa even though the catalogue's city field says Asheville. The camera is on the college's campus either way.",
      },
    ],
  },
  {
    slug: "worcester-state-university",
    name: "Worcester State University",
    short: "Worcester State",
    place: "Worcester, Massachusetts",
    country: "United States",
    countrySlug: "united-states",
    chunk: "united-states",
    ids: ["occ-phenocam-worcester"],
    token: "Worcester State University",
    lat: 42.2697,
    lng: -71.8428,
    intro: [
      "'Worcester State University, Worcester, Massachusetts' — a PhenoCam named for the university in full, on its campus in Worcester. The catalogue's city field files it under the state rather than the city; the name is unambiguous, and the coordinates sit on the campus.",
      "One research camera for a public university in New England: the view is the campus landscape, kept on a research schedule, season over season.",
    ],
    faqs: [
      {
        q: "What does the Worcester State camera watch?",
        a: "The campus landscape — it is a PhenoCam network camera, photographing its fixed view repeatedly for vegetation research. The page presents it as exactly that.",
      },
    ],
  },
  {
    slug: "university-of-hawaii-manoa",
    name: "University of Hawaiʻi at Mānoa",
    short: "UH Mānoa",
    place: "Honolulu, Hawaiʻi",
    country: "United States",
    countrySlug: "united-states",
    chunk: "united-states",
    ids: ["occ-phenocam-waahila"],
    token: "University of Hawaii at Manoa",
    lat: 21.3017,
    lng: -157.8152,
    intro: [
      "The record names the ridge and the university together: 'Waahila Ridge, University of Hawaii at Manoa, Honolulu, Hawaii'. Waahila Ridge rises behind the Mānoa campus, and its camera — a PhenoCam — looks out from the ridge the university's valley is folded into.",
      "Honolulu weather is a campus amenity and a research subject at once: trade-wind cloud, valley rain and ridge sun, photographed on schedule. One camera, on the ridge, named for the university below it.",
    ],
    faqs: [
      {
        q: "Where is Waahila Ridge?",
        a: "Above Mānoa Valley in Honolulu, behind the University of Hawaiʻi at Mānoa campus — the record names ridge and university together, and its coordinates sit on the ridge.",
      },
    ],
  },
  {
    slug: "navajo-technical-university",
    name: "Navajo Technical University",
    short: "Navajo Tech",
    place: "Crownpoint, New Mexico",
    country: "United States",
    countrySlug: "united-states",
    chunk: "united-states",
    ids: ["occ-phenocam-ntucrownpoint"],
    token: "Navajo Technical University",
    lat: 35.6858,
    lng: -108.1457,
    intro: [
      "'Navajo Technical University, Crown Point, New Mexico' — a PhenoCam on the campus of the Navajo Nation's technical university in Crownpoint, in the high desert of northwest New Mexico. The record spells the town in two words; the town itself writes it as one, Crownpoint.",
      "Desert phenology is a study in patience — piñon, juniper and long light — and this single camera is the directory's only window on the campus. It is served here as what it is: the university's own-named research camera.",
    ],
    faqs: [
      {
        q: "Where is Navajo Technical University?",
        a: "In Crownpoint, New Mexico, the Navajo Nation's agency town in McKinley County — the record names the university and the town, and the camera sits on the campus.",
      },
    ],
  },
  {
    slug: "cuny",
    name: "CUNY — Advanced Science Research Center",
    short: "CUNY ASRC",
    place: "New York City, New York",
    country: "United States",
    countrySlug: "united-states",
    chunk: "united-states",
    ids: ["occ-phenocam-cuny"],
    token: "CUNY",
    citySlug: "new-york-city",
    cityName: "New York City",
    lat: 40.8162,
    lng: -73.9507,
    intro: [
      "'CUNY Advanced Science Research Center, New York City, New York' — the City University of New York's research center on the City College campus in Harlem carries the catalogue's New York campus camera, a PhenoCam filed, for reasons of its own, under Teaneck, New Jersey. The coordinates tell the truth: Manhattan, on the campus.",
      "One research camera for the largest urban public university in the United States, watching the city from a science building. New York's flagship city page carries the other several thousand cameras; this one belongs to CUNY.",
    ],
    faqs: [
      {
        q: "Why does the catalogue say Teaneck?",
        a: "The record's city field reads Teaneck, but its name says New York City and its coordinates sit in Harlem, Manhattan, at the CUNY Advanced Science Research Center. The page follows the name and the coordinates.",
      },
    ],
  },
];

const UNIVERSITIES_INTERNATIONAL: University[] = [
  {
    slug: "university-of-twente",
    name: "University of Twente",
    short: "Twente",
    place: "Enschede, Netherlands",
    country: "Netherlands",
    countrySlug: "netherlands",
    chunk: "netherlands",
    ids: ["occ-phenocam-utwente1", "occ-phenocam-utwente2"],
    token: "University of Twente",
    lat: 52.24008,
    lng: 6.8501,
    intro: [
      "Twente is the directory's only two-camera European campus, and both records name their buildings: 'Campus of University of Twente, Building de Spiegel' and 'University of Twente, Building de Horst'. Two PhenoCams on two campus buildings in Enschede — one watching mixed vegetation, one the mixed forest at the campus edge.",
      "The University of Twente's campus is a genuine campus in the park-like sense — a single green site outside Enschede — and its pair of research cameras watch it the way the network watches: same views, every season, on schedule.",
    ],
    faqs: [
      {
        q: "What are de Spiegel and de Horst?",
        a: "Buildings on the University of Twente campus in Enschede — both PhenoCam records name their building in full, which is what qualifies them for this page: the camera's own data puts it on a named campus building.",
      },
    ],
  },
  {
    slug: "newcastle-university",
    name: "Newcastle University",
    short: "Newcastle",
    place: "Newcastle upon Tyne, England",
    country: "United Kingdom",
    countrySlug: "united-kingdom",
    chunk: "united-kingdom",
    ids: ["occ-phenocam-newcastleuni"],
    token: "Newcastle University",
    citySlug: "newcastle",
    cityName: "Newcastle",
    lat: 54.9824,
    lng: -1.6144,
    intro: [
      "'Stephenson Building, Newcastle University, Newcastle upon Tyne' — the record's own words, building first. Newcastle's engineering building carries the university's PhenoCam, and the catalogue files the record under Haymarket, the city-centre district the campus stands in.",
      "One camera on one named building: the smallest honest unit of a campus page, and exactly what this directory's rule asks for — the institution named by the camera's own data, on the building the data names.",
    ],
    faqs: [
      {
        q: "What is the Stephenson Building?",
        a: "Newcastle University's engineering building, named in the camera's own record — the PhenoCam is mounted there, on the city-centre campus in Newcastle upon Tyne.",
      },
    ],
  },
  {
    slug: "university-of-bristol",
    name: "University of Bristol",
    short: "Bristol",
    place: "Bristol, England",
    country: "United Kingdom",
    countrySlug: "united-kingdom",
    chunk: "united-kingdom",
    ids: ["occ-phenocam-bristoluni"],
    token: "University of Bristol",
    lat: 51.4566,
    lng: -2.6023,
    intro: [
      "'University of Bristol Engineering Building' — the record wastes no words, and neither does the camera's placement: a PhenoCam on the engineering building of Bristol's city-centre campus. One camera, one building, the institution named in the data itself.",
      "Bristol has no city page in this directory yet, so the page links the country index instead — the camera, not the link graph, is what earned the page.",
    ],
    faqs: [
      {
        q: "Where is the Bristol camera mounted?",
        a: "On the University of Bristol's Engineering Building, as the record's name states — a PhenoCam photographing its view on a research schedule.",
      },
    ],
  },
  {
    slug: "tu-berlin",
    name: "Technische Universität Berlin",
    short: "TU Berlin",
    place: "Berlin, Germany",
    country: "Germany",
    countrySlug: "germany",
    chunk: "germany",
    ids: ["occ-phenocam-tubberurb"],
    token: "Technical University of Berlin",
    lat: 52.51228,
    lng: 13.32786,
    intro: [
      "The record gives the institution in English and the research subject in two more words: 'Technical University of Berlin, Urban Vegetation, Berlin'. A PhenoCam studying the city's green from the technical university's Charlottenburg campus — urban phenology, watched from the university that studies it.",
      "Germany's catalogue is enormous and almost entirely road cameras named for junctions; this single record is the exception that names a university and sits on it.",
    ],
    faqs: [
      {
        q: "What does 'urban vegetation' mean in the record?",
        a: "It is the PhenoCam's research subject: the camera photographs the vegetation in its view repeatedly so researchers can track the city's seasons. The record names the university and the subject together.",
      },
    ],
  },
  {
    slug: "bucharest-university-of-economic-studies",
    name: "Bucharest University of Economic Studies",
    short: "ASE Bucharest",
    place: "Bucharest, Romania",
    country: "Romania",
    countrySlug: "romania",
    chunk: "romania",
    ids: ["occ-windy-1793909045"],
    token: "University-of-Economic-Studies",
    lat: 44.44755,
    lng: 26.0977,
    intro: [
      "Bucharest's camera is a rooftop view with the institution in its name: 'Bucharest-University-of-Economic-Studies - Piata Romana - Bulevardul General Gheorghe Magheru', a Windy-carried camera at Piața Romană, where the Academy of Economic Studies' main building stands over one of the city centre's great squares.",
      "It is a city-view camera rather than a research unit — the square, the boulevard and the university building together. The record names the institution itself, which is this directory's whole test; most of Bucharest's thousands of cameras name only streets.",
    ],
    faqs: [
      {
        q: "What is Piața Romană?",
        a: "A major square in central Bucharest on Bulevardul Magheru — the Academy of Economic Studies' historic main building stands on it, and the camera's record names square, boulevard and university together.",
      },
    ],
  },
  {
    slug: "ansan-university",
    name: "Ansan University",
    short: "Ansan University",
    place: "Ansan, South Korea",
    country: "South Korea",
    countrySlug: "south-korea",
    chunk: "south-korea",
    ids: ["occ-ansan-CC0051000"],
    token: "Ansan University",
    citySlug: "ansan",
    cityName: "Ansan",
    lat: 37.30889,
    lng: 126.86794,
    intro: [
      "Korea's municipal camera networks name their cameras for what they watch, and Ansan's network has one named for the university itself: 'Ansan University, Ansan'. A city camera whose subject is the campus — the first of eight Korean institutions in this directory, every one admitted by the same rule: the institution's name is the camera's own.",
      "Ansan's city page carries the rest of the city's cameras; this page is the single frame the city keeps on its university.",
    ],
    faqs: [
      {
        q: "Whose camera is this?",
        a: "The city of Ansan's municipal camera network — the record's source is the Ansan network, and its name is the university. Campus-subject city cameras are a Korean pattern in this catalogue; each is labelled with its network.",
      },
    ],
  },
  {
    slug: "dongeui-university",
    name: "Dongeui University",
    short: "Dongeui",
    place: "Busan, South Korea",
    country: "South Korea",
    countrySlug: "south-korea",
    chunk: "south-korea",
    ids: ["occ-busan-CTV0000032", "occ-busan-CTV0000033"],
    token: "Dongeui University",
    citySlug: "busan",
    cityName: "Busan",
    lat: 35.15433,
    lng: 129.03251,
    intro: [
      "Busan's city network keeps two cameras on Dongeui University, and names them by the campus's own geography: 'Dongeui University Upper, Busan' and 'Dongeui University Lower, Busan' — a hillside campus watched from its upper and lower sides. (The records spell the university Dongeui; it is often written Dong-eui.)",
      "Two records, one institution, one page: the pair is the richest Korean campus set in the catalogue, and both cameras carry the university's name in their own data.",
    ],
    faqs: [
      {
        q: "Why two cameras — Upper and Lower?",
        a: "The campus climbs a hillside in Busan, and the city network's two records are named for its upper and lower parts. Both are Dongeui University's own-named cameras, served together on this page.",
      },
    ],
  },
  {
    slug: "kyungpook-national-university",
    name: "Kyungpook University — North Gate",
    short: "Kyungpook",
    place: "Daegu, South Korea",
    country: "South Korea",
    countrySlug: "south-korea",
    chunk: "south-korea",
    ids: ["occ-daegu-ch89"],
    token: "Kyungpook University",
    citySlug: "daegu",
    cityName: "Daegu",
    lat: 35.89238,
    lng: 128.6094,
    intro: [
      "'Kyungpook University North Gate' — Daegu's city network names this camera for the university's north gate, and a named campus gate is a campus subject: the comings and goings of the university at its own entrance. The record is filed exactly so, and the page serves it as the university's gate camera.",
      "Gate cameras are the honest Korean pattern in this family — not lecture halls or quadrangles, but the threshold of the campus, watched by the city the university anchors. Daegu's city page carries the rest of the network.",
    ],
    faqs: [
      {
        q: "Is a gate camera really a campus camera?",
        a: "By this directory's stated rule, yes: the camera's own data names the institution and its subject is the campus's named gate — part of the campus, not a road that passes it. Junction cameras that merely carry a university's name as an address were rejected; a named gate was not.",
      },
    ],
  },
  {
    slug: "jeonnam-university",
    name: "Jeonnam University — Entrance",
    short: "Jeonnam",
    place: "Gwangju, South Korea",
    country: "South Korea",
    countrySlug: "south-korea",
    chunk: "south-korea",
    ids: ["occ-gwangju-CCTV000006"],
    token: "Jeonnam University",
    citySlug: "gwangju",
    cityName: "Gwangju",
    lat: 35.16872,
    lng: 126.90289,
    intro: [
      "'Jeonnam University Entrance, Gwangju' — Gwangju's CCTV network names the camera for the university's entrance, and the entrance is the page's subject: the front door of the region's flagship university, watched by the city network as one of its named places.",
      "One camera, at the gate, by the catalogue's own naming. Gwangju's city page carries the wider network; this page is the university's threshold.",
    ],
    faqs: [
      {
        q: "Which camera is this in Gwangju's network?",
        a: "The record occ-gwangju-CCTV000006, named 'Jeonnam University Entrance' by the network itself — the institution in the camera's own data, at the campus entrance.",
      },
    ],
  },
  {
    slug: "silla-university",
    name: "Silla University — Entrance",
    short: "Silla",
    place: "Busan, South Korea",
    country: "South Korea",
    countrySlug: "south-korea",
    chunk: "south-korea",
    ids: ["occ-busan-CTV0000134"],
    token: "Silla University",
    citySlug: "busan",
    cityName: "Busan",
    lat: 35.17154,
    lng: 128.98845,
    intro: [
      "'Silla University Entrance, Busan' — Busan's city network keeps a camera at Silla University's entrance and names it for the institution. Like the other Korean pages in this family, the subject is the campus threshold: students, buses and the day's rhythm at the gate.",
      "Busan has two universities in this directory — Dongeui, with its upper and lower campus cameras, and Silla at its entrance. The city page carries Busan's thousands of other frames; these are the ones that name a university.",
    ],
    faqs: [
      {
        q: "How does this page differ from Busan's city page?",
        a: "The city page is the whole municipal network; this page is the single record whose own name is Silla University's entrance — the campus subject, separated out for the people looking for it.",
      },
    ],
  },
  {
    slug: "incheon-catholic-university",
    name: "Incheon Catholic University",
    short: "Incheon Catholic",
    place: "Songdo, Incheon, South Korea",
    country: "South Korea",
    countrySlug: "south-korea",
    chunk: "south-korea",
    ids: ["occ-incheon-20012"],
    token: "Incheon Catholic University",
    citySlug: "incheon",
    cityName: "Incheon",
    lat: 37.37516,
    lng: 126.66276,
    intro: [
      "Songdo, Incheon's built-from-scratch international district, is a campus town by design — and its network names a camera for Incheon Catholic University, Songdo campus and all: 'Incheon Catholic University, Songdo'. The record is the university's own name in the city's data.",
      "Three of Songdo's university cameras sit within a few streets of each other in this directory — Incheon Catholic, the Incheon Global Campus and Yonsei's international campus — a planned district doing exactly what it was planned to do.",
    ],
    faqs: [
      {
        q: "What is Songdo?",
        a: "A purpose-built international district in Incheon, South Korea, developed as a hub for global universities — several of its campuses have their own-named cameras in this directory, each with its page.",
      },
    ],
  },
  {
    slug: "incheon-global-campus",
    name: "Incheon Global Campus",
    short: "Incheon Global Campus",
    place: "Songdo, Incheon, South Korea",
    country: "South Korea",
    countrySlug: "south-korea",
    chunk: "south-korea",
    ids: ["occ-incheon-10039"],
    token: "Incheon Global Campus",
    citySlug: "incheon",
    cityName: "Incheon",
    lat: 37.37649,
    lng: 126.67422,
    intro: [
      "'Incheon Global Campus, Songdo' — the record names the campus, and the campus is the institution here: a shared Songdo campus built to host the Korean campuses of foreign universities under one roof and one name. The city's network keeps a camera on it, named for it.",
      "A campus, rather than a single university, is the honest unit for this record — the page serves the campus camera under the campus's own name, alongside its single-university Songdo neighbours.",
    ],
    faqs: [
      {
        q: "Is Incheon Global Campus a university?",
        a: "It is a shared campus — home to the Korean campuses of several foreign universities — and the camera's own record names the campus itself. The page is titled for the campus, not for any one tenant university.",
      },
    ],
  },
  {
    slug: "yonsei-university",
    name: "Yonsei University",
    short: "Yonsei",
    place: "Seoul & Songdo, South Korea",
    country: "South Korea",
    countrySlug: "south-korea",
    chunk: "south-korea",
    ids: ["occ-incheon-20011", "occ-topis-seoul-158"],
    token: "Yonsei University",
    citySlug: "seoul",
    cityName: "Seoul",
    lat: 37.38049,
    lng: 126.66731,
    intro: [
      "Yonsei is the only institution in this directory with cameras on two campuses: 'Yonsei University International Campus, Songdo' from Incheon's network, and 'Yonsei University, Sinchon' from Seoul's TOPIS network — the new international campus in Songdo and the historic Sinchon campus in Seoul, each named by its own city's data.",
      "Two records, two cities, one university: the page serves both, labelled by campus. Seoul's city page carries the Sinchon camera's wider network; Incheon's carries the Songdo side.",
    ],
    faqs: [
      {
        q: "Which Yonsei campuses have cameras?",
        a: "Two, per the catalogue's own records: the International Campus in Songdo, Incheon, and the Sinchon campus in Seoul. Both records name Yonsei University themselves — no affiliation was guessed for either.",
      },
    ],
  },
];

/** All 25 audited institutions: the US set, then Europe and Korea. */
export const UNIVERSITIES: University[] = [
  ...UNIVERSITIES_US,
  ...UNIVERSITIES_INTERNATIONAL,
];

export function universityBySlug(slug: string): University | null {
  return UNIVERSITIES.find((u) => u.slug === slug) ?? null;
}
