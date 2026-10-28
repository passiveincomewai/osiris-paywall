/**
 * Animal cams (Menu #2 Wave B, 2026-10-27) — the audited registry
 * behind /animal-webcams and its star pages.
 *
 * The hub's universe is a RULE, not this list: the 'animals' theme in
 * lib/explore-scopes (matchesAnimalCam), whose yield over the
 * catalogue generated 2026-10-20 is 43 records. This module is the
 * editorial layer on top of that rule — the hub's named groups (which
 * must partition the rule's yield exactly) and the star pages (feeds
 * with a real named identity people search for). Every id below was
 * verified against the raw chunks (src/data/countries/*.json) by
 * lib/animal-cams.test.ts: each id exists, carries the name the audit
 * recorded, and passes the theme rule. If the catalogue regenerates
 * and this reconciliation moves, the test fails loudly rather than
 * letting the pages drift.
 *
 * The famous absences are stated, not hidden: the catalogue holds NO
 * Brooks Falls / Katmai bear cam, no eagle nest cam, no panda, osprey,
 * puffin or penguin cam (no explore.org or Africam feeds at all). The
 * hub says so; no page implies otherwise.
 */

export interface AnimalFaq {
  q: string;
  a: string;
}

export interface AnimalStar {
  slug: string;
  /** Full display name, e.g. "Tembe Elephant Park". */
  name: string;
  /** Short name used in headings and link labels. */
  short: string;
  /** Place label built from the record's own name/city fields. */
  place: string;
  country: string;
  countrySlug: string;
  /** Catalogue chunk the pinned records live in. */
  chunk: string;
  /** The audited catalogue record ids this page serves. */
  ids: string[];
  lat: number;
  lng: number;
  tz: string;
  /** Whether the page shows the weather panel. One star is excluded:
   *  the Masai Mara record's own coordinates sit by its record city
   *  (Nakuru), not in the Mara — weather for the record's coordinates
   *  would describe the wrong place under the Mara's name. */
  weather: boolean;
  intro: [string, string];
  watch: string;
  faqs: AnimalFaq[];
}

export interface AnimalGroup {
  key: string;
  heading: string;
  blurb: string;
  ids: string[];
}

const SAFARI_IDS = [
  "sky-south-africa-tembe-elephant-park-1795",
  "sky-kenya-masai-mara-kenya-4905",
  "sky-south-africa-nkorho-africa-2640",
  "sky-south-africa-olifants-river-2639",
  "sky-kenya-kenya-voi-wildlife-lodge-tsavo-east-national-park-992",
];

const ZOO_IDS = [
  "pubcam-united-states-san-diego-zoo-san-diego-zoo",
  "occ-sakura-EeU_fG7pmX4",
  "pubcam-netherlands-kerkrade-gaia-zoo-livestream",
  "pubcam-belize-the-belize-zoo-live-stream-zoo",
  "sky-japan-sumoto-awaji-island-monkey-center-2615",
  "pubcam-netherlands-terwolde-bosgoed-animal-paradise",
  "occ-openwebcamdb-konya-animal-shelter-daily-view",
  "sky-norge-bryggja-deer-farm-2059",
];

const FALCON_NEST_IDS = [
  "pubcam-netherlands-apeldoorn-peregrine-falcon-nl",
  "pubcam-netherlands-arnhem-slechtvalken-eusebiuskerk",
  "pubcam-netherlands-groningen-gasunie-slechtvalk-webcam",
  "pubcam-netherlands-gemert-vogelwerkgroep-slechtvalk",
  "pubcam-netherlands-weert-slechtvalken-st-martinuskerk",
  "pl-nadm-103",
  "pl-nadm-104",
  "pl-nadm-30",
  "pl-nadm-94",
  "pl-nadm-95",
  "pl-nadm-111",
  "pl-nadm-110",
];

const STORK_NEST_IDS = [
  "pubcam-netherlands-ijsselstein-ooievaarsnest",
  "pubcam-netherlands-vlist-ooievaarsnest-dick-bakker",
  "pubcam-netherlands-vianen-ooievaars-stadhuis",
  "pubcam-netherlands-herwijnen-ooievaars-tv-buitengewoon",
  "sky-hungary-hungarian-storks-rbotty-n-6090",
  "sky-hungary-storks-of-asz-d-hungary-4860",
  "se-cs-41043",
];

