import type { Metadata } from "next";
import { notFound } from "next/navigation";
import directory from "@/data/camera-directory.json";
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

const STATES: Record<string, StateCfg> = {
  georgia: {
    name: "Georgia",
    count: 4330,
    title: "Georgia Traffic Cameras — Live GA DOT Road Cams | WorldEye",
    blurb:
      "Watch 4,330 live Georgia DOT highway cameras — Atlanta's Downtown Connector, I-75, I-85 and I-20 road conditions — free on the WorldEye map.",
    h1: "Georgia Traffic Cameras",
    sub: "Watch 4,330 live Georgia highway cameras — free on the WorldEye globe.",
    intro: [
      "Georgia holds the largest single-state camera index in the United States on WorldEye — 4,330 feeds, nearly all of them Georgia Department of Transportation highway cameras. The densest coverage sits over metro Atlanta: the I-75/I-85 Downtown Connector, the I-285 Perimeter loop, and the I-20 east–west corridor, with more cameras strung along I-16 toward Savannah and I-95 up the coast.",
      "Set expectations correctly: these are working road cameras, not scenic webcams. Each feed is a fixed view of lanes, ramps, or an interchange, published so drivers can check congestion, crashes, and lane closures. They are at their most useful during weekday rush hours and summer thunderstorm season, when Atlanta's low-lying interstates can flood with little warning.",
      "Everything here opens on the free WorldEye map — no account, no download. Zoom into Georgia, tap a camera marker near your route, and you are looking at the same view GDOT's own operators monitor.",
    ],
    stats: [
      { value: "4,330", label: "live cameras" },
      { value: "#1", label: "US state camera index" },
      { value: "Free", label: "no account needed" },
    ],
    howtoTitle: "How to check Georgia road conditions",
    howto: [
      "Open the free WorldEye map in your browser — no account or download needed.",
      "Zoom to Georgia and look for camera markers along I-75, I-85, I-285, and I-20.",
      "Tap any marker to open that GDOT highway camera's live feed.",
    ],
    faqTitle: "Georgia traffic cameras — FAQ",
    faqs: [
      {
        q: "Are these tourist webcams showing Georgia scenery?",
        a: "No. The 4,330 feeds indexed here are Georgia DOT highway cameras aimed at traffic — lanes, ramps, and interchanges. This page is for checking road conditions, not sightseeing.",
      },
      {
        q: "Do the cameras show live video or still images?",
        a: "Most GDOT feeds refresh as still images every few seconds rather than smooth video. That is plenty for judging congestion or whether a lane is blocked, which is what these cameras are for.",
      },
      {
        q: "Can I check Atlanta rush-hour traffic before leaving?",
        a: "Yes — that is the most common use. Open the live map, zoom to the Downtown Connector or I-285, and tap a camera near your on-ramp to see current conditions before you commit to the drive.",
      },
    ],
  },
  utah: {
    name: "Utah",
    count: 2082,
    title: "Utah Traffic Cameras — Live UDOT Road Cams | WorldEye",
    blurb:
      "Check 2,082 live Utah DOT road cameras — Cottonwood Canyon ski routes, I-15 corridor and Wasatch Front conditions — free on WorldEye. No signup needed.",
    h1: "Utah Traffic Cameras",
    sub: "Check 2,082 live Utah road cameras — canyon routes, I-15, and ski-area conditions.",
    intro: [
      "Utah's 2,082 indexed cameras are UDOT road feeds, and they cluster exactly where Utah driving gets interesting: the Cottonwood Canyon roads (SR-210 and SR-190) serving the ski resorts, the I-15 spine running the length of the Wasatch Front, and US-89 through Ogden and Logan.",
      "From November to April these cameras are essential equipment. Canyon traction laws, chain requirements, and avalanche closures on Little and Big Cottonwood are decided from views like these — check the SR-210 feeds before heading up, not after you are stuck in the turnaround queue. In summer, the same cameras show whether Parley's Canyon is crawling on a Friday afternoon.",
      "Featured feeds below include the SR-210/Wasatch Blvd junction and the US-89 corridor through Ogden. All 2,082 cameras open free on the WorldEye map.",
    ],
    stats: [
      { value: "2,082", label: "live cameras" },
      { value: "5", label: "featured canyon feeds" },
      { value: "#2", label: "US state camera index" },
    ],
    samples: [
      { name: "North Little Cottonwood Rd / Little Cottonwood Canyon Rd / SR-210 @ Little Cotto", city: "Utah" },
      { name: "North Little Cottonwood Rd / Wasatch Blvd / 3600 E / SR-210 @ Wasatch Blvd / 890", city: "Utah" },
      { name: "Wasatch Blvd / SR-190/SR-210 @ Big Cottonwood Canyon Rd / Fort Union Blvd / SR-1", city: "Utah" },
      { name: "North County Blvd / 1100 E, AFK / 2000 W, PLG / SR-129 @ 50 S, AFK / 1100 N, PLG", city: "Utah" },
      { name: "Washington Blvd / Harrisville Rd / US-89 @ 2nd St / Washington Blvd / SR-235, OG", city: "Utah" },
    ],
    sampleTitle: "Featured Utah canyon and corridor cameras",
    howtoTitle: "How to check Utah canyon roads",
    howto: [
      "Launch the WorldEye map — it works on phone and desktop, free.",
      "Zoom to the Salt Lake Valley and find the camera markers up Little and Big Cottonwood Canyons.",
      "Tap a marker on SR-210 or SR-190 to see current canyon conditions before you drive up.",
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
    ],
  },
  texas: {
    name: "Texas",
    count: 2492,
    title: "Texas Traffic Cameras — Houston & Dallas Cams | WorldEye",
    blurb:
      "Watch 2,492 live Texas traffic cameras across Houston, Dallas and Fort Worth — check I-10, I-35 and I-45 conditions free on WorldEye. No signup needed.",
    h1: "Texas Traffic Cameras",
    sub: "Watch 2,492 live Texas traffic cameras across Houston, Dallas, and Fort Worth.",
    intro: [
      "Texas contributes 2,492 cameras to the WorldEye index, concentrated in three metro networks: Houston's TranStar system with 1,158 feeds, Dallas with 845, and Fort Worth with 489. Together they watch the busiest freeway mileage in the state — I-10, I-45, I-35, and the tangle of loops and tollways around the metros.",
      "Houston's sheer count reflects TranStar, the regional traffic-management partnership that publishes one of the densest freeway camera grids in the country. In Dallas–Fort Worth the coverage follows the interstates and the managed toll lanes — exactly where commute-time decisions get made.",
      "During hurricane season these cameras double as evacuation monitors: check I-45 north out of Houston or I-10 west before joining a contraflow. Year-round, they are the fastest way to see whether your route is moving.",
    ],
    stats: [
      { value: "2,492", label: "live cameras" },
      { value: "3", label: "metro networks" },
      { value: "Free", label: "no account needed" },
    ],
    areas: [
      { name: "Houston (TranStar)", count: 1158 },
      { name: "Dallas", count: 845 },
      { name: "Fort Worth", count: 489 },
    ],
    areaTitle: "Texas camera coverage by metro",
    howtoTitle: "How to check Texas freeway conditions",
    howto: [
      "Head to the free WorldEye globe in your browser.",
      "Zoom to Houston, Dallas, or Fort Worth — camera markers line the freeways.",
      "Click a marker on your route to watch that freeway camera's live feed.",
    ],
    faqTitle: "Texas traffic cameras — FAQ",
    faqs: [
      {
        q: "Which Texas city has the most traffic cameras?",
        a: "Houston, by far — 1,158 feeds from the TranStar network, nearly half the state's indexed total. Dallas (845) and Fort Worth (489) make up the rest.",
      },
      {
        q: "Can these cameras help during a hurricane evacuation?",
        a: "Yes. The Houston feeds along I-45, I-10, and US-290 show real evacuation-route conditions. Check them before departing rather than relying only on radio reports.",
      },
      {
        q: "Are the cameras live video?",
        a: "Most Texas freeway feeds refresh as images every few seconds — enough to judge whether traffic is flowing or stopped, which is what they are published for.",
      },
    ],
  },
  florida: {
    name: "Florida",
    count: 1435,
    title: "Florida Traffic Cameras — Tampa, Broward & Miami | WorldEye",
    blurb:
      "See 1,435 live Florida traffic cameras across Tampa, Broward and Miami-Dade — check I-95, I-4 and Turnpike conditions free on WorldEye. No signup needed.",
    h1: "Florida Traffic Cameras",
    sub: "See 1,435 live Florida traffic cameras across Tampa, Broward, and Miami-Dade.",
    intro: [
      "Florida's 1,435 indexed cameras follow the state's population: Hillsborough County (Tampa) leads with 517 feeds, Broward County adds 496, and Miami-Dade contributes 422. Coverage tracks I-4 across the peninsula, I-95 down the Atlantic coast, and the Turnpike and expressway network around Miami.",
      "Summer brings the daily thunderstorm pattern — intense, localized downpours that flood intersections and drop visibility to near zero for twenty minutes. The county camera grids are how locals check whether the storm sitting over their route has passed before heading out.",
      "From June through November the same cameras serve hurricane duty: I-95 and Florida's Turnpike are the primary evacuation arteries, and these feeds show what the road actually looks like when officials say to leave.",
    ],
    stats: [
      { value: "1,435", label: "live cameras" },
      { value: "3", label: "county networks" },
      { value: "Free", label: "no account needed" },
    ],
    areas: [
      { name: "Hillsborough County (Tampa)", count: 517 },
      { name: "Broward County", count: 496 },
      { name: "Miami-Dade County", count: 422 },
    ],
    areaTitle: "Florida camera coverage by county",
    howtoTitle: "How to check Florida road conditions",
    howto: [
      "Open the WorldEye live map — no account or download needed.",
      "Zoom to Tampa, Fort Lauderdale, or Miami and find the camera markers along the interstates.",
      "Tap any marker to open that county traffic camera's live feed.",
    ],
    faqTitle: "Florida traffic cameras — FAQ",
    faqs: [
      {
        q: "Which part of Florida has the most traffic cameras?",
        a: "Tampa's Hillsborough County with 517 feeds, followed by Broward County (496) and Miami-Dade (422). Together the three counties hold all 1,435 of the state's indexed cameras.",
      },
      {
        q: "Do the cameras help during hurricane evacuations?",
        a: "Yes. I-95 and Florida's Turnpike are the main evacuation routes, and the county feeds along them show real conditions — check before you leave, and re-check at each stop.",
      },
      {
        q: "Are these beach webcams?",
        a: "No — these are county traffic cameras aimed at roads and intersections. For Florida beach views, browse the scenic cameras on the main WorldEye map.",
      },
    ],
  },
  indiana: {
    name: "Indiana",
    count: 703,
    title: "Indiana Traffic Cameras — Live INDOT Highway Cams | WorldEye",
    blurb:
      "Watch 703 live Indiana highway cameras — I-64, I-65 and I-70 road conditions including the Sherman Minton Bridge — free on WorldEye. No signup needed.",
    h1: "Indiana Traffic Cameras",
    sub: "Watch 703 live Indiana highway cameras — I-64, I-65, and I-70 road conditions.",
    intro: [
      "Indiana's 703 cameras are INDOT highway feeds, and the signature views look south across the Ohio River: the I-64 Sherman Minton Bridge between New Albany, Indiana and Louisville, Kentucky is covered from multiple angles — upper and lower decks, both directions.",
      "Beyond the river crossing, coverage follows the freight corridors: I-65 between Indianapolis and Chicago, I-70 across the middle of the state, and I-64 running the southern tier. Winter lake-effect snow off Lake Michigan makes the northwest feeds worth checking from December through February.",
      "Featured feeds below show the Sherman Minton Bridge approaches on both decks. All 703 cameras open free on the WorldEye map.",
    ],
    stats: [
      { value: "703", label: "live cameras" },
      { value: "5", label: "featured bridge feeds" },
      { value: "I-64", label: "signature corridor" },
    ],
    samples: [
      { name: "I-64: ky1-064-000-0-wb-_-cam-1 KY I-64 WB / 0.0 @ SHERMAN MINTON BR IN SIDE UPPE", city: "Indiana" },
      { name: "I-64: ky1-064-000-0-eb-_-cam-2 KY I-64 EB/ 0.0 @ SHERMAN MINTON BR IN SIDE LOWER", city: "Indiana" },
      { name: "I-64: ky1-064-000-1-eb-_-cam-2 KY I-64 EB / 0.1 @ SHERMAN MINTON BR CENTER LOWER", city: "Indiana" },
      { name: "I-64: ky1-064-000-1-wb-_-cam-1 KY I-64 WB / 0.1 @ SHERMAN MINTON BY CENTER UPPER", city: "Indiana" },
      { name: "I-64: ky1-064-000-3-eb-_-cam-2 KY I-64 EB / 0.3 @ SHERMAN MINTON BR KY LOWER DEC", city: "Indiana" },
    ],
    sampleTitle: "Featured I-64 Sherman Minton Bridge cameras",
    howtoTitle: "How to check Indiana highway conditions",
    howto: [
      "Launch the WorldEye map — it works on phone and desktop, free.",
      "Pan to southern Indiana and find the camera markers along I-64 at the Ohio River.",
      "Select a bridge marker to watch the Sherman Minton crossing live, both decks.",
    ],
    faqTitle: "Indiana traffic cameras — FAQ",
    faqs: [
      {
        q: "What does the Sherman Minton Bridge camera show?",
        a: "Multiple INDOT feeds cover the I-64 bridge between New Albany, Indiana and Louisville, Kentucky — upper and lower decks in both directions — so you can check bridge traffic before crossing the Ohio River.",
      },
      {
        q: "Are I-65 and I-70 covered?",
        a: "Yes. Indiana's 703-camera index follows the main freight corridors: I-65 between Indianapolis and Chicago, I-70 across central Indiana, and I-64 along the southern tier.",
      },
      {
        q: "Do Indiana cameras show winter snow conditions?",
        a: "Yes — that is one of their best uses. Lake-effect snow hits northwest Indiana hardest from December through February; check the feeds along your route before driving.",
      },
    ],
  },
  nevada: {
    name: "Nevada",
    count: 652,
    title: "Nevada Traffic Cameras — Live NDOT Highway Cams | WorldEye",
    blurb:
      "Check 652 live Nevada highway cameras — Las Vegas corridors, I-15 resort traffic and I-80 desert conditions — free on the WorldEye map. No signup needed.",
    h1: "Nevada Traffic Cameras",
    sub: "Check 652 live Nevada highway cameras — Las Vegas corridors and desert interstates.",
    intro: [
      "Nevada's 652 cameras watch a state where nearly every long drive crosses open desert. Coverage concentrates on the I-15 resort corridor through Las Vegas — the busiest stretch of interstate in the state — plus I-80 through Reno and US-95 running north–south.",
      "Desert driving has its own hazards, and these cameras are how you spot them early: summer dust storms that erase visibility on I-15 near the California line, flash-flood debris after monsoon bursts, and winter chain controls over the passes west of Reno.",
      "Las Vegas visitors use the corridor feeds differently — checking whether the Strip-area interstates are jammed before heading to the airport. All 652 feeds open free on the WorldEye map.",
    ],
    stats: [
      { value: "652", label: "live cameras" },
      { value: "I-15", label: "busiest corridor" },
      { value: "Free", label: "no account needed" },
    ],
    howtoTitle: "How to check Nevada desert highways",
    howto: [
      "Head to the free WorldEye globe in your browser.",
      "Zoom to Las Vegas or Reno and find the camera markers along I-15, I-80, and US-95.",
      "Click a marker to watch that Nevada highway camera's live feed.",
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
        a: "Yes. Nevada's 652-camera index includes the I-80 corridor through Reno and the mountain passes to the west, where winter chain controls apply.",
      },
    ],
  },
};

