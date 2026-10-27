import type { Metadata } from "next";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Landmark } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import DirectoryExplorer from "@/components/DirectoryExplorer";
import DirectorySearch from "@/components/DirectorySearch";
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
const EUROPE_SLUGS = new Set(EXPLORE_SCOPES.europe.slugs as string[]);
const europe = COUNTRY_INDEX.filter((c) => EUROPE_SLUGS.has(c.slug)).sort(
  (a, b) => b.count - a.count,
);
const europeTotal = europe.reduce((s, c) => s + c.count, 0);
const BY_SLUG = new Map(COUNTRY_INDEX.map((c) => [c.slug, c]));
const count = (slug: string) => BY_SLUG.get(slug)?.count ?? 0;
const fmt = (n: number) => n.toLocaleString("en-US");

export const metadata: Metadata = {
  title: `Europe Live Cameras — ${europe.length} Countries, Watch Free`,
  description: `Watch ${fmt(europeTotal)} live cameras across ${europe.length} European countries — Spain, Austria, Sweden, the UK and more. Free public feeds, no signup required.`,
  alternates: { canonical: "https://worldeye.app/europe-live-cameras" },
  openGraph: {
    title: `Europe Live Cameras — ${europe.length} Countries, Watch Free | WorldEye`,
    description: `${fmt(europeTotal)} live cameras across ${europe.length} European countries — from Spanish plazas to Alpine passes. Free, no signup.`,
    url: "https://worldeye.app/europe-live-cameras",
    type: "website",
  },
};

const HIGHLIGHTS = [
  {
    title: "Spain leads Europe",
    desc: `With ${fmt(count("spain"))} live cameras centered on Madrid and other cities, Spain has the densest public camera coverage on the continent — plazas, highways and coastlines.`,
  },
  {
    title: "Austria's nationwide network",
    desc: `${fmt(count("austria"))} cameras blanket Austria from Alpine passes to Vienna streets, making it one of the most camera-dense countries per capita in the directory.`,
  },
  {
    title: "Italy's motorway corridors",
    desc: `${fmt(count("italy"))} Italian feeds follow the great autostrade — the A1 Milano–Napoli and A14 Bologna–Taranto corridors alone account for hundreds of live views.`,
  },
  {
    title: "The UK's London grid",
    desc: `${fmt(count("united-kingdom"))} UK feeds are overwhelmingly London — the capital's own grid is the single biggest city set in Europe, watching streets from the North Circular to the Blackwall Tunnel approaches.`,
  },
  {
    title: "Sweden's northern reach",
    desc: `${fmt(count("sweden"))} Swedish cameras stretch from Malmö up past the Arctic Circle — winter road conditions in Norrland are some of the most practical feeds in Europe.`,
  },
  {
    title: "Alpine passes, live",
    desc: "Austria's Alpine pass cameras are the winter essential: check snow, chain controls, and whiteout conditions on the high routes before driving them.",
  },
  {
    title: "Mediterranean coasts",
    desc: "Spain's coastal feeds — Benidorm, Tenerife, Lanzarote — plus Italy's rivieras turn the directory into a beach-weather checker for the whole Med.",
  },
  {
    title: "Small states, live views",
    desc: "Even San Marino, Vatican City and the Faroe Islands have public feeds — a single camera in St. Peter's Square or on an Atlantic cliff can be the most memorable one.",
  },
];

