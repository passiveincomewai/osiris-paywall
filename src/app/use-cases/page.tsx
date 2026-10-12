import type { Metadata } from "next";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CloudLightning,
  Fingerprint,
  GraduationCap,
  Luggage,
  Plane,
  Ship,
  Sparkles,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import RelatedLinks from "@/components/RelatedLinks";

export const metadata: Metadata = {
  title: "Use Cases — Who Uses WorldEye | WorldEye",
  description:
    "How people use WorldEye's free live globe: OSINT research, trip planning, storm watching, flight tracking, classrooms and maritime monitoring — real workflows.",
  alternates: { canonical: "/use-cases" },
  openGraph: {
    title: "WorldEye Use Cases — Who Uses WorldEye",
    description:
      "OSINT researchers, travelers, storm watchers, aviation enthusiasts, educators and maritime watchers — what they do with WorldEye's live globe.",
    url: "/use-cases",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "WorldEye Use Cases",
  description:
    "What people actually do with WorldEye: OSINT research and journalism, trip planning, weather and disaster watching, aviation tracking, education, and maritime monitoring.",
  url: "https://worldeye.app/use-cases",
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

type Persona = {
  icon: typeof Plane;
  accent: "gold" | "cyan";
  title: string;
  who: string;
  does: string;
  features: string[];
  links: { label: string; href: string }[];
  deepDive?: { label: string; href: string };
};

const PERSONAS: Persona[] = [
  {
    icon: Fingerprint,
    accent: "gold",
    title: "OSINT researchers & journalists",
    who: "Investigators, analysts and reporters verifying what is really happening on the ground.",
    does: "Cross-reference live street cameras with earthquake, wildfire and weather layers to verify events as they unfold. Run DNS, WHOIS and SSL lookups with the in-browser OSINT toolkit, and follow GDELT, cyber-threat and live-news feeds for early signal.",
    features: ["OSINT toolkit (Pro)", "36,000+ CCTV cameras", "GDELT & live news feeds"],
    links: [
      { label: "Explore Pro tools", href: "/pricing" },
      { label: "Feature tour", href: "/features" },
    ],
    deepDive: { label: "Read the journalist's guide →", href: "/use-cases/journalists" },
  },
  {
    icon: Luggage,
    accent: "cyan",
    title: "Travelers",
    who: "People planning trips — or armchair-exploring the planet from the couch.",
    does: "Check live street cameras at a destination before booking, watch weather systems moving across a route, and follow flights in real time. All free, no account needed.",
    features: ["36,000+ CCTV cameras", "Weather layers", "Live flight tracking"],
    links: [
      { label: "Browse live cameras", href: "/cameras" },
      { label: "Open the live map", href: "/" },
    ],
    deepDive: { label: "Read the traveler's guide →", href: "/use-cases/travelers" },
  },
  {
    icon: CloudLightning,
    accent: "cyan",
    title: "Weather & disaster watchers",
    who: "Storm chasers, preparedness-minded households and anyone who wants to see severe weather as it happens.",
    does: "Watch earthquakes, wildfires and severe weather light up the globe in real time, then drop into street cameras near the affected area to see conditions with their own eyes.",
    features: ["Earthquake, wildfire & weather layers", "36,000+ CCTV cameras", "Live news feed"],
    links: [
      { label: "Browse live cameras", href: "/cameras" },
      { label: "Open the live map", href: "/" },
    ],
    deepDive: { label: "Read the preparedness guide →", href: "/use-cases/emergency-preparedness" },
  },
  {
    icon: Plane,
    accent: "cyan",
    title: "Aviation enthusiasts",
    who: "Plane spotters and flight trackers who follow the skies.",
    does: "Follow live aircraft positions and telemetry rendered on the 3D globe — watch traffic flow over oceans, circle holding patterns and line up final approaches.",
    features: ["Live flight tracking", "Interactive 3D globe", "Satellite view (Pro)"],
    links: [
      { label: "Open the live map", href: "/" },
      { label: "Go Pro", href: "/pricing" },
    ],
  },
  {
    icon: GraduationCap,
    accent: "cyan",
    title: "Educators & students",
    who: "Teachers and students exploring geography, earth science and current events.",
    does: "Turn the classroom into a mission-control view of the planet: trace fault lines during a quake, follow a hurricane's path, or compare day and night across continents — free, with no signup friction.",
    features: ["Interactive 3D globe", "Natural hazard layers", "Satellite tracking"],
    links: [
      { label: "Open the live map", href: "/" },
      { label: "Feature tour", href: "/features" },
    ],
    deepDive: { label: "Read the educator's guide →", href: "/use-cases/educators" },
  },
  {
    icon: Ship,
    accent: "gold",
    title: "Maritime watchers",
    who: "Ship spotters, coastal observers and logistics watchers.",
    does: "Follow vessel traffic with the maritime tracking feed, watch straits and shipping lanes, and layer weather data over busy sea routes.",
    features: ["Maritime tracking feed (Pro)", "Weather layers", "Global search (Pro)"],
    links: [
      { label: "Explore Pro tools", href: "/pricing" },
      { label: "Feature tour", href: "/features" },
    ],
  },
];

function PersonaCard({ persona }: { persona: Persona }) {
  const gold = persona.accent === "gold";
  return (
    <article className={`rounded-3xl border p-7 md:p-8 flex flex-col transition ${
      gold
        ? "border-[#D4AF37]/25 bg-gradient-to-b from-[#D4AF37]/[0.06] to-transparent hover:border-[#D4AF37]/50"
        : "border-white/10 bg-white/[0.02] hover:border-[#00E5FF]/40"
    }`}>
      <span className={`w-11 h-11 rounded-2xl border flex items-center justify-center mb-5 ${
        gold ? "bg-[#D4AF37]/10 border-[#D4AF37]/25" : "bg-[#00E5FF]/10 border-[#00E5FF]/25"
      }`}>
        <persona.icon className={`w-5 h-5 ${gold ? "text-[#D4AF37]" : "text-[#00E5FF]"}`} />
      </span>
      <h2 className="text-xl font-bold text-white/90 mb-3">{persona.title}</h2>
      <p className={`text-sm font-medium mb-3 ${gold ? "text-[#D4AF37]/90" : "text-[#00E5FF]/90"}`}>
        {persona.who}
      </p>
      <p className="text-sm text-white/55 leading-relaxed mb-5">{persona.does}</p>
      <ul className="space-y-2 mb-6">
        {persona.features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-white/70">
            <Check className={`w-4 h-4 shrink-0 ${gold ? "text-[#D4AF37]" : "text-[#00E5FF]"}`} />
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-wrap gap-3 pt-2">
        {persona.links.map((l) => (
          <a
            key={l.href + l.label}
            href={l.href}
            className={`inline-flex items-center gap-1.5 text-sm font-semibold transition group ${
              gold ? "text-[#D4AF37] hover:underline" : "text-[#00E5FF] hover:underline"
            }`}
          >
            {l.label}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </a>
        ))}
      </div>
      {persona.deepDive && (
        <a
          href={persona.deepDive.href}
          className={`mt-4 inline-flex items-center gap-1.5 text-sm font-bold transition group ${
            gold ? "text-[#D4AF37]" : "text-[#00E5FF]"
          } hover:underline`}
        >
          {persona.deepDive.label}
        </a>
      )}
    </article>
  );
}

export default function UseCasesPage() {
  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100 relative overflow-x-clip">
      <JsonLd data={jsonLd} />
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-20 blur-[120px] bg-[#D4AF37]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[300px] rounded-full opacity-10 blur-[100px] bg-[#00E5FF]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-10 md:py-16">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-12">
          <a href="/" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> Back to the map
          </a>
          <span className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37]">WORLDEYE</span>
        </div>

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#00E5FF] border border-[#00E5FF]/30 rounded-full px-4 py-1.5 mb-6">
            <Sparkles className="w-3.5 h-3.5" /> USE CASES
          </p>
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
            One live planet, <span className="text-[#D4AF37]">endless reasons</span> to watch it.
          </h1>
          <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
            Researchers verify breaking events. Travelers scout destinations.
            Storm watchers track the skies. Here is what people actually do with WorldEye.
          </p>
        </div>

        {/* Persona cards */}
        <section className="mt-14 md:mt-16 grid md:grid-cols-2 gap-5">
          {PERSONAS.map((p) => (
            <PersonaCard key={p.title} persona={p} />
          ))}
        </section>

        {/* Bottom CTA */}
        <section className="mt-16 md:mt-20 text-center rounded-3xl border border-[#D4AF37]/25 bg-gradient-to-b from-[#D4AF37]/[0.07] to-transparent p-10 md:p-14">
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight">
            Find your reason to <span className="text-[#D4AF37]">look down</span>.
          </h2>
          <p className="text-white/55 mt-4 max-w-xl mx-auto">
            Start free — the globe, flights, cameras, satellites and hazard layers
            need no account. Upgrade when you want the intelligence toolkit.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)] text-center"
            >
              Open the live map
            </a>
            <a
              href="/pricing"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl border border-white/15 text-white/70 font-semibold hover:bg-white/5 transition text-center"
            >
              See Pro pricing
            </a>
          </div>
        </section>

        <RelatedLinks
          links={[
            {
              label: "Features",
              desc: "The full tour — free forever layers and the Pro intelligence toolkit.",
              href: "/features",
            },
            {
              label: "Live cameras",
              desc: "36,000+ public cameras travelers and researchers use to verify the world.",
              href: "/cameras",
            },
            {
              label: "FAQ",
              desc: "Is the map free? What does Pro include? The common questions, answered.",
              href: "/faq",
            },
            {
              label: "Blog",
              desc: "Guides on OSINT, flight tracking and the public camera network.",
              href: "/blog",
            },
          ]}
        />
      </div>

      <SiteFooter />
    </main>
  );
}
