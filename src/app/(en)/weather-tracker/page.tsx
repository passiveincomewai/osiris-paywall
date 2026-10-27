import VoiceQA from "@/components/seo/VoiceQA";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import { mergePlaceFaqs } from "@/lib/place-answers";
import { getVoiceQuestionsByIds } from "@/lib/voice-questions";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  CloudSun,
  Wind,
  CloudRain,
  Radar,
  Thermometer,
  Plane,
  Camera,
  ChevronDown,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import BreadcrumbLd from "@/components/BreadcrumbLd";
import RelatedLinks from "@/components/RelatedLinks";
import TrackerClusterLinks from "@/components/TrackerClusterLinks";

export const metadata: Metadata = {
  title: "Live Weather Tracker — Radar, Storms & 74,229 Cameras on One Globe",
  description:
    "Track live weather on a 3D globe — radar, storm systems, wind and precipitation — then look inside the weather with 74,229 public cameras on the same map. Free weather tracker — no signup, no account, no cost.",
  alternates: { canonical: "/weather-tracker" },
  openGraph: {
    title: "Live Weather Tracker — Radar, Storms & 74,229 Cameras on One Globe | WorldEye",
    description:
      "Live weather on a 3D globe — radar, storm systems and wind, with 74,229 public cameras inside the weather on the same map. Free with no signup.",
    url: "/weather-tracker",
    type: "website",
  },
};

const LAYERS = [
  {
    icon: CloudRain,
    title: "Storm systems",
    desc: "See storms as living, moving systems — not just icons on a map. Watch fronts sweep across continents and cells spin up over the ocean.",
  },
  {
    icon: Wind,
    title: "Wind flow",
    desc: "Atmospheric motion rendered across the globe, showing how weather actually travels — the jet stream, trade winds and everything between.",
  },
  {
    icon: CloudSun,
    title: "Conditions at a glance",
    desc: "Cloud cover, precipitation and temperature context layered over the planet, so anywhere you zoom feels like a forecast you can touch.",
  },
  {
    icon: Radar,
    title: "Radar-style view",
    desc: "A storm-hunter's perspective: precipitation and cloud structure visualized so you can follow a system as it develops, moves and dissipates.",
  },
  {
    icon: Thermometer,
    title: "Temperature patterns",
    desc: "Heat domes, cold snaps and the gradient between them — see temperature as a planetary pattern instead of a number on your phone.",
  },
  {
    icon: CloudRain,
    title: "Precipitation bands",
    desc: "Where it's raining right now, from drizzle to deluge — follow rain bands across continents and watch them break against mountain ranges.",
  },
  {
    icon: Wind,
    title: "Upper-atmosphere currents",
    desc: "The jet stream and trade winds that steer everything below them. Once you can see the currents, surface weather starts making sense.",
  },
];

const USE_CASES = [
  {
    icon: Plane,
    title: "Before you fly",
    desc: "Glance at the weather over your destination and along your route before you pack. A storm the news hasn't named yet might already be on the map.",
  },
  {
    icon: Thermometer,
    title: "Following extremes",
    desc: "Heat domes, blizzards, monsoons — when the climate makes headlines, look at the actual atmosphere yourself.",
  },
  {
    icon: Camera,
    title: "Ground truth",
    desc: "Pair the weather layer with 74,229 public cameras: see the sky over a place and the street below it, side by side.",
  },
  {
    icon: Wind,
    title: "Sailors and weekend plans",
    desc: "A weekend sail, a hike, an outdoor wedding — check what's actually moving toward you, not just the icon on the forecast. The wind field tells you when the front arrives.",
  },
  {
    icon: Radar,
    title: "Storm chasers and skywatchers",
    desc: "Watch supercells organize and track across the plains in real time — then step outside when the sky over you starts to turn the same color.",
  },
  {
    icon: CloudSun,
    title: "Commuters and road trippers",
    desc: "A glance at the continent before you leave tells you whether the drive is clear skies or a wall of weather — and which alternate route dodges it.",
  },
];

