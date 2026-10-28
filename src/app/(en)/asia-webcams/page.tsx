import type { Metadata } from "next";
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
import DirectoryExplorer from "@/components/DirectoryExplorer";
import DirectorySearch from "@/components/DirectorySearch";
import ConsolidatedCountries from "@/components/ConsolidatedCountries";
import { isConsolidatedCountry } from "@/lib/indexation-gates";
import {
  CATALOGUE_GENERATED_AT,
  COUNTRY_INDEX,
  EXPLORE_SCOPES,
  areasForDef,
} from "@/lib/explore-data";

/* Every number on this page is computed from the generated camera
   index (camera-countries.json + the per-country records) — the same
   catalogue the country pages and the explorer below serve. The
   region is the country pages' own continental grouping
   (lib/country-page-content COUNTRY_REGION). */
const ASIA_SLUGS = new Set(EXPLORE_SCOPES.asia.slugs as string[]);
const ASIA = COUNTRY_INDEX.filter((c) => ASIA_SLUGS.has(c.slug)).sort(
  (a, b) => b.count - a.count,
);
const TOTAL = ASIA.reduce((s, c) => s + c.count, 0);
const BY_SLUG = new Map(ASIA.map((c) => [c.slug, c]));
const count = (slug: string) => BY_SLUG.get(slug)?.count ?? 0;
const fmt = (n: number) => n.toLocaleString("en-US");

const TITLE = `Asia Webcams — ${fmt(TOTAL)} Live Cameras`;
const BLURB = `Explore ${fmt(TOTAL)} live webcams across ${ASIA.length} Asian countries — Japan, Taiwan, South Korea, Hong Kong and more — free on the WorldEye live map. No signup needed.`;
const CANONICAL = `${BASE}/asia-webcams`;

export const metadata: Metadata = {
  title: TITLE,
  description: BLURB,
  alternates: { canonical: CANONICAL },
  openGraph: { title: TITLE, description: BLURB, url: "/asia-webcams", type: "website" },
};

/* The hub's country rows link to the country pages — the same
   server-rendered links the (indexed) Europe hub renders. Before
   this, the rows were plain text and the only paths down to the
   Asian country pages were the client-side explorer and the
   country directory. */
const TOP_COUNTRIES = ASIA.slice(0, 12).map((c) => ({
  name: c.name,
  count: c.count,
  /* C10: consolidated countries have no page — their row here links
     down to their anchored listing in the section below instead. */
  href: isConsolidatedCountry(c.slug)
    ? `#${c.slug}`
    : `/cameras/countries/${c.slug}`,
}));

/* The region's biggest city indexes, linked from the hub: the
   curated Tokyo page plus the largest generated Asian city pages
   (counts from city-pages.json via the catalogue — Busan 319,
   Osaka 229, Taichung 188, Taipei 165, Istanbul 236). */
const FEATURED_CITIES = [
  { label: "Tokyo live webcams", href: "/city-webcams/tokyo" },
  { label: "Busan live webcams", href: "/city-webcams/busan" },
  { label: "Osaka live webcams", href: "/city-webcams/osaka" },
  { label: "Istanbul live webcams", href: "/city-webcams/istanbul" },
  { label: "Taichung live webcams", href: "/city-webcams/taichung" },
  { label: "Taipei live webcams", href: "/city-webcams/taipei" },
];

