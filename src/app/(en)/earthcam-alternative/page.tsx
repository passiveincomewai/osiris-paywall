import type { Metadata } from "next";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Globe,
  Plane,
  Satellite,
  BadgeCheck,
  Wallet,
  UserX,
  ChevronDown,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import RelatedLinks from "@/components/RelatedLinks";

export const metadata: Metadata = {
  title: "An EarthCam Alternative — 74,229 Live Cams",
  description:
    "WorldEye: an EarthCam alternative with 74,229 live public cameras in 109 countries on one 3D globe — free, no signup — plus flights, satellites, weather.",
  alternates: { canonical: "/earthcam-alternative" },
  openGraph: {
    title: "An EarthCam Alternative — 74,229 Live Cams | WorldEye",
    description:
      "74,229 live public cameras in 109 countries on a 3D globe — free, no signup. An alternative worth trying.",
    url: "/earthcam-alternative",
    type: "website",
  },
};

const DIMENSIONS = [
  {
    icon: Camera,
    title: "Camera count",
    desc: "WorldEye's catalogue indexes 74,229 live public cameras across 109 countries, with directory pages for 74 of them — from US DOT highway networks to city plazas, beaches, harbors and mountain resorts. A real, countable index that keeps growing as new public feeds are found and mapped.",
  },
  {
    icon: Wallet,
    title: "Price",
    desc: "Browsing the directory — every camera page, name and location — is free and uncapped, and the directory itself will never sit behind a paywall. Watching on the globe uses a free allowance: 5 camera opens per device, 10 with an email drop or a verified free account, and unlimited opens on Pro. Pro subscriptions fund the infrastructure that keeps it running.",
  },
  {
    icon: UserX,
    title: "Signup",
    desc: "Nothing to create, nothing to confirm. Open the map, zoom into a place, click a camera. The whole directory is browsable without an account.",
  },
  {
    icon: Globe,
    title: "The whole planet, not just cams",
    desc: "Cameras share the globe with live flights, satellites, weather, earthquakes and wildfires. Check the sky over a place and the street below it — in the same view, at the same moment.",
  },
];

