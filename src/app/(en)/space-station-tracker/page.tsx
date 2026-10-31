import VoiceQA from "@/components/seo/VoiceQA";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import { mergePlaceFaqs } from "@/lib/place-answers";
import { getVoiceQuestionsByIds } from "@/lib/voice-questions";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Orbit,
  Satellite,
  Globe2,
  Eye,
  Sun,
  Moon,
  ChevronDown,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import RelatedLinks from "@/components/RelatedLinks";
import TrackerClusterLinks from "@/components/TrackerClusterLinks";

export const metadata: Metadata = {
  title: "ISS Live — Track the Space Station on a 3D Globe (Free)",
  description:
    "ISS live: track the International Space Station on a 3D globe — where it is right now, its orbit path, and when it crosses your sky. Free space station tracker — no signup, no account, no cost.",
  alternates: { canonical: "/space-station-tracker" },
  openGraph: {
    title: "ISS Live — Track the Space Station on a 3D Globe (Free) | WorldEye",
    description:
      "The International Space Station, live on a 3D globe — current position, orbit path and visibility. Free, no signup.",
    url: "/space-station-tracker",
    type: "website",
  },
};

const WHAT_YOU_GET = [
  {
    icon: Orbit,
    title: "Live position",
    desc: "The station's current location over the Earth, updating in real time as it circles the planet roughly every 90 minutes.",
  },
  {
    icon: Globe2,
    title: "Full orbit path",
    desc: "Not just a dot — the entire ground track across the globe, so you can see where it's been and where it's going next.",
  },
  {
    icon: Sun,
    title: "Day/night terminator",
    desc: "Watch the ISS pass through sunlight and shadow. Crew sunrises come fast up there — sixteen a day, give or take.",
  },
  {
    icon: Satellite,
    title: "Satellites alongside",
    desc: "The ISS shares the globe with thousands of tracked satellites — Starlink trains, weather satellites and more, all live.",
  },
  {
    icon: Eye,
    title: "Ground track rhythm",
    desc: "The path sweeps a sine wave across the map — steep crossings at the edges of its range, long diagonals over the equator. After a few orbits you can predict its next pass over your city by eye.",
  },
  {
    icon: Moon,
    title: "Shadow passes",
    desc: "Watch the station dive into Earth's shadow and burst back into sunlight — the crew's sixteen daily sunrises, visible as the dot crosses the terminator line.",
  },
  {
    icon: Satellite,
    title: "The neighborhood",
    desc: "Starlink trains, weather satellites and thousands more tracked objects share the sky. The ISS is the brightest and most famous resident, but it's far from alone up there.",
  },
];

const FAQS = [
  {
    q: "Is the ISS tracker free?",
    a: "Yes — completely. Satellite tracking, including the ISS, is part of the free map: no account, no signup, no credit card. Open the site and the station is already overhead somewhere.",
  },
  {
    q: "What is the International Space Station?",
    a: "The ISS is a continuously crewed research laboratory in low Earth orbit, assembled by five space agencies and partners from more than a dozen countries. Astronauts have lived aboard it without interruption since 2000, running thousands of experiments in microgravity.",
  },
  {
    q: "How high is the ISS and how fast does it go?",
    a: "The station orbits roughly 400 km above the surface — high enough to stay above almost all of the atmosphere, low enough to reach. At about 28,000 km/h it circles the planet roughly every 90 minutes, so the crew sees about sixteen sunrises a day.",
  },
  {
    q: "Can I see the ISS with my own eyes?",
    a: "Yes, and it's one of the easiest objects in the sky to spot. Look for a bright, steady, fast-moving point of light shortly after sunset or before sunrise — no telescope needed. The globe helps you learn its rhythm: when it's passing near you, it's worth stepping outside.",
  },
  {
    q: "Why is the ISS sometimes easy to spot and sometimes not?",
    a: "Visibility depends on the station being sunlit while your sky is dark — typically the hour or two after sunset or before sunrise. In the middle of the night it flies through Earth's shadow; in daylight it's lost in the blue. Space agencies and spotter tools publish pass predictions for your exact location.",
  },
  {
    q: "When can I see the space station from where I live?",
    a: "Watch for a pass in the hour or two after sunset or before sunrise, when the station is still sunlit against a dark sky. Follow its ground track on the globe above: when the track crosses your area inside one of those twilight windows, step outside and look up — a bright, steady point moving fast, crossing the whole sky in a few minutes.",
  },
  {
    q: "How many people are on the ISS right now?",
    a: "Usually six or seven, rotating on roughly six-month missions. The exact crew changes with every launch — space agency sites carry the current roster with names, roles and mission patches.",
  },
  {
    q: "What does the crew actually do all day?",
    a: "Research, mostly: hundreds of experiments in microgravity — protein crystals, fluid physics, Earth observation — plus station maintenance and about two hours of daily exercise to fight bone and muscle loss. It's a laboratory that happens to orbit.",
  },
  {
    q: "How long will the ISS keep flying?",
    a: "NASA plans to operate the station through 2030, followed by a controlled deorbit. Its successor era — commercial stations and new international partnerships — is already being built, but for now the ISS remains the place where humans live off Earth.",
  },
  {
    q: "Can I hear the ISS on a radio?",
    a: "Yes — astronauts occasionally talk to schools and amateur radio operators, and the station's packet radio beacon is receivable with modest equipment. It's a whole hobby; look up ARISS for schedules and frequencies.",
  },
];

