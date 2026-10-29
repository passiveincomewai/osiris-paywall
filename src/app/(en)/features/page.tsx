import type { Metadata } from "next";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import Link from "next/link";
import {
  ArrowLeft,
  BrainCircuit,
  Bus,
  Camera,
  Car,
  Check,
  Clapperboard,
  CloudLightning,
  Globe,
  Images,
  Layers,
  Plane,
  Radio,
  Rocket,
  Satellite,
  Search,
  ShieldCheck,
  Sparkles,
  Video,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import RelatedLinks from "@/components/RelatedLinks";

export const metadata: Metadata = {
  title: "Features: Live 3D Globe, 74,229 Cameras, Flight Tracking & OSINT Tools",
  description:
    "Every WorldEye feature, compared: the free live 3D globe — flights, ships, satellites, transit, hazards and 74,229 public cameras — against what Pro adds: the OI AI assistant, satellite imagery, live traffic and the OSINT toolkit. Feature by feature, free vs Pro.",
  alternates: { canonical: "/features" },
  openGraph: {
    title: "Features: Live 3D Globe, 74,229 Cameras, Flight Tracking & OSINT Tools | WorldEye",
    description:
      "Every WorldEye feature, compared: the free live 3D globe — flights, ships, satellites, transit, hazards and 74,229 public cameras — against what Pro adds: the OI AI assistant, satellite imagery, live traffic and the OSINT toolkit.",
    url: "/features",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "WorldEye Features",
  description:
    "Everything WorldEye can do: a free forever live 3D globe with flight tracking, 74,229 public cameras, satellites and natural hazards — plus Pro intelligence tools.",
  url: "https://worldeye.app/features",
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is WorldEye really free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. The live 3D globe — flights, satellites, weather, earthquakes, wildfires and tens of thousands of public cameras — is free forever with no signup and no credit card. Pro is an optional upgrade that funds the infrastructure.",
      },
    },
    {
      "@type": "Question",
      name: "What does WorldEye Pro add?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Pro adds the OI AI assistant (which runs on your own API key), high-resolution satellite imagery view, the live traffic layer, advanced search filters, an in-browser OSINT toolkit (Nmap-style scans, DNS/WHOIS, SSL analysis), the camera recording studio with timelapse, and premium intel feeds covering cyber threats, GDELT events, maritime tracking, conflict zones and live news. Weekly is $7.99, monthly $13.99, annual $74.99.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need an account to use the map?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. The map works with no account at all. Accounts exist only for Pro subscribers (to manage billing) and affiliates — never as a gate in front of the free globe.",
      },
    },
    {
      "@type": "Question",
      name: "Where does WorldEye's data come from?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "From public sources: aircraft ADS-B broadcasts, satellite orbital data, public webcam networks, ship AIS transponders, and open earthquake, weather and wildfire feeds. WorldEye collects and visualizes public data — it does not hack, intercept, or buy private data.",
      },
    },
    {
      "@type": "Question",
      name: "Can I cancel Pro anytime?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Subscriptions are billed through Stripe and can be cancelled in one click from your account. You keep Pro access until the end of the billing period.",
      },
    },
  ],
};

