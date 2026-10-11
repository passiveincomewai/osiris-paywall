import type { Metadata } from "next";
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
  HowTo,
  FaqSection,
  FaqJsonLd,
  RelatedLinks,
  CtaRow,
  PageShell,
} from "@/components/directory-page";

const TITLE = "North America Webcams — 24,644 Live Cameras | WorldEye";
const BLURB =
  "Browse 24,644 live webcams across 18 North American, Central American and Caribbean countries and territories — free on the WorldEye live map.";
const CANONICAL = `${BASE}/north-america-webcams`;

export const metadata: Metadata = {
  title: TITLE,
  description: BLURB,
  alternates: { canonical: CANONICAL },
  openGraph: { title: TITLE, description: BLURB, url: "/north-america-webcams", type: "website" },
};

const TOP_COUNTRIES = [
  { name: "United States", count: 23059 },
  { name: "Canada", count: 1509 },
  { name: "US Virgin Islands", count: 21 },
  { name: "Mexico", count: 20 },
  { name: "Costa Rica", count: 7 },
  { name: "Dominican Republic", count: 5 },
  { name: "Sint Maarten", count: 4 },
  { name: "El Salvador", count: 3 },
  { name: "Belize", count: 2 },
  { name: "Bermuda", count: 2 },
];

export default function NorthAmericaWebcamsPage() {
  const updated = formatDate(directory.generatedAt);

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
            a: "The US total of 23,059 reflects state departments of transportation publishing dense highway camera networks — Georgia, Utah, Texas, Florida, Indiana, and Nevada alone account for over 11,000 feeds. Canada's 1,509 is the next largest national total in the region.",
          },
          {
            q: "Are Caribbean islands covered?",
            a: "Yes. The index includes the US Virgin Islands (21 cameras), Puerto Rico, the Dominican Republic, Sint Maarten, Guadeloupe, Martinique, Barbados, Grenada, Bermuda, Honduras, and Curaçao, among others.",
          },
          {
            q: "Are these all traffic cameras?",
            a: "Mostly. North America's index is dominated by DOT highway feeds and municipal traffic cameras. Scenic coastline, mountain, and city views are mixed in on the same map — use search to find them.",
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
        sub="Browse 24,644 live cameras across 18 countries and territories — free on the WorldEye globe."
      />
      <StatRow
        stats={[
          { value: "24,644", label: "live cameras" },
          { value: "18", label: "countries & territories" },
          { value: "#1", label: "largest regional index" },
        ]}
      />
      <Updated date={updated} />
      <Intro
        paragraphs={[
          "The North America index gathers 24,644 live cameras across 18 countries and territories — the largest regional collection on WorldEye. The United States dominates with 23,059 feeds, about 94% of the regional total, reflecting the country's vast state-DOT highway camera networks: Georgia alone contributes 4,330, Utah 2,082, and the Texas metros add 2,492.",
          "Canada adds 1,509 cameras — led by Ottawa's 428-feed municipal grid and Toronto's 339 — while Mexico, Central America, and the Caribbean contribute smaller but growing networks, including the US Virgin Islands, Costa Rica, the Dominican Republic, Panama, and Puerto Rico.",
          "What you will mostly find here are working road cameras: interstates, border crossings, and city arterials. They share the map with scenic feeds across the continent — everything opens free, no account needed.",
        ]}
      />
      <AreaTable
        title="Top countries in North America"
        rows={TOP_COUNTRIES}
        note="Plus 8 more Caribbean and Central American entries in the index, totaling 24,644 cameras across 18 countries and territories."
      />
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
