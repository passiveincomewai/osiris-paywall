import VoiceQA from "@/components/seo/VoiceQA";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import { mergePlaceFaqs } from "@/lib/place-answers";
import { getVoiceQuestionsByIds } from "@/lib/voice-questions";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Plane,
  Radar,
  Gauge,
  Navigation,
  Route,
  Users,
  ChevronDown,
  ArrowRight,
  Radio,
  Clock,
  ShieldCheck,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import BreadcrumbLd from "@/components/BreadcrumbLd";
import RelatedLinks from "@/components/RelatedLinks";
import TrackerClusterLinks from "@/components/TrackerClusterLinks";

export const metadata: Metadata = {
  title: "Watch Flights Live — Free Flight Tracker with Satellite View",
  description:
    "Watch flights live on a free 3D globe with satellite view: real-time position, altitude, speed, aircraft type and routes from live ADS-B data — plus satellites, ships and 74,229 public cameras on the same map. Free — no signup, no account, no cost.",
  alternates: { canonical: "/live-flight-tracker" },
  openGraph: {
    title: "Watch Flights Live — Free Flight Tracker with Satellite View | WorldEye",
    description:
      "Real-time flight tracking on a free 3D globe: position, altitude, speed, aircraft type and routes from live ADS-B data — plus satellites, ships and 74,229 public cameras on the same map. Free — no signup.",
    url: "/live-flight-tracker",
    type: "website",
  },
  keywords: [
    "live flight tracker",
    "flight radar",
    "track flights live",
    "airplane tracker",
    "real time flight tracking",
    "free flight tracker",
  ],
};

const WHAT_YOU_SEE = [
  {
    icon: Navigation,
    title: "Live position",
    body: "Every aircraft's current location, updated in real time as it moves across the globe.",
  },
  {
    icon: Gauge,
    title: "Altitude & speed",
    body: "Cruising altitude, ground speed and heading — the telemetry that tells the flight's story.",
  },
  {
    icon: Plane,
    title: "Aircraft type",
    body: "See what kind of plane it is, from wide-body airliners to regional jets and cargo haulers.",
  },
  {
    icon: Route,
    title: "Route & flight number",
    body: "Origin, destination and flight number, with the flown path drawn across the map.",
  },
];

const USE_CASES = [
  {
    icon: Users,
    title: "Aviation enthusiasts",
    body: "Follow interesting traffic, watch holding patterns over your city, and learn the rhythms of the sky above you.",
  },
  {
    icon: Clock,
    title: "Airport pickups",
    body: "Check whether an inbound flight is on time, circling, or delayed — before you leave for the airport.",
  },
  {
    icon: Radio,
    title: "Planespotters",
    body: "Pair the live map with your eyes (or a camera): know what's overhead before you hear it.",
  },
];

const FAQS = [
  {
    q: "Is the live flight tracker free?",
    a: "Yes — completely free, forever. The flight tracking layer is part of WorldEye's free map, alongside the 3D globe, satellites, weather, earthquakes and 74,229 public cameras. No account, no credit card, no trial countdown.",
  },
  {
    q: "Do I need an account to track flights?",
    a: "No. Open the map and the aircraft are already there. Accounts exist only for Pro subscribers and affiliates — never as a gate in front of the free map.",
  },
  {
    q: "How does live flight tracking work?",
    a: "Most aircraft broadcast their position, altitude and speed using ADS-B transponders. A global network of receivers picks up those broadcasts, and the aggregated data is plotted on the map in near real time. It's the same principle behind every flight radar service.",
  },
  {
    q: "How accurate is the tracking?",
    a: "Positions come from the aircraft's own broadcasts, so they're typically accurate to within seconds of real time. Coverage depends on receiver density — busy airspace is near-instant, remote oceanic regions may update less frequently.",
  },
  {
    q: "Can I track military or private jets?",
    a: "If an aircraft is broadcasting ADS-B and is within receiver coverage, it appears on the map — including many private jets. Some military and sensitive flights don't broadcast or are filtered at the source, so they won't show up. What you see is whatever the public data feeds carry.",
  },
  {
    q: "Why did a plane disappear mid-flight?",
    a: "Usually it left receiver coverage — over an ocean, a desert or a polar region, gaps between ground receivers are real, and an aircraft can drop off the public picture until it flies back into range. It can also mean the aircraft landed, its transponder stopped reporting, or the feed filtered it. A gap on the map is a gap in public data, not an event in the sky.",
  },
];

