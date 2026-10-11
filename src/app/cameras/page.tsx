import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Building2, Camera, Car, CloudSun,
  Landmark, Mountain, Plane, TreePine, Waves, Globe, Radio, Eye,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import RelatedLinks from "@/components/RelatedLinks";

export const metadata: Metadata = {
  title: "Live Cameras — Watch the World Live | WorldEye",
  description:
    "Browse ~36,000 live public cameras on the WorldEye 3D globe — traffic, city streets, nature and landmarks worldwide. Free forever, no signup, no account.",
  alternates: { canonical: "/cameras" },
  openGraph: {
    title: "Live Cameras — Watch the World Live | WorldEye",
    description:
      "36,000+ live street cameras worldwide — traffic, cities, nature, landmarks. Free on the WorldEye globe, no account needed.",
    url: "/cameras",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "WorldEye Live Cameras",
  description:
    "Browse ~36,000 live street cameras from around the world on the WorldEye map — traffic cams, city webcams, nature feeds and landmarks. Free forever, no signup.",
  url: "https://worldeye.app/cameras",
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const CATEGORIES = [
  { icon: Car, title: "Traffic & Highways", desc: "Live road conditions, intersections and highway feeds from transportation departments worldwide." },
  { icon: Building2, title: "City Streets", desc: "Downtown squares, boulevards and neighborhoods — the pulse of cities as it happens." },
  { icon: Landmark, title: "Landmarks", desc: "Iconic places and skylines, from famous plazas to historic districts." },
  { icon: TreePine, title: "Nature & Wildlife", desc: "Forests, parks and wilderness feeds — quiet corners of the planet, live." },
  { icon: Waves, title: "Beaches & Coasts", desc: "Surf, harbors and shorelines around the globe, updated in real time." },
  { icon: CloudSun, title: "Weather Cams", desc: "See current conditions with your own eyes before you head out." },
  { icon: Mountain, title: "Mountains & Ski", desc: "Alpine resorts, peaks and passes — check the snow before you go." },
  { icon: Plane, title: "Airports & Ports", desc: "Runways, terminals and shipping ports from public vantage points." },
];

export default function CamerasPage() {
  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100">
      <JsonLd data={jsonLd} />
      <div className="max-w-5xl mx-auto px-6 py-10 md:py-16">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-12">
          <Link href="/" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> Back to the map
          </Link>
          <span className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37]">WORLDEYE</span>
        </div>

        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
            <Camera className="w-3.5 h-3.5" /> LIVE CAMERA NETWORK
          </p>
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
            36,000+ live cameras. <span className="text-[#D4AF37]">One planet.</span>
          </h1>
          <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
            WorldEye aggregates tens of thousands of publicly available live street cameras
            into a single world live camera view — plotted on the 3D globe so you can jump
            from a Tokyo intersection to an Alpine pass in one click. It&apos;s an earth live
            cam experience built for curiosity.
          </p>
          <div className="mt-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              Open the live map <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-xs text-white/35 mt-3">Free forever · No account · No signup</p>
          </div>
        </div>

        {/* What the network is */}
        <div className="mt-20 grid md:grid-cols-3 gap-5">
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8">
            <span className="w-10 h-10 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center">
              <Globe className="w-5 h-5 text-[#D4AF37]" />
            </span>
            <h2 className="text-lg font-bold mt-5">What this network is</h2>
            <p className="text-sm text-white/55 leading-relaxed mt-2">
              A public webcam network: thousands of camera feeds that their operators —
              cities, transport agencies, resorts, businesses — already publish openly on
              the web, collected into one searchable layer on the WorldEye globe.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8">
            <span className="w-10 h-10 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center">
              <Eye className="w-5 h-5 text-[#D4AF37]" />
            </span>
            <h2 className="text-lg font-bold mt-5">Free for everyone</h2>
            <p className="text-sm text-white/55 leading-relaxed mt-2">
              Unlike the Pro intelligence tools, cameras will never sit behind a paywall.
              Every live camera on the map is free to watch — no account, no trial, no
              credit card. <Link href="/pricing" className="text-[#D4AF37] hover:underline">Pro</Link> funds
              the infrastructure that keeps them streaming.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8">
            <span className="w-10 h-10 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center">
              <Radio className="w-5 h-5 text-[#D4AF37]" />
            </span>
            <h2 className="text-lg font-bold mt-5">How to browse them</h2>
            <p className="text-sm text-white/55 leading-relaxed mt-2">
              Open the <Link href="/" className="text-[#D4AF37] hover:underline">live map</Link>,
              enable the camera layer, and click any camera marker — or zoom into a region
              and let the feeds load around you. Search any place to fly straight to its
              nearest cameras.
            </p>
          </div>
        </div>

        {/* Categories */}
        <div className="mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            Every kind of <span className="text-[#D4AF37]">live view</span>
          </h2>
          <p className="text-white/50 text-center mt-3 max-w-2xl mx-auto">
            The network spans traffic systems, city centers, wilderness and landmarks —
            whatever the world points a public camera at.
          </p>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {CATEGORIES.map((c) => (
              <div key={c.title} className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:border-[#D4AF37]/40 transition">
                <c.icon className="w-6 h-6 text-[#D4AF37]" />
                <h3 className="font-semibold text-white/90 mt-4">{c.title}</h3>
                <p className="text-sm text-white/45 mt-1.5 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Honest note */}
        <div className="mt-20 rounded-3xl border border-white/10 bg-white/[0.02] p-8 md:p-10 max-w-3xl mx-auto">
          <h2 className="text-xl font-bold">An honest note on availability</h2>
          <p className="text-sm text-white/55 leading-relaxed mt-3">
            Every feed in the network is operated by a third party — a city, an agency, a
            resort, a business — and streamed from their own servers. WorldEye doesn&apos;t
            own or control these cameras. Feeds can go offline, move, or change without
            notice, and coverage varies by region: some cities publish hundreds of public
            cameras, others publish none. If a camera you want isn&apos;t there, that&apos;s
            usually why — the network reflects what the world makes public, nothing more.
          </p>
          <p className="text-sm text-white/55 leading-relaxed mt-3">
            Camera imagery is provided as-is for general viewing. Please don&apos;t rely on
            these feeds for safety-critical decisions — check official sources for road
            closures, weather warnings and emergencies.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-20 text-center rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent p-10 md:p-14">
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight">
            The world is <span className="text-[#D4AF37]">live right now.</span>
          </h2>
          <p className="text-white/55 mt-4 max-w-xl mx-auto">
            Spin the globe, pick a continent, and start watching. No signup — the cameras
            are free for everyone, forever.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 mt-8 px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
          >
            Watch live cameras <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        <RelatedLinks
          links={[
            {
              label: "Live flight tracker",
              desc: "Real-time aircraft positions on the same free globe — the sky above the streets.",
              href: "/live-flight-tracker",
            },
            {
              label: "Satellite tracker",
              desc: "Watch the ISS, Starlink and thousands of satellites orbit overhead.",
              href: "/satellite-tracker",
            },
            {
              label: "Earthquake tracker",
              desc: "Quakes as they happen — magnitude, depth and location on the live map.",
              href: "/earthquake-tracker",
            },
            {
              label: "FAQ",
              desc: "Why is a camera offline? Is the map free? Answers to the common questions.",
              href: "/faq",
            },
          ]}
        />
      </div>
      <SiteFooter />
    </main>
  );
}
