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
import { EXPLORE_SCOPES, recordsForDef } from "@/lib/explore-data";
import { radarFrameIso } from "@/lib/noaa-radar";
import {
  CONUS_FRAME,
  RADAR_CREDIT,
  RADAR_METROS,
  radarSnapshotUrl,
} from "@/lib/radar-metros";

/* Same cadence as the metro pages: the frame is floored to NOAA's
   5-minute step, so the hub re-renders on that step too. */
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Weather Radar by Metro — Live NOAA NEXRAD & Cameras",
  description:
    "Live weather radar for 21 US metros: the NOAA/NWS NEXRAD mosaic centred on each metro, refreshed every 5 minutes, paired with the metro's public cameras. Free, no signup.",
  alternates: { canonical: `${BASE}/weather-radar` },
  openGraph: {
    title: "Weather Radar by Metro | WorldEye",
    description:
      "The NOAA nowCOAST radar frame for 21 US metros, each paired with its live camera wall.",
    url: `${BASE}/weather-radar`,
    type: "website",
  },
};

/** The measured near-misses the hub is honest about (30 km yields at
 *  each metro's own cluster centre, Oct 2026 — pinned in
 *  src/lib/radar-metros.test.ts). */
const NEAR_MISSES: Array<{ name: string; yield: number }> = [
  { name: "El Paso", yield: 225 },
  { name: "Austin", yield: 223 },
  { name: "Chicago", yield: 220 },
  { name: "Boise", yield: 219 },
  { name: "San Diego", yield: 219 },
  { name: "Pittsburgh", yield: 213 },
  { name: "Honolulu", yield: 128 },
  { name: "New Orleans", yield: 48 },
];

