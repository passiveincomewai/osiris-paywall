import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Alternatives to the Tools People Outgrow — WorldEye",
  description:
    "Switching guides for the live-map tools people outgrow: EarthCam, SkylineWebcams, Windy, Flightradar24, Google Earth, Dataminr, LiveUAMap and more — what each does well, where it stops, and what to move to.",
  alternates: { canonical: "/alternatives" },
  openGraph: {
    title: "Alternatives to the Tools People Outgrow | WorldEye",
    description:
      "Honest switching guides for webcam directories, weather maps, flight trackers, event monitors and self-hosted globes — each one names the other real options, not just WorldEye.",
    type: "website",
    url: "/alternatives",
  },
  twitter: { card: "summary_large_image" },
};

/* The alternatives hub (INTENT-AND-CLUSTERS §2.2 / chunk C7).
   Every entry is a real switching guide: what the tool is, what it
   does well, where it stops, and the honest set of things to move
   to — WorldEye included, never alone. EarthCam's guide is the
   standalone /earthcam-alternative page; /alternatives/earthcam
   301s there (next.config). This hub owns "X alternative(s)"
   discovery; /compare owns the head-to-head feature tables. */
const GROUPS: {
  heading: string;
  intro: string;
  entries: { name: string; href: string; what: string; switchWhen: string }[];
}[] = [
  {
    heading: "Live webcams & camera directories",
    intro:
      "The directory tools are where most people start watching the world. They differ in how you find a camera — a category list, a destination page, or a map.",
    entries: [
      {
        name: "EarthCam",
        href: "/earthcam-alternative",
        what: "The best-known webcam network: famous landmark and city cameras, plus professional construction cameras, polished over decades.",
        switchWhen:
          "The category's most-searched switch — usually when a directory of famous views stops being enough and you want the whole planet's cameras on one live globe.",
      },
      {
        name: "SkylineWebcams",
        href: "/alternatives/skylinewebcams",
        what: "A beloved scenic webcam directory — beaches, cities, landscapes and landmarks, browsable by destination and category, free with ads.",
        switchWhen:
          "Switch when you want those cameras on a live map instead of in lists, with weather, flights, quakes and fires attached to the same places.",
      },
    ],
  },
  {
    heading: "Weather, satellite & earth imagery",
    intro:
      "Three ways of looking at the planet from above: the forecast, the recent past, and the archived image. All excellent — none of them live at street level.",
    entries: [
      {
        name: "Windy",
        href: "/alternatives/windy",
        what: "The master of forecast maps — the signature wind-particle animation, ECMWF/GFS/ICON models side by side, radar and dozens of layers.",
        switchWhen:
          "Switch when the question stops being “what will the weather do?” and becomes “what is it doing, right now, at that beach, pass or harbour?”",
      },
      {
        name: "Zoom Earth",
        href: "/alternatives/zoom-earth",
        what: "The planet from orbit, beautifully rendered — near-real-time satellite imagery, storm tracking and fire maps.",
        switchWhen:
          "Switch when you want to continue the zoom past orbit — down through the clouds to live cameras on the street below.",
      },
      {
        name: "Google Earth",
        href: "/alternatives/google-earth",
        what: "Archived satellite imagery, 3D cities and Timelapse: the definitive portrait of the world as it was.",
        switchWhen:
          "Switch when you need the world as it is — live cameras, flights, satellites and weather on one globe, in your browser.",
      },
    ],
  },
  {
    heading: "Flight tracking",
    intro: "One specialist, done superbly — the question is whether aviation is the whole story or one layer of it.",
    entries: [
      {
        name: "Flightradar24",
        href: "/alternatives/flightradar24",
        what: "The flight-tracking benchmark: deep aviation data, history, alerts and telemetry, built from a global ADS-B receiver network.",
        switchWhen:
          "Switch when flights are one part of a wider live picture — the cameras at the destination, the weather closing in, the ships below.",
      },
    ],
  },
  {
    heading: "Conflict & real-time event monitoring",
    intro:
      "Report maps and alerting engines tell you what happened and where. The switching question is usually about seeing it — or about being able to buy it at all.",
    entries: [
      {
        name: "LiveUAMap",
        href: "/alternatives/liveuamap",
        what: "Curated conflict and event reports pinned to a map by human editors — the original live event map, running since 2014.",
        switchWhen:
          "Switch when you want to see the places in the reports: live cameras alongside the pins, plus the flights and fires around them.",
      },
      {
        name: "World Monitor",
        href: "/alternatives/world-monitor",
        what: "A free hosted geopolitical dashboard — chokepoints, markets, military movements and news feeds arranged in one console.",
        switchWhen:
          "Switch when a console of feeds isn't the same as watching: WorldEye trades some breadth for 74,229 pairs of eyes on the ground.",
      },
      {
        name: "War Monitor",
        href: "/alternatives/war-monitor",
        what: "A conflict-first intelligence dashboard with analyst tools, built for following wars closely.",
        switchWhen:
          "Switch for visual confirmation — live cameras, flights, satellites and fires on one globe, free to open with no analyst seat required.",
      },
      {
        name: "Dataminr",
        href: "/alternatives/dataminr",
        what: "Real-time AI alerting sold to enterprises, governments and newsrooms — quote-only pricing, no public tier.",
        switchWhen:
          "Switch when there is no enterprise contract on the table: situational awareness you can open free today and upgrade transparently.",
      },
    ],
  },
  {
    heading: "Live globes & OSINT dashboards you run yourself",
    intro:
      "The self-hosted family: powerful, free as in freedom, and yours to operate. The alternative question here is hosted versus hand-run.",
    entries: [
      {
        name: "God's Eye View",
        href: "/alternatives/gods-eye-view",
        what: "The viral open-source Cesium globe — cameras, flights, satellites and events, installed and run on your own machine.",
        switchWhen:
          "Switch when you'd rather open the same live-globe idea in a browser tab than install, host and maintain it yourself.",
      },
      {
        name: "GodsView AI",
        href: "/alternatives/godsview-ai",
        what: "A hosted “God's Eye View online” map with Premium pricing and camera counts it doesn't publish.",
        switchWhen:
          "Switch for published numbers: a hosted 3D globe whose camera count (74,229) and prices are on the page.",
      },
      {
        name: "OSIRIS",
        href: "/alternatives/osiris",
        what: "The self-hosted open-source OSINT dashboard — the platform WorldEye's own codebase descends from, and proudly says so.",
        switchWhen:
          "Switch when you want that spirit hosted: the same live layers, already running, with nothing to deploy.",
      },
    ],
  },
];

