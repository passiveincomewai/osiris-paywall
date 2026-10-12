import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  Globe,
  Luggage,
  MapPin,
  Plane,
  Route,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import RelatedLinks from "@/components/RelatedLinks";

export const metadata: Metadata = {
  title: "WorldEye for Travelers — Check Destinations Live Before You Go",
  description:
    "Travelers use WorldEye to preview destinations with live cameras, check road and weather conditions, and track flights for pickups and delays.",
  alternates: { canonical: "/use-cases/travelers" },
  openGraph: {
    title: "WorldEye for Travelers",
    description:
      "Preview destinations with live cameras, check road conditions and weather, and track flights — before you go.",
    type: "website",
    url: "/use-cases/travelers",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "WorldEye for Travelers",
  description:
    "How travelers use WorldEye to preview destinations with live cameras, check road and weather conditions, and track flights.",
  url: "https://worldeye.app/use-cases/travelers",
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const FAQS = [
  {
    q: "Can I see the beach before I book the hotel?",
    a: "Often. Coastal cities with public beach and boardwalk cameras — plus harbor and promenade feeds — let you see the actual sand, surf and crowds, not the hotel's brochure photos. Zoom to the coastline on the map and look for camera markers near the water.",
  },
  {
    q: "How do I check road conditions for a road trip?",
    a: "Find your route's highway cameras — US states contribute over 23,000 road feeds, and many countries have dense DOT networks. Check mountain passes for snow, desert highways for dust storms, and city ring roads for rush-hour congestion the morning you leave.",
  },
  {
    q: "Can I track a flight for an airport pickup?",
    a: "Yes. Search the flight or just watch the destination airport on the flight layer — you'll see the aircraft's live position, so you can time your drive to the terminal instead of circling the arrivals loop. It also shows delays before the airline's app bothers to tell you.",
  },
  {
    q: "Does WorldEye actually help with packing?",
    a: "Better than a forecast alone. A weather layer tells you it's 8°C and raining in the city you're visiting; a live street camera shows you whether people are in heavy coats or light jackets. That's the difference between overpacking and getting it right.",
  },
  {
    q: "Is there a cost to use WorldEye while traveling?",
    a: "No. The whole map is free with no account — it works in a phone browser anywhere with a connection. The optional Pro plan adds intelligence tools for power users, but travelers need nothing more than the free globe.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

const SECTIONS = [
  {
    icon: Camera,
    title: "Preview destinations through live cameras",
    body: "Brochure photos are ten years old and shot at golden hour. A live camera shows the beach as it is this morning — the surf, the crowds, the cloud cover. Scout the neighborhood around your hotel, the walk to the beach, the plaza where you'll have dinner. You'll arrive already oriented, and you'll never book a 'quiet street' that a traffic camera reveals as a six-lane arterial.",
  },
  {
    icon: Route,
    title: "Check road conditions before you drive",
    body: "Mountain passes in April, desert highways in a wind advisory, the ring road at Friday rush hour — the camera grid is a road trip's best friend. Check your route's feeds the morning you leave, not from the shoulder of the road. If the pass cameras show whiteout and chain controls, you'll know before you're in it.",
  },
  {
    icon: Plane,
    title: "Track flights for pickups and delays",
    body: "Picking someone up? Watch their aircraft's live position on the globe and time your drive to the terminal — no more circling arrivals or paying for an hour of short-term parking. Flying yourself? The flight layer shows your inbound aircraft's progress, so you know about a delay before the gate agent announces it.",
  },
  {
    icon: Luggage,
    title: "Pack from live conditions, not averages",
    body: "A forecast says 8°C and rain. A live street camera shows you whether locals are in parkas or windbreakers — and whether the 'rain' is a drizzle or a downpour. Five minutes of camera-hopping across your destination beats guessing from a temperature number, and your suitcase will thank you.",
  },
];

export default function TravelersPage() {
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
          <Link href="/use-cases" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> All use cases
          </Link>
          <span className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37]">WORLDEYE</span>
        </div>

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
            <MapPin className="w-3.5 h-3.5" /> FOR TRAVELERS
          </p>
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
            Visit first. <span className="text-[#D4AF37]">Then go.</span>
          </h1>
          <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
            WorldEye puts 40,000+ live cameras, weather and flight tracking on one
            free globe — so you can preview your destination, check the roads and
            time your airport pickup before you leave home.
          </p>
        </div>

        {/* Sections */}
        <div className="mt-16 md:mt-20 grid sm:grid-cols-2 gap-5">
          {SECTIONS.map((s) => (
            <div
              key={s.title}
              className="rounded-3xl border border-white/10 bg-white/[0.02] p-7"
            >
              <s.icon className="w-7 h-7 text-[#D4AF37] mb-4" />
              <h2 className="font-semibold text-white/90 text-lg">{s.title}</h2>
              <p className="text-sm text-white/50 mt-2 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        {/* Pre-trip routine */}
        <section className="mt-16 md:mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold">The night-before-travel check</h2>
          <ol className="mt-6 space-y-3">
            {[
              "Zoom to your destination and open three cameras: the beach or main square, a street near your hotel, and the road you'll drive.",
              "Watch what people are wearing — then pack.",
              "Check the weather layer along your flight path and your driving route for storms.",
              "If someone's flying in, note their flight on the tracker and plan your airport run from its live position.",
              "Save the camera views near your hotel — after a long flight, a familiar street on the map feels like home.",
            ].map((step, i) => (
              <li key={i} className="flex gap-4 items-start rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <span className="w-7 h-7 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] font-bold text-sm flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="text-white/70 text-sm pt-1">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* FAQs */}
        <section className="mt-16 md:mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold">Traveler FAQs</h2>
          <div className="mt-6 space-y-4">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-5 group"
              >
                <summary className="font-semibold cursor-pointer list-none flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
                  {f.q}
                </summary>
                <p className="text-sm text-white/55 leading-relaxed mt-3 pl-7">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-16 md:mt-20">
          <div className="rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold">Your destination is live right now.</h2>
            <p className="text-white/55 mt-3 max-w-xl mx-auto">
              Open the globe — free, no signup — and take a look before you book.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl border border-white/20 text-white font-semibold hover:bg-white/5 transition"
              >
                <Globe className="w-4 h-4" /> Open the live map
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#D4AF37] text-black font-bold hover:brightness-110 transition"
              >
                Upgrade to Pro <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        <RelatedLinks
          links={[
            {
              label: "Live flight tracker",
              desc: "Real-time aircraft positions — time your airport pickup or watch your inbound flight.",
              href: "/live-flight-tracker",
            },
            {
              label: "Cameras",
              desc: "40,000+ live public webcams worldwide — preview your destination street by street.",
              href: "/cameras",
            },
            {
              label: "All use cases",
              desc: "What researchers, journalists, storm watchers and educators do with WorldEye.",
              href: "/use-cases",
            },
            {
              label: "FAQ",
              desc: "Is the map free? What does Pro include? Straight answers to common questions.",
              href: "/faq",
            },
          ]}
        />
      </div>

      <SiteFooter />
    </main>
  );
}
