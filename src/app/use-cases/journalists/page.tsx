import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  Eye,
  Globe,
  Newspaper,
  Plane,
  ShieldCheck,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import RelatedLinks from "@/components/RelatedLinks";

export const metadata: Metadata = {
  title: "WorldEye for Journalists — Verify News with Live Cameras & Flights",
  description:
    "Journalists use WorldEye to verify breaking-news footage against live cameras, track flights of interest via ADS-B, and watch disasters unfold in real time.",
  alternates: { canonical: "/use-cases/journalists" },
  openGraph: {
    title: "WorldEye for Journalists",
    description:
      "Verify breaking-news footage against live cameras, track flights of interest, and monitor disasters as they unfold.",
    type: "website",
    url: "/use-cases/journalists",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "WorldEye for Journalists",
  description:
    "How journalists use WorldEye to verify breaking-news footage against live cameras, track flights of interest, and monitor disasters in real time.",
  url: "https://worldeye.app/use-cases/journalists",
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const FAQS = [
  {
    q: "Is it ethical to use public webcams in reporting?",
    a: "These are cameras their operators already publish openly — traffic departments, municipalities, businesses — and WorldEye collects the streams as-is. Using them to confirm conditions in a public place during a news event is standard OSINT practice. The ethical line is publishing identifiable private individuals who aren't part of the story; blur faces and plates when the people aren't the news.",
  },
  {
    q: "Can WorldEye identify people in camera footage?",
    a: "No. WorldEye shows public camera streams as-is; it has no facial recognition and cannot identify individuals. If your story needs a person's identity, that is traditional reporting work — interviews, records, official sources — not something the map can do.",
  },
  {
    q: "How do I verify a viral video with WorldEye?",
    a: "Pull up the live camera nearest the claimed location and compare: landmarks, street layout, current weather and light conditions, and what's actually happening there now. A video claiming to show a live protest at noon in a city where the camera shows an empty street at that exact time fails the most basic check.",
  },
  {
    q: "Is the flight tracking real-time?",
    a: "Positions come from ADS-B signals and update within seconds to minutes. It's live enough to confirm a flight's general location and movement during breaking news, but don't treat the exact position as courtroom-grade precision.",
  },
  {
    q: "Can I use WorldEye screenshots in my publication?",
    a: "The underlying camera streams belong to their operators, not to WorldEye. Screenshots for internal verification are fine; for publication, check your outlet's policies and the camera operator's terms — and credit the source feed, not just the map.",
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
    title: "Verify footage before you publish",
    body: "A viral clip claims to show a street in Kyiv, a flood in Houston, a protest in Madrid. Before your outlet runs it, open the live camera nearest that spot on WorldEye and compare what's actually there: the street layout, the landmarks, the weather, the light. Geography, weather and time-of-day are brutally honest witnesses — mislabeled footage fails this check in seconds. It won't replace full forensic verification, but it catches the cheapest fakes fast.",
  },
  {
    icon: Plane,
    title: "Track flights of interest",
    body: "During evacuations, breaking incidents, or stories involving aircraft movements, WorldEye's live flight layer shows ADS-B positions on the same globe as everything else. Cross-reference a claimed flight with its actual track — or set context for a story about an airport closure, a diverted route, or relief flights heading into a disaster zone.",
  },
  {
    icon: Eye,
    title: "Watch disasters as they unfold",
    body: "Earthquakes, wildfires, hurricanes, floods: the quake layer and live cameras turn a developing story into something you can watch. See smoke on the horizon from a hillside camera, check traffic feeds for evacuation-route congestion, or confirm shaking reports against the earthquake feed before your first update goes out.",
  },
  {
    icon: ShieldCheck,
    title: "OSINT ethics: verify, don't dox",
    body: "The power here comes with one hard rule: verify before publishing, and never use public cameras to identify or target private individuals. The cameras watch public infrastructure, not people. Don't zoom in on identifiable faces or license plates, don't publish anyone's location from a camera, and don't treat a camera feed as proof of who someone is — it's proof of what a place looks like right now, nothing more.",
  },
];

export default function JournalistsPage() {
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
            <Newspaper className="w-3.5 h-3.5" /> FOR JOURNALISTS
          </p>
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
            Verify the news <span className="text-[#D4AF37]">against the planet.</span>
          </h1>
          <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
            A viral video says it happened somewhere, right now. WorldEye gives you
            40,000+ live public cameras, real-time flight positions and disaster
            layers on one globe — so you can check the claim against reality before
            you publish it.
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

        {/* Workflow */}
        <section className="mt-16 md:mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold">A 60-second verification routine</h2>
          <ol className="mt-6 space-y-3">
            {[
              "Find the claimed location on the globe and open the nearest live cameras.",
              "Compare landmarks, weather, light and activity against the footage.",
              "Check the earthquake and flight layers for corroborating context.",
              "If it matches, note the camera source and timestamp for your editor. If it doesn't, you've got a story.",
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
          <h2 className="text-2xl md:text-3xl font-bold">Journalist FAQs</h2>
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
            <h2 className="text-2xl md:text-3xl font-bold">Check the next tip live.</h2>
            <p className="text-white/55 mt-3 max-w-xl mx-auto">
              Open the globe — free, no signup — and verify a location in under a minute.
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
              desc: "Real-time ADS-B aircraft positions on the globe — the same feed journalists use to track flights of interest.",
              href: "/live-flight-tracker",
            },
            {
              label: "Earthquake tracker",
              desc: "Live seismic activity plotted worldwide — confirm shaking reports before the first update goes out.",
              href: "/earthquake-tracker",
            },
            {
              label: "All use cases",
              desc: "What researchers, travelers, storm watchers and educators do with WorldEye.",
              href: "/use-cases",
            },
            {
              label: "Cameras",
              desc: "40,000+ live public webcams worldwide — the verification layer, free for everyone.",
              href: "/cameras",
            },
          ]}
        />
      </div>

      <SiteFooter />
    </main>
  );
}
