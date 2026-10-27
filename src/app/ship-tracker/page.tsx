import VoiceQA from "@/components/seo/VoiceQA";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import { mergePlaceFaqs } from "@/lib/place-answers";
import { getVoiceQuestionsByIds } from "@/lib/voice-questions";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Ship,
  MapPin,
  Gauge,
  Compass,
  Anchor,
  Radio,
  Eye,
  TrendingUp,
  ChevronDown,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import BreadcrumbLd from "@/components/BreadcrumbLd";
import RelatedLinks from "@/components/RelatedLinks";
import TrackerClusterLinks from "@/components/TrackerClusterLinks";

export const metadata: Metadata = {
  title: "Live Ship Tracker — Marine Vessel Tracking",
  description:
    "Track ships live on a 3D globe: position, speed, heading and vessel type via AIS. A free live ship tracker — no signup, no account, no cost.",
  alternates: { canonical: "/ship-tracker" },
  openGraph: {
    title: "Live Ship Tracker | WorldEye",
    description:
      "Ships in motion, live on a 3D globe — position, speed, heading and vessel type via AIS. Free, no signup.",
    url: "/ship-tracker",
    type: "website",
  },
};

const DATA_POINTS = [
  {
    icon: MapPin,
    title: "Position",
    desc: "Every vessel plotted at its reported location — watch traffic bunch up at straits, canals and port approaches in real time.",
  },
  {
    icon: Gauge,
    title: "Speed",
    desc: "Live speed over ground, so you can tell a full-steam container ship apart from a tanker idling at anchor.",
  },
  {
    icon: Compass,
    title: "Heading",
    desc: "Direction of travel for each vessel, making it easy to read which way a shipping lane is actually flowing right now.",
  },
  {
    icon: Ship,
    title: "Vessel type",
    desc: "Container ships, tankers, bulk carriers, passenger ferries, tugs and fishing boats — each categorized by what it is.",
  },
  {
    icon: Anchor,
    title: "Destination & port",
    desc: "Where vessels report they're headed, alongside ports and maritime chokepoints plotted on the globe.",
  },
  {
    icon: Radio,
    title: "Fresh updates",
    desc: "AIS positions refresh on the order of seconds for moving vessels, so the picture you see keeps pace with reality.",
  },
  {
    icon: Radio,
    title: "Vessel identity",
    desc: "AIS broadcasts each ship's identity — name, call sign and MMSI number — so the dot on the map is a real, registered vessel, not an anonymous blip.",
  },
  {
    icon: Anchor,
    title: "Underway vs. at anchor",
    desc: "Speed and status tell the story: a container ship making 20 knots versus one sitting at anchor outside the port, waiting for a berth. Congestion becomes visible.",
  },
  {
    icon: Eye,
    title: "Chokepoint context",
    desc: "Straits, canals and port approaches are marked on the globe, so you can see why fifty ships are queuing in one narrow stretch of water.",
  },
];

const USE_CASES = [
  {
    icon: Eye,
    title: "Port & coast watchers",
    desc: "Ship spotting from your desk. Follow the big container ships and tankers into port, or watch a busy strait at rush hour.",
  },
  {
    icon: TrendingUp,
    title: "Logistics watchers",
    desc: "See global trade in motion — traffic piling up at major chokepoints tells you things spreadsheets don't.",
  },
  {
    icon: Anchor,
    title: "Enthusiasts & travelers",
    desc: "Waiting on a ferry? Curious what that cruise ship is? Pull up the sea around you and see what's moving.",
  },
  {
    icon: Ship,
    title: "Maritime journalists",
    desc: "When a shipping incident makes the news — a grounding, a collision, a blocked canal — watch the traffic around it in real time instead of waiting for the morning's satellite photo.",
  },
  {
    icon: TrendingUp,
    title: "Supply-chain watchers",
    desc: "Port congestion is an early signal. Ships stacking up at anchor outside major ports has preceded every recent supply crunch — the map shows the queue forming while it's still just a queue.",
  },
  {
    icon: Compass,
    title: "Sailors and cruisers",
    desc: "Planning a passage? See what the commercial traffic is doing in the waters you'll cross. The big ships follow predictable lanes, and knowing those lanes keeps a small boat safer.",
  },
];

