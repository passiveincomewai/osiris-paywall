import type { Metadata } from "next";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2 } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import DirectorySearch from "@/components/DirectorySearch";
import BreadcrumbLd from "@/components/BreadcrumbLd";
import UpdatedStamp from "@/components/UpdatedStamp";
import cityPages from "@/data/city-pages.json";
import {
  CATALOGUE_GENERATED_AT,
  COUNTRY_INDEX,
  EXPLORE_SCOPES,
  recordsForDef,
} from "@/lib/explore-data";

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

const fmt = (n: number) => n.toLocaleString("en-US");

/* The busiest camera areas on Earth, computed from the served
   catalogue's own records (the per-country files behind the country
   pages) — not the retired Oct-11 directory snapshot this page used
   to read. An "area" is the city value the catalogue itself lists a
   camera under, which is why statewide grids (Georgia, Utah) and
   motorway corridors appear alongside true cities. */
type DirectoryArea = { name: string; country: string; countrySlug: string; count: number };

async function topAreas(): Promise<{ top: DirectoryArea[]; madrid?: DirectoryArea }> {
  const records = await recordsForDef(EXPLORE_SCOPES.all);
  const slugByName = new Map(COUNTRY_INDEX.map((c) => [c.name, c.slug]));
  const byArea = new Map<string, DirectoryArea>();
  for (const r of records) {
    const name = (r.city ?? "").trim();
    const country = (r.country ?? "").trim();
    if (!name || !country) continue;
    const key = `${country}|${name}`;
    const cur = byArea.get(key);
    if (cur) cur.count += 1;
    else
      byArea.set(key, {
        name,
        country,
        countrySlug: slugByName.get(country) ?? "",
        count: 1,
      });
  }
  const all = [...byArea.values()].sort((a, b) => b.count - a.count);
  return { top: all.slice(0, 25), madrid: all.find((a) => a.name === "Madrid") };
}

/* Every city page, for the search below — the generated tier from
   city-pages.json plus the editorial guides, with the counts those
   pages state (mirrors the /city-webcams hub). */
const EDITORIAL_CITIES = [
  { slug: "london", name: "London", count: 890 },
  { slug: "ottawa", name: "Ottawa", count: 428 },
  { slug: "toronto", name: "Toronto", count: 339 },
  { slug: "madrid", name: "Madrid", count: 370 },
  { slug: "houston", name: "Houston", count: 1158 },
  { slug: "dallas", name: "Dallas", count: 845 },
  { slug: "tokyo", name: "Tokyo", count: 73 },
  { slug: "sydney", name: "Sydney", count: 186 },
  { slug: "auckland", name: "Auckland", count: 98 },
  { slug: "fort-worth", name: "Fort Worth", count: 489 },
];

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
  {
    q: "What can I actually learn from a city camera before visiting?",
    a: "More than a guidebook admits: how busy the center is at your arrival hour, whether the famous square is scaffolded or festival-packed, what people are wearing for the weather, and whether the traffic near your hotel is a gentle flow or a six-lane siege. Five minutes on the cameras is the cheapest orientation a trip can buy.",
  },
  {
    q: "Why isn't my city listed?",
    a: "The list follows the directory: a city appears when public camera feeds exist for it. If your city has no public feeds published by its road authority or municipality, there is nothing to index yet — coverage grows as operators publish more.",
  },
];

export default async function WorldCityWebcamsPage() {
  const { top: areas, madrid } = await topAreas();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "World City Webcams — Top 25 Live City Cams",
    description:
      "The 25 regions and metro areas with the most live public cameras worldwide, with real camera counts.",
    url: "https://worldeye.app/world-city-webcams",
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
    numberOfItems: areas.length,
    dateModified: CATALOGUE_GENERATED_AT,
    mainEntity: {
      "@type": "ItemList",
      name: "Top 25 live camera regions",
      numberOfItems: areas.length,
      itemListElement: areas.map((a, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: `${a.name}, ${a.country} — ${fmt(a.count)} cameras`,
        ...(a.countrySlug
          ? { url: `https://worldeye.app/cameras/countries/${a.countrySlug}` }
          : {}),
      })),
    },
  };

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
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="WorldEye — back to the live globe" className="shrink-0 inline-flex items-center"><img src="/worldeye-header-logo.png" alt="WorldEye" width={1063} height={290} className="h-6 w-auto" /></Link>
            <LanguageHeaderControl variant="mobile" />
          </div>
        </div>

        <BreadcrumbLd trail={[{ label: "Cameras", href: "/cameras" }, { label: "World City Webcams" }]} />
        <UpdatedStamp at={CATALOGUE_GENERATED_AT} label="Camera index updated" source="WorldEye camera catalogue" className="mb-8" />

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
            most live feeds in the WorldEye directory — from Georgia's{" "}
            {fmt(areas[0]?.count ?? 0)}-camera statewide network to Madrid's{" "}
            {fmt(madrid?.count ?? 0)} street cameras. Watch any of them live,
            free, right now.
          </p>
          <DirectorySearch
            label="city pages"
            options={[
              ...EDITORIAL_CITIES.map((c) => ({
                name: c.name,
                count: c.count,
                href: `/city-webcams/${c.slug}`,
              })),
              ...(cityPages.cities as unknown as { slug: string; name: string; count: number }[]).map(
                (c) => ({ name: c.name, count: c.count, href: `/city-webcams/${c.slug}` }),
              ),
            ]}
            placeholder="Jump to a city page — try Seattle, London, Busan…"
            emptyText={'No city page matches "{value}" yet.'}
          />
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
                    {a.countrySlug ? (
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
            open straight into the live globe. Prefer one searchable index?{" "}
            <Link href="/city-webcams" className="text-[#D4AF37] hover:underline">
              Browse the city webcam index
            </Link>
            .
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
