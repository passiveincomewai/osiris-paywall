import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Car, CheckCircle2 } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";

// Counts: camera-directory.json snapshot (1,997 ES cameras, 2026-10-11 — the
// DGT national network is the backbone) plus the October 2026 harvest (+128
// probe-verified). Union, deduplicated: 2,125.
const ES_COUNT = "2,100+";

export const metadata: Metadata = {
  title: "Spain Traffic Cameras — Live DGT Road Cams",
  description:
    "Watch 2,100+ live traffic cameras across Spain — DGT motorway and road feeds, Madrid, Barcelona, Valencia and the AP-7 on one map. Free, no signup.",
  alternates: { canonical: "https://worldeye.app/spain-traffic-cameras" },
  openGraph: {
    title: "Spain Traffic Cameras — Live DGT Road Cams | WorldEye",
    description:
      "2,100+ live road cameras across Spain — autovías, autopistas and city rings on one map, free to watch with no signup.",
    url: "https://worldeye.app/spain-traffic-cameras",
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
    desc: "Search a city, an autovía or a stretch of coast — the map flies there and loads the nearest traffic cameras.",
  },
  {
    title: "Click a feed to watch",
    desc: "Click any marker to open the camera. Check congestion, fog and road conditions before you leave.",
  },
];

const FAQS = [
  {
    q: "Where do these Spanish traffic cameras come from?",
    a: "The backbone is the DGT (Dirección General de Tráfico) national network — the public cameras Spain's traffic authority operates on autovías and autopistas — together with regional and city feeds. WorldEye collects them into one map alongside its 74,229 cameras worldwide.",
  },
  {
    q: "How many live cameras are there in Spain?",
    a: `WorldEye indexes ${ES_COUNT} cameras in Spain — Madrid's M-30 and radial motorways, the AP-7 Mediterranean corridor, Barcelona's rings, Valencia, the Basque and Galician networks and hundreds of interurban road points.`,
  },
  {
    q: "Can I check traffic before a holiday getaway?",
    a: "Yes — that is one of the most common uses. During the big operación salida weekends, the DGT corridors out of Madrid and toward the coasts jam predictably. The cameras let you see the queues at the key junctions before choosing when to leave.",
  },
  {
    q: "Do the cameras show live video or still images?",
    a: "Spanish road cameras publish still images that refresh at short intervals rather than continuous video — the standard format for the DGT network, and enough to judge congestion, fog banks on the Meseta or standing water after storms.",
  },
  {
    q: "Can I check fog and winter conditions inland?",
    a: "Yes. The northern Meseta and the passes toward the Cantabrian coast are famous for dense fog and winter ice. Cameras along the A-1, A-6 and A-67 corridors show visibility and road state directly.",
  },
  {
    q: "Is there a cost or account needed?",
    a: "No. The cameras are free to watch with no account and no signup. Open the map, zoom to Spain, and click any marker.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Spain Traffic Cameras — Live DGT Road Cams",
  description:
    "Directory of 2,100+ live traffic cameras across Spain from the DGT and regional public sources.",
  url: "https://worldeye.app/spain-traffic-cameras",
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  dateModified: "2026-10-18",
};

export default function SpainTrafficCamerasPage() {
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
            <Car className="w-3.5 h-3.5" /> SPAIN · DGT NETWORK
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Live Spain Traffic Cameras, <span className="text-[#D4AF37]">Autovías to Coast Roads</span>
          </h1>
          <p className="text-white/55 mt-5 text-base md:text-lg leading-relaxed">
            WorldEye tracks {ES_COUNT} live traffic cameras across Spain — the
            DGT&apos;s national motorway network, Madrid&apos;s rings, the AP-7
            down the Mediterranean coast and regional roads in every corner of
            the country. Instead of digging through the DGT&apos;s map region by
            region, you see the whole network on one globe.
          </p>
          <p className="text-white/55 mt-4 text-base md:text-lg leading-relaxed">
            Check the Friday getaway queues, fog on the plateau, or the coast
            road before a holiday drive — every feed is free to watch, with no
            account and no signup.
          </p>
        </div>

        <div className="mt-14">
          <h2 className="text-2xl md:text-3xl font-bold">What you can check</h2>
          <div className="mt-6 grid md:grid-cols-2 gap-5">
            {[
              {
                t: "Madrid & the radial motorways",
                d: "The M-30 ring and the A-1 to A-6 radials carry Spain's heaviest commuter and getaway traffic — cameras cover the junctions where queues form first.",
              },
              {
                t: "The Mediterranean corridor",
                d: "The AP-7 and A-7 from Catalonia through Valencia to Málaga — the holiday route for half of Europe, with cameras at the toll-free corridor's key points.",
              },
              {
                t: "Barcelona & Catalonia",
                d: "Ring roads and approaches into Barcelona, plus the routes north to Girona and the French border.",
              },
              {
                t: "The north & the Meseta",
                d: "Galicia, the Basque Country and the high plateau — where fog, rain and winter ice make a camera check genuinely useful before driving.",
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
          <h2 className="text-2xl md:text-3xl font-bold">Spain traffic camera FAQs</h2>
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
            See Spain&apos;s roads <span className="text-[#D4AF37]">before you drive them.</span>
          </h2>
          <p className="text-white/55 mt-4 max-w-xl mx-auto">
            Open the globe, zoom to your route, and watch the traffic live.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              Watch Spain live <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/cameras/countries/spain"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl border border-white/15 text-white/75 hover:text-white hover:border-white/30 transition font-semibold"
            >
              Browse Spain cameras
            </Link>
          </div>
          <p className="text-xs text-white/35 mt-6">
            More networks: <Link href="/city-webcams/madrid" className="text-[#D4AF37] hover:underline">Madrid webcams</Link> · <Link href="/europe-live-cameras" className="text-[#D4AF37] hover:underline">Europe live cameras</Link> · <Link href="/germany-traffic-cameras" className="text-[#D4AF37] hover:underline">Germany traffic cameras</Link>
          </p>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
