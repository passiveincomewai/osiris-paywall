import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  buildCorridor,
  getCorridor,
  CORRIDORS,
  SEGMENT_SAMPLE_CAP,
  type CorridorBuild,
  type CorridorSegment,
} from "@/lib/corridors";
import { loadCountryChunk } from "@/lib/explore-data";
import { interstateCorridorNoindex } from "@/lib/indexation-gates";
import { getPlaceWeather } from "@/lib/place-weather";
import { getPlows, getPlowFeedStatus, type Plow } from "@/lib/plows";
import {
  BASE,
  JsonLd,
  Breadcrumb,
  Hero,
  StatRow,
  Intro,
  AreaTable,
  SampleGrid,
  HowTo,
  FaqSection,
  FaqJsonLd,
  RelatedLinks,
  CtaRow,
  PageShell,
  type Faq,
} from "@/components/directory-page";

export const revalidate = 1800;

export function generateStaticParams() {
  return CORRIDORS.map((c) => ({ corridor: c.slug }));
}

async function loadBuild(slug: string): Promise<CorridorBuild | null> {
  const def = getCorridor(slug);
  if (!def) return null;
  const records = await loadCountryChunk("united-states");
  const build = buildCorridor(def, records);
  return build.qualifies ? build : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ corridor: string }>;
}): Promise<Metadata> {
  const { corridor } = await params;
  const def = getCorridor(corridor);
  if (!def) return {};
  const build = await loadBuild(corridor);
  if (!build) return {};
  const title = `${def.short} Traffic Cameras — Live ${def.name} Cameras by State`;
  const description = `Watch ${build.total} live ${def.short} highway cameras in driving order from ${def.from} to ${def.to}, grouped by state with live weather and plow counts where the feeds report them. Free on the WorldEye map.`;
  return {
    title: `${title} | WorldEye`,
    description,
    // R38 thin-wall tiering, shared predicate with the sitemap
    // (lib/indexation-gates). Unreachable today — a corridor only
    // reaches this metadata when buildCorridor qualifies it at
    // ≥250 cameras — but the gate stays wired so the two surfaces
    // can never drift if the corridor line ever moves.
    ...(interstateCorridorNoindex(build.total)
      ? { robots: { index: false, follow: true } }
      : {}),
    alternates: { canonical: `${BASE}/interstate-cameras/${def.slug}` },
    openGraph: { title, description, url: `${BASE}/interstate-cameras/${def.slug}` },
  };
}

const fmt = (n: number) => n.toLocaleString("en-US");

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

/** Live conditions line for one state segment — weather snapshot at the
 *  segment's camera centroid + plows currently reporting near it. Both
 *  halves render only when the underlying feed actually returns data;
 *  nothing is inferred or carried over from another segment. */
async function SegmentConditions({
  seg,
  plows,
}: {
  seg: CorridorSegment;
  plows: Plow[];
}) {
  let weatherLine: string | null = null;
  try {
    const pw = await getPlaceWeather({
      query: `${seg.anchorLat.toFixed(3)},${seg.anchorLng.toFixed(3)}`,
      lat: seg.anchorLat,
      lng: seg.anchorLng,
    });
    const cur = pw?.weather?.current;
    if (cur?.condition?.text) {
      const temp = typeof cur.tempF === "number" ? `, ${Math.round(cur.tempF)}°F` : "";
      const wind = typeof cur.windKph === "number" ? `, wind ${Math.round(cur.windKph)} km/h` : "";
      weatherLine = `Weather near mid-segment right now: ${cur.condition.text}${temp}${wind} (WeatherAPI.com).`;
    }
  } catch {
    weatherLine = null;
  }
  const nearPlows = plows.filter(
    (p) => haversineKm(seg.anchorLat, seg.anchorLng, p.lat, p.lng) <= 40,
  ).length;
  if (!weatherLine && nearPlows === 0) return null;
  return (
    <div className="mt-3 space-y-1 text-sm text-white/60">
      {weatherLine && <p>{weatherLine}</p>}
      {nearPlows > 0 && (
        <p>
          {nearPlows} snow {nearPlows === 1 ? "plow" : "plows"} currently reporting within 40 km of
          this stretch on the live plow layer.
        </p>
      )}
    </div>
  );
}

