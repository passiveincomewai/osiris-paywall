import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Globe,
  Plane,
  Satellite,
  CloudLightning,
  Flame,
  Activity,
  Eye,
  ChevronDown,
  MousePointerClick,
  Layers,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import RelatedLinks from "@/components/RelatedLinks";

export const metadata: Metadata = {
  title: "God's Eye View of Earth, Live — 76,000+ Cameras, Flights & Satellites",
  description:
    "WorldEye is a live god's eye view of Earth: 76,000+ public cameras, live flights, satellites, weather, earthquakes and wildfires on one 3D globe — free, no signup, nothing to install.",
  alternates: { canonical: "/gods-eye-view" },
  openGraph: {
    title: "God's Eye View of Earth, Live — 76,000+ Cameras, Flights & Satellites | WorldEye",
    description:
      "One live 3D globe with 76,000+ public cameras, live flights, satellites, weather, earthquakes and wildfires. Free, no signup, nothing to install.",
    url: "/gods-eye-view",
    type: "website",
  },
};

const LAYERS = [
  {
    icon: Camera,
    title: "76,000+ live cameras",
    desc: "Public cameras from 105 countries — highways, city plazas, beaches, harbors, airports and mountain resorts — plotted where they actually stand. Click one and watch that exact spot, live.",
  },
  {
    icon: Plane,
    title: "Live flights",
    desc: "Aircraft tracked in real time via ADS-B, arcing over the curve of the Earth. Follow the sky over a city, then open a camera near the airport to see the weather it's landing into.",
  },
  {
    icon: Satellite,
    title: "Satellites overhead",
    desc: "Live satellite positions, including the ISS, crossing the same globe — so you can see what's passing over any place on Earth right now.",
  },
  {
    icon: CloudLightning,
    title: "Weather, live",
    desc: "Weather systems and severe-weather alerts on the map, in the same view as the cameras underneath them. Watch a storm arrive on a beach cam as it happens.",
  },
  {
    icon: Activity,
    title: "Earthquakes",
    desc: "Fresh seismic activity from the USGS feed, sized by magnitude. When a quake makes the news, look at the cameras near the epicenter.",
  },
  {
    icon: Flame,
    title: "Wildfires",
    desc: "Active fire detections from NASA FIRMS satellite data, mapped as they are spotted from orbit — alongside the ground cameras that show the smoke.",
  },
];

