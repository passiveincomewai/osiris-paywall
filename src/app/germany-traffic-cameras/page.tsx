import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Car, CheckCircle2 } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import DirectoryExplorer from "@/components/DirectoryExplorer";
import DirectorySearch from "@/components/DirectorySearch";
import {
  COUNTRY_INDEX,
  EXPLORE_SCOPES,
  areasForDef,
  countForDef,
} from "@/lib/explore-data";

// Counts: the October 2026 harvest added 338 probe-verified German road
// cameras (Autobahn and federal-road networks) on top of a small scenic
// baseline. Union, deduplicated: 343. Claim is deliberately conservative.
const DE_COUNT = "340+";

export const metadata: Metadata = {
  title: "Germany Traffic Cameras — Live Autobahn Cams",
  description:
    "Watch 340+ live traffic cameras across Germany — Autobahn junctions, federal roads and city feeds on one map. Free, no signup, in English.",
  alternates: { canonical: "https://worldeye.app/germany-traffic-cameras" },
  openGraph: {
    title: "Germany Traffic Cameras — Live Autobahn Cams | WorldEye",
    description:
      "340+ live Autobahn and road cameras across Germany on one map — check the Stau before you drive, free with no signup.",
    url: "https://worldeye.app/germany-traffic-cameras",
    type: "website",
  },
};

const STEPS = [
  {
    title: "Open the WorldEye map",
    desc: "Head to the live map and enable the camera layer. Every public feed appears as a marker on the globe.",
  },
  {
    title: "Zoom to your Autobahn",
    desc: "Search a city or an Autobahn junction — the map flies there and loads the nearest traffic cameras.",
  },
  {
    title: "Click a feed to watch",
    desc: "Click any marker to open the camera. Check queues, roadworks and weather before you leave.",
  },
];

