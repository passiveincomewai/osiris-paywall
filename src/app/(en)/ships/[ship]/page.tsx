import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Camera, Ship as ShipIcon } from "lucide-react";
import {
  BASE,
  Breadcrumb,
  CtaRow,
  FaqJsonLd,
  FaqSection,
  JsonLd,
  PageShell,
  RelatedLinks,
} from "@/components/directory-page";
import AisFeedNotice from "@/components/AisFeedNotice";
import ShipLiveCard from "@/components/ShipLiveCard";
import { getLiveShipsForTracking } from "@/app/api/maritime/route";
import {
  getShip,
  REGISTRY_VERIFIED_AT,
  SHIPS,
  shipsByLine,
  type TrackedShip,
} from "@/lib/ships/registry";
import {
  matchShipToFeed,
  NOT_REPORTING,
  type FeedShip,
  type ShipLiveView,
} from "@/lib/ships/match";

export const revalidate = 60;

export function generateStaticParams() {
  return SHIPS.map((s) => ({ ship: s.slug }));
}

function pageTitle(s: TrackedShip): string {
  return `Where Is ${s.name} Right Now? — Live ${s.name} Tracker`;
}

function pageDescription(s: TrackedShip): string {
  const home = s.homeports.length
    ? ` Homeport: ${s.homeports.map((h) => h.name).join(" · ")}.`
    : "";
  return `Track ${s.name} live — her current AIS position, speed, heading and broadcast destination whenever she is reporting, plus verified ship facts (${s.grossTonnage.toLocaleString("en-US")} GT, ${s.passengersDouble.toLocaleString("en-US")} passengers) and homeport cameras.${home} Free, no signup.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ship: string }>;
}): Promise<Metadata> {
  const { ship: slug } = await params;
  const s = getShip(slug);
  if (!s) return { title: "Not found" };
  const url = `/ships/${slug}`;
  return {
    title: pageTitle(s),
    description: pageDescription(s),
    alternates: { canonical: `${BASE}${url}` },
    openGraph: {
      title: pageTitle(s),
      description: pageDescription(s),
      url,
      type: "website",
    },
  };
}

/** Best-effort first paint from this process's own AIS cache; the card
 *  then polls /api/ships/[ship] for freshness. Any failure simply means
 *  the honest not-reporting state. */
function initialView(s: TrackedShip): ShipLiveView {
  try {
    const now = Date.now();
    const feed = getLiveShipsForTracking(now) as FeedShip[];
    return matchShipToFeed(s, feed, now);
  } catch {
    return NOT_REPORTING;
  }
}

function faqsFor(s: TrackedShip) {
  const home = s.homeports.map((h) => h.name).join(" and ");
  const wallPort = s.homeports.find((h) => h.wallKey);
  return [
    {
      q: `Where is ${s.name} right now?`,
      a: `When ${s.name} is broadcasting AIS within receiver coverage, the live card at the top of this page shows her current position, speed, heading and the destination she is reporting — with the time of her last report. When she is not reporting, the card says so plainly: this page never shows a guessed, scheduled or last-known position as if it were live.`,
    },
    {
      q: `How does the ${s.name} tracker work?`,
      a: `Like every large vessel, ${s.name} carries an AIS transponder that broadcasts her identity (MMSI ${s.mmsi}), position, speed and heading. WorldEye's maritime feed listens to those broadcasts; this page matches them to ${s.name} by her MMSI number and shows the latest report while it is fresh — reports older than ten minutes are treated as not live.`,
    },
    {
      q: `What is ${s.name}'s homeport?`,
      a: s.homeports.length
        ? `${s.name} sails from ${home}. She entered service in ${s.enteredService} and currently sails ${s.regions.charAt(0).toLowerCase()}${s.regions.slice(1)}.`
        : `${s.name} entered service in ${s.enteredService} and sails ${s.regions.charAt(0).toLowerCase()}${s.regions.slice(1)}, repositioning between seasonal homeports.`,
    },
    {
      q: `How big is ${s.name}?`,
      a: `${s.name} is a ${s.shipClass} ship of ${s.grossTonnage.toLocaleString("en-US")} gross tons and ${s.lengthM} metres long, carrying ${s.passengersDouble.toLocaleString("en-US")} passengers at double occupancy${s.passengersMax ? ` and up to ${s.passengersMax.toLocaleString("en-US")} at maximum capacity` : ""}. Her IMO number is ${s.imo} and her call sign is ${s.callSign}.`,
    },
    {
      q: `Why does ${s.name} sometimes disappear from the tracker?`,
      a: `AIS is a radio broadcast with finite range. Mid-ocean, far from shore receivers, a ship can go quiet for stretches; transponders are also occasionally switched off or faulty. A gap means the feed has no fresh report — not that the ship has stopped. The card on this page shows the age of the last report so you can judge freshness yourself.`,
    },
    {
      q: `Can I watch ${s.name} arrive in port?`,
      a: wallPort
        ? `Yes — pair this tracker with the harbour cameras. ${wallPort.name} has a camera wall on WorldEye's port webcams page: follow ${s.name} here until she is on final approach, then watch the arrival itself on the port wall.`
        : `WorldEye's port webcams page collects live harbour camera walls for the world's great ports. ${s.name}'s homeport does not have a dedicated wall there yet, so the honest answer is: track her approach here, and browse the port hub for the nearest covered harbours.`,
    },
  ];
}

