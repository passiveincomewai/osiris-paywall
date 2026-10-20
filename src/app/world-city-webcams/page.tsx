import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2 } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import data from "@/data/camera-directory.json";
import cityPages from "@/data/city-pages.json";

export const metadata: Metadata = {
  title: "World City Webcams — Top 25 Live City Cams",
  description:
    "The 25 busiest live camera regions in the world — from Georgia to Madrid, London and Taipei. Real camera counts, free to watch, no signup.",
  alternates: { canonical: "https://worldeye.app/world-city-webcams" },
  openGraph: {
    title: "World City Webcams — Top 25 Live City Cams | WorldEye",
    description:
      "The 25 busiest live camera regions worldwide — real counts, from Georgia to London and Madrid. Free, no signup.",
    url: "https://worldeye.app/world-city-webcams",
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

const fmt = (n: number) => n.toLocaleString("en-US");
const areas = data.topAreas;

const FAQS = [
  {
    q: "Why do some entries look like regions or highways, not cities?",
    a: "Camera coverage follows public infrastructure, not city limits. Some of the densest clusters sit on state highway systems (Georgia, Utah), metropolitan counties (Orange County, Miami-Dade) or motorway corridors like Italy's A1 Milano–Napoli and A14 Bologna–Taranto — the places transport agencies point the most cameras.",
  },
  {
    q: "Are all of these cameras live right now?",
    a: "The directory counts live public feeds indexed by WorldEye. Individual cameras can go offline for maintenance or be replaced by their operators, so counts shift over time. The busiest regions have enough redundancy that there's almost always something live to watch.",
  },
  {
    q: "Do I need an account to watch these city webcams?",
    a: "No. Every camera on the WorldEye globe is free to watch — no account, no trial, no paywall. Open the map, zoom into the region you want, and click any camera marker.",
  },
  {
    q: "Which city has the most cameras?",
    a: "The ranking shifts as the directory updates, but the top entries are dominated by US highway systems and dense Asian metros — Georgia's DOT network, Taiwan's intersection grids, and London's street cameras are perennial leaders. The table above shows the current order.",
  },
  {
    q: "Can I use these to check traffic in my city?",
    a: "If your city or state publishes open traffic cameras, they are likely indexed. Search the city on the live map — camera markers appear where feeds exist. US DOT networks give the best commute coverage.",
  },
  {
    q: "Are there scenic city cameras, not just traffic?",
    a: "Yes. Alongside the traffic grids there are plaza webcams, harbor views, and skyline feeds — especially in European and Asian cities. Use the map search to find the scenic ones among the traffic feeds.",
  },
  {
    q: "How current are the camera counts?",
    a: "The directory regenerates automatically and the page shows its last-updated date. Counts move as operators add feeds or retire old ones — the trend has been steadily upward.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "World City Webcams — Top 25 Live City Cams",
  description:
    "The 25 regions and metro areas with the most live public cameras worldwide, with real camera counts.",
  url: "https://worldeye.app/world-city-webcams",
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  numberOfItems: areas.length,
  dateModified: data.generatedAt,
};

export default function WorldCityWebcamsPage() {
  return (
    <main className="docs-root min-h-screen bg-[#05070d] text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-4xl mx-auto px-6 py-10 md:py-16">
        <div className="flex items-center justify-between mb-10">
          <Link href="/cameras/countries" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <Building2 className="w-4 h-4" /> Country directory
          </Link>
          <span className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37]">WORLDEYE</span>
        </div>

        {/* Hero */}
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
            <Building2 className="w-3.5 h-3.5" /> TOP 25 REGIONS
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            The 25 Busiest <span className="text-[#D4AF37]">Live Camera Regions</span> on Earth
          </h1>
          <p className="text-white/55 mt-5 text-base md:text-lg leading-relaxed">
            Some places on the planet are watched by thousands of public cameras at
            once. These are the 25 regions, metro areas and highway corridors with the
            most live feeds in the WorldEye directory — from Georgia's 4,330-camera
            statewide network to Madrid's 370 street cameras. Watch any of them live,
            free, right now.
          </p>
        </div>

        {/* Table */}
        <div className="mt-12 overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-sm md:text-base">
            <thead>
              <tr className="bg-white/[0.04] text-left text-xs uppercase tracking-wider text-white/45">
                <th scope="col" className="px-4 md:px-6 py-4 font-semibold">Rank</th>
                <th scope="col" className="px-4 md:px-6 py-4 font-semibold">Area / Region</th>
                <th scope="col" className="px-4 md:px-6 py-4 font-semibold">Country</th>
                <th scope="col" className="px-4 md:px-6 py-4 font-semibold text-right">Cameras</th>
              </tr>
            </thead>
            <tbody>
              {areas.map((a, i) => (
                <tr key={`${a.countrySlug}-${a.name}`} className="border-t border-white/[0.06] hover:bg-white/[0.03] transition">
                  <td className="px-4 md:px-6 py-3.5 text-white/35 tabular-nums">{i + 1}</td>
                  <td className="px-4 md:px-6 py-3.5 font-medium text-white/85">{a.name}</td>
                  <td className="px-4 md:px-6 py-3.5 text-white/60">
                    {TOP_30_SLUGS.has(a.countrySlug) ? (
                      <Link
                        href={`/cameras/countries/${a.countrySlug}`}
                        className="text-[#D4AF37] hover:underline"
                      >
                        {a.country}
                      </Link>
                    ) : (
                      <span>{a.country}</span>
                    )}
                  </td>
                  <td className="px-4 md:px-6 py-3.5 text-right tabular-nums text-[#D4AF37] font-semibold">
                    {fmt(a.count)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-white/35 mt-3">
          Counts reflect indexed public feeds and change as operators add or retire cameras.
        </p>

        {/* City webcam pages — every /city-webcams page, so none is orphaned.
            The generated tier comes from src/data/city-pages.json (built by
            tools/build-city-pages.mjs from the live catalogue); the ten
            editorial guides are hand-written in the [city] route. */}
        <div className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold">City webcam pages</h2>
          <p className="text-white/55 mt-3 text-sm md:text-base leading-relaxed">
            A dedicated page for every city with a substantial camera grid —
            real counts, the sources behind them, and featured cameras that
            open straight into the live globe.
          </p>
          <ul className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {cityPages.cities.map((c) => (
              <li key={c.slug}>
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
            ))}
          </ul>
          <p className="text-sm text-white/45 mt-6 mb-3">Editorial city guides:</p>
          <ul className="flex flex-wrap gap-2.5">
            {[
              ["london", "London"], ["ottawa", "Ottawa"], ["toronto", "Toronto"],
              ["madrid", "Madrid"], ["houston", "Houston"], ["dallas", "Dallas"],
              ["tokyo", "Tokyo"], ["sydney", "Sydney"], ["auckland", "Auckland"],
              ["fort-worth", "Fort Worth"],
            ].map(([slug, name]) => (
              <li key={slug}>
                <Link
                  href={`/city-webcams/${slug}`}
                  className="inline-block rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 hover:text-white hover:border-[#D4AF37]/40 transition"
                >
                  {name} live webcams
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* How to watch */}
        <div className="mt-16 rounded-2xl border border-white/10 bg-white/[0.02] p-8">
          <h2 className="text-xl md:text-2xl font-bold">How to watch these webcams</h2>
          <ol className="mt-5 space-y-4 text-sm md:text-base text-white/60 leading-relaxed list-decimal list-inside marker:text-[#D4AF37] marker:font-bold">
            <li>
              <span className="text-white/85 font-medium">Open the WorldEye globe</span> and
              enable the camera layer — every live feed shows as a marker.
            </li>
            <li>
              <span className="text-white/85 font-medium">Search the region</span> — type
              "Madrid", "Toronto" or "A1 Milano" into search and the map flies there,
              loading every nearby camera.
            </li>
            <li>
              <span className="text-white/85 font-medium">Click any marker</span> to open
              the live stream. Dense regions like Georgia and Utah can take a moment to
              cluster — zoom in to spread them out.
            </li>
          </ol>
        </div>

        {/* FAQs */}
        <div className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold">City webcam FAQs</h2>
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
            25 regions. <span className="text-[#D4AF37]">Thousands of windows.</span>
          </h2>
          <p className="text-white/55 mt-4 max-w-xl mx-auto">
            Pick a city and start watching — no account, no signup.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              Watch live webcams <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/live-traffic-cameras"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl border border-white/15 text-white/75 hover:text-white hover:border-white/30 transition font-semibold"
            >
              US traffic cameras
            </Link>
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