const RELATED: { label: string; href: string }[] = [
  { label: "Georgia traffic cameras", href: "/us-traffic-cameras/georgia" },
  { label: "Utah traffic cameras", href: "/us-traffic-cameras/utah" },
  { label: "Texas traffic cameras", href: "/us-traffic-cameras/texas" },
  { label: "Florida traffic cameras", href: "/us-traffic-cameras/florida" },
  { label: "Indiana traffic cameras", href: "/us-traffic-cameras/indiana" },
  { label: "Nevada traffic cameras", href: "/us-traffic-cameras/nevada" },
  { label: "All live traffic cameras", href: "/live-traffic-cameras" },
];

export function generateStaticParams() {
  return Object.keys(STATES).map((state) => ({ state }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string }>;
}): Promise<Metadata> {
  const { state: slug } = await params;
  const s = STATES[slug];
  if (!s) return { title: "Not found | WorldEye" };
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
  const s = STATES[slug];
  if (!s) notFound();

  const canonical = `${BASE}/us-traffic-cameras/${slug}`;
  const updated = formatDate(directory.generatedAt);
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
      <FaqJsonLd faqs={s.faqs} />
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
      {s.areas && <AreaTable title={s.areaTitle ?? "Coverage areas"} rows={s.areas} note={s.areaNote} />}
      {s.samples && <SampleGrid title={s.sampleTitle ?? "Featured live cameras"} samples={s.samples} />}
      <HowTo title={s.howtoTitle} steps={s.howto} />
      <FaqSection title={s.faqTitle} faqs={s.faqs} />
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
