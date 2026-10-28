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
import AuroraKpPanel from "@/components/AuroraKpPanel";
import { EXPLORE_SCOPES, recordsForDef } from "@/lib/explore-data";
import { getPlaceWeather } from "@/lib/place-weather";
import {
  AURORA_PLACES,
  auroraPlaceBySlug,
  placeTonight,
  type AuroraPlace,
} from "@/lib/aurora-places";

/* Weather is cached per location for 30 minutes in lib/weather-api;
   ISR at the same cadence keeps the page (and tonight's darkness
   window) fresh. */
export const revalidate = 1800;

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const t = (x: number) => (x * Math.PI) / 180;
  const h =
    Math.sin(t(bLat - aLat) / 2) ** 2 +
    Math.cos(t(aLat)) * Math.cos(t(bLat)) * Math.sin(t(bLng - aLng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function nearestPlaces(p: AuroraPlace, n: number): AuroraPlace[] {
  return AURORA_PLACES.filter((o) => o.slug !== p.slug)
    .map((o) => ({ o, d: haversineKm(p.lat, p.lng, o.lat, o.lng) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((x) => x.o);
}

export function generateStaticParams() {
  return AURORA_PLACES.map((p) => ({ place: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ place: string }>;
}): Promise<Metadata> {
  const { place: slug } = await params;
  const p = auroraPlaceBySlug(slug);
  if (!p) return { title: "Not found" };
  const records = await recordsForDef(EXPLORE_SCOPES[p.scopeKey]);
  const n = records.length;
  const title = `Northern Lights in ${p.name} Tonight — Live Kp Forecast & Cameras`;
  const description = `Is the aurora out over ${p.name} (${p.country}) tonight? Start with the live Kp index and tonight's darkness window, then watch ${n} public cameras within ${p.radiusKm} km of ${p.centreLabel}. Free, no signup.`;
  const url = `/northern-lights-webcams/${p.slug}`;
  return {
    title,
    description,
    alternates: { canonical: `${BASE}${url}` },
    openGraph: { title, description, url, type: "website" },
  };
}

export default async function AuroraPlacePage({
  params,
}: {
  params: Promise<{ place: string }>;
}) {
  const { place: slug } = await params;
  const p = auroraPlaceBySlug(slug);
  if (!p) notFound();

  const def = EXPLORE_SCOPES[p.scopeKey];
  const records = await recordsForDef(def);
  const n = records.length;
  const fmt = (x: number) => x.toLocaleString("en-US");
  const featured: Sample[] = records
    .slice(0, 8)
    .map((r) => ({ name: r.name, city: r.city, id: r.id }));

  const canonical = `${BASE}/northern-lights-webcams/${p.slug}`;
  const tonight = placeTonight(p.lat, p.lng, p.tz);
  const placeWeather = await getPlaceWeather({
    query: `${p.lat},${p.lng}`,
    lat: p.lat,
    lng: p.lng,
  });

  const faqs = [
    ...p.faqs,
    {
      q: `How many aurora cameras are there around ${p.name}, and how is the count worked out?`,
      a: `This page's wall holds ${fmt(n)} camera${n === 1 ? '' : 's'}: every camera in the WorldEye catalogue within ${p.radiusKm} km of ${p.centreLabel}, nearest first — the same rule the explorer below serves, so the number you read is the number you get. They are road, weather and scenic cameras in aurora country, not dedicated aurora feeds, and the page labels them that way.`,
    },
    {
      q: "Is the Kp on this page a forecast?",
      a: "It is the live planetary K index from NOAA SWPC — the current measured state of geomagnetic activity, read through the site's own space-weather feed, not a prediction for this place. What this page adds is the local half of the judgement: the Kp band this latitude needs, tonight's actual darkness window here, and the cameras. A display still needs all three: activity, darkness and a clear sky.",
    },
    {
      q: "Is it free to watch?",
      a: "Yes — every camera on this page opens free on WorldEye, with no account and no signup. A free WorldEye account raises your daily camera-open limit, and the globe's Pro tools are a separate matter; the aurora walls themselves are free, full stop.",
    },
  ];

  const placeLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: p.name,
    description: `Northern lights watching in ${p.name}: the live Kp index, tonight's darkness window and ${n} public cameras within ${p.radiusKm} km.`,
    url: canonical,
    geo: { "@type": "GeoCoordinates", latitude: p.lat, longitude: p.lng },
    address: {
      "@type": "PostalAddress",
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
        name: "Northern lights webcams",
        item: `${BASE}/northern-lights-webcams`,
      },
      { "@type": "ListItem", position: 4, name: p.name, item: canonical },
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
          { label: "Northern lights webcams", href: "/northern-lights-webcams" },
          { label: p.name },
        ]}
      />
      <Hero
        h1={`Northern Lights in ${p.name} — Tonight`}
        sub={`The tonight check for ${p.name}, ${p.country}: the live Kp, tonight's darkness window, and ${fmt(n)} public cameras within ${p.radiusKm} km. Free, no signup.`}
      />
      <StatRow
        stats={[
          { value: fmt(n), label: `cameras within ${p.radiusKm} km of ${p.name}` },
          tonight.polar === 'night'
            ? { value: "24 h", label: "of darkness today — polar night" }
            : tonight.polar === 'day'
              ? { value: "0 h", label: "of darkness today — midnight sun" }
              : tonight.darkLengthText
                ? { value: tonight.darkLengthText, label: "of darkness tonight" }
                : { value: `${Math.abs(p.lat).toFixed(1)}°`, label: "latitude" },
          { value: `${Math.abs(p.lat).toFixed(1)}° ${p.lat >= 0 ? 'N' : 'S'}`, label: "latitude" },
        ]}
      />
      <Intro paragraphs={[p.intro[0], p.intro[1]]} />

      <AuroraKpPanel />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          Tonight in {p.name}: darkness and the Kp it needs
        </h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">{p.kpNote}</p>
        {tonight.polar === 'night' ? (
          <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
            The sun does not rise at {p.name} today — polar night. Darkness is not
            the limiting factor at all: the whole day is a viewing window, and only
            the Kp and the cloud decide.
          </p>
        ) : tonight.polar === 'day' ? (
          <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
            The sun does not set at {p.name} today — midnight sun. There is no
            darkness to watch in tonight at any Kp; the season here is over until
            the nights return. The cameras below still show the place's summer.
          </p>
        ) : (
          (tonight.sunsetText || tonight.sunriseText) && (
            <StatRow
              stats={[
                ...(tonight.sunsetText
                  ? [{ value: tonight.sunsetText, label: "sunset today (local)" }]
                  : []),
                ...(tonight.sunriseText
                  ? [{ value: tonight.sunriseText, label: "sunrise tomorrow (local)" }]
                  : []),
                ...(tonight.darkLengthText
                  ? [{ value: tonight.darkLengthText, label: "of darkness between them" }]
                  : []),
              ]}
            />
          )
        )}
        <p className="text-xs text-white/35 leading-relaxed max-w-3xl mt-3">
          Sun times are computed for {p.name}'s coordinates ({p.lat.toFixed(2)},{" "}
          {p.lng.toFixed(2)}) in its local timezone — astronomy, not a forecast. The
          Kp panel above is the live NOAA reading; for tonight's verdict, read the
          two together and check the sky itself on the cameras.
        </p>
      </section>

      {placeWeather && <PlaceWeatherPanel data={placeWeather} placeName={p.name} />}

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">Best time to watch in {p.name}</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">{p.watch}</p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          All {fmt(n)} {p.name} cameras, live
        </h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Every catalogue camera within {p.radiusKm} km of {p.centreLabel}, nearest
          first — the wall this page's count comes from. Pick feeds facing dark
          landscapes, confirm the timestamp is current, and give the sky a minute.
        </p>
        <DirectoryExplorer
          scopeKey={p.scopeKey}
          scopeLabel={def.label}
          groupBy="none"
          searchPlaceholder={`Search ${p.name} cameras…`}
          explorerId={`aurora-place-${p.slug}`}
        />
      </section>

      {featured.length > 0 && (
        <SampleGrid title={`Featured cameras around ${p.name}`} samples={featured} />
      )}

      <HowTo
        title={`How to run the ${p.name} aurora check`}
        steps={[
          "Read the live Kp at the top of this page first, and hold it against the band this place needs (above) — below it, even perfect cameras mostly show darkness.",
          "Check tonight's darkness window: the display needs real dark, and the window's edges are twilight, not watching time.",
          "Check the weather panel and the frames themselves for cloud — no Kp sees through overcast.",
          "Open the darkest-facing feeds, confirm the timestamp is current, and give the sky a minute; recheck in five.",
          `If ${p.name} is clouded out, switch walls — cloud is local, the oval is not. The nearest other places in this set are linked below.`,
        ]}
      />

      <FaqSection title={`${p.name} northern lights — FAQ`} faqs={faqs} />

      <RelatedLinks
        title="More northern lights places"
        links={[
          { label: "Aurora tonight — the live Kp & the main walls", href: "/aurora-webcams" },
          { label: "Northern lights webcams by place", href: "/northern-lights-webcams" },
          ...siblings.map((s) => ({
            label: `Northern lights in ${s.name}`,
            href: `/northern-lights-webcams/${s.slug}`,
          })),
          {
            label: "Watching the northern lights on live webcams (guide)",
            href: "/blog/northern-lights-live-webcams",
          },
          {
            label: `${p.country} cameras — the country index`,
            href: `/cameras/countries/${p.countrySlug}`,
          },
          { label: "Live webcams worldwide", href: "/live-webcams" },
        ]}
      />

      <TrialCtaSection utmSource="northern-lights-webcams" />
      <CtaRow backHref="/northern-lights-webcams" backLabel="All northern lights places" />
    </PageShell>
  );
}