const BIRD_IDS = [
  "occ-camstreamer-759391847-live-hula-nature-reserve-bird-cam-2",
  "occ-openwebcamdb-even-yehuda-barn-owl-nest",
  "sky-israel-barn-owl-3062",
  "sky-south-africa-pretoria-bird-feeder-1984",
  "pubcam-netherlands-texel-vogel-informatiecentrum",
  "sky-malta-xemxija-simar-nature-reserve-4175",
];

const UNDERWATER_IDS = [
  "pubcam-bonaire-kralendijk-harbour-village-coral-reef",
  "sky-dominican-republic-underwater-cam-dominican-republic-5014",
  "occ-openwebcamdb-hurghada-red-sea-underwater-dive",
  "occ-biodic-51",
  "occ-openwebcamdb-kaust-red-sea-underwater-realm",
];

/** The hub's named groups. Together they partition the 'animals'
 *  theme yield exactly — lib/animal-cams.test.ts proves the partition
 *  against the raw catalogue, both ways. */
export const ANIMAL_GROUPS: AnimalGroup[] = [
  {
    key: "safari",
    heading: "Safari & wildlife lodges",
    blurb:
      "Five lodge and reserve cameras in South Africa and Kenya — elephant park, Kruger waterhole country, a Balule riverbank and a Tsavo lodge. What walks into frame is the animals' decision: dawn and dusk are the busy shifts, and a quiet hour is the savanna being itself.",
    ids: SAFARI_IDS,
  },
  {
    key: "zoos",
    heading: "Zoos, sanctuaries & animal parks",
    blurb:
      "Eight zoo and sanctuary feeds — San Diego Zoo, the giraffes at Kumamoto City Zoo, Gaia Zoo in the Netherlands, the Belize Zoo, Awaji Island's monkey center, a Dutch animal paradise, a Norwegian deer farm, and one municipal animal shelter in Konya whose residents wait for adopters on camera.",
    ids: ZOO_IDS,
  },
  {
    key: "falcon-nests",
    heading: "Peregrine & falcon nests — Netherlands & Poland",
    blurb:
      "Twelve nest cameras on church towers, gas-company roofs and Polish power-plant stacks: five Dutch peregrine sites (the slechtvalk cams) and four Polish nests around Wejherowo, Reda and Tczew, some with a second camera inside the box. Nest cams are seasonal — full of feathers in the breeding months, architecture the rest of the year.",
    ids: FALCON_NEST_IDS,
  },
  {
    key: "stork-nests",
    heading: "White stork nests",
    blurb:
      "Seven stork nests — four Dutch ooievaarsnest cameras on roofs and town halls, two Hungarian nests, and the stork enclosure at Fulltofta in Sweden. Storks return to the same nest year after year; spring arrivals and summer fledging are the seasons to watch.",
    ids: STORK_NEST_IDS,
  },
  {
    key: "birds-more",
    heading: "Owls, reserves & bird tables",
    blurb:
      "Two barn owl roosts in Israel, the Hula Nature Reserve's bird camera in the Hula Valley, a Pretoria garden bird feeder, the bird information centre on Texel, and Malta's Simar Nature Reserve — a wetland the cameras watch for whoever drops in.",
    ids: BIRD_IDS,
  },
  {
    key: "underwater",
    heading: "Underwater reef cams",
    blurb:
      "Five cameras that never surface: a Bonaire coral reef, a Dominican Republic reef cam, two Red Sea feeds (Hurghada and the KAUST reef off Thuwal), and the underwater camera at Kushimoto Marine Park in Japan. Fish keep their own hours; the reef is busiest in full daylight.",
    ids: UNDERWATER_IDS,
  },
];

/** Every audited animal record id, in group order. */
export const ANIMAL_IDS: string[] = ANIMAL_GROUPS.flatMap((g) => g.ids);