const FAQS = [
  {
    q: "Is the weather tracker free?",
    a: "Yes — completely. The weather layer is part of the free map: no account, no signup, no credit card. Open the site and the atmosphere is already moving.",
  },
  {
    q: "What weather data is shown?",
    a: "Live storm systems, wind flow, cloud cover and precipitation, rendered on the 3D globe from public weather data feeds. It's designed for watching weather happen, not as a replacement for your local forecast.",
  },
  {
    q: "Can I see hurricanes and typhoons?",
    a: "Yes — tropical systems appear as the large rotating structures they are, and you can follow their path across the ocean. For official forecasts, warnings and evacuation orders, always go to your national meteorological agency.",
  },
  {
    q: "How current is the data?",
    a: "The layer updates continuously from public feeds while you watch. There can be a small delay between observation and display, so treat it as a live picture, not a certified forecast.",
  },
  {
    q: "Is this a replacement for my weather app?",
    a: "No. WorldEye shows you the planet's weather as it happens — beautiful and informative, but your local forecast from a meteorological service is still the right source for what to wear tomorrow or when to take cover.",
  },
  {
    q: "Can I see past weather or future forecasts?",
    a: "WorldEye shows the atmosphere as it is right now — a live picture, not an archive and not a forecast model. For what's coming tomorrow, your meteorological service's forecast is the right tool; for what's happening now, look at the globe.",
  },
  {
    q: "Does it show the temperature where I am?",
    a: "The layer renders temperature as a global pattern — heat and cold masses moving across the map. For the exact degrees outside your door, check a local station or forecast; for why it's hot or cold, look at the pattern.",
  },
  {
    q: "Can I track a specific storm?",
    a: "Zoom to any active system and watch it directly — its structure, its movement, and the winds steering it. During hurricane season, the hurricane tracker page goes deeper on tropical systems specifically.",
  },
  {
    q: "Why does the weather look different from my weather app?",
    a: "Your app shows a forecast for one point; the globe shows the whole atmosphere at once. They're complementary — the app tells you what to expect where you stand, the map shows you why.",
  },
];

/* Canonical-dataset answers merged into this page's single FAQPage
   (src/lib/place-answers.ts merge rule); the visible VoiceQA block
   renders exactly the surviving entries. */
