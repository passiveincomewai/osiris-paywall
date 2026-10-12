import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Landmark } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import data from "@/data/camera-directory.json";

export const metadata: Metadata = {
  title: "Europe Live Cameras — 35 Countries, Watch Free",
  description:
    "Watch 9,144 live cameras across 35 European countries — Spain, Italy, France, Greece and more. Free public feeds, no signup required.",
  alternates: { canonical: "https://worldeye.app/europe-live-cameras" },
  openGraph: {
    title: "Europe Live Cameras — 35 Countries, Watch Free | WorldEye",
    description:
      "9,144 live cameras across 35 European countries — from Spanish plazas to Alpine passes. Free, no signup.",
    url: "https://worldeye.app/europe-live-cameras",
    type: "website",
  },
};

const TOP_30_SLUGS = new Set([
  "united-states", "taiwan", "spain", "austria", "canada", "hong-kong",
  "italy", "japan", "united-kingdom", "sweden", "finland", "iceland",
  "lithuania", "netherlands", "australia", "new-zealand", "turkey",
  "indonesia", "vietnam", "russia", "south-korea", "poland", "thailand",
  "norway", "malta", "france", "romania", "brazil", "bulgaria", "croatia",
]);

const EUROPE_NAMES = [
  "Spain", "Austria", "Italy", "United Kingdom", "Sweden", "Finland",
  "Iceland", "Lithuania", "Netherlands", "Turkey", "Poland", "Norway",
  "Malta", "France", "Romania", "Bulgaria", "Croatia", "Greece", "Germany",
  "Ireland", "Portugal", "Switzerland", "Hungary", "Slovenia", "Czechia",
  "Slovakia", "Serbia", "Belgium", "Albania", "Cyprus", "Luxembourg",
  "Estonia", "San Marino", "Vatican City", "Faroe Islands",
];

const fmt = (n: number) => n.toLocaleString("en-US");
const byName = new Map(data.countries.map((c) => [c.name, c]));
const europe = EUROPE_NAMES.map((n) => byName.get(n)).filter(
  (c): c is (typeof data.countries)[number] => Boolean(c)
).sort((a, b) => b.count - a.count);
const europeTotal = europe.reduce((s, c) => s + c.count, 0);

const HIGHLIGHTS = [
  {
    title: "Spain leads Europe",
    desc: "With 1,997 live cameras centered on Madrid and other cities, Spain has the densest public camera coverage on the continent — plazas, highways and coastlines.",
  },
  {
    title: "Austria's nationwide network",
    desc: "1,828 cameras blanket Austria from Alpine passes to Vienna streets, making it one of the most camera-dense countries per capita in the directory.",
  },
  {
    title: "Italy's motorway corridors",
    desc: "993 Italian feeds follow the great autostrade — the A1 Milano–Napoli and A14 Bologna–Taranto corridors alone account for hundreds of live views.",
  },
  {
    title: "The UK's London grid",
    desc: "899 UK feeds are overwhelmingly London — 890 of them watch the capital's streets, from the North Circular to the Blackwall Tunnel approaches.",
  },
  {
    title: "Sweden's northern reach",
    desc: "886 Swedish cameras stretch from Malmö up past the Arctic Circle — winter road conditions in Norrland are some of the most practical feeds in Europe.",
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
    a: "Spain (1,997), Austria (1,828), Italy (993), the United Kingdom (899) and Sweden (886) lead Europe in the WorldEye directory. Together they hold the majority of the continent's 9,144 indexed public feeds.",
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
    a: "Sweden's 886 cameras stretch from Malmö past the Arctic Circle — excellent for winter road checks. The Nordics are well covered for their population size.",
  },
  {
    q: "Do the cameras cover Eastern Europe?",
    a: "Coverage is thinner east of the former Iron Curtain but growing — the directory adds public feeds as operators publish them. Check the country table for current counts.",
  },
  {
    q: "Can I see famous landmarks?",
    a: "Some feeds do cover landmarks and plazas — St. Peter's Square in Vatican City is one example. Most feeds are traffic and street cameras, so use the map search to find scenic ones.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Europe Live Cameras — 35 Countries",
  description: `Directory of ${fmt(europeTotal)} live public cameras across ${europe.length} European countries.`,
  url: "https://worldeye.app/europe-live-cameras",
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  numberOfItems: europe.length,
  dateModified: data.generatedAt,
};

export default function EuropeLiveCamerasPage() {
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
          <span className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37]">WORLDEYE</span>
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
            Sorted by live camera count. Countries with dedicated pages are linked.
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
                {europe.map((c) => {
                  const linked = TOP_30_SLUGS.has(c.slug);
                  return (
                    <tr key={c.slug} className="border-t border-white/[0.06] hover:bg-white/[0.03] transition">
                      <td className="px-4 md:px-6 py-3.5 font-medium">
                        {linked ? (
                          <Link href={`/cameras/countries/${c.slug}`} className="text-[#D4AF37] hover:underline">
                            {c.name}
                          </Link>
                        ) : (
                          <span className="text-white/85">{c.name}</span>
                        )}
                      </td>
                      <td className="px-4 md:px-6 py-3.5 text-right tabular-nums text-white/85">
                        {fmt(c.count)}
                      </td>
                      <td className="px-4 md:px-6 py-3.5 text-white/50 hidden sm:table-cell">
                        {c.areas[0]?.name ?? "—"}
                      </td>
                    </tr>
                  );
                })}
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
