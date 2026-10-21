import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Radio,
  Satellite,
  Plane,
  Eye,
  ShieldAlert,
  ChevronDown,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import RelatedLinks from "@/components/RelatedLinks";

export const metadata: Metadata = {
  title: "What Is ADS-B? How Flight Tracking Works",
  description:
    "ADS-B explained: how aircraft transponders broadcast position, altitude and speed, why the data is public, and its limits. Read, then watch it live.",
  alternates: { canonical: "/what-is-ads-b" },
  openGraph: {
    title: "What Is ADS-B? How Flight Tracking Works | WorldEye",
    description:
      "How every flight tracker actually works — ADS-B transponders, receiver networks and why the data is public.",
    url: "/what-is-ads-b",
    type: "website",
  },
};

const HOW_IT_WORKS = [
  {
    icon: Satellite,
    title: "The aircraft knows where it is",
    desc: "A GPS receiver on the aircraft computes its exact position, altitude and velocity — many times per second, with no ground equipment needed.",
  },
  {
    icon: Radio,
    title: "The transponder shouts it out",
    desc: "An ADS-B transponder broadcasts that data over the air, unencrypted, roughly twice a second: callsign, position, altitude, speed, heading and intent.",
  },
  {
    icon: Eye,
    title: "Receivers listen",
    desc: "A global network of ground receivers — many run by volunteers and enthusiasts — picks up the broadcasts and forwards them to aggregation services.",
  },
  {
    icon: Plane,
    title: "The map draws the sky",
    desc: "WorldEye plots those reports as live aircraft on the 3D globe. The whole chain from transponder to your screen takes seconds.",
  },
];

const LIMITATIONS = [
  {
    title: "Not every aircraft broadcasts",
    desc: "Most commercial aircraft carry ADS-B, but some older aircraft use only the older Mode S transponder (no GPS position broadcast), and military or sensitive flights may not broadcast at all or be filtered from public feeds.",
  },
  {
    title: "Coverage is receiver-dependent",
    desc: "A broadcast can only be plotted if a receiver heard it. Oceans, deserts and polar regions have sparser ground coverage — satellite-based ADS-B reception fills many of the gaps, but the map is densest over land.",
  },
  {
    title: "It's not radar",
    desc: "Classic radar bounces signals off aircraft; ADS-B relies on the aircraft reporting its own position. If the GPS or transponder fails, that aircraft simply goes quiet on the map.",
  },
  {
    title: "Broadcasts can be absent or spoofed",
    desc: "Because the signal is unencrypted and the system is cooperative, aircraft can disable transponders, and researchers have demonstrated spoofed broadcasts. For navigation and safety it's fine; for forensics, treat it as a signal, not proof.",
  },
];