const FREE_FEATURES = [
  {
    icon: Globe,
    title: "Interactive 3D globe",
    desc: "The full interactive map — no account, no signup. Spin it, zoom it, make it yours.",
    detail:
      "Built on open-source mapping technology with a dark basemap designed for data. Keyboard shortcuts keep you fast: R resets to the global view, L opens the layer panel, and ? shows every shortcut. It runs in any modern browser — nothing to install.",
  },
  {
    icon: Plane,
    title: "Live flight tracking",
    desc: "Real-time aircraft positions and telemetry, rendered live on the globe.",
    detail:
      "Aircraft broadcast their position, altitude, speed and callsign over ADS-B, and WorldEye plots them as they fly. Click any plane for its details, follow it with chase, forward and orbit camera views, and pull up the public cameras near the aircraft. Helicopters get their own icon, so rotorcraft stand out from fixed-wing traffic.",
  },
  {
    icon: Camera,
    title: "74,229 public cameras",
    desc: "Worldwide public street cameras, free for everyone. See streets as they are right now.",
    detail:
      "The directory indexes 74,229 public cameras across 105 countries — highway DOT feeds, city intersections, beaches, ski resorts and landmarks. Open any feed free, and share it with a direct link that lands the next person on the exact same camera. Pro members get unlimited camera access for deep research sessions.",
  },
  {
    icon: Satellite,
    title: "Satellite & space tracking",
    desc: "Orbital tracking, passes and space situational awareness overhead.",
    detail:
      "Thousands of tracked objects orbit overhead right now. Follow the International Space Station live, watch satellite constellations sweep across the sky map, and see upcoming visible passes for your location.",
  },
  {
    icon: CloudLightning,
    title: "Earthquakes, wildfires & weather",
    desc: "Natural hazards as they happen — quakes, fires and severe weather layers.",
    detail:
      "Seismic events plot within minutes of detection. Wildfire perimeters show where fires are burning, backed by 1,285 ALERT wildfire cameras (the ALERTWest network) streaming live stills. Hurricane tracks and forecast cones, NOAA radar and lightning, and USGS river gauges complete the picture — one globe, every hazard, as it happens.",
  },
  {
    icon: Bus,
    title: "Live transit — buses & trains",
    desc: "Real-time buses and trains from 15 transit agencies, moving on the globe.",
    detail:
      "Live vehicle positions stream in from 15 agencies — including Utah's UTA, Boston's MBTA, Denver's RTD and Seattle's King County Metro. Vehicles glide between their real GPS fixes, and clicking one shows its route, direction, next stop, delay and exactly how old its position is. Vehicles with stale positions fade instead of pretending to be live.",
  },
  {
    icon: Images,
    title: "Street-level photos",
    desc: "Community street-level photography from Panoramax, right on the map.",
    detail:
      "Zoom to street level and open real photos taken at ground level — dated, credited community imagery from Panoramax (CC BY-SA). They are photographs, not live feeds, and the viewer says so plainly, with the capture date on every frame.",
  },
  {
    icon: Rocket,
    title: "Space missions & launches",
    desc: "Upcoming launches with live countdowns, and reconstructed mission replays.",
    detail:
      "Follow upcoming launches from Space Launch Complex 40 to Baikonur with live-ticking countdowns, and replay past missions — replays are labeled as reconstructed estimates, never dressed up as live telemetry.",
  },
  {
    icon: Sparkles,
    title: "Sensor effects",
    desc: "Simulated sensor looks for the globe — a free creative tool.",
    detail:
      "Night vision, thermal false-colour, monochrome and more simulated looks applied to the map only, always labeled as simulated visual effects — never sensor data.",
  },
];

