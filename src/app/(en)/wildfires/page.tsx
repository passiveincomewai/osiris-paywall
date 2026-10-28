import type { Metadata } from "next";
import Link from "next/link";
import {
  BASE,
  JsonLd,
  Breadcrumb,
  Hero,
  StatRow,
  Intro,
  HowTo,
  FaqSection,
  FaqJsonLd,
  RelatedLinks,
  PageShell,
} from "@/components/directory-page";
import TrialCtaSection from "@/components/TrialCtaSection";
import { getWildfireIncidents, type WildfireIncident } from "@/lib/fire-perimeters";
import { getFirmsHotspots } from "@/lib/firms-hotspots";

/* The federal feed refreshes about every 5 minutes; the hub
   re-renders on the same cadence. */
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Live Wildfires — Named Incidents, Perimeters & Cameras",
  description:
    "Every wildfire currently in the federal NIFC WFIGS perimeter feed — name, state, acres, containment and perimeter — with live cameras near each incident. Free, no signup.",
  alternates: { canonical: `${BASE}/wildfires` },
  openGraph: {
    title: "Live Wildfires | WorldEye",
    description:
      "Named US wildfire incidents from the NIFC WFIGS feed, each with its perimeter and nearby live cameras.",
    url: `${BASE}/wildfires`,
    type: "website",
  },
};

const fmt = (x: number) => x.toLocaleString("en-US");

function fmtUpdated(iso: string | null): string {
  if (!iso) return "not reported";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(iso)) + " UTC";
}