export default async function CorridorPage({
  params,
}: {
  params: Promise<{ corridor: string }>;
}) {
  const { corridor } = await params;
  const build = await loadBuild(corridor);
  if (!build) notFound();
  const { def, segments } = build;

  let plows: Plow[] = [];
  try {
    if (getPlowFeedStatus().ok !== false) plows = await getPlows();
  } catch {
    plows = [];
  }

  const stateRows = segments.map((s) => ({
    name: s.stateSlug ? `${s.stateName} (route miles ${s.startMile}–${s.endMile})` : s.stateName,
    count: s.cameras.length,
    href: s.stateSlug ? `/us-traffic-cameras/${s.stateSlug}` : undefined,
  }));

  const faqs: Faq[] = [
    {
      q: `How many cameras are on ${def.short}?`,
      a: `WorldEye's public index holds ${fmt(build.total)} cameras within 3 km of ${def.name}, across ${segments.length} state segments: ${segments
        .map((s) => `${s.stateName} (${fmt(s.cameras.length)})`)
        .join(", ")}. Counts are measured from the same catalogue this page's grids are drawn from.`,
    },
    {
      q: `How is this page ordered?`,
      a: `In driving order from ${def.from} to ${def.to}. Each camera's position is projected onto a reference path for the route, and cameras are listed by their distance along it — the "route miles" on each segment are measured along that path, not official mileposts. Where a camera's name carries a milepost, it is the DOT's own name for the feed.`,
    },
    {
      q: `Does this page show ${def.short} road conditions?`,
      a: `It shows the evidence, not a verdict: the live camera feeds themselves, a current weather snapshot for each state stretch (when the weather feed returns one), and snow-plow counts where the live plow layer is reporting. WorldEye does not invent condition ratings — if a stretch shows no weather line, no feed was wired for it.`,
    },
    def.faq,
    {
      q: "Are the cameras live?",
      a: "They are the state DOTs' own published feeds. Most highway cameras refresh as still images every few seconds rather than smooth video — plenty for judging congestion, closures and weather on the road. Tap any camera to open it on the live map.",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${def.short} Traffic Cameras — ${def.name}`,
    url: `${BASE}/interstate-cameras/${def.slug}`,
    description: `${fmt(build.total)} live ${def.name} highway cameras in driving order, grouped by state.`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: build.total,
      itemListElement: segments.map((s, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: `${def.short} cameras in ${s.stateName}`,
        url: s.stateSlug ? `${BASE}/us-traffic-cameras/${s.stateSlug}` : undefined,
      })),
    },
  };

  const related = [
    { label: "All interstate corridor camera pages", href: "/interstate-cameras" },
    { label: "Live traffic cameras", href: "/live-traffic-cameras" },
    ...segments
      .filter((s) => s.stateSlug)
      .slice(0, 6)
      .map((s) => ({
        label: `${s.stateName} traffic cameras`,
        href: `/us-traffic-cameras/${s.stateSlug}`,
      })),
    ...CORRIDORS.filter((c) => c.slug !== def.slug)
      .slice(0, 3)
      .map((c) => ({ label: `${c.short} traffic cameras`, href: `/interstate-cameras/${c.slug}` })),
  ];

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={faqs} />
      <Breadcrumb
        trail={[
          { label: "Interstate Cameras", href: "/interstate-cameras" },
          { label: `${def.short} Traffic Cameras` },
        ]}
      />
      <Hero
        h1={`${def.short} Traffic Cameras`}
        sub={`${fmt(build.total)} live ${def.name} highway cameras in driving order — ${def.from} to ${def.to}, grouped by state.`}
      />
      <StatRow
        stats={[
          { value: fmt(build.total), label: "cameras along the route" },
          { value: String(segments.length), label: "state segments" },
          { value: String(build.sources.length), label: "camera networks (DOTs)" },
          { value: "Free", label: "no account needed" },
        ]}
      />
      <Intro paragraphs={def.intro} />
      <AreaTable
        title={`${def.short} cameras by state`}
        rows={stateRows}
        note="Route miles are measured along the corridor's reference path from its start — an ordering aid, not official mileposts. Segments are listed in driving order."
      />
      {await Promise.all(
        segments.map(async (seg) => (
          <section key={seg.state} className="mt-4">
            <SegmentConditions seg={seg} plows={plows} />
            <SampleGrid
              title={`${def.short} in ${seg.stateName} — route miles ${seg.startMile}–${seg.endMile}`}
              samples={seg.cameras.slice(0, SEGMENT_SAMPLE_CAP).map((c) => ({
                name: c.name,
                city: `${seg.stateName} · ${fmt(seg.cameras.length)} cameras in this stretch`,
                id: c.id,
              }))}
            />
            {seg.cameras.length > SEGMENT_SAMPLE_CAP && (
              <p className="mt-3 text-sm text-white/50">
                Showing the first {SEGMENT_SAMPLE_CAP} of {fmt(seg.cameras.length)} cameras in this
                stretch, in driving order.{" "}
                <a href={BASE} className="text-[#00E5FF] hover:underline">
                  Open the live map
                </a>{" "}
                to browse the rest along the route.
              </p>
            )}
          </section>
        )),
      )}
      <HowTo
        title={`How to check ${def.short} road conditions`}
        steps={[
          "Find your state segment above — segments run in driving order with route-mile ranges.",
          "Read the segment's weather line and plow count when shown; both come from live feeds and appear only when those feeds report.",
          "Tap a camera near your stretch to open its live feed on the map.",
          "Compare the cameras just before and just after a pass, tunnel or metro — conditions change fastest at elevation and at rush hour.",
          "Re-check right before leaving on storm days, and never check cameras while driving.",
        ]}
      />
      <FaqSection title={`${def.short} traffic cameras — FAQ`} faqs={faqs} />
      <RelatedLinks title="Keep exploring" links={related} />
      <CtaRow backHref="/interstate-cameras" backLabel="All interstate corridors" />
    </PageShell>
  );
}