const PRO_FEATURES = [
  {
    icon: BrainCircuit,
    title: "OI AI assistant",
    desc: "Talk to the map. Forecasts, analysis and recon powered by your own API key — OpenAI, Anthropic, Google or OpenRouter. Your key stays in your browser.",
    detail:
      "Ask questions in plain language — 'which flights are holding over Chicago?', 'summarize quake activity this week' — and OI works the globe for you. Because it runs on your key, your queries and data never pass through our servers.",
  },
  {
    icon: Layers,
    title: "Satellite imagery view",
    desc: "High-resolution satellite imagery alongside the dark intel map.",
    detail:
      "Swap the dark basemap for true-color satellite imagery and inspect any location from above — coastlines, infrastructure, terrain. Essential context when a camera or news event needs ground truth.",
  },
  {
    icon: Search,
    title: "Advanced search filters",
    desc: "Basic search is free for everyone — Pro adds the deep filters on top.",
    detail:
      "Anyone can search the planet — places and cameras alike — and fly to a result in one keystroke. Pro filters go further: narrow the camera results by country and type, keep only cameras carrying a live feed, and cut straight to the exact feed you need.",
  },
  {
    icon: Car,
    title: "Live traffic layer",
    desc: "Real road congestion from TomTom, drawn onto the globe's roads.",
    detail:
      "Live traffic-flow data from TomTom colors the roads — green flowing, red stopped — so the jam you can see from the traffic cameras is visible on the map itself. The vehicle dots that illustrate the flow are simulated and labeled as such in the app; the congestion data underneath them is real.",
  },
  {
    icon: Video,
    title: "Camera Recording Studio & timelapse",
    desc: "Record real clips and build timelapses from live cameras, in your browser.",
    detail:
      "Save your cameras, record real clips while you watch, and capture a timelapse one frame at a time from snapshot cameras — every new still, in order, playable and exportable as a video file. Captures happen while you watch and are saved on your device; nothing is recorded in the cloud.",
  },
  {
    icon: ShieldCheck,
    title: "OSINT toolkit",
    desc: "Nmap scans, DNS/WHOIS, SSL analysis and threat intel — right in your browser.",
    detail:
      "A working open-source-intelligence bench inside the map: probe a host, trace a domain's infrastructure, inspect certificates, and pivot from a location to its digital footprint without leaving the globe.",
  },
  {
    icon: Radio,
    title: "Premium intel feeds",
    desc: "Cyber threats, GDELT events, maritime tracking, conflict zones and live news.",
    detail:
      "Beyond the free layers: curated feeds for cyber threat activity, the GDELT global event database, enhanced maritime intelligence, conflict monitoring and live news wires — fused onto the same globe.",
  },
  {
    icon: Sparkles,
    title: "Every future layer",
    desc: "New premium feeds land in Pro first, at no extra cost.",
    detail:
      "The platform keeps growing — new data layers, new tools, new feeds. Pro members get all of it the moment it ships, locked into the price they signed up at.",
  },
];

const TRACKERS = [
  { label: "Live flight tracker", desc: "Aircraft positions, altitude, speed and routes.", href: "/live-flight-tracker" },
  { label: "Ship tracker", desc: "Vessels at sea over AIS — ports and open ocean.", href: "/ship-tracker" },
  { label: "Satellite tracker", desc: "Orbital tracking and ISS passes overhead.", href: "/satellite-tracker" },
  { label: "Space station tracker", desc: "Follow the ISS live around the planet.", href: "/space-station-tracker" },
  { label: "Earthquake tracker", desc: "Seismic events as they are detected.", href: "/earthquake-tracker" },
  { label: "Wildfire tracker", desc: "Active fires, perimeters and smoke.", href: "/wildfire-tracker" },
  { label: "Hurricane tracker", desc: "Storms, tracks and severe weather.", href: "/hurricane-tracker" },
  { label: "Weather tracker", desc: "Live weather systems on the globe.", href: "/weather-tracker" },
];

const FAQS = [
  {
    q: "Is WorldEye really free?",
    a: "Yes. The live 3D globe — flights, satellites, weather, earthquakes, wildfires and tens of thousands of public cameras — is free forever with no signup and no credit card. Pro is an optional upgrade that funds the infrastructure.",
  },
  {
    q: "What does WorldEye Pro add?",
    a: "Pro adds the OI AI assistant (running on your own API key), high-resolution satellite imagery view, the live traffic layer, advanced search filters, an in-browser OSINT toolkit, and the camera recording studio. VIP Pro — the yearly plan — adds camera timelapse and premium intel feeds covering cyber threats, GDELT events, maritime tracking, conflict zones and live news. Weekly $7.99 · Monthly $13.99 · VIP Pro $74.99.",
  },
  {
    q: "Do I need an account to use the map?",
    a: "No. The map works with no account at all. Accounts exist only for Pro subscribers and affiliates — never as a toll gate in front of the free globe.",
  },
  {
    q: "Where does WorldEye's data come from?",
    a: "From public sources: aircraft ADS-B broadcasts, ship AIS transponders, satellite orbital data, public webcam networks, and open earthquake, weather and wildfire feeds. WorldEye collects and visualizes public data — it doesn't hack, intercept, or buy private data.",
  },
  {
    q: "Can I cancel Pro anytime?",
    a: "Yes. Billing runs through Stripe and you can cancel in one click from your account. You keep Pro access until the end of the current billing period.",
  },
];

