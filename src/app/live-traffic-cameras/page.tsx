import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Car, CheckCircle2 } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import TrialCtaSection from "@/components/TrialCtaSection";
import data from "@/data/camera-directory.json";

export const metadata: Metadata = {
  title: "Live Traffic Cameras — US DOT Highway Cams",
  description:
    "Watch 23,059 live US traffic cameras — DOT highway feeds, interstate junctions and city streets. Free, no signup. Check road conditions in real time.",
  alternates: { canonical: "https://worldeye.app/live-traffic-cameras" },
  openGraph: {
    title: "Live Traffic Cameras — US DOT Highway Cams | WorldEye",
    description:
      "23,059 live US traffic cameras — DOT highway feeds and interstate junctions, free to watch with no signup.",
    url: "https://worldeye.app/live-traffic-cameras",
    type: "website",
  },
};

const us = data.countries.find((c) => c.slug === "united-states")!;
const fmt = (n: number) => n.toLocaleString("en-US");

const STEPS = [
  {
    title: "Open the WorldEye map",
    desc: "Head to the live map and enable the camera layer. Every public feed appears as a marker on the globe.",
  },
  {
    title: "Zoom to your route",
    desc: "Search a city, interstate or junction — the map flies straight there and loads the nearest traffic cameras.",
  },
  {
    title: "Click a feed to watch",
    desc: "Click any marker to open the live stream. Check congestion, weather and road conditions before you leave.",
  },
];

