import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Car, CheckCircle2 } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";

// Counts: camera-directory.json snapshot (138 KR cameras, 2026-10-11) plus the
// October 2026 harvest (+1,499 probe-verified Korean expressway and city
// cameras). Union, deduplicated: 1,637.
const KR_COUNT = "1,600+";

export const metadata: Metadata = {
  title: "South Korea Traffic Cameras — Live Seoul & Expressway Cams",
  description:
    "Watch 1,600+ live traffic cameras across South Korea — Seoul expressways, the Gyeongbu Expressway and city networks on one map. Free, no signup.",
  alternates: { canonical: "https://worldeye.app/south-korea-traffic-cameras" },
  openGraph: {
    title: "South Korea Traffic Cameras — Live Seoul & Expressway Cams | WorldEye",
    description:
      "1,600+ live road cameras across South Korea — Seoul, Busan, Incheon and the expressway network on one map, free with no signup.",
    url: "https://worldeye.app/south-korea-traffic-cameras",
    type: "website",
  },
};

const STEPS = [
  {
    title: "Open the WorldEye map",
    desc: "Head to the live map and enable the camera layer. Every public feed appears as a marker on the globe.",
  },
  {
    title: "Zoom to your city or expressway",
    desc: "Search Seoul, Busan or an expressway junction — the map flies there and loads the nearest traffic cameras.",
  },
  {
    title: "Click a feed to watch",
    desc: "Click any marker to open the camera. Check congestion, snow and road conditions before you leave.",
  },
];

const FAQS = [
  {
    q: "Where do these South Korean traffic cameras come from?",
    a: "They are public feeds published by Korea's national expressway and road authorities and by city traffic information centers — the same camera networks Korean drivers check through national traffic portals. WorldEye collects them into one map alongside its 74,229 cameras worldwide, with an English interface.",
  },
  {
    q: "How many live cameras are there in South Korea?",
    a: `WorldEye indexes ${KR_COUNT} cameras in South Korea — Seoul's urban expressways and Han River bridges, the Gyeongbu Expressway spine to Busan, Incheon's airport corridors and networks in Daegu, Daejeon and Gwangju.`,
  },
  {
    q: "Can I check Seoul traffic before driving?",
    a: "Yes. Seoul's riverside expressways — Gangbyeonbuk-ro and Olympic-daero — and the ring roads are covered, so you can see the queues on the Han crossings before choosing a route.",
  },
  {
    q: "Do the cameras show live video or still images?",
    a: "Korean road cameras typically publish still images that refresh at short intervals rather than continuous video. That is the standard format for the national network and is enough to judge congestion, snow or incidents.",
  },
  {
    q: "Are the cameras useful in winter?",
    a: "Very. Snow and black ice close Korean expressway sections most winters, and the mountain corridors in Gangwon are the first to be hit. The cameras show road state directly, which matters more than a forecast icon.",
  },
  {
    q: "Is there a cost or account needed?",
    a: "No. The cameras are free to watch with no account and no signup. Open the map, zoom to Korea, and click any marker.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "South Korea Traffic Cameras — Live Seoul & Expressway Cams",
  description:
    "Directory of 1,600+ live traffic cameras across South Korea from national and city public sources.",
  url: "https://worldeye.app/south-korea-traffic-cameras",
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  dateModified: "2026-10-18",
};

export default function SouthKoreaTrafficCamerasPage() {
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
            <Car className="w-3.5 h-3.5" /> SOUTH KOREA · EXPRESSWAY NETWORK
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Live South Korea Traffic Cameras, <span className="text-[#D4AF37]">Seoul to Busan</span>
          </h1>
          <p className="text-white/55 mt-5 text-base md:text-lg leading-relaxed">
            WorldEye tracks {KR_COUNT} live traffic cameras across South Korea —
            Seoul&apos;s urban expressways and Han River bridges, the Gyeongbu
            Expressway that runs the length of the country, and the networks of
            Busan, Incheon and Daegu. Korea&apos;s road cameras are excellent but
            scattered across national portals; here they are on one map, in
            English.
          </p>
          <p className="text-white/55 mt-4 text-base md:text-lg leading-relaxed">
            Check rush hour on the river crossings, snow in Gangwon, or the long
            holiday migration queues — every feed is free to watch, with no
            account and no signup.
          </p>
        </div>

        <div className="mt-14">
          <h2 className="text-2xl md:text-3xl font-bold">What you can check</h2>
          <div className="mt-6 grid md:grid-cols-2 gap-5">
            {[
              {
                t: "Seoul expressways & bridges",
                d: "Gangbyeonbuk-ro, Olympic-daero, the ring expressways and the Han River bridges — the arteries where Seoul's rush hour is won or lost.",
              },
              {
                t: "The Gyeongbu corridor",
                d: "Korea's busiest expressway, Seoul to Busan — junctions, tunnels and rest-area approaches along the full spine of the country.",
              },
              {
                t: "Incheon & the airport route",
                d: "The expressways serving Incheon International Airport and the bridges to Yeongjong Island — a useful check before a flight.",
              },
              {
                t: "Regional cities & mountains",
                d: "Busan, Daegu and Daejeon networks, plus Gangwon's mountain corridors where winter weather hits first and hardest.",
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
          <h2 className="text-2xl md:text-3xl font-bold">South Korea traffic camera FAQs</h2>
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
            See Korea&apos;s roads <span className="text-[#D4AF37]">right now.</span>
          </h2>
          <p className="text-white/55 mt-4 max-w-xl mx-auto">
            Open the globe, zoom to the peninsula, and watch the traffic live.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              Watch Korea live <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/cameras/countries/south-korea"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl border border-white/15 text-white/75 hover:text-white hover:border-white/30 transition font-semibold"
            >
              Browse Korea cameras
            </Link>
          </div>
          <p className="text-xs text-white/35 mt-6">
            More networks: <Link href="/japan-traffic-cameras" className="text-[#D4AF37] hover:underline">Japan traffic cameras</Link> · <Link href="/asia-webcams" className="text-[#D4AF37] hover:underline">Asia webcams</Link> · <Link href="/live-traffic-cameras" className="text-[#D4AF37] hover:underline">US traffic cameras</Link>
          </p>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
