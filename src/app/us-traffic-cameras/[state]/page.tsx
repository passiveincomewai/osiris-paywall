import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getStateBySlug,
  getUsStatesIndex,
  type UsStateData,
} from "@/lib/us-states";
import {
  BASE,
  formatDate,
  JsonLd,
  Breadcrumb,
  Hero,
  StatRow,
  Updated,
  Intro,
  AreaTable,
  SampleGrid,
  HowTo,
  FaqSection,
  FaqJsonLd,
  RelatedLinks,
  CtaRow,
  PageShell,
  type Sample,
  type AreaRow,
  type Faq,
} from "@/components/directory-page";
import VoiceQA from "@/components/seo/VoiceQA";
import { mergePlaceFaqs, stateAnswers } from "@/lib/place-answers";
import { getPlaceWeather } from "@/lib/place-weather";
import CurrentStatus from "@/components/CurrentStatus";
import { stateFreewayFaq, stateStatusRows } from "@/lib/place-breakdown";
import cityPages from "@/data/city-pages.json";

/* Area name → city-page slug, for linking the coverage table to the
   city templates. Only US entries of the generated city index plus
   the three curated US city pages — an area with no city page stays
   unlinked rather than guessing a slug. */
const CITY_PAGE_BY_NAME = new Map<string, string>([
  ["Houston", "houston"],
  ["Dallas", "dallas"],
  ["Fort Worth", "fort-worth"],
  ...(
    cityPages.cities as unknown as Array<{
      slug: string;
      name: string;
      countrySlug: string;
    }>
  )
    .filter((g) => g.countrySlug === "united-states")
    .map((g) => [g.name, g.slug] as [string, string]),
]);

type StateCfg = {
  name: string;
  count: number;
  title: string;
  blurb: string;
  h1: string;
  sub: string;
  intro: string[];
  stats: { value: string; label: string }[];
  areas?: AreaRow[];
  areaTitle?: string;
  areaNote?: string;
  samples?: Sample[];
  sampleTitle?: string;
  howtoTitle: string;
  howto: string[];
  faqTitle: string;
  faqs: Faq[];
};

// The seven hand-written state indexes (Oct 11 set). Their counts and
// coverage areas are NOT stored here any more — resolveState() merges
// them with the measured data from src/data/us-states.json, so the
// prose below can never drift from the served catalogue again.
type EditorialCfg = Omit<StateCfg, "count" | "areas">;

