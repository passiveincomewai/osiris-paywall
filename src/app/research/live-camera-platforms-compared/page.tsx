import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Globe2,
  Minus,
  Scale,
  Table2,
  Trophy,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import RelatedLinks from "@/components/RelatedLinks";

export const metadata: Metadata = {
  title: "Live Camera Platforms Compared — WorldEye, EarthCam, SkylineWebcams & Windy",
  description:
    "A sourced, dated comparison of live-camera platforms: camera counts, free access, prices, free trials, 3D globes, time-lapse archives, mobile apps and data access — with WorldEye's own limitations stated plainly. Checked October 2026.",
  alternates: {
    canonical: "https://worldeye.app/research/live-camera-platforms-compared",
  },
  openGraph: {
    title: "Live Camera Platforms Compared (October 2026)",
    description:
      "WorldEye, EarthCam, SkylineWebcams and Windy compared on cameras, pricing, trials, archives, apps and data access — every figure sourced and dated.",
    type: "website",
    url: "https://worldeye.app/research/live-camera-platforms-compared",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Live Camera Platforms Compared — WorldEye, EarthCam, SkylineWebcams & Windy",
  description:
    "A sourced comparison of live-camera platforms: counts, pricing, trials, archives, apps and data access, checked October 2026.",
  url: "https://worldeye.app/research/live-camera-platforms-compared",
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const PLATFORMS = ["WorldEye", "EarthCam", "SkylineWebcams", "Windy"] as const;

// One row per comparison axis; cells in PLATFORMS order. Every cell is
// backed by the dated sources listed at the foot of the page — see the
// "Sources" section. "Not published" means the platform's own pages
// state no figure (checked October 2026), not that the thing is absent.
const ROWS: Array<{ label: string; cells: [string, string, string, string] }> = [
  {
    label: "What it is",
    cells: [
      "Live public cameras on a free 3D globe, alongside live flights, ships, satellites and weather",
      "Long-running webcam network (founded 1996): famous scenic and tourist cameras, plus construction-camera services for business",
      "Scenic and travel webcam directory, particularly strong in Italy and popular tourist destinations",
      "Weather visualisation platform built on forecast models; webcams are one layer on the map",
    ],
  },
  {
    label: "Cameras you can browse",
    cells: [
      "74,229 public cameras — the published headline count",
      "No exact count published on EarthCam's site",
      "No exact count published on SkylineWebcams' site",
      "Webcams are an aggregated layer; no headline camera count published",
    ],
  },
  {
    label: "Free access",
    cells: [
      "The globe and cameras are free with no account; an account raises the free camera ladder",
      "Many public cameras are free to watch",
      "Free to watch, supported by advertising",
      "Free tier available; Windy states the service is ad-free",
    ],
  },
  {
    label: "Paid price",
    cells: [
      "Weekly $7.99 · Monthly $13.99 · Annual (VIP Pro) $74.99/year · Enterprise $999/year",
      "No consumer subscription for the website. EarthCamTV app: $19.99/year. Construction services are quoted per project",
      "Premium $9.99/year or $3.99 for 3 months, no automatic renewal (the EU storefront shows €9.50 / €3.90)",
      "Premium €18.99/year, sold annually only",
    ],
  },
  {
    label: "Free trial",
    cells: [
      "3 days on Weekly · 10 days on Monthly and Annual · none on Enterprise",
      "None published; a free preview version of EarthCamTV is offered",
      "None published",
      "None — Windy staff confirm Premium has no free trial",
    ],
  },
  {
    label: "3D globe",
    cells: [
      "Yes — the globe is the core interface",
      "No — directory and player pages",
      "No — a directory; its interactive 2D map is a Premium feature",
      "Yes — a 3D mode on desktop",
    ],
  },
  {
    label: "Beyond cameras",
    cells: [
      "Live flight tracking, AIS ship tracking, satellite tracking, earthquakes, wildfires, transit and snowplows on the same globe",
      "No flight, ship or satellite tracking",
      "No flight, ship or satellite tracking",
      "No live flight or ship tracking — weather for aviation and sailing instead",
    ],
  },
  {
    label: "Weather depth",
    cells: [
      "Live weather layers and alerts on the globe — not a forecast-model tool",
      "Weather information shown alongside some cameras",
      "Weather information on webcam pages",
      "Its core strength: forecast-model maps (wind, radar, satellite), 1-hour steps and a 1-year satellite archive on Premium",
    ],
  },
  {
    label: "Per-camera time-lapse / archive",
    cells: [
      "No archive for every camera. Timelapse exists as a VIP feature on supported cameras; recording is a paid-tier feature",
      "Yes — time-lapse is a core service, from construction documentation to event films",
      "Yes — a time-lapse is built for every hosted webcam",
      "No per-webcam archive; Premium adds radar/satellite history and a 1-year satellite archive",
    ],
  },
  {
    label: "Native mobile apps",
    cells: [
      "No native app — the website is an installable web app (PWA)",
      "Yes — the Webcams app (iOS/Android) and EarthCamTV (Apple TV, Android TV, Fire TV)",
      "Yes — iOS and Android apps",
      "Yes — iOS and Android apps",
    ],
  },
  {
    label: "Data / API access",
    cells: [
      "Enterprise camera feed and REST API ($999/year), filtered by a per-camera rights registry; no free API tier",
      "No public self-serve API; business services are arranged per project",
      "No public API published",
      "API products exist for Windy's weather and map data — not a webcam feed",
    ],
  },
];

const WINS: Array<{ platform: string; text: string }> = [
  {
    platform: "WorldEye",
    text: "Breadth on one free globe: 74,229 cameras plus live flights, ships, satellites, weather, earthquakes and wildfires in a single interface, with no signup to start. Paid tiers add recording, alerts, timelapse and the OSINT toolkit, and Enterprise adds a rights-cleared camera feed and API.",
  },
  {
    platform: "EarthCam",
    text: "Depth at famous places and a business most platforms do not have: three decades of tourism cameras (Times Square is the best-known), EarthCam TV channels, native apps everywhere including TV platforms, and managed construction-camera services with hardware, archiving and time-lapse for commercial clients.",
  },
  {
    platform: "SkylineWebcams",
    text: "The travel directory, and the best per-camera extras at the lowest price: a time-lapse built for every hosted webcam, strong Italian and tourist-destination coverage, and Premium at $9.99/year with no automatic renewal — the cheapest paid tier in this comparison.",
  },
  {
    platform: "Windy",
    text: "Weather depth nothing else here approaches: forecast-model maps, hourly forecast steps, radar and satellite history and a 1-year satellite archive on Premium. If the question is the weather itself — sailing, flying, surfing, storms — Windy is the specialist tool; its webcams are a supporting layer.",
  },
];

const LIMITATIONS = [
  "No native iOS or Android app. WorldEye is a website and an installable web app (PWA); EarthCam, SkylineWebcams and Windy all publish native apps, and EarthCam extends to TV platforms.",
  "No time-lapse or archive for every camera. SkylineWebcams builds a time-lapse for each hosted webcam; WorldEye's timelapse covers supported cameras on the VIP tier, and most cameras are live-only.",
  "Weather is a layer, not a forecast-model product. Windy's model maps, hourly steps and satellite archive go far beyond WorldEye's weather overlays.",
  "The camera count is an index of public feeds, not a hosted network. EarthCam and SkylineWebcams host and curate their own cameras — including managed cameras with guaranteed uptime arrangements for their operators — while WorldEye indexes cameras operated by others, so individual feeds can go offline at their source.",
  "No free or self-serve API. Programmatic access is the Enterprise tier at $999/year because every camera has to pass the rights registry first.",
];

const SOURCES: Array<{ label: string; url: string; note: string }> = [
  {
    label: "WorldEye — pricing and plans",
    url: "https://worldeye.app/pricing",
    note: "Plan prices, trial lengths and tier features. Camera count: the published headline figure on worldeye.app; how it is built is documented on the methodology page.",
  },
  {
    label: "EarthCam — official site and about page",
    url: "https://www.earthcam.com/company/aboutus.php",
    note: "Founded 1996; tourism cameras; construction-camera technology and services via EarthCam.net, quoted per project. No exact camera count is stated.",
  },
  {
    label: "EarthCam — press releases (earthcam.net)",
    url: "https://www.earthcam.net/press-release/connect-with-the-world-through-new-years-eve-live-streams/",
    note: "The Webcams app for Apple and Android and EarthCamTV for Apple TV, Android TV and Fire TV; EarthCamTV 2 pricing of $19.99/year is from EarthCam's EarthCamTV licensing announcement.",
  },
  {
    label: "SkylineWebcams — Premium (official)",
    url: "https://www.skylinewebcams.com/premium.html",
    note: "Premium removes ads and adds favourites, the interactive map, search and profile/chat extras; no automatic renewal; up to 2 devices. US prices $9.99/year and $3.99/3 months; the same page served €9.50 / €3.90 from the EU when checked.",
  },
  {
    label: "SkylineWebcams — Services (official)",
    url: "https://www.skylinewebcams.com/en/services.html",
    note: "States that every webcam page includes time-lapse and weather information.",
  },
  {
    label: "Windy — Premium features (official community, staff post)",
    url: "https://community.windy.com/topic/23730/be-one-step-ahead-with-the-advanced-features-of-windy-premium-en",
    note: "1-hour forecast steps, 10-day outlook, 12-hour radar/satellite loop, 1-year satellite archive, unlimited favourites and alerts, 3D globe on desktop; the post states Windy is ad-free.",
  },
  {
    label: "Windy — Premium price and terms (official staff posts)",
    url: "https://www.windy.com",
    note: "Premium at €18.99/year, sold annually only, with no free trial — as stated by Windy staff on the official community and reflected in Windy's premium offer.",
  },
];

const FAQS = [
  {
    q: "Which live-camera platform has the most cameras?",
    a: "Of the platforms compared here, only WorldEye publishes an exact count: 74,229 public cameras, indexed from public sources worldwide. EarthCam and SkylineWebcams do not state an exact number of cameras on their sites, and Windy's webcams are one aggregated layer on a weather map rather than a counted network — so any ranking beyond WorldEye's published figure would be a guess, and this page does not guess.",
  },
  {
    q: "Which platform is free?",
    a: "All four can be used free. WorldEye's globe and cameras are free with no account. SkylineWebcams is free with advertising. EarthCam's public cameras are free to watch. Windy has a free tier and states the service is ad-free. The paid tiers buy different things: WorldEye sells depth on the globe (recording, alerts, timelapse, OSINT tools, and an Enterprise data feed), SkylineWebcams sells an ad-free directory with a map and favourites, Windy sells forecast depth, and EarthCam's paid business is TV apps and construction services.",
  },
  {
    q: "Why does this page list WorldEye's weaknesses?",
    a: "Because it is published by WorldEye. A comparison that only lists the publisher's strengths is advertising, not research. The limitations section states the real gaps — no native apps, no per-camera archive, no forecast-model weather depth, no free API — with the same prominence as the table, and every competitor figure carries its source so it can be checked.",
  },
  {
    q: "How current are these prices?",
    a: "Every price on this page was checked against the platform's official pages in October 2026 and is dated in the sources. Prices can change and vary by region and store — SkylineWebcams' Premium page itself shows different figures in dollars and euros — so treat the linked official page, not this one, as the final word at purchase time.",
  },
  {
    q: "Can I get camera data from these platforms programmatically?",
    a: "From WorldEye, yes — through the Enterprise camera feed and REST API, where every camera is filtered by a per-camera rights registry before it ships. EarthCam arranges business services per project and publishes no self-serve API. SkylineWebcams publishes no public API. Windy's API products cover its weather and map data, not a webcam feed.",
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

export default function LiveCameraPlatformsComparedPage() {
  return (
    <main className="docs-root min-h-screen bg-[#05070d] text-white relative overflow-x-clip">
      <JsonLd data={jsonLd} />
      <JsonLd data={faqJsonLd} />

      <div className="relative max-w-5xl mx-auto px-5 py-10 md:py-14">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-12">
          <Link
            href="/research-access"
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" /> Research &amp; Education Access
          </Link>
          <Link href="/" aria-label="WorldEye — back to the live globe" className="shrink-0 inline-flex items-center">
            <img src="/worldeye-header-logo.png" alt="WorldEye" width={1063} height={290} className="h-6 w-auto" />
          </Link>
        </div>

        {/* Hero */}
        <p className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.25em] text-[#00E5FF] border border-[#00E5FF]/30 rounded-full px-4 py-1.5">
          <Scale className="w-3.5 h-3.5" /> RESEARCH — PLATFORM COMPARISON
        </p>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight mt-5">
          Live camera platforms, compared
        </h1>
        <p className="text-white/55 mt-4 max-w-2xl leading-relaxed">
          WorldEye, EarthCam, SkylineWebcams and Windy are the names that come up for watching
          the world live — but they are built for different jobs. This page compares them on
          cameras, free access, price, trials, archives, apps and data access. Every figure
          comes from the platform's own pages, checked in <strong className="text-white/80">October 2026</strong>,
          and the sources are listed at the foot of the page. It is published by WorldEye, so
          WorldEye's limitations are stated as plainly as its strengths.
        </p>

        {/* Table */}
        <section className="mt-14">
          <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Table2 className="w-7 h-7 text-[#00E5FF]" /> The comparison
          </h2>
          <div className="mt-8 overflow-x-auto rounded-3xl border border-white/10">
            <table className="w-full text-sm min-w-[880px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.04]">
                  <th className="px-4 py-3 text-left font-semibold text-white/60 align-top w-40" />
                  {PLATFORMS.map((p) => (
                    <th key={p} className="px-4 py-3 text-left font-semibold text-white/90 align-top">
                      {p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.label} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3 font-semibold text-[#00E5FF]/90 align-top">{row.label}</td>
                    {row.cells.map((cell, i) => (
                      <td key={i} className="px-4 py-3 text-white/60 leading-relaxed align-top">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-white/40 mt-3 leading-relaxed max-w-3xl">
            “Not published” means the platform's own pages state no figure as of the October 2026
            check — it describes their disclosure, not their size. Prices vary by region and
            store; the official page linked in the sources is the final word.
          </p>
        </section>

        {/* Where each wins */}
        <section className="mt-16 md:mt-20">
          <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Trophy className="w-7 h-7 text-[#00E5FF]" /> Where each platform wins
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {WINS.map((w) => (
              <div key={w.platform} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                <h3 className="font-semibold text-white/90 text-lg">{w.platform}</h3>
                <p className="text-sm text-white/55 mt-2 leading-relaxed">{w.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* WorldEye limitations */}
        <section className="mt-16 md:mt-20">
          <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Minus className="w-7 h-7 text-[#00E5FF]" /> WorldEye's limitations, honestly
          </h2>
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8 max-w-3xl">
            <ul className="space-y-3.5">
              {LIMITATIONS.map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-sm text-white/65 leading-relaxed">
                  <span className="w-5 h-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0 mt-px">
                    <Minus className="w-3 h-3 text-white/70" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How this was compiled */}
        <section className="mt-16 md:mt-20">
          <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-[#00E5FF]" /> How this comparison was compiled
          </h2>
          <div className="mt-6 space-y-4 text-white/60 leading-relaxed max-w-3xl">
            <p>
              Each cell comes from the compared platform's own pages — pricing pages, premium
              offers, official help and community posts by staff — read in October 2026. Where
              a platform publishes no figure (EarthCam and SkylineWebcams state no exact camera
              count), the table says so instead of estimating one. Where a price differs by
              region, both figures are shown.
            </p>
            <p>
              The WorldEye column uses the same published facts as the rest of this site: the
              74,229 headline camera count (its construction is documented on the{" "}
              <Link href="/methodology" className="text-[#00E5FF] hover:underline">methodology page</Link>),
              the plan prices and trial lengths on the{" "}
              <Link href="/pricing" className="text-[#00E5FF] hover:underline">pricing page</Link>,
              and the Enterprise terms on the{" "}
              <Link href="/enterprise" className="text-[#00E5FF] hover:underline">Enterprise page</Link>.
              One structural note the table cannot show: cameras sourced from Windy Webcams
              appear on the WorldEye globe for viewing, but the rights registry never clears
              them for redistribution through WorldEye's feed or API — Windy's terms grant no
              such right.
            </p>
            <p className="flex items-start gap-2">
              <Globe2 className="w-4 h-4 text-[#00E5FF]/80 shrink-0 mt-1" />
              <span>
                Found an error, or a price that has moved since October 2026?{" "}
                <Link href="/contact" className="text-[#00E5FF] hover:underline">Tell us</Link>{" "}
                — corrections are made to this page with the check date updated.
              </span>
            </p>
          </div>
        </section>

        {/* Sources */}
        <section className="mt-16 md:mt-20">
          <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Check className="w-7 h-7 text-[#00E5FF]" /> Sources — checked October 2026
          </h2>
          <div className="mt-6 space-y-4 max-w-3xl">
            {SOURCES.map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-white/85 hover:text-[#00E5FF] transition"
                >
                  {s.label}
                </a>
                <p className="text-sm text-white/50 mt-1.5 leading-relaxed">{s.note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-16 md:mt-20 max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Scale className="w-7 h-7 text-[#00E5FF]" /> Comparison FAQs
          </h2>
          <div className="mt-6 space-y-6">
            {FAQS.map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold text-white/90">{f.q}</h3>
                <p className="text-sm text-white/55 mt-1.5 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <RelatedLinks
          links={[
            {
              label: "Research & Education Access",
              desc: "The documented routes to WorldEye's camera metadata for universities and researchers.",
              href: "/research-access",
            },
            {
              label: "Camera Data Methodology",
              desc: "How the 74,229-camera catalogue is built, deduplicated and checked.",
              href: "/methodology",
            },
            {
              label: "Partners & Data Sources",
              desc: "Every catalogue source label with its camera count, and the invitation-only partners tier.",
              href: "/partners",
            },
            {
              label: "Best Live Webcam Sites",
              desc: "WorldEye's guided tour of the live-webcam landscape, by use case.",
              href: "/best-live-webcam-sites",
            },
          ]}
        />
      </div>
      <SiteFooter />
    </main>
  );
}
