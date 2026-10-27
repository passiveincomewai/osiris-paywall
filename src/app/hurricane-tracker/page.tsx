import VoiceQA from "@/components/seo/VoiceQA";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import { mergePlaceFaqs } from "@/lib/place-answers";
import { getVoiceQuestionsByIds } from "@/lib/voice-questions";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Tornado,
  RotateCw,
  Wind,
  Camera,
  CalendarDays,
  ShieldAlert,
  ChevronDown,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import BreadcrumbLd from "@/components/BreadcrumbLd";
import RelatedLinks from "@/components/RelatedLinks";
import TrackerClusterLinks from "@/components/TrackerClusterLinks";
import LiveStormList from "@/components/events/LiveStormList";

export const metadata: Metadata = {
  title: "Hurricane Tracker — Live Storm Tracking",
  description:
    "Follow hurricanes live on a 3D globe: storm paths, intensity and landfall context. Free hurricane tracker — no signup. Always follow official warnings.",
  alternates: { canonical: "/hurricane-tracker" },
  openGraph: {
    title: "Hurricane Tracker — Live Storm Tracking | WorldEye",
    description:
      "Hurricanes as live systems on a 3D globe — free, no signup. Official warnings always come first.",
    url: "/hurricane-tracker",
    type: "website",
  },
};

const WHAT_YOU_SEE = [
  {
    icon: Tornado,
    title: "Live storm systems",
    desc: "Tropical systems rendered as the rotating giants they are — watch them form over warm water, strengthen and track across the basin.",
  },
  {
    icon: RotateCw,
    title: "Structure & spin",
    desc: "See the circulation itself: spiral bands, the eye when it clears out, and how the storm's organization changes day to day.",
  },
  {
    icon: Wind,
    title: "Steering currents",
    desc: "The surrounding wind field that decides where a hurricane goes next — the same context forecasters weigh when they draw the cone.",
  },
  {
    icon: Camera,
    title: "Landfall ground truth",
    desc: "As a storm approaches land, switch to public cameras along the coast and watch conditions arrive in real time.",
  },
  {
    icon: Tornado,
    title: "Basin-wide view",
    desc: "The Atlantic, eastern Pacific and western Pacific on one globe — see every active tropical system at once instead of one storm at a time.",
  },
  {
    icon: Wind,
    title: "Where storms are born",
    desc: "Storms feed on warm tropical water and die over cold water or land. Watching the basin view teaches you which stretches of ocean produce monsters — and which ones kill them.",
  },
  {
    icon: Camera,
    title: "After landfall",
    desc: "The storm passes; the cameras stay. Flooded streets, debris fields, crews restoring power — the same coastal feeds that showed the approach now show the recovery.",
  },
];

const FAQS = [
  {
    q: "Is the hurricane tracker free?",
    a: "Yes — completely. The storm layers are part of the free map: no account, no signup, no credit card. Open the site and any active tropical system is already there.",
  },
  {
    q: "When is hurricane season?",
    a: "The Atlantic season runs June through November, with the peak typically in August and September. The eastern Pacific season runs mid-May through November, and the western Pacific sees typhoons year-round. WorldEye's globe shows whichever basins are active — no need to remember the calendar.",
  },
  {
    q: "Can I see the forecast path of a hurricane?",
    a: "WorldEye shows the storm as it is right now — its current structure, position and the steering winds around it. For forecast tracks, intensity forecasts and landfall timing, always use your national hurricane center or meteorological agency. Their forecasts drive warnings; the map shows the present.",
  },
  {
    q: "Should I use this site to prepare for a storm?",
    a: "Use it to understand the storm — then prepare from official guidance. Your national hurricane center, local emergency management and weather service issue the watches, warnings and evacuation orders. The map is context, not instructions.",
  },
  {
    q: "What's the difference between a hurricane, typhoon and cyclone?",
    a: "They're the same phenomenon — a tropical cyclone — with different regional names. Hurricanes in the Atlantic and eastern Pacific, typhoons in the northwest Pacific, cyclones in the Indian Ocean and South Pacific. WorldEye's globe treats them all the same: big rotating storms.",
  },
  {
    q: "What do the hurricane categories mean?",
    a: "The Saffir-Simpson scale rates hurricanes 1–5 by sustained wind speed — but wind is only one hazard. Storm surge and rainfall flooding kill more people than wind in most landfalls, which is why officials stress water over category.",
  },
  {
    q: "How far in advance can a hurricane be predicted?",
    a: "Formation can be anticipated days ahead when conditions align; track forecasts are typically skillful 3–5 days out and degrade beyond that. Intensity is the harder problem — rapid strengthening still surprises forecasters. Your hurricane center's official forecast is the authoritative source.",
  },
  {
    q: "What is a storm surge?",
    a: "The ocean pushed ashore by the storm's winds — a wall of water that can rise many feet above normal tide and penetrate miles inland. It's the deadliest part of most hurricanes, and the reason evacuation zones are drawn where they are.",
  },
  {
    q: "Can I watch a hurricane from space?",
    a: "The globe renders the storm's structure live from weather data feeds as it moves. For raw satellite loops of the cloud tops, meteorological agencies publish them openly — spectacular, free, and worth a look alongside the map.",
  },
];

/* Canonical-dataset answers merged into this page's single FAQPage
   (src/lib/place-answers.ts merge rule); the visible VoiceQA block
   renders exactly the surviving entries. */
