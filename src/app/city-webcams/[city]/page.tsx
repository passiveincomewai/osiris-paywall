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
};

const RELATED: { label: string; href: string }[] = [
  { label: "London live webcams", href: "/city-webcams/london" },
  { label: "Ottawa live webcams", href: "/city-webcams/ottawa" },
  { label: "Toronto live webcams", href: "/city-webcams/toronto" },
  { label: "Madrid live webcams", href: "/city-webcams/madrid" },
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