export const ANIMAL_STARS: AnimalStar[] = [
  {
    slug: "tembe-elephant-park",
    name: "Tembe Elephant Park",
    short: "Tembe",
    place: "Manguzi, KwaZulu-Natal",
    country: "South Africa",
    countrySlug: "south-africa",
    chunk: "south-africa",
    ids: ["sky-south-africa-tembe-elephant-park-1795"],
    lat: -26.98829,
    lng: 32.75603,
    tz: "Africa/Johannesburg",
    weather: true,
    intro: [
      "Tembe Elephant Park, on South Africa's Maputaland plain near the Mozambique border, is known above all for its elephants — the park protects a herd of free-ranging tuskers in sand-forest country, and its live camera is the WorldEye catalogue's flagship safari feed. The record itself is unambiguous: a SkylineWebcams camera named for the park, pinned at the park in the catalogue's own coordinates.",
      "A park camera is not a zoo enclosure: the frame is fixed and the elephants are not. What the feed teaches is safari patience — long quiet stretches of forest and light, broken by the arrival of the animals the park is named for. Check in across the day rather than once; the bush keeps its own schedule.",
    ],
    watch:
      "Elephants and other game move most in the cool hours — early morning and late afternoon South African time. Midday heat empties most frames. If the park is quiet, the safari wall on the animal webcams hub is one click away.",
    faqs: [
      {
        q: "Is the Tembe Elephant Park camera really live?",
        a: "Yes — it is a live public feed carried in the WorldEye catalogue under the Tembe Elephant Park name. Like every camera here it opens free; check the feed's own timestamp when you land, because bush cameras occasionally pause for weather or power.",
      },
      {
        q: "What animals can I see at Tembe?",
        a: "Elephants are the park's namesake and its draw. The wider park is sand-forest and savanna country with the usual Maputaland cast — but what crosses any fixed camera is chance, and this page promises the camera, not a sighting.",
      },
    ],
  },
  {
    slug: "masai-mara",
    name: "Masai Mara",
    short: "Masai Mara",
    place: "Kenya",
    country: "Kenya",
    countrySlug: "kenya",
    chunk: "kenya",
    ids: ["sky-kenya-masai-mara-kenya-4905"],
    lat: -0.28027,
    lng: 36.0712,
    tz: "Africa/Nairobi",
    weather: false,
    intro: [
      "The Maasai Mara is the most famous safari landscape on Earth — the northern reach of the Serengeti ecosystem, known for big cats and for the great wildebeest migration that rolls through its plains in the dry season. The catalogue's Kenyan safari feed is carried under the Masai Mara name by SkylineWebcams, and it is the feed this page serves.",
      "One honest note about the catalogue record itself: its name says Masai Mara, while its own city field reads Nakuru — the metadata and the name disagree, and the feed is presented here under the name it is published with. No weather panel is shown for this page, because weather computed for the record's coordinates would describe the wrong place under the Mara's name.",
    ],
    watch:
      "Game is most active at dawn and dusk Kenyan time; the migration season (roughly July to October) is when the Mara's plains are at their fullest. A single feed shows one viewpoint — treat an empty frame as the savanna resting, not the camera failing.",
    faqs: [
      {
        q: "Can I watch the wildebeest migration on this camera?",
        a: "The migration moves across the whole Mara–Serengeti ecosystem over months, and no single fixed camera can promise it. This is the catalogue's Masai Mara-named feed: during migration season the plains it watches are part of the landscape the herds cross, but a crossing in frame is luck, not schedule.",
      },
      {
        q: "Why does the catalogue record mention Nakuru?",
        a: "Because the record's own city field says Nakuru while its name says Masai Mara — a metadata conflict in the source catalogue that this page flags rather than hides. The feed is served under its published Masai Mara name.",
      },
    ],
  },
  {
    slug: "nkorho-kruger",
    name: "Nkorho — Kruger National Park",
    short: "Nkorho",
    place: "Kruger National Park",
    country: "South Africa",
    countrySlug: "south-africa",
    chunk: "south-africa",
    ids: ["sky-south-africa-nkorho-africa-2640"],
    lat: -23.93578,
    lng: 31.50837,
    tz: "Africa/Johannesburg",
    weather: true,
    intro: [
      "Nkorho is a lodge name long associated with a waterhole camera in the Sabi Sand side of greater Kruger — the record in the WorldEye catalogue is filed under Kruger National Park itself, a SkylineWebcams feed carrying the Nkorho name. Waterhole cameras are the purest form of safari watching: the animals must come to the water, so the water is where the camera waits.",
      "Kruger's cast needs no embellishment: elephant, buffalo, giraffe, zebra and the antelope herds all drink, and where they drink, predators know to look. The camera cannot follow any of it — it holds its frame and the bush writes the script.",
    ],
    watch:
      "Dry-season months are a waterhole's high season, when game concentrates at permanent water. Dawn and dusk bring the drinkers; after dark, infrared hours bring the night shift. Check the timestamp and give a quiet frame time before judging it.",
    faqs: [
      {
        q: "Where is the Nkorho camera?",
        a: "The catalogue files the feed under Kruger National Park, South Africa, and its coordinates sit in the park's Sabi Sand side. The page shows the record's own placement; the lodge's waterhole is the scene the feed is known for.",
      },
      {
        q: "What is the best time to watch?",
        a: "First light and last light, South African time, when game comes to drink — and the dry season, when a permanent waterhole matters most. Night frames are part of the watch: much of the bush is nocturnal.",
      },
    ],
  },
  {
    slug: "olifants-river",
    name: "Olifants River — Balule Nature Reserve",
    short: "Olifants River",
    place: "Balule Nature Reserve",
    country: "South Africa",
    countrySlug: "south-africa",
    chunk: "south-africa",
    ids: ["sky-south-africa-olifants-river-2639"],
    lat: -24.18737,
    lng: 30.93686,
    tz: "Africa/Johannesburg",
    weather: true,
    intro: [
      "The Olifants River runs through the Balule Nature Reserve on Kruger's western side, and the catalogue's river camera watches the water from the Balule bank. River cameras trade the waterhole's appointments for a through-route: hippos and crocodiles belong to the river itself, and everything else in the reserve comes down to drink, cross or hunt along it.",
      "The record's own fields make the identification cleanly — name Olifants River, city Balule Nature Reserve, coordinates on the river in Limpopo's bushveld. Of the safari feeds in this family it is the landscape watch: water, bank, and whatever the day brings down to both.",
    ],
    watch:
      "Rivers run all day, but the banks busiest at the edges of it — morning and evening. In the dry season the river is the reserve's lifeline and traffic concentrates; after rain, game spreads out and the frame quiets.",
    faqs: [
      {
        q: "What might I see on the Olifants River camera?",
        a: "Hippos and crocodiles are the river's residents; elephant, buffalo and antelope come to the banks. Sightings are never scheduled — the camera's promise is the river itself, live.",
      },
      {
        q: "Where is Balule Nature Reserve?",
        a: "Balule is a private reserve in Limpopo, South Africa, sharing an unfenced boundary with Kruger National Park — the catalogue files this feed under the reserve's name, on the Olifants River.",
      },
    ],
  },
  {
    slug: "tsavo-east",
    name: "Voi Wildlife Lodge — Tsavo East National Park",
    short: "Tsavo East",
    place: "Voi, Tsavo East",
    country: "Kenya",
    countrySlug: "kenya",
    chunk: "kenya",
    ids: ["sky-kenya-kenya-voi-wildlife-lodge-tsavo-east-national-park-992"],
    lat: -3.36318,
    lng: 38.59529,
    tz: "Africa/Nairobi",
    weather: true,
    intro: [
      "Tsavo East is Kenya's red-earth park — dust the colour of rust, doum palms along the Galana River, and elephants that wear the soil they roll in. The catalogue's Tsavo feed is the camera at Voi Wildlife Lodge, at the park's Voi gate side, filed under the full name: Kenya-Voi Wildlife Lodge, Tsavo East National Park.",
      "A lodge camera watches the seam between the human camp and the park: lodge waterholes and grounds on one side, one of Africa's largest protected areas on the other. It is the gentlest introduction in this safari set — and the park beyond the fence line is entirely wild.",
    ],
    watch:
      "Lodge waterholes earn their keep in the heat of the day and again at dusk, when game drifts in. Tsavo's dry seasons — roughly January to March and July to October — concentrate animals at water.",
    faqs: [
      {
        q: "Why are Tsavo's elephants red?",
        a: "The park's soil is red volcanic earth, and elephants bathe and dust themselves in it for skin protection — so Tsavo's herds wear the park's colour. If elephants cross this feed, expect them rust-red.",
      },
      {
        q: "Where is Voi Wildlife Lodge?",
        a: "At Voi, the town at Tsavo East's southern gate in Kenya — the catalogue record names the lodge and the park together, and its coordinates sit at Voi.",
      },
    ],
  },
  {
    slug: "san-diego-zoo",
    name: "San Diego Zoo",
    short: "San Diego Zoo",
    place: "San Diego, California",
    country: "United States",
    countrySlug: "united-states",
    chunk: "united-states",
    ids: ["pubcam-united-states-san-diego-zoo-san-diego-zoo"],
    lat: 32.73599,
    lng: -117.15065,
    tz: "America/Los_Angeles",
    weather: true,
    intro: [
      "The San Diego Zoo is one of the world's famous zoos, and the WorldEye catalogue carries its public live camera — the record is named, simply and exactly, San Diego Zoo, with Balboa Park coordinates. Among the English-language zoo cams people search for, this is the one the catalogue genuinely holds.",
      "That makes this page the honest counterpart to the family hub's famous-absences list: no panda cam, no penguin cam and no eagle nest exists in this directory — but San Diego Zoo does, carried on its own name, watched live.",
    ],
    watch:
      "Zoo animals follow keeper schedules — feeding and enrichment times are the lively hours, usually in the morning after gates open, Pacific time. Animals rest out of frame at midday; a quiet enclosure is a normal enclosure.",
    faqs: [
      {
        q: "Is this the San Diego Zoo's own camera?",
        a: "The catalogue record is named San Diego Zoo and is published as a public webcam at the zoo's Balboa Park coordinates. WorldEye carries it as a directory listing; the zoo's own site remains the authority for its animals and hours.",
      },
      {
        q: "Can I watch pandas or penguins here?",
        a: "Not in this directory — the catalogue holds no panda or penguin camera anywhere, and this page won't pretend otherwise. What it holds is the San Diego Zoo feed itself, live.",
      },
    ],
  },
  {
    slug: "kumamoto-city-zoo",
    name: "Kumamoto City Zoo — Giraffe Cam",
    short: "Kumamoto City Zoo",
    place: "Kumamoto, Japan",
    country: "Japan",
    countrySlug: "japan",
    chunk: "japan",
    ids: ["occ-sakura-EeU_fG7pmX4"],
    lat: 32.7898,
    lng: 130.7417,
    tz: "Asia/Tokyo",
    weather: true,
    intro: [
      "Some camera names need no interpretation at all: Kumamoto City Zoo Giraffe. The feed — from Japan's sakura-live-cams network — watches the giraffes of Kumamoto City Zoo and Botanical Gardens, and it is one of the very few zoo cameras in the catalogue whose animal is named in the record itself.",
      "Giraffes are made for a fixed camera: too tall to leave the frame, unhurried, and most active when keepers and food arrive. The zoo sits by Lake Ezu in Kumamoto, and the feed runs on Japan time — plan a morning visit, Japanese morning, for the liveliest frame.",
    ],
    watch:
      "Daylight hours in Japan (JST) are the watch — giraffes are day animals, and the enclosure's rhythm follows the zoo's: active mornings, browsing afternoons, empty frames after closing.",
    faqs: [
      {
        q: "What does the Kumamoto City Zoo camera show?",
        a: "Giraffes — the record is named Kumamoto City Zoo Giraffe, and the feed watches the zoo's giraffe enclosure. It is the catalogue's only giraffe-named camera.",
      },
      {
        q: "When is the best time to watch from outside Japan?",
        a: "Japan is UTC+9 with no daylight saving. From the US, Japan's morning is your previous evening — an easy after-dinner check-in; from Europe, early morning aligns with Japan's afternoon.",
      },
    ],
  },
  {
    slug: "gaia-zoo",
    name: "Gaia Zoo",
    short: "Gaia Zoo",
    place: "Kerkrade, Netherlands",
    country: "Netherlands",
    countrySlug: "netherlands",
    chunk: "netherlands",
    ids: ["pubcam-netherlands-kerkrade-gaia-zoo-livestream"],
    lat: 50.87491,
    lng: 6.05939,
    tz: "Europe/Amsterdam",
    weather: true,
    intro: [
      "Gaia Zoo, in Kerkrade in the Dutch province of Limburg, is one of the Netherlands' major zoos — and the catalogue carries its livestream under the zoo's own name. In a directory where most zoo-word matches turned out to be highway interchanges named after zoos, a record that is simply the zoo's own feed is the genuine article.",
      "The page serves the record exactly as catalogued: Gaia Zoo Livestream, Kerkrade. What is in frame follows the zoo's day — enclosures fill and empty with the animals' routines and the Limburg weather.",
    ],
    watch:
      "Dutch daylight and zoo hours (CET/CEST) are the watch. Animals are liveliest in the morning and around feeding times; rain sends most residents under cover, as it would you.",
    faqs: [
      {
        q: "Where is Gaia Zoo?",
        a: "In Kerkrade, Limburg, in the south of the Netherlands near the German border — the catalogue record carries the zoo's name and Kerkrade as its city.",
      },
      {
        q: "Is the Gaia Zoo livestream free to watch?",
        a: "Yes — it is a public livestream carried in the WorldEye directory, and it opens free like every camera here.",
      },
    ],
  },
  {
    slug: "belize-zoo",
    name: "The Belize Zoo",
    short: "Belize Zoo",
    place: "Belize District, Belize",
    country: "Belize",
    countrySlug: "belize",
    chunk: "belize",
    ids: ["pubcam-belize-the-belize-zoo-live-stream-zoo"],
    lat: 17.35768,
    lng: -88.54261,
    tz: "America/Belize",
    weather: true,
    intro: [
      "The Belize Zoo is famous among zoos for a simple principle: its residents are Belize's own native animals, kept in large natural enclosures in the forest. The catalogue's record is filed under the zoo's name — the record's city field is literally The Belize Zoo, on the Western Highway between Belize City and Belmopan.",
      "A forest zoo makes for a different kind of camera: green, shaded, and quiet for long stretches, with the country's wildlife — the zoo is known for jaguars, tapirs and toucans among its residents — appearing on its own terms. This page serves that feed under its own name and promises nothing the forest doesn't.",
    ],
    watch:
      "Belize keeps Central Standard Time year-round (UTC−6). Forest animals move at dawn and dusk and shelter from midday heat and rain; the greenest frames are early.",
    faqs: [
      {
        q: "What animals does the Belize Zoo keep?",
        a: "Belize's native wildlife — the zoo is known for rescued and resident native species, jaguars and tapirs among them. Which of them crosses this camera is the animals' choice; the feed is the zoo's own livestream as catalogued.",
      },
      {
        q: "Where is the Belize Zoo?",
        a: "On the Western Highway in Belize District, roughly halfway between Belize City and Belmopan — the catalogue record is filed under the zoo's own name at those coordinates.",
      },
    ],
  },
  {
    slug: "awaji-island-monkey-center",
    name: "Awaji Island Monkey Center",
    short: "Awaji Monkey Center",
    place: "Sumoto, Awaji Island, Japan",
    country: "Japan",
    countrySlug: "japan",
    chunk: "japan",
    ids: ["sky-japan-sumoto-awaji-island-monkey-center-2615"],
    lat: 34.34295,
    lng: 134.89542,
    tz: "Asia/Tokyo",
    weather: true,
    intro: [
      "Awaji Island, in Japan's Seto Inland Sea, has a monkey center at Kashiwara in Sumoto — a troop of Japanese macaques living on a wooded mountainside, watched by the SkylineWebcams feed the catalogue carries under the center's name. Free-ranging troops make for gloriously unscripted watching: grooming circles, squabbles, youngsters at play.",
      "The record is one of the catalogue's cleanest animal identifications — name, city and coordinates all agree: Sumoto, Awaji Island Monkey Center. Macaques are day-active and social, so a daylight frame here is rarely empty for long.",
    ],
    watch:
      "Japanese daylight (JST, UTC+9) — the troop is out from morning, gathers around feeding times, and drifts back into the trees toward evening. Winter frames can include the famous macaque huddle.",
    faqs: [
      {
        q: "What monkeys are at the Awaji Island Monkey Center?",
        a: "Japanese macaques — the snow monkeys native to Japan. The center's troop ranges a wooded hillside above Sumoto, and the feed watches that hillside.",
      },
      {
        q: "Is the monkey center a zoo?",
        a: "It is a free-ranging troop site rather than an enclosure zoo: the macaques come and go on the mountain, which is why frames vary from a full troop to an empty slope.",
      },
    ],
  },
  {
    slug: "hula-nature-reserve",
    name: "Hula Nature Reserve Bird Cam",
    short: "Hula Nature Reserve",
    place: "Hula Valley, Israel",
    country: "Israel",
    countrySlug: "israel",
    chunk: "israel",
    ids: ["occ-camstreamer-759391847-live-hula-nature-reserve-bird-cam-2"],
    lat: 33.06743,
    lng: 35.60332,
    tz: "Asia/Jerusalem",
    weather: true,
    intro: [
      "The Hula Valley, between the Golan Heights and the Galilee hills, is one of the great bird crossroads of the world — a bottleneck on the Africa–Eurasia migration flyway where storks, cranes and pelicans move in their tens of thousands. The catalogue's feed is the reserve's own: LIVE Hula Nature Reserve Bird CAM 2, published with the Israel Nature and Parks Authority.",
      "Note the catalogue's honesty quirk: this is Bird CAM 2, and there is no CAM 1 anywhere in the directory — the page names the feed it actually serves. During migration peaks the Hula is one of the finest bird spectacles on Earth; out of season it is a quiet, beautiful wetland.",
    ],
    watch:
      "Migration seasons are the spectacle — spring (March–May) and autumn (September–November), with dawn lifts and evening arrivals the peak moments. Resident waterbirds keep the frame alive between seasons.",
    faqs: [
      {
        q: "Why is it called Bird CAM 2?",
        a: "Because that is the feed's published name — the Israel Nature and Parks Authority's Hula camera 2. The catalogue holds no camera 1 for the reserve, and the page doesn't invent one.",
      },
      {
        q: "When do the migrating birds pass the Hula?",
        a: "The valley sits on the Syrian-African rift flyway: spring passage runs roughly March to May and autumn passage September to November, cranes and storks among the headline movers. Exact days belong to the birds and the weather.",
      },
    ],
  },
  {
    slug: "konya-animal-shelter",
    name: "Konya Animal Shelter",
    short: "Konya Animal Shelter",
    place: "Meram, Konya, Türkiye",
    country: "Turkey",
    countrySlug: "turkey",
    chunk: "turkey",
    ids: ["occ-openwebcamdb-konya-animal-shelter-daily-view"],
    lat: 37.79098,
    lng: 32.23341,
    tz: "Europe/Istanbul",
    weather: true,
    intro: [
      "The most unglamorous camera in this family may be the most touching: the Konya Animal Shelter Daily View, a municipal shelter camera in Meram, Konya, carried in the catalogue under exactly that name. No safari, no spectacle — a shelter yard, its dogs, and the daily routine of an institution that exists to find them homes.",
      "It earns its star page on identity alone: there is no other animal-shelter camera in the catalogue, and a shelter that publishes its yard live is making a promise of openness to its adopters. The page serves the feed as catalogued and lets it speak plainly.",
    ],
    watch:
      "Shelter days run on care routines — feeding, cleaning and exercise hours (Türkiye time, UTC+3) are when the yard is busiest. Nights are kennels and quiet.",
    faqs: [
      {
        q: "Is this really a live animal shelter camera?",
        a: "Yes — the catalogue record is named Konya Animal Shelter Daily View and is published via the open webcam directory at coordinates in Meram, Konya. It shows the shelter's daily life as it happens.",
      },
      {
        q: "Can I adopt from the shelter through this page?",
        a: "No — WorldEye is a camera directory, not the shelter. Adoption is the shelter's own business, run by the Konya municipality; this page simply carries its public camera.",
      },
    ],
  },
];

export function animalStarBySlug(slug: string): AnimalStar | null {
  return ANIMAL_STARS.find((s) => s.slug === slug) ?? null;
}
