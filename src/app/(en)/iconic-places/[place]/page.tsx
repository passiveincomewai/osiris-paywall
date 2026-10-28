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
import { ICONIC_PLACES, iconicPlaceBySlug, type IconicPlace } from "@/lib/iconic-places";

/* Weather is cached per location for 30 minutes in lib/weather-api;
   ISR at the same cadence keeps the page fresh. */
export const revalidate = 1800;

/** Title tails — the "[place] live cam" query shape, honestly aimed
 *  at what each set actually holds. */
const TITLE_TAILS: Record<string, string> = {
  "shibuya-crossing": "the Scramble, Live",
  "las-vegas-strip": "Las Vegas Boulevard's Own Cameras, Live",
  "duval-street": "Key West's Main Street, Live",
  "kalakaua-avenue": "Waikiki's Beachfront Avenue, Live",
};

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const t = (x: number) => (x * Math.PI) / 180;
  const h =
    Math.sin(t(bLat - aLat) / 2) ** 2 +
    Math.cos(t(aLat)) * Math.cos(t(bLat)) * Math.sin(t(bLng - aLng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function nearestPlaces(p: IconicPlace, n: number): IconicPlace[] {
  return ICONIC_PLACES.filter((o) => o.slug !== p.slug)
    .map((o) => ({ o, d: haversineKm(p.lat, p.lng, o.lat, o.lng) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((x) => x.o);
}

function globeHref(p: IconicPlace): string {
  return `/?geo=${p.lat.toFixed(5)},${p.lng.toFixed(5)},${p.geoRadiusM}`;
}

export function generateStaticParams() {
  return ICONIC_PLACES.map((p) => ({ place: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ place: string }>;
}): Promise<Metadata> {
  const { place: slug } = await params;
  const p = iconicPlaceBySlug(slug);
  if (!p) return { title: "Not found" };
  const records = await recordsForDef(EXPLORE_SCOPES[p.scopeKey]);
  const n = records.length;
  const title = `${p.name} Live Cam — ${TITLE_TAILS[p.slug] ?? 'Iconic Places'}`;
  const description = `Watch ${p.name} (${p.city}) live: ${n} camera${n === 1 ? '' : 's'} — ${p.setRule}. Free, no signup.`;
  const url = `/iconic-places/${p.slug}`;
  return {
    title,
    description,
    alternates: { canonical: `${BASE}${url}` },
    openGraph: { title, description, url, type: "website" },
  };
}

export default async function IconicPlacePage({
  params,
}: {
  params: Promise<{ place: string }>;
}) {
  const { place: slug } = await params;
  const p = iconicPlaceBySlug(slug);
  if (!p) notFound();

  const def = EXPLORE_SCOPES[p.scopeKey];
  const records = await recordsForDef(def);
  const n = records.length;
  const fmt = (x: number) => x.toLocaleString("en-US");
  const featured: Sample[] = records
    .slice(0, 8)
    .map((r) => ({ name: r.name, city: r.city, id: r.id }));

  const canonical = `${BASE}/iconic-places/${p.slug}`;
  const placeWeather = await getPlaceWeather({
    query: `${p.lat},${p.lng}`,
    lat: p.lat,
    lng: p.lng,
  });

  const faqs = [
    ...p.faqs,
    {
      q: `How many cameras are on this page, and how is the count worked out?`,
      a: `The set holds ${fmt(n)} camera${n === 1 ? '' : 's'} — ${p.setRule}. The rule is the page's whole discipline: a camera merely in ${p.city} never counts, only one that frames ${p.short} itself. The explorer below serves exactly this set, so the number you read is the number you get.`,
    },
    {
      q: "Is it free to watch?",
      a: "Yes — every camera on this page opens free on WorldEye, with no account and no signup. A free WorldEye account raises your daily camera-open limit, and the globe's Pro tools are a separate matter; the iconic places themselves are free, full stop.",
    },
  ];

  const placeLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: p.name,
    description: `${n} live camera${n === 1 ? '' : 's'} — ${p.setRule}, in ${p.city}, ${p.country}.`,
    url: canonical,
    geo: { "@type": "GeoCoordinates", latitude: p.lat, longitude: p.lng },
    address: {
      "@type": "PostalAddress",
      addressLocality: p.city,
      addressRegion: p.region,
      addressCountry: p.country,
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
        name: "Iconic places",
        item: `${BASE}/iconic-places`,
      },
      { "@type": "ListItem", position: 4, name: p.short, item: canonical },
    ],
  };

  const siblings = nearestPlaces(p, 3);

  return (
    <PageShell>
      <JsonLd data={placeLd} />
      <JsonLd data={breadcrumbLd} />
      <FaqJsonLd faqs={faqs} />
      <Breadcrumb
        schema={false}
        trail={[
          { label: "Home", href: "/" },
          { label: "Live webcams", href: "/live-webcams" },
          { label: "Iconic places", href: "/iconic-places" },
          { label: p.short },
        ]}
      />
      <Hero
        h1={`${p.name} — Live Cameras`}
        sub={`${fmt(n)} live camera${n === 1 ? '' : 's'} — ${p.setRule}. Free, no signup.`}
      />
      <StatRow
        stats={[
          { value: fmt(n), label: `camera${n === 1 ? '' : 's'} in ${p.short}'s set` },
          { value: p.city, label: "city" },
          { value: p.country, label: "country" },
        ]}
      />
      <Intro paragraphs={[p.intro[0], p.intro[1]]} />

      {placeWeather && <PlaceWeatherPanel data={placeWeather} placeName={p.name} />}

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">Best time to watch {p.short}</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">{p.watch}</p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          {n === 1 ? `The ${p.short} camera, live` : `All ${fmt(n)} ${p.short} cameras, live`}
        </h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          The full set — {p.setRule}. Open any camera here, or take the place to
          the globe with the link below.
        </p>
        <DirectoryExplorer
          scopeKey={p.scopeKey}
          scopeLabel={def.label}
          groupBy="none"
          searchPlaceholder={`Search ${p.short} cameras…`}
          explorerId={`ip-page-${p.slug}`}
        />
      </section>

      {featured.length > 0 && (
        <SampleGrid title={`The cameras in ${p.short}'s set`} samples={featured} />
      )}

      <HowTo
        title={`How to watch ${p.short} on the map`}
        steps={[
          `Start with the named cameras: the highlights at the top of this page are the set's anchor viewpoints — open them first for the place itself.`,
          "Check the timestamp before trusting the frame; a famous street at the wrong hour is an empty street, honestly shown.",
          `Open ${p.short} on the 3D globe (the link below) to see the cameras in place — the crossing, the boulevard, the avenue in its real geography.`,
          "Come back at the place's great hour — the watch note above says when that is; famous places run on schedules of light and crowds, not on ours.",
        ]}
      />

      <FaqSection title={`${p.short} live cam — FAQ`} faqs={faqs} />

      <RelatedLinks
        title="More iconic places"
        links={[
          { label: "All iconic places", href: "/iconic-places" },
          ...siblings.map((s) => ({
            label: `${s.name} live cam`,
            href: `/iconic-places/${s.slug}`,
          })),
          { label: `${p.short} on the 3D globe`, href: globeHref(p) },
          ...p.links,
          { label: "Live webcams worldwide", href: "/live-webcams" },
        ]}
      />

      <TrialCtaSection utmSource="iconic-places" />
      <CtaRow backHref="/iconic-places" backLabel="All iconic places" />
    </PageShell>
  );
}