const FAQS = [
  {
    q: "Is the ship tracker free?",
    a: "The WorldEye globe itself is free — no account, no signup. Maritime vessel tracking is part of WorldEye's premium maritime intel feed, which is included with a Pro subscription. Everything else on the map — flights, satellites, weather, quakes, wildfires and 74,229 public cameras — is free forever.",
  },
  {
    q: "How do ships show up on the map?",
    a: "Large commercial vessels broadcast their position, speed and heading using AIS transponders — radio signals picked up by a worldwide network of receivers and satellites. WorldEye's maritime layer plots those reports on the globe as they arrive.",
  },
  {
    q: "What details can I see for each vessel?",
    a: "Position, speed over ground, heading, vessel type (container ship, tanker, bulk carrier, ferry, tug and more), and the destination the vessel has reported — plus ports and maritime chokepoints as context.",
  },
  {
    q: "Are all ships shown?",
    a: "Only vessels that are broadcasting AIS. Large commercial ships are required to carry AIS transponders, but small private boats generally aren't — and vessels can go dark outside receiver coverage or switch their transponder off, so some areas are quieter than others.",
  },
  {
    q: "Is this the same technology as marine-traffic websites?",
    a: "Yes, it's the same underlying data: AIS broadcasts aggregated by receiver networks. WorldEye's difference is the context — ships on the same 3D globe as flights overhead, weather systems, live cameras in ports and satellite imagery.",
  },
  {
    q: "How often do vessel positions update?",
    a: "Moving vessels typically broadcast every few seconds; anchored or slow vessels report less often. What you see keeps pace with reality closely enough to watch traffic flow — though it's a picture of traffic, not a navigation instrument.",
  },
  {
    q: "Can I see a ship's cargo?",
    a: "No. AIS broadcasts identity, position, speed, heading and destination — not what's in the holds. Cargo manifests are commercial and customs data, not part of the broadcast.",
  },
  {
    q: "Why do some ships disappear from the map?",
    a: "A vessel goes dark when it leaves receiver coverage, switches off its transponder, or has a faulty unit. Open ocean far from shipping lanes and deliberate switch-offs are the two usual reasons — the map shows what's broadcasting, nothing more.",
  },
  {
    q: "Can I follow a specific named ship?",
    a: "If you know roughly where it operates, zoom to that stretch of water and look for it among the traffic — its name, type, speed and reported destination are all part of the AIS broadcast. If it's broadcasting and within receiver coverage, you'll see it.",
  },
];

/* Canonical-dataset answers merged into this page's single FAQPage
   (src/lib/place-answers.ts merge rule); the visible VoiceQA block
   renders exactly the surviving entries. */
