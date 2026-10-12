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
  SampleGrid,
  HowTo,
  FaqSection,
  FaqJsonLd,
  RelatedLinks,
  CtaRow,
  PageShell,
  type Sample,
  type Faq,
} from "@/components/directory-page";

type CityCfg = {
  name: string;
  country: string;
  countrySlug: string;
  count: number;
  title: string;
  blurb: string;
  h1: string;
  sub: string;
  intro: string[];
  stats: { value: string; label: string }[];
  samples?: Sample[];
  sampleTitle?: string;
  howtoTitle: string;
  howto: string[];
  faqTitle: string;
  faqs: Faq[];
};

const CITIES: Record<string, CityCfg> = {
  london: {
    name: "London",
    country: "United Kingdom",
    countrySlug: "united-kingdom",
    count: 890,
    title: "London Live Webcams — 890 Street Cameras | WorldEye",
    blurb:
      "Watch 890 live London street cameras — North Circular, Blackwall Tunnel approaches and West End traffic views — free on the WorldEye map. No signup needed.",
    h1: "London Live Webcams",
    sub: "Watch 890 live London street cameras — free on the WorldEye globe.",
    intro: [
      "London accounts for 890 of the 899 cameras indexed in the United Kingdom — effectively the entire national feed is the capital's street and traffic camera grid. The views are working road cameras: the A406 North Circular, the A12 Blackwall Tunnel approaches, the A3 through Clapham, and junctions like Tottenham High Road and Stoke Newington Road.",
      "Several featured feeds sit around Westfield Stratford and the Olympic Park — Montfichet Road, Westfield Avenue, and the car parks — useful for checking event-day congestion. These are the same class of fixed road feeds Transport for London publishes for its network status.",
      "All 890 open free on the WorldEye map. Tap any marker across the capital to see current street conditions before you travel.",
    ],
    stats: [
      { value: "890", label: "live cameras" },
      { value: "#1", label: "of 10 UK areas" },
      { value: "99%", label: "of UK cameras" },
    ],
    samples: [
      { name: "A406 North Circular Rd/Telford Rd/Bounds Green Rd", city: "London" },
      { name: "A12 Blackwall Tunnel Nthern App/Gillender St", city: "London" },
      { name: "Westfield Ave/International Way/Car Park A", city: "London" },
      { name: "A3 Clapham Rd/Stockwell Rd/Landsdowne Way", city: "London" },
      { name: "Leyton Rd/Montfichet Rd/Penny Brookes St", city: "London" },
      { name: "Montfichet Rd/Hitchcock Lane/Car Park C", city: "London" },
      { name: "Tottenham High Road / Seven Sisters Rd", city: "London" },
      { name: "A10 Stoke Newington Rd/Millers Terrace", city: "London" },
      { name: "Montfichet Rd/Westfield Ave/Car Park B", city: "London" },
      { name: "A10 Stoke Newington Rd/Barretts Grove", city: "London" },
    ],
    sampleTitle: "Featured London street cameras",
    howtoTitle: "How to watch London street cameras",
    howto: [
      "Open the free WorldEye map — no account or download needed.",
      "Zoom to London; green camera markers cover the North Circular, the Thames crossings, and the West End.",
      "Tap any marker to open that street camera's live feed.",
    ],
    faqTitle: "London webcams — FAQ",
    faqs: [
      {
        q: "Are these the TfL traffic cameras?",
        a: "They are the same class of feed — fixed road cameras across London's street network, like the ones Transport for London publishes. Use them to check congestion before driving, not for sightseeing.",
      },
      {
        q: "Can I see central London landmarks on these cameras?",
        a: "No. These cameras watch roads and junctions, not tourist sights. For landmark and skyline views, browse the scenic cameras on the main WorldEye map.",
      },
      {
        q: "Do the cameras cover the congestion charge zone?",
        a: "Many feeds sit inside or near the charging zone — including the West End approaches. Check conditions before driving in during charging hours.",
      },
    ],
  },
  ottawa: {
    name: "Ottawa",
    country: "Canada",
    countrySlug: "canada",
    count: 428,
    title: "Ottawa Live Webcams — 428 Traffic Cameras | WorldEye",
    blurb:
      "See 428 live Ottawa traffic cameras across Canada's capital — check downtown road conditions and winter weather free on the WorldEye map. No signup needed.",
    h1: "Ottawa Live Webcams",
    sub: "See 428 live Ottawa traffic cameras across Canada's capital — free on the WorldEye globe.",
    intro: [
      "Ottawa is the single largest metro in Canada's camera index: 428 feeds, more than a quarter of the country's 1,509 cameras. The grid covers the capital's arterial network — the Queensway (Highway 417), downtown intersections, and the crossings to Gatineau.",
      "As the national capital in a snow-belt city, Ottawa's cameras earn their reputation in winter. Snow-clearing operations, freezing rain, and rush-hour collisions on the Queensway are all visible here — check the 417 feeds before a January commute, not during it.",
      "Every feed opens free on the WorldEye map. Zoom to Ottawa, tap a marker, and you are watching the same intersections the city's traffic center monitors.",
    ],
    stats: [
      { value: "428", label: "live cameras" },
      { value: "#1", label: "of 12 Canadian areas" },
      { value: "28%", label: "of Canada's cameras" },
    ],
    howtoTitle: "How to check Ottawa road conditions",
    howto: [
      "Launch the WorldEye map — it works on phone and desktop, free.",
      "Zoom to Ottawa and find the camera markers along the Queensway and downtown arterials.",
      "Select a marker to open that intersection camera's live feed.",
    ],
    faqTitle: "Ottawa webcams — FAQ",
    faqs: [
      {
        q: "Why does Ottawa have more cameras than Toronto in this index?",
        a: "The index reflects published municipal and provincial feeds. Ottawa's traffic-camera grid is the densest published network in the Canadian data at 428 feeds, ahead of Toronto's 339.",
      },
      {
        q: "Can I check winter road conditions in Ottawa?",
        a: "Yes — that is the best use of these feeds. The Queensway and arterial cameras show snowfall, plowing progress, and collisions in real time through the winter months.",
      },
      {
        q: "Are the bridges to Gatineau covered?",
        a: "Coverage focuses on Ottawa's arterial network, which includes the river crossings. Zoom to the Ottawa River on the live map to find the bridge cameras.",
      },
    ],
  },
  toronto: {
    name: "Toronto",
    country: "Canada",
    countrySlug: "canada",
    count: 339,
    title: "Toronto Live Webcams — 339 Street Cameras | WorldEye",
    blurb:
      "Watch 339 live Toronto street and highway cameras — check 400-series highways and downtown traffic conditions free on the WorldEye map. No signup needed.",
    h1: "Toronto Live Webcams",
    sub: "Watch 339 live Toronto street and highway cameras — free on the WorldEye globe.",
    intro: [
      "Toronto's 339 cameras make it the second-largest metro in Canada's index, behind Ottawa. Coverage follows the 400-series highways — the 401 across the top of the city, the 427, the Gardiner Expressway, and the Don Valley Parkway — plus major downtown arterials.",
      "The 401 through Toronto is one of the widest and busiest highways in North America, and these feeds are how commuters check whether it is moving before merging on. Lake-effect snow in winter and construction season in summer both show up clearly on the highway cameras.",
      "All 339 feeds open free on the WorldEye map — no account needed.",
    ],
    stats: [
      { value: "339", label: "live cameras" },
      { value: "#2", label: "of 12 Canadian areas" },
      { value: "22%", label: "of Canada's cameras" },
    ],
    howtoTitle: "How to check Toronto highway conditions",
    howto: [
      "Head to the free WorldEye globe in your browser.",
      "Zoom to Toronto — camera markers line the 401, the Gardiner, and the DVP.",
      "Click a marker on your route to watch that highway camera's live feed.",
    ],
    faqTitle: "Toronto webcams — FAQ",
    faqs: [
      {
        q: "Is Highway 401 covered by these cameras?",
        a: "Yes. Toronto's 339-camera index concentrates on the 400-series highways, and the 401 — the busiest stretch through the city — has the densest coverage.",
      },
      {
        q: "Are downtown Toronto streets covered too?",
        a: "Coverage concentrates on highways and major arterials rather than every downtown side street. The Gardiner Expressway and DVP feeds cover the core commute routes.",
      },
      {
        q: "Can I see the CN Tower or harbourfront?",
        a: "No — these are traffic cameras aimed at roads. For Toronto skyline and harbour views, browse the scenic cameras on the main WorldEye map.",
      },
    ],
  },
  madrid: {
    name: "Madrid",
    country: "Spain",
    countrySlug: "spain",
    count: 370,
    title: "Madrid Live Webcams — 370 Traffic Cameras | WorldEye",
    blurb:
      "See 370 live Madrid traffic cameras — M-30 ring road, Gran Vía avenues and busy city street views — free on the WorldEye live map. No signup needed.",
    h1: "Madrid Live Webcams",
    sub: "See 370 live Madrid traffic cameras — free on the WorldEye globe.",
    intro: [
      "Madrid leads Spain's camera index with 370 feeds — the largest of 12 Spanish areas and nearly a fifth of the country's 1,997 cameras. The network watches the M-30 ring road, the radial autovías (A-1 through A-6), and major city arteries.",
      "Madrid's rush hours run later than in most European capitals — the morning peak builds from 8:00 and the evening one stretches past 20:00. These feeds show the M-30 tunnels and access points where congestion concentrates, so check before driving across town.",
      "Every feed opens free on the WorldEye map. These are traffic cameras, not tourist views — for Plaza Mayor and Gran Vía on foot, the city's street life is better seen in person.",
    ],
    stats: [
      { value: "370", label: "live cameras" },
      { value: "#1", label: "of 12 Spanish areas" },
      { value: "19%", label: "of Spain's cameras" },
    ],
    howtoTitle: "How to check Madrid traffic",
    howto: [
      "Open the WorldEye live map — no account or download needed.",
      "Zoom to Madrid and look for camera markers along the M-30 ring and radial highways.",
      "Tap any marker to open that Madrid traffic camera's live feed.",
    ],
    faqTitle: "Madrid webcams — FAQ",
    faqs: [
      {
        q: "Is the M-30 ring road covered?",
        a: "Yes. Madrid's 370-camera index concentrates on the M-30 ring road, its tunnels, and the radial autovías — the corridors where the city's congestion concentrates.",
      },
      {
        q: "Can tourists see Gran Vía or Plaza Mayor on these cameras?",
        a: "No — these are traffic cameras aimed at roads and junctions, not plazas or landmarks. They are for checking driving conditions.",
      },
      {
        q: "When is Madrid traffic at its worst?",
        a: "Weekday mornings from around 8:00 and evenings stretching past 20:00. Check the M-30 feeds before crossing town during those windows.",
      },
    ],
  },
  houston: {
    name: "Houston",
    country: "United States",
    countrySlug: "united-states",
    count: 1158,
    title: "Houston Live Webcams — 1158 Traffic Cameras | WorldEye",
    blurb:
      "Watch 1158 live Houston freeway and traffic cameras — check freeway congestion and storm conditions free on the WorldEye map. No signup needed.",
    h1: "Houston Live Webcams",
    sub: "Watch 1158 live Houston freeway and traffic cameras — free on the WorldEye globe.",
    intro: [
      "Houston's 1,158 cameras make it the third-largest metro grid in the United States index — behind Georgia's statewide network and Utah, and ahead of every other city. The grid is a working freeway-camera system covering the metro's sprawling freeway network: the corridors commuters use every day and the underpasses that flood first in a storm.",
      "Houston is a city where the camera grid doubles as weather infrastructure. Gulf downpours can drop inches of rain in an hour, and the freeway feeds show standing water, slow-moving traffic and ponding on low sections in real time — check the cameras on your route during a storm, not after you're in it. Hurricane season makes this habit worth building year-round.",
      "All 1,158 feeds open free on the WorldEye map. Zoom to Houston, tap a freeway marker, and you are watching the same corridors the region's traffic managers watch.",
    ],
    stats: [
      { value: "1158", label: "live cameras" },
      { value: "#3", label: "of 12 US areas" },
      { value: "5%", label: "of US cameras" },
    ],
    howtoTitle: "How to check Houston freeway conditions",
    howto: [
      "Open the WorldEye live map — no account or download needed.",
      "Zoom to Houston; camera markers line the metro's freeway corridors.",
      "Tap a marker on your route to open that freeway camera's live feed.",
    ],
    faqTitle: "Houston webcams — FAQ",
    faqs: [
      {
        q: "Are these the TranStar freeway cameras?",
        a: "They are the same class of feed — fixed freeway and arterial cameras across the Houston metro, like the ones the region's traffic management publishes. Use them to check congestion and weather conditions before driving.",
      },
      {
        q: "Can I see flooding on these cameras?",
        a: "Yes — that is one of their best uses. During heavy rain, the freeway cameras show standing water, ponding on low sections and slow-moving traffic. Never drive through flooded roadway you see on a camera; turn around.",
      },
      {
        q: "When is Houston traffic at its worst?",
        a: "Weekday rush hours, roughly 7:00–9:00 and 16:30–19:00. Construction and rain extend both windows — check the freeway feeds before heading out.",
      },
    ],
  },
  dallas: {
    name: "Dallas",
    country: "United States",
    countrySlug: "united-states",
    count: 845,
    title: "Dallas Live Webcams — 845 Traffic Cameras | WorldEye",
    blurb:
      "Watch 845 live Dallas freeway and traffic cameras — check DFW metro congestion, weather and road conditions free on the WorldEye map. No signup.",
    h1: "Dallas Live Webcams",
    sub: "Watch 845 live Dallas freeway and traffic cameras — free on the WorldEye globe.",
    intro: [
      "Dallas accounts for 845 of the 23,059 cameras indexed in the United States — the fourth-largest of 12 US areas, behind Georgia, Utah and Houston. The grid watches the Dallas–Fort Worth metro's freeway network, the corridors where the region's long commutes concentrate. Fort Worth is indexed separately with another 489 feeds, so the DFW metro's combined coverage is among the deepest in the country.",
      "DFW's commutes are long, its construction zones are constant, and its weather swings from ice storms to severe thunderstorms. The freeway cameras earn their keep in all three: check for ice on the elevated sections in winter, hail and high water in spring, and the ever-present construction slowdowns before you merge on.",
      "All 845 feeds open free on the WorldEye map. Zoom to Dallas–Fort Worth, find the markers on your corridor, and check conditions before you drive.",
    ],
    stats: [
      { value: "845", label: "live cameras" },
      { value: "#4", label: "of 12 US areas" },
      { value: "4%", label: "of US cameras" },
    ],
    howtoTitle: "How to check Dallas freeway conditions",
    howto: [
      "Open the WorldEye live map — no account or download needed.",
      "Zoom to Dallas–Fort Worth; camera markers cover the metro's freeway corridors.",
      "Tap a marker on your route to open that freeway camera's live feed.",
    ],
    faqTitle: "Dallas webcams — FAQ",
    faqs: [
      {
        q: "Does this cover Fort Worth too?",
        a: "Fort Worth is indexed as its own area with 489 feeds. This index covers the 845 Dallas-area feeds — together they give the DFW metro some of the deepest freeway coverage in the country. Zoom out on the live map to see both grids.",
      },
      {
        q: "Can I check for ice on the roads in winter?",
        a: "Yes. During ice events, the elevated freeway sections are where problems start, and the camera grid shows conditions in real time. Check before driving — bridges and overpasses freeze first.",
      },
      {
        q: "When is Dallas traffic at its worst?",
        a: "Weekday mornings 7:00–9:00 and evenings 16:30–19:00, with construction zones congested at all hours. Spring storm season can shut corridors with little warning — check the feeds first.",
      },
    ],
  },
  tokyo: {
    name: "Tokyo",
    country: "Japan",
    countrySlug: "japan",
    count: 73,
    title: "Tokyo Live Webcams — 73 Street Cameras | WorldEye",
    blurb:
      "Watch 73 live Tokyo cameras — the largest camera grid in Japan — with expressway traffic and city views, free on the WorldEye map. No signup needed.",
    h1: "Tokyo Live Webcams",
    sub: "Watch 73 live Tokyo cameras — the largest grid in Japan — free on the WorldEye globe.",
    intro: [
      "Tokyo's 73 cameras make it the largest of 12 Japanese areas in the index and account for about 8% of Japan's 928 cameras. The grid is a mix of traffic and city feeds across the world's largest metro — expressways and arterial roads, with city views mixed in around the densest districts.",
      "Tokyo's cameras double as weather watchers. Typhoon season brings sudden downpours and high winds that show up on the road feeds, and the cameras around the bay and rivers give an early read on storm conditions. In a city this dense, a quick camera check before heading out can reroute your whole day.",
      "All 73 feeds open free on the WorldEye map. Zoom to Tokyo, tap a marker, and you are looking at the metro as it is right now.",
    ],
    stats: [
      { value: "73", label: "live cameras" },
      { value: "#1", label: "of 12 Japanese areas" },
      { value: "8%", label: "of Japan's cameras" },
    ],
    howtoTitle: "How to watch Tokyo live cameras",
    howto: [
      "Open the WorldEye live map — no account or download needed.",
      "Zoom to Tokyo; camera markers cover the expressways and central districts.",
      "Tap any marker to open that Tokyo camera's live feed.",
    ],
    faqTitle: "Tokyo webcams — FAQ",
    faqs: [
      {
        q: "Are these traffic cameras or city views?",
        a: "Both. Tokyo's 73-camera index mixes traffic and expressway feeds with city cameras around the densest districts — check the map markers to find the view you need.",
      },
      {
        q: "Can I check typhoon conditions in Tokyo?",
        a: "Yes. During typhoon season the road and bay-area cameras show rain, wind and standing water in real time — a useful check before traveling across the metro.",
      },
      {
        q: "Can I see Mount Fuji or the Skytree?",
        a: "These are mostly road and city feeds, not scenic overlooks. For landmark views, browse the scenic cameras on the main WorldEye map.",
      },
    ],
  },
  sydney: {
    name: "Sydney",
    country: "Australia",
    countrySlug: "australia",
    count: 186,
    title: "Sydney Live Webcams — 186 Traffic Cameras | WorldEye",
    blurb:
      "Watch 186 live Sydney metro traffic cameras — harbour crossings, freeways and beach routes — free on the WorldEye live map. No signup needed.",
    h1: "Sydney Live Webcams",
    sub: "Watch 186 live Sydney metro traffic cameras — free on the WorldEye globe.",
    intro: [
      "Sydney dominates Australia's camera index: 186 metro feeds across the central, north, west and south corridors — about 74% of the country's 250 cameras and the largest of 10 Australian areas. The grid watches the harbour crossings, the freeway network, and the routes that carry weekend traffic to the eastern beaches.",
      "The harbour bridges and tunnels are the city's natural chokepoints, and the camera grid shows them as they are right now: peak-hour queues, lane closures, and the beach-route crawl on a hot summer Saturday. Sudden downpours — Sydney gets its share — show up on the road feeds before they show up on your windshield.",
      "All 186 feeds open free on the WorldEye map. Zoom to Sydney, tap a marker on your route, and check conditions before you drive.",
    ],
    stats: [
      { value: "186", label: "live cameras" },
      { value: "#1", label: "of 10 Australian areas" },
      { value: "74%", label: "of Australia's cameras" },
    ],
    howtoTitle: "How to check Sydney traffic conditions",
    howto: [
      "Open the WorldEye live map — no account or download needed.",
      "Zoom to Sydney; camera markers cover the harbour crossings, freeways and beach routes.",
      "Tap a marker on your route to open that Sydney camera's live feed.",
    ],
    faqTitle: "Sydney webcams — FAQ",
    faqs: [
      {
        q: "Do the cameras cover the Harbour Bridge?",
        a: "Coverage follows the metro's main corridors, including the harbour crossings and approaches. Zoom to the harbour on the live map to find the bridge and tunnel cameras.",
      },
      {
        q: "Can I check beach traffic on a summer weekend?",
        a: "Yes. The grid covers the routes to the eastern beaches, so you can see the weekend crawl before you join it — check Saturday morning before leaving.",
      },
      {
        q: "When is Sydney traffic at its worst?",
        a: "Weekday peak hours around the harbour crossings, and summer weekends on the beach routes. Check the cameras on your corridor before heading out.",
      },
    ],
  },
};