const FAQS = [
  {
    q: "Which European countries have the most live cameras?",
    a: `Spain (${fmt(count("spain"))}), Austria (${fmt(count("austria"))}), Sweden (${fmt(count("sweden"))}), the United Kingdom (${fmt(count("united-kingdom"))}) and Italy (${fmt(count("italy"))}) lead Europe in the WorldEye directory. Together they hold a large share of the continent's ${fmt(europeTotal)} indexed public feeds.`,
  },
  {
    q: "Can I watch European city webcams without signing up?",
    a: "Yes — every camera is free with no account. Open the WorldEye map, search for the city or landmark you want, and click any camera marker to start watching live.",
  },
  {
    q: "Are these cameras available 24 hours a day?",
    a: "Most feeds run around the clock, though individual cameras go offline for maintenance or are retired by their operators. Bigger networks like Austria's and Spain's have enough redundancy that alternatives are usually nearby.",
  },
  {
    q: "Can I check Alpine road conditions in winter?",
    a: "Yes — Austria's Alpine pass cameras are among the most practical feeds in Europe. Check snow, chain controls, and visibility on the high routes before driving them in winter.",
  },
  {
    q: "Are there beach cameras in Europe?",
    a: "Yes. Spain's coastal feeds around Benidorm, Tenerife, and Lanzarote, plus Italy's rivieras, let you check Mediterranean beach weather live before a trip.",
  },
  {
    q: "What about the Nordic countries?",
    a: `Sweden's ${fmt(count("sweden"))} cameras stretch from Malmö past the Arctic Circle — excellent for winter road checks. The Nordics are well covered for their population size.`,
  },
  {
    q: "Do the cameras cover Eastern Europe?",
    a: "Coverage is thinner east of the former Iron Curtain but growing — the directory adds public feeds as operators publish them. Check the country table for current counts.",
  },
  {
    q: "Can I see famous landmarks?",
    a: "Some feeds do cover landmarks and plazas — St. Peter's Square in Vatican City is one example. Most feeds are traffic and street cameras, so use the map search to find scenic ones.",
  },
  {
    q: "Which European networks are the most useful for drivers?",
    a: "The national and regional road networks: motorway and alpine-pass cameras in the Alps, French and Spanish autoroute feeds, and the dense urban grids of the Netherlands and other city systems. Europe's strength is corridor coverage — the cameras sit on the routes people actually drive between cities.",
  },
  {
    q: "Do European cameras work in winter darkness?",
    a: "The road and city feeds run around the clock; in a Nordic winter that means lit streets, headlights and snow conditions rather than daylight scenery. It is still the fastest honest read on road weather — often better than the forecast icon.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: `Europe Live Cameras — ${europe.length} Countries`,
  description: `Directory of ${fmt(europeTotal)} live public cameras across ${europe.length} European countries.`,
  url: "https://worldeye.app/europe-live-cameras",
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  numberOfItems: europe.length,
  dateModified: CATALOGUE_GENERATED_AT,
  /* The one structural element this hub lacked vs its indexed sibling
     /asia-webcams: a mainEntity ItemList enumerating the child country
     pages — built from the same `europe` array the table below renders,
     in the same order, so schema and page can never disagree. */
  mainEntity: {
    "@type": "ItemList",
    numberOfItems: europe.length,
    itemListElement: europe.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${c.name} — ${fmt(c.count)} cameras`,
      url: `https://worldeye.app/cameras/countries/${c.slug}`,
    })),
  },
};

