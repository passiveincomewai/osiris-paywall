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
import { EXPLORE_SCOPES, recordsForDef } from "@/lib/explore-data";
import { getPlaceWeather } from "@/lib/place-weather";
import {
  NATIONAL_PARKS,
  parkBySlug,
  parkSunTimes,
  type NationalPark,
} from "@/lib/national-parks";
import { parkSpokeNoindex } from "@/lib/indexation-gates";

/* Weather is cached per location for 30 minutes in lib/weather-api;
   ISR at the same cadence keeps the page (and today's sun times) fresh. */
export const revalidate = 1800;

/** Title tails — the "[Park] webcam live" query shape, honestly aimed
 *  at what each wall actually holds. */
const TITLE_TAILS: Record<string, string> = {
  yellowstone: "Mammoth Terraces, Mount Washburn & the Entrances",
  "grand-canyon": "Bright Angel, Kolb Studio & the South Rim",
  yosemite: "Half Dome, El Capitan & the Valley",
  "rocky-mountain": "Trail Ridge, Kawuneeche & Both Entrances",
  redwood: "Elk Prairie, the Groves & US-101",
  haleakala: "the Crater Cam & Summit Sunrise",
  acadia: "Jordan Pond & Mount Desert Island",
  denali: "the Park Entrance District, Live",
  "glacier-bay": "Gustavus, the Park's Gateway",
  "isle-royale": "Rock Harbor, Mott Island & the Ridge",
  "crater-lake": "the Lake, Rim Village & the Climb",
  "mount-rainier": "Paradise, Longmire & the Mountain",
  "grand-teton": "the In-Park Airport & the Range",
  "kenai-fjords": "Seward & Resurrection Bay",
  "virgin-islands": "Maho Bay & St. John's Park Beaches",
  "hawaii-volcanoes": "Holei Pali & the Chain of Craters Road",
  zion: "Springdale & the SR-9 Entrance Corridor",
  arches: "the Entrance Road & Moab",
  "bryce-canyon": "Bryce Canyon City & SR-63",
  "black-canyon-of-the-gunnison": "Gunnison Point & the South Rim",
  shenandoah: "Skyline Drive & the Blue Ridge",
  olympic: "Hurricane Ridge & Port Angeles",
};

