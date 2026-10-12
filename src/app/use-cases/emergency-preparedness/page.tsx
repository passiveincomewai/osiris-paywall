import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  Flame,
  Globe,
  LifeBuoy,
  Megaphone,
  Waves,
  Activity,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import RelatedLinks from "@/components/RelatedLinks";

export const metadata: Metadata = {
  title: "WorldEye for Emergency Preparedness — Wildfires, Hurricanes, Quakes",
  description:
    "Use WorldEye to watch wildfires, hurricanes and earthquakes unfold via live cameras and alerts — a complement to NOAA and official emergency alerts.",
  alternates: { canonical: "/use-cases/emergency-preparedness" },
  openGraph: {
    title: "WorldEye for Emergency Preparedness",
    description:
      "Watch wildfires, hurricanes and earthquakes unfold live — a visual complement to official emergency alerts.",
    type: "website",
    url: "/use-cases/emergency-preparedness",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "WorldEye for Emergency Preparedness",
  description:
    "How to use WorldEye's live cameras, wildfire, hurricane and earthquake layers for emergency awareness and household preparedness.",
  url: "https://worldeye.app/use-cases/emergency-preparedness",
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const FAQS = [
  {
    q: "Is WorldEye an official emergency alert system?",
    a: "No. WorldEye is an awareness tool, not an alerting authority. Official warnings come from NOAA, the National Weather Service, and your local emergency management — those are the sources that decide when to evacuate or shelter. Use WorldEye to see what's happening, not to decide whether you're safe.",
  },
  {
    q: "Can I watch an active wildfire on WorldEye?",
    a: "Often, yes. The wildfire layer plots active fires, and nearby public cameras can show smoke columns, glow at night, and wind direction — which helps you understand what's near your area. But smoke can hide flames and cameras can go dark in a fire zone, so treat feeds as situational awareness, not a perimeter map.",
  },
  {
    q: "Should I evacuate based on a camera feed?",
    a: "Never base an evacuation decision on a camera feed alone. Evacuate when officials order it, and leave early when conditions look like they're turning. A camera can lag, freeze, or point the wrong way at exactly the wrong moment — official orders are built for that uncertainty.",
  },
  {
    q: "Can WorldEye help me prepare before a disaster?",
    a: "Yes — that's its best role in emergencies. Before fire season or hurricane season, use the map to learn your area: which routes out of town have camera coverage, where the nearest high ground is, what your street looks like under heavy rain. Preparedness is built in calm weather.",
  },
  {
    q: "Is WorldEye free to use during emergencies?",
    a: "Yes. The entire map — cameras, weather, earthquakes, wildfires, flight tracking — is free for everyone, forever, with no account. There is no emergency paywall and never will be.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

const SECTIONS = [
  {
    icon: Flame,
    title: "Wildfires: see the smoke before the news does",
    body: "The wildfire layer plots active fires while nearby public cameras show smoke columns, wind direction and visibility in real time. During fire season, check the cameras around your community each morning — a smoke plume on the horizon an hour before the news mentions it is the difference between calm preparation and panic.",
  },
  {
    icon: Waves,
    title: "Hurricanes & storms: watch the coast",
    body: "Track storm systems on the weather layer, then switch to coastal and city cameras as landfall approaches: rising water at the marina, wind-bent palms on the beach cam, empty streets under curfew. Seeing conditions directly helps you judge reports — and judge when it's too late to be on the roads.",
  },
  {
    icon: Activity,
    title: "Earthquakes: the shaking, then the aftermath",
    body: "The live earthquake feed plots magnitude and location within minutes of an event. Cameras near the epicenter show what's actually happening on the ground — traffic still moving, buildings standing, streets emptying. In a major event, check cameras along your family's routes home before assuming they're passable.",
  },
  {
    icon: Camera,
    title: "Evacuation routes: check road conditions",
    body: "Traffic cameras are the most practical preparedness tool in the directory. Know which feeds cover your evacuation routes now — highway interchanges, bridges, mountain passes — so that when the order comes, you can see congestion, closures and weather on the road instead of guessing.",
  },
];

export default function EmergencyPreparednessPage() {
  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100 relative overflow-x-clip">
      <JsonLd data={jsonLd} />
      <JsonLd data={faqJsonLd} />
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-20 blur-[120px] bg-[#D4AF37]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[300px] rounded-full opacity-10 blur-[100px] bg-[#00E5FF]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-10 md:py-16">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-12">
          <Link href="/use-cases" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> All use cases
          </Link>
          <span className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37]">WORLDEYE</span>
        </div>

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
            <LifeBuoy className="w-3.5 h-3.5" /> EMERGENCY PREPAREDNESS
          </p>
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
            See the disaster <span className="text-[#D4AF37]">before it reaches you.</span>
          </h1>
          <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
            Wildfires, hurricanes, earthquakes, floods — WorldEye&apos;s live cameras
            and hazard layers let you watch emergencies unfold in real time. It&apos;s a
            powerful complement to official alerts, built for people who prepare.
          </p>
        </div>

        {/* Disclaimer */}
        <div className="mt-10 max-w-3xl mx-auto rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/[0.06] p-6 flex gap-4 items-start">
          <Megaphone className="w-6 h-6 text-[#D4AF37] shrink-0 mt-0.5" />
          <p className="text-sm text-white/70 leading-relaxed">
            <span className="font-bold text-white/90">Official alerts are authoritative.</span>{" "}
            NOAA, the National Weather Service and your local emergency management
            decide when to evacuate, shelter or stand down — not a camera feed.
            WorldEye is a visual complement to those alerts: use it to understand
            what&apos;s happening, never as your only source for what to do.
          </p>
        </div>

        {/* Sections */}
        <div className="mt-14 md:mt-16 grid sm:grid-cols-2 gap-5">
          {SECTIONS.map((s) => (
            <div
              key={s.title}
              className="rounded-3xl border border-white/10 bg-white/[0.02] p-7"
            >
              <s.icon className="w-7 h-7 text-[#D4AF37] mb-4" />
              <h2 className="font-semibold text-white/90 text-lg">{s.title}</h2>
              <p className="text-sm text-white/50 mt-2 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        {/* Preparedness checklist */}
        <section className="mt-16 md:mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold">Build your WorldEye readiness routine</h2>
          <p className="text-white/55 mt-3 leading-relaxed">
            The best emergency use of WorldEye happens in calm weather. Set this up
            once, and it&apos;s ready when you need it:
          </p>
          <ol className="mt-6 space-y-3">
            {[
              "Find the traffic cameras on your two evacuation routes and bookmark the map zoomed to them.",
              "Learn where the nearest wildfire cameras point — smoke on those feeds is your early signal.",
              "Check the earthquake layer monthly so you know what 'normal' looks like in your region.",
              "Save your local emergency management's alert signup page — WorldEye shows you the world, alerts tell you what to do.",
              "Walk the family through the map once: kids who've seen the evacuation route on a camera recognize it under stress.",
            ].map((step, i) => (
              <li key={i} className="flex gap-4 items-start rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <span className="w-7 h-7 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] font-bold text-sm flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="text-white/70 text-sm pt-1">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* FAQs */}
        <section className="mt-16 md:mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold">Preparedness FAQs</h2>
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
        </section>

        {/* CTA */}
        <section className="mt-16 md:mt-20">
          <div className="rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold">Prepare while the sky is clear.</h2>
            <p className="text-white/55 mt-3 max-w-xl mx-auto">
              Open the globe — free, no signup — and learn your area before you need it.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl border border-white/20 text-white font-semibold hover:bg-white/5 transition"
              >
                <Globe className="w-4 h-4" /> Open the live map
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#D4AF37] text-black font-bold hover:brightness-110 transition"
              >
                Upgrade to Pro <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        <RelatedLinks
          links={[
            {
              label: "Earthquake tracker",
              desc: "Live seismic activity worldwide — the first layer to check when the ground moves.",
              href: "/earthquake-tracker",
            },
            {
              label: "All use cases",
              desc: "What researchers, travelers, storm watchers and educators do with WorldEye.",
              href: "/use-cases",
            },
            {
              label: "Cameras",
              desc: "40,000+ live public webcams — check your evacuation routes and neighborhood right now.",
              href: "/cameras",
            },
            {
              label: "FAQ",
              desc: "Is the map free? What does Pro include? Straight answers to common questions.",
              href: "/faq",
            },
          ]}
        />
      </div>

      <SiteFooter />
    </main>
  );
}
