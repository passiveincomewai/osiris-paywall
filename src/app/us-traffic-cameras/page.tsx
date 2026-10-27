import type { Metadata } from "next";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import Link from "next/link";
import { ArrowRight, Car, CheckCircle2 } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import DirectoryExplorer from "@/components/DirectoryExplorer";
import DirectorySearch from "@/components/DirectorySearch";
import RouteCameraFinder from "@/components/RouteCameraFinder";
import BreadcrumbLd from "@/components/BreadcrumbLd";
import UpdatedStamp from "@/components/UpdatedStamp";
import {
  CATALOGUE_GENERATED_AT,
  EXPLORE_SCOPES,
  areasForDef,
  countForDef,
} from "@/lib/explore-data";
import { getUsStatesIndex } from "@/lib/us-states";

/* The US traffic index: every camera in the US records that the
   traffic rule selects (lib/explore-scopes — road-named cameras or
   road-authority sources: the state DOTs, 511 services and tollway
   systems). Counts are computed from those records, not quoted from
   a snapshot. The state pages linked below are the family's own
   editorial pages; their stated counts come from the catalogue
   assembly they were built against and can differ slightly from the
   explorer's live rule count. */
const fmt = (n: number) => n.toLocaleString("en-US");

export async function generateMetadata(): Promise<Metadata> {
  const total = await countForDef(EXPLORE_SCOPES["traffic-us"]);
  return {
    title: "US Traffic Cameras — Every State DOT Network",
    description: `Watch ${fmt(total)} live US traffic cameras — state DOT highway feeds, 511 networks, interstate junctions and mountain passes, state by state. Free, no signup.`,
    alternates: { canonical: "https://worldeye.app/us-traffic-cameras" },
    openGraph: {
      title: "US Traffic Cameras — Every State DOT Network | WorldEye",
      description: `${fmt(total)} live US traffic cameras from state DOT and 511 networks — free to watch, no signup.`,
      url: "https://worldeye.app/us-traffic-cameras",
      type: "website",
    },
  };
}

const STATE_PAGES = [
  { slug: "georgia", name: "Georgia", note: "GDOT's 511 network — the largest state index in the country, built around Atlanta's interstates." },
  { slug: "utah", name: "Utah", note: "UDOT canyon and I-15 cameras — the ski-route and mountain-pass checks." },
  { slug: "texas", name: "Texas", note: "TxDOT and metro feeds across Houston, Dallas and the big corridors." },
  { slug: "florida", name: "Florida", note: "FDOT and Florida 511 cameras from the Panhandle to Miami." },
  { slug: "indiana", name: "Indiana", note: "INDOT highway cameras across the Crossroads of America." },
  { slug: "nevada", name: "Nevada", note: "NDOT desert highways, Las Vegas arterials and Sierra passes." },
  { slug: "arizona", name: "Arizona", note: "ADOT cameras — Phoenix freeways, desert interstates and mountain grades." },
];

/* Every state page in the index — the generated per-state data
   (src/data/us-states.json via lib/us-states) that the sitemap and the
   [state] pages are built from, sorted A–Z. The hub previously linked
   only the 7 editorial guides above (index-recovery audit 2026-10-27);
   the grid below gives every state page a hub link. */
const ALL_STATES = [...getUsStatesIndex().states].sort((a, b) =>
  a.name.localeCompare(b.name),
);

const FAQS = [
  {
    q: "What counts as a US traffic camera here?",
    a: "Any camera in the US records whose name identifies a road view, or whose publisher is a road authority — the state DOTs, 511 services, tollway and turnpike systems. That is the same rule the explorer above serves, so the count at the top of this page is the number of feeds you can actually open here.",
  },
  {
    q: "Which state has the most traffic cameras?",
    a: "Georgia, by a wide margin — its 511 network is the densest single-state system in the index, concentrated on metro Atlanta's interstates. Utah is second, with a network built for canyon and mountain-pass conditions.",
  },
  {
    q: "Does every state have its own traffic page?",
    a: "Yes — all 51 state pages are linked from the A–Z grid on this page. Seven of them — Georgia, Utah, Texas, Florida, Indiana, Nevada and Arizona — carry full editorial guides to their networks; every state page shows that state's live camera index, its busiest camera areas and sample feeds. The explorer above covers every US traffic camera in the catalogue regardless of state.",
  },
  {
    q: "Can I check cameras along a specific drive?",
    a: "That is what the route finder on this page is for: enter a start and a destination and it lines up the live cameras within 1.5 km of the route, in driving order. What the cameras show is the road condition — congestion, weather, closures — as it is now.",
  },
  {
    q: "Are freeway cameras included?",
    a: "Yes — freeway cameras are the core of the US index: the interstate and freeway feeds state DOTs publish over their busiest corridors, alongside 511 networks, tollways and mountain passes. Pick a state above to open its freeway and highway camera index, or search the explorer by the freeway you drive.",
  },
];