const FAQS = [
  {
    q: "Where do these German traffic cameras come from?",
    a: "They are public feeds published by Germany's federal and state road authorities — the camera networks operated for Autobahn and federal-road management. German traffic cameras are famously fragmented by Land (state); WorldEye collects the openly published feeds into one map, in English, alongside its 74,229 cameras worldwide.",
  },
  {
    q: "How many live cameras are there in Germany?",
    a: `WorldEye indexes ${DE_COUNT} cameras in Germany and the network is growing. Coverage concentrates on Autobahn junctions, major federal roads and the big metros — Berlin, Munich, Hamburg, the Rhine-Ruhr and Frankfurt corridors.`,
  },
  {
    q: "Can I check Autobahn congestion (Stau) before driving?",
    a: "Yes. The cameras sit at the junctions and roadwork zones where queues form — the A9, A7, A3 and the ring motorways around the big cities. A ten-second look at the feed beats a traffic report's average.",
  },
  {
    q: "Do the cameras show live video or still images?",
    a: "German road cameras publish still images that refresh at intervals rather than continuous video — partly for privacy, since German rules are strict about number plates and faces. The stills are enough to judge queue length, roadworks and weather.",
  },
  {
    q: "Why do some countries have far more cameras?",
    a: "It comes down to publishing policy, not road importance. Some countries stream thousands of feeds openly; Germany publishes fewer and more cautiously. We index everything that is openly available and add networks as they open up.",
  },
  {
    q: "Is there a cost or account needed?",
    a: "No. The cameras are free to watch with no account and no signup. Open the map, zoom to Germany, and click any marker.",
  },
  {
    q: "Can the cameras help me avoid the holiday Stau?",
    a: "They help you choose, not teleport. Check both plausible corridors before you leave — junction feeds on the alternative route will show whether it is actually moving — and re-check at your decision points. On the big changeover weekends, leaving outside the peak beats any routing trick, and the cameras will show you exactly when the peak forms.",
  },
  {
    q: "Do the cameras enforce speed or record plates?",
    a: "Not here. These are the road operators' public traffic-viewing feeds, published so drivers can check conditions. WorldEye indexes the public view only — nothing about your visit to a camera feed is shared with the operator.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Germany Traffic Cameras — Live Autobahn Cams",
  description:
    "Directory of 340+ live traffic cameras across Germany from federal and state public sources.",
  url: "https://worldeye.app/germany-traffic-cameras",
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  dateModified: "2026-10-18",
};

export default async function GermanyTrafficCamerasPage() {
  /* The explorer serves Germany's traffic set: cameras that are road
     feeds by name or by road-authority source (lib/explore-scopes),
     counted live from the served records. */
  const trafficTotal = await countForDef(EXPLORE_SCOPES["traffic-germany"]);
  const trafficAreas = await areasForDef(EXPLORE_SCOPES["traffic-germany"], 400);
  const countryTotal =
    COUNTRY_INDEX.find((c) => c.slug === "germany")?.count ?? 0;
  const fmt = (n: number) => n.toLocaleString("en-US");

  return (
    <main className="docs-root min-h-screen bg-[#05070d] text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-4xl mx-auto px-6 py-10 md:py-16">
        <div className="flex items-center justify-between mb-10">
          <Link href="/cameras" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <Car className="w-4 h-4" /> Cameras
          </Link>
          <span className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37]">WORLDEYE</span>
        </div>

        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
            <Car className="w-3.5 h-3.5" /> GERMANY · AUTOBAHN NETWORK
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Live Germany Traffic Cameras, <span className="text-[#D4AF37]">Autobahn Included</span>
          </h1>
          <p className="text-white/55 mt-5 text-base md:text-lg leading-relaxed">
            WorldEye tracks {DE_COUNT} live traffic cameras across Germany —
            Autobahn junctions, federal roads and city feeds from Berlin to the
            Rhine-Ruhr. Germany publishes its road cameras state by state, in
            German, across a patchwork of portals; here the open feeds sit on
            one map, in English, next to the rest of Europe.
          </p>
          <p className="text-white/55 mt-4 text-base md:text-lg leading-relaxed">
            Check for a Stau before the holiday run south, roadworks on your
            corridor, or snow crossing the Mittelgebirge — every feed is free
            to watch, with no account and no signup.
          </p>
        </div>

        <DirectorySearch
          label="Germany traffic areas"
          options={trafficAreas}
          placeholder="Search Germany traffic by area…"
          emptyText={'No Germany traffic areas match "{value}".'}
          targetId="germany-traffic-explorer"
        />

        <div className="mt-14">
          <h2 className="text-2xl md:text-3xl font-bold">What you can check</h2>
          <div className="mt-6 grid md:grid-cols-2 gap-5">
            {[
              {
                t: "Autobahn junctions",
                d: "The interchanges where Germany's traffic stops: ring motorways, holiday corridors and the great north–south axes — see the queue, not just the warning.",
              },
              {
                t: "Roadworks zones",
                d: "Baustellen are a way of life on the Autobahn. Cameras at major works show whether the squeeze is flowing or standing still.",
              },
              {
                t: "City approaches",
                d: "Berlin, Munich, Hamburg, Cologne and Frankfurt approaches — the last twenty minutes of the trip that decide whether you're on time.",
              },
              {
                t: "Weather crossings",
                d: "Fog in the river valleys and snow on the high routes: a direct look at the road beats a regional forecast every time.",
              },
            ].map((c) => (
              <div key={c.t} className="rounded-2xl border border-white/10 bg-white/[0.02] p-7">
                <h3 className="font-bold">{c.t}</h3>
                <p className="text-sm text-white/55 leading-relaxed mt-2">{c.d}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold">Reading German traffic like a local</h2>
          <div className="mt-6 space-y-4 text-white/60 leading-relaxed max-w-3xl">
            <p>
              Germany publishes fewer cameras than its neighbors — privacy
              caution shapes the whole approach — so the 340+ feeds that are
              public earn their keep: they sit at the Autobahn junctions and
              corridors where the Stau actually forms. German congestion has a
              calendar. Friday afternoons lock the corridors out of every
              metro; the summer holiday changeovers, when one Land&rsquo;s
              school break ends and another&rsquo;s begins, produce the
              famous Ferienverkehr jams on the north–south routes; and the
              permanent geography of Baustellen — roadworks — means a
              corridor can be free at noon and stationary by two.
            </p>
            <p>
              The local habit the cameras support is corridor choice. Between
              the Rhine-Ruhr, Frankfurt, Munich and Hamburg there is usually
              more than one plausible Autobahn route, and they rarely jam
              identically. A two-minute look at the junction feeds before you
              leave — and again at the border crossings toward Austria, the
              Netherlands and Poland in holiday season — is the difference
              between the fast route and the famous one. No general speed
              limit on the open stretches makes the flowing sections fast;
              it does nothing for the stationary ones.
            </p>
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold">How to watch</h2>
          <div className="mt-8 grid md:grid-cols-3 gap-5">
            {STEPS.map((s, i) => (
              <div key={s.title} className="rounded-2xl border border-white/10 bg-white/[0.02] p-7">
                <span className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] font-bold">
                  {i + 1}
                </span>
                <h3 className="font-bold mt-4">{s.title}</h3>
                <p className="text-sm text-white/55 leading-relaxed mt-2">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold">Live Germany traffic cameras</h2>
          <p className="text-white/50 mt-2 text-sm md:text-base max-w-3xl">
            {fmt(trafficTotal)} of Germany&apos;s {fmt(countryTotal)} indexed cameras
            are road feeds — named as roads or published by road authorities —
            and every one is below, live. Search by road or city; what the
            camera shows is the condition report.
          </p>
          <div className="mt-6">
            <DirectoryExplorer
              scopeKey="traffic-germany"
              scopeLabel="Germany traffic"
              groupBy="city"
              searchPlaceholder="Search Germany traffic cameras — a road, a junction, a city…"
              explorerId="germany-traffic-explorer"
            />
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold">Germany traffic camera FAQs</h2>
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

        <div className="mt-16 text-center rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent p-10 md:p-14">
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight">
            Check the Autobahn <span className="text-[#D4AF37]">before you join it.</span>
          </h2>
          <p className="text-white/55 mt-4 max-w-xl mx-auto">
            Open the globe, zoom to your route, and watch the road live.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              Watch Germany live <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/europe-live-cameras"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl border border-white/15 text-white/75 hover:text-white hover:border-white/30 transition font-semibold"
            >
              Europe live cameras
            </Link>
          </div>
          <p className="text-xs text-white/35 mt-6">
            More networks: <Link href="/spain-traffic-cameras" className="text-[#D4AF37] hover:underline">Spain traffic cameras</Link> · <Link href="/live-traffic-cameras" className="text-[#D4AF37] hover:underline">US traffic cameras</Link> · <Link href="/cameras/countries" className="text-[#D4AF37] hover:underline">Browse by country</Link>
          </p>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