const SPECIAL_LINKS: Record<string, { label: string; href: string }[]> = {
  "hawaii-volcanoes": [
    { label: "Volcano webcams — Kīlauea's crater cameras live", href: "/volcano-webcams" },
  ],
  denali: [{ label: "Northern lights webcams", href: "/northern-lights-webcams" }],
  "glacier-bay": [{ label: "Northern lights webcams", href: "/northern-lights-webcams" }],
  "isle-royale": [{ label: "Northern lights webcams", href: "/northern-lights-webcams" }],
  zion: [{ label: "Dark sky cameras", href: "/dark-sky-cameras" }],
  "bryce-canyon": [{ label: "Dark sky cameras", href: "/dark-sky-cameras" }],
  haleakala: [{ label: "Dark sky cameras", href: "/dark-sky-cameras" }],
};

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const t = (x: number) => (x * Math.PI) / 180;
  const h =
    Math.sin(t(bLat - aLat) / 2) ** 2 +
    Math.cos(t(aLat)) * Math.cos(t(bLat)) * Math.sin(t(bLng - aLng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function nearestParks(p: NationalPark, n: number): NationalPark[] {
  return NATIONAL_PARKS.filter((o) => o.slug !== p.slug)
    .map((o) => ({ o, d: haversineKm(p.lat, p.lng, o.lat, o.lng) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((x) => x.o);
}

export function generateStaticParams() {
  return NATIONAL_PARKS.map((p) => ({ park: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ park: string }>;
}): Promise<Metadata> {
  const { park: slug } = await params;
  const p = parkBySlug(slug);
  if (!p) return { title: "Not found" };
  const records = await recordsForDef(EXPLORE_SCOPES[p.scopeKey]);
  const n = records.length;
  const title = `${p.short} Webcam Live — ${TITLE_TAILS[p.slug] ?? p.name}`;
  const description = `Watch ${p.name} live: ${n} cameras within ${p.radiusKm} km of ${p.centreLabel} — ${p.highlights.slice(0, 3).join(", ")} and the park's weather. Free, no signup.`;
  const url = `/national-park-webcams/${p.slug}`;
  return {
    title,
    description,
    // R38 thin-wall tiering: a spoke under the shared gate's camera
    // line stays live but noindexed (the sitemap applies the same
    // predicate to the same count — lib/indexation-gates).
    ...(parkSpokeNoindex(n) ? { robots: { index: false, follow: true } } : {}),
    alternates: { canonical: `${BASE}${url}` },
    openGraph: { title, description, url, type: "website" },
  };
}

export default async function NationalParkPage({
  params,
}: {
  params: Promise<{ park: string }>;
}) {
  const { park: slug } = await params;
  const p = parkBySlug(slug);
  if (!p) notFound();

  const def = EXPLORE_SCOPES[p.scopeKey];
  const records = await recordsForDef(def);
  const n = records.length;
  const fmt = (x: number) => x.toLocaleString("en-US");
  const nps = records.filter((r) => r.source === "OpenCCTV / nps");
  const featured: Sample[] = (nps.length > 0 ? nps : records)
    .slice(0, 8)
    .map((r) => ({ name: r.name, city: r.city, id: r.id }));

  const canonical = `${BASE}/national-park-webcams/${p.slug}`;
  const sun = parkSunTimes(p.lat, p.lng, p.tz);
  const placeWeather = await getPlaceWeather({
    query: `${p.lat},${p.lng}`,
    lat: p.lat,
    lng: p.lng,
  });

  const faqs = [
    ...p.faqs,
    {
      q: `How many webcams are there at ${p.short}, and how is the count worked out?`,
      a: `This page's wall holds ${fmt(n)} cameras. The rule is stated, not rounded: every camera in the WorldEye catalogue within ${p.radiusKm} km of ${p.centreLabel}, nearest first — the same rule the explorer below serves, so the number you read is the number you get. ${nps.length > 0 ? `${nps.length} of them are National Park Service cameras.` : "None of them is a park-service camera; the wall is the park's gateway and approach, and it is labelled that way."}`,
    },
    {
      q: "Are these official National Park Service webcams?",
      a:
        nps.length > 0
          ? `Some are: ${nps.length} of the ${fmt(n)} cameras in this wall are National Park Service feeds (${nps.map((r) => r.name).slice(0, 4).join("; ")}). The rest are the feeds that share the park's ground — state highway cameras, FAA weather cameras, university research phenocams and public webcams inside the same radius. Every camera in the explorer is labelled with its source, so you always know whose eyes you are borrowing.`
          : "No — and the page doesn't pretend otherwise. The catalogue holds no park-service camera for this park, so the wall is built from the cameras of its gateway and approaches: FAA weather cameras, state highway cameras and public feeds within the stated radius, each labelled with its source in the explorer. If the park service publishes a feed, it will appear here automatically.",
    },
    {
      q: "Is it free to watch?",
      a: "Yes — every camera on this page opens free on WorldEye, with no account and no signup. A free WorldEye account raises your daily camera-open limit, and the globe's Pro tools are a separate matter; the park walls themselves are free, full stop.",
    },
  ];

  const parkLd = {
    "@context": "https://schema.org",
    "@type": "Park",
    name: p.name,
    description: `${n} live cameras within ${p.radiusKm} km of ${p.centreLabel} — ${p.highlights.join(", ")}.`,
    url: canonical,
    geo: { "@type": "GeoCoordinates", latitude: p.lat, longitude: p.lng },
    address: {
      "@type": "PostalAddress",
      addressRegion: p.region,
      addressCountry: "US",
    },
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
      { "@type": "ListItem", position: 2, name: "Live webcams", item: `${BASE}/live-webcams` },
      {
        "@type": "ListItem",
        position: 3,
        name: "National park webcams",
        item: `${BASE}/national-park-webcams`,
      },
      { "@type": "ListItem", position: 4, name: p.short, item: canonical },
    ],
  };

  const siblings = nearestParks(p, 3);

  return (
    <PageShell>
      <JsonLd data={parkLd} />
      <JsonLd data={breadcrumbLd} />
      <FaqJsonLd faqs={faqs} />
      <Breadcrumb
        schema={false}
        trail={[
          { label: "Home", href: "/" },
          { label: "Live webcams", href: "/live-webcams" },
          { label: "National park webcams", href: "/national-park-webcams" },
          { label: p.short },
        ]}
      />
      <Hero
        h1={`${p.name} Webcams — Live`}
        sub={`${fmt(n)} live cameras within ${p.radiusKm} km of ${p.centreLabel} — ${p.highlights[0]} and the park's own weather. Free, no signup.`}
      />
      <StatRow
        stats={[
          { value: fmt(n), label: "cameras in this park's wall" },
          nps.length > 0
            ? { value: fmt(nps.length), label: "National Park Service cameras" }
            : {
                value: p.gateway ?? p.state,
                label: "the gateway this wall is anchored on",
              },
          { value: `${p.radiusKm} km`, label: "radius — the wall's stated rule" },
        ]}
      />
      <Intro paragraphs={[p.intro[0], p.intro[1]]} />
      {placeWeather && <PlaceWeatherPanel data={placeWeather} placeName={p.name} />}

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          Best time to watch {p.short}
        </h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">{p.watch}</p>
        {(sun.sunriseText || sun.sunsetText) && (
          <StatRow
            stats={[
              ...(sun.sunriseText
                ? [{ value: sun.sunriseText, label: "sunrise at the park today" }]
                : []),
              ...(sun.sunsetText
                ? [{ value: sun.sunsetText, label: "sunset at the park today" }]
                : []),
              ...(sun.dayLengthText
                ? [{ value: sun.dayLengthText, label: "of daylight today" }]
                : []),
            ]}
          />
        )}
        <p className="text-xs text-white/35 leading-relaxed max-w-3xl mt-3">
          Sun times are computed for the park's coordinates ({p.lat.toFixed(2)},{" "}
          {p.lng.toFixed(2)}) in its local timezone — astronomy, not a forecast. Pair
          them with the live weather above before you plan around them.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          All {fmt(n)} {p.short} cameras, live
        </h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Every catalogue camera within {p.radiusKm} km of {p.centreLabel}, nearest
          first — the wall this page's count comes from. Search by viewpoint, road or
          settlement, and open any camera here or on the globe.
        </p>
        <DirectoryExplorer
          scopeKey={p.scopeKey}
          scopeLabel={def.label}
          groupBy="none"
          searchPlaceholder={`Search ${p.short} cameras…`}
          explorerId={`park-${p.slug}`}
        />
      </section>

      {featured.length > 0 && (
        <SampleGrid
          title={
            nps.length > 0
              ? "The park-service cameras"
              : "Featured cameras in the wall"
          }
          samples={featured}
        />
      )}

      <HowTo
        title={`How to use the ${p.short} wall`}
        steps={[
          "Start with the named cameras: the highlights at the top of this page are the wall's anchor viewpoints — open them first for the park itself.",
          "Read the weather like a ranger: the live conditions panel and the cameras together beat any forecast — if the gateway is clear and the viewpoint is in cloud, believe the cameras.",
          "Use the sun times: sunrise and sunset at the park are computed on this page for today. The famous views are edge-of-day views; plan the open around them.",
          "Check the approach, not just the destination: entrance and corridor cameras in the wall show the road you will drive, an hour before you drive it.",
        ]}
      />

      <FaqSection title={`${p.short} webcams — FAQ`} faqs={faqs} />

      <RelatedLinks
        title="More national park webcams"
        links={[
          { label: "All national park webcam hubs", href: "/national-park-webcams" },
          ...siblings.map((s) => ({
            label: `${s.name} webcams`,
            href: `/national-park-webcams/${s.slug}`,
          })),
          ...(SPECIAL_LINKS[p.slug] ?? []),
          { label: "United States cameras — the country index", href: "/cameras/countries/united-states" },
          { label: "Live webcams worldwide", href: "/live-webcams" },
        ]}
      />

      <TrialCtaSection utmSource="national-park-webcams" />
      <CtaRow backHref="/national-park-webcams" backLabel="All national park webcams" />
    </PageShell>
  );
}