const VOICE_MERGED = mergePlaceFaqs(FAQS, getVoiceQuestionsByIds(["follow-a-ship-at-sea", "track-a-cruise-ship"]));

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "WorldEye Live Ship Tracker",
      description:
        "Track ships live on a 3D globe: position, speed, heading and vessel type via AIS. Maritime vessel tracking on WorldEye.",
      url: "https://worldeye.app/ship-tracker",
      isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
    },
    {
      "@type": "FAQPage",
      url: "https://worldeye.app/ship-tracker",
      mainEntity: VOICE_MERGED.merged.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function ShipTrackerPage() {
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

        <BreadcrumbLd trail={[{ label: "Ship Tracker" }]} />

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#00E5FF] border border-[#00E5FF]/30 rounded-full px-4 py-1.5 mb-6">
            <Ship className="w-3.5 h-5" /> LIVE MARITIME DATA
          </p>
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
            The oceans, <span className="text-[#00E5FF]">live.</span>
          </h1>
          <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
            A live ship tracker on a 3D globe. Vessels plotted from AIS
            transponder broadcasts — position, speed, heading and type — with
            ports and chokepoints for context.
          </p>
          <div className="mt-8">
            <Link
              href="/pricing"
              className="inline-block px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              Unlock the maritime feed with Pro
            </Link>
          </div>
        </div>

        {/* The one-map answer */}
        <div className="mt-16 md:mt-20 max-w-3xl mx-auto rounded-3xl border border-[#D4AF37]/25 bg-[#D4AF37]/[0.04] p-8 md:p-10">
          <h2 className="text-xl md:text-2xl font-bold">
            One live map for ships — and everything around them
          </h2>
          <p className="mt-3 text-white/60 leading-relaxed">
            WorldEye&apos;s ship tracker plots vessels in real time from AIS
            transponder broadcasts — position, speed, heading and ship type —
            on the same 3D globe as its free{" "}
            <Link href="/live-flight-tracker" className="text-[#D4AF37] hover:underline">
              live flights
            </Link>
            ,{" "}
            <Link href="/satellite-tracker" className="text-[#D4AF37] hover:underline">
              satellites
            </Link>{" "}
            and{" "}
            <Link href="/live-webcams" className="text-[#D4AF37] hover:underline">
              74,229 public cameras
            </Link>
            . Follow a vessel to its destination and you can{" "}
            <Link href="/port-webcams" className="text-[#D4AF37] hover:underline">
              watch the same ships arrive on port cameras
            </Link>
            . The globe itself is free with no signup; live maritime tracking
            is one of the premium intel feeds included with{" "}
            <Link href="/pricing" className="text-[#D4AF37] hover:underline">
              VIP Pro
            </Link>
            .
          </p>
        </div>

        {/* What you can see */}
        <div className="mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            What you see for <span className="text-[#D4AF37]">every vessel</span>
          </h2>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {DATA_POINTS.map((d) => (
              <div
                key={d.title}
                className="rounded-3xl border border-white/10 bg-white/[0.02] p-6"
              >
                <d.icon className="w-6 h-6 text-[#00E5FF] mb-4" />
                <p className="font-semibold text-white/90 mb-2">{d.title}</p>
                <p className="text-sm text-white/45 leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            How ship tracking <span className="text-[#D4AF37]">works</span>
          </h2>
          <div className="space-y-4 text-white/60 leading-relaxed">
            <p>
              Nearly every large vessel at sea carries an AIS transponder —
              Automatic Identification System. It continuously broadcasts the
              ship&apos;s identity, position, speed, heading and intended
              destination over VHF radio, primarily so nearby ships and port
              authorities know what&apos;s around them.
            </p>
            <p>
              A global network of shore-based receivers and satellites picks up
              those broadcasts and publishes them as open data feeds. WorldEye
              takes that stream and plots each vessel on the same 3D globe as
              everything else: flights overhead, storms forming, satellites
              passing by, and the ports themselves marked with chokepoint
              context.
            </p>
            <p>
              The maritime feed — full vessel traffic with port and chokepoint
              intelligence — is part of the{" "}
              <Link href="/pricing" className="text-[#D4AF37] hover:underline">
                Pro intel toolkit
              </Link>
              . The rest of the globe, including live flights and 74,229 public
              cameras, is free for everyone with no account.
            </p>
            <p>
              What AIS doesn&apos;t show matters too. Small craft, fishing boats
              and military vessels often don&apos;t broadcast — or broadcast
              only intermittently — so an empty stretch of water isn&apos;t proof
              of empty water. And a vessel&apos;s reported destination is entered
              by the crew; it&apos;s usually right and occasionally aspirational.
              Read the traffic, not just the labels.
            </p>
          </div>
        </div>

        {/* Use cases */}
        <div className="mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            Why people <span className="text-[#D4AF37]">watch the seas</span>
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
            Ship tracker <span className="text-[#D4AF37]">FAQ</span>
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
            Watch the world&apos;s <span className="text-[#D4AF37]">trade routes</span>
          </h2>
          <p className="text-white/55 mt-3 mb-8">
            The full maritime feed — vessels, ports and chokepoints — is part of
            WorldEye Pro.
          </p>
          <Link
            href="/pricing"
            className="inline-block px-8 py-4 rounded-2xl bg-[#D4AF37] text-black font-bold hover:brightness-110 transition"
          >
            See Pro plans
          </Link>
          <p className="mt-6 text-sm text-white/40">
            Just want to explore?{" "}
            <Link href="/" className="text-[#D4AF37] hover:underline">
              Open the free globe
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
              desc: "Thousands of satellites overhead — the ISS, Starlink and more, live on the globe.",
              href: "/satellite-tracker",
            },
            {
              label: "Features",
              desc: "Everything the globe can do — free forever layers and Pro intelligence tools.",
              href: "/features",
            },
            {
              label: "Pricing",
              desc: "Weekly, monthly and annual Pro plans — the maritime feed is included.",
              href: "/pricing",
            },
            {
              label: "Open the map",
              desc: "The free live 3D globe — flights, weather, cameras and more, no signup.",
              href: "/",
            },
            {
              label: "Live flight tracker",
              desc: "Aircraft live on the same globe — the air picture to pair with the sea picture.",
              href: "/live-flight-tracker",
            },
            {
              label: "Best ship tracking tools",
              desc: "The best ship tracking tools compared — AIS trackers, port data and free globes.",
              href: "/best-ship-tracking-tools",
            },
          ]}
        />

        <TrackerClusterLinks current="/ship-tracker" />
      </div>

      <SiteFooter />
    </main>
  );
}