const VOICE_MERGED = mergePlaceFaqs(FAQS, getVoiceQuestionsByIds(["watch-a-hurricane-live", "watch-storms-hit-the-coast"]));

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "WorldEye Live Hurricane Tracker",
      description:
        "Follow hurricanes live on a 3D globe: storm paths, intensity and landfall context. Free hurricane tracker — no signup.",
      url: "https://worldeye.app/hurricane-tracker",
      isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
    },
    {
      "@type": "FAQPage",
      url: "https://worldeye.app/hurricane-tracker",
      mainEntity: VOICE_MERGED.merged.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function HurricaneTrackerPage() {
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

        <BreadcrumbLd trail={[{ label: "Hurricane Tracker" }]} />

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#00E5FF] border border-[#00E5FF]/30 rounded-full px-4 py-1.5 mb-6">
            <Tornado className="w-3.5 h-3.5" /> LIVE TROPICAL SYSTEMS
          </p>
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
            Hurricanes <span className="text-[#00E5FF]">in motion.</span>
          </h1>
          <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
            A live hurricane tracker on a 3D globe. Tropical storms rendered
            as the massive rotating systems they are — free for everyone, no
            account needed.
          </p>
          <div className="mt-8">
            <Link
              href="/"
              className="inline-block px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              Open live hurricane map — free, no signup
            </Link>
          </div>
        </div>

        {/* Live active storms */}
        <div className="mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            Active storms — <span className="text-[#00E5FF]">live from NHC</span>
          </h2>
          <LiveStormList />
        </div>

        {/* What you see */}
        <div className="mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            What the storm layer <span className="text-[#D4AF37]">shows</span>
          </h2>
          <div className="mt-8 grid sm:grid-cols-2 gap-5">
            {WHAT_YOU_SEE.map((w) => (
              <div
                key={w.title}
                className="rounded-3xl border border-white/10 bg-white/[0.02] p-7"
              >
                <w.icon className="w-6 h-6 text-[#00E5FF] mb-4" />
                <p className="font-semibold text-white/90 text-lg mb-2">{w.title}</p>
                <p className="text-sm text-white/45 leading-relaxed">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Safety / official sources */}
        <div className="mt-20 max-w-3xl mx-auto">
          <div className="rounded-3xl border border-[#00E5FF]/40 bg-[#00E5FF]/[0.05] p-8 md:p-10">
            <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <ShieldAlert className="w-7 h-7 text-[#00E5FF] shrink-0" />
              The map watches. Officials warn.
            </h2>
            <div className="mt-5 space-y-4 text-white/65 leading-relaxed">
              <p>
                WorldEye shows you the storm as it exists right now. It does
                not issue watches, warnings or evacuation orders — those come
                from your <strong className="text-white/90">national hurricane
                center, meteorological agency and local emergency
                management</strong>. If a storm is threatening your area, their
                guidance is the only guidance that matters.
              </p>
              <p>
                Preparedness basics still apply every season: know your
                evacuation zone, have a plan for where you&apos;ll go, keep
                supplies ready before a storm is named — not after. The
                hurricane center&apos;s seasonal outlook and storm-by-storm
                advisories are the authoritative source for all of it.
              </p>
              <p className="text-white/45 text-sm">
                Once you&apos;ve got the official picture, the globe is the
                place to watch it unfold: the storm&apos;s structure, its track
                across the water, and — near landfall — coastal cameras showing
                conditions as they arrive.
              </p>
            </div>
          </div>
        </div>

        {/* Seasonal awareness */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 flex items-center justify-center gap-3">
            <CalendarDays className="w-7 h-7 text-[#D4AF37]" />
            Seasonal <span className="text-[#D4AF37]">awareness</span>
          </h2>
          <div className="space-y-4 text-white/60 leading-relaxed">
            <p>
              Hurricane season isn&apos;t a surprise — it&apos;s a calendar
              event. The Atlantic runs June through November, peaking in late
              summer. The eastern Pacific runs mid-May through November. The
              northwest Pacific never really stops. Each basin has its rhythm,
              and watching several seasons on the globe teaches you to feel the
              pattern: the quiet spring, the first June systems, the September
              peak when the ocean is warmest.
            </p>
            <p>
              That rhythm is why the globe view matters. A forecast map shows
              you one storm; the globe shows you the season — three basins at
              different stages, trade winds feeding them all, and the whole
              machine running at once.
            </p>
            <p>
              Off-season, the tropics still teach. Watch the trade winds run
              uninterrupted for weeks, note where the convergence zone sits,
              and you&apos;ll understand why forecasters watch specific patches
              of ocean each spring for the season&apos;s first spin-up. By June,
              you&apos;ll read the basin like a local.
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            Hurricane tracker <span className="text-[#D4AF37]">FAQ</span>
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
            Follow the season <span className="text-[#D4AF37]">as it unfolds</span>
          </h2>
          <p className="text-white/55 mt-3 mb-8">
            Free forever. No account. Just the planet, live.
          </p>
          <Link
            href="/"
            className="inline-block px-8 py-4 rounded-2xl bg-[#D4AF37] text-black font-bold hover:brightness-110 transition"
          >
            Open the live hurricane map
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
              label: "Weather tracker",
              desc: "Live wind, storms and precipitation — the full atmosphere around the tropics.",
              href: "/weather-tracker",
            },
            {
              label: "Tornado tracker",
              desc: "Live NWS tornado warnings and watches — hurricanes breed tornadoes as they come ashore.",
              href: "/tornado-tracker",
            },
            {
              label: "Wildfire tracker",
              desc: "Fire season overlaps hurricane season — both layers live on the same globe.",
              href: "/wildfire-tracker",
            },
            {
              label: "Live cameras",
              desc: "74,229 public cameras — watch coastal conditions as a storm nears land.",
              href: "/cameras",
            },
            {
              label: "Features",
              desc: "Everything the globe can do — free forever layers and Pro intelligence tools.",
              href: "/features",
            },
          ]}
        />

        <TrackerClusterLinks />
      </div>

      <SiteFooter />
    </main>
  );
}
