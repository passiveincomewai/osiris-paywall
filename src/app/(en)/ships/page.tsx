import type { Metadata } from "next";
import Link from "next/link";
import { Ship as ShipIcon } from "lucide-react";
import {
  BASE,
  Breadcrumb,
  CtaRow,
  FaqJsonLd,
  FaqSection,
  Hero,
  Intro,
  JsonLd,
  PageShell,
  RelatedLinks,
} from "@/components/directory-page";
import { getLiveShipsForTracking } from "@/app/api/maritime/route";
import {
  REGISTRY_VERIFIED_AT,
  SHIPS,
  shipLines,
  shipsByLine,
  type TrackedShip,
} from "@/lib/ships/registry";
import {
  formatAge,
  matchShipToFeed,
  type FeedShip,
  type ShipLiveView,
} from "@/lib/ships/match";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Cruise Ship Tracker — Where the World's Biggest Cruise Ships Are Right Now",
  description:
    "Live AIS tracking for the world's biggest cruise ships — Icon of the Seas, Star of the Seas, Mardi Gras, Norwegian Aqua, Disney Treasure and more. Current position, speed and heading when reporting; an honest 'not reporting' when not. Free, no signup.",
  alternates: { canonical: `${BASE}/ships` },
  openGraph: {
    title: "Cruise Ship Tracker — Live Positions for the Biggest Cruise Ships",
    description:
      "Where is your ship right now? Live AIS positions for 14 flagship cruise ships across Royal Caribbean, Carnival, Norwegian and Disney — with verified ship facts and homeport cameras.",
    url: "/ships",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Cruise Ship Tracker — Live Positions",
  description:
    "Per-ship live AIS tracking pages for flagship cruise ships, matched by verified MMSI against WorldEye's maritime feed.",
  url: `${BASE}/ships`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: BASE },
};

const FAQS = [
  {
    q: "Which cruise ships can I track here?",
    a: `The flagship ships of the four biggest family cruise lines: ${SHIPS.map((s) => s.name).join(", ")}. Each has its own page with a live AIS position whenever the ship is reporting. Ships are only added once their MMSI — the identity number their transponder broadcasts — has been verified against public registries, because a wrong number would pin a stranger's position to a famous name.`,
  },
  {
    q: "Why does a ship show 'not reporting'?",
    a: "AIS is a VHF radio broadcast. A ship mid-ocean can be beyond shore receiver range for stretches, and transponders occasionally go quiet. WorldEye treats a report older than ten minutes as not live — the page then shows no position at all rather than presenting an old fix as current. When the ship broadcasts again, her live card updates automatically.",
  },
  {
    q: "Is this the ship's itinerary?",
    a: "No. The live card shows the destination the crew typed into the AIS transponder, exactly as broadcast — free text, sometimes abbreviated, occasionally stale. It is the ship's stated intention, not a schedule, and WorldEye never presents it as a booked itinerary.",
  },
  {
    q: "How is this different from the live ship tracker?",
    a: "The ship tracker page covers the whole maritime picture — every vessel in the feed, ports and chokepoints, on the globe (the full feed is part of WorldEye's premium intel tiers). These pages are the opposite cut: one famous ship, her verified facts, her homeport cameras, and her own live position when she is reporting.",
  },
];

function liveViews(): Map<string, ShipLiveView> {
  const views = new Map<string, ShipLiveView>();
  try {
    const now = Date.now();
    const feed = getLiveShipsForTracking(now) as FeedShip[];
    for (const s of SHIPS) views.set(s.slug, matchShipToFeed(s, feed, now));
  } catch {
    for (const s of SHIPS) views.set(s.slug, { status: "not-reporting" });
  }
  return views;
}

function StatusChip({ view }: { view: ShipLiveView }) {
  if (view.status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-emerald-300">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        LIVE · {formatAge(view.ageSeconds).toUpperCase()}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-white/35">
      <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
      NOT REPORTING
    </span>
  );
}

function ShipCard({ s, view }: { s: TrackedShip; view: ShipLiveView }) {
  return (
    <Link
      href={`/ships/${s.slug}`}
      className="block rounded-3xl border border-white/10 bg-white/[0.02] p-6 hover:border-[#00E5FF]/40 hover:bg-white/[0.04] transition"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-white/90 text-lg leading-snug">
          {s.name}
        </p>
        <StatusChip view={view} />
      </div>
      <p className="text-sm text-white/45 mt-1.5">
        {s.shipClass} · {s.grossTonnage.toLocaleString("en-US")} GT · in
        service {s.enteredService}
      </p>
      <p className="text-sm text-white/50 leading-relaxed mt-3">
        {s.homeports.length
          ? `Sails from ${s.homeports.map((h) => h.name).join(" and ")}.`
          : s.regions}
      </p>
      <p className="text-sm font-semibold text-[#00E5FF] mt-4">
        Where is {s.name}? →
      </p>
    </Link>
  );
}

export default function ShipsHubPage() {
  const views = liveViews();
  const lines = shipLines();
  const liveCount = SHIPS.filter(
    (s) => views.get(s.slug)?.status === "live",
  ).length;

  const intro = [
    `Fourteen flagship cruise ships, each tracked by the identity it actually broadcasts. Every ship below has a page with her verified facts — tonnage, size, capacity, homeports, sources cited — and a live card that shows her current AIS position, speed, heading and broadcast destination whenever she is reporting. Right now, ${liveCount} of the ${SHIPS.length} are in the live feed.`,
    "The rule that keeps these pages honest: a ship that is not reporting shows no position. No last-known fix dressed up as live, no schedule presented as a location, no itinerary invented from a timetable. AIS coverage has real gaps — mid-ocean stretches beyond shore receivers — and the pages say so rather than papering over them.",
    `The registry is deliberately small and verified (facts checked ${REGISTRY_VERIFIED_AT}). A ship joins it only when her MMSI has been confirmed against public vessel registries — that number is what the live matching keys on, so it has to be right. More ships will be added the same way, one verified identity at a time.`,
  ];

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Ship tracker", href: "/ship-tracker" },
          { label: "Cruise ships" },
        ]}
      />
      <Hero
        h1="Cruise Ship Tracker — Where the Big Ships Are Right Now"
        sub="Live AIS positions for the flagship ships of Royal Caribbean, Carnival, Norwegian and Disney — one page per ship, with verified facts and homeport cameras. Free, no signup."
      />
      <Intro paragraphs={intro} />

      {lines.map((line) => (
        <section key={line} className="mt-12">
          <h2 className="flex items-center gap-2.5 text-xl md:text-2xl font-bold mb-5">
            <ShipIcon className="w-5 h-5 text-[#D4AF37]" /> {line}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {shipsByLine(line).map((s) => (
              <ShipCard
                key={s.slug}
                s={s}
                view={views.get(s.slug) ?? { status: "not-reporting" }}
              />
            ))}
          </div>
        </section>
      ))}

      <FaqSection title="Cruise ship tracking — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="More live WorldEye"
        links={[
          { label: "Live ship tracker (AIS)", href: "/ship-tracker" },
          { label: "Port webcams — harbour camera walls", href: "/port-webcams" },
          { label: "What is AIS?", href: "/what-is-ais" },
          { label: "Best ship tracking tools", href: "/best-ship-tracking-tools" },
        ]}
      />

      <CtaRow backHref="/ship-tracker" backLabel="Live ship tracker" />
    </PageShell>
  );
}
