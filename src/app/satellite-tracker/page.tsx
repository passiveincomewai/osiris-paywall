import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Satellite,
  Orbit,
  Globe2,
  Telescope,
  GraduationCap,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Layers,
  Zap,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import RelatedLinks from "@/components/RelatedLinks";

export const metadata: Metadata = {
  title: "Live Satellite Tracker — ISS, Starlink & More",
  description:
    "Watch satellites live on a 3D globe — the ISS, Starlink and thousands more with real orbit paths. A free live satellite map: no signup, no account, no cost.",
  alternates: { canonical: "/satellite-tracker" },
  openGraph: {
    title: "Live Satellite Tracker — ISS, Starlink & More | WorldEye",
    description:
      "Free live satellite map: track the ISS, Starlink and thousands of satellites with real orbit paths. No signup.",
    url: "/satellite-tracker",
    type: "website",
  },
  keywords: [
    "satellite tracker",
    "live satellite map",
    "ISS tracker",
    "orbit tracker",
    "track satellites live",
    "starlink tracker",
  ],
};

const WHAT_YOU_SEE = [
  {
    icon: MapPin,
    title: "Live positions",
    body: "Every tracked satellite's current location above the Earth, updated continuously as it orbits.",
  },
  {
    icon: Orbit,
    title: "Orbit paths",
    body: "See the full orbital track — where each satellite has been and where it's headed next.",
  },
  {
    icon: Layers,
    title: "Categories",
    body: "Space stations, Starlink, weather satellites, navigation (GPS), science missions and more — filter by type.",
  },
  {
    icon: Satellite,
    title: "The ISS, live",
    body: "Follow the International Space Station as it circles the planet roughly every 90 minutes.",
  },
];

const USE_CASES = [
  {
    icon: Telescope,
    title: "Space enthusiasts",
    body: "Watch constellations grow in real time, follow launches to orbit, and keep tabs on notable objects overhead.",
  },
  {
    icon: Zap,
    title: "ISS spotting",
    body: "Know exactly when the space station passes over your location — then step outside and wave at it.",
  },
  {
    icon: GraduationCap,
    title: "Students & educators",
    body: "Orbital mechanics stops being abstract when you can watch thousands of objects obey it live on a globe.",
  },
];