const STATES: Record<string, EditorialCfg> = {
  georgia: {
    name: "Georgia",
    title: "Georgia Traffic Cameras — Live GA DOT Road Cams",
    blurb:
      "Watch 4,288 live Georgia DOT highway cameras — Atlanta's Downtown Connector, I-75, I-85 and I-20 road conditions — free on the WorldEye map.",
    h1: "Georgia Traffic Cameras",
    sub: "Watch 4,288 live Georgia highway cameras — free on the WorldEye globe.",
    intro: [
      "Georgia holds one of the largest single-state camera indexes in the United States on WorldEye — 4,288 feeds, nearly all of them Georgia Department of Transportation highway cameras. The densest coverage sits over metro Atlanta: the I-75/I-85 Downtown Connector, the I-285 Perimeter loop, and the I-20 east–west corridor, with more cameras strung along I-16 toward Savannah and I-95 up the coast.",
      "Set expectations correctly: these are working road cameras, not scenic webcams. Each feed is a fixed view of lanes, ramps, or an interchange, published so drivers can check congestion, crashes, and lane closures. They are at their most useful during weekday rush hours and summer thunderstorm season, when Atlanta's low-lying interstates can flood with little warning.",
      "The Downtown Connector is the chokepoint that defines Atlanta driving — I-75 and I-85 merge into a single stretch through the city center, and when it jams there is no quick way around it. That is why the Connector carries the heaviest camera coverage. The I-285 Perimeter is the escape valve: check a Connector camera and a Perimeter camera side by side and you can decide in seconds whether to brave downtown or loop around it.",
      "Summer changes the calculus. Atlanta's afternoon thunderstorms are brief but violent, and the same low-lying stretches of interstate that crawl at rush hour can take on standing water in twenty minutes. The feeds show it plainly — ponding in the low lanes, spray kicking up, traffic slowing to a crawl. If the camera shows water across the roadway, wait it out; these storms usually pass fast.",
      "Outside the metro, the index follows the long-haul corridors: I-16 running southeast toward Savannah and I-95 tracing the coast. During hurricane season those two roads become evacuation routes, and the cameras along them are how you confirm what officials are reporting — clear, moving, or already jammed.",
      "Everything here opens on the free WorldEye map — no account, no download. Zoom into Georgia, tap a camera marker near your route, and you are looking at the same view GDOT's own operators monitor.",
    ],
    stats: [
      { value: "4,288", label: "live cameras" },
      { value: "#3", label: "US state camera index" },
      { value: "Free", label: "no account needed" },
    ],
    howtoTitle: "How to check Georgia road conditions",
    howto: [
      "Open the free WorldEye map in your browser — no account or download needed.",
      "Zoom to Georgia and look for camera markers along I-75, I-85, I-285, and I-20.",
      "Tap any marker to open that GDOT highway camera's live feed.",
      "Compare parallel routes before you commit: check one camera on the Downtown Connector and one on the I-285 Perimeter to see which is moving.",
      "On storm days, re-check the camera nearest your route right before leaving — conditions on Atlanta's low-lying interstates can change in minutes.",
      "Never check cameras while driving. Pull over or have a passenger look, then decide your route before you roll.",
    ],
    faqTitle: "Georgia traffic cameras — FAQ",
    faqs: [
      {
        q: "Are these tourist webcams showing Georgia scenery?",
        a: "No. The 4,288 feeds indexed here are Georgia DOT highway cameras aimed at traffic — lanes, ramps, and interchanges. This page is for checking road conditions, not sightseeing.",
      },
      {
        q: "Do the cameras show live video or still images?",
        a: "Most GDOT feeds refresh as still images every few seconds rather than smooth video. That is plenty for judging congestion or whether a lane is blocked, which is what these cameras are for.",
      },
      {
        q: "Can I check Atlanta rush-hour traffic before leaving?",
        a: "Yes — that is the most common use. Open the live map, zoom to the Downtown Connector or I-285, and tap a camera near your on-ramp to see current conditions before you commit to the drive.",
      },
      {
        q: "When is the best time to check the cameras?",
        a: "Weekday morning and evening rush hours are peak use, and summer thunderstorm afternoons are the other big window — a quick check before leaving can save you from driving into a flooded stretch of interstate.",
      },
      {
        q: "Can the cameras show flooding on Atlanta interstates?",
        a: "Yes. Atlanta's low-lying interstates take on standing water during heavy summer storms, and the feeds show ponding, spray, and slowed traffic clearly. If water is across the roadway, do not drive through it — wait for the storm to pass.",
      },
      {
        q: "Do the cameras cover the coast and the road to Savannah?",
        a: "Yes. The index follows I-16 toward Savannah and I-95 up the coast. During hurricane season those feeds double as evacuation-route monitors — check them before departing and re-check along the way.",
      },
      {
        q: "Can I see lane closures and construction zones?",
        a: "Lane closures show up on the feeds as coned-off lanes and narrowed traffic. The cameras are published so drivers can check exactly these conditions — look for the work-zone cameras along your corridor before a long drive.",
      },
      {
        q: "Why does a feed sometimes look frozen?",
        a: "Most GDOT feeds are still images refreshing every few seconds, not continuous video, so a quiet stretch of road can look static. If nothing is moving in the frame, that usually means traffic is light — not that the camera is broken.",
      },
    ],
  },
  utah: {
    name: "Utah",
    title: "Utah Traffic Cameras — Live UDOT Road Cams",
    blurb:
      "Check 2,135 live Utah DOT road cameras — Cottonwood Canyon ski routes, I-15 corridor and Wasatch Front conditions — free on WorldEye. No signup needed.",
    h1: "Utah Traffic Cameras",
    sub: "Check 2,135 live Utah road cameras — canyon routes, I-15, and ski-area conditions.",
    intro: [
      "Utah's 2,135 indexed cameras are UDOT road feeds, and they cluster exactly where Utah driving gets interesting: the Cottonwood Canyon roads (SR-210 and SR-190) serving the ski resorts, the I-15 spine running the length of the Wasatch Front, and US-89 through Ogden and Logan.",
      "From November to April these cameras are essential equipment. Canyon traction laws, chain requirements, and avalanche closures on Little and Big Cottonwood are decided from views like these — check the SR-210 feeds before heading up, not after you are stuck in the turnaround queue. In summer, the same cameras show whether Parley's Canyon is crawling on a Friday afternoon.",
      "Little Cottonwood Canyon (SR-210) is the one that closes most often — it is steep, narrow, and slides. Big Cottonwood (SR-190) is the slightly mellower sibling, but it still goes to traction restrictions on storm days. The feeds at the canyon mouths, around Wasatch Blvd, tell you the story before you commit: plows running, gates closed, or the dreaded red light at the base.",
      "The rest of the index watches the daily grind. I-15 is the Wasatch Front's spine — Salt Lake, Ogden, Provo — and the cameras along it are how commuters check whether the drive is thirty minutes or sixty. Summer brings its own slowdowns: construction zones up and down the corridor, and Friday-afternoon canyon traffic as everyone heads for the mountains at once.",
      "North of Salt Lake, US-89 through Ogden and up toward Logan covers the commuters the interstate misses. The Washington Blvd and Harrisville Rd feeds watch the surface-street arterials where a single crash can back traffic up for miles with no alternate route.",
      "Featured feeds below include the SR-210/Wasatch Blvd junction and the US-89 corridor through Ogden. All 2,135 cameras open free on the WorldEye map.",
    ],
    stats: [
      { value: "2,135", label: "live cameras" },
      { value: "5", label: "featured canyon feeds" },
      { value: "#5", label: "US state camera index" },
    ],
    samples: [
      { name: "North Little Cottonwood Rd / Little Cottonwood Canyon Rd / SR-210 @ Little Cotto", city: "Cottonwood Heights" },
      { name: "North Little Cottonwood Rd / Wasatch Blvd / 3600 E / SR-210 @ Wasatch Blvd / 890", city: "Cottonwood Heights" },
      { name: "Wasatch Blvd / SR-190/SR-210 @ Big Cottonwood Canyon Rd / Fort Union Blvd / SR-1", city: "Cottonwood Heights" },
      { name: "North County Blvd / 1100 E, AFK / 2000 W, PLG / SR-129 @ 50 S, AFK / 1100 N, PLG", city: "American Fork" },
      { name: "Washington Blvd / Harrisville Rd / US-89 @ 2nd St / Washington Blvd / SR-235, OG", city: "Ogden" },
    ],
    sampleTitle: "Featured Utah canyon and corridor cameras",
    howtoTitle: "How to check Utah canyon roads",
    howto: [
      "Launch the WorldEye map — it works on phone and desktop, free.",
      "Zoom to the Salt Lake Valley and find the camera markers up Little and Big Cottonwood Canyons.",
      "Tap a marker on SR-210 or SR-190 to see current canyon conditions before you drive up.",
      "Check the canyon mouth first — the SR-210 @ Wasatch Blvd feed shows whether the closure is at the base or higher up, which decides whether it is worth waiting out.",
      "On ski mornings, check before 7 a.m. Traction law calls and avalanche closures are usually decided early, and the turnaround queue forms fast once the word spreads.",
      "For the daily commute, scan the I-15 feeds along your stretch of the Wasatch Front and the US-89 feeds around Ogden before leaving — then put the phone down and drive.",
    ],
    faqTitle: "Utah traffic cameras — FAQ",
    faqs: [
      {
        q: "Can I check whether Little Cottonwood Canyon is open?",
        a: "Yes. The SR-210 feeds at Wasatch Blvd and up the canyon show current conditions. UDOT posts traction laws and closures separately — the camera confirms what the road actually looks like right now.",
      },
      {
        q: "Are these cameras useful in summer?",
        a: "Yes — for I-15 congestion, construction zones, and weekend canyon traffic. Winter is peak season for the canyon feeds, but road work makes summer checks worthwhile too.",
      },
      {
        q: "Is there a cost to watch Utah's cameras?",
        a: "No. Every camera opens free on the WorldEye map with no account or signup.",
      },
      {
        q: "What is the difference between SR-210 and SR-190?",
        a: "SR-210 runs up Little Cottonwood Canyon — the steep, avalanche-prone one that closes most often. SR-190 runs up Big Cottonwood Canyon, slightly mellower but still subject to traction restrictions on storm days. Both are covered in the index.",
      },
      {
        q: "What are canyon traction laws?",
        a: "When UDOT declares a traction law for the canyons, two-wheel-drive vehicles without proper winter tires or chains are turned around at the base. The canyon-mouth cameras show the checkpoint in action — check before you drive up on a storm day.",
      },
      {
        q: "Can I see avalanche closures on the cameras?",
        a: "You can see the result: closed gates, empty road, plows working, or the queue of cars turned around at the base. UDOT announces the closures; the SR-210 and SR-190 feeds show you what they look like in real time.",
      },
      {
        q: "Is Parley's Canyon covered?",
        a: "Yes. The I-80 corridor through Parley's Canyon is part of the index — check it on Friday afternoons and ski weekends, when it is the slowest stretch on the Wasatch Front.",
      },
      {
        q: "Which cameras should Ogden commuters watch?",
        a: "The US-89 corridor feeds — Washington Blvd, Harrisville Rd, and 2nd St — watch the surface arterials through Ogden. I-15 covers the freeway side. Check both before the morning commute.",
      },
    ],
  },
  texas: {
    name: "Texas",
    title: "Texas Traffic Cameras — Houston & Dallas Cams",
    blurb:
      "Watch 4,390 live Texas traffic cameras across Houston, Dallas and Fort Worth — check I-10, I-35 and I-45 conditions free on WorldEye. No signup needed.",
    h1: "Texas Traffic Cameras",
    sub: "Watch 4,390 live Texas traffic cameras across Houston, Dallas, and Fort Worth.",
    intro: [
      "Texas contributes 4,390 cameras to the WorldEye index, concentrated in five metro networks: Houston's TranStar system with 1,172 feeds, Dallas with 843, Fort Worth with 489, San Antonio with 307, and Austin with 275. Together they watch the busiest freeway mileage in the state — I-10, I-45, I-35, and the tangle of loops and tollways around the metros.",
      "Houston's sheer count reflects TranStar, the regional traffic-management partnership that publishes one of the densest freeway camera grids in the country. TranStar's operators watch the same feeds you see here — the cameras exist so the region's traffic managers can spot incidents fast, and the public gets the same view. In Dallas–Fort Worth the coverage follows the interstates and the managed toll lanes — exactly where commute-time decisions get made.",
      "During hurricane season these cameras double as evacuation monitors: check I-45 north out of Houston or I-10 west before joining a contraflow. Year-round, they are the fastest way to see whether your route is moving.",
      "The Dallas–Fort Worth side of the index is a commuter's toolkit. I-35 is the north–south spine through the metroplex, I-10 anchors the west side, and the managed toll lanes that parallel the freeways get their own decision every morning: pay for speed or ride the free lanes. The feeds along both let you make that call with your eyes open instead of guessing from a red line on a map.",
      "Houston's grid earns its keep in the daily flood watch too. The city's flat terrain and concrete sprawl mean a fast-moving thunderstorm can put water across feeder roads and underpasses while the freeway above stays dry — the TranStar feeds show which is which before you choose your exit.",
      "All 4,390 feeds open free on the WorldEye map. Zoom to any of the three metros, tap a marker on your route, and you are looking at the same view the traffic managers see.",
    ],
    stats: [
      { value: "4,390", label: "live cameras" },
      { value: "5", label: "metro networks" },
      { value: "Free", label: "no account needed" },
    ],
    areaTitle: "Texas camera coverage by metro",
    howtoTitle: "How to check Texas freeway conditions",
    howto: [
      "Head to the free WorldEye globe in your browser.",
      "Zoom to Houston, Dallas, or Fort Worth — camera markers line the freeways.",
      "Click a marker on your route to watch that freeway camera's live feed.",
      "Check both directions, not just yours. Your side can be clear while the opposite carriageway is jammed — and on your return trip, that jammed side becomes yours.",
      "In Dallas–Fort Worth, compare the free lanes with the managed toll lanes before deciding whether the toll is worth it. The feeds make the price-per-minute math visible.",
      "During hurricane season, check I-45 north or I-10 west out of Houston before departing — not after you are already in the evacuation flow. And never check cameras while driving.",
    ],
    faqTitle: "Texas traffic cameras — FAQ",
    faqs: [
      {
        q: "Which Texas city has the most traffic cameras?",
        a: "Houston, by far — 1,172 feeds from the TranStar network. Dallas (843) and Fort Worth (489) follow, with San Antonio (307) and Austin (275) behind them.",
      },
      {
        q: "Can these cameras help during a hurricane evacuation?",
        a: "Yes. The Houston feeds along I-45, I-10, and US-290 show real evacuation-route conditions. Check them before departing rather than relying only on radio reports.",
      },
      {
        q: "Are the cameras live video?",
        a: "Most Texas freeway feeds refresh as images every few seconds — enough to judge whether traffic is flowing or stopped, which is what they are published for.",
      },
      {
        q: "What is TranStar?",
        a: "TranStar is the Houston region's traffic-management partnership — the agency collaboration that publishes the city's 1,172-feed camera grid. Its operators monitor the same feeds to spot incidents, and the public gets the same view free.",
      },
      {
        q: "Are the Dallas managed toll lanes covered?",
        a: "Coverage in Dallas–Fort Worth follows the interstates and the managed toll lanes, so you can compare the tolled and free lanes side by side before deciding whether to pay.",
      },
      {
        q: "Can I check I-35 through the Dallas–Fort Worth metroplex?",
        a: "Yes. I-35 is the north–south spine through the metroplex and sits inside the Dallas–Fort Worth coverage — check the feeds along your stretch before the commute.",
      },
      {
        q: "Do the cameras work at night?",
        a: "Yes. Freeway cameras are lit by roadway lighting, and headlights make traffic flow easy to read after dark — a jammed freeway is obvious at any hour.",
      },
      {
        q: "Can I see street flooding on Houston cameras?",
        a: "Often. Houston's flat terrain means fast thunderstorms can flood feeder roads and underpasses while the elevated freeway stays dry. The TranStar feeds show the difference — check before choosing your exit on storm days.",
      },
    ],
  },
  florida: {
    name: "Florida",
    title: "Florida Traffic Cameras — Tampa, Broward & Miami",
    blurb:
      "See 4,935 live Florida traffic cameras across Tampa, Broward and Miami-Dade — check I-95, I-4 and Turnpike conditions free on WorldEye. No signup needed.",
    h1: "Florida Traffic Cameras",
    sub: "See 4,935 live Florida traffic cameras across Tampa, Broward, and Miami-Dade.",
    intro: [
      "Florida's 4,935 indexed cameras follow the state's population: Orange County (Orlando) leads with 561 feeds, Hillsborough County (Tampa) adds 502, Broward County 477, and Miami-Dade contributes 421. Coverage tracks I-4 across the peninsula, I-95 down the Atlantic coast, and the Turnpike and expressway network around Miami.",
      "Summer brings the daily thunderstorm pattern — intense, localized downpours that flood intersections and drop visibility to near zero for twenty minutes. The county camera grids are how locals check whether the storm sitting over their route has passed before heading out.",
      "From June through November the same cameras serve hurricane duty: I-95 and Florida's Turnpike are the primary evacuation arteries, and these feeds show what the road actually looks like when officials say to leave.",
      "I-4 is the peninsula's main artery and the most temperamental drive in the index — Tampa to the interior on a single interstate that absorbs commuter traffic, tourist traffic, and every afternoon storm cell between them. The Hillsborough County feeds watch the Tampa end; check them before committing to the corridor, especially on summer afternoons when a cell can sit over one interchange and leave the next one dry.",
      "In South Florida the story is the expressway network. Miami-Dade's 421 feeds and Broward's 477 watch I-95 and the web of toll expressways around Miami and Fort Lauderdale — the roads where a single crash at rush hour ripples across three counties. Winter is the busy season here, when seasonal visitors swell traffic and every camera earns its keep.",
      "All 4,935 feeds open free on the WorldEye map. Zoom to Tampa, Fort Lauderdale, or Miami, tap a marker on your route, and you are seeing the same intersections the county traffic centers watch.",
    ],
    stats: [
      { value: "4,935", label: "live cameras" },
      { value: "8", label: "county networks" },
      { value: "Free", label: "no account needed" },
    ],
    areaTitle: "Florida camera coverage by county",
    howtoTitle: "How to check Florida road conditions",
    howto: [
      "Open the WorldEye live map — no account or download needed.",
      "Zoom to Tampa, Fort Lauderdale, or Miami and find the camera markers along the interstates.",
      "Tap any marker to open that county traffic camera's live feed.",
      "On summer afternoons, check the camera nearest your route, wait twenty minutes, and check again. Florida's thunderstorms are intense but fast-moving — the storm over your interchange may already be gone.",
      "During hurricane season, check I-95 or Florida's Turnpike before departing and re-check at every stop. Conditions change as the storm moves.",
      "Check before you drive, not while driving. Have a passenger look or pull over — the feeds will still be there when you stop.",
    ],
    faqTitle: "Florida traffic cameras — FAQ",
    faqs: [
      {
        q: "Which part of Florida has the most traffic cameras?",
        a: "Orange County (Orlando) with 561 feeds, followed by Hillsborough County (502), Broward County (477), and Miami-Dade (421). Eight county networks hold the bulk of the state's 4,935 indexed cameras.",
      },
      {
        q: "Do the cameras help during hurricane evacuations?",
        a: "Yes. I-95 and Florida's Turnpike are the main evacuation routes, and the county feeds along them show real conditions — check before you leave, and re-check at each stop.",
      },
      {
        q: "Are these beach webcams?",
        a: "No — these are county traffic cameras aimed at roads and intersections. For Florida beach views, browse the scenic cameras on the main WorldEye map.",
      },
      {
        q: "Can I check whether an afternoon thunderstorm has flooded my route?",
        a: "Yes — that is one of the best uses. Florida's summer storms flood intersections fast and clear fast. Check the camera on your route; if the intersection is clear and traffic is moving, the cell has passed.",
      },
      {
        q: "Which roads should I watch driving across the peninsula?",
        a: "I-4 is the covered corridor across the peninsula — check the Hillsborough County feeds before leaving Tampa. Heading down the Atlantic coast, the Broward and Miami-Dade feeds watch I-95 and the Turnpike.",
      },
      {
        q: "Do the cameras cover Florida's Turnpike?",
        a: "Yes. The Turnpike is one of the named corridors in the index, alongside I-95 and the expressway network around Miami — and it is a primary hurricane evacuation artery, so its feeds get heavy use from June through November.",
      },
      {
        q: "What about the Panhandle and central Florida?",
        a: "The index covers eight county networks — Orlando's Orange County, Tampa, Broward, and Miami-Dade are the biggest, with Leon (Tallahassee), Sarasota, Duval, and Palm Beach behind them — holding the bulk of the 4,935 feeds. Coverage follows the metros and the interstate corridors between them.",
      },
      {
        q: "Are the cameras useful at night?",
        a: "Yes. The county grids watch lit interstates and expressways, and headlights make traffic flow readable after dark. Night is also when you will spot crashes and lane closures fastest.",
      },
    ],
  },
  indiana: {
    name: "Indiana",
    title: "Indiana Traffic Cameras — Live INDOT Highway Cams",
    blurb:
      "Watch 572 live Indiana highway cameras — I-64, I-65 and I-70 road conditions including the Sherman Minton Bridge — free on WorldEye. No signup needed.",
    h1: "Indiana Traffic Cameras",
    sub: "Watch 572 live Indiana highway cameras — I-64, I-65, and I-70 road conditions.",
    intro: [
      "Indiana's 572 cameras are INDOT highway feeds, and the signature views look south across the Ohio River: the I-64 Sherman Minton Bridge between New Albany, Indiana and Louisville, Kentucky is covered from multiple angles — upper and lower decks, both directions.",
      "Beyond the river crossing, coverage follows the freight corridors: I-65 between Indianapolis and Chicago, I-70 across the middle of the state, and I-64 running the southern tier. Winter lake-effect snow off Lake Michigan makes the northwest feeds worth checking from December through February.",
      "The Sherman Minton is the crossing that matters most in the index because it is the I-64 crossing — the southern tier's Ohio River bridge, carrying interstate traffic that has no interest in stopping in either downtown. The featured feeds watch both decks in both directions, so you can see a backup forming on your deck before you are committed to the bridge.",
      "The rest of the index is working freight country. I-65 is the Chicago–Indianapolis truck corridor, I-70 is the east–west artery across central Indiana, and both run heavy with commercial traffic around the clock. The cameras are how you spot the lane closures and work zones that turn those corridors into parking lots — check before a long haul, not after you are in the queue.",
      "Winter rewrites the priorities. Lake-effect snow bands off Lake Michigan bury northwest Indiana while the southern tier stays clear, and the difference between the two can be a hundred miles of clear interstate. From December through February, check the feeds along your actual route — a statewide forecast will not tell you which corridor got hit.",
      "Featured feeds below show the Sherman Minton Bridge approaches on both decks. All 572 cameras open free on the WorldEye map.",
    ],
    stats: [
      { value: "572", label: "live cameras" },
      { value: "5", label: "featured bridge feeds" },
      { value: "I-64", label: "signature corridor" },
    ],
    samples: [
      { name: "I-64: ky1-064-000-0-wb-_-cam-1 KY I-64 WB / 0.0 @ SHERMAN MINTON BR IN SIDE UPPE", city: "New Albany" },
      { name: "I-64: ky1-064-000-0-eb-_-cam-2 KY I-64 EB/ 0.0 @ SHERMAN MINTON BR IN SIDE LOWER", city: "New Albany" },
      { name: "I-64: ky1-064-000-1-eb-_-cam-2 KY I-64 EB / 0.1 @ SHERMAN MINTON BR CENTER LOWER", city: "New Albany" },
      { name: "I-64: ky1-064-000-1-wb-_-cam-1 KY I-64 WB / 0.1 @ SHERMAN MINTON BY CENTER UPPER", city: "New Albany" },
      { name: "I-64: ky1-064-000-3-eb-_-cam-2 KY I-64 EB / 0.3 @ SHERMAN MINTON BR KY LOWER DEC", city: "New Albany" },
    ],
    sampleTitle: "Featured I-64 Sherman Minton Bridge cameras",
    howtoTitle: "How to check Indiana highway conditions",
    howto: [
      "Launch the WorldEye map — it works on phone and desktop, free.",
      "Pan to southern Indiana and find the camera markers along I-64 at the Ohio River.",
      "Select a bridge marker to watch the Sherman Minton crossing live, both decks.",
      "Compare the upper-deck and lower-deck feeds for your direction before crossing — a backup on one deck does not always mean the other is jammed.",
      "In winter, check the northwest feeds along I-65 before driving. Lake-effect bands are narrow; the camera on your corridor tells you more than any statewide forecast.",
      "For long hauls on I-65 or I-70, scan a few cameras along your route for work zones and lane closures — then drive. Do not check feeds from behind the wheel.",
    ],
    faqTitle: "Indiana traffic cameras — FAQ",
    faqs: [
      {
        q: "What does the Sherman Minton Bridge camera show?",
        a: "Multiple INDOT feeds cover the I-64 bridge between New Albany, Indiana and Louisville, Kentucky — upper and lower decks in both directions — so you can check bridge traffic before crossing the Ohio River.",
      },
      {
        q: "Are I-65 and I-70 covered?",
        a: "Yes. Indiana's 572-camera index follows the main freight corridors: I-65 between Indianapolis and Chicago, I-70 across central Indiana, and I-64 along the southern tier.",
      },
      {
        q: "Do Indiana cameras show winter snow conditions?",
        a: "Yes — that is one of their best uses. Lake-effect snow hits northwest Indiana hardest from December through February; check the feeds along your route before driving.",
      },
      {
        q: "Which bridge feed should I check before crossing?",
        a: "Match the feed to your direction and deck: the index covers the upper and lower decks in both directions. Check the one for the way you are actually driving — congestion on the eastbound lower deck says nothing about your westbound upper-deck trip.",
      },
      {
        q: "Can I see the Louisville skyline from these cameras?",
        a: "No. These are INDOT highway cameras aimed at the bridge deck and approaches — lanes, barriers, and traffic — not scenic overlooks. They are for checking the crossing, not sightseeing.",
      },
      {
        q: "Is Indianapolis covered?",
        a: "Indianapolis sits where the covered corridors meet — I-65 runs through it between Chicago and the southern tier, and I-70 crosses it east–west. Check the feeds on whichever interstate you are taking through the city.",
      },
      {
        q: "Can I check bridge traffic before commuting from Indiana to Louisville?",
        a: "Yes — that is exactly what the Sherman Minton feeds are for. Open the live map, find the I-64 bridge markers at the Ohio River, and check your deck and direction before leaving New Albany.",
      },
      {
        q: "Do the cameras show construction and lane closures?",
        a: "Lane closures and work zones show up on the feeds as coned lanes and narrowed traffic. The freight corridors get heavy construction in summer — scan the cameras along your I-65 or I-70 route before a long drive.",
      },
    ],
  },
  nevada: {
    name: "Nevada",
    title: "Nevada Traffic Cameras — Live NDOT Highway Cams",
    blurb:
      "Check 771 live Nevada highway cameras — Las Vegas corridors, I-15 resort traffic and I-80 desert conditions — free on the WorldEye map. No signup needed.",
    h1: "Nevada Traffic Cameras",
    sub: "Check 771 live Nevada highway cameras — Las Vegas corridors and desert interstates.",
    intro: [
      "Nevada's 771 cameras watch a state where nearly every long drive crosses open desert. Coverage concentrates on the I-15 resort corridor through Las Vegas — the busiest stretch of interstate in the state — plus I-80 through Reno and US-95 running north–south.",
      "Desert driving has its own hazards, and these cameras are how you spot them early: summer dust storms that erase visibility on I-15 near the California line, flash-flood debris after monsoon bursts, and winter chain controls over the passes west of Reno.",
      "The I-15 corridor is really two different drives. South of Las Vegas it is the resort run — weekend traffic streaming in from California, event nights, and the long Friday-night queue at the state line. The cameras near the California line show that story plainly: brake lights stretching into the desert or a clean run, depending on the hour. North of the city the same interstate empties into open desert, where the hazard shifts from congestion to weather.",
      "Summer is dust-storm season. When the wind picks up across the desert floor, visibility on I-15 near the California line can drop to nothing in minutes — and the corridor feeds show the wall of dust before you drive into it. Monsoon bursts do the rest: a half hour of violent rain can wash debris across low stretches of highway, and the cameras show whether the road is clear or a mess before you commit.",
      "Winter belongs to the north. I-80 through Reno climbs into the Sierra foothills, and the passes west of the city go to chain controls when storms roll through — the feeds there are how you confirm whether the pass is open, restricted, or closed before leaving town. US-95, the north–south alternative through central Nevada, is the long lonely backup when the interstates misbehave.",
      "Las Vegas visitors use the corridor feeds differently — checking whether the Strip-area interstates are jammed before heading to the airport. All 771 feeds open free on the WorldEye map.",
    ],
    stats: [
      { value: "771", label: "live cameras" },
      { value: "I-15", label: "busiest corridor" },
      { value: "Free", label: "no account needed" },
    ],
    howtoTitle: "How to check Nevada desert highways",
    howto: [
      "Head to the free WorldEye globe in your browser.",
      "Zoom to Las Vegas or Reno and find the camera markers along I-15, I-80, and US-95.",
      "Click a marker to watch that Nevada highway camera's live feed.",
      "On windy summer days, check the I-15 feeds near the California line before departing. If the camera shows a wall of dust, delay the drive — visibility can drop to zero in minutes.",
      "In winter, check the I-80 feeds west of Reno for chain controls before heading into the Sierra foothills. The pass cameras show whether it is open, restricted, or closed.",
      "Heading to the airport in Las Vegas? Check the Strip-area interstate feeds first, then put the phone away — never check cameras while driving.",
    ],
    faqTitle: "Nevada traffic cameras — FAQ",
    faqs: [
      {
        q: "Can I check Las Vegas Strip-area traffic?",
        a: "The feeds cover the I-15 resort corridor and downtown Las Vegas interchanges — enough to judge whether the freeways around the Strip are jammed before you head out.",
      },
      {
        q: "Do the cameras show dust storms?",
        a: "Yes. Summer dust storms on I-15 near the California line are clearly visible on the corridor feeds — if visibility drops, you will see it before you drive into it.",
      },
      {
        q: "Is I-80 to Reno covered?",
        a: "Yes. Nevada's 771-camera index includes the I-80 corridor through Reno and the mountain passes to the west, where winter chain controls apply.",
      },
      {
        q: "Can I check the drive from Las Vegas toward California?",
        a: "Yes. The I-15 corridor feeds run south toward the California line — check them for weekend resort traffic and, in summer, for dust storms that can shut down visibility with no warning.",
      },
      {
        q: "What are chain controls?",
        a: "When winter storms hit the passes west of Reno, vehicles without chains or proper winter tires are stopped or turned around. The I-80 pass cameras show whether controls are in effect — check before leaving Reno on a storm day.",
      },
      {
        q: "Is US-95 covered?",
        a: "Yes. US-95 running north–south through central Nevada is part of the 771-camera index — the long desert alternative when you want to avoid the interstate corridors.",
      },
      {
        q: "What should I look for during monsoon season?",
        a: "Flash-flood debris. A violent monsoon burst can wash rocks and mud across low stretches of desert highway in minutes. The cameras show whether the road ahead is clear or a mess — if it looks bad, wait it out.",
      },
      {
        q: "When is the worst traffic around Las Vegas?",
        a: "Friday and Sunday on the I-15 resort corridor — weekend visitors streaming in from California and back out. Event nights in the city jam the Strip-area interchanges. Check the corridor feeds before timing your drive.",
      },
    ],
  },
  arizona: {
    name: "Arizona",
    title: "Arizona Traffic Cameras — Live ADOT Road Cams",
    blurb:
      "Check 664 live Arizona traffic cameras — anchored by the Phoenix metro's ADOT freeway feeds, with Tucson, Flagstaff and border-corridor cameras — free on the WorldEye map. No signup needed.",
    h1: "Arizona Traffic Cameras",
    sub: "Check 664 live Arizona traffic cameras — Phoenix first, with Tucson and Flagstaff covered too.",
    intro: [
      "Arizona's 664 indexed cameras come with an honest shape up front: the Phoenix metro holds the deep core — 429 ADOT freeway feeds covering the Valley's freeway network, the corridors Phoenix commuters use every day — and the rest of the state is thinner but real. Tucson adds 53 feeds, Flagstaff 17, and Nogales 15 along the border corridor. If you are driving in Phoenix, this is a deep, useful network. Outside the metros the density drops fast, and this page will not pretend otherwise.",
      "Within the metro, the coverage is the real thing. The feeds watch the Phoenix freeway system as a working traffic network: congestion building at the peak, incidents and lane closures as they happen, and the slowdowns that ripple across the Valley when one corridor stops. ADOT publishes these cameras so drivers can check conditions before committing to a route — the same view its operators monitor.",
      "Desert driving writes its own hazard list, and the cameras are how you spot it early. Summer monsoon season sends dust storms across the Valley that can drop freeway visibility to near zero in minutes, followed by intense downpours that flood washes and low-lying sections while the elevated lanes stay dry. The metro feeds show both — the wall of dust on the horizon and the water across the low lanes — before you drive into either.",
      "Heat is the year-round background condition. Phoenix summers push freeway surfaces and stalled cars hard, and a breakdown in extreme heat becomes a traffic event fast — the cameras show the resulting queues and closures as they form. Winter is the Valley's easy season, but it is also visitor season, when event traffic and unfamiliar drivers swell the same corridors.",
      "The Phoenix-heavy shape of this index is worth understanding rather than apologizing for. Arizona's published camera coverage concentrates where the state's driving concentrates — the Phoenix metro holds the bulk of the state's population and freeway mileage. Tucson, Flagstaff, and the border corridors publish thinner networks, and the table below lists exactly what exists in each.",
      "All 664 feeds open free on the WorldEye map — no account, no download. Zoom into Phoenix, tap a camera marker near your route, and check conditions before you roll. Never check cameras while driving; pull over or have a passenger look.",
    ],
    stats: [
      { value: "664", label: "live cameras" },
      { value: "429", label: "in the Phoenix metro" },
      { value: "Free", label: "no account needed" },
    ],
    areaTitle: "Arizona camera coverage by area",
    areaNote:
      "Coverage concentrates in the Phoenix metro — 429 of the 664 indexed feeds are ADOT freeway cameras in the Valley. Tucson (53), Flagstaff (17), and Nogales (15) are covered at lower density.",
    howtoTitle: "How to check Phoenix road conditions",
    howto: [
      "Open the free WorldEye map in your browser — no account or download needed.",
      "Zoom to Phoenix and look for camera markers along the metro freeway network.",
      "Tap any marker to open that ADOT freeway camera's live feed.",
      "Compare the feeds on your route with the parallel corridor before committing — Valley slowdowns ripple across routes, and the cameras show which one is moving.",
      "During monsoon season, check the feeds before departing. If a camera shows a wall of dust or water across the low lanes, delay the drive — both usually pass faster than they arrive.",
      "Never check cameras while driving. Pull over or have a passenger look, then decide your route before you roll.",
    ],
    faqTitle: "Arizona traffic cameras — FAQ",
    faqs: [
      {
        q: "Do these cameras cover all of Arizona?",
        a: "Not evenly — and that is stated plainly on this page. Phoenix holds 429 of the 664 indexed feeds; Tucson (53) and Flagstaff (17) have real but thinner coverage, and rural Arizona is sparse. The index does not claim uniform statewide density.",
      },
      {
        q: "Which Arizona city has the most traffic cameras?",
        a: "Phoenix — 429 of the 664. Arizona's published camera coverage concentrates in the Valley, where most of the state's population and freeway mileage is.",
      },
      {
        q: "What is ADOT?",
        a: "The Arizona Department of Transportation. The feeds indexed here are ADOT cameras — 429 in the Phoenix metro, with more in Tucson, Flagstaff, and along the border corridors — published so drivers can check congestion, incidents, and weather conditions before driving.",
      },
      {
        q: "Can the cameras show dust storms?",
        a: "Yes. Summer monsoon dust storms cross the Valley fast and can drop freeway visibility to near zero in minutes — the metro feeds show the dust wall before you drive into it. If a feed shows one, delay the trip.",
      },
      {
        q: "Can I check for monsoon flooding on my route?",
        a: "Yes. Intense monsoon downpours flood washes and low-lying freeway sections while elevated lanes stay dry. The feeds show water across the low lanes in real time — check your exact route during a storm, and never drive through flooded roadway.",
      },
      {
        q: "Are the cameras useful outside rush hour?",
        a: "Yes. Incidents, construction closures, and monsoon weather do not keep office hours. Event traffic in visitor season can jam the metro corridors at midday or late evening — a quick feed check is worth it before any cross-Valley drive.",
      },
      {
        q: "Do the cameras work at night?",
        a: "Yes. The metro freeway feeds are lit by roadway lighting, and headlights make traffic flow easy to read after dark — a jammed corridor is obvious at any hour.",
      },
      {
        q: "When is Phoenix traffic at its worst?",
        a: "Weekday morning and evening peaks on the metro freeway network, with monsoon afternoons in summer as the wild card — a single dust storm or downpour can stop a corridor outright. Check the feeds on your route before leaving.",
      },
    ],
  },
};