export default async function ShipPage({
  params,
}: {
  params: Promise<{ ship: string }>;
}) {
  const { ship: slug } = await params;
  const s = getShip(slug);
  if (!s) notFound();

  const faqs = faqsFor(s);
  const sisters = shipsByLine(s.line).filter((x) => x.slug !== s.slug);
  const facts: { label: string; value: string }[] = [
    { label: "Cruise line", value: s.line },
    { label: "Class", value: s.shipClass },
    { label: "Gross tonnage", value: `${s.grossTonnage.toLocaleString("en-US")} GT` },
    { label: "Length", value: `${s.lengthM} m` },
    {
      label: "Passengers",
      value:
        `${s.passengersDouble.toLocaleString("en-US")} at double occupancy` +
        (s.passengersMax
          ? ` · ${s.passengersMax.toLocaleString("en-US")} maximum`
          : "") +
        (s.passengersNote ? ` (${s.passengersNote})` : ""),
    },
    { label: "Entered service", value: s.enteredService },
    {
      label: "Homeport",
      value: s.homeports.length
        ? s.homeports
            .map((h) => h.name + (h.note ? ` (${h.note})` : ""))
            .join(" · ")
        : "Seasonal — see sailing regions",
    },
    { label: "Sailing regions", value: s.regions },
    { label: "IMO number", value: s.imo },
    { label: "MMSI", value: String(s.mmsi) },
    { label: "Call sign", value: s.callSign },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: pageTitle(s),
    description: pageDescription(s),
    url: `${BASE}/ships/${s.slug}`,
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: BASE },
    about: {
      "@type": "Thing",
      name: s.name,
      description: `${s.line} ${s.shipClass} cruise ship, IMO ${s.imo}, MMSI ${s.mmsi}.`,
    },
  };

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={faqs} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Ship tracker", href: "/ship-tracker" },
          { label: "Cruise ships", href: "/ships" },
          { label: s.name },
        ]}
      />

      <div className="mt-8">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#00E5FF] border border-[#00E5FF]/30 rounded-full px-4 py-1.5">
          <ShipIcon className="w-3.5 h-3.5" /> LIVE CRUISE SHIP TRACKER
        </p>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mt-5">
          Where is {s.name} <span className="text-[#00E5FF]">right now?</span>
        </h1>
        <p className="text-white/55 mt-4 text-base md:text-lg leading-relaxed max-w-3xl">
          {s.line} · {s.shipClass} ·{" "}
          {s.homeports.length
            ? `sailing from ${s.homeports.map((h) => h.name).join(" and ")}`
            : s.regions}
          . Her live AIS position when she is reporting — and an honest
          &ldquo;not reporting&rdquo; when she isn&apos;t.
        </p>
      </div>

      {/* Feed-level honesty (audit A4): explains a dead AIS feed next to
          the per-ship "not reporting" card; renders only while unset. */}
      <AisFeedNotice locale="en" className="mt-8" />

      <div className="mt-8">
        <ShipLiveCard slug={s.slug} shipName={s.name} initial={initialView(s)} />
      </div>

      <section className="mt-14">
        <h2 className="text-2xl md:text-3xl font-bold">
          About <span className="text-[#D4AF37]">{s.name}</span>
        </h2>
        <p className="text-white/60 leading-relaxed mt-4 max-w-3xl">{s.blurb}</p>
        <p className="text-white/60 leading-relaxed mt-4 max-w-3xl">
          This page tracks {s.name} by the identity she broadcasts: MMSI{" "}
          {s.mmsi}, matched against WorldEye&apos;s live AIS maritime feed.
          The destination on the live card is the one her crew entered into
          the transponder, shown exactly as transmitted — AIS destinations
          are free text and are occasionally out of date, so read them as
          the ship&apos;s stated intention, not a booked itinerary.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl md:text-3xl font-bold">
          {s.name} <span className="text-[#D4AF37]">facts</span>
        </h2>
        <dl className="mt-6 rounded-3xl border border-white/10 bg-white/[0.02] overflow-hidden">
          {facts.map((f, i) => (
            <div
              key={f.label}
              className={`grid sm:grid-cols-[220px_1fr] gap-1 sm:gap-4 px-6 py-4 ${
                i % 2 === 1 ? "bg-white/[0.02]" : ""
              }`}
            >
              <dt className="text-sm font-medium text-white/40">{f.label}</dt>
              <dd className="text-sm text-white/85">{f.value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-white/35 leading-relaxed mt-4 max-w-3xl">
          Ship facts verified {REGISTRY_VERIFIED_AT} against{" "}
          <a
            href={s.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white/60"
          >
            the ship&apos;s reference entry
          </a>
          .{s.sourceNote ? ` Note: ${s.sourceNote}` : ""}
        </p>
      </section>

      {s.homeports.length > 0 && (
        <section className="mt-14">
          <h2 className="text-2xl md:text-3xl font-bold">
            Watch her <span className="text-[#D4AF37]">homeport</span>
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 mt-6">
            {s.homeports.map((h) => (
              <div
                key={h.name}
                className="rounded-3xl border border-white/10 bg-white/[0.02] p-6"
              >
                <Camera className="w-5 h-5 text-[#00E5FF] mb-3" />
                <p className="font-semibold text-white/90">{h.name}</p>
                {h.wallKey ? (
                  <p className="text-sm text-white/50 leading-relaxed mt-2">
                    Live harbour cameras for this port are on the port
                    webcams page — follow {s.name} here on AIS, then watch
                    the harbour as she berths.
                  </p>
                ) : (
                  <p className="text-sm text-white/50 leading-relaxed mt-2">
                    The port webcams hub doesn&apos;t carry a dedicated wall
                    for this port yet — it says so rather than dressing up
                    another harbour&apos;s cameras. The hub lists the ports
                    that do have real walls.
                  </p>
                )}
                <Link
                  href={
                    h.wallKey ? `/port-webcams#port-${h.wallKey}` : "/port-webcams"
                  }
                  className="inline-block mt-4 text-sm font-semibold text-[#D4AF37] hover:underline"
                >
                  {h.wallKey ? "Open the port camera wall" : "Browse port webcams"} →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {sisters.length > 0 && (
        <section className="mt-14">
          <h2 className="text-2xl md:text-3xl font-bold">
            More <span className="text-[#D4AF37]">{s.line}</span> ships
          </h2>
          <div className="flex flex-wrap gap-2.5 mt-6">
            {sisters.map((x) => (
              <Link
                key={x.slug}
                href={`/ships/${x.slug}`}
                className="px-4 py-2 rounded-full border border-white/15 text-sm text-white/75 hover:bg-white/5 hover:text-white transition"
              >
                Where is {x.name}?
              </Link>
            ))}
            <Link
              href="/ships"
              className="px-4 py-2 rounded-full border border-[#00E5FF]/30 text-sm text-[#00E5FF] hover:bg-[#00E5FF]/10 transition"
            >
              All tracked cruise ships
            </Link>
          </div>
        </section>
      )}

      <FaqSection title={`${s.name} — FAQ`} faqs={faqs} />

      <RelatedLinks
        title="More live WorldEye"
        links={[
          { label: "Live ship tracker (AIS)", href: "/ship-tracker" },
          { label: "All tracked cruise ships", href: "/ships" },
          { label: "Port webcams — harbour camera walls", href: "/port-webcams" },
          { label: "What is AIS?", href: "/what-is-ais" },
        ]}
      />

      <CtaRow backHref="/ships" backLabel="All tracked cruise ships" />
    </PageShell>
  );
}
