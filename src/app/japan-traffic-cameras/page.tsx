import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Car, CheckCircle2 } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import BreadcrumbLd from "@/components/BreadcrumbLd";
import UpdatedStamp from "@/components/UpdatedStamp";
import DirectoryExplorer from "@/components/DirectoryExplorer";
import DirectorySearch from "@/components/DirectorySearch";
import {
  CATALOGUE_GENERATED_AT,
  COUNTRY_INDEX,
  EXPLORE_SCOPES,
  areasForDef,
  countForDef,
} from "@/lib/explore-data";

// Counts: camera-directory.json snapshot (928 JP cameras, 2026-10-11) plus the
// October 2026 OpenCCTV harvest, which added 9,829 probe-verified Japanese
// cameras — the large majority from the national river-and-road camera network
// (river.go.jp). Union, deduplicated against the served catalogue: 10,757.
const JP_COUNT = "10,700+";

export const metadata: Metadata = {
  title: "Japan Traffic Cameras — Live Road & River Cams",
  description:
    "Watch 10,700+ live traffic cameras across Japan — national routes, expressways, mountain passes and river cameras. Free, no signup, all on one map.",
  alternates: { canonical: "https://worldeye.app/japan-traffic-cameras" },
  openGraph: {
    title: "Japan Traffic Cameras — Live Road & River Cams | WorldEye",
    description:
      "10,700+ live road and river cameras across Japan — expressways, passes and flood-prone rivers, free to watch with no signup.",
    url: "https://worldeye.app/japan-traffic-cameras",
    type: "website",
  },
};

const STEPS = [
  {
    title: "Open the WorldEye map",
    desc: "Head to the live map and enable the camera layer. Every public feed appears as a marker on the globe.",
  },
  {
    title: "Zoom to Japan",
    desc: "Search Tokyo, Osaka, a prefecture or an expressway — the map flies there and loads the nearest cameras.",
  },
  {
    title: "Click a feed to watch",
    desc: "Click any marker to open the camera. Check congestion, snow, rain and river levels with your own eyes.",
  },
];

