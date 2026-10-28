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
import TrialCtaSection from "@/components/TrialCtaSection";
import PlaceWeatherPanel from "@/components/PlaceWeatherPanel";
import { loadCountryChunk } from "@/lib/explore-data";
import { applyScope } from "@/lib/explore-scopes";
import { getPlaceWeather } from "@/lib/place-weather";
import {
  getWildfireIncidents,
  perimeterPolygons,
  type WildfireIncident,
} from "@/lib/fire-perimeters";
import { getFirmsHotspots, summariseHotspotsNear } from "@/lib/firms-hotspots";

/* The federal feed refreshes about every 5 minutes; incident
   pages re-render on the same cadence and 404 once WFIGS drops
   the incident. */
export const revalidate = 300;

const CAMERA_RADIUS_KM = 50;
const DETECTION_RADIUS_KM = 40;

const fmt = (x: number) => x.toLocaleString("en-US");

function fmtUpdated(iso: string | null): string {
  if (!iso) return "not reported";
  return (
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }).format(new Date(iso)) + " UTC"
  );
}

async function findIncident(slug: string): Promise<{
  incident: WildfireIncident;
  all: WildfireIncident[];
} | null> {
  const all = await getWildfireIncidents();
  const incident = all.find((i) => i.slug === slug);
  return incident ? { incident, all } : null;
}

/**
 * The feed's own perimeter, drawn as an SVG outline: every polygon
 * of the (already ≈500 m simplified) WFIGS geometry, projected
 * equirectangularly on the perimeter's own bbox with the longitude
 * scale corrected by cos(mean latitude). An outline of the mapped
 * perimeter — not a live edge of the fire.
 */
function PerimeterSvg({ incident }: { incident: WildfireIncident }) {
  const polys = perimeterPolygons(incident.geometry);
  const bbox = incident.bbox;
  if (polys.length === 0 || !bbox) return null;
  const meanLat = ((bbox.minLat + bbox.maxLat) / 2) * (Math.PI / 180);
  const kx = Math.cos(meanLat);
  const W = 800;
  const spanX = Math.max((bbox.maxLng - bbox.minLng) * kx, 1e-9);
  const spanY = Math.max(bbox.maxLat - bbox.minLat, 1e-9);
  const scale = W / spanX;
  const H = Math.max(80, Math.min(800, Math.round(spanY * scale)));
  const paths = polys.map((poly) =>
    poly
      .map(
        (ring) =>
          ring
            .map(([lng, lat], i) => {
              const x = ((lng - bbox.minLng) * kx * scale).toFixed(1);
              const y = ((bbox.maxLat - lat) * scale).toFixed(1);
              return `${i === 0 ? "M" : "L"}${x},${y}`;
            })
            .join(" ") + " Z",
      )
      .join(" "),
  );
  return (
    <div className="rounded-2xl border border-white/10 bg-black/60 overflow-hidden max-w-4xl">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto block"
        role="img"
        aria-label={`Mapped perimeter outline of the ${incident.properties.name} Fire`}
      >
        {paths.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="rgba(255,87,34,0.22)"
            stroke="#ff7043"
            strokeWidth="1.5"
            fillRule="evenodd"
          />
        ))}
      </svg>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ incident: string }>;
}): Promise<Metadata> {
  const { incident: slug } = await params;
  const found = await findIncident(slug);
  if (!found) return { title: "Not found" };
  const { incident } = found;
  const p = incident.properties;
  const title = `${p.name} Fire (${p.state}) — Perimeter, Cameras & Map`;
  const bits = [
    p.acres !== null ? `${fmt(p.acres)} acres` : null,
    p.contained !== null ? `${p.contained}% contained` : null,
    `perimeter updated ${fmtUpdated(p.updated)}`,
  ].filter(Boolean);
  const description = `The ${p.name} Fire in ${p.state}, as the federal NIFC WFIGS feed reports it: ${bits.join(", ")}. Mapped perimeter, live cameras within ${CAMERA_RADIUS_KM} km and satellite heat detections — each labelled as what it is.`;
  const url = `/wildfires/${incident.slug}`;
  return {
    title,
    description,
    alternates: { canonical: `${BASE}${url}` },
    openGraph: { title, description, url, type: "website" },
  };
}

