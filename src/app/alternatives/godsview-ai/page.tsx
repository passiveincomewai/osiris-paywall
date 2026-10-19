import type { Metadata } from "next";
import Link from "next/link";
import {
  Globe,
  MonitorSmartphone,
  Code2,
  CloudSun,
  Eye,
  Camera,
  Plane,
  Satellite,
} from "lucide-react";
import {
  IntentShell,
  IntentBreadcrumbs,
  ReviewedStamp,
  HeroCtas,
  MidCta,
  webPageLd,
  itemListLd,
} from "@/components/SeoIntentLayout";
import RelatedLinks from "@/components/RelatedLinks";

export const metadata: Metadata = {
  title: "GodsView AI Alternatives in 2026 — Hosted Live Globes Compared",
  description:
    "GodsView AI is a hosted live map aimed at 'God's Eye View online' searches. Compare the alternatives: WorldEye's 3D globe with 76,000+ cameras, GodsView AI itself, and the original open-source God's Eye View.",
  alternates: { canonical: "/alternatives/godsview-ai" },
  openGraph: {
    title: "GodsView AI Alternatives in 2026 — Hosted Live Globes Compared | WorldEye",
    description:
      "Two hosted globes and one open-source project, compared honestly: cameras, layers, pricing and who each is really for.",
    url: "/alternatives/godsview-ai",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "GodsView AI Alternatives in 2026 — Hosted Live Globes Compared | WorldEye",
    description:
      "GodsView AI vs WorldEye vs the original God's Eye View: hosted live globes compared on cameras, layers and price.",
  },
};

const OPTIONS = [
  {
    icon: Globe,
    name: "WorldEye",
    tag: "Best for cameras + a real 3D globe",
    href: "/",
    linkLabel: "Open the live globe",
    body: "A hosted 3D globe whose centerpiece is the camera network: 76,000+ live public feeds across 105 countries, browsable by country and city, fused with live flights, satellites, weather radar, earthquakes and wildfires. Free with no signup; Pro ($3.99/week, $9.99/month, $59.99/year) adds an OSINT toolkit, cyber and maritime intel feeds, live news and an AI analyst — at published prices, on the site's own keys.",
  },
  {
    icon: MonitorSmartphone,
    name: "GodsView AI (the original)",
    tag: "Best for an operations-desk layout",
    href: "https://godsviewai.com/",
    linkLabel: "GodsView AI's site",
    body: "A hosted live map that opens free with no account: a 2D operations map plus a 3D globe, streaming ADS-B flights, AIS ships, USGS earthquakes and NASA FIRMS fires, with search by callsign, MMSI, camera or city. Its Premium tier adds watchlists, a kiosk mode for always-on displays and heavier ops layers (it doesn't publish prices on its landing page). What it doesn't publish either: a camera count — its cameras are a search layer, not a browsable network.",
  },
  {
    icon: Code2,
    name: "God's Eye View (open source)",
    tag: "Best if you want the original project",
    href: "/alternatives/gods-eye-view",
    linkLabel: "God's Eye View alternatives",
    body: "The project both hosted sites are compared against: Bilawal Sidhu's viral Cesium globe (MIT, on GitHub) — sensor-style visual modes, a ~4,000-camera CCTV mesh and a voice-controlled AI agent. The catch is that it's software: you install and run it yourself, and its photorealistic tiles and voice agent run on your own keys.",
  },
  {
    icon: CloudSun,
    name: "Zoom Earth",
    tag: "Best for weather-first viewing",
    href: "/alternatives/zoom-earth",
    linkLabel: "Zoom Earth alternatives",
    body: "A polished weather globe: near-real-time satellite imagery, storm tracking and rain radar. Pick it when the question is weather — it doesn't try to be a camera network or an intel desk.",
  },
];

const TABLE: { label: string; worldeye: string; godsview: string; gev: string }[] = [
  { label: "Runs where", worldeye: "Hosted website", godsview: "Hosted website", gev: "Your machine (install / Docker / Pinokio)" },
  { label: "3D globe", worldeye: "Yes — globe-first", godsview: "Yes, alongside a 2D ops map", gev: "Yes (Cesium)" },
  { label: "Public cameras", worldeye: "76,000+ feeds, browsable directory", godsview: "Camera search layer; no published count", gev: "~4,000 (CCTV mesh, project README)" },
  { label: "Flights / ships / quakes / fires", worldeye: "Live, free", godsview: "Live, free", gev: "Live; base layers keyless" },
  { label: "OSINT / intel tooling", worldeye: "Pro: OSINT toolkit, cyber + maritime intel, GDELT feeds, AI analyst", godsview: "Premium: watchlists, kiosk mode, heavier ops layers", gev: "Voice AI agent (your OpenAI key); sensor modes" },
  { label: "Price", worldeye: "Free; Pro $3.99/wk, $9.99/mo, $59.99/yr", godsview: "Free map; Premium pricing not published on its site", gev: "Free code; photorealistic tiles + voice bill to your keys" },
  { label: "Account needed", worldeye: "No (map is open)", godsview: "No (map is open)", gev: "No (but you host it)" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    webPageLd(
      "GodsView AI Alternatives in 2026 — Hosted Live Globes Compared",
      "GodsView AI is a hosted live map aimed at 'God's Eye View online' searches. Compare the alternatives: WorldEye's 3D globe with 76,000+ cameras, GodsView AI itself, and the original open-source God's Eye View.",
      "/alternatives/godsview-ai"
    ),
    itemListLd(
      OPTIONS.map((o) => ({
        name: o.name,
        href: o.href,
        description: `${o.tag}. ${o.body}`,
      }))
    ),
  ],
};

