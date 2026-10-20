import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Car, CheckCircle2 } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";

// Counts: camera-directory.json snapshot (886 SE cameras, 2026-10-11) plus
// the October 2026 harvest (+734 probe-verified, mostly Trafikverket road
// cameras). Union, deduplicated: 1,620.
const SE_COUNT = "1,600+";

export const metadata: Metadata = {
  title: "Sweden Traffic Cameras — Live Trafikverket Road Cams",
  description:
    "Watch 1,600+ live traffic cameras across Sweden — Trafikverket feeds on the E4, E6 and E20, Stockholm and Gothenburg on one map. Free, no signup.",
  alternates: { canonical: "https://worldeye.app/sweden-traffic-cameras" },
  openGraph: {
    title: "Sweden Traffic Cameras — Live Trafikverket Road Cams | WorldEye",
    description:
      "1,600+ live road cameras across Sweden — motorways, cities and winter roads on one map, free to watch with no signup.",
    url: "https://worldeye.app/sweden-traffic-cameras",
    type: "website",
  },
};

const STEPS = [
  {
    title: "Open the WorldEye map",
    desc: "Head to the live map and enable the camera layer. Every public feed appears as a marker on the globe.",
  },
  {
    title: "Zoom to your route",
    desc: "Search a city, a motorway or a lake crossing — the map flies there and loads the nearest traffic cameras.",
  },
  {
    title: "Click a feed to watch",
    desc: "Click any marker to open the camera. Check congestion, snow and road conditions before you leave.",
  },
];

const FAQS = [
  {
    q: "Where do these Swedish traffic cameras come from?",
    a: "Most are published by Trafikverket, the Swedish Transport Administration — the road cameras Sweden operates for traffic management and winter maintenance — together with municipal feeds. WorldEye collects them into one map alongside its 74,229 cameras worldwide.",
  },
  {
    q: "How many live cameras are there in Sweden?",
    a: `WorldEye indexes ${SE_COUNT} cameras in Sweden — the E4 from Malmö to Stockholm and beyond, the E6 up the west coast, Gothenburg and Västra Götaland, Skåne and hundreds of regional road points.`,
  },
  {
    q: "Can I check winter road conditions?",
    a: "Yes — Sweden's cameras earn their keep from November to April. They show snowfall, ice and plowing state on the main corridors, including the long northern stretches where a wrong call costs hours.",
  },
  {
    q: "Do the cameras show live video or still images?",
    a: "Trafikverket cameras publish still images that refresh at intervals rather than continuous video. A fresh still is enough to judge snow cover, queue length and visibility — and it is how the agency itself publishes them.",
  },
  {
    q: "Can I check Stockholm and Gothenburg traffic?",
    a: "Both metros are covered — Stockholm's Essingeleden and approach motorways, and Gothenburg's E6/E20/E45 junctions and tunnel approaches. Zoom in and the nearest feeds load around you.",
  },
  {
    q: "Is there a cost or account needed?",
    a: "No. The cameras are free to watch with no account and no signup. Open the map, zoom to Sweden, and click any marker.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Sweden Traffic Cameras — Live Trafikverket Road Cams",
  description:
    "Directory of 1,600+ live traffic cameras across Sweden from Trafikverket and municipal public sources.",
  url: "https://worldeye.app/sweden-traffic-cameras",
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  dateModified: "2026-10-18",
};

export default function SwedenTrafficCamerasPage() {
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
            <Car className="w-3.5 h-3.5" /> SWEDEN · TRAFIKVERKET NETWORK
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Live Sweden Traffic Cameras, <span className="text-[#D4AF37]">E4 to the Arctic</span>
          </h1>
          <p className="text-white/55 mt-5 text-base md:text-lg leading-relaxed">
            WorldEye tracks {SE_COUNT} live traffic cameras across Sweden —
            Trafikverket&apos;s motorway and road network from Malmö to the far
            north, with Stockholm, Gothenburg and Skåne in between. Instead of
            working through the agency&apos;s portal region by region, the whole
            network sits on one globe.
          </p>
          <p className="text-white/55 mt-4 text-base md:text-lg leading-relaxed">
            Check the morning queue on Essingeleden, snow building on the E4
            north, or the west-coast run to Norway — every feed is free to
            watch, with no account and no signup.
          </p>
        </div>

        <div className="mt-14">
          <h2 className="text-2xl md:text-3xl font-bold">What you can check</h2>
          <div className="mt-6 grid md:grid-cols-2 gap-5">
            {[
              {
                t: "Stockholm approaches",
                d: "Essingeleden, the E4/E20 approaches and the lake crossings — the commute check for the capital, straight from the cameras on the gantries.",
              },
              {
                t: "Gothenburg & the west coast",
                d: "The E6 corridor and tunnel approaches in Sweden's port city, plus the run north toward the Norwegian border.",
              },
              {
                t: "The E4 spine",
                d: "Malmö–Helsingborg–Jönköping–Stockholm and the long northern continuation — the road Sweden runs on, watched junction by junction.",
              },
              {
                t: "Winter roads",
                d: "From Skåne slush to Norrland ice: cameras show plowing state and surface conditions across a very long country.",
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
          <h2 className="text-2xl md:text-3xl font-bold">Sweden traffic camera FAQs</h2>
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
            See Sweden&apos;s roads <span className="text-[#D4AF37]">as they are now.</span>
          </h2>
          <p className="text-white/55 mt-4 max-w-xl mx-auto">
            Open the globe, zoom to your route, and watch the road live.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              Watch Sweden live <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/cameras/countries/sweden"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl border border-white/15 text-white/75 hover:text-white hover:border-white/30 transition font-semibold"
            >
              Browse Sweden cameras
            </Link>
          </div>
          <p className="text-xs text-white/35 mt-6">
            More networks: <Link href="/norway-traffic-cameras" className="text-[#D4AF37] hover:underline">Norway road cameras</Link> · <Link href="/europe-live-cameras" className="text-[#D4AF37] hover:underline">Europe live cameras</Link> · <Link href="/germany-traffic-cameras" className="text-[#D4AF37] hover:underline">Germany traffic cameras</Link>
          </p>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