const FAQS = [
  {
    q: "Is the satellite tracker free?",
    a: "Yes — completely free, forever. Satellite tracking is part of WorldEye's free map, alongside live flights, 74,229 public cameras, weather, earthquakes and wildfires. No account, no credit card.",
  },
  {
    q: "How does satellite tracking work?",
    a: "Satellites follow predictable orbits described by public orbital data (called two-line elements, published by sources like CelesTrak). WorldEye takes that data, computes each satellite's current position with standard orbital math, and draws it on the 3D globe — so what you see is the satellite's calculated live position, refreshed continuously.",
  },
  {
    q: "How accurate are the positions?",
    a: "Very good for most purposes — typically within a few kilometers for well-tracked objects. Orbital data is refreshed regularly, but satellites do drift between updates, and maneuvers (like ISS reboosts) can briefly put a satellite off its predicted path until new data arrives.",
  },
  {
    q: "Can I track the ISS?",
    a: "Yes. The International Space Station is one of the most-tracked objects on the map — you'll see it moving live with its orbit path drawn out ahead of it. It's the brightest and easiest satellite to spot from the ground, too.",
  },
  {
    q: "What satellites are tracked?",
    a: "Thousands — the ISS and other stations, the Starlink constellation, weather satellites, GPS and navigation satellites, science missions, rocket bodies and notable debris. Coverage follows whatever the public catalogs publish.",
  },
];

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
      name: "WorldEye Live Satellite Tracker",
      description:
        "Watch satellites live on a 3D globe. This satellite tracker shows the ISS, Starlink and thousands more with real orbit paths — a free live satellite map, no signup.",
      url: "https://worldeye.app/satellite-tracker",
      isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
    },
    {
      "@type": "FAQPage",
      url: "https://worldeye.app/satellite-tracker",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function SatelliteTrackerPage() {
  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100 relative overflow-x-clip">
      <JsonLd data={jsonLd} />
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-15 blur-[120px] bg-[#00E5FF]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[300px] rounded-full opacity-10 blur-[100px] bg-[#D4AF37]" />
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
            <Satellite className="w-3.5 h-3.5" /> FREE LIVE SATELLITE MAP
          </p>
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
            Watch every satellite, <span className="text-[#00E5FF]">live</span>.
          </h1>
          <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
            This orbit tracker draws thousands of satellites on a 3D globe in
            real time — the ISS, Starlink, weather and GPS satellites — with
            their full orbit paths. Free, no signup, no paywall.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 active:scale-[0.99] transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              Open satellite map <ArrowRight className="w-5 h-5" />
            </Link>
            <span className="text-sm text-white/40">Free forever · No signup</span>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-20 md:mt-28 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            How satellite tracking works
          </h2>
          <div className="mt-8 space-y-4 text-white/60 leading-relaxed">
            <p>
              Unlike airplanes, satellites don&apos;t broadcast their position
              for receivers to hear. Instead, their orbits are described by
              public data files called{" "}
              <span className="text-white/90 font-medium">
                two-line elements (TLEs)
              </span>
              , published by sources like CelesTrak and updated regularly.
            </p>
            <p>
              A TLE is a compact mathematical description of an orbit. Feed it
              plus the current time into standard orbital mechanics, and you get
              the satellite&apos;s position — latitude, longitude and altitude —
              at this exact second. Do that continuously for thousands of
              objects and you have a live satellite map.
            </p>
            <p>
              WorldEye runs that computation for the full public catalog and
              renders every satellite on the 3D globe, with orbit paths so you
              can see where each one is headed. It&apos;s the same data
              professional trackers use — just wrapped in a map anyone can open.
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
            Who uses a satellite tracker
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
          <p className="mt-8 text-center text-white/40 text-sm max-w-2xl mx-auto flex items-start justify-center gap-2">
            <Globe2 className="w-4 h-4 mt-0.5 shrink-0 text-[#00E5FF]/70" />
            Tip: pair the tracker with the live flight layer — aircraft below,
            satellites above, one globe.
          </p>
        </div>

        {/* FAQ */}
        <div className="mt-20 md:mt-28 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            Satellite tracker FAQ
          </h2>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <Faq key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </div>

        {/* Pro upgrade strip */}
        <div className="mt-20 rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent p-8 md:p-10 text-center">
          <p className="text-xs font-bold tracking-[0.25em] text-[#D4AF37] mb-3">WANT DEEPER INTELLIGENCE?</p>
          <h2 className="text-2xl md:text-3xl font-bold">
            Pro adds an AI analyst that works the map for you
          </h2>
          <p className="text-white/55 mt-3 max-w-2xl mx-auto">
            Satellite tracking is free forever.{" "}
            <Link href="/pricing" className="text-[#D4AF37] hover:underline">
              WorldEye Pro
            </Link>{" "}
            adds the OI AI assistant (on your own API key), satellite imagery,
            advanced search filters and premium intel feeds — from $3.99/week.
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 mt-6 px-7 py-3 rounded-2xl bg-[#D4AF37] text-black font-bold hover:brightness-110 transition"
          >
            See Pro plans <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Related */}
        <RelatedLinks
          links={[
            {
              label: "Flight tracker",
              desc: "Live aircraft below the satellites — real-time positions on the free globe.",
              href: "/live-flight-tracker",
            },
            {
              label: "Earthquake tracker",
              desc: "Quakes as they happen — magnitude, depth and location on the live map.",
              href: "/earthquake-tracker",
            },
            {
              label: "Live cameras",
              desc: "74,229 public cameras — the ground view to pair with the orbital one.",
              href: "/cameras",
            },
            {
              label: "Use cases",
              desc: "Who uses WorldEye — researchers, educators, storm watchers and more.",
              href: "/use-cases",
            },
          ]}
        />

        {/* Trust */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-white/35">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#D4AF37]/70" /> Free forever
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#D4AF37]/70" /> No signup required
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#D4AF37]/70" /> Public orbital data
          </span>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
