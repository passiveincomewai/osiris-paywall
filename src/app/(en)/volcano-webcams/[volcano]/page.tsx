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
import { VOLCANOES, volcanoBySlug, type Volcano } from "@/lib/volcanoes";

/* Weather is cached per location for 30 minutes in lib/weather-api;
   ISR at the same cadence keeps the page fresh. */
export const revalidate = 1800;

/** Title tails — the "[Volcano] live cam" query shape, honestly aimed
 *  at what each wall actually holds. */
const TITLE_TAILS: Record<string, string> = {
  kilauea: "Halemaʻumaʻu's Island-Wide Camera Wall",
  reykjanes: "Grindavík & the Sundhnúkur Road Network",
  katla: "the South-Coast Cameras under Mýrdalsjökull",
  etna: "the Dedicated Volcano Camera",
  vesuvius: "Naples & the Bay, Live",
  sakurajima: "Kagoshima's Volcano Cameras",
  merapi: "the Monitoring Cameras & Yogyakarta",
  bromo: "the Tengger Caldera Camera",
  fuji: "Lake Kawaguchi & the Summit Feeds",
  ruapehu: "the Desert Road Cameras",
};

/** Extra links only where they are true: the Kīlauea page carries the
 *  eruption blog posts; every page gets the observatory treatment in
 *  copy, not in borrowed links. */