export default async function AsiaWebcamsPage() {
  const updated = formatDate(CATALOGUE_GENERATED_AT);
  const areas = await areasForDef(EXPLORE_SCOPES.asia, 400);

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
        url: `${BASE}${c.href}`,
      })),
    },
  };

  const FAQS = [
    {
      q: "Which Asian country has the most live cameras?",
      a: `Japan, with ${fmt(count("japan"))} feeds — most of them the MLIT river and road monitoring networks, published openly across the country. Taiwan (${fmt(count("taiwan"))}) and South Korea (${fmt(count("south-korea"))}) are next.`,
    },
    {
      q: "Are these traffic cameras or scenic views?",
      a: "Both. Dense cities like Taipei, Hong Kong, and Busan lean toward traffic and urban monitoring feeds, Japan's network watches rivers and roads, and other parts of the region add highway and coastal views. Use the search above to find what you want.",
    },
    {
      q: "Is my country included in this index?",
      a: `This page covers the ${ASIA.length} Asian entries currently in the WorldEye directory, listed in the table below. Coverage grows as new feeds are added — check the full country directory for the latest list.`,
    },
    {
      q: "What is the best use of Taiwan's cameras?",
      a: `Reading congestion. Taiwan's ${fmt(count("taiwan"))} feeds include some of the densest intersection grids in the index — Taichung, Taipei, and Taoyuan — and the feeds show live vehicle flow you can use to judge traffic before setting out.`,
    },
    {
      q: "Can I watch Hong Kong harbor traffic?",
      a: `Hong Kong's ${fmt(count("hong-kong"))} feeds include harbor approaches and cross-harbor tunnel views alongside the urban traffic grid. Zoom to Victoria Harbour on the live map and look for markers near the water.`,
    },
    {
      q: "Do the cameras work at night?",
      a: "Most urban and highway feeds run 24 hours — you will see lit streets and headlights rather than daylight scenes. The region spans many time zones, so when Tokyo is dark, points west still have afternoon light.",
    },
    {
      q: "Are the feeds free to watch?",
      a: "Yes. Every camera in the Asian index opens free on the WorldEye map — no account, no signup, no paywall.",
    },
    {
      q: "Which countries have the smallest coverage?",
      a: `At the tail of the table: Thailand (${fmt(count("thailand"))}), Malaysia (${fmt(count("malaysia"))}), the Philippines (${fmt(count("philippines"))}), Kyrgyzstan (${fmt(count("kyrgyzstan"))}) and Israel (${fmt(count("israel"))}), down to single-camera entries like Nepal and India. Coverage expands as new public feeds are indexed.`,
    },
    {
      q: "Can I check monsoon or typhoon conditions on these cameras?",
      a: "Yes — that is one of the region's strongest uses. When a typhoon approaches Taiwan, Hong Kong or Japan, the coastal and city feeds show the wind, rain and street conditions as they develop, alongside the storm on the weather layer. Individual cameras can drop offline in the worst of a storm, so check several in the area.",
    },
    {
      q: "Why does Japan have so many more cameras than its neighbors?",
      a: "Japan's transport and river agencies publish an unusually dense and open camera network — river monitoring, expressways and urban intersections that most countries keep internal. The index reflects that openness: it is the largest national network on WorldEye.",
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
        sub={`Explore ${fmt(TOTAL)} live cameras across ${ASIA.length} Asian countries — free on the WorldEye globe.`}
      />
      <DirectorySearch
        label="Asia"
        options={areas}
        placeholder="Search Asia by city…"
        emptyText={'No cities in Asia match "{value}".'}
      />
      <StatRow
        stats={[
          { value: fmt(TOTAL), label: "live cameras" },
          { value: String(ASIA.length), label: "countries" },
          { value: fmt(count("japan")), label: "cameras in Japan" },
        ]}
      />
      <Updated date={updated} />
      <Intro
        paragraphs={[
          `Asia's index holds ${fmt(TOTAL)} cameras across ${ASIA.length} countries. Japan alone contributes ${fmt(count("japan"))} feeds — the largest national network on WorldEye — from its open river, road and city monitoring systems.`,
          `Taiwan adds ${fmt(count("taiwan"))}, South Korea ${fmt(count("south-korea"))} and Hong Kong ${fmt(count("hong-kong"))}, so the top four entries account for the great majority of Asian coverage. Vietnam (${fmt(count("vietnam"))}), Indonesia (${fmt(count("indonesia"))}) and Thailand (${fmt(count("thailand"))}) form the next tier, with the remainder spread from Israel and the Gulf states through Central Asia to Southeast Asia.`,
          "Coverage here ranges from dense urban traffic grids — Taipei, Hong Kong, Busan — to highway networks, river monitoring and coastal views across the region. This page rolls up the Asian entries in the WorldEye camera index; every feed below opens free, and every card is the camera's real live feed.",
          "Taiwan's feeds are the traffic story of the region: Taichung, Taipei, and Taoyuan run some of the densest intersection-camera grids in the index, and the feeds are genuinely useful for reading congestion — locals check the same intersections before setting out. If you have never watched an Asian traffic grid at rush hour, start here.",
          `Hong Kong's ${fmt(count("hong-kong"))} cameras cover one of the most vertical cities on earth — harbor approaches, cross-harbor tunnels, and the Mid-Levels escalator corridors all appear in the feed mix. Japan's ${fmt(count("japan"))} lean on its river and expressway networks, watched by the agencies that manage floods and traffic alike.`,
          "The long tail is worth exploring too: Indonesia's feeds cover Jakarta's famously congested arterials, and Vietnam's follow Hanoi and Ho Chi Minh City. Smaller entries fill in Southeast and Central Asia. Time zones span the continent, so there is always daylight somewhere in the region to watch.",
        ]}
      />
      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-5">Live cameras across Asia</h2>
        <DirectoryExplorer
          scopeKey="asia"
          scopeLabel="Asia"
          groupBy="country"
          searchPlaceholder="Search Asia cameras — a beach, a road, a district…"
        />
      </section>
      <AreaTable
        title="Top countries in Asia"
        rows={TOP_COUNTRIES}
        note={`Plus ${ASIA.length - TOP_COUNTRIES.length} more Asian entries in the index, totaling ${fmt(TOTAL)} cameras across ${ASIA.length} countries.`}
      />
      <ConsolidatedCountries region="asia" regionLabel="Asia" />
      <HowTo
        title="How to watch Asian cameras live"
        steps={[
          "Launch the WorldEye map — it works on phone and desktop, free.",
          "Pan across Asia and zoom into Japan, Taiwan, Hong Kong, or any listed country.",
          "Select a green camera marker to open that feed's live stream.",
          "For traffic checks, open feeds during local rush hours — roughly 7–9 AM and 5–8 PM in each city's timezone.",
          "Use the search at the top of this page to jump straight to a city like Taipei, Hong Kong, or Tokyo instead of panning manually.",
          "Remember the region spans many time zones: when it is night in Tokyo it is still afternoon further west — there is always daylight to watch somewhere.",
        ]}
      />
      <FaqSection title="Asia webcams — FAQ" faqs={FAQS} />
      <RelatedLinks title="Featured Asian city indexes" links={FEATURED_CITIES} />
      <RelatedLinks
        title="More regional webcam indexes"
        links={[
          { label: "Europe live cameras", href: "/europe-live-cameras" },
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