const FAQS = [
  {
    q: "What does ADS-B stand for?",
    a: "Automatic Dependent Surveillance–Broadcast. Automatic — it works without pilot input. Dependent — it depends on the aircraft's own navigation source (GPS). Surveillance — air traffic control uses it to watch traffic. Broadcast — the data is transmitted openly for anyone to receive.",
  },
  {
    q: "Why is flight tracking data public?",
    a: "Because ADS-B broadcasts are unencrypted radio signals anyone can receive — they were designed that way so any aircraft or ground station in range can use them for collision awareness. Receiver networks aggregate those public signals into the live feeds every flight tracker uses.",
  },
  {
    q: "Can ADS-B track military aircraft?",
    a: "Sometimes. Many military aircraft carry ADS-B transponders and show up like any other traffic when they broadcast. Others operate with transponders off, use encrypted military-only systems, or are filtered out of public feeds before they reach sites like WorldEye.",
  },
  {
    q: "Is ADS-B the same as the data air traffic control uses?",
    a: "It's the same broadcast — controllers increasingly rely on ADS-B alongside radar. But controllers see the raw, regulated feed; public trackers see aggregated, sometimes delayed or filtered versions of it.",
  },
  {
    q: "Can I receive ADS-B signals myself?",
    a: "Yes, and it's a popular hobby. A software-defined radio dongle and a small antenna are enough to pick up aircraft broadcasts from over the horizon, and many enthusiasts feed their receivers into the same networks that power public flight trackers.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "What Is ADS-B? How Flight Tracking Works",
      description:
        "ADS-B explained: how aircraft transponders broadcast position, altitude and speed, why the data is public, and its limits.",
      url: "https://worldeye.app/what-is-ads-b",
      isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
    },
    {
      "@type": "FAQPage",
      url: "https://worldeye.app/what-is-ads-b",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function WhatIsAdsBPage() {
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
        <div className="text-center max-w-2xl mx-auto">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#00E5FF] border border-[#00E5FF]/30 rounded-full px-4 py-1.5 mb-6">
            <Radio className="w-3.5 h-3.5" /> EXPLAINER
          </p>
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
            What is <span className="text-[#00E5FF]">ADS-B?</span>
          </h1>
          <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
            The open radio protocol behind every flight tracker on Earth. How
            aircraft broadcast their position to the world — and why the whole
            system is public by design.
          </p>
          <div className="mt-8">
            <Link
              href="/live-flight-tracker"
              className="inline-block px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              Watch ADS-B live — free, no signup
            </Link>
          </div>
        </div>

        {/* The acronym */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            The name says <span className="text-[#D4AF37]">everything</span>
          </h2>
          <div className="space-y-4 text-white/60 leading-relaxed">
            <p>
              <strong className="text-white/90">Automatic:</strong> it runs
              without the pilot doing anything. Once the transponder is on,
              the aircraft reports itself continuously.
            </p>
            <p>
              <strong className="text-white/90">Dependent:</strong> it depends
              on the aircraft&apos;s own navigation — GPS — rather than on
              ground radar measuring it from below.
            </p>
            <p>
              <strong className="text-white/90">Surveillance:</strong> air
              traffic control uses it to keep aircraft safely separated,
              alongside (and increasingly instead of) traditional radar.
            </p>
            <p>
              <strong className="text-white/90">Broadcast:</strong> the data
              goes out in the open, for anyone within radio range to receive —
              other aircraft, ground stations, and the enthusiast receiver on
              someone&apos;s rooftop.
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            From transponder <span className="text-[#D4AF37]">to your screen</span>
          </h2>
          <div className="mt-8 grid sm:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {HOW_IT_WORKS.map((s, i) => (
              <div
                key={s.title}
                className="rounded-3xl border border-white/10 bg-white/[0.02] p-7"
              >
                <div className="flex items-center gap-4 mb-4">
                  <span className="w-8 h-8 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] font-bold text-sm flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <s.icon className="w-6 h-6 text-[#00E5FF]" />
                </div>
                <p className="font-semibold text-white/90 text-lg mb-2">{s.title}</p>
                <p className="text-sm text-white/45 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Why public */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            Why it&apos;s <span className="text-[#D4AF37]">public</span>
          </h2>
          <div className="space-y-4 text-white/60 leading-relaxed">
            <p>
              ADS-B was built for collision avoidance. For it to work, every
              aircraft needs to hear every other aircraft nearby — which means
              the signal can&apos;t be encrypted or restricted. The moment you
              make the broadcast receivable by all aircraft, you&apos;ve made
              it receivable by everyone.
            </p>
            <p>
              So the data was never really &quot;leaked&quot; — it was born
              open. Receiver networks simply do what any aircraft could do:
              listen, collect, and share. Flight trackers are downstream
              beneficiaries of a safety system that had to be public to
              function.
            </p>
          </div>
        </div>

        {/* Out/In and frequencies */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            ADS-B Out, ADS-B In — <span className="text-[#D4AF37]">and two frequencies</span>
          </h2>
          <div className="space-y-4 text-white/60 leading-relaxed">
            <p>
              Everything on this page so far is <strong className="text-white/90">ADS-B Out</strong>:
              the aircraft broadcasting itself. There is also{" "}
              <strong className="text-white/90">ADS-B In</strong> — receiving
              other aircraft&apos;s broadcasts (and, in some regions,
              ground-uplinked traffic and weather) to display them in the
              cockpit. Out is what flight trackers feed on; In is what makes
              the system a two-way safety tool for pilots.
            </p>
            <p>
              The broadcasts ride two links. Most of the world — and all
              airliners — use <strong className="text-white/90">1090 MHz Extended Squitter</strong>,
              an evolution of the Mode S transponder signal. The United
              States additionally runs <strong className="text-white/90">978 MHz UAT</strong>{" "}
              (Universal Access Transceiver) for general-aviation aircraft
              flying below 18,000 feet, which can also carry uplinked weather
              and traffic. A receiver network that listens to both — as the
              public networks feeding WorldEye do — sees the airliner at
              cruising altitude and the training aircraft on a local circuit
              in the same picture.
            </p>
            <p>
              And when an aircraft has a Mode S transponder but no ADS-B
              position broadcast, networks can still find it with{" "}
              <strong className="text-white/90">multilateration (MLAT)</strong>:
              several receivers timestamp the same signal, and the differences
              in arrival time pin down where the signal came from. It is
              slower and less precise than a GPS broadcast, and it needs at
              least four receivers in range — which is why MLAT coverage
              thins out exactly where receiver coverage does.
            </p>
          </div>
        </div>

        {/* Limitations */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 flex items-center justify-center gap-3">
            <ShieldAlert className="w-7 h-7 text-[#D4AF37]" />
            The <span className="text-[#D4AF37]">limitations</span>
          </h2>
          <div className="space-y-4">
            {LIMITATIONS.map((l) => (
              <div
                key={l.title}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
              >
                <p className="font-semibold text-white/90 mb-2">{l.title}</p>
                <p className="text-sm text-white/50 leading-relaxed">{l.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* On WorldEye */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            Reading ADS-B <span className="text-[#D4AF37]">on WorldEye</span>
          </h2>
          <div className="space-y-4 text-white/60 leading-relaxed">
            <p>
              On the <Link href="/live-flight-tracker" className="text-[#D4AF37] hover:underline">live flight tracker</Link>,
              every aircraft you see is this system at work: a transponder
              broadcasting a few times a second, a receiver hearing it, and
              the position landing on the globe within seconds. Clicking a
              plane surfaces the broadcast&apos;s payload — callsign,
              altitude, ground speed, heading — and where the feed provides
              it, the route it is flying.
            </p>
            <p>
              It also explains the map&apos;s quirks. A flight that freezes
              over the mid-Atlantic has flown beyond ground-receiver range.
              A helicopter working low over a city may flicker in and out at
              the edge of coverage. A famous private jet that never appears
              is filtered at the source. None of those are the map failing —
              they are the physics and the politics of an open broadcast
              system, visible in the data itself.
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            ADS-B <span className="text-[#D4AF37]">FAQ</span>
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
            Now go <span className="text-[#D4AF37]">watch it work</span>
          </h2>
          <p className="text-white/55 mt-3 mb-8">
            Thousands of ADS-B broadcasts, live on one globe. Free forever, no account.
          </p>
          <Link
            href="/live-flight-tracker"
            className="inline-block px-8 py-4 rounded-2xl bg-[#D4AF37] text-black font-bold hover:brightness-110 transition"
          >
            Open the live flight tracker
          </Link>
          <p className="mt-6 text-sm text-white/40">
            Curious about the ocean equivalent?{" "}
            <Link href="/what-is-ais" className="text-[#D4AF37] hover:underline">
              Read what AIS is
            </Link>
          </p>
        </div>

        <RelatedLinks
          links={[
            {
              label: "Flight tracker",
              desc: "Live aircraft on a 3D globe, powered by the broadcasts this page explains.",
              href: "/live-flight-tracker",
            },
            {
              label: "What is AIS?",
              desc: "The maritime twin of ADS-B — how ships broadcast their position at sea.",
              href: "/what-is-ais",
            },
            {
              label: "Satellite tracker",
              desc: "Thousands of satellites overhead — the ISS, Starlink and more, live.",
              href: "/satellite-tracker",
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