const VOICE_MERGED = mergePlaceFaqs(FAQS, getVoiceQuestionsByIds(["check-weather-anywhere", "where-is-it-snowing"]));

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "WorldEye Live Weather Tracker",
      description:
        "Track live weather on a 3D globe — radar, storm systems, wind and precipitation — with 74,229 public cameras inside the weather on the same map. Free weather tracker — no signup.",
      url: "https://worldeye.app/weather-tracker",
      isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
    },
    {
      "@type": "FAQPage",
      url: "https://worldeye.app/weather-tracker",
      mainEntity: VOICE_MERGED.merged.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function WeatherTrackerPage() {
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
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="WorldEye — back to the live globe" className="shrink-0 inline-flex items-center"><img src="/worldeye-header-logo.png" alt="WorldEye" width={1063} height={290} className="h-6 w-auto" /></Link>
            <LanguageHeaderControl variant="mobile" />
          </div>
        </div>

        <BreadcrumbLd trail={[{ label: "Weather Tracker" }]} />

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#00E5FF] border border-[#00E5FF]/30 rounded-full px-4 py-1.5 mb-6">
            <CloudSun className="w-3.5 h-3.5" /> LIVE ATMOSPHERE
          </p>
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
            The planet&apos;s weather, <span className="text-[#00E5FF]">live.</span>
          </h1>
          <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
            A live weather map on a 3D globe. Storm systems, wind flow and
            precipitation rendered as they happen — free for everyone, no
            account needed.
          </p>
          <div className="mt-8">
            <Link
              href="/"
              className="inline-block px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              Open live weather — free, no signup
            </Link>
          </div>
        </div>

        {/* The one-map answer */}
        <div className="mt-16 md:mt-20 max-w-3xl mx-auto rounded-3xl border border-[#D4AF37]/25 bg-[#D4AF37]/[0.04] p-8 md:p-10">
          <h2 className="text-xl md:text-2xl font-bold">
            One live map for weather — and everything inside it
          </h2>
          <p className="mt-3 text-white/60 leading-relaxed">
            WorldEye&apos;s weather tracker is a free live weather map on a 3D
            globe: storm systems, wind flow and precipitation rendered as
            they happen, with no account needed. The same globe carries the
            cameras inside the weather —{" "}
            <Link href="/live-webcams" className="text-[#D4AF37] hover:underline">
              74,229 public cameras
            </Link>
            , including{" "}
            <Link href="/ski-webcams" className="text-[#D4AF37] hover:underline">
              ski
            </Link>{" "}
            and{" "}
            <Link href="/beach-webcams" className="text-[#D4AF37] hover:underline">
              beach
            </Link>{" "}
            cameras — plus{" "}
            <Link href="/live-flight-tracker" className="text-[#D4AF37] hover:underline">
              live flights
            </Link>
            , all on one map.
          </p>
        </div>

        {/* What the layer shows */}
        <div className="mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            What the weather layer <span className="text-[#D4AF37]">shows</span>
          </h2>
          <div className="mt-8 grid sm:grid-cols-2 gap-5">
            {LAYERS.map((l) => (
              <div
                key={l.title}
                className="rounded-3xl border border-white/10 bg-white/[0.02] p-7"
              >
                <l.icon className="w-6 h-6 text-[#00E5FF] mb-4" />
                <p className="font-semibold text-white/90 text-lg mb-2">{l.title}</p>
                <p className="text-sm text-white/45 leading-relaxed">{l.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How to read it */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            How to read the <span className="text-[#D4AF37]">sky</span>
          </h2>
          <div className="space-y-4 text-white/60 leading-relaxed">
            <p>
              Most weather maps flatten the atmosphere into a rectangle.
              WorldEye puts it back where it belongs: a sphere. Storm systems
              curve around a spinning planet, wind streams arc across ocean
              basins, and you can see at a glance which hemisphere is taking the
              brunt of a season.
            </p>
            <p>
              Start with a storm you already know about — something in the news
              — and zoom in. Then zoom back out and follow the system
              backward: watch where it formed, how it strengthened, and what
              steered it. That backward look is how you start reading weather
              like a forecaster instead of just checking a forecast.
            </p>
            <p>
              It never sits alone, either. Weather shares the globe with live
              flights threading around storms, satellites overhead, earthquakes,
              wildfires and tens of thousands of public cameras — so when a
              storm makes landfall, you can look at the sky <em>and</em> the
              street.
            </p>
            <p>
              One habit worth building: compare the two views every day for a
              week — the globe and the sky above you. You&apos;ll start
              recognizing the signatures: the high, thin streaks ahead of a
              front, the low scud racing under a storm, the clear dome of a
              high-pressure system. Meteorology stops being vocabulary and
              becomes pattern recognition.
            </p>
          </div>
        </div>

        {/* Use cases */}
        <div className="mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            Why people <span className="text-[#D4AF37]">watch the weather</span>
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
            Weather tracker <span className="text-[#D4AF37]">FAQ</span>
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
            Watch the atmosphere <span className="text-[#D4AF37]">move</span>
          </h2>
          <p className="text-white/55 mt-3 mb-8">
            Free forever. No account. Just the planet, live.
          </p>
          <Link
            href="/"
            className="inline-block px-8 py-4 rounded-2xl bg-[#D4AF37] text-black font-bold hover:brightness-110 transition"
          >
            Open the live weather map
          </Link>
          <p className="mt-6 text-sm text-white/40">
            Want the full intelligence toolkit?{" "}
            <Link href="/pricing" className="text-[#D4AF37] hover:underline">
              Explore WorldEye Pro
            </Link>
          </p>
        </div>

        {VOICE_MERGED.surviving.length > 0 && (
          <VoiceQA entries={VOICE_MERGED.surviving} />
        )}

        <RelatedLinks
          links={[
            {
              label: "Tornado tracker",
              desc: "Live tornado warnings, watches and reported tornadoes — the sharp end of severe weather.",
              href: "/tornado-tracker",
            },
            {
              label: "Hurricane tracker",
              desc: "Tropical storms and hurricanes as live systems — with a safety-first approach.",
              href: "/hurricane-tracker",
            },
            {
              label: "Wildfire tracker",
              desc: "Live wildfire activity on the same globe — heat and smoke where the wind carries them.",
              href: "/wildfire-tracker",
            },
            {
              label: "Live cameras",
              desc: "74,229 public cameras — see the sky over any place and the street below it.",
              href: "/cameras",
            },
            {
              label: "WorldEye vs Windy",
              desc: "Coming from a forecast map? The honest head-to-head: model depth vs live weather and ground cameras.",
              href: "/compare/windy",
            },
            {
              label: "Features",
              desc: "Everything the globe can do — free forever layers and Pro intelligence tools.",
              href: "/features",
            },
            {
              label: "California fire cameras",
              desc: "The ALERTCalifornia camera network — live views across California fire country.",
              href: "/california-fire-cameras",
            },
          ]}
        />

        <TrackerClusterLinks current="/weather-tracker" />
      </div>

      <SiteFooter />
    </main>
  );
}