export default async function WeatherRadarHub() {
  const counts = new Map<string, number>();
  await Promise.all(
    RADAR_METROS.map(async (m) => {
      const records = await recordsForDef(EXPLORE_SCOPES[m.scopeKey]);
      counts.set(m.slug, records.length);
    }),
  );
  const totalCams = [...counts.values()].reduce((a, b) => a + b, 0);
  const fmt = (x: number) => x.toLocaleString("en-US");
  const sorted = [...RADAR_METROS].sort(
    (a, b) => (counts.get(b.slug) ?? 0) - (counts.get(a.slug) ?? 0),
  );

  const frameIso = radarFrameIso();
  const conus = radarSnapshotUrl({ ...CONUS_FRAME, frameIso });

  const faqs = [
    {
      q: "Whose radar is shown on these pages?",
      a: "The National Weather Service's, served by NOAA's nowCOAST — the NEXRAD base-reflectivity mosaic, US public domain data. It is the identical feed the WorldEye globe's radar layer serves; these pages centre it on one metro at a time and pair it with that metro's cameras. WorldEye does not operate radar and never presents the mosaic as its own.",
    },
    {
      q: "How does a metro earn a page?",
      a: "One measured rule: at least 250 WorldEye catalogue cameras within 30 km of the metro camera cluster's centre (the centroid of the cluster itself, not a gazetteer point). Twenty-one metros clear it today. The count is recomputed from the catalogue, so a metro whose camera field grows into the line joins the family — and the near-misses are printed below with their real numbers.",
      },
    {
      q: "Why is there no page for Chicago, Austin or San Diego?",
      a: "Because the rule is the rule: at their measured cluster centres they hold 220, 223 and 219 cameras inside 30 km — real camera fields, honestly short of the 250 line this family set. Rather than move the line for famous names, the hub prints their counts. Their city camera pages still exist and are linked from the index of all city webcams.",
    },
    {
      q: "Why only US metros?",
      a: "The nowCOAST mosaic covers the United States — CONUS, Alaska, Hawaii, the Caribbean and Guam. There is no equivalent public-domain national mosaic for other countries in the site's sources, so the family is US-only rather than padded with imagery the site cannot credit or refresh.",
    },
    {
      q: "Is the radar live?",
      a: "As live as the source publishes: nowCOAST republishes the mosaic about every five minutes, each frame on these pages carries its exact timestamp, and pages re-render on the same cadence. For the animated loop, open the weather tracker and switch on the radar layer.",
    },
  ];

  const hubLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Weather Radar by Metro",
    description: `Live NOAA/NWS NEXRAD radar frames and camera walls for ${RADAR_METROS.length} US metros.`,
    url: `${BASE}/weather-radar`,
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
      { "@type": "ListItem", position: 2, name: "Weather radar", item: `${BASE}/weather-radar` },
    ],
  };

  return (
    <PageShell>
      <JsonLd data={hubLd} />
      <JsonLd data={breadcrumbLd} />
      <FaqJsonLd faqs={faqs} />
      <Breadcrumb
        schema={false}
        trail={[{ label: "Home", href: "/" }, { label: "Weather radar" }]}
      />
      <Hero
        h1="Weather Radar by Metro — Live"
        sub={`The NOAA/NWS NEXRAD frame for ${RADAR_METROS.length} US metros, each paired with its live camera wall — ${fmt(totalCams)} cameras in all. Refreshed every 5 minutes. Free, no signup.`}
      />
      <StatRow
        stats={[
          { value: String(RADAR_METROS.length), label: "metros with a radar page" },
          { value: fmt(totalCams), label: "cameras inside the metro walls" },
          { value: "250+", label: "cameras within 30 km — the admission line" },
        ]}
      />
      <Intro
        paragraphs={[
          "Every national radar site shows the same map. These pages do the opposite: one metro per page, the mosaic windowed to that metro's 80 × 60 km frame, and underneath it the cameras that stand inside the frame — so when a cell crosses the radar, you can watch it cross the streets.",
          "The radar is NOAA's, credited to NOAA on every frame, and it is the same nowCOAST feed the WorldEye globe has always served. What WorldEye adds is the pairing: a measured camera wall (the count rule is stated on every page, and the metros that miss it are named below with their real numbers).",
        ]}
      />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          The continental frame right now
        </h2>
        <div className="rounded-2xl border border-white/10 bg-black/60 overflow-hidden max-w-4xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={conus}
            alt="NOAA NEXRAD radar mosaic over the continental United States"
            width={1200}
            height={900}
            className="w-full h-auto block"
            loading="eager"
          />
        </div>
        <p className="text-xs text-white/35 leading-relaxed max-w-3xl mt-3">
          {RADAR_CREDIT} — NEXRAD base-reflectivity mosaic, continental US
          window. Pick a metro below for its own frame and camera wall.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-5">The {RADAR_METROS.length} metros</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((m) => (
            <Link
              key={m.slug}
              href={`/weather-radar/${m.slug}`}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-[#00E5FF]/40 transition-colors"
            >
              <div className="font-bold">{m.name}</div>
              <div className="text-sm text-white/45 mt-1">
                {m.state} — {fmt(counts.get(m.slug) ?? 0)} cameras within {m.radiusKm} km
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12 max-w-3xl">
        <h2 className="text-xl md:text-2xl font-bold mb-3">The famous absences</h2>
        <p className="text-sm text-white/55 leading-relaxed">
          A metro joins this family at 250 catalogue cameras within 30 km of
          its camera cluster's centre — measured from the catalogue, the same
          rule for every city. These measured near-misses get no page yet,
          and their real numbers are printed rather than rounded up:{" "}
          {NEAR_MISSES.map((r) => `${r.name} ${r.yield}`).join(", ")}. New
          Orleans (48) is the honest surprise of the audit — a major metro
          whose public camera field is genuinely thin. If a metro's field
          grows past the line, it joins automatically at the next audit.
        </p>
      </section>

      <HowTo
        title="How to use the metro radar pages"
        steps={[
          "Pick your metro: the frame is already windowed to it — no panning a national map down to your streets.",
          "Read the frame stamp before the frame: the mosaic republishes about every five minutes, and the printed time is the picture you have.",
          "Drop to the camera wall for ground truth: the wall is nearest-first from the same centre, so the top of the wall is the middle of the frame.",
          "Treat an empty radar as information: reflectivity paints precipitation only, and a clear frame over wet-looking cameras (or the reverse) usually means the sweep and the street are minutes apart.",
          "For warnings and watches, the National Weather Service is the authority — these pages show pictures, not warnings.",
        ]}
      />

      <FaqSection title="Weather radar — FAQ" faqs={faqs} />

      <RelatedLinks
        title="More live weather & tracking"
        links={[
          { label: "Live weather tracker", href: "/weather-tracker" },
          { label: "Live wildfires — named incidents & perimeters", href: "/wildfires" },
          { label: "Tornado tracker", href: "/tornado-tracker" },
          { label: "Hurricane tracker", href: "/hurricane-tracker" },
          { label: "All city webcams", href: "/world-city-webcams" },
        ]}
      />

      <TrialCtaSection utmSource="weather-radar" />
    </PageShell>
  );
}
