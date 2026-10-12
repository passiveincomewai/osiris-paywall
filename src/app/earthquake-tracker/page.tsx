import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Activity, MapPin, Clock, Gauge, Newspaper, Plane, Eye, Bell, ChevronDown } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import RelatedLinks from "@/components/RelatedLinks";

export const metadata: Metadata = {
  title: "Live Earthquake Tracker — Quakes As They Happen | WorldEye",
  description:
    "Track earthquakes live on a 3D globe: magnitude, depth, location and time as they happen. Free earthquake tracker — no signup, no account, no cost.",
  alternates: { canonical: "/earthquake-tracker" },
  openGraph: {
    title: "Live Earthquake Tracker | WorldEye",
    description:
      "Earthquakes as they happen — magnitude, depth, location and time on a live 3D map. Free, no signup.",
    url: "/earthquake-tracker",
    type: "website",
  },
};

const DATA_POINTS = [
  {
    icon: Gauge,
    title: "Magnitude",
    desc: "Every event plotted with its measured magnitude, so you can see at a glance what's minor and what's major.",
  },
  {
    icon: MapPin,
    title: "Location",
    desc: "Precise epicenter placement on the globe — zoom from a planetary view straight down to the affected region.",
  },
  {
    icon: Activity,
    title: "Depth",
    desc: "Focal depth for each quake, because a shallow magnitude 5 and a deep magnitude 5 are very different events.",
  },
  {
    icon: Clock,
    title: "Time",
    desc: "When it happened, down to the minute — follow an unfolding sequence as aftershocks arrive.",
  },
];

const USE_CASES = [
  {
    icon: Plane,
    title: "Travel safety",
    desc: "Checking in on a destination before you fly — or after you land — takes seconds. See what's shaking near where you're headed.",
  },
  {
    icon: Newspaper,
    title: "Following the news",
    desc: "When a quake makes headlines, look at the actual data yourself: where it hit, how deep, and what followed.",
  },
  {
    icon: Eye,
    title: "Pure curiosity",
    desc: "The planet never sits still. Watching the ring of fire light up over a week is strangely mesmerizing.",
  },
];