const ALL_ENTRIES = GROUPS.flatMap((g) => g.entries);

export default function AlternativesHubPage() {
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Alternatives to the Tools People Outgrow",
    description:
      "Switching guides for webcam directories, weather maps, flight trackers, event monitors and self-hosted globes.",
    url: "https://worldeye.app/alternatives",
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://worldeye.app/" },
      { "@type": "ListItem", position: 2, name: "Alternatives", item: "https://worldeye.app/alternatives" },
    ],
  };
  /* Every switching guide, enumerated from the same list the cards
     render — the hub's ItemList is the family's table of contents. */
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "WorldEye alternatives guides",
    numberOfItems: ALL_ENTRIES.length,
    itemListElement: ALL_ENTRIES.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${e.name} alternative${e.name === "EarthCam" ? "" : "s"}`,
      url: `https://worldeye.app${e.href}`,
    })),
  };

  return (
    <div className="docs-root min-h-screen" style={{ background: "radial-gradient(1200px 600px at 50% -10%, #0a1a33 0%, #050810 55%, #03040a 100%)" }}>
      <JsonLd data={collectionLd} />
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={itemListLd} />

      <header className="max-w-5xl mx-auto px-6 pt-16 md:pt-24 pb-10 text-center">
        <nav aria-label="Breadcrumb" className="text-xs text-white/35 mb-6">
          <Link href="/" className="hover:text-white/70">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-white/60">Alternatives</span>
        </nav>
        <p className="text-[11px] font-bold tracking-[0.25em] text-[#0096FF] mb-4">SWITCHING GUIDES</p>
        <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight">
          Alternatives to the tools<br />people outgrow
        </h1>
        <p className="text-white/55 mt-5 max-w-2xl mx-auto leading-relaxed">
          Every tool below is genuinely good at what it does — and each one stops
          somewhere. These guides cover where it stops, what else belongs in the
          set, and what switching actually looks like. WorldEye is one of the
          options in every guide; it is never the only one named.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="px-6 py-3 rounded-xl bg-[#0096FF] hover:bg-[#0aa5ff] text-white font-semibold transition">
            Try the alternative — open the globe
          </Link>
          <Link href="/compare" className="px-6 py-3 rounded-xl border border-white/15 text-white/80 hover:text-white hover:border-white/30 transition">
            Compare feature by feature instead
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-8">
        {GROUPS.map((g) => (
          <section key={g.heading} className="pb-14">
            <h2 className="text-2xl font-bold text-white">{g.heading}</h2>
            <p className="text-sm text-white/45 mt-2 max-w-2xl leading-relaxed">{g.intro}</p>
            <div className="mt-6 grid sm:grid-cols-2 gap-4">
              {g.entries.map((e) => (
                <Link
                  key={e.href}
                  href={e.href}
                  className="block rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:border-[#0096FF]/40 hover:bg-white/[0.04] transition group"
                >
                  <h3 className="font-bold text-white group-hover:text-[#7cc4ff] transition">
                    {e.name} alternative{e.name === "EarthCam" ? "" : "s"}
                  </h3>
                  <p className="text-sm text-white/55 mt-2 leading-relaxed">{e.what}</p>
                  <p className="text-sm text-white/40 mt-2 leading-relaxed">{e.switchWhen}</p>
                  <span className="inline-block mt-4 text-xs font-semibold text-[#0096FF]">
                    Read the {e.name} switching guide →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {/* Hand-off to the vs-family */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8 mb-16">
          <h2 className="text-xl font-bold text-white mb-3">Not switching — just comparing?</h2>
          <p className="text-sm text-white/55 leading-relaxed">
            These guides answer “what should I move to?”. If your question is
            “how do they stack up, row by row?”, the{" "}
            <Link href="/compare" className="text-[#0096FF] hover:underline">
              WorldEye comparison hub
            </Link>{" "}
            lines WorldEye up against 32 platforms — feature tables, verified
            pricing, and a plain statement of where each competitor is stronger.
            Both families are kept honest the same way: sources listed, gaps
            admitted, nothing marked better than the evidence says.
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
