import VoiceQA from "@/components/seo/VoiceQA";
import { mergePlaceFaqs } from "@/lib/place-answers";
import { getVoiceQuestionsByIds } from "@/lib/voice-questions";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ChevronDown, Eye, Radar, ShieldAlert, Tornado } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import BreadcrumbLd from "@/components/BreadcrumbLd";
import RelatedLinks from "@/components/RelatedLinks";
import LiveTornadoBoard from "@/components/events/LiveTornadoBoard";

export const metadata: Metadata = {
  title: "Tornado Tracker — Live Warnings, Watches & Reported Tornadoes",
  description:
    "Live tornado tracker: every NWS tornado warning and watch in effect right now, plus the tornadoes reported to the Storm Prediction Center in the last three days. Free — no signup. Always follow official NWS guidance.",
  alternates: { canonical: "/tornado-tracker" },
  openGraph: {
    title: "Tornado Tracker — Live Warnings & Reports | WorldEye",
    description:
      "Tornado warnings and watches as the NWS issues them, and reported tornadoes from SPC — free, no signup.",
    url: "/tornado-tracker",
    type: "website",
  },
};

const FAQS = [
  {
    q: "What's the difference between a tornado warning and a tornado watch?",
    a: "A watch means conditions are favorable — be ready, know where you'll shelter, and keep an eye on the weather. A warning means a tornado is happening or radar shows one forming — take shelter immediately. Warnings are the ones that should change what you're doing right now.",
  },
  {
    q: "What does 'reported tornado' mean on this page?",
    a: "The Storm Prediction Center collects local storm reports as severe weather unfolds — from trained spotters, law enforcement, emergency managers, media and the public. A report records that someone reported a tornado at that place and time. It is preliminary and unverified: whether a tornado actually touched down, and how strong it was, is decided later by a National Weather Service damage survey. This page never calls a report 'confirmed'.",
  },
  {
    q: "Why doesn't a reported tornado have an EF rating?",
    a: "EF ratings come from surveying the damage afterward, which takes days. Reports filed during the storm usually carry no rating (SPC lists them as UNK — unknown). When the report text itself describes survey findings, we quote it verbatim and attributed to SPC; the rating still belongs to the NWS survey, not to this page.",
  },
  {
    q: "How current is this page?",
    a: "The alerts board reads the National Weather Service's active-alerts feed — the same one the WorldEye globe uses — and re-checks every two minutes. SPC publishes its storm reports through the day as they are collected; the reports list re-reads them every 30 minutes.",
  },
  {
    q: "Should I use this page during a tornado emergency?",
    a: "Use it to understand what's happening — then act on official guidance. If a warning covers your area, shelter first and read later. Your local NWS office, NOAA Weather Radio and wireless emergency alerts are the authoritative channels; WorldEye is a window onto their data, never a replacement.",
  },
  {
    q: "Is the tornado tracker free?",
    a: "Yes — completely. The weather layers are part of the free map: no account, no signup, no credit card.",
  },
];

/* Canonical-dataset answers merged into this page's single FAQPage
   (src/lib/place-answers.ts merge rule); the visible VoiceQA block
   renders exactly the surviving entries. */