const FAQS = [
  {
    q: "Where do these Japanese traffic cameras come from?",
    a: "Most are published by Japan's Ministry of Land, Infrastructure, Transport and Tourism (MLIT) and prefectural road offices — the same public feeds used for disaster prevention and road management, including the national river-and-road camera network. WorldEye collects them into one searchable map layer alongside its 74,229 cameras worldwide.",
  },
  {
    q: "How many live cameras are there in Japan?",
    a: `WorldEye indexes ${JP_COUNT} cameras in Japan — expressways and national routes, city intersections, mountain passes, tunnels and river monitoring points from Hokkaido to Kyushu. It is one of the largest single-country networks on the map.`,
  },
  {
    q: "Can I check rivers and flooding during a typhoon?",
    a: "Yes. A large share of the Japanese network watches rivers, dams and flood-prone roads — the feeds road managers themselves use during typhoon season. During heavy rain you can watch river levels rise in real time, which is exactly when these cameras matter most.",
  },
  {
    q: "Do the cameras show live video or still images?",
    a: "Most Japanese road and river cameras publish still images that refresh at short intervals rather than continuous video. That is plenty for judging congestion, snow cover, standing water or visibility — and it is how the operators themselves publish them.",
  },
  {
    q: "Can I check snow on mountain passes?",
    a: "Yes. Pass and tunnel cameras across the Japanese Alps, Tohoku and Hokkaido show snow accumulation, plowing and road surface conditions through winter — the standard check before a mountain drive.",
  },
  {
    q: "Is there a cost or account needed?",
    a: "No. The cameras are free to watch with no account and no signup. Open the map, zoom to Japan, and click any marker.",
  },
  {
    q: "Can I check conditions after an earthquake?",
    a: "Yes — road and river cameras near the affected area show ground conditions directly: traffic still moving or stopped, water behaving normally or not. They are a visual supplement to official information, and during an emergency official guidance always comes first.",
  },
  {
    q: "Which parts of Japan have the most cameras?",
    a: "The network is nationwide — the river-and-road system covers prefectures from Hokkaido to Kyushu. Density follows the infrastructure: expressway corridors, flood-prone river basins and snow-country passes carry the most feeds.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
    name: "Japan Traffic Cameras — Live Road & River Cams",
    description:
      "Directory of 10,700+ live traffic, road and river cameras across Japan from MLIT and prefectural public sources.",
    url: "https://worldeye.app/japan-traffic-cameras",
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
    dateModified: CATALOGUE_GENERATED_AT,
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

export default async function JapanTrafficCamerasPage() {
  /* The explorer serves Japan's traffic set: cameras that are road
     feeds by name or by road-authority source (lib/explore-scopes).
     Japan's full index is far larger and mostly river monitoring —
     the lead line below says so, with both real counts. */
  const trafficTotal = await countForDef(EXPLORE_SCOPES["traffic-japan"]);
  const trafficAreas = await areasForDef(EXPLORE_SCOPES["traffic-japan"], 400);
  const countryTotal =
    COUNTRY_INDEX.find((c) => c.slug === "japan")?.count ?? 0;
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

        <BreadcrumbLd trail={[{ label: "Cameras", href: "/cameras" }, { label: "Japan Traffic Cameras" }]} />
        <UpdatedStamp at={CATALOGUE_GENERATED_AT} label="Camera index updated" source="WorldEye camera catalogue" className="mb-8" />

        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
            <Car className="w-3.5 h-3.5" /> JAPAN · ROAD &amp; RIVER NETWORK
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Live Japan Traffic Cameras, <span className="text-[#D4AF37]">One Map</span>
          </h1>
          <p className="text-white/55 mt-5 text-base md:text-lg leading-relaxed">
            WorldEye tracks {JP_COUNT} live cameras across Japan — expressways,
            national routes, mountain passes and one of the densest river-monitoring
            networks in the world. They are the cameras Japan&apos;s own road and
            river managers publish to watch congestion, snow and rising water, and
            here they sit on a single map instead of hundreds of separate
            prefectural websites.
          </p>
          <p className="text-white/55 mt-4 text-base md:text-lg leading-relaxed">
            Check a Tokyo expressway before the commute, a snowy pass in Nagano, or
            a river in Kyushu during typhoon rain — every feed is free to watch,
            with no account and no signup.
          </p>
          <DirectorySearch
            label="Japan traffic areas"
            options={trafficAreas}
            placeholder="Search Japan traffic by area…"
            emptyText={'No Japan traffic areas match "{value}".'}
            targetId="japan-traffic-explorer"
          />
        </div>

        <div className="mt-14">
          <h2 className="text-2xl md:text-3xl font-bold">What you can check</h2>
          <div className="mt-6 grid md:grid-cols-2 gap-5">
            {[
              {
                t: "Expressways & national routes",
                d: "Interchanges, tunnels and junctions on the routes that move Japan — the same views drivers and road operators use to spot congestion and closures.",
              },
              {
                t: "Rivers & flood watch",
                d: "Thousands of river cameras publish around the clock. During typhoons and heavy rain they show water levels, currents and inundation as it happens.",
              },
              {
                t: "Mountain passes & snow",
                d: "Pass cameras across the Alps, Tohoku and Hokkaido show snowfall, plows and icy surfaces before you commit to a winter drive.",
              },
              {
                t: "City streets",
                d: "Intersection and street cameras in Tokyo, Osaka, Kyoto, Sapporo and other metros — useful for weather, events and rush-hour checks.",
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
          <h2 className="text-2xl md:text-3xl font-bold">Why Japan&rsquo;s camera network looks different</h2>
          <div className="mt-6 space-y-4 text-white/60 leading-relaxed max-w-3xl">
            <p>
              Most countries&rsquo; camera networks were built for traffic.
              Japan&rsquo;s was built for disasters. Earthquakes, typhoons,
              river flooding and heavy snow are governing facts of Japanese
              infrastructure, so the state publishes cameras the way other
              countries publish weather stations — as a public safety utility.
              The result is a network that watches rivers and mountain roads
              as closely as expressways, refreshed around the clock, and
              meant to be read by anyone.
            </p>
            <p>
              That origin shows in how the feeds reward checking. A river
              camera that seems quiet in October becomes the most important
              picture in its prefecture when a typhoon landfall pushes the
              water up at 2 AM. A Hokkaido pass camera is a winter ritual for
              the drivers who depend on it. And after an earthquake, the road
              and river feeds near the epicenter are among the first honest
              pictures of what actually happened on the ground — which is why
              this network, more than most, is worth having on one map before
              you need it.
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
          <h2 className="text-2xl md:text-3xl font-bold">Live Japan traffic cameras</h2>
          <p className="text-white/50 mt-2 text-sm md:text-base max-w-3xl">
            {fmt(trafficTotal)} of Japan&apos;s {fmt(countryTotal)} indexed cameras
            are road feeds — named as roads or published by road authorities —
            and every one is below, live. Japan&apos;s much larger river-monitoring
            network lives in the full{" "}
            <Link href="/cameras/countries/japan" className="text-[#D4AF37] hover:underline">
              Japan camera index
            </Link>
            .
          </p>
          <div className="mt-6">
            <DirectoryExplorer
              scopeKey="traffic-japan"
              scopeLabel="Japan traffic"
              groupBy="city"
              searchPlaceholder="Search Japan traffic cameras — an expressway, a pass, a city…"
              explorerId="japan-traffic-explorer"
            />
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold">Japan traffic camera FAQs</h2>
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
            See Japan&apos;s roads <span className="text-[#D4AF37]">right now.</span>
          </h2>
          <p className="text-white/55 mt-4 max-w-xl mx-auto">
            Open the globe, zoom to Japan, and watch traffic, rivers and weather live.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              Watch Japan live <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/cameras/countries/japan"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl border border-white/15 text-white/75 hover:text-white hover:border-white/30 transition font-semibold"
            >
              Browse Japan cameras
            </Link>
          </div>
          <p className="text-xs text-white/35 mt-6">
            More networks: <Link href="/live-traffic-cameras" className="text-[#D4AF37] hover:underline">US traffic cameras</Link> · <Link href="/asia-webcams" className="text-[#D4AF37] hover:underline">Asia webcams</Link> · <Link href="/south-korea-traffic-cameras" className="text-[#D4AF37] hover:underline">South Korea traffic cameras</Link>
          </p>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