const fmt = (n: number) => n.toLocaleString("en-US");

// Every state's count, coverage areas and featured cameras come from
// the generated state index (src/data/us-states.json — each camera in
// the served US catalogue assigned to the state its coordinates fall
// in; see src/lib/us-states.ts). Camera records carry no state field,
// and the old hand-written counts on this page came from a stale
// snapshot that understated Florida by 3.4× and Texas by 1.8× — the
// editorial configs below keep their prose, but their numbers, areas
// and samples are always the measured ones.
function derivedConfig(d: UsStateData): StateCfg {
  const top = d.areas.slice(0, 3);
  const topList = top
    .map((a) => `${a.name} (${fmt(a.count)})`)
    .join(", ")
    .replace(/, ([^,]*)$/, " and $1");
  return {
    name: d.name,
    count: d.count,
    title: `${d.name} Traffic Cameras — Live Road Cams`,
    blurb: `Watch ${fmt(d.count)} live ${d.name} traffic cameras — led by ${top[0].name} with ${fmt(top[0].count)} feeds — free on the WorldEye map. No signup needed.`,
    h1: `${d.name} Traffic Cameras`,
    sub: `Watch ${fmt(d.count)} live ${d.name} traffic cameras — free on the WorldEye globe.`,
    intro: [
      `${d.name}'s ${fmt(d.count)} indexed cameras are counted from the cameras' own coordinates in the WorldEye catalogue: a feed belongs to this page when it physically sits inside ${d.name}'s borders. The coverage clusters where the driving is — ${topList} lead the index.`,
      "These are public road cameras — state DOT, county and city networks that watch freeways, arterials and passes so drivers can check conditions before they travel. The featured feeds below are real cameras from the index, listed under their published names.",
      "Use them the way the road agencies intend: a thirty-second check before you leave. Congestion, incidents, construction zones and weather all show up on the feeds as they happen — if your corridor is stopped, you will see it before you are sitting in it.",
      `All ${fmt(d.count)} feeds open free on the WorldEye map — no account, no download. Find ${d.name} on the map, tap a camera marker along your route, and check the road with your own eyes — before you drive, never while driving.`,
    ],
    stats: [
      { value: fmt(d.count), label: "live cameras" },
      { value: top[0].name, label: "largest cluster" },
      { value: "Free", label: "no account needed" },
    ],
    areas: d.areas,
    areaTitle: `${d.name} camera coverage by area`,
    samples: d.samples,
    howtoTitle: `How to check ${d.name} road conditions`,
    howto: [
      "Open the free WorldEye map in your browser — no account or download needed.",
      `Zoom to ${d.name} and look for camera markers along your route, starting near ${top[0].name}.`,
      "Tap any marker to open that camera's live feed.",
      "Compare the feeds on your route with the parallel corridor before committing — the cameras show which one is moving.",
      "Never check cameras while driving. Pull over or have a passenger look, then decide your route before you roll.",
    ],
    faqTitle: `${d.name} traffic cameras — FAQ`,
    faqs: [
      {
        q: `How many traffic cameras are in ${d.name}?`,
        a: `${fmt(d.count)} in the WorldEye index, counted from the cameras' own coordinates — every feed on this page physically sits inside ${d.name}. The largest cluster is ${top[0].name} with ${fmt(top[0].count)} feeds.`,
      },
      {
        q: `Which part of ${d.name} has the most cameras?`,
        a: `${topList}. Coverage follows the metros and the interstate corridors between them — rural stretches are thinner, and the table on this page shows exactly what exists.`,
      },
      {
        q: "Are the cameras live?",
        a: "Yes — the feeds are the public road cameras published by transportation agencies and their partners. Each one opens on the WorldEye map at its real location.",
      },
      {
        q: `How do I check ${d.name} road conditions before a drive?`,
        a: `Open the map, zoom to your route in ${d.name}, and tap the camera markers along it. Check the destination end too — weather and congestion at the far end of a long drive are their own story.`,
      },
      {
        q: "Does it cost anything?",
        a: "No. Every feed opens free on the map — no account and no download. Check before you drive, never while driving.",
      },
    ],
  };
}