const RELATED: { label: string; href: string }[] = [
  { label: "London live webcams", href: "/city-webcams/london" },
  { label: "Ottawa live webcams", href: "/city-webcams/ottawa" },
  { label: "Toronto live webcams", href: "/city-webcams/toronto" },
  { label: "Madrid live webcams", href: "/city-webcams/madrid" },
  { label: "Houston live webcams", href: "/city-webcams/houston" },
  { label: "Dallas live webcams", href: "/city-webcams/dallas" },
  { label: "Tokyo live webcams", href: "/city-webcams/tokyo" },
  { label: "Sydney live webcams", href: "/city-webcams/sydney" },
  { label: "All world city webcams", href: "/world-city-webcams" },
];

export function generateStaticParams() {
  return Object.keys(CITIES).map((city) => ({ city }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: slug } = await params;
  const c = CITIES[slug];
  if (!c) return { title: "Not found | WorldEye" };
  const url = `/city-webcams/${slug}`;
  return {
    title: c.title,
    description: c.blurb,
    alternates: { canonical: `${BASE}${url}` },
    openGraph: {
      title: c.title,
      description: c.blurb,
      url,
      type: "website",
    },
  };
}

export default async function CityWebcamPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city: slug } = await params;
  const c = CITIES[slug];
  if (!c) notFound();

  const canonical = `${BASE}/city-webcams/${slug}`;
  const updated = formatDate(directory.generatedAt);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: c.title,
    description: c.blurb,
    url: canonical,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: c.samples?.length ?? 0,
      itemListElement: (c.samples ?? []).map((s, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: s.city ? `${s.name} — ${s.city}` : s.name,
        url: BASE,
      })),
    },
  };

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={c.faqs} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Countries", href: "/cameras/countries" },
          { label: c.h1 },
        ]}
      />
      <Hero h1={c.h1} sub={c.sub} />
      <StatRow stats={c.stats} />
      <Updated date={updated} />
      <Intro paragraphs={c.intro} />
      {c.samples && <SampleGrid title={c.sampleTitle ?? "Featured live cameras"} samples={c.samples} />}
      <HowTo title={c.howtoTitle} steps={c.howto} />
      <FaqSection title={c.faqTitle} faqs={c.faqs} />
      <RelatedLinks
        title="More city webcam indexes"
        links={RELATED.filter((l) => l.href !== `/city-webcams/${slug}`)}
      />
      <RelatedLinks
        title="Guides"
        links={[
          { label: "Best live webcams in the world to watch right now", href: "/blog/best-live-webcams-world" },
          { label: "Using live cameras to plan travel", href: "/blog/using-live-cameras-to-plan-travel" },
        ]}
      />
      <CtaRow backHref={`/cameras/countries/${c.countrySlug}`} backLabel={`${c.country} cameras`} />
    </PageShell>
  );
}