const FAQS = [
  {
    q: "Is WorldEye really free for watching cameras?",
    a: "Yes — with a free allowance. Browsing the directory is free and uncapped forever, and watching on the globe starts with 5 free camera opens per device — 10 with an email drop or a verified free account — with unlimited opens on Pro. The directory itself will never sit behind a paywall; that's a standing commitment, not a trial.",
  },
  {
    q: "Is EarthCam bad?",
    a: "Not at all — EarthCam helped pioneer public webcam streaming and runs an enormous network of its own cameras. WorldEye is a different take: an aggregated directory of tens of thousands of public feeds from many operators, all plotted on one interactive 3D globe.",
  },
  {
    q: "Where do WorldEye's cameras come from?",
    a: "From public feeds their operators already publish openly — transport agencies, municipalities, resorts, ports and businesses. WorldEye collects, indexes and maps them; it doesn't operate its own camera network.",
  },
  {
    q: "Can I find cameras in my city?",
    a: "Search any place on the live map, or browse the camera directory by country — 109 countries are indexed, with dedicated pages for 74 of them. Coverage follows public infrastructure, so highways, city centers and tourist areas are the densest.",
  },
  {
    q: "Do I need to download an app?",
    a: "No. WorldEye runs in the browser on phone, tablet or desktop — the full camera directory is one tap away with nothing to install.",
  },
  {
    q: "What kinds of cameras are in the directory?",
    a: "Mostly working cameras rather than postcard ones: state and provincial DOT highway networks, city intersection and traffic grids, harbor and airport approaches, plus beaches, ski resorts, mountain passes and landmarks. The mix follows public infrastructure — which is why the feeds are genuinely useful for checking roads, weather and conditions, not just sightseeing.",
  },
  {
    q: "Does WorldEye carry EarthCam's own famous cameras?",
    a: "No. EarthCam produces and hosts its own marquee feeds, and those stay on EarthCam — WorldEye doesn't rebroadcast other networks' proprietary cameras. What WorldEye offers instead is breadth: tens of thousands of public feeds from hundreds of operators, searchable on one globe.",
  },
  {
    q: "Are the feeds really live?",
    a: "They are the operators' own live feeds — many are streaming video, and some public networks (Canadian provincial cameras are the classic example) publish still images that refresh every few minutes instead. Either way, what you see is the feed as published, and individual cameras can occasionally go dark for maintenance on the operator's side.",
  },
  {
    q: "What is the best free EarthCam alternative?",
    a: "For breadth, WorldEye: 74,229 public cameras from hundreds of operators in 109 countries on one free 3D globe, no signup. For a single famous view produced by one network, EarthCam itself is still the classic — the two products solve different problems, and the head-to-head comparison linked below lays out exactly where each is stronger.",
  },
  {
    q: "What should I try first on WorldEye?",
    a: "Open the globe and search a place you know — your city, a beach you're visiting, a pass you're about to drive. Seeing a familiar place live, from a camera that is really there, is the fastest way to understand what an index of 74,229 public feeds makes possible that a curated network doesn't try to.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "An EarthCam Alternative — WorldEye Live Cameras",
      description:
        "WorldEye: an EarthCam alternative with 74,229 live public cameras in 109 countries on one 3D globe — free, no signup.",
      url: "https://worldeye.app/earthcam-alternative",
      isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
    },
    {
      "@type": "FAQPage",
      url: "https://worldeye.app/earthcam-alternative",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function EarthcamAlternativePage() {
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

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#00E5FF] border border-[#00E5FF]/30 rounded-full px-4 py-1.5 mb-6">
            <Camera className="w-3.5 h-3.5" /> FREE ALTERNATIVE
          </p>
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
            74,229 live cameras. <span className="text-[#00E5FF]">One globe.</span>
          </h1>
          <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
            WorldEye is an alternative to webcam sites like EarthCam: tens of
            thousands of public live cameras from 109 countries, mapped on a
            3D globe you can spin — free, no signup.
          </p>
          <div className="mt-8">
            <Link
              href="/cameras"
              className="inline-block px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              Browse the camera directory — free
            </Link>
          </div>
        </div>

        {/* Honest framing */}
        <div className="mt-20 max-w-3xl mx-auto">
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 md:p-10">
            <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <BadgeCheck className="w-7 h-7 text-[#D4AF37] shrink-0" />
              The honest version
            </h2>
            <div className="mt-5 space-y-4 text-white/60 leading-relaxed">
              <p>
                EarthCam helped pioneer public webcam streaming and operates a
                huge network of its own cameras. We&apos;re not here to tear
                it down.
              </p>
              <p>
                WorldEye takes a different approach: instead of one
                operator&apos;s network, it aggregates tens of thousands of
                public feeds from hundreds of operators — transport agencies,
                cities, resorts, ports — and plots them all on one interactive
                globe. Different model, different strengths, and worth a look
                if you like watching the world.
              </p>
            </div>
          </div>
        </div>

        {/* Comparison dimensions */}
        <div className="mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            What makes it <span className="text-[#D4AF37]">different</span>
          </h2>
          <div className="mt-8 grid sm:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {DIMENSIONS.map((d) => (
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

        {/* Cameras in context */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            Cameras <span className="text-[#D4AF37]">in context</span>
          </h2>
          <div className="space-y-4 text-white/60 leading-relaxed">
            <p>
              A camera is more interesting when you know what&apos;s happening
              around it. On WorldEye, the camera you open sits on the same
              globe as the storm moving toward it, the earthquake that just
              shook the region, the flights passing overhead and the
              satellites crossing the sky.
            </p>
            <p>
              Storm rolling into Miami? Open a beach camera and watch the sky
              darken. Quake in the news? Look at the cameras near the
              epicenter. A plane you&apos;re tracking about to land? There may
              be a camera near the airport showing the actual runway weather.
              The directory is one layer of a living planet.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              {[
                { icon: Plane, label: "Live flights", href: "/live-flight-tracker" },
                { icon: Satellite, label: "Satellites", href: "/satellite-tracker" },
                { icon: Globe, label: "All features", href: "/features" },
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

        {/* Two kinds of camera network */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            Two kinds of <span className="text-[#D4AF37]">camera network</span>
          </h2>
          <div className="space-y-4 text-white/60 leading-relaxed">
            <p>
              The honest difference between EarthCam and WorldEye is
              production versus aggregation. EarthCam has spent decades
              building a network around cameras it installs, hosts and
              produces itself — marquee locations, polished presentation,
              its own apps. It is a broadcaster: fewer places, presented
              beautifully, under one brand.
            </p>
            <p>
              WorldEye is an index. Transport departments, cities, resorts,
              ports and businesses already publish tens of thousands of live
              feeds for their own reasons; WorldEye finds them, verifies
              them and plots every one on a single globe — 74,229 cameras in
              109 countries, most of them working infrastructure cameras
              rather than scenic productions. The presentation is plainer;
              the map is the product.
            </p>
            <p>
              Which you prefer depends on what a camera is for. If you want a
              famous view, beautifully produced, EarthCam is the classic. If
              you want to check the pass before you drive it, watch a storm
              reach a specific beach, or see what a city you&rsquo;ve never
              visited looks like this morning, an index of 74,229 feeds on a
              live globe is the tool. Plenty of people keep both — they were
              never really the same product.
            </p>
          </div>
        </div>

        {/* Start with a category */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            Start with a <span className="text-[#D4AF37]">category</span>
          </h2>
          <div className="space-y-4 text-white/60 leading-relaxed">
            <p>
              Most people arriving from a webcam network have a kind of place
              in mind rather than a specific camera. The directory&apos;s
              category walls are the shortcut: each one gathers the feeds of
              a type from across the whole index, so the comparison with a
              curated network is one click, not a search session.
            </p>
          </div>
          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            {[
              {
                label: "Beach webcams",
                desc: "Surf, sunrises and coastal weather from beach, boardwalk, pier and harbour cameras worldwide.",
                href: "/beach-webcams",
              },
              {
                label: "Airport webcams",
                desc: "Runway and approach views at airports around the world — watch the weather your flight is landing into.",
                href: "/airport-webcams",
              },
              {
                label: "Ski webcams",
                desc: "Resort and mountain-pass cameras for snow conditions, lifts and the drive up.",
                href: "/ski-webcams",
              },
              {
                label: "All live webcams",
                desc: "The full hub: traffic, cities, nature and landmarks — every category in the directory.",
                href: "/live-webcams",
              },
            ].map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="block rounded-3xl border border-white/10 bg-white/[0.02] p-6 hover:border-[#D4AF37]/40 transition"
              >
                <p className="font-semibold text-white/90">{c.label}</p>
                <p className="text-sm text-white/45 leading-relaxed mt-2">{c.desc}</p>
              </Link>
            ))}
          </div>
          <p className="text-white/60 leading-relaxed mt-6">
            Prefer the formal head-to-head? The{" "}
            <Link href="/compare/earthcam" className="text-[#D4AF37] hover:underline">
              WorldEye vs EarthCam comparison
            </Link>{" "}
            checks the two side by side — features, camera networks and
            pricing, with sources — and states plainly where EarthCam is
            stronger.
          </p>
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            Comparison <span className="text-[#D4AF37]">FAQ</span>
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
            Start <span className="text-[#D4AF37]">watching</span>
          </h2>
          <p className="text-white/55 mt-3 mb-8">
            74,229 cameras. One globe. Zero signup.
          </p>
          <Link
            href="/cameras"
            className="inline-block px-8 py-4 rounded-2xl bg-[#D4AF37] text-black font-bold hover:brightness-110 transition"
          >
            Open the camera directory
          </Link>
          <p className="mt-6 text-sm text-white/55 leading-relaxed">
            What paid plans add: unlimited camera opens and the OI assistant
            on any paid plan, and camera alerts on Pro and Ultra — see{" "}
            <Link href="/pricing" className="text-[#D4AF37] hover:underline">
              plans and pricing
            </Link>
            .
          </p>
          <p className="mt-6 text-sm text-white/40">
            Or just{" "}
            <Link href="/" className="text-[#D4AF37] hover:underline">
              open the live globe
            </Link>{" "}
            and explore.
          </p>
        </div>

        <RelatedLinks
          links={[
            {
              label: "WorldEye vs EarthCam",
              desc: "The full head-to-head: features, camera networks and pricing, checked against sources.",
              href: "/compare/earthcam",
            },
            {
              label: "Live cameras",
              desc: "The full camera directory — 74,229 live public cameras across 109 countries, on 74 country pages.",
              href: "/cameras",
            },
            {
              label: "Live webcam hub",
              desc: "Traffic, cities, nature and landmarks — the directory's starting point.",
              href: "/live-webcams",
            },
            {
              label: "Features",
              desc: "Everything the globe can do — free-to-browse layers and paid-plan intelligence tools.",
              href: "/features",
            },
            {
              label: "FAQ",
              desc: "Is the map free? What does Pro include? Answers to the common questions.",
              href: "/faq",
            },
          ]}
        />
      </div>

      <SiteFooter />
    </main>
  );
}
