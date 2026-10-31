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
import { recordsForDef } from "@/lib/explore-data";
import { getPlaceWeather } from "@/lib/place-weather";
import {
  UNIVERSITIES,
  universityBySlug,
  type University,
} from "@/lib/universities";
import { isNoindexUniversity } from "@/lib/indexation-gates";

/* Weather is cached per location for 30 minutes in lib/weather-api;
   ISR at the same cadence keeps the page fresh. */
export const revalidate = 1800;

async function campusRecords(u: University) {
  const records = await recordsForDef({
    label: u.name,
    slugs: [u.chunk],
    groupBy: "country",
  });
  const wanted = new Set(u.ids);
  return records.filter((r) => wanted.has(r.id));
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const t = (x: number) => (x * Math.PI) / 180;
  const h =
    Math.sin(t(bLat - aLat) / 2) ** 2 +
    Math.cos(t(aLat)) * Math.cos(t(bLat)) * Math.sin(t(bLng - aLng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function nearestUniversities(u: University, n: number): University[] {
  return UNIVERSITIES.filter((o) => o.slug !== u.slug)
    .map((o) => ({ o, d: haversineKm(u.lat, u.lng, o.lat, o.lng) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((x) => x.o);
}

export function generateStaticParams() {
  return UNIVERSITIES.map((u) => ({ university: u.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ university: string }>;
}): Promise<Metadata> {
  const { university: slug } = await params;
  const u = universityBySlug(slug);
  if (!u) return { title: "Not found" };
  const records = await campusRecords(u);
  const n = records.length;
  const title = `${u.name} Live Cam — Campus Webcam`;
  const description = `Watch ${u.name} (${u.place}) live: ${n} campus camera${n === 1 ? "" : "s"} whose own catalogue record${n === 1 ? "" : "s"} name the university. Free, no signup.`;
  const url = `/university-webcams/${u.slug}`;
  return {
    title,
    description,
    // R38 thin-wall tiering: the gate's set is derived from the same
    // registry `ids` list this page renders from, so the metadata and
    // the sitemap (same predicate) cannot disagree — lib/indexation-gates.
    ...(isNoindexUniversity(u.slug) ? { robots: { index: false, follow: true } } : {}),
    alternates: { canonical: `${BASE}${url}` },
    openGraph: { title, description, url, type: "website" },
  };
}

export default async function UniversityPage({
  params,
}: {
  params: Promise<{ university: string }>;
}) {
  const { university: slug } = await params;
  const u = universityBySlug(slug);
  if (!u) notFound();

  const records = await campusRecords(u);
  const n = records.length;
  const fmt = (x: number) => x.toLocaleString("en-US");
  const samples: Sample[] = records.map((r) => ({
    name: r.name,
    city: r.city,
    id: r.id,
  }));

  const canonical = `${BASE}/university-webcams/${u.slug}`;
  const placeWeather = await getPlaceWeather({
    query: `${u.lat},${u.lng}`,
    lat: u.lat,
    lng: u.lng,
  });

  const faqs = [
    ...u.faqs,
    {
      q: `How many cameras does ${u.short} have here, and why these?`,
      a: `This page serves ${fmt(n)} camera${n === 1 ? "" : "s"} — every catalogue record for ${u.name} whose own name contains "${u.token}" and whose subject is the campus itself. That is the directory's stated rule for all 25 university pages: the camera's own data names the institution, or there is no page. Road junctions, stations, hospitals and field stations carrying the name were audited and excluded.`,
    },
    {
      q: "Is it free to watch?",
      a: "Yes — every camera on this page is a public feed and opens free on WorldEye, with no account and no signup.",
    },
  ];

  const pageLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${u.name} Live Cam — Campus Webcam`,
    description: `${n} live campus camera${n === 1 ? "" : "s"} at ${u.name}, ${u.place} — each admitted because its own catalogue record names the institution.`,
    url: canonical,
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
        name: "University webcams",
        item: `${BASE}/university-webcams`,
      },
      { "@type": "ListItem", position: 4, name: u.short, item: canonical },
    ],
  };

  const siblings = nearestUniversities(u, 3);

  return (
    <PageShell>
      <JsonLd data={pageLd} />
      <JsonLd data={breadcrumbLd} />
      <FaqJsonLd faqs={faqs} />
      <Breadcrumb
        schema={false}
        trail={[
          { label: "Home", href: "/" },
          { label: "Live webcams", href: "/live-webcams" },
          { label: "University webcams", href: "/university-webcams" },
          { label: u.short },
        ]}
      />
      <Hero
        h1={`${u.name} — Live Campus Cameras`}
        sub={`${fmt(n)} campus camera${n === 1 ? "" : "s"} at ${u.place} — each named for the university by its own record. Free, no signup.`}
      />
      <StatRow
        stats={[
          { value: fmt(n), label: `campus camera${n === 1 ? "" : "s"} on this page` },
          { value: u.place, label: "place — from the records themselves" },
          { value: u.country, label: "country" },
        ]}
      />
      <Intro paragraphs={[u.intro[0], u.intro[1]]} />

      {placeWeather && <PlaceWeatherPanel data={placeWeather} placeName={u.name} />}

      {samples.length > 0 && (
        <SampleGrid
          title={n === 1 ? `The ${u.short} campus camera` : `The ${u.short} campus cameras`}
          samples={samples}
        />
      )}

      <HowTo
        title={`How to watch ${u.short} on the map`}
        steps={[
          "Open the camera from the grid above, or find its marker on the free WorldEye globe — no account needed.",
          "Check the timestamp before trusting the frame: research-network cameras photograph on a schedule rather than streaming, and this page's intro says which kind each camera is.",
          "Use the weather panel for the campus's current conditions — several of these cameras exist precisely to watch that weather's effect on the landscape.",
          ...(u.citySlug
            ? [`Follow the ${u.cityName} link below for the wider city network — the campus is one named frame among the city's many.`]
            : ["Follow the country index below for the wider camera network around the campus."]),
          "Browse the hub for the other 24 universities — the rule that admitted this campus admitted each of them the same way.",
        ]}
      />

      <FaqSection title={`${u.short} campus webcam — FAQ`} faqs={faqs} />

      <RelatedLinks
        title="More university webcams"
        links={[
          { label: "All university webcams", href: "/university-webcams" },
          ...siblings.map((o) => ({
            label: `${o.name} live cam`,
            href: `/university-webcams/${o.slug}`,
          })),
          ...(u.citySlug && u.cityName
            ? [{ label: `${u.cityName} webcams`, href: `/city-webcams/${u.citySlug}` }]
            : []),
          {
            label: `${u.country} cameras — the country index`,
            href: `/cameras/countries/${u.countrySlug}`,
          },
          { label: "Live webcams worldwide", href: "/live-webcams" },
        ]}
      />

      <TrialCtaSection utmSource="university-webcams" />
      <CtaRow backHref="/university-webcams" backLabel="All university webcams" />
    </PageShell>
  );
}