const SPECIAL_LINKS: Record<string, { label: string; href: string }[]> = {
  kilauea: [
    {
      label: "Kīlauea Episode 56: how to watch the next episode live (blog)",
      href: "/blog/kilauea-episode-56-watch-live",
    },
    {
      label: "Kīlauea eruption watch: the island cameras explained (blog)",
      href: "/blog/kilauea-eruption-watch-live",
    },
    {
      label: "Hawaii Volcanoes National Park webcams",
      href: "/national-park-webcams/hawaii-volcanoes",
    },
  ],
};

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const t = (x: number) => (x * Math.PI) / 180;
  const h =
    Math.sin(t(bLat - aLat) / 2) ** 2 +
    Math.cos(t(aLat)) * Math.cos(t(bLat)) * Math.sin(t(bLng - aLng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function nearestVolcanoes(v: Volcano, n: number): Volcano[] {
  return VOLCANOES.filter((o) => o.slug !== v.slug)
    .map((o) => ({ o, d: haversineKm(v.lat, v.lng, o.lat, o.lng) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((x) => x.o);
}

export function generateStaticParams() {
  return VOLCANOES.map((v) => ({ volcano: v.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ volcano: string }>;
}): Promise<Metadata> {
  const { volcano: slug } = await params;
  const v = volcanoBySlug(slug);
  if (!v) return { title: "Not found" };
  const records = await recordsForDef(EXPLORE_SCOPES[v.scopeKey]);
  const n = records.length;
  const title = `${v.name} Live Cam — ${TITLE_TAILS[v.slug] ?? 'Volcano Webcams'}`;
  const description = `Watch ${v.name} (${v.country}) live: ${n} camera${n === 1 ? '' : 's'} within ${v.radiusKm} km of ${v.centreLabel} — ${v.highlights.slice(0, 2).join(', ')}. Status belongs to the ${v.observatory.name}. Free, no signup.`;
  const url = `/volcano-webcams/${v.slug}`;
  return {
    title,
    description,
    alternates: { canonical: `${BASE}${url}` },
    openGraph: { title, description, url, type: "website" },
  };
}

export default async function VolcanoPage({
  params,
}: {
  params: Promise<{ volcano: string }>;
}) {
  const { volcano: slug } = await params;
  const v = volcanoBySlug(slug);
  if (!v) notFound();

  const def = EXPLORE_SCOPES[v.scopeKey];
  const records = await recordsForDef(def);
  const n = records.length;
  const fmt = (x: number) => x.toLocaleString("en-US");
  // Cameras that carry the volcano in their own name — the dedicated
  // and monitoring feeds — lead the featured grid when they exist.
  const named = records.filter(
    (r) =>
      /volcano/i.test(r.name) ||
      r.name.toLowerCase().includes(v.short.toLowerCase()),
  );
  const featured: Sample[] = (named.length > 0 ? named : records)
    .slice(0, 8)
    .map((r) => ({ name: r.name, city: r.city, id: r.id }));

  const canonical = `${BASE}/volcano-webcams/${v.slug}`;
  const placeWeather = await getPlaceWeather({
    query: `${v.lat},${v.lng}`,
    lat: v.lat,
    lng: v.lng,
  });

  const faqs = [
    ...v.faqs,
    {
      q: `How many webcams are there at ${v.short}, and how is the count worked out?`,
      a: `This page's wall holds ${fmt(n)} camera${n === 1 ? '' : 's'}. The rule is stated, not rounded: every camera in the WorldEye catalogue within ${v.radiusKm} km of ${v.centreLabel}, nearest first — the same rule the explorer below serves, so the number you read is the number you get. ${named.length > 0 ? `${named.length} of them ${named.length === 1 ? 'carries' : 'carry'} the volcano in ${named.length === 1 ? 'its' : 'their'} own name.` : 'None of them is a dedicated volcano camera; the wall is the volcano\u2019s country and approaches, and it is labelled that way.'}`,
    },
    {
      q: `Who decides ${v.short}'s eruption status?`,
      a: `The ${v.observatory.name}. Alert levels and activity calls are theirs, and they change with the mountain — this page prints no alert level of its own, because a stale one is worse than none. Use the cameras here for the view and the observatory for the verdict.`,
    },
    {
      q: "Is it free to watch?",
      a: "Yes — every camera on this page opens free on WorldEye, with no account and no signup. A free WorldEye account raises your daily camera-open limit, and the globe's Pro tools are a separate matter; the volcano walls themselves are free, full stop.",
    },
  ];

  const volcanoLd = {
    "@context": "https://schema.org",
    "@type": "Mountain",
    name: v.name,
    description: `${n} live camera${n === 1 ? '' : 's'} within ${v.radiusKm} km of ${v.centreLabel} — ${v.highlights.join(", ")}.`,
    url: canonical,
    geo: { "@type": "GeoCoordinates", latitude: v.lat, longitude: v.lng },
    address: {
      "@type": "PostalAddress",
      addressRegion: v.region,
      addressCountry: v.country,
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
        name: "Volcano webcams",
        item: `${BASE}/volcano-webcams`,
      },
      { "@type": "ListItem", position: 4, name: v.short, item: canonical },
    ],
  };

  const siblings = nearestVolcanoes(v, 3);

  return (
    <PageShell>
      <JsonLd data={volcanoLd} />
      <JsonLd data={breadcrumbLd} />
      <FaqJsonLd faqs={faqs} />
      <Breadcrumb
        schema={false}
        trail={[
          { label: "Home", href: "/" },
          { label: "Live webcams", href: "/live-webcams" },
          { label: "Volcano webcams", href: "/volcano-webcams" },
          { label: v.short },
        ]}
      />
      <Hero
        h1={`${v.name} — Live Volcano Cameras`}
        sub={`${fmt(n)} live camera${n === 1 ? '' : 's'} within ${v.radiusKm} km of ${v.centreLabel} — ${v.highlights[0]}. Free, no signup.`}
      />
      <StatRow
        stats={[
          { value: fmt(n), label: `camera${n === 1 ? '' : 's'} in ${v.short}'s wall` },
          { value: `${v.radiusKm} km`, label: "radius — the wall's stated rule" },
          { value: v.country, label: "country" },
        ]}
      />
      <Intro paragraphs={[v.intro[0], v.intro[1]]} />

      {v.statusNote && (
        <section className="mt-12 rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/[0.05] p-6 md:p-7 max-w-3xl mx-auto">
          <h2 className="text-lg md:text-xl font-bold">
            {v.name} status — as published by the observatory
          </h2>
          <p className="mt-3 text-sm text-white/65 leading-relaxed">{v.statusNote}</p>
          {v.observatory.url && (
            <p className="mt-3 text-sm text-white/65 leading-relaxed">
              Current status:{" "}
              <a
                href={v.observatory.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#00E5FF] hover:underline"
              >
                {v.observatory.name} — {v.short} page
              </a>
              .
            </p>
          )}
        </section>
      )}

      {placeWeather && <PlaceWeatherPanel data={placeWeather} placeName={v.name} />}

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">Best time to watch {v.short}</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">{v.watch}</p>
        <p className="text-xs text-white/35 leading-relaxed max-w-3xl">
          Eruption status is not read off a webcam: confirm what you are seeing with the{" "}
          {v.observatory.name} before drawing conclusions from any single frame.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          All {fmt(n)} {v.short} cameras, live
        </h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Every catalogue camera within {v.radiusKm} km of {v.centreLabel}, nearest
          first — the wall this page's count comes from. Search by viewpoint, road or
          settlement, and open any camera here or on the globe.
        </p>
        <DirectoryExplorer
          scopeKey={v.scopeKey}
          scopeLabel={def.label}
          groupBy="none"
          searchPlaceholder={`Search ${v.short} cameras…`}
          explorerId={`vo-page-${v.slug}`}
        />
      </section>

      {featured.length > 0 && (
        <SampleGrid
          title={
            named.length > 0
              ? `The cameras that carry ${v.short}'s name`
              : "Featured cameras in the wall"
          }
          samples={featured}
        />
      )}

      <HowTo
        title={`How to watch ${v.short} on the map`}
        steps={[
          `Start with the named cameras: the highlights at the top of this page are the wall's anchor viewpoints — open them first for the volcano itself.`,
          "Check the timestamp before trusting the frame, and read the weather panel: plumes, ash and cloud are easy to confuse at a glance.",
          `Confirm what you're seeing against the responsible observatory — here, the ${v.observatory.name}.`,
          "Switch on the earthquake layer on the globe to see the seismic activity under and around the volcano — eruptions are seismic stories.",
          "During unrest, recheck across hours: episodes build, peak and stop, and the regional cameras catch the aftermath — plumes, closures, glow after dark.",
        ]}
      />

      <FaqSection title={`${v.short} webcams — FAQ`} faqs={faqs} />

      <RelatedLinks
        title="More volcano webcams"
        links={[
          { label: "All volcano webcams", href: "/volcano-webcams" },
          ...siblings.map((s) => ({
            label: `${s.name} live cam`,
            href: `/volcano-webcams/${s.slug}`,
          })),
          ...(SPECIAL_LINKS[v.slug] ?? []),
          { label: "Live earthquake tracker", href: "/earthquake-tracker" },
          {
            label: `${v.country} cameras — the country index`,
            href: `/cameras/countries/${v.countrySlug}`,
          },
          { label: "Live webcams worldwide", href: "/live-webcams" },
        ]}
      />

      <TrialCtaSection utmSource="volcano-webcams" />
      <CtaRow backHref="/volcano-webcams" backLabel="All volcano webcams" />
    </PageShell>
  );
}
