import type { Metadata } from "next";
import { CATALOGUE_GENERATED_AT } from "@/lib/explore-data";
import ConsolidatedCountries from "@/components/ConsolidatedCountries";
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
  HowTo,
  FaqSection,
  FaqJsonLd,
  RelatedLinks,
  CtaRow,
  PageShell,
} from "@/components/directory-page";

const TITLE = "North America Webcams — 46,125 Live Cameras";
const BLURB =
  "Browse 46,125 live webcams across 19 North American, Central American and Caribbean countries and territories — free on the WorldEye live map.";
const CANONICAL = `${BASE}/north-america-webcams`;

export const metadata: Metadata = {
  title: TITLE,
  description: BLURB,
  alternates: { canonical: CANONICAL },
  openGraph: { title: TITLE, description: BLURB, url: "/north-america-webcams", type: "website" },
};

const TOP_COUNTRIES = [
  { name: "United States", count: 41355 },
  { name: "Canada", count: 4685 },
  { name: "Mexico", count: 21 },
  { name: "US Virgin Islands", count: 21 },
  { name: "Costa Rica", count: 8 },
  { name: "Dominican Republic", count: 5 },
  { name: "Puerto Rico", count: 5 },
  { name: "Sint Maarten", count: 4 },
  { name: "Belize", count: 3 },
  { name: "El Salvador", count: 3 },
];