export default function GodsViewAiAlternativesPage() {
  return (
    <IntentShell jsonLd={jsonLd}>
      <IntentBreadcrumbs
        trail={[
          { label: "Alternatives", href: "/compare" },
          { label: "GodsView AI Alternatives" },
        ]}
      />

      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#0096FF] border border-[#0096FF]/30 rounded-full px-4 py-1.5 mb-6">
          <Eye className="w-3.5 h-3.5" /> ALTERNATIVES
        </p>
        <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
          GodsView AI alternatives, <span className="text-[#0096FF]">compared honestly.</span>
        </h1>
        <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
          GodsView AI is a hosted live map built for people searching
          &ldquo;God&apos;s Eye View online.&rdquo; It&apos;s a reasonable
          answer — and so is WorldEye: a hosted 3D globe with a 76,000+
          camera network and published pricing. Here&apos;s how the hosted
          options (and the open-source original) actually stack up.
        </p>
        <ReviewedStamp />
        <HeroCtas />
      </div>

      {/* What is GodsView AI */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">What is GodsView AI, exactly?</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            GodsView AI (godsviewai.com) is a commercial website — not the
            open-source God&apos;s Eye View project, and not run by its
            creators. It says so itself, in its own way: its pitch is that if
            you searched for &ldquo;God&apos;s Eye View online,&rdquo; its
            hosted map is the closest thing on the web, because the original
            is a GitHub project you clone and run.
          </p>
          <p>
            What you get there is a mission-control style map: live ADS-B
            flights, AIS ships, USGS earthquakes and NASA FIRMS fire
            detections over a 2D operations map with a 3D globe view, plus
            search across callsigns, ship MMSIs, cameras and cities. The map
            is free to open; a Premium tier adds watchlists, a kiosk mode
            and heavier operations layers. That&apos;s a fair product — the
            question for most people is which hosted globe fits them better,
            and that comes down to cameras, depth and price transparency.
          </p>
        </div>
      </section>

      {/* The options */}
      <section className="mt-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center">
          The hosted options, <span className="text-[#0096FF]">and the original</span>
        </h2>
        <div className="mt-10 grid gap-5 max-w-4xl mx-auto">
          {OPTIONS.map((o, i) => (
            <div
              key={o.name}
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 md:p-8 hover:border-[#0096FF]/40 transition"
            >
              <div className="flex items-start gap-5">
                <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-[#0096FF]/10 border border-[#0096FF]/25 text-sm font-bold text-[#0096FF] shrink-0">
                  {i + 1}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-bold">{o.name}</h3>
                    <span className="text-xs font-semibold text-[#0096FF] bg-[#0096FF]/10 border border-[#0096FF]/25 rounded-full px-3 py-1">
                      {o.tag}
                    </span>
                  </div>
                  <p className="text-sm text-white/50 leading-relaxed mt-3">{o.body}</p>
                  <Link
                    href={o.href}
                    className="inline-flex items-center gap-1.5 text-sm text-[#0096FF] hover:underline mt-4 font-medium"
                  >
                    {o.linkLabel}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <MidCta
        heading="Want the globe with the cameras?"
        body="WorldEye's map is live right now — 76,000+ public cameras, flights, satellites and weather on one 3D globe. Free, no signup."
      />

      {/* Comparison table */}
      <section className="mt-20 max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">WorldEye vs GodsView AI vs God&apos;s Eye View</h2>
        <p className="text-sm text-white/45 mt-3">
          Checked against each product&apos;s own site and documentation,
          October 2026. Where a vendor doesn&apos;t publish a figure, the
          table says so instead of guessing.
        </p>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-white/[0.04] text-left">
                <th scope="col" className="p-4 font-semibold text-white/70"> </th>
                <th scope="col" className="p-4 font-semibold text-[#0096FF]">WorldEye</th>
                <th scope="col" className="p-4 font-semibold text-white/70">GodsView AI</th>
                <th scope="col" className="p-4 font-semibold text-white/70">God&apos;s Eye View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {TABLE.map((r) => (
                <tr key={r.label}>
                  <td className="p-4 text-white/80 font-medium">{r.label}</td>
                  <td className="p-4 text-white/60">{r.worldeye}</td>
                  <td className="p-4 text-white/60">{r.godsview}</td>
                  <td className="p-4 text-white/60">{r.gev}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-3 pt-6">
          {[
            { icon: Globe, label: "The live globe", href: "/" },
            { icon: Camera, label: "76,000+ cameras", href: "/cameras" },
            { icon: Plane, label: "Live flights", href: "/live-flight-tracker" },
            { icon: Satellite, label: "Satellites", href: "/satellite-tracker" },
          ].map((c) => (
            <Link
              key={c.label}
              href={c.href}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 hover:border-[#0096FF]/40 transition"
            >
              <c.icon className="w-4 h-4 text-[#0096FF]" /> {c.label}
            </Link>
          ))}
        </div>
      </section>

      {/* How to choose */}
      <section className="mt-16 max-w-3xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-10">
        <h2 className="text-2xl md:text-3xl font-bold">How to choose</h2>
        <div className="mt-5 space-y-4 text-white/60 leading-relaxed">
          <p>
            <span className="text-white/85 font-semibold">Choose WorldEye</span>{" "}
            if the cameras are the point — a 76,000+ feed directory you can
            browse by country and city — or if you want the deeper Pro layers
            (OSINT toolkit, cyber and maritime intel, live news, AI analyst)
            at prices published on the pricing page.
          </p>
          <p>
            <span className="text-white/85 font-semibold">Choose GodsView AI</span>{" "}
            if you prefer an operations-desk layout — a 2D panel-style map
            with the globe as a view — or if its watchlists and kiosk mode
            (for an always-on display) are exactly what you need. WorldEye
            doesn&apos;t offer a kiosk mode.
          </p>
          <p>
            <span className="text-white/85 font-semibold">Choose the open-source
            God&apos;s Eye View</span> if you want the original project
            itself — its sensor visual modes and voice agent — and
            you&apos;re happy running it on your own machine.
          </p>
        </div>
      </section>

      {/* Q&A */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">GodsView AI questions, answered</h2>
        <div className="mt-8 space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-white/90">Is GodsView AI the official God&apos;s Eye View?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              No. God&apos;s Eye View is the open-source project by Bilawal
              Sidhu and Sameh Khamis, distributed on GitHub. GodsView AI is a
              separate commercial website that hosts a similar live map.
              WorldEye is independent of both — a separate product that
              competes with each.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">Is GodsView AI free?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              Its map opens free with no account. Watchlists, kiosk mode and
              heavier operations layers sit behind a Premium tier whose
              prices aren&apos;t published on its landing page. WorldEye is
              also free to open, and its Pro pricing is public: $3.99/week,
              $9.99/month or $59.99/year.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">Which has more cameras?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              WorldEye — 76,000+ live public feeds with a browsable country
              and city directory. GodsView AI includes cameras in its search
              but doesn&apos;t publish a network size; the open-source
              God&apos;s Eye View mesh lists roughly 4,000 cameras in its
              README.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">Do any of these need an API key?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              The two hosted sites don&apos;t — that&apos;s the point of
              hosted. The open-source project starts keyless, but its
              photorealistic 3D tiles need a Cesium ion token or a Google
              Maps key, and its voice agent needs an OpenAI key.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <div className="mt-20 max-w-2xl mx-auto text-center rounded-3xl border border-[#0096FF]/30 bg-gradient-to-b from-[#0096FF]/[0.10] to-transparent p-10">
        <h2 className="text-2xl md:text-3xl font-bold">
          The hosted globe with <span className="text-[#0096FF]">the cameras.</span>
        </h2>
        <p className="text-white/55 mt-3 mb-8">
          One click, no signup, no API keys. The globe is already spinning.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-block px-8 py-4 rounded-2xl bg-[#0096FF] text-white font-bold hover:bg-[#0077d6] transition"
          >
            Launch WorldEye Free
          </Link>
          <Link
            href="/features"
            className="inline-block px-8 py-4 rounded-2xl border border-white/15 text-white/85 font-semibold hover:border-[#0096FF]/50 hover:bg-white/5 transition"
          >
            Compare Features
          </Link>
        </div>
      </div>

      <RelatedLinks
        links={[
          {
            label: "God's Eye View alternatives",
            desc: "The original viral globe: hosted vs self-hosted, compared.",
            href: "/alternatives/gods-eye-view",
          },
          {
            label: "Experience God's Eye View — hosted",
            desc: "The live-Earth experience page: what's on the globe and how to explore it.",
            href: "/gods-eye-view",
          },
          {
            label: "OSIRIS alternatives",
            desc: "The open-source OSINT dashboard, compared the same honest way.",
            href: "/alternatives/osiris",
          },
          {
            label: "Pricing",
            desc: "Weekly $3.99, monthly $9.99, annual $59.99 — the core globe stays free.",
            href: "/pricing",
          },
        ]}
      />
    </IntentShell>
  );
}
