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

const TITLE = "Asia Webcams — 5,858 Live Cameras";
const BLURB =
  "Explore 5,858 live webcams across 28 Asian countries — Taiwan, Hong Kong, Japan, South Korea and more — free on the WorldEye live map. No signup needed.";
const CANONICAL = `${BASE}/asia-webcams`;

export const metadata: Metadata = {
  title: TITLE,
  description: BLURB,
  alternates: { canonical: CANONICAL },
  openGraph: { title: TITLE, description: BLURB, url: "/asia-webcams", type: "website" },
};

const TOP_COUNTRIES = [
  { name: "Taiwan", count: 2779 },
  { name: "Hong Kong", count: 1185 },
  { name: "Japan", count: 928 },
  { name: "Turkey", count: 247 },
  { name: "Indonesia", count: 197 },
  { name: "Vietnam", count: 160 },
  { name: "South Korea", count: 138 },
  { name: "Thailand", count: 60 },
  { name: "Philippines", count: 25 },
  { name: "Kyrgyzstan", count: 21 },
  { name: "Malaysia", count: 20 },
  { name: "Israel", count: 19 },
];

export default function AsiaWebcamsPage() {
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
            q: "Which Asian country has the most live cameras?",
            a: "Taiwan, with 2,779 feeds — nearly half of Asia's 5,858 total. Hong Kong (1,185) and Japan (928) are next.",
          },
          {
            q: "Are these traffic cameras or scenic views?",
            a: "Both. Dense cities like Taipei, Hong Kong, and Tokyo lean toward traffic and urban monitoring feeds, while other parts of the region add highway and city views. Use the map's search to find what you want.",
          },
          {
            q: "Is my country included in this index?",
            a: "This page covers the 28 Asian entries currently in the WorldEye directory, listed in the table above. Coverage grows as new feeds are added — check the full country directory for the latest list.",
          },
          {
            q: "What is the best use of Taiwan's 2,779 cameras?",
            a: "Reading congestion. Taichung, Taipei, and Taoyuan run dense intersection grids — Taiyuan Road and Zhongqing Road in Taichung are good examples — and the feeds show live vehicle flow you can use to judge traffic before setting out.",
          },
          {
            q: "Can I watch Hong Kong harbor traffic?",
            a: "Hong Kong's 1,185 feeds include harbor approaches and cross-harbor tunnel views alongside the urban traffic grid. Zoom to Victoria Harbour on the live map and look for markers near the water.",
          },
          {
            q: "Do the cameras work at night?",
            a: "Most urban and highway feeds run 24 hours — you will see lit streets and headlights rather than daylight scenes. The region spans eight time zones, so when Tokyo is dark, Istanbul still has afternoon light.",
          },
          {
            q: "Are the feeds free to watch?",
            a: "Yes. Every camera in the Asian index opens free on the WorldEye map — no account, no signup, no paywall.",
          },
          {
            q: "Which countries have the smallest coverage?",
            a: "At the tail of the table: Thailand (60), the Philippines (25), Kyrgyzstan (21), Malaysia (20), and Israel (19). Coverage expands as new public feeds are indexed.",
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
          { label: "Asia Live Webcams" },
        ]}
      />
      <Hero
        h1="Asia Live Webcams"
        sub="Explore 5,858 live cameras across 28 Asian countries — free on the WorldEye globe."
      />
      <StatRow
        stats={[
          { value: "5,858", label: "live cameras" },
          { value: "28", label: "countries" },
          { value: "2,779", label: "cameras in Taiwan" },
        ]}
      />
      <Updated date={updated} />
      <Intro
        paragraphs={[
          "Asia's index holds 5,858 cameras across 28 countries — the third-largest regional collection on WorldEye, after North America and Europe. Taiwan alone contributes 2,779 feeds, nearly half the regional total, from its dense highway and city camera networks.",
          "Hong Kong adds 1,185 cameras and Japan 928, so the top three entries account for more than four-fifths of Asian coverage. Turkey (247), Indonesia (197), Vietnam (160), and South Korea (138) form the next tier, with the remainder spread from Israel and the Gulf states through Central Asia to Southeast Asia.",
          "Coverage here ranges from dense urban traffic grids — Taipei, Hong Kong, Tokyo — to highway networks and city views across the region. This page rolls up the 28 Asian entries in the WorldEye camera index; every feed opens free on the live map.",
          "Taiwan's 2,779 feeds are the story of the region: Taichung, Taipei, and Taoyuan run some of the densest intersection-camera grids in the index, and the feeds are genuinely useful for reading congestion — locals check the same intersections before setting out. If you have never watched an Asian traffic grid at rush hour, start here.",
          "Hong Kong's 1,185 cameras cover one of the most vertical cities on earth — harbor approaches, cross-harbor tunnels, and the Mid-Levels escalator corridors all appear in the feed mix. Japan's 928 lean toward expressways and urban monitoring, from Tokyo's Shuto Expressway network outward.",
          "The long tail is worth exploring too: Turkey's 247 feeds bridge Europe and Asia, Indonesia's 197 cover Jakarta's famously congested arterials, and Vietnam's 160 follow Hanoi and Ho Chi Minh City. Smaller entries — Thailand (60), the Philippines (25), Kyrgyzstan (21), Malaysia (20), Israel (19) — fill in Southeast and Central Asia. Time zones span UTC+2 to UTC+9, so there is always daylight somewhere in the region to watch.",
        ]}
      />
      <AreaTable
        title="Top countries in Asia"
        rows={TOP_COUNTRIES}
        note="Plus 16 more Asian entries in the index, totaling 5,858 cameras across 28 countries."
      />
      <HowTo
        title="How to watch Asian cameras live"
        steps={[
          "Launch the WorldEye map — it works on phone and desktop, free.",
          "Pan across Asia and zoom into Taiwan, Hong Kong, Japan, or any listed country.",
          "Select a green camera marker to open that feed's live stream.",
          "For traffic checks, open feeds during local rush hours — roughly 7–9 AM and 5–8 PM in each city's timezone.",
          "Use the map search to jump straight to a city like Taipei, Hong Kong, or Tokyo instead of panning manually.",
          "Remember the region spans UTC+2 to UTC+9: when it is night in Tokyo it is still afternoon in Istanbul — there is always daylight to watch somewhere.",
        ]}
      />
      <FaqSection
        title="Asia webcams — FAQ"
        faqs={FAQS}
      />
      <RelatedLinks
        title="More regional webcam indexes"
        links={[
          { label: "North America live webcams", href: "/north-america-webcams" },
          { label: "Oceania live webcams", href: "/oceania-webcams" },
          { label: "Best live webcams in the world to watch right now", href: "/blog/best-live-webcams-world" },
          { label: "All camera countries", href: "/cameras/countries" },
        ]}
      />
      <CtaRow backHref="/cameras/countries" backLabel="All countries" />
    </PageShell>
  );
}
