import VoiceQA from "@/components/seo/VoiceQA";
import { mergePlaceFaqs } from "@/lib/place-answers";
import { getVoiceQuestionsByIds } from "@/lib/voice-questions";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Flame,
  MapPin,
  Wind,
  Eye,
  Camera,
  ShieldAlert,
  ChevronDown,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import BreadcrumbLd from "@/components/BreadcrumbLd";
import RelatedLinks from "@/components/RelatedLinks";

export const metadata: Metadata = {
  title: "Live Wildfire Tracker — Fire Activity Map",
  description:
    "Track wildfire activity live on a 3D globe: active fires, smoke drift and heat detections. Free wildfire map — no signup. Safety info from official sources.",
  alternates: { canonical: "/wildfire-tracker" },
  openGraph: {
    title: "Live Wildfire Tracker | WorldEye",
    description:
      "Wildfire activity as it happens — active fires and smoke drift on a live 3D map. Free, no signup.",
    url: "/wildfire-tracker",
    type: "website",
  },
};

const WHAT_YOU_SEE = [
  {
    icon: Flame,
    title: "Active fires",
    desc: "Fire activity plotted on the globe from thermal detections — watch new fires appear and existing ones spread or get contained.",
  },
  {
    icon: Wind,
    title: "Smoke & wind context",
    desc: "The weather layer sits right alongside: see which way the wind is carrying smoke and which communities sit downwind of a fire.",
  },
  {
    icon: MapPin,
    title: "Where it burns",
    desc: "Zoom from the whole planet down to the affected region — forests, grasslands and the wildland-urban edge where fires meet homes.",
  },
  {
    icon: Camera,
    title: "Cameras nearby",
    desc: "In fire country, public cameras often catch the smoke plume before the news does. Cross-reference the fire with cameras in the area.",
  },
  {
    icon: Eye,
    title: "Fire behavior at a glance",
    desc: "New detections flaring up, clusters merging into complexes, activity stalling against terrain — the map shows how fires live and move, not just where they are.",
  },
  {
    icon: Wind,
    title: "Wind-driven spread",
    desc: "Fire follows wind. With the weather layer alongside, you can see which communities sit downwind of an active fire — and how a wind shift would change the picture.",
  },
  {
    icon: Flame,
    title: "Seasonal rhythm",
    desc: "Fire season moves around the planet — the western US in late summer, Australia in its summer, the Mediterranean in the dry months. The globe shows the season as a global pattern, not just local news.",
  },
];

const FAQS = [
  {
    q: "Is the wildfire tracker free?",
    a: "Yes — completely. The wildfire layer is part of the free map: no account, no signup, no credit card. Open the site and active fires are already plotted.",
  },
  {
    q: "How are fires detected?",
    a: "From thermal anomalies picked up by satellite instruments and published through public fire-monitoring feeds. WorldEye plots those detections on the globe as they arrive, layered with wind and weather data.",
  },
  {
    q: "Can I use this to decide whether to evacuate?",
    a: "No — and please don't. Evacuation orders come from local emergency authorities (fire departments, sheriff's offices, emergency management), not from any map site. Use WorldEye to understand the big picture; use official channels for decisions about your safety.",
  },
  {
    q: "How accurate is the fire data?",
    a: "Thermal detections are a reliable indicator that something is burning, but they can lag behind fast-moving fires and occasionally pick up false positives from industrial heat. Treat the map as situational awareness, not ground truth.",
  },
  {
    q: "What should I do if there's a fire near me?",
    a: "Check your local fire department, emergency management agency or emergency alert system immediately. Sign up for your area's official emergency alerts if you haven't already — that's the system that will tell you to leave, and when.",
  },
  {
    q: "What causes the fires shown on the map?",
    a: "The map shows thermal detections, not causes. Most wildfires start from lightning or human activity — the full range from unattended campfires to power lines — but determining a specific fire's cause is investigators' work, not something a satellite can see.",
  },
  {
    q: "Can I see how big a fire is?",
    a: "Thermal detections show heat, not perimeters. A cluster of detections means significant burning, but the actual burned area comes from fire agencies' mapped perimeters — check their incident pages for acres and containment figures.",
  },
  {
    q: "Does the map show prescribed burns?",
    a: "Sometimes — a prescribed burn hot enough to trigger a thermal detection looks the same from orbit as a wildfire. If a detection sits somewhere burns are planned, check local agency announcements before assuming the worst.",
  },
  {
    q: "Why is there smoke but no fire shown near me?",
    a: "Smoke travels hundreds of miles downwind of its source. If your sky is hazy but the map shows no nearby fire, zoom out and look upwind — the source is often a fire complex in another state or even another country.",
  },
];