export default async function WildfireIncidentPage({
  params,
}: {
  params: Promise<{ incident: string }>;
}) {
  const { incident: slug } = await params;
  const found = await findIncident(slug);
  if (!found) notFound();
  const { incident, all } = found;
  const p = incident.properties;
  const centroid = incident.centroid;

  /* Cameras near the perimeter — a runtime radius over the US
     chunk (explorer scopes are a fixed registry by design, so this
     wall is a server-rendered nearest set, not an explorer). */
  let cameras: Sample[] = [];
  let cameraCount = 0;
  if (centroid) {
    const records = await loadCountryChunk("united-states").catch(() => []);
    const near = applyScope(records, {
      geo: { lat: centroid.lat, lng: centroid.lng, radiusKm: CAMERA_RADIUS_KM },
    });
    cameraCount = near.length;
    cameras = near.slice(0, 8).map((r) => ({ name: r.name, city: r.city, id: r.id }));
  }

  const { hotspots, source } = await getFirmsHotspots();
  const detections = centroid
    ? summariseHotspotsNear(hotspots, centroid.lat, centroid.lng, DETECTION_RADIUS_KM)
    : null;

  const placeWeather = centroid
    ? await getPlaceWeather({
        query: `${centroid.lat},${centroid.lng}`,
        lat: centroid.lat,
        lng: centroid.lng,
      })
    : null;

  const sameState = all
    .filter((i) => i.slug !== incident.slug && i.properties.state === p.state)
    .sort((a, b) => (b.properties.acres ?? -1) - (a.properties.acres ?? -1))
    .slice(0, 4);

  const globeHref = centroid
    ? `/?fire=${centroid.lat.toFixed(3)},${centroid.lng.toFixed(3)}`
    : "/wildfire-tracker";

  const faqs = [
    {
      q: `What is the source for the ${p.name} Fire's perimeter and figures?`,
      a: "The NIFC WFIGS Interagency Fire Perimeters (Current) service — the federal interagency perimeter feed. The acreage, containment and timestamp on this page are the feed's own fields, republished with credit and refreshed about every five minutes. The perimeter geometry is simplified by the source to roughly 500 m, so the outline is the mapped perimeter, not a surveyed line.",
    },
    {
      q: "Is the fire inside the outline right now?",
      a: "Not necessarily. A perimeter is the mapped boundary of the burned and burning area at the timestamp shown — it is not a live flame front. Containment, evacuations and closures are the managing agency's calls; check InciWeb and local emergency channels for anything operational.",
    },
    {
      q: "What are the satellite detections counted here?",
      a: `NASA FIRMS thermal detections (VIIRS/MODIS) within ${DETECTION_RADIUS_KM} km of the perimeter's centre in the last 24 hours. They are heat points a satellite saw — evidence of heat, which near a known incident usually means the fire's active edge and spots, but the feed itself also catches prescribed burns and other heat. They are counted and labelled as detections, never merged into the incident's own figures.`,
    },
    {
      q: "Why might this page disappear?",
      a: "It exists exactly while the incident is in the current federal feed. When WFIGS drops the incident — contained, merged or closed — this URL 404s rather than serving a stale fire as if it were current.",
    },
  ];

  const canonical = `${BASE}/wildfires/${incident.slug}`;
  const pageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${p.name} Fire — perimeter, cameras & map`,
    description: `The ${p.name} Fire (${p.state}) as reported by the NIFC WFIGS feed: ${p.acres !== null ? `${fmt(p.acres)} acres` : "acreage not reported"}${p.contained !== null ? `, ${p.contained}% contained` : ""}, perimeter updated ${fmtUpdated(p.updated)}.`,
    url: canonical,
    ...(centroid
      ? {
          spatialCoverage: {
            "@type": "Place",
            geo: { "@type": "GeoCoordinates", latitude: centroid.lat, longitude: centroid.lng },
          },
        }
      : {}),
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
      { "@type": "ListItem", position: 2, name: "Live wildfires", item: `${BASE}/wildfires` },
      { "@type": "ListItem", position: 3, name: `${p.name} Fire`, item: canonical },
    ],
  };

  return (
    <PageShell>
      <JsonLd data={pageLd} />
      <JsonLd data={breadcrumbLd} />
      <FaqJsonLd faqs={faqs} />
      <Breadcrumb
        schema={false}
        trail={[
          { label: "Home", href: "/" },
          { label: "Live wildfires", href: "/wildfires" },
          { label: `${p.name} Fire` },
        ]}
      />
      <Hero
        h1={`${p.name} Fire — ${p.state}`}
        sub={`As the federal NIFC WFIGS feed reports it: ${p.acres !== null ? `${fmt(p.acres)} acres` : "acreage not reported"}${p.contained !== null ? `, ${p.contained}% contained` : ""}. Mapped perimeter, ${fmt(cameraCount)} camera${cameraCount === 1 ? "" : "s"} within ${CAMERA_RADIUS_KM} km, and the satellite detections around it.`}
      />
      <StatRow
        stats={[
          {
            value: p.acres !== null ? fmt(p.acres) : "—",
            label: p.acres !== null ? "acres (WFIGS)" : "acres not reported",
          },
          {
            value: p.contained !== null ? `${p.contained}%` : "—",
            label: p.contained !== null ? "contained (WFIGS)" : "containment not reported",
          },
          { value: fmtUpdated(p.updated), label: "perimeter updated" },
        ]}
      />
      <Intro
        paragraphs={[
          `This page exists because the federal interagency perimeter feed (NIFC WFIGS) currently lists an incident named ${p.name} in ${p.state} — and it will stop existing the moment the feed drops it. Everything on it is the feed's own data, republished with credit: the perimeter outline drawn from its polygon, its acreage and containment fields, its timestamp.`,
          `Around that official core, WorldEye adds its own two layers, each labelled as what it is: the public cameras standing within ${CAMERA_RADIUS_KM} km of the perimeter's centre (the ground view, when a camera happens to face the smoke), and NASA FIRMS satellite heat detections within ${DETECTION_RADIUS_KM} km (heat a satellite saw in the last 24 hours — not ground reports, and never merged into the incident's figures). For official status, evacuations and closures, InciWeb and the managing agency outrank anything here.`,
        ]}
      />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">The mapped perimeter</h2>
        <PerimeterSvg incident={incident} />
        <p className="text-xs text-white/35 leading-relaxed max-w-3xl mt-3">
          Outline drawn from the WFIGS perimeter polygon (source-simplified to
          roughly 500 m), updated {fmtUpdated(p.updated)}. A perimeter is a
          mapped boundary at a moment in time, not a live flame front. Open it
          on the globe:{" "}
          <a href={globeHref} className="text-[#00E5FF] hover:underline">
            {p.name} Fire on the WorldEye map
          </a>
          . Official incident information:{" "}
          <a
            href="https://inciweb.wildfire.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00E5FF] hover:underline"
          >
            InciWeb
          </a>
          .
        </p>
      </section>

      {placeWeather && <PlaceWeatherPanel data={placeWeather} placeName={`${p.name} Fire area`} />}

      <section className="mt-12 max-w-3xl">
        <h2 className="text-xl md:text-2xl font-bold mb-3">Satellite heat detections nearby</h2>
        <p className="text-sm text-white/55 leading-relaxed">
          {source && detections
            ? `${fmt(detections.count)} detection${detections.count === 1 ? "" : "s"} within ${DETECTION_RADIUS_KM} km of the perimeter's centre in the last 24 hours (${source})${detections.maxFrp !== null ? `, the strongest at ${detections.maxFrp} MW fire radiative power` : ""}${detections.latest ? `, the latest at ${detections.latest} UTC` : ""}. Detections are thermal points from orbit — near a mapped incident they usually trace its active edge, but the feed also records prescribed burns and other heat, and no detection is renamed into fire behaviour here.`
            : "Satellite detection data (NASA FIRMS) was unavailable when this page rendered, so no detection count is printed rather than a zero that might be a lie. The perimeter and figures above are unaffected — they come from the federal feed."}
        </p>
      </section>

      {cameras.length > 0 && (
        <SampleGrid
          title={`Nearest cameras to the ${p.name} perimeter (${fmt(cameraCount)} within ${CAMERA_RADIUS_KM} km)`}
          samples={cameras}
        />
      )}

      <HowTo
        title={`How to follow the ${p.name} Fire`}
        steps={[
          "Watch the perimeter timestamp: the feed refreshes about every five minutes, and a polygon's age tells you how much to trust its edge.",
          "Use the cameras for smoke, not flames: a public camera near a fire usually shows the plume, the light and the road closures — the incident's ground truth at street level.",
          "Read containment as the agency's figure at the timestamp, not a live dial — it moves in steps as crews report.",
          "For evacuations, closures and orders, go to InciWeb and local emergency channels. This page republishes data; it issues nothing.",
        ]}
      />

      <FaqSection title={`${p.name} Fire — FAQ`} faqs={faqs} />

      <RelatedLinks
        title="More live fire tracking"
        links={[
          { label: "All live wildfires", href: "/wildfires" },
          ...sameState.map((i) => ({
            label: `${i.properties.name} Fire (${i.properties.state})`,
            href: `/wildfires/${i.slug}`,
          })),
          { label: "Wildfire tracker — fire activity on the globe", href: "/wildfire-tracker" },
          ...(p.state === "CA"
            ? [{ label: "California fire cameras", href: "/california-fire-cameras" }]
            : []),
          { label: "Weather radar by metro", href: "/weather-radar" },
        ]}
      />

      <TrialCtaSection utmSource="wildfires" />
      <CtaRow backHref="/wildfires" backLabel="All live wildfires" />
    </PageShell>
  );
}