const FAQS = [
  {
    q: "Is the earthquake tracker free?",
    a: "Yes — completely. The earthquake layer is part of the free map: no account, no signup, no credit card. Open the site and the quakes are already there.",
  },
  {
    q: "How fast do earthquake updates arrive?",
    a: "Events appear as the public seismic monitoring networks publish them — typically within minutes of a quake being detected and located. The map refreshes continuously while you watch.",
  },
  {
    q: "What magnitude range is shown?",
    a: "From small tremors to major events. Global networks reliably detect quakes around magnitude 4.5 and up worldwide, with smaller events picked up where regional station coverage is dense.",
  },
  {
    q: "Can I get alerts for earthquakes?",
    a: "The live map shows quakes as they happen while you have it open. For push alerts on your phone, dedicated apps from geological agencies are still the best option — WorldEye is the place to see the full picture once something happens.",
  },
  {
    q: "Where does the data come from?",
    a: "Public seismic monitoring networks — the same open feeds researchers and newsrooms use. WorldEye aggregates and visualizes them on the globe; it doesn't operate its own seismometers.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "WorldEye Live Earthquake Tracker",
      description:
        "Track earthquakes live on a 3D globe: magnitude, depth, location and time as they happen. Free earthquake tracker — no signup, no account.",
      url: "https://worldeye.app/earthquake-tracker",
      isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
    },
    {
      "@type": "FAQPage",
      url: "https://worldeye.app/earthquake-tracker",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function EarthquakeTrackerPage() {
  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100 relative overflow-x-clip">
      <JsonLd data={jsonLd} />
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-15 blur-[120px] bg-[#ff6b35]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[300px] rounded-full opacity-10 blur-[100px] bg-[#00E5FF]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-10 md:py-16">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-12">
          <Link href="/" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> Back to the map
          </Link>
          <span className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37]">WORLDEYE</span>
        </div>

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#ff8c5a] border border-[#ff8c5a]/30 rounded-full px-4 py-1.5 mb-6">
            <Activity className="w-3.5 h-3.5" /> LIVE SEISMIC DATA
          </p>
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
            Earthquakes <span className="text-[#ff8c5a]">as they happen.</span>
          </h1>
          <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
            A live earthquake map on a 3D globe. Every tremor plotted with its
            magnitude, depth and location — updated continuously, free for everyone.
          </p>
          <div className="mt-8">
            <Link
              href="/"
              className="inline-block px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              Open live map — free, no signup
            </Link>
          </div>
        </div>

        {/* What you can see */}
        <div className="mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            What you see for <span className="text-[#D4AF37]">every quake</span>
          </h2>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {DATA_POINTS.map((d) => (
              <div
                key={d.title}
                className="rounded-3xl border border-white/10 bg-white/[0.02] p-6"
              >
                <d.icon className="w-6 h-6 text-[#ff8c5a] mb-4" />
                <p className="font-semibold text-white/90 mb-2">{d.title}</p>
                <p className="text-sm text-white/45 leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            How it <span className="text-[#D4AF37]">works</span>
          </h2>
          <div className="space-y-4 text-white/60 leading-relaxed">
            <p>
              When the ground moves, seismometers around the world feel it within
              seconds. Public seismic monitoring networks detect the event,
              triangulate its location and estimate its magnitude — then publish
              that data openly.
            </p>
            <p>
              WorldEye pulls those public feeds and plots each earthquake on the
              3D globe the moment it arrives: a marker at the epicenter, sized by
              magnitude, with depth and timing attached. The map keeps refreshing
              while you watch, so an unfolding aftershock sequence plays out in
              front of you.
            </p>
            <p>
              It sits alongside the rest of the free map — live flights, 36,000+
              public cameras, satellites, wildfires and weather — so a quake never
              appears in isolation. See the full picture, not just a dot on a list.
            </p>
          </div>
        </div>

        {/* Reading the data */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            Reading the <span className="text-[#D4AF37]">data</span>
          </h2>
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8 space-y-5 text-white/60 leading-relaxed text-sm md:text-base">
            <div>
              <h3 className="font-semibold text-white/90 mb-1.5">Magnitude is logarithmic</h3>
              <p>
                Each whole number on the magnitude scale represents roughly 32 times more
                energy released than the one below it. A magnitude 6 is a serious regional
                event; a magnitude 7 releases about as much energy as the largest nuclear
                weapons ever tested. Most of the dots you will see on any given day are
                small — magnitude 2s and 3s that only instruments notice.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white/90 mb-1.5">Depth changes everything</h3>
              <p>
                A shallow magnitude 5 (under ~70 km deep) can rattle buildings and crack
                walls near the epicenter. The same magnitude at 300+ km depth may be felt
                as a gentle rolling hundreds of kilometers away — or not felt at all.
                Always read magnitude and depth together.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white/90 mb-1.5">Aftershocks follow a pattern</h3>
              <p>
                Big quakes are followed by aftershocks — smaller quakes that decay in
                frequency over days and weeks. Watching a sequence unfold on the map is
                one of the clearest ways to grasp how fault systems release stress.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white/90 mb-1.5">The Ring of Fire dominates</h3>
              <p>
                Roughly nine out of ten earthquakes happen around the Pacific Ring of
                Fire — Japan, Indonesia, the Andes, Alaska, New Zealand. If the map looks
                like it is always lit up there, that is not a bug: it is plate tectonics.
              </p>
            </div>
          </div>
          <p className="mt-6 text-sm text-white/40 leading-relaxed">
            Safety note: WorldEye shows you what is happening, but it is not an alert
            system. For warnings and official guidance during an event, follow your
            local geological agency and emergency services. See our{" "}
            <Link href="/use-cases/emergency-preparedness" className="text-[#D4AF37] hover:underline">
              emergency preparedness guide
            </Link>{" "}
            for how to use the map when it matters.
          </p>
        </div>

        {/* Use cases */}
        <div className="mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            Why people <span className="text-[#D4AF37]">watch</span>
          </h2>
          <div className="mt-8 grid md:grid-cols-3 gap-5">
            {USE_CASES.map((u) => (
              <div
                key={u.title}
                className="rounded-3xl border border-white/10 bg-white/[0.02] p-8"
              >
                <u.icon className="w-6 h-6 text-[#D4AF37] mb-4" />
                <p className="font-semibold text-white/90 text-lg mb-2">{u.title}</p>
                <p className="text-sm text-white/45 leading-relaxed">{u.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            Earthquake tracker <span className="text-[#D4AF37]">FAQ</span>
          </h2>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="border border-white/10 rounded-2xl bg-white/[0.02] overflow-hidden group"
              >
                <summary className="flex items-center justify-between gap-4 px-6 py-4 cursor-pointer list-none">
                  <span className="font-medium text-white/90">{f.q}</span>
                  <ChevronDown className="w-5 h-5 text-[#D4AF37] shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-6 pb-5 text-sm text-white/60 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Closing CTA */}
        <div className="mt-20 max-w-2xl mx-auto text-center rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent p-10">
          <h2 className="text-2xl md:text-3xl font-bold">
            See what&apos;s shaking <span className="text-[#D4AF37]">right now</span>
          </h2>
          <p className="text-white/55 mt-3 mb-8">
            Free forever. No account. Just the planet, live.
          </p>
          <Link
            href="/"
            className="inline-block px-8 py-4 rounded-2xl bg-[#D4AF37] text-black font-bold hover:brightness-110 transition"
          >
            Open the live earthquake map
          </Link>
          <p className="mt-6 text-sm text-white/40">
            Want the full intelligence toolkit?{" "}
            <Link href="/pricing" className="text-[#D4AF37] hover:underline">
              Explore WorldEye Pro
            </Link>
          </p>
        </div>

        <RelatedLinks
          links={[
            {
              label: "Wildfire tracker",
              desc: "Active fires and smoke — the other half of the natural-hazard picture.",
              href: "/wildfire-tracker",
            },
            {
              label: "Hurricane tracker",
              desc: "Storms and severe weather as they develop and make landfall.",
              href: "/hurricane-tracker",
            },
            {
              label: "Satellite tracker",
              desc: "Thousands of satellites overhead — the ISS, Starlink and more, live.",
              href: "/satellite-tracker",
            },
            {
              label: "Live cameras",
              desc: "36,000+ public cameras — see conditions on the ground near an event.",
              href: "/cameras",
            },
          ]}
        />
      </div>

      <SiteFooter />
    </main>
  );
}