export default async function WildfiresHub() {
  const incidents = await getWildfireIncidents();
  const { hotspots, source } = await getFirmsHotspots();

  const totalAcres = incidents.reduce((a, i) => a + (i.properties.acres ?? 0), 0);
  const states = new Set(incidents.map((i) => i.properties.state).filter(Boolean));

  const byState = new Map<string, WildfireIncident[]>();
  for (const inc of incidents) {
    const key = inc.properties.state || "—";
    const list = byState.get(key) ?? [];
    list.push(inc);
    byState.set(key, list);
  }
  const stateGroups = [...byState.entries()]
    .map(([state, list]) => ({
      state,
      list: [...list].sort(
        (a, b) => (b.properties.acres ?? -1) - (a.properties.acres ?? -1),
      ),
    }))
    .sort((a, b) => b.list.length - a.list.length || a.state.localeCompare(b.state));

  const faqs = [
    {
      q: "Where do the incident names and perimeters come from?",
      a: "The NIFC WFIGS Interagency Fire Perimeters (Current) service — the federal interagency feed of mapped US wildfire perimeters. It names each incident and carries its state, acreage, percent contained and perimeter polygon, refreshed about every five minutes. This hub lists exactly what that feed lists, nothing added.",
    },
    {
      q: "What is the difference between an incident and a hotspot?",
      a: "An incident is a named fire an agency is managing, with a mapped perimeter — that is what WFIGS carries and what gets a page here. A hotspot is a satellite heat detection (NASA FIRMS, VIIRS/MODIS): a point where a satellite saw something hot in the last 24 hours. Detections include prescribed burns, farm burns and industrial heat, and they are never renamed into incidents on this site — incident pages show them separately, labelled as detections.",
    },
    {
      q: "Why did an incident's page disappear?",
      a: "A page exists exactly while its incident is in the current federal feed. When WFIGS drops an incident — contained, merged into a complex, or closed out — its page here goes with it. The globe's wildfire layer keeps showing current activity either way.",
    },
    {
      q: "Is this an official source for fire information?",
      a: "No. WorldEye republishes federal data with credit; decisions belong to the incident's managing agency. For official status, evacuations and closures, use InciWeb and your state and local emergency channels — links are on every incident page.",
    },
  ];

  const hubLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Live Wildfires — Named Incidents & Perimeters",
    description: `${incidents.length} wildfire incidents currently listed in the NIFC WFIGS perimeter feed, each with acres, containment, perimeter and nearby cameras.`,
    url: `${BASE}/wildfires`,
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
      { "@type": "ListItem", position: 2, name: "Live wildfires", item: `${BASE}/wildfires` },
    ],
  };

  return (
    <PageShell>
      <JsonLd data={hubLd} />
      <JsonLd data={breadcrumbLd} />
      <FaqJsonLd faqs={faqs} />
      <Breadcrumb
        schema={false}
        trail={[{ label: "Home", href: "/" }, { label: "Live wildfires" }]}
      />
      <Hero
        h1="Live Wildfires — Named Incidents & Perimeters"
        sub={
          incidents.length > 0
            ? `${incidents.length} wildfire incident${incidents.length === 1 ? "" : "s"} in the federal NIFC WFIGS feed right now, each with its perimeter, acreage, containment and nearby live cameras. Free, no signup.`
            : "The federal NIFC WFIGS perimeter feed currently lists no incidents. The globe's wildfire layer and satellite detection counts below stay live either way."
        }
      />
      <StatRow
        stats={[
          { value: fmt(incidents.length), label: "named incidents in the feed now" },
          { value: fmt(totalAcres), label: "total reported acres" },
          {
            value: source ? fmt(hotspots.length) : "—",
            label: source
              ? `satellite heat detections, last 24h (${source})`
              : "satellite detections unavailable at render",
          },
        ]}
      />
      <Intro
        paragraphs={[
          "This index is the federal fire map, republished with credit: every incident the NIFC WFIGS service currently carries, grouped by state, largest first. Open one for its perimeter outline, the cameras standing near it, and the satellite heat detections around it — each kind of data labelled as what it is.",
          "Detections are not incidents. NASA's FIRMS satellites log heat points worldwide — over a thousand on a busy day in the US alone — including prescribed and agricultural burns that no agency will ever name. Nothing on this site promotes a detection into a named fire: a page exists only for an incident the federal feed itself names.",
        ]}
      />

      {incidents.length === 0 ? (
        <section className="mt-12 max-w-3xl rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-lg font-bold">No incidents in the feed at this render</h2>
          <p className="text-sm text-white/55 leading-relaxed mt-2">
            Either the United States genuinely has no mapped incidents in the
            current WFIGS release — common in the wet season — or the feed
            could not be reached when this page rendered. The page refreshes
            every five minutes. Meanwhile the{" "}
            <Link href="/wildfire-tracker" className="text-[#00E5FF] hover:underline">
              wildfire tracker
            </Link>{" "}
            shows live fire activity on the globe from satellite detections.
          </p>
        </section>
      ) : (
        stateGroups.map(({ state, list }) => (
          <section key={state} className="mt-12">
            <h2 className="text-xl md:text-2xl font-bold mb-4">
              {state} — {list.length} incident{list.length === 1 ? "" : "s"}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((inc) => (
                <Link
                  key={inc.slug}
                  href={`/wildfires/${inc.slug}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-[#00E5FF]/40 transition-colors"
                >
                  <div className="font-bold">{inc.properties.name} Fire</div>
                  <div className="text-sm text-white/45 mt-1">
                    {inc.properties.acres !== null
                      ? `${fmt(inc.properties.acres)} acres`
                      : "acreage not reported"}
                    {inc.properties.contained !== null
                      ? ` · ${inc.properties.contained}% contained`
                      : ""}
                  </div>
                  <div className="text-xs text-white/35 mt-1">
                    Perimeter updated {fmtUpdated(inc.properties.updated)}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}

      <HowTo
        title="How to read this index"
        steps={[
          "Start with containment and the perimeter timestamp, not the name: a 100%-contained incident is still listed while the feed carries it, and the timestamp tells you how current the polygon is.",
          "Open the incident for its ground view: the cameras nearest the perimeter are listed there, nearest first, with the satellite detections around it counted separately.",
          "Cross-check anything that matters on InciWeb or the managing agency's channels — this site republishes federal data and makes no operational claims of its own.",
          "For the global picture — detections everywhere, not just US incidents — open the wildfire tracker on the globe.",
        ]}
      />

      <FaqSection title="Live wildfires — FAQ" faqs={faqs} />

      <RelatedLinks
        title="More fire & weather tracking"
        links={[
          { label: "Wildfire tracker — fire activity on the globe", href: "/wildfire-tracker" },
          { label: "California fire cameras", href: "/california-fire-cameras" },
          { label: "Weather radar by metro", href: "/weather-radar" },
          { label: "Live weather tracker", href: "/weather-tracker" },
        ]}
      />

      <TrialCtaSection utmSource="wildfires" />
    </PageShell>
  );
}