const VOICE_MERGED = mergePlaceFaqs(FAQS, getVoiceQuestionsByIds(["tornado-warnings-live"]));

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "WorldEye Live Tornado Tracker",
      description:
        "Live NWS tornado warnings and watches, plus preliminary tornado reports collected by the Storm Prediction Center. Free tornado tracker — no signup.",
      url: "https://worldeye.app/tornado-tracker",
      isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
    },
    {
      "@type": "FAQPage",
      url: "https://worldeye.app/tornado-tracker",
      mainEntity: VOICE_MERGED.merged.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function TornadoTrackerPage() {
  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100 relative overflow-x-clip">
      <JsonLd data={jsonLd} />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-15 blur-[120px] bg-[#e11d48]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[300px] rounded-full opacity-10 blur-[100px] bg-[#00E5FF]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-10 md:py-16">
        <div className="flex items-center justify-between mb-12">
          <Link href="/" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> Back to the map
          </Link>
          <span className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37]">WORLDEYE</span>
        </div>

        <BreadcrumbLd trail={[{ label: "Tornado Tracker" }]} />

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-red-300 border border-red-400/30 rounded-full px-4 py-1.5 mb-6">
            <Tornado className="w-3.5 h-3.5" /> LIVE TORNADO DATA
          </p>
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
            Tornadoes, <span className="text-red-300">as they happen.</span>
          </h1>
          <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
            Every tornado warning and watch the National Weather Service has
            in effect right now — and every tornado reported to the Storm
            Prediction Center in the last three days. Free, no signup.
          </p>
          <p className="mt-5 inline-flex items-center gap-2 text-sm text-amber-200/90 border border-amber-400/30 bg-amber-500/10 rounded-2xl px-4 py-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0" /> If a warning covers
            where you are, shelter first — this page will still be here after.
          </p>
        </div>

        {/* Live board */}
        <div className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">
            Live <span className="text-[#D4AF37]">right now</span>
          </h2>
          <LiveTornadoBoard />
        </div>

        {/* How it works */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            How this <span className="text-[#D4AF37]">works</span>
          </h2>
          <div className="space-y-4 text-white/60 leading-relaxed">
            <p>
              Two NOAA systems feed this page. The{" "}
              <strong className="text-white/85">National Weather Service</strong>{" "}
              issues warnings and watches as meteorologists spot rotation on
              radar or get confirmation from the ground — those alerts appear
              here within a couple of minutes, with their expiry times,
              affected areas and the NWS&apos;s own safety instructions.
            </p>
            <p>
              Alongside the alerts, the{" "}
              <strong className="text-white/85">Storm Prediction Center</strong>{" "}
              collects local storm reports in real time: what spotters, deputies,
              firefighters and residents reported seeing, pinned to a place and
              a time (UTC). That is the raw material of tornado science — and
              like all raw material, it&apos;s preliminary. NWS survey teams
              verify and rate tornadoes afterward; until they do, everything
              here is labeled <em>reported</em>, because that&apos;s exactly
              what it is.
            </p>
            <p>
              Both feeds are the same ones the WorldEye globe draws its
              weather layer from, so the page and the map always tell the
              same story.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-5 mt-10">
            {[
              {
                icon: Radar,
                title: "Warnings in minutes",
                desc: "NWS alerts re-checked every two minutes, with radar-indicated vs observed called out.",
              },
              {
                icon: Eye,
                title: "Reports, honestly labeled",
                desc: "SPC storm reports shown as reports — never dressed up as confirmed tornadoes.",
              },
              {
                icon: ShieldAlert,
                title: "Official words, verbatim",
                desc: "Alert text and safety instructions are the NWS's own, unedited, with a link to the source.",
              },
            ].map((c) => (
              <div key={c.title} className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
                <c.icon className="w-6 h-6 text-[#D4AF37] mb-4" />
                <p className="font-semibold text-white/90 mb-2">{c.title}</p>
                <p className="text-sm text-white/45 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            Tornado tracker <span className="text-[#D4AF37]">FAQ</span>
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
            Severe weather on <span className="text-[#D4AF37]">the globe</span>
          </h2>
          <p className="text-white/55 mt-3 mb-8">
            Warnings, storms, fires and quakes on one live map — free forever.
          </p>
          <Link
            href="/?layers=weather"
            className="inline-block px-8 py-4 rounded-2xl bg-[#D4AF37] text-black font-bold hover:brightness-110 transition"
          >
            Open the live weather map
          </Link>
        </div>

        {VOICE_MERGED.surviving.length > 0 && (
          <VoiceQA entries={VOICE_MERGED.surviving} />
        )}

        <RelatedLinks
          links={[
            {
              label: "Weather tracker",
              desc: "The full atmosphere — wind, storms and precipitation on the same globe.",
              href: "/weather-tracker",
            },
            {
              label: "Hurricane tracker",
              desc: "Tropical systems as they develop — tornadoes often spin out of their rain bands.",
              href: "/hurricane-tracker",
            },
            {
              label: "Earthquake tracker",
              desc: "Quakes as they happen — magnitude, depth and location from USGS.",
              href: "/earthquake-tracker",
            },
            {
              label: "Wildfire tracker",
              desc: "Active fires and smoke — the other half of the natural-hazard picture.",
              href: "/wildfire-tracker",
            },
          ]}
        />
      </div>

      <SiteFooter />
    </main>
  );
}