/* Canonical-dataset answers merged into this page's single FAQPage
   (src/lib/place-answers.ts merge rule); the visible VoiceQA block
   renders exactly the surviving entries. */
const VOICE_MERGED = mergePlaceFaqs(FAQS, getVoiceQuestionsByIds(["track-the-space-station"]));

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "WorldEye ISS Space Station Tracker",
      description:
        "Track the International Space Station live on a 3D globe: current position, orbit path and visibility. Free ISS tracker — no signup.",
      url: "https://worldeye.app/space-station-tracker",
      isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
    },
    {
      "@type": "FAQPage",
      url: "https://worldeye.app/space-station-tracker",
      mainEntity: VOICE_MERGED.merged.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function SpaceStationTrackerPage() {
  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100 relative overflow-x-clip">
      <JsonLd data={jsonLd} />
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-15 blur-[120px] bg-[#7c8aff]" />
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

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#aab2ff] border border-[#aab2ff]/30 rounded-full px-4 py-1.5 mb-6">
            <Orbit className="w-3.5 h-3.5" /> LIVE ORBITAL DATA
          </p>
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
            There are people <span className="text-[#aab2ff]">up there.</span>
          </h1>
          <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
            A live ISS tracker on a 3D globe. The International Space Station —
            position, orbit path and day-night passes — free for everyone, no
            account needed.
          </p>
          <div className="mt-8">
            <Link
              href="/"
              className="inline-block px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              Open live ISS tracker — free, no signup
            </Link>
          </div>
        </div>

        {/* Direct answer — what this page tracks (AEO, SEO Programme Phase 6).
            Every figure is this page's own long-standing copy (FAQ below):
            ~400 km altitude, ~28,000 km/h, ~90-minute orbit, sixteen
            sunrises a day. The scope statement is the point: this page is
            ISS-only; the full catalogue lives on /satellite-tracker. */}
        <div className="mt-16 md:mt-20 max-w-3xl mx-auto rounded-3xl border border-[#aab2ff]/25 bg-[#aab2ff]/[0.04] p-8 md:p-10">
          <h2 className="text-xl md:text-2xl font-bold">What this page tracks</h2>
          <p className="mt-3 text-white/60 leading-relaxed">
            One spacecraft: the International Space Station. The ISS orbits
            roughly 400 km above Earth at about 28,000 km/h, circling the
            planet roughly every 90 minutes — about sixteen sunrises a day
            for its crew. This page follows the station itself: its live
            position, ground track and day/night passes. For the full tracked
            catalogue — Starlink trains, weather satellites and thousands
            more objects — see the{" "}
            <Link href="/satellite-tracker" className="text-[#aab2ff] hover:underline">
              satellite tracker
            </Link>
            .
          </p>
        </div>

        {/* What you get */}
        <div className="mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            What the station layer <span className="text-[#D4AF37]">shows</span>
          </h2>
          <div className="mt-8 grid sm:grid-cols-2 gap-5">
            {WHAT_YOU_GET.map((w) => (
              <div
                key={w.title}
                className="rounded-3xl border border-white/10 bg-white/[0.02] p-7"
              >
                <w.icon className="w-6 h-6 text-[#aab2ff] mb-4" />
                <p className="font-semibold text-white/90 text-lg mb-2">{w.title}</p>
                <p className="text-sm text-white/45 leading-relaxed">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Why it's fun */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            Why tracking it is <span className="text-[#D4AF37]">fun</span>
          </h2>
          <div className="space-y-4 text-white/60 leading-relaxed">
            <p>
              There is something quietly thrilling about watching a dot cross
              the map and knowing there are people on it. The ISS is the
              largest human-made object ever put in space — a football-field
              of solar panels and modules with a crew of astronauts inside —
              and it&apos;s up there right now, moving at 28,000 km/h.
            </p>
            <p>
              Tracking it on the globe gives you an instinct for its rhythm:
              the near-vertical sweeps across latitudes, the way it races over
              the night side into sunrise, the passes that skim right over your
              part of the world. After a while you stop seeing a dot and start
              seeing an orbit.
            </p>
            <p className="flex items-start gap-3 text-white/50">
              <Moon className="w-5 h-5 text-[#D4AF37] shrink-0 mt-1" />
              And then the best part: stepping outside at the right minute and
              waving at a light crossing the sky — while knowing exactly where
              it is, because you just watched it get there.
            </p>
            <p>
              It also quietly teaches orbital mechanics. Notice how the ground
              track never repeats exactly — Earth turns beneath the orbit, so
              each pass shifts west. Notice the tilted path, the compromise
              orbit reachable from the world&apos;s launch sites. The dot is a
              physics lesson that never ends — and the ISS is only the
              brightest object in it: the{" "}
              <Link href="/satellite-tracker" className="text-[#aab2ff] hover:underline">
                full satellite tracker
              </Link>{" "}
              draws every tracked satellite in orbit on this same globe.
            </p>
          </div>
        </div>

        {/* How to spot it */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 flex items-center justify-center gap-3">
            <Eye className="w-7 h-7 text-[#D4AF37]" />
            How to <span className="text-[#D4AF37]">spot it yourself</span>
          </h2>
          <div className="space-y-4 text-white/60 leading-relaxed">
            <p>
              <strong className="text-white/90">1. Check the pass.</strong>{" "}
              Use the globe to see when the station&apos;s ground track comes
              near you, or check a pass-prediction tool from your space agency
              for exact times, brightness and direction.
            </p>
            <p>
              <strong className="text-white/90">2. Go out at dusk or dawn.</strong>{" "}
              The station reflects sunlight — it&apos;s only visible while
              it&apos;s sunlit and your sky is dark, usually within a couple
              of hours of sunset or sunrise.
            </p>
            <p>
              <strong className="text-white/90">3. Look for steady and fast.</strong>{" "}
              Unlike aircraft, it doesn&apos;t blink. Unlike planets, it moves —
              crossing the sky in a few minutes. Once you&apos;ve seen it, you
              can&apos;t unsee it.
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            ISS tracker <span className="text-[#D4AF37]">FAQ</span>
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
            See where it is <span className="text-[#D4AF37]">right now</span>
          </h2>
          <p className="text-white/55 mt-3 mb-8">
            Free forever. No account. Just the planet, live.
          </p>
          <Link
            href="/"
            className="inline-block px-8 py-4 rounded-2xl bg-[#D4AF37] text-black font-bold hover:brightness-110 transition"
          >
            Open the live ISS tracker
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
              label: "Satellite tracker",
              desc: "The ISS plus Starlink and thousands more satellites — the full orbital picture.",
              href: "/satellite-tracker",
            },
            {
              label: "Flight tracker",
              desc: "Live aircraft on the same globe — the sky below the satellites.",
              href: "/live-flight-tracker",
            },
            {
              label: "Features",
              desc: "Everything the globe can do — free forever layers and Pro intelligence tools.",
              href: "/features",
            },
            {
              label: "FAQ",
              desc: "Is the map free? What does Pro include? Answers to the common questions.",
              href: "/faq",
            },
          ]}
        />

        <TrackerClusterLinks current="/space-station-tracker" />
      </div>

      <SiteFooter />
    </main>
  );
}