export default function NorthAmericaWebcamsPage() {
  const updated = formatDate(CATALOGUE_GENERATED_AT);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    description: BLURB,
    url: CANONICAL,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: TOP_COUNTRIES.length,
      itemListElement: TOP_COUNTRIES.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: `${c.name} — ${c.count.toLocaleString("en-US")} cameras`,
        url: BASE,
      })),
    },
  };

  const FAQS = [
          {
            q: "Why does the United States have so many more cameras than its neighbors?",
            a: "The US total of 41,355 reflects state departments of transportation publishing dense highway camera networks — Georgia, Utah, Texas, Florida, Indiana, and Nevada alone account for over 11,000 feeds. Canada's 4,685 is the next largest national total in the region.",
          },
          {
            q: "Are Caribbean islands covered?",
            a: "Yes. The index includes the US Virgin Islands (21 cameras), Puerto Rico, the Dominican Republic, Sint Maarten, Guadeloupe, Martinique, Barbados, Grenada, Bermuda, Honduras, and Curaçao, among others.",
          },
          {
            q: "Are these all traffic cameras?",
            a: "Mostly. North America's index is dominated by DOT highway feeds and municipal traffic cameras. Scenic coastline, mountain, and city views are mixed in on the same map — use search to find them.",
          },
          {
            q: "Which US states have the most cameras?",
            a: "Georgia leads by far with 4,284 DOT feeds, followed by Utah (2,084) and the Texas metros (2,506 across Houston, Dallas, and Fort Worth). Florida, Indiana, and Nevada round out the six states that together pass 11,000 feeds.",
          },
          {
            q: "Can I check border crossing traffic?",
            a: "Many feeds sit on border corridors and international crossings — particularly around Texas and the northern border states. Zoom to the crossing on the live map and look for camera markers on the approach roads.",
          },
          {
            q: "Are the Caribbean cameras useful during hurricane season?",
            a: "Yes — that is when the small island feeds earn their keep. The US Virgin Islands, Puerto Rico, and Dominican Republic cameras give live ground-level conditions that complement satellite imagery and forecasts.",
          },
          {
            q: "What is special about Ottawa's cameras?",
            a: "Ottawa's 444-feed municipal grid is the densest city network in the index. In winter the Queensway feeds show snow-clearing operations live — check them before a January commute.",
          },
          {
            q: "Do I need an account to watch?",
            a: "No. All 46,125 feeds across the region open free on the WorldEye map — no signup, no paywall.",
          },
          {
            q: "What is the best way to find cameras along a specific highway?",
            a: "Search the highway or the nearest city on the live map, then follow the road — DOT camera markers sit at interchanges and intervals along the corridor. For a long drive, note the two or three cameras at your decision points (the pass, the border, the city entry) and check those before you leave.",
          },
          {
            q: "Why do some states have thousands of cameras and others only a few?",
            a: "It follows each state's own publishing: some DOTs stream their entire camera network openly, others publish a subset or none. WorldEye indexes what is public, so the map is also a picture of which road authorities share their feeds — coverage grows as more networks open up.",
          },
        ];

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Countries", href: "/cameras/countries" },
          { label: "North America Live Webcams" },
        ]}
      />
      <Hero
        h1="North America Live Webcams"
        sub="Browse 46,125 live cameras across 19 countries and territories — free on the WorldEye globe."
      />
      <StatRow
        stats={[
          { value: "46,125", label: "live cameras" },
          { value: "19", label: "countries & territories" },
          { value: "#1", label: "largest regional index" },
        ]}
      />
      <Updated date={updated} />
      <Intro
        paragraphs={[
          "The North America index gathers 46,125 live cameras across 19 countries and territories — the largest regional collection on WorldEye. The United States dominates with 41,355 feeds, about 90% of the regional total, reflecting the country's vast state-DOT highway camera networks: Georgia alone contributes 4,284, Utah 2,084, and the Texas metros add 2,506.",
          "Canada adds 4,685 cameras — led by Ottawa's 444-feed municipal grid and Toronto's 413 — while Mexico, Central America, and the Caribbean contribute smaller but growing networks, including the US Virgin Islands, Costa Rica, the Dominican Republic, Panama, and Puerto Rico.",
          "What you will mostly find here are working road cameras: interstates, border crossings, and city arterials. They share the map with scenic feeds across the continent — everything opens free, no account needed.",
          "The US feeds are the practical core. Georgia's 4,284 DOT cameras blanket metro Atlanta's Downtown Connector and the I-285 Perimeter; Utah's 2,084 follow the Wasatch Front and the canyon roads like SR-210; Texas spreads 2,506 across Houston, Dallas, Fort Worth and the border corridors. Six states — Georgia, Utah, Texas, Florida, Indiana, Nevada — account for over 11,000 feeds between them, which is why the US total dwarfs its neighbors.",
          "Canada's 4,685 are worth a closer look than the raw number suggests. Ottawa's 444-feed grid is the densest municipal network in the index, and it earns its keep every winter — the Queensway feeds show snow-clearing operations in real time. Toronto's 413 cover the 401 corridor, the busiest highway in North America.",
          "The Caribbean and Central American entries are small but distinctive: the US Virgin Islands (21), Mexico (21), Costa Rica (8), the Dominican Republic (5), plus Puerto Rico, Sint Maarten, Guadeloupe, Martinique, Barbados, Grenada, Bermuda, Honduras, and Curaçao. During hurricane season these island feeds become genuinely useful — a live look at conditions beats a satellite loop for ground truth.",
          "The working habit this index rewards is the pre-drive check. Because the feeds are the road authorities' own, they show what the road is doing before the traffic apps color it: snow accumulating on a Utah canyon road, a queue forming at a border crossing, a Georgia interstate locking up ahead of the storm. Pick your corridor, learn its two or three key cameras, and a ten-second look before you leave replaces twenty minutes of finding out the hard way.",
        ]}
      />
      <AreaTable
        title="Top countries in North America"
        rows={TOP_COUNTRIES}
        note="Plus 9 more Caribbean and Central American entries in the index, totaling 46,125 cameras across 19 countries and territories."
      />
      <ConsolidatedCountries region="north-america" regionLabel="North America" />
      <HowTo
        title="How to browse North American cameras"
        steps={[
          "Open the free WorldEye map in your browser — no account or download needed.",
          "Zoom to any US state, Canadian metro, or Caribbean island; camera markers appear as green dots.",
          "Tap a marker to open that camera's live feed instantly.",
        ]}
      />
      <FaqSection
        title="North America webcams — FAQ"
        faqs={FAQS}
      />
      <RelatedLinks
        title="More regional webcam indexes"
        links={[
          { label: "Asia live webcams", href: "/asia-webcams" },
          { label: "Oceania live webcams", href: "/oceania-webcams" },
          { label: "How to check road conditions with live traffic cameras", href: "/blog/checking-road-conditions-live-traffic-cameras" },
          { label: "All camera countries", href: "/cameras/countries" },
        ]}
      />
      <CtaRow backHref="/cameras/countries" backLabel="All countries" />
    </PageShell>
  );
}