const FAQS = [
  {
    q: "What is a god's eye view?",
    a: "In film, a god's eye view is a shot taken from directly overhead — an omniscient angle that sees everything at once. Applied to Earth, it means the whole planet in a single view: every layer of live activity — cameras, aircraft, satellites, weather, earthquakes, fires — visible together instead of one feed at a time. WorldEye is that idea as a working website: one interactive 3D globe carrying the live planet.",
  },
  {
    q: "Is WorldEye's god's eye view free?",
    a: "Yes. The globe, live cameras, flights, satellites, transit, weather, earthquakes and wildfires are free with no account and no signup — basic search included. A Pro subscription adds the intelligence toolkit — OSINT tools, maritime and cyber intel layers, satellite map view, the live traffic layer, advanced search filters and the AI analyst — and funds the infrastructure.",
  },
  {
    q: "Do I need to install anything?",
    a: "No. WorldEye runs entirely in the browser on phone, tablet or desktop. Open the page and the live globe is there — nothing to download, no API keys to configure, no setup.",
  },
  {
    q: "How is this different from the open-source project called God's Eye View?",
    a: "God's Eye View is an open-source project you install and run yourself — powerful, and a great build-it-yourself option; its photorealistic 3D tiles need a Cesium ion token or your own Google Maps API key. WorldEye is an independent hosted alternative built on the same idea — a separate product, not affiliated with the project — already running, free in the browser, with a much larger camera network (76,000+ feeds vs the project's roughly 4,000-camera CCTV mesh). We compare the options honestly on our God's Eye View alternatives page.",
  },
  {
    q: "Where does the live data come from?",
    a: "Public feeds published openly by their operators and agencies: ADS-B aircraft broadcasts, USGS earthquake data, NASA FIRMS fire detections, public weather services, and tens of thousands of public cameras run by transport agencies, cities, resorts and businesses. WorldEye aggregates and maps them on one globe.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "God's Eye View of Earth, Live — WorldEye",
      description:
        "WorldEye is a live god's eye view of Earth: 76,000+ public cameras, live flights, satellites, weather, earthquakes and wildfires on one 3D globe — free, no signup.",
      url: "https://worldeye.app/gods-eye-view",
      isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
    },
    {
      "@type": "FAQPage",
      url: "https://worldeye.app/gods-eye-view",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function GodsEyeViewPage() {
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
            <Eye className="w-3.5 h-3.5" /> THE WHOLE PLANET, LIVE
          </p>
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
            A god&apos;s eye view of Earth. <span className="text-[#00E5FF]">Live.</span>
          </h1>
          <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
            WorldEye puts the whole living planet in one view: 76,000+ public
            cameras, live flights, satellites, weather, earthquakes and
            wildfires on a single interactive 3D globe — free, in your browser,
            with nothing to install.
          </p>
          <div className="mt-8">
            <Link
              href="/"
              className="inline-block px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              Open the live globe — free
            </Link>
          </div>
        </div>

        {/* What the term means */}
        <div className="mt-20 max-w-3xl mx-auto">
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 md:p-10">
            <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <Globe className="w-7 h-7 text-[#D4AF37] shrink-0" />
              What &ldquo;god&apos;s eye view&rdquo; actually means
            </h2>
            <div className="mt-5 space-y-4 text-white/60 leading-relaxed">
              <p>
                Filmmakers use the term for the shot from directly above — the
                omniscient angle that sees the whole scene at once instead of
                one character&apos;s slice of it. For centuries it was a
                metaphor. With live public data, it stopped being one.
              </p>
              <p>
                Right now, thousands of aircraft are broadcasting their
                positions, satellites are crossing every sky, weather systems
                are moving, the ground is trembling somewhere, and tens of
                thousands of public cameras are quietly watching streets,
                beaches and harbors. A god&apos;s eye view of Earth is simply
                all of that, on one screen, at the same moment. That is what
                WorldEye is built to be.
              </p>
            </div>
          </div>
        </div>

        {/* Layers */}
        <div className="mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            Everything happening, <span className="text-[#D4AF37]">one view</span>
          </h2>
          <p className="text-white/50 text-center mt-4 max-w-2xl mx-auto">
            Each layer is live public data. Together they&apos;re the closest
            thing to watching the planet breathe.
          </p>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {LAYERS.map((d) => (
              <div
                key={d.title}
                className="rounded-3xl border border-white/10 bg-white/[0.02] p-7"
              >
                <d.icon className="w-6 h-6 text-[#00E5FF] mb-4" />
                <p className="font-semibold text-white/90 text-lg mb-2">{d.title}</p>
                <p className="text-sm text-white/45 leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            No setup. <span className="text-[#D4AF37]">Just look.</span>
          </h2>
          <div className="space-y-4 text-white/60 leading-relaxed">
            <p>
              There is no account to create, no software to install and no API
              key to configure. Open WorldEye and the globe is already live:
              spin it, zoom into a continent, toggle the layers you care
              about, and click anything — a plane, a satellite, a camera — to
              see it up close.
            </p>
            <p>
              The context is the point. A camera is more interesting when you
              can see the storm moving toward it. A flight means more when the
              destination&apos;s weather and runway cameras are in the same
              view. Single-purpose sites show you one feed; the god&apos;s eye
              view shows you the world the feed lives in.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              {[
                { icon: MousePointerClick, label: "Open the globe", href: "/" },
                { icon: Camera, label: "Browse 76,000+ cameras", href: "/cameras" },
                { icon: Layers, label: "All features", href: "/features" },
              ].map((c) => (
                <Link
                  key={c.label}
                  href={c.href}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 hover:border-[#D4AF37]/40 transition"
                >
                  <c.icon className="w-4 h-4 text-[#D4AF37]" /> {c.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            God&apos;s eye view <span className="text-[#D4AF37]">FAQ</span>
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
            See the whole planet <span className="text-[#D4AF37]">at once</span>
          </h2>
          <p className="text-white/55 mt-3 mb-8">
            One globe. Every live layer. Zero signup.
          </p>
          <Link
            href="/"
            className="inline-block px-8 py-4 rounded-2xl bg-[#D4AF37] text-black font-bold hover:brightness-110 transition"
          >
            Open WorldEye
          </Link>
          <p className="mt-6 text-sm text-white/40">
            Comparing options? See the{" "}
            <Link href="/alternatives/gods-eye-view" className="text-[#D4AF37] hover:underline">
              God&apos;s Eye View alternatives
            </Link>{" "}
            page.
          </p>
        </div>

        <RelatedLinks
          links={[
            {
              label: "God's Eye View alternatives",
              desc: "Want the self-hosted open-source project instead? The honest comparison of every way to get this view.",
              href: "/alternatives/gods-eye-view",
            },
            {
              label: "Live cameras",
              desc: "The full camera directory — 76,000+ live public cameras in 105 countries.",
              href: "/cameras",
            },
            {
              label: "An EarthCam alternative",
              desc: "How WorldEye's aggregated camera globe compares with the classic webcam network.",
              href: "/earthcam-alternative",
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
