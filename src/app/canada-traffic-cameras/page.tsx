import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Car, CheckCircle2 } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";

// Counts: camera-directory.json snapshot (1,509 CA cameras, 2026-10-11) plus
// the October 2026 harvest (+1,497 probe-verified: Ontario 511, DriveBC and
// other provincial networks). Union, deduplicated: 3,006.
const CA_COUNT = "3,000+";

export const metadata: Metadata = {
  title: "Canada Traffic Cameras — Live Highway & Road Cams",
  description:
    "Watch 3,000+ live traffic cameras across Canada — Ontario 511, DriveBC, Alberta and Quebec highway feeds on one map. Free, no signup.",
  alternates: { canonical: "https://worldeye.app/canada-traffic-cameras" },
  openGraph: {
    title: "Canada Traffic Cameras — Live Highway & Road Cams | WorldEye",
    description:
      "3,000+ live highway and road cameras across Canada — Ontario, BC, Alberta and Quebec feeds on one map, free with no signup.",
    url: "https://worldeye.app/canada-traffic-cameras",
    type: "website",
  },
};

const STEPS = [
  {
    title: "Open the WorldEye map",
    desc: "Head to the live map and enable the camera layer. Every public feed appears as a marker on the globe.",
  },
  {
    title: "Zoom to your province or pass",
    desc: "Search a city, highway or mountain pass — the map flies there and loads the nearest traffic cameras.",
  },
  {
    title: "Click a feed to watch",
    desc: "Click any marker to open the camera. Check congestion, snow and road conditions before you leave.",
  },
];

const FAQS = [
  {
    q: "Where do these Canadian traffic cameras come from?",
    a: "They are the public feeds published by provincial and municipal road authorities — Ontario 511, DriveBC, Alberta's road network, Quebec's cameras and city systems like Ottawa and Edmonton. WorldEye collects them into one map alongside its 76,000+ cameras worldwide, so you don't have to visit a different site for every province.",
  },
  {
    q: "How many live cameras are there in Canada?",
    a: `WorldEye indexes ${CA_COUNT} cameras in Canada — the 400-series highways and GTA corridors in Ontario, BC's Coquihalla and Vancouver-area routes, Alberta highways and prairie cities, and Quebec's Montreal and Quebec City networks.`,
  },
  {
    q: "Can I check the Coquihalla or other mountain passes?",
    a: "Yes. DriveBC's pass cameras — Coquihalla Summit, Rogers Pass approaches and other Highway 5 and Highway 1 corridors — are among the most-checked feeds in winter. They show snowfall, chain-up areas and visibility before you commit to the drive.",
  },
  {
    q: "Do the cameras show live video or still images?",
    a: "Most provincial networks publish still images that refresh every few minutes rather than continuous video. That is the standard format for Canadian highway cameras and is plenty for judging snow cover, congestion and closures.",
  },
  {
    q: "Can I check border crossing approaches?",
    a: "Several networks cover the approaches to major Canada–US crossings, including the Peace Arch and Pacific Highway crossings in BC and the Windsor and Niagara corridors in Ontario. Zoom to the crossing on the map to see the nearest feeds.",
  },
  {
    q: "Is there a cost or account needed?",
    a: "No. The cameras are free to watch with no account and no signup. Open the map, zoom to Canada, and click any marker.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Canada Traffic Cameras — Live Highway & Road Cams",
  description:
    "Directory of 3,000+ live traffic and highway cameras across Canada from provincial and municipal public sources.",
  url: "https://worldeye.app/canada-traffic-cameras",
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  dateModified: "2026-10-18",
};

export default function CanadaTrafficCamerasPage() {
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
            <Car className="w-3.5 h-3.5" /> CANADA · HIGHWAY NETWORK
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Live Canada Traffic Cameras, <span className="text-[#D4AF37]">Every Province on One Map</span>
          </h1>
          <p className="text-white/55 mt-5 text-base md:text-lg leading-relaxed">
            WorldEye tracks {CA_COUNT} live traffic cameras across Canada —
            Ontario&apos;s 400-series highways, BC&apos;s mountain corridors,
            Alberta&apos;s highways and Quebec&apos;s metro networks. Each province
            publishes its feeds on its own site; here they are together on one
            globe, so a trip that crosses provincial lines stays on one map.
          </p>
          <p className="text-white/55 mt-4 text-base md:text-lg leading-relaxed">
            Check the 401 through Toronto, snow on the Coquihalla, or the bridges
            into Montreal — every feed is free to watch, with no account and no
            signup.
          </p>
        </div>

        <div className="mt-14">
          <h2 className="text-2xl md:text-3xl font-bold">What you can check</h2>
          <div className="mt-6 grid md:grid-cols-2 gap-5">
            {[
              {
                t: "Ontario & the GTA",
                d: "Ontario 511 cameras along Highway 401, the QEW, the Don Valley Parkway and Ottawa's corridors — the busiest commuter network in the country.",
              },
              {
                t: "British Columbia passes",
                d: "DriveBC feeds on Highway 5 (the Coquihalla), Highway 1 and Vancouver-area bridges — essential winter checks for snow, closures and visibility.",
              },
              {
                t: "Alberta & the Prairies",
                d: "Highway 2 between Calgary and Edmonton, Deerfoot Trail, and city cameras in Edmonton — plus winter storm watching across the prairie corridors.",
              },
              {
                t: "Quebec metros",
                d: "Montreal and Quebec City networks covering the autoroutes, bridges and tunnels — including the approaches commuters queue on daily.",
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
          <h2 className="text-2xl md:text-3xl font-bold">Canada traffic camera FAQs</h2>
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
            Check the highway <span className="text-[#D4AF37]">before you drive.</span>
          </h2>
          <p className="text-white/55 mt-4 max-w-xl mx-auto">
            Open the globe, zoom to your route, and watch the road live.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              Watch Canada live <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/cameras/countries/canada"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl border border-white/15 text-white/75 hover:text-white hover:border-white/30 transition font-semibold"
            >
              Browse Canada cameras
            </Link>
          </div>
          <p className="text-xs text-white/35 mt-6">
            City guides: <Link href="/city-webcams/toronto" className="text-[#D4AF37] hover:underline">Toronto webcams</Link> · <Link href="/city-webcams/ottawa" className="text-[#D4AF37] hover:underline">Ottawa webcams</Link> · <Link href="/live-traffic-cameras" className="text-[#D4AF37] hover:underline">US traffic cameras</Link>
          </p>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