export default async function UsTrafficCamerasPage() {
  const total = await countForDef(EXPLORE_SCOPES["traffic-us"]);
  const areas = await areasForDef(EXPLORE_SCOPES["traffic-us"], 400);
  const top = await areasForDef(EXPLORE_SCOPES["traffic-us"], 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "US Traffic Cameras — Every State DOT Network",
        description: `Directory of ${fmt(total)} live US traffic cameras from state DOT, 511 and tollway sources.`,
        url: "https://worldeye.app/us-traffic-cameras",
        isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
        numberOfItems: total,
        dateModified: CATALOGUE_GENERATED_AT,
        mainEntity: {
          "@type": "ItemList",
          name: "State traffic camera pages",
          numberOfItems: ALL_STATES.length,
          itemListElement: ALL_STATES.map((s, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: `${s.name} traffic cameras`,
            url: `https://worldeye.app/us-traffic-cameras/${s.slug}`,
          })),
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <main className="docs-root min-h-screen bg-[#05070d] text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-4xl mx-auto px-6 py-10 md:py-16">
        <div className="flex items-center justify-between mb-10">
          <Link href="/live-traffic-cameras" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <Car className="w-4 h-4" /> Traffic cameras
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="WorldEye — back to the live globe" className="shrink-0 inline-flex items-center"><img src="/worldeye-header-logo.png" alt="WorldEye" width={1063} height={290} className="h-6 w-auto" /></Link>
            <LanguageHeaderControl variant="mobile" />
          </div>
        </div>

        <BreadcrumbLd trail={[{ label: "Live Traffic Cameras", href: "/live-traffic-cameras" }, { label: "US Traffic Cameras" }]} />
        <UpdatedStamp at={CATALOGUE_GENERATED_AT} label="Camera index updated" source="WorldEye camera catalogue" className="mb-8" />

        {/* Hero */}
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
            <Car className="w-3.5 h-3.5" /> UNITED STATES
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            US Traffic Cameras, <span className="text-[#D4AF37]">State by State</span>
          </h1>
          <p className="text-white/55 mt-5 text-base md:text-lg leading-relaxed">
            {fmt(total)} live traffic cameras across the United States — every state
            DOT and 511 network the directory serves, in one explorer. The biggest
            systems are {top.map((a) => `${a.name} (${fmt(a.count)})`).join(", ")} —
            and every feed is free to watch, no account, no signup.
          </p>
          <DirectorySearch
            label="US traffic areas"
            options={areas}
            placeholder="Search US traffic by state or city…"
            emptyText={'No US traffic areas match "{value}".'}
            targetId="us-traffic-explorer"
          />
        </div>

        {/* Live explorer */}
        <div className="mt-14">
          <h2 className="text-2xl md:text-3xl font-bold">The US traffic index, live</h2>
          <p className="text-white/50 mt-2 text-sm md:text-base">
            Every US traffic camera as its real feed, grouped by the area the
            catalogue lists it under. Search a highway, a junction or a city —
            the camera is the condition report.
          </p>
          <div className="mt-6">
            <DirectoryExplorer
              scopeKey="traffic-us"
              scopeLabel="US traffic"
              groupBy="city"
              searchPlaceholder="Search US traffic cameras — I-75, a junction, a pass…"
              explorerId="us-traffic-explorer"
            />
          </div>
        </div>

        {/* Route cameras */}
        <div className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold">Cameras along your route</h2>
          <p className="text-white/50 mt-2 text-sm md:text-base max-w-3xl">
            Enter a start and a destination and the finder lines up the live
            cameras within 1.5 km of the driving route, in the order you will
            pass them.
          </p>
          <div className="mt-6">
            <RouteCameraFinder />
          </div>
        </div>

        {/* State pages */}
        <div className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold">State traffic pages</h2>
          <p className="text-white/50 mt-2 text-sm md:text-base">
            Editorial guides for the biggest state networks — how each system
            works, where its cameras concentrate, and how to read them.
          </p>
          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            {STATE_PAGES.map((s) => (
              <Link
                key={s.slug}
                href={`/us-traffic-cameras/${s.slug}`}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-[#D4AF37]/40 transition group"
              >
                <span className="font-semibold group-hover:text-[#D4AF37] transition">
                  {s.name} traffic cameras
                </span>
                <span className="block text-sm text-white/50 mt-1">{s.note}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* All state pages — the full A–Z grid. Counts are the
            catalogue's per-state totals from the generated index. */}
        <div className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold">Every state traffic camera page</h2>
          <p className="text-white/50 mt-2 text-sm md:text-base">
            All {ALL_STATES.length} state pages in the index, A–Z — the seven
            editorial guides above are the biggest networks; every other
            state&apos;s page leads with its live camera index.
          </p>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {ALL_STATES.map((s) => (
              <Link
                key={s.slug}
                href={`/us-traffic-cameras/${s.slug}`}
                className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 hover:border-[#D4AF37]/40 transition group"
              >
                <span className="text-sm font-medium group-hover:text-[#D4AF37] transition">
                  {s.name} traffic cameras
                </span>
                <span className="block text-xs text-white/40 mt-0.5">
                  {fmt(s.count)} cameras
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* FAQs */}
        <div className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold">US traffic camera FAQs</h2>
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
            See the road <span className="text-[#D4AF37]">before you drive it.</span>
          </h2>
          <p className="text-white/55 mt-4 max-w-xl mx-auto">
            Traffic worldwide, country by country — or open the globe and watch
            the whole network at once.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/live-traffic-cameras"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              Traffic cameras worldwide <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl border border-white/15 text-white/75 hover:text-white hover:border-white/30 transition font-semibold"
            >
              Open the globe
            </Link>
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
