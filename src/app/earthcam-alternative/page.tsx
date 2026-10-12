import type { Metadata } from "next";
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
  title: "An EarthCam Alternative — 40,000+ Live Cams | WorldEye",
  description:
    "WorldEye: an EarthCam alternative with 40,207 live public cameras in 105 countries on one 3D globe — free, no signup — plus flights, satellites, weather.",
  alternates: { canonical: "/earthcam-alternative" },
  openGraph: {
    title: "An EarthCam Alternative — 40,000+ Live Cams | WorldEye",
    description:
      "40,207 live public cameras in 105 countries on a 3D globe — free, no signup. An alternative worth trying.",
    url: "/earthcam-alternative",
    type: "website",
  },
};

const DIMENSIONS = [
  {
    icon: Camera,
    title: "Camera count",
    desc: "WorldEye's directory indexes 40,207 live public cameras across 105 countries — from US DOT highway networks to city plazas, beaches, harbors and mountain resorts. A real, countable index that keeps growing as new public feeds are found and mapped.",
  },
  {
    icon: Wallet,
    title: "Price",
    desc: "Every camera on WorldEye is free to watch — no account, no signup, no tiered plans. The directory will never sit behind a paywall; Pro subscriptions fund the infrastructure that keeps it running.",
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
    a: "Yes. All 40,207 cameras in the directory are free to watch with no account and no signup — forever. That's a standing commitment, not a trial.",
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
    a: "Search any place on the live map, or browse the camera directory by country — 105 countries are indexed, with dedicated pages for the 30 busiest. Coverage follows public infrastructure, so highways, city centers and tourist areas are the densest.",
  },
  {
    q: "Do I need to download an app?",
    a: "No. WorldEye runs in the browser on phone, tablet or desktop — the full camera directory is one tap away with nothing to install.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "An EarthCam Alternative — WorldEye Live Cameras",
      description:
        "WorldEye: an EarthCam alternative with 40,207 live public cameras in 105 countries on one 3D globe — free, no signup.",
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
          <span className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37]">WORLDEYE</span>
        </div>

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#00E5FF] border border-[#00E5FF]/30 rounded-full px-4 py-1.5 mb-6">
            <Camera className="w-3.5 h-3.5" /> FREE ALTERNATIVE
          </p>
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
            40,207 live cameras. <span className="text-[#00E5FF]">One globe.</span>
          </h1>
          <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
            WorldEye is an alternative to webcam sites like EarthCam: tens of
            thousands of public live cameras from 105 countries, mapped on a
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
            40,207 cameras. One globe. Zero signup.
          </p>
          <Link
            href="/cameras"
            className="inline-block px-8 py-4 rounded-2xl bg-[#D4AF37] text-black font-bold hover:brightness-110 transition"
          >
            Open the camera directory
          </Link>
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
              label: "Live cameras",
              desc: "The full camera directory — 40,207 live public cameras in 105 countries.",
              href: "/cameras",
            },
            {
              label: "Live webcam hub",
              desc: "Traffic, cities, nature and landmarks — the directory's starting point.",
              href: "/live-webcams",
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
      </div>

      <SiteFooter />
    </main>
  );
}