/* Canonical-dataset answers merged into this page's single FAQPage
   (src/lib/place-answers.ts merge rule); the visible VoiceQA block
   renders exactly the surviving entries. */
const VOICE_MERGED = mergePlaceFaqs(FAQS, getVoiceQuestionsByIds(["best-way-to-track-flights", "which-plane-is-flying-over-me", "follow-a-specific-flight", "what-is-ads-b"]));

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group border border-white/10 rounded-2xl bg-white/[0.02] overflow-hidden">
      <summary className="flex items-center justify-between gap-4 px-6 py-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span className="font-medium text-white/90">{q}</span>
        <ChevronDown className="w-5 h-5 text-[#D4AF37] shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <p className="px-6 pb-5 text-sm text-white/60 leading-relaxed">{a}</p>
    </details>
  );
}

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "WorldEye Live Flight Tracker",
      description:
        "Track flights live on a free 3D map with satellite view. This airplane tracker shows real-time position, altitude, speed, aircraft type and routes — no signup, no cost.",
      url: "https://worldeye.app/live-flight-tracker",
      isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
    },
    {
      "@type": "FAQPage",
      url: "https://worldeye.app/live-flight-tracker",
      mainEntity: VOICE_MERGED.merged.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function LiveFlightTrackerPage() {
  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100 relative overflow-x-clip">
      <JsonLd data={jsonLd} />
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-15 blur-[120px] bg-[#00E5FF]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[300px] rounded-full opacity-10 blur-[100px] bg-[#D4AF37]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-10 md:py-16">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-12">
          <Link href="/" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> Back to the map
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="WorldEye — back to the live globe" className="shrink-0 inline-flex items-center"><img src="/worldeye-header-logo.png" alt="WorldEye" width={1063} height={290} className="h-6 w-auto" /></Link>
            <LanguageHeaderControl variant="mobile" />
          </div>
        </div>

        <BreadcrumbLd trail={[{ label: "Live Flight Tracker" }]} />

        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto">
          <img
            src="/worldeye-eye.png"
            alt="WorldEye"
            width={600}
            height={432}
            className="h-14 md:h-16 w-auto mx-auto mb-6"
            style={{ filter: "drop-shadow(0 0 18px rgba(0,150,255,0.45))" }}
          />
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#00E5FF] border border-[#00E5FF]/30 rounded-full px-4 py-1.5 mb-6">
            <Radar className="w-3.5 h-3.5" /> FREE LIVE FLIGHT TRACKER
          </p>
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
            Track every flight, <span className="text-[#00E5FF]">live</span>.
          </h1>
          <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
            This airplane tracker plots aircraft in real time on a 3D globe —
            position, altitude, speed and routes. It&apos;s a flight radar that
            costs nothing and asks for nothing: no signup, no account, no paywall.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 active:scale-[0.99] transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              Open live tracker <ArrowRight className="w-5 h-5" />
            </Link>
            <span className="text-sm text-white/40">Free forever · No signup</span>
          </div>
        </div>

        {/* The one-map answer */}
        <div className="mt-16 md:mt-20 max-w-3xl mx-auto rounded-3xl border border-[#00E5FF]/25 bg-[#00E5FF]/[0.04] p-8 md:p-10">
          <h2 className="text-xl md:text-2xl font-bold">
            One live map for flights — and everything around them
          </h2>
          <p className="mt-3 text-white/60 leading-relaxed">
            WorldEye is a free flight tracker with satellite view:{" "}
            <Link href="/" className="text-[#00E5FF] hover:underline">
              watch flights live
            </Link>{" "}
            on a 3D globe, with real-time positions from live ADS-B data. The
            same map also carries{" "}
            <Link href="/satellite-tracker" className="text-[#00E5FF] hover:underline">
              live satellites
            </Link>
            ,{" "}
            <Link href="/ship-tracker" className="text-[#00E5FF] hover:underline">
              ships at sea
            </Link>{" "}
            and{" "}
            <Link href="/live-webcams" className="text-[#00E5FF] hover:underline">
              74,229 public cameras
            </Link>{" "}
            — flights, satellites, ships and cameras on one live map, all
            free, with no signup and no account. For the ground view of the
            same traffic,{" "}
            <Link href="/airport-webcams" className="text-[#00E5FF] hover:underline">
              airport webcams
            </Link>{" "}
            watch the ramps and runways, and{" "}
            <Link href="/live-plane-spotting" className="text-[#00E5FF] hover:underline">
              live plane spotting
            </Link>{" "}
            pairs those cameras with the flight layer itself.
          </p>
        </div>

        {/* How it works */}
        <div className="mt-20 md:mt-28 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            How live flight tracking works
          </h2>
          <div className="mt-8 space-y-4 text-white/60 leading-relaxed">
            <p>
              Modern aircraft constantly broadcast their identity, GPS position,
              altitude and speed using a system called{" "}
              <span className="text-white/90 font-medium">ADS-B</span> (Automatic
              Dependent Surveillance–Broadcast). It&apos;s a radio signal any
              receiver on the ground can pick up — no radar dish required.
            </p>
            <p>
              Thousands of volunteer and commercial receivers around the world
              listen for those broadcasts and share what they hear. WorldEye
              aggregates those public feeds and draws every aircraft onto the
              live 3D map, seconds after it broadcasts.
            </p>
            <p>
              That&apos;s the whole trick behind every service that lets you
              track flights live. The difference here: the map around it — the
              globe, the satellites, the weather, the cameras — is free too.
            </p>
          </div>
        </div>

        {/* How to use */}
        <div className="mt-20 md:mt-28 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            How to use the flight tracker
          </h2>
          <div className="mt-8 space-y-4 text-white/60 leading-relaxed">
            <p>
              <strong className="text-white/90">1. Open the map.</strong> The
              flight layer is part of the free globe — aircraft are drawn as
              soon as the map loads, denser over busy airspace, thinner over
              oceans. Zoom toward any region and individual flights resolve
              out of the flow.
            </p>
            <p>
              <strong className="text-white/90">2. Click an aircraft.</strong>{" "}
              Selecting a plane shows what the public feed carries for it:
              flight number or callsign, aircraft type, altitude, ground
              speed, heading, and its origin and destination where the feed
              provides them — with the flown path drawn across the map.
            </p>
            <p>
              <strong className="text-white/90">3. Search instead of hunting.</strong>{" "}
              Basic search is free: type a place or an airport and fly
              straight to its airspace to see what is arriving, departing and
              holding overhead. Pro adds advanced search filters for digging
              through the full data set.
            </p>
            <p>
              <strong className="text-white/90">4. Put the flight in context.</strong>{" "}
              This is where a globe beats a list: the same screen carries the
              weather systems the flight is crossing, the live cameras at its
              destination, and the satellites passing above it. One view, no
              tab-switching.
            </p>
          </div>
        </div>

        {/* What you can see */}
        <div className="mt-20 md:mt-28">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            What you can see on the tracker
          </h2>
          <div className="mt-8 grid sm:grid-cols-2 gap-5">
            {WHAT_YOU_SEE.map((f) => (
              <div
                key={f.title}
                className="rounded-3xl border border-white/10 bg-white/[0.02] p-7"
              >
                <f.icon className="w-7 h-7 text-[#00E5FF]" />
                <h3 className="mt-4 font-semibold text-white/90 text-lg">{f.title}</h3>
                <p className="mt-2 text-sm text-white/50 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Use cases */}
        <div className="mt-20 md:mt-28">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            Who uses a live flight tracker
          </h2>
          <div className="mt-8 grid md:grid-cols-3 gap-5">
            {USE_CASES.map((u) => (
              <div
                key={u.title}
                className="rounded-3xl border border-white/10 bg-white/[0.02] p-7"
              >
                <u.icon className="w-7 h-7 text-[#D4AF37]" />
                <h3 className="mt-4 font-semibold text-white/90 text-lg">{u.title}</h3>
                <p className="mt-2 text-sm text-white/50 leading-relaxed">{u.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Reading a flight + limitations */}
        <div className="mt-20 md:mt-28 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            Reading a flight like a controller
          </h2>
          <div className="mt-8 space-y-4 text-white/60 leading-relaxed">
            <p>
              <strong className="text-white/90">Altitude</strong> is reported
              in feet above sea level; airliners cruise roughly between
              30,000 and 42,000 feet. A steady altitude with a falling ground
              speed usually means descent has begun.{" "}
              <strong className="text-white/90">Ground speed</strong> is
              speed over the ground, not through the air — a strong jet stream
              can push an eastbound airliner past 1,000 km/h over the ground
              while its airspeed stays ordinary.{" "}
              <strong className="text-white/90">Heading</strong> is where the
              nose points; the drawn path is where it has actually been, and
              in crosswinds the two differ slightly.
            </p>
            <p>
              Patterns tell stories: a neat racetrack shape is a holding
              pattern (weather or congestion at the destination), a sudden
              descent to a nearby airport is a diversion, and a long straight
              line at an odd hour is usually a cargo flight — the night sky
              belongs to freight. And the honest limits: coverage follows
              receiver density, some flights are filtered or delayed at the
              source, and positions over remote oceans can be minutes apart.
              The tracker shows the public picture of the sky, which is
              remarkably complete — but it is not a navigation or safety
              tool, and pilots and controllers work from regulated feeds, not
              this map.
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20 md:mt-28 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            Flight tracker FAQ
          </h2>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <Faq key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </div>

        {/* Questions the map answers */}
        <div className="mt-20 md:mt-28 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            Questions the map answers in seconds
          </h2>
          <div className="mt-8 space-y-4 text-white/60 leading-relaxed">
            <p>
              <strong className="text-white/90">“What is that plane overhead?”</strong>{" "}
              Point the globe at your neighborhood, tap the aircraft passing
              above you, and read its flight number, type and route — the
              five-second version of planespotting, from your couch.
            </p>
            <p>
              <strong className="text-white/90">“Is the flight I&apos;m meeting on time?”</strong>{" "}
              Find it by route, look at where it actually is and whether it is
              holding or descending. The map shows the aircraft&apos;s live
              position — for gate times and official status, the airline&apos;s
              own updates remain the source of truth.
            </p>
            <p>
              <strong className="text-white/90">“What does the sky over a big event look like?”</strong>{" "}
              Fly to any city on a headline day and watch the traffic react in
              real time: diversions around storms, holds stacking up over a
              hub, the cargo fleet rolling out at night. News tells you what
              happened; the tracker lets you watch it happen.
            </p>
          </div>
        </div>

        {/* Pro upgrade strip */}
        <div className="mt-20 rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent p-8 md:p-10 text-center">
          <p className="text-xs font-bold tracking-[0.25em] text-[#D4AF37] mb-3">WANT MORE THAN TRACKING?</p>
          <h2 className="text-2xl md:text-3xl font-bold">
            Pro adds an AI analyst that works the map for you
          </h2>
          <p className="text-white/55 mt-3 max-w-2xl mx-auto">
            The flight tracker is free forever.{" "}
            <Link href="/pricing" className="text-[#D4AF37] hover:underline">
              WorldEye Pro
            </Link>{" "}
            adds the OI AI assistant, live traffic,
            advanced search filters and premium intel feeds — from $7.99/week.
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 mt-6 px-7 py-3 rounded-2xl bg-[#D4AF37] text-black font-bold hover:brightness-110 transition"
          >
            See Pro plans <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Related */}
        {VOICE_MERGED.surviving.length > 0 && (
          <VoiceQA entries={VOICE_MERGED.surviving} />
        )}

        <RelatedLinks
          links={[
            {
              label: "Satellite tracker",
              desc: "Thousands of satellites overhead — the ISS, Starlink and more, live.",
              href: "/satellite-tracker",
            },
            {
              label: "Earthquake tracker",
              desc: "Quakes as they happen — magnitude, depth and location on the live map.",
              href: "/earthquake-tracker",
            },
            {
              label: "Live cameras",
              desc: "74,229 public cameras — watch the streets below the flight paths.",
              href: "/cameras",
            },
            {
              label: "All features",
              desc: "Everything WorldEye can do — free forever layers and Pro tools.",
              href: "/features",
            },
            {
              label: "Live plane spotting",
              desc: "Airport cameras matched to the live flight layer — watch arrivals and departures on approach.",
              href: "/live-plane-spotting",
            },
            {
              label: "Ship tracker",
              desc: "Live vessel traffic on the same globe — ports, shipping lanes and the open ocean.",
              href: "/ship-tracker",
            },
          ]}
        />

        <TrackerClusterLinks current="/live-flight-tracker" />

        {/* Trust */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-white/35">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#D4AF37]/70" /> Free forever
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#D4AF37]/70" /> No signup required
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#D4AF37]/70" /> Public ADS-B data
          </span>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