export default function FeaturesPage() {
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
          <Link href="/" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> Back to the map
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="WorldEye — back to the live globe" className="shrink-0 inline-flex items-center"><img src="/worldeye-header-logo.png" alt="WorldEye" width={1063} height={290} className="h-6 w-auto" /></Link>
            <LanguageHeaderControl variant="mobile" />
          </div>
        </div>

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#00E5FF] border border-[#00E5FF]/30 rounded-full px-4 py-1.5 mb-6">
            <Sparkles className="w-3.5 h-3.5" /> FEATURES
          </p>
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
            Everything the planet is doing, <span className="text-[#D4AF37]">live</span>.
          </h1>
          <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
            A free forever live globe with flights, cameras, satellites, transit and hazards —
            and Pro tools for anyone who needs intelligence-grade depth. Every feature, free
            and Pro, is listed below — so you can check exactly what WorldEye can do before
            you ever open the map.
          </p>
        </div>

        {/* FREE FOREVER */}
        <section className="mt-16 md:mt-20">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-2xl md:text-3xl font-bold">Free, <span className="text-[#00E5FF]">forever</span></h2>
            <span className="text-[10px] font-bold tracking-[0.2em] px-3 py-1.5 rounded-full bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30">
              NO SIGNUP
            </span>
          </div>
          <p className="text-white/55 max-w-2xl mb-8">
            The core of WorldEye is open to everyone. No account, no credit card —
            just open the map and explore. Every layer below works the moment the page
            loads — and basic search is free too: fly to any place, address or
            coordinates without signing up.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FREE_FEATURES.map((f) => (
              <div key={f.title} className="rounded-3xl border border-white/10 bg-white/[0.02] p-7 hover:border-[#00E5FF]/40 transition">
                <span className="w-11 h-11 rounded-2xl bg-[#00E5FF]/10 border border-[#00E5FF]/25 flex items-center justify-center mb-5">
                  <f.icon className="w-5 h-5 text-[#00E5FF]" />
                </span>
                <h3 className="font-semibold text-white/90 mb-2">{f.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
                <p className="text-sm text-white/40 leading-relaxed mt-3">{f.detail}</p>
              </div>
            ))}
            <a
              href="/"
              className="rounded-3xl border border-[#00E5FF]/30 bg-gradient-to-b from-[#00E5FF]/[0.08] to-transparent p-7 flex flex-col justify-center hover:border-[#00E5FF]/60 transition group"
            >
              <h3 className="font-semibold text-white/90 mb-2">Try it right now</h3>
              <p className="text-sm text-white/50 leading-relaxed mb-4">
                Every free feature is live on the map today.
              </p>
              <span className="text-sm font-semibold text-[#00E5FF] group-hover:underline">
                Open the live map →
              </span>
            </a>
          </div>
        </section>

        {/* AFFILIATE PERK */}
        <section className="mt-10">
          <div className="rounded-3xl border border-[#D4AF37]/25 bg-[#D4AF37]/[0.04] p-7 flex flex-col md:flex-row md:items-center gap-5">
            <span className="w-11 h-11 shrink-0 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 flex items-center justify-center">
              <Clapperboard className="w-5 h-5 text-[#D4AF37]" />
            </span>
            <div className="flex-1">
              <h3 className="font-semibold text-white/90 mb-1">Cinematic director — free for affiliates</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                Compose keyframed camera scenes of the live globe, save them, play them back
                and record the flight as video. The director isn&apos;t part of Free or Pro —
                it&apos;s a perk of the affiliate program, and joining is free.
              </p>
            </div>
            <Link href="/affiliates" className="text-sm font-semibold text-[#D4AF37] hover:underline whitespace-nowrap">
              Join the affiliate program →
            </Link>
          </div>
        </section>

        {/* TRACKERS */}
        <section className="mt-16 md:mt-20">
          <h2 className="text-2xl md:text-3xl font-bold">Live <span className="text-[#00E5FF]">trackers</span></h2>
          <p className="text-white/55 max-w-2xl mt-4 mb-8">
            Each data layer has its own deep-dive page — how the tracking works, what you can
            see, and how to read it like a professional.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TRACKERS.map((t) => (
              <a
                key={t.href}
                href={t.href}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-[#00E5FF]/40 hover:bg-white/[0.04] transition group"
              >
                <p className="font-semibold text-white/90 text-sm group-hover:text-[#00E5FF] transition">{t.label}</p>
                <p className="text-xs text-white/45 mt-1.5 leading-relaxed">{t.desc}</p>
              </a>
            ))}
          </div>
        </section>

        {/* PRO */}
        <section className="mt-16 md:mt-20">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-2xl md:text-3xl font-bold">Pro <span className="text-[#D4AF37]">intelligence tools</span></h2>
            <span className="text-[10px] font-bold tracking-[0.2em] px-3 py-1.5 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30">
              FROM $7.99/WK
            </span>
          </div>
          <p className="text-white/55 max-w-2xl mb-8">
            For researchers, analysts and the deeply curious: an AI analyst that works
            the globe for you, satellite imagery, the live traffic layer, advanced search
            filters and premium intel feeds.
            Weekly $7.99 · Monthly $13.99 · VIP Pro $74.99 — cancel anytime.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {PRO_FEATURES.map((f) => (
              <div key={f.title} className="rounded-3xl border border-[#D4AF37]/25 bg-gradient-to-b from-[#D4AF37]/[0.06] to-transparent p-7 hover:border-[#D4AF37]/60 transition">
                <span className="w-11 h-11 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 flex items-center justify-center mb-5">
                  <f.icon className="w-5 h-5 text-[#D4AF37]" />
                </span>
                <h3 className="font-semibold text-white/90 mb-2">{f.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
                <p className="text-sm text-white/40 leading-relaxed mt-3">{f.detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/pricing"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)] text-center"
            >
              See Pro pricing
            </a>
            <a
              href="/"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl border border-white/15 text-white/70 font-semibold hover:bg-white/5 transition text-center"
            >
              Explore free first
            </a>
          </div>
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/40">
            <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#D4AF37]" /> Cancel anytime</li>
            <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#D4AF37]" /> Free trials — 3 days weekly · 10 days monthly &amp; annual</li>
            <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#D4AF37]" /> Stripe-secured checkout</li>
          </ul>
        </section>

        {/* FAQ */}
        <section className="mt-16 md:mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center">Questions, <span className="text-[#D4AF37]">answered</span></h2>
          <div className="mt-8 space-y-4">
            {FAQS.map((f) => (
              <div key={f.q} className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <h3 className="font-semibold text-white/90">{f.q}</h3>
                <p className="text-sm text-white/50 mt-2 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <RelatedLinks
          links={[
            {
              label: "How WorldEye compares",
              desc: "Honest head-to-heads with World Monitor, God's Eye View and more — features, pricing, verdicts.",
              href: "/compare",
            },
            {
              label: "Use cases",
              desc: "Who uses these features — journalists, researchers, travelers, storm watchers and more.",
              href: "/use-cases",
            },
            {
              label: "What is ADS-B?",
              desc: "The technology behind live flight tracking, explained simply.",
              href: "/what-is-ads-b",
            },
            {
              label: "What is AIS?",
              desc: "How ships broadcast their positions — the tech behind the ship tracker.",
              href: "/what-is-ais",
            },
            {
              label: "FAQ",
              desc: "Is the map free? What does Pro include? Answers to the common questions.",
              href: "/faq",
            },
          ]}
        />
      </div>

      <SiteFooter />
    </main>
  );
}