/* Canonical-dataset answers merged into this page's single FAQPage
   (src/lib/place-answers.ts merge rule); the visible VoiceQA block
   renders exactly the surviving entries. */
const VOICE_MERGED = mergePlaceFaqs(FAQS, getVoiceQuestionsByIds(["watch-wildfires-live", "wildfires-near-me", "california-fire-cameras"]));

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "WorldEye Live Wildfire Tracker",
      description:
        "Track wildfire activity live on a 3D globe: active fires, smoke drift and heat detections. Free wildfire map — no signup.",
      url: "https://worldeye.app/wildfire-tracker",
      isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
    },
    {
      "@type": "FAQPage",
      url: "https://worldeye.app/wildfire-tracker",
      mainEntity: VOICE_MERGED.merged.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function WildfireTrackerPage() {
  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100 relative overflow-x-clip">
      <JsonLd data={jsonLd} />
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-15 blur-[120px] bg-[#ff6b35]" />
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

        <BreadcrumbLd trail={[{ label: "Wildfire Tracker" }]} />

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#ff8c5a] border border-[#ff8c5a]/30 rounded-full px-4 py-1.5 mb-6">
            <Flame className="w-3.5 h-3.5" /> LIVE FIRE DATA
          </p>
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
            Wildfires <span className="text-[#ff8c5a]">as they burn.</span>
          </h1>
          <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
            A live wildfire map on a 3D globe. Active fires, smoke drift and
            heat detections plotted as they arrive — free for everyone.
          </p>
          <div className="mt-8">
            <Link
              href="/"
              className="inline-block px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              Open live wildfire map — free, no signup
            </Link>
          </div>
        </div>

        {/* What you see */}
        <div className="mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            What the fire layer <span className="text-[#D4AF37]">shows</span>
          </h2>
          <div className="mt-8 grid sm:grid-cols-2 gap-5">
            {WHAT_YOU_SEE.map((w) => (
              <div
                key={w.title}
                className="rounded-3xl border border-white/10 bg-white/[0.02] p-7"
              >
                <w.icon className="w-6 h-6 text-[#ff8c5a] mb-4" />
                <p className="font-semibold text-white/90 text-lg mb-2">{w.title}</p>
                <p className="text-sm text-white/45 leading-relaxed">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Safety section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <div className="rounded-3xl border border-[#ff6b35]/40 bg-[#ff6b35]/[0.06] p-8 md:p-10">
            <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <ShieldAlert className="w-7 h-7 text-[#ff8c5a] shrink-0" />
              Read this if a fire is near you
            </h2>
            <div className="mt-5 space-y-4 text-white/65 leading-relaxed">
              <p>
                WorldEye is a situational-awareness map, not an emergency
                service. If a fire is burning near you, <strong className="text-white/90">do not
                use this site to decide whether to evacuate.</strong> Evacuation
                orders and warnings come from local emergency authorities —
                your fire department, sheriff&apos;s office or emergency
                management agency.
              </p>
              <p>
                Get your information from official channels: your area&apos;s
                emergency alert system (register for it now if you
                haven&apos;t), local fire agency incident pages, and the
                national weather service&apos;s fire-weather products. Those
                are the sources that will tell you to leave — and when to go.
              </p>
              <p className="text-white/45 text-sm">
                Then come back here to understand the bigger picture: how the
                fire complex is developing, where the smoke is headed, and what
                the wind is doing next.
              </p>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            How fire tracking <span className="text-[#D4AF37]">works</span>
          </h2>
          <div className="space-y-4 text-white/60 leading-relaxed">
            <p>
              Satellites carrying thermal instruments scan the planet&apos;s
              surface continuously. When something burns hot enough to stand out
              against the surrounding landscape, it shows up as a thermal
              anomaly — and public fire-monitoring programs publish those
              detections openly.
            </p>
            <p>
              WorldEye plots those detections on the globe as they arrive,
              alongside the weather layer. That combination is what makes the
              map useful: a fire is only half the story — the other half is the
              wind pushing it and the smoke trailing downwind. Seeing all of it
              at once turns a list of coordinates into something you can
              actually read.
            </p>
            <p>
              And the context keeps going: earthquakes, flights, satellites and
              74,229 public cameras share the same globe. In fire country,
              that means you can sometimes watch the smoke column from a
              roadside camera while the satellite data shows the heat source.
              In California the fire-watch network has{" "}
              <Link href="/california-fire-cameras" className="text-[#D4AF37] hover:underline">
                its own page
              </Link>{" "}
              — every ALERTCalifornia camera in one grid.
            </p>
            <p>
              Detections have limits worth knowing. Thick cloud can hide a fire
              from thermal instruments; a fast-moving grass fire can outrun the
              satellite&apos;s revisit; intense industrial heat occasionally trips
              a false positive. The map is honest about what it is — a live plot
              of heat detections — and honest maps beat confident ones.
            </p>
          </div>
        </div>

        {/* Why watch */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            Why people <span className="text-[#D4AF37]">watch fires</span>
          </h2>
          <div className="space-y-4 text-white/60 leading-relaxed">
            <p>
              Fire season has become a fact of life across the western US, the
              Mediterranean, Australia and beyond. For people living in fire
              country, a live fire map is part of staying oriented through
              smoke season — not as a replacement for official alerts, but as
              context around them.
            </p>
            <p>
              For everyone else, it&apos;s a window onto one of the
              planet&apos;s most powerful forces: how fast a grass fire runs
              under a wind event, how smoke from one continent can dim the sky
              of another, how fire perimeters grow and stall against terrain.
              The map makes the physics visible.
            </p>
            <p className="flex items-start gap-3 text-white/50">
              <Eye className="w-5 h-5 text-[#D4AF37] shrink-0 mt-1" />
              Researchers, journalists and fire-adjacent communities use the
              same feeds — WorldEye just puts them where you can see them
              without a specialist&apos;s toolkit.
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            Wildfire tracker <span className="text-[#D4AF37]">FAQ</span>
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
            See fire season <span className="text-[#D4AF37]">as it happens</span>
          </h2>
          <p className="text-white/55 mt-3 mb-8">
            Free forever. No account. Just the planet, live.
          </p>
          <Link
            href="/"
            className="inline-block px-8 py-4 rounded-2xl bg-[#D4AF37] text-black font-bold hover:brightness-110 transition"
          >
            Open the live wildfire map
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
              label: "California fire cameras",
              desc: "Every ALERTCalifornia fire-watch camera in one live grid — the cameras that catch the smoke plume, refreshed every ~15 seconds.",
              href: "/california-fire-cameras",
            },
            {
              label: "Weather tracker",
              desc: "Live wind, storms and precipitation — the forces that decide where fire goes.",
              href: "/weather-tracker",
            },
            {
              label: "Earthquake tracker",
              desc: "Quakes as they happen — magnitude, depth and location on the same globe.",
              href: "/earthquake-tracker",
            },
            {
              label: "Live cameras",
              desc: "74,229 public cameras — watch conditions on the ground near a fire.",
              href: "/cameras",
            },
            {
              label: "Features",
              desc: "Everything the globe can do — free forever layers and Pro intelligence tools.",
              href: "/features",
            },
          ]}
        />
      </div>

      <SiteFooter />
    </main>
  );
}