function resolveState(slug: string): StateCfg | undefined {
  const data = getStateBySlug(slug);
  if (!data) return undefined;
  const editorial = STATES[slug];
  if (!editorial) return derivedConfig(data);
  return {
    ...editorial,
    count: data.count,
    stats: [
      { value: fmt(data.count), label: "live cameras" },
      ...editorial.stats.slice(1),
    ],
    areas: data.areas,
    samples: editorial.samples ?? data.samples,
  };
}

const RELATED: { label: string; href: string }[] = [
  ...getUsStatesIndex()
    .states.slice(0, 8)
    .map((s) => ({
      label: `${s.name} traffic cameras`,
      href: `/us-traffic-cameras/${s.slug}`,
    })),
  { label: "All live traffic cameras", href: "/live-traffic-cameras" },
];

/* The Current Status block reads a live weather snapshot (cached 30
   minutes in lib/weather-api); ISR at the same cadence — the city and
   country templates' pattern — keeps the baked page from going
   staler than the feed it quotes. */
export const revalidate = 1800;

export function generateStaticParams() {
  return getUsStatesIndex().states.map((s) => ({ state: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string }>;
}): Promise<Metadata> {
  const { state: slug } = await params;
  const s = resolveState(slug);
  if (!s) return { title: "Not found" };
  const url = `/us-traffic-cameras/${slug}`;
  return {
    title: s.title,
    description: s.blurb,
    alternates: { canonical: `${BASE}${url}` },
    openGraph: {
      title: s.title,
      description: s.blurb,
      url,
      type: "website",
    },
  };
}

export default async function StateTrafficPage({
  params,
}: {
  params: Promise<{ state: string }>;
}) {
  const { state: slug } = await params;
  const s = resolveState(slug);
  if (!s) notFound();

  /* Current Status + the "freeway cameras" FAQ (SEO template
     upgrade): the weather fetch follows the city/country pages'
     pattern — a clean no-op (null) unless the weather keys are
     configured and the provider answers, and the status lines assert
     conditions only from that snapshot. The query targets the state's
     largest camera cluster, the most representative single reading. */
  const topArea = s.areas?.[0];
  const placeWeather = await getPlaceWeather({
    query: topArea ? `${topArea.name}, ${s.name}` : s.name,
  });
  const statusRows = stateStatusRows({
    stateName: s.name,
    count: s.count,
    areas: s.areas ?? [],
    weather: placeWeather,
  });
  const displayFaqs: Faq[] = [
    ...s.faqs,
    stateFreewayFaq({
      stateName: s.name,
      count: s.count,
      areas: s.areas ?? [],
    }),
  ];
  const areasLinked: AreaRow[] | undefined = s.areas?.map((a) => {
    const citySlug = CITY_PAGE_BY_NAME.get(a.name);
    return citySlug ? { ...a, href: `/city-webcams/${citySlug}` } : a;
  });

  /* Data-bound "Questions people ask" entries (src/lib/place-answers.ts,
     ROLLOUT-SPEC §3 merge), computed from the same resolved config this
     page renders — its own count, areas and samples (§2.2). */
  const placeMerged = mergePlaceFaqs(
    displayFaqs,
    stateAnswers({
      slug,
      name: s.name,
      count: s.count,
      areas: s.areas ?? [],
      samples: (s.samples ?? []).map((x) => ({ name: x.name })),
    }),
  );

  const canonical = `${BASE}/us-traffic-cameras/${slug}`;
  const updated = formatDate(getUsStatesIndex().generatedAt);
  const items = s.samples ?? s.areas?.map((a) => ({ name: `${a.name} — ${a.count.toLocaleString("en-US")} cameras` })) ?? [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: s.title,
    description: s.blurb,
    url: canonical,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.map((it, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: it.name,
        url: BASE,
      })),
    },
  };

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={placeMerged.merged} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Countries", href: "/cameras/countries" },
          { label: s.h1 },
        ]}
      />
      <Hero h1={s.h1} sub={s.sub} />
      <StatRow stats={s.stats} />
      <Updated date={updated} />
      <Intro paragraphs={s.intro} />
      <CurrentStatus place={s.name} rows={statusRows} />
      {s.areas && <AreaTable title={s.areaTitle ?? "Coverage areas"} rows={areasLinked ?? s.areas} note={s.areaNote} />}
      {s.samples && <SampleGrid title={s.sampleTitle ?? "Featured live cameras"} samples={s.samples} />}
      <HowTo title={s.howtoTitle} steps={s.howto} />
      <FaqSection title={s.faqTitle} faqs={displayFaqs} />
      {placeMerged.surviving.length > 0 && (
        <VoiceQA entries={placeMerged.surviving} />
      )}
      <RelatedLinks
        title="More US traffic camera indexes"
        links={RELATED.filter((l) => l.href !== `/us-traffic-cameras/${slug}`)}
      />
      <RelatedLinks
        title="Guides"
        links={[
          { label: "How to check road conditions with live traffic cameras", href: "/blog/checking-road-conditions-live-traffic-cameras" },
        ]}
      />
      <CtaRow backHref="/cameras/countries" backLabel="All countries" />
    </PageShell>
  );
}
