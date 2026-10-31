import type { Metadata } from "next";
import Link from "next/link";
import {
  BASE,
  JsonLd,
  Breadcrumb,
  Hero,
  StatRow,
  Intro,
  FaqSection,
  FaqJsonLd,
  RelatedLinks,
  CtaRow,
  PageShell,
} from "@/components/directory-page";
import DirectorySearch from "@/components/DirectorySearch";
import cityPages from "@/data/city-pages.json";

/* The city index: every /city-webcams/[city] page in one place.
   The generated tier comes from src/data/city-pages.json (built from
   the live catalogue); the editorial guides are the hand-written
   entries in the [city] route, with the counts those pages state.
   Nothing here is invented — a city appears only because its page
   exists. */
type GenCity = {
  slug: string;
  name: string;
  country: string;
  countrySlug: string;
  count: number;
};
const GEN = cityPages.cities as unknown as GenCity[];

const EDITORIAL: GenCity[] = [
  { slug: "london", name: "London", country: "United Kingdom", countrySlug: "united-kingdom", count: 890 },
  { slug: "ottawa", name: "Ottawa", country: "Canada", countrySlug: "canada", count: 428 },
  { slug: "toronto", name: "Toronto", country: "Canada", countrySlug: "canada", count: 339 },
  { slug: "madrid", name: "Madrid", country: "Spain", countrySlug: "spain", count: 370 },
  { slug: "houston", name: "Houston", country: "United States", countrySlug: "united-states", count: 1158 },
  { slug: "dallas", name: "Dallas", country: "United States", countrySlug: "united-states", count: 845 },
  // Tokyo count = 112: the records with city "Tokyo" in src/data/countries/japan.json — the count the Tokyo spoke page serves (the previous 73 was stale).
  { slug: "tokyo", name: "Tokyo", country: "Japan", countrySlug: "japan", count: 112 },
  { slug: "sydney", name: "Sydney", country: "Australia", countrySlug: "australia", count: 186 },
  { slug: "auckland", name: "Auckland", country: "New Zealand", countrySlug: "new-zealand", count: 98 },
  { slug: "fort-worth", name: "Fort Worth", country: "United States", countrySlug: "united-states", count: 489 },
];

const ALL = [...EDITORIAL, ...GEN].sort((a, b) => b.count - a.count);
const TOTAL = ALL.reduce((s, c) => s + c.count, 0);
const COUNTRIES = new Set(ALL.map((c) => c.country)).size;
const fmt = (n: number) => n.toLocaleString("en-US");

const TITLE = `City Webcams — Live Cameras in ${ALL.length} Cities`;
const BLURB = `Every WorldEye city page in one index: ${fmt(TOTAL)} live cameras across ${ALL.length} cities in ${COUNTRIES} countries — traffic grids, streets and harbours, free to watch.`;

export const metadata: Metadata = {
  title: TITLE,
  description: BLURB,
  alternates: { canonical: `${BASE}/city-webcams` },
  openGraph: { title: TITLE, description: BLURB, url: "/city-webcams", type: "website" },
};

const FAQS = [
  {
    q: "How does a city get its own page?",
    a: "A city earns a page when the live catalogue holds a substantial grid for it — the generated pages are built from the catalogue itself once a city's count passes the threshold, and a handful of major grids (London, Houston, Madrid…) carry hand-written editorial guides on top.",
  },
  {
    q: "What is on each city page?",
    a: "The city's real camera count, the agencies and networks publishing its feeds, featured cameras that open straight into the live globe, and — on most pages — the full live explorer: every camera the catalogue lists under that city, searchable by street or landmark, plus a route finder that lines up the cameras along a drive into the city.",
  },
  {
    q: "Are the counts on this page live?",
    a: "They are the counts the city pages themselves state, taken from the generated city index and the editorial guides. The catalogue moves as operators add or retire feeds, and the index is rebuilt from it — so treat a count as current to the last rebuild, not to the minute.",
  },
  {
    q: "My city isn't listed — can I still watch it?",
    a: "Very likely. This index lists only cities with dedicated pages; the globe itself carries cameras for thousands of places. Open the map, search your city, and any public feeds published there will appear — a page is a convenience, not a gate.",
  },
];

function CityCard({ c }: { c: GenCity }) {
  return (
    <li>
      <Link
        href={`/city-webcams/${c.slug}`}
        className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 hover:border-[#D4AF37]/40 transition"
      >
        <span className="font-medium text-white/85">
          {c.name} <span className="text-white/40 font-normal">· {c.country}</span>
        </span>
        <span className="tabular-nums text-[#D4AF37] font-semibold text-sm shrink-0">
          {fmt(c.count)}
        </span>
      </Link>
    </li>
  );
}

export default function CityWebcamsHubPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    description: BLURB,
    url: `${BASE}/city-webcams`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: ALL.length,
      itemListElement: ALL.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: `${c.name} live webcams — ${fmt(c.count)} cameras`,
        url: `${BASE}/city-webcams/${c.slug}`,
      })),
    },
  };

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Cameras", href: "/cameras" },
          { label: "City webcams" },
        ]}
      />
      <Hero
        h1="City Webcams"
        sub={`${ALL.length} cities with their own live camera pages — ${fmt(TOTAL)} feeds across ${COUNTRIES} countries.`}
      />
      <DirectorySearch
        label="city pages"
        options={ALL.map((c) => ({
          name: c.name,
          count: c.count,
          href: `/city-webcams/${c.slug}`,
        }))}
        placeholder="Jump to a city — try Seattle, London, Busan…"
        emptyText={'No city page matches "{value}" yet — try the globe search instead; thousands more places have cameras without a dedicated page.'}
      />
      <StatRow
        stats={[
          { value: String(ALL.length), label: "city pages" },
          { value: fmt(TOTAL), label: "live cameras" },
          { value: String(COUNTRIES), label: "countries" },
        ]}
      />
      <Intro
        paragraphs={[
          "Some cities are watched by hundreds of public cameras at once — statewide DOT grids, municipal street networks, harbour and transit feeds. This index gathers every city that has earned its own WorldEye page, with the count its page stands behind.",
          "Ten of them are editorial guides — London's TfL-style street grid, Houston and Dallas on the Texas freeway network, Madrid, Tokyo and others — written around the feeds that matter most there. The rest are generated from the live catalogue itself: real counts, the publishing sources behind them, and featured cameras that open straight into the globe.",
          "Most city pages now carry the full treatment: every camera the catalogue lists under the city as a live, searchable explorer, and a route finder that shows the cameras along your drive in. Start with the search above, or browse the lists below.",
        ]}
      />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-5">Editorial city guides</h2>
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {EDITORIAL.map((c) => (
            <CityCard key={c.slug} c={c} />
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-5">All city pages, by camera count</h2>
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {GEN.map((c) => (
            <CityCard key={c.slug} c={c} />
          ))}
        </ul>
      </section>

      <FaqSection title="City webcams — FAQ" faqs={FAQS} />
      <RelatedLinks
        title="More ways into the cameras"
        links={[
          { label: "World city webcams — the top 25 camera regions", href: "/world-city-webcams" },
          { label: "US traffic cameras by state", href: "/us-traffic-cameras" },
          { label: "Live traffic cameras worldwide", href: "/live-traffic-cameras" },
          { label: "All camera countries", href: "/cameras/countries" },
          { label: "Live webcams hub", href: "/live-webcams" },
        ]}
      />
      <CtaRow backHref="/live-webcams" backLabel="Live webcams hub" />
    </PageShell>
  );
}