export default async function EuropeLiveCamerasPage() {
  const areas = await areasForDef(EXPLORE_SCOPES.europe, 400);

  return (
    <main className="docs-root min-h-screen bg-[#05070d] text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-4xl mx-auto px-6 py-10 md:py-16">
        <div className="flex items-center justify-between mb-10">
          <Link href="/cameras/countries" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <Landmark className="w-4 h-4" /> Country directory
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="WorldEye — back to the live globe" className="shrink-0 inline-flex items-center"><img src="/worldeye-header-logo.png" alt="WorldEye" width={1063} height={290} className="h-6 w-auto" /></Link>
            <LanguageHeaderControl variant="mobile" />
          </div>
        </div>

        {/* Hero */}
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
            <Landmark className="w-3.5 h-3.5" /> EUROPE
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Europe's Live Cameras, <span className="text-[#D4AF37]">Country by Country</span>
          </h1>
          <p className="text-white/55 mt-5 text-base md:text-lg leading-relaxed">
            From Madrid's grand plazas to Iceland's volcanic highlands, WorldEye indexes{" "}
            {fmt(europeTotal)} live public cameras across {europe.length} European
            countries. European agencies and cities are among the most generous
            publishers of open camera feeds — motorways, old towns, ski resorts and
            harbors — all watchable from one globe.
          </p>
          <DirectorySearch
            label="Europe"
            options={areas}
            placeholder="Search Europe by city…"
            emptyText={'No cities in Europe match "{value}".'}
            targetId="europe-explorer"
          />
        </div>

        {/* Live explorer */}
        <div className="mt-14">
          <h2 className="text-2xl md:text-3xl font-bold">Watch Europe live</h2>
          <p className="text-white/50 mt-2 text-sm md:text-base">
            Every feed below is live right now — open a card to watch, or jump
            from any camera to the same spot on the globe.
          </p>
          <div className="mt-6">
            <DirectoryExplorer
              scopeKey="europe"
              scopeLabel="Europe"
              groupBy="country"
              searchPlaceholder="Search Europe cameras — a beach, a road, a district…"
              explorerId="europe-explorer"
            />
          </div>
        </div>

        {/* Highlights */}
        <div className="mt-12 grid md:grid-cols-2 gap-5">
          {HIGHLIGHTS.map((h) => (
            <div key={h.title} className="rounded-2xl border border-white/10 bg-white/[0.02] p-7">
              <h2 className="font-bold text-lg">{h.title}</h2>
              <p className="text-sm text-white/55 leading-relaxed mt-2">{h.desc}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="mt-14">
          <h2 className="text-2xl md:text-3xl font-bold">
            {europe.length} European countries
          </h2>
          <p className="text-white/50 mt-2 text-sm md:text-base">
            Sorted by live camera count. Every country links to its own camera page.
          </p>
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-sm md:text-base">
              <thead>
                <tr className="bg-white/[0.04] text-left text-xs uppercase tracking-wider text-white/45">
                  <th scope="col" className="px-4 md:px-6 py-4 font-semibold">Country</th>
                  <th scope="col" className="px-4 md:px-6 py-4 font-semibold text-right">Cameras</th>
                  <th scope="col" className="px-4 md:px-6 py-4 font-semibold hidden sm:table-cell">Busiest area</th>
                </tr>
              </thead>
              <tbody>
                {europe.map((c) => (
                  <tr key={c.slug} className="border-t border-white/[0.06] hover:bg-white/[0.03] transition">
                    <td className="px-4 md:px-6 py-3.5 font-medium">
                      <Link href={`/cameras/countries/${c.slug}`} className="text-[#D4AF37] hover:underline">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 md:px-6 py-3.5 text-right tabular-nums text-white/85">
                      {fmt(c.count)}
                    </td>
                    <td className="px-4 md:px-6 py-3.5 text-white/50 hidden sm:table-cell">
                      {c.topCities[0]?.name ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* How to watch */}
        <div className="mt-16 rounded-2xl border border-white/10 bg-white/[0.02] p-8">
          <h2 className="text-xl md:text-2xl font-bold">How to watch</h2>
          <ol className="mt-5 space-y-4 text-sm md:text-base text-white/60 leading-relaxed list-decimal list-inside marker:text-[#D4AF37] marker:font-bold">
            <li>
              <span className="text-white/85 font-medium">Open the WorldEye map</span> and
              turn on the camera layer to see every live European feed.
            </li>
            <li>
              <span className="text-white/85 font-medium">Fly to your destination</span> —
              search "Rome", "Santorini" or "Alpine passes" to load the cameras around it.
            </li>
            <li>
              <span className="text-white/85 font-medium">Click a marker</span> to watch.
              Planning a trip? Check a beach, a ski lift or a city square before you go.
            </li>
          </ol>
        </div>

        {/* FAQs */}
        <div className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold">Europe camera FAQs</h2>
          <div className="mt-6 space-y-4">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-5 group"
              >
                <summary className="font-semibold cursor-pointer list-none flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
                  {f.q}
                </summary>
                <p className="text-sm text-white/55 leading-relaxed mt-3 pl-7">{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent p-10 md:p-14">
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight">
            Europe is <span className="text-[#D4AF37]">live right now.</span>
          </h2>
          <p className="text-white/55 mt-4 max-w-xl mx-auto">
            From the Arctic to the Mediterranean — pick a country and start watching.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              Watch Europe live <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/cameras/countries"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl border border-white/15 text-white/75 hover:text-white hover:border-white/30 transition font-semibold"
            >
              All countries
            </Link>
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