const FAQS = [
  {
    q: "Are these official DOT traffic cameras?",
    a: "Most US feeds in the directory are published by state departments of transportation, tollway authorities and city traffic systems. They are public streams these agencies already make available on the web — WorldEye collects them into one searchable map layer.",
  },
  {
    q: "How many US traffic cameras can I watch?",
    a: `WorldEye currently indexes ${fmt(us.count)} live cameras in the United States, from state highway systems like Georgia's 511 network (4,330 feeds) and Utah's UDOT cameras (2,082 feeds) to major metro corridors like Houston, Dallas and Phoenix.`,
  },
  {
    q: "Can I check my commute or a road trip route?",
    a: "Yes. Search for any place or zoom into your route and the nearest live feeds load around you. Many travelers check mountain passes, interstate junctions and border crossings before heading out.",
  },
  {
    q: "Do the cameras show live video or still images?",
    a: "It varies by operator. Many DOT feeds refresh as still images every few seconds rather than smooth video — plenty for judging congestion or a blocked lane. Metro and tollway systems more often stream true video.",
  },
  {
    q: "Can I check winter road conditions?",
    a: "Yes — one of the best uses. Utah's canyon cameras (like SR-210 to the ski resorts), mountain pass feeds, and northern-state DOT networks show snow, plowing, and chain controls live through winter.",
  },
  {
    q: "Are there cameras for my state's highways?",
    a: "If your state DOT publishes open feeds, they are likely indexed — Georgia, Utah, Texas, Florida, Indiana, and Nevada have the densest networks. Search your interstate or city on the live map to see what's there.",
  },
  {
    q: "Can truckers use these for route planning?",
    a: "Yes. Checking interchange congestion, work zones, and weather on mountain grades before rolling saves real time. Many drivers check the major junctions along their route as part of trip planning.",
  },
  {
    q: "Is there a cost or account needed?",
    a: "No. All traffic cameras are free to watch with no account and no signup — the directory exists so anyone can check road conditions.",
  },
  {
    q: "Why do states publish these cameras at all?",
    a: "Because informed drivers make better decisions: state DOTs publish feeds so travelers can see congestion, weather and incidents for themselves and stagger or reroute trips. The publicity is the point — an empty road beside a jammed one is a policy success the cameras both cause and document.",
  },
  {
    q: "Are these the same cameras the traffic apps use?",
    a: "Often yes at the source: the feeds come from the same state DOT networks the big traffic services draw on. The difference is presentation — here you watch the camera itself on the map, alongside weather and the rest of the live picture, rather than an app's colored summary of it.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Live Traffic Cameras — US DOT Highway Cams",
  description: `Directory of ${fmt(us.count)} live US traffic cameras from DOT and public sources, with per-state counts.`,
  url: "https://worldeye.app/live-traffic-cameras",
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  dateModified: data.generatedAt,
};

export default function LiveTrafficCamerasPage() {
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

        {/* Hero */}
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
            <Car className="w-3.5 h-3.5" /> TRAFFIC NETWORK
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Live US Traffic Cameras, <span className="text-[#D4AF37]">All in One Place</span>
          </h1>
          <p className="text-white/55 mt-5 text-base md:text-lg leading-relaxed">
            WorldEye tracks {fmt(us.count)} live traffic cameras across the United
            States — state DOT highway feeds, interstate junctions, tollways and busy
            city intersections. Instead of hunting through a dozen separate agency
            websites, you see the whole road network on one globe: check congestion,
            storms and mountain passes with your own eyes before you drive.
          </p>
          <p className="text-white/55 mt-4 text-base md:text-lg leading-relaxed">
            Georgia leads the nation with 4,330 live feeds, followed by Utah's 2,082
            mountain and highway cameras. Every feed is free to watch — no account,
            no signup.
          </p>
        </div>

        {/* Top areas table */}
        <div className="mt-14">
          <h2 className="text-2xl md:text-3xl font-bold">
            Top states by traffic camera count
          </h2>
          <p className="text-white/50 mt-2 text-sm md:text-base">
            The ten busiest areas in the directory, ranked by live feeds.
          </p>
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-sm md:text-base">
              <thead>
                <tr className="bg-white/[0.04] text-left text-xs uppercase tracking-wider text-white/45">
                  <th scope="col" className="px-4 md:px-6 py-4 font-semibold">State / Region</th>
                  <th scope="col" className="px-4 md:px-6 py-4 font-semibold text-right">Live cameras</th>
                </tr>
              </thead>
              <tbody>
                {us.areas.slice(0, 10).map((a) => (
                  <tr key={a.name} className="border-t border-white/[0.06] hover:bg-white/[0.03] transition">
                    <td className="px-4 md:px-6 py-3.5 font-medium text-white/85">{a.name}</td>
                    <td className="px-4 md:px-6 py-3.5 text-right tabular-nums text-[#D4AF37] font-semibold">
                      {fmt(a.count)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-white/35 mt-3">
            Counts reflect indexed public feeds as of the latest directory update and change as agencies add cameras.
          </p>
        </div>

        {/* How to watch */}
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

        {/* The pre-drive ritual */}
        <div className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold">The pre-drive ritual</h2>
          <div className="mt-6 space-y-4 text-white/60 leading-relaxed max-w-3xl">
            <p>
              Traffic apps tell you a road is red. A camera tells you why —
              the jackknifed truck, the squall, the game letting out — and
              whether the alternative the app is steering everyone else onto
              is any better. That is why drivers who discover live DOT cameras
              tend to build a ritual around them: pick the three or four
              feeds at your route&rsquo;s decision points — the canyon mouth,
              the big interchange, the bridge — and give them ten seconds
              each before you turn the key.
            </p>
            <p>
              The habit compounds in winter. Mountain-state networks like
              Utah&rsquo;s 2,082 feeds exist because pass conditions decide
              whole days: chain requirements, ground blizzards, a canyon
              closed by a slide. The national picture helps too — a storm
              system you can see on the weather layer, arriving at cameras
              two states away an hour before it reaches yours, is a forecast
              you can watch instead of trust.
            </p>
          </div>
        </div>

        {/* FAQs */}
        <div className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold">Traffic camera FAQs</h2>
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

        <TrialCtaSection utmSource="live-traffic-cameras" />

        {/* CTA */}
        <div className="mt-16 text-center rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent p-10 md:p-14">
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight">
            Check the road <span className="text-[#D4AF37]">before you drive.</span>
          </h2>
          <p className="text-white/55 mt-4 max-w-xl mx-auto">
            Open the globe, zoom to your route, and watch the traffic live.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              Watch traffic live <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/cameras/countries"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl border border-white/15 text-white/75 hover:text-white hover:border-white/30 transition font-semibold"
            >
              Browse by country
            </Link>
          </div>
          <p className="text-xs text-white/35 mt-6">
            Explore the full directory: <Link href="/cameras" className="text-[#D4AF37] hover:underline">live cameras</Link> · <Link href="/" className="text-[#D4AF37] hover:underline">home</Link>
          </p>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
