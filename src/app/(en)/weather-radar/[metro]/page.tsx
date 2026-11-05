import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BASE,
  JsonLd,
  Breadcrumb,
  Hero,
  StatRow,
  Intro,
  SampleGrid,
  HowTo,
  FaqSection,
  FaqJsonLd,
  RelatedLinks,
  CtaRow,
  PageShell,
  type Sample,
} from "@/components/directory-page";
import DirectoryExplorer from "@/components/DirectoryExplorer";
import TrialCtaSection from "@/components/TrialCtaSection";
import PlaceWeatherPanel from "@/components/PlaceWeatherPanel";
import { EXPLORE_SCOPES, areasForDef, recordsForDef } from "@/lib/explore-data";
import { getPlaceWeather } from "@/lib/place-weather";
import { radarFrameIso } from "@/lib/noaa-radar";
import {
  RADAR_CREDIT,
  RADAR_METROS,
  radarMetroBySlug,
  radarSnapshotUrl,
  type RadarMetro,
} from "@/lib/radar-metros";

/* The radar frame is floored to NOAA's 5-minute step; ISR at the
   same cadence keeps the snapshot as fresh as the source publishes. */
export const revalidate = 300;

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const t = (x: number) => (x * Math.PI) / 180;
  const h =
    Math.sin(t(bLat - aLat) / 2) ** 2 +
    Math.cos(t(aLat)) * Math.cos(t(bLat)) * Math.sin(t(bLng - aLng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function nearestMetros(m: RadarMetro, n: number): RadarMetro[] {
  return RADAR_METROS.filter((o) => o.slug !== m.slug)
    .map((o) => ({ o, d: haversineKm(m.lat, m.lng, o.lat, o.lng) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((x) => x.o);
}

/** "Oct 28, 2026, 04:25 UTC" for a floored frame stamp. */
function frameLabel(frameIso: string, tz: string): { utc: string; local: string } {
  const d = new Date(frameIso);
  const utc = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(d);
  const local = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  }).format(d);
  return { utc: `${utc} UTC`, local };
}

export function generateStaticParams() {
  return RADAR_METROS.map((m) => ({ metro: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ metro: string }>;
}): Promise<Metadata> {
  const { metro: slug } = await params;
  const m = radarMetroBySlug(slug);
  if (!m) return { title: "Not found" };
  const records = await recordsForDef(EXPLORE_SCOPES[m.scopeKey]);
  const title = `${m.name} Weather Radar — Live NEXRAD & Cameras`;
  const description = `Live ${m.name} weather radar: the NOAA/NWS NEXRAD mosaic frame for the metro, refreshed every 5 minutes, with ${records.length} live cameras within ${m.radiusKm} km. Free, no signup.`;
  const url = `/weather-radar/${m.slug}`;
  return {
    title,
    description,
    alternates: { canonical: `${BASE}${url}` },
    openGraph: { title, description, url, type: "website" },
  };
}

export default async function RadarMetroPage({
  params,
}: {
  params: Promise<{ metro: string }>;
}) {
  const { metro: slug } = await params;
  const m = radarMetroBySlug(slug);
  if (!m) notFound();

  const def = EXPLORE_SCOPES[m.scopeKey];
  const records = await recordsForDef(def);
  const n = records.length;
  const fmt = (x: number) => x.toLocaleString("en-US");
  const areas = await areasForDef(def, 5);
  const allAreas = await areasForDef(def);
  const featured: Sample[] = records
    .slice(0, 8)
    .map((r) => ({ name: r.name, city: r.city, id: r.id }));

  /* The field's own composition — the per-source breakdown and the
     distance spread of the records this page already loads. Rendered
     as prose below so each metro's page states its own field's facts. */
  const sourceCounts = new Map<string, number>();
  for (const r of records) {
    const s = r.source?.trim();
    if (s) sourceCounts.set(s, (sourceCounts.get(s) ?? 0) + 1);
  }
  const topSources = [...sourceCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 5);
  const distances: number[] = [];
  for (const r of records) {
    if (typeof r.lat === "number" && typeof r.lng === "number") {
      distances.push(haversineKm(m.lat, m.lng, r.lat, r.lng));
    }
  }
  distances.sort((a, b) => a - b);
  const nearestKm = distances.length ? distances[0] : null;
  const medianKm = distances.length
    ? distances[Math.floor(distances.length / 2)]
    : null;
  const within10Km = distances.filter((d) => d <= 10).length;
  const band10to20Km = distances.filter((d) => d > 10 && d <= 20).length;
  const pctOfWall = (c: number) => Math.round((c / n) * 100);

  const frameIso = radarFrameIso();
  const frame = frameLabel(frameIso, m.tz);
  const snapshot = radarSnapshotUrl({ lat: m.lat, lng: m.lng, frameIso });

  const placeWeather = await getPlaceWeather({
    query: `${m.lat},${m.lng}`,
    lat: m.lat,
    lng: m.lng,
  });

  const topAreas = areas.map((a) => a.name).filter(Boolean);
  const intro: [string, string] = [
    `${m.name}'s radar frame is the NOAA/NWS nowCOAST mosaic — the same NEXRAD base-reflectivity feed the WorldEye globe's radar layer serves — drawn as one 80 × 60 km window over the metro. It is NOAA's picture, credited to NOAA, republished about every five minutes; WorldEye adds the ground truth underneath it: ${fmt(n)} public cameras within ${m.radiusKm} km of the metro's camera-cluster centre${topAreas.length ? `, densest around ${topAreas.slice(0, 3).join(", ")}` : ""}.`,
    m.note,
  ];

  const faqs = [
    {
      q: `Whose radar is this — is it a WorldEye feed?`,
      a: `No. The image is the National Weather Service's NEXRAD base-reflectivity mosaic, served by NOAA's nowCOAST — US public domain data, credited on the frame. It is the identical source the WorldEye globe's radar layer uses; this page simply centres it on ${m.name} and pairs it with the metro's cameras.`,
    },
    {
      q: "How fresh is the radar frame?",
      a: `nowCOAST republishes the mosaic about every five minutes, and the frame stamp under the image is the exact frame you are looking at (${frame.utc} in this render). This page refreshes on the same five-minute cadence — reload for the newest frame.`,
    },
    {
      q: "The radar looks empty. Is it broken?",
      a: `Probably not: base reflectivity only paints precipitation. A clear frame over ${m.name} means no rain, snow or storm echoes inside the window at that moment — the cameras below are the check: if they show dry streets under a clear sky, the empty radar is the true picture.`,
    },
    {
      q: `How is the camera count (${fmt(n)}) worked out?`,
      a: `It is the wall's stated rule, not a rounded claim: every camera in the WorldEye catalogue within ${m.radiusKm} km of the metro camera cluster's measured centre (${m.lat.toFixed(2)}, ${m.lng.toFixed(2)}), nearest first — the same set the explorer below serves, so the number you read is the number you get. Metros join this family at 250 cameras inside that circle.`,
    },
    {
      q: "Is it free?",
      a: "Yes — the radar frame and every camera on this page are free, with no account and no signup. NOAA's data is public domain; the cameras are the same public feeds the directory serves everywhere.",
    },
  ];

  const canonical = `${BASE}/weather-radar/${m.slug}`;
  const placeLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: `${m.name} metro area`,
    description: `Live NOAA/NWS NEXRAD radar frame for ${m.name}, ${m.state}, with ${n} public cameras within ${m.radiusKm} km.`,
    url: canonical,
    geo: { "@type": "GeoCoordinates", latitude: m.lat, longitude: m.lng },
    address: {
      "@type": "PostalAddress",
      addressRegion: m.state,
      addressCountry: "United States",
    },
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
      { "@type": "ListItem", position: 2, name: "Weather radar", item: `${BASE}/weather-radar` },
      { "@type": "ListItem", position: 3, name: m.name, item: canonical },
    ],
  };

  const siblings = nearestMetros(m, 3);

  return (
    <PageShell>
      <JsonLd data={placeLd} />
      <JsonLd data={breadcrumbLd} />
      <FaqJsonLd faqs={faqs} />
      <Breadcrumb
        schema={false}
        trail={[
          { label: "Home", href: "/" },
          { label: "Weather radar", href: "/weather-radar" },
          { label: m.name },
        ]}
      />
      <Hero
        h1={`${m.name} Weather Radar — Live`}
        sub={`The NOAA/NWS NEXRAD frame for ${m.name}, ${m.state} — refreshed every 5 minutes, with ${fmt(n)} live cameras within ${m.radiusKm} km. Free, no signup.`}
      />
      <StatRow
        stats={[
          { value: fmt(n), label: `cameras within ${m.radiusKm} km` },
          { value: "5 min", label: "radar frame cadence (NOAA nowCOAST)" },
          { value: m.state, label: "state" },
        ]}
      />
      <Intro paragraphs={intro} />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          {m.name} radar — frame as of {frame.utc}
        </h2>
        <div className="rounded-2xl border border-white/10 bg-black/60 overflow-hidden max-w-4xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={snapshot}
            alt={`NOAA NEXRAD radar mosaic over ${m.name}, frame ${frame.utc}`}
            width={1200}
            height={900}
            className="w-full h-auto block"
            loading="eager"
          />
        </div>
        <p className="text-xs text-white/35 leading-relaxed max-w-3xl mt-3">
          {RADAR_CREDIT} — NEXRAD base-reflectivity mosaic, frame {frame.utc} (
          {frame.local} local). The window is 80 × 60 km centred on the metro's
          camera-cluster centre; the {m.radiusKm} km circle the camera count
          comes from is inscribed in it. Reflectivity paints precipitation
          only — an empty frame over dry cameras is a clear sky, not an outage.
          For the animated, pannable version, open the{" "}
          <a href="/weather-tracker" className="text-[#00E5FF] hover:underline">
            weather tracker
          </a>{" "}
          and switch on the radar layer.
        </p>
      </section>

      {placeWeather && <PlaceWeatherPanel data={placeWeather} placeName={m.name} />}

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          All {fmt(n)} {m.name} cameras, live
        </h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Every catalogue camera within {m.radiusKm} km of the cluster centre,
          nearest first — when the radar shows a cell crossing the metro, these
          are the feeds standing under it. Open any camera here or on the globe.
        </p>
        <DirectoryExplorer
          scopeKey={m.scopeKey}
          scopeLabel={def.label}
          groupBy="city"
          searchPlaceholder={`Search ${m.name} cameras…`}
          explorerId={`radar-page-${m.slug}`}
        />
      </section>

      {featured.length > 0 && (
        <SampleGrid title={`Nearest cameras to the ${m.name} centre`} samples={featured} />
      )}

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          {m.name}&rsquo;s camera field, by source and distance
        </h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-4">
          {topSources.length === 1 ? (
            <>
              Every one of the {fmt(n)} cameras in this wall is filed under a
              single catalogue source — {topSources[0].name}. The wall&rsquo;s
              coverage is therefore exactly that source&rsquo;s network: where
              it has placed no camera, this page has none either, and the
              field&rsquo;s density map is that one network&rsquo;s placement
              across the metro.
            </>
          ) : (
            <>
              No single source is this wall: the {fmt(n)} cameras are filed
              under {sourceCounts.size} catalogue sources. The largest,{" "}
              {topSources[0].name}, supplies {fmt(topSources[0].count)} of them
              ({pctOfWall(topSources[0].count)}% of the wall)
              {topSources[1]
                ? `, and ${topSources[1].name} adds ${fmt(topSources[1].count)} (${pctOfWall(topSources[1].count)}%)`
                : ""}
              . The breakdown below is counted from the same records the
              explorer serves — a composite field reads differently from a
              single network&rsquo;s, and this one is a composite.
            </>
          )}
        </p>
        <ul className="text-sm text-white/55 leading-relaxed max-w-3xl space-y-1.5 mb-4 list-disc pl-5">
          {topSources.map((s) => (
            <li key={s.name}>
              {s.name} — {fmt(s.count)} cameras ({pctOfWall(s.count)}% of the
              wall)
            </li>
          ))}
        </ul>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-4">
          {allAreas.length > 1 ? (
            <>
              By the area names the records themselves carry, the field splits
              across {allAreas.length} areas — largest first:{" "}
              {allAreas
                .slice(0, 4)
                .map((a) => `${a.name} (${fmt(a.count)})`)
                .join(", ")}
              . The explorer&rsquo;s area chips use these same names, so the
              split you read here is the split you can filter by.
            </>
          ) : allAreas.length === 1 ? (
            <>
              Every record in the field carries the same area name —{" "}
              {allAreas[0].name} — so the explorer&rsquo;s area chips offer no
              finer split for this metro; distance from the centre is the
              useful cut here.
            </>
          ) : null}
        </p>
        {nearestKm !== null && medianKm !== null && (
          <p className="text-sm text-white/55 leading-relaxed max-w-3xl">
            Measured from the cluster centre ({m.lat.toFixed(2)},{" "}
            {m.lng.toFixed(2)}), the nearest camera
            {featured.length > 0 ? <> — {featured[0].name} —</> : null} stands{" "}
            {nearestKm.toFixed(1)} km away. {fmt(within10Km)} cameras sit
            within 10 km of the centre and {fmt(band10to20Km)} more between 10
            and 20 km; the field&rsquo;s median camera is {medianKm.toFixed(1)}{" "}
            km out, and the farthest record inside the {m.radiusKm} km rule
            is {distances[distances.length - 1].toFixed(1)} km from the
            centre.
          </p>
        )}
      </section>

      <HowTo
        title={`How to read ${m.name}'s weather on WorldEye`}
        steps={[
          "Start with the frame stamp: the mosaic republishes about every five minutes, and the time under the image is the frame you are actually seeing.",
          `Find the cell, then find its cameras: the wall is nearest-first from the same centre the radar window uses${featured.length > 0 ? ` — the first card is ${featured[0].name}${nearestKm !== null ? `, ${nearestKm.toFixed(1)} km from the centre` : ""}` : ""} — so a storm crossing the frame is crossing the top of the wall.`,
          `Check timestamps on the cameras before trusting a frame — a camera and a radar sweep minutes apart can tell different stories in fast weather.${medianKm !== null ? ` On this wall the median camera stands ${medianKm.toFixed(1)} km from the ${m.name} centre; start with the feeds inside that ring for the cell over the middle of the metro.` : ""}`,
          "For warnings, the National Weather Service is the authority: this page shows the radar picture and the ground view, and prints no warning of its own.",
          "Open the globe's radar layer for the animated loop and the lightning overlay — this page is the still frame, the globe is the movie.",
        ]}
      />

      <FaqSection title={`${m.name} weather radar — FAQ`} faqs={faqs} />

      <RelatedLinks
        title="More weather radar & cameras"
        links={[
          { label: "All weather radar metros", href: "/weather-radar" },
          ...siblings.map((s) => ({
            label: `${s.name} weather radar`,
            href: `/weather-radar/${s.slug}`,
          })),
          ...m.cityLinks.map((l) => ({ label: l.label, href: l.href })),
          { label: "Live weather tracker", href: "/weather-tracker" },
          { label: "Live wildfires — named incidents & perimeters", href: "/wildfires" },
        ]}
      />

      <TrialCtaSection utmSource="weather-radar" />
      <CtaRow backHref="/weather-radar" backLabel="All weather radar metros" />
    </PageShell>
  );
}
