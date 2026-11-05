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
  ANIMAL_GROUPS,
  ANIMAL_STARS,
  animalStarBySlug,
  type AnimalStar,
} from "@/lib/animal-cams";
import { cameraMediaKind } from "@/lib/country-cameras";

/* Weather is cached per location for 30 minutes in lib/weather-api;
   ISR at the same cadence keeps the page fresh. */
export const revalidate = 1800;

/** Title tails — the "[Place] live cam" query shape, aimed at what
 *  each feed actually is. */
const TITLE_TAILS: Record<string, string> = {
  "tembe-elephant-park": "Elephant Park Safari Cam",
  "masai-mara": "Safari Cam",
  "nkorho-kruger": "Kruger Waterhole Cam",
  "olifants-river": "Balule River Safari Cam",
  "tsavo-east": "Wildlife Lodge Cam",
  "san-diego-zoo": "Zoo Cam Live",
  "kumamoto-city-zoo": "Giraffe Cam",
  "gaia-zoo": "Zoo Livestream",
  "belize-zoo": "Zoo Cam Live",
  "awaji-island-monkey-center": "Monkey Cam",
  "hula-nature-reserve": "Bird Cam Live",
  "konya-animal-shelter": "Shelter Cam Live",
};

/** City-page links only where a city page truly exists for the
 *  feed's own place (verified against city-pages.json). */
const CITY_LINKS: Record<string, { label: string; href: string }> = {
  "san-diego-zoo": { label: "San Diego webcams", href: "/city-webcams/san-diego" },
};

async function starRecords(s: AnimalStar) {
  const records = await recordsForDef({
    label: s.name,
    slugs: [s.chunk],
    groupBy: "country",
  });
  const wanted = new Set(s.ids);
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

function nearestStars(s: AnimalStar, n: number): AnimalStar[] {
  return ANIMAL_STARS.filter((o) => o.slug !== s.slug)
    .map((o) => ({ o, d: haversineKm(s.lat, s.lng, o.lat, o.lng) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((x) => x.o);
}

export function generateStaticParams() {
  return ANIMAL_STARS.map((s) => ({ star: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ star: string }>;
}): Promise<Metadata> {
  const { star: slug } = await params;
  const s = animalStarBySlug(slug);
  if (!s) return { title: "Not found" };
  const records = await starRecords(s);
  const n = records.length;
  const title = `${s.name} Live Cam — ${TITLE_TAILS[s.slug] ?? "Animal Webcams"}`;
  const description = `Watch ${s.name} (${s.place}, ${s.country}) live: ${n} camera${n === 1 ? "" : "s"} carried in the WorldEye directory under the feed's own name. Free, no signup.`;
  const url = `/animal-webcams/${s.slug}`;
  return {
    title,
    description,
    alternates: { canonical: `${BASE}${url}` },
    openGraph: { title, description, url, type: "website" },
  };
}

export default async function AnimalStarPage({
  params,
}: {
  params: Promise<{ star: string }>;
}) {
  const { star: slug } = await params;
  const s = animalStarBySlug(slug);
  if (!s) notFound();

  const records = await starRecords(s);
  const n = records.length;
  const fmt = (x: number) => x.toLocaleString("en-US");

  /* The record, exactly as catalogued — plus the nearest other
     directory cameras in the same country chunk. All fields below are
     the record's own; nothing is inferred about the animals. */
  const rec = records[0] ?? null;
  const chunkRecords = await recordsForDef({
    label: s.name,
    slugs: [s.chunk],
    groupBy: "country",
  });
  const wantedIds = new Set(s.ids);
  const nearestOthers = chunkRecords
    .filter(
      (r) =>
        !wantedIds.has(r.id) &&
        typeof r.lat === "number" &&
        typeof r.lng === "number",
    )
    .map((r) => ({
      name: r.name,
      city: r.city ?? "",
      source: r.source ?? "",
      d: haversineKm(s.lat, s.lng, r.lat as number, r.lng as number),
    }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 4);
  const group = ANIMAL_GROUPS.find((g) => g.ids.includes(s.ids[0])) ?? null;
  const mediaKind = rec ? cameraMediaKind(rec) : null;
  const mediaSentence =
    mediaKind === "video"
      ? "The record carries a live video stream."
      : mediaKind === "snapshot"
        ? "The record carries a snapshot feed — a still image the publisher refreshes, not a continuous stream."
        : mediaKind === "embed"
          ? "The record carries the publisher's own embedded player (an iframe embed)."
          : mediaKind === "link"
            ? "The record is a link record: it carries the publisher's own page for the feed rather than a stream of its own."
            : null;
  const distLabel = (km: number) =>
    km < 1
      ? `${Math.round(km * 1000)} m`
      : km < 100
        ? `${km.toFixed(1)} km`
        : `${fmt(Math.round(km))} km`;
  const samples: Sample[] = records.map((r) => ({
    name: r.name,
    city: r.city,
    id: r.id,
  }));

  const canonical = `${BASE}/animal-webcams/${s.slug}`;
  const placeWeather = s.weather
    ? await getPlaceWeather({ query: `${s.lat},${s.lng}`, lat: s.lat, lng: s.lng })
    : null;

  const faqs = [
    ...s.faqs,
    {
      q: `How many cameras are on this page, and how was ${s.short} chosen?`,
      a: `This page serves ${fmt(n)} camera${n === 1 ? "" : "s"} — the catalogue record${n === 1 ? "" : "s"} published under ${s.name}'s own name. The rule for the whole animal family is stated, not rounded: a camera belongs only when its own record names an animal subject and it is not a road or river-gauge camera named for a nearby landmark. The audit that applied the rule, rejections included, is summarised on the animal webcams hub.`,
    },
    {
      q: "Is it free to watch?",
      a: `Browsing this page is free, with no account and no signup. Signed-out visitors get 5 free camera opens per device (a free account with a verified email raises that to 10); unlimited opens require an upgrade. The ${s.short} feed is a public feed either way — the ladder only counts how many cameras you open, not which ones.`,
    },
  ];

  const pageLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${s.name} Live Cam`,
    description: `${n} live camera${n === 1 ? "" : "s"} at ${s.name}, ${s.place}, ${s.country} — carried in the WorldEye directory under the feed's own catalogue name.`,
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
        name: "Animal webcams",
        item: `${BASE}/animal-webcams`,
      },
      { "@type": "ListItem", position: 4, name: s.short, item: canonical },
    ],
  };

  const siblings = nearestStars(s, 3).map((o) => ({
    star: o,
    d: haversineKm(s.lat, s.lng, o.lat, o.lng),
  }));
  const cityLink = CITY_LINKS[s.slug];

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
          { label: "Animal webcams", href: "/animal-webcams" },
          { label: s.short },
        ]}
      />
      <Hero
        h1={`${s.name} — Live Animal Cameras`}
        sub={`${fmt(n)} live camera${n === 1 ? "" : "s"} at ${s.place}, ${s.country} — carried under the feed's own name. Free, no signup.`}
      />
      <StatRow
        stats={[
          { value: fmt(n), label: `camera${n === 1 ? "" : "s"} on this page` },
          { value: s.place, label: "place — from the record itself" },
          { value: s.country, label: "country" },
        ]}
      />
      <Intro paragraphs={[s.intro[0], s.intro[1]]} />

      {placeWeather && <PlaceWeatherPanel data={placeWeather} placeName={s.name} />}

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">Best time to watch {s.short}</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">{s.watch}</p>
        <p className="text-xs text-white/35 leading-relaxed max-w-3xl">
          A webcam shows where an animal could be, not where it is: check the
          feed&apos;s timestamp, and treat an empty frame as the animals&apos;
          schedule, not the camera&apos;s failure.
        </p>
      </section>

      {rec && (
        <section className="mt-12">
          <h2 className="text-xl md:text-2xl font-bold mb-3">
            The {s.short} record, exactly as catalogued
          </h2>
          <div className="space-y-4 text-white/70 leading-relaxed max-w-3xl">
            <p>
              This page serves the catalogue record published under the name{" "}
              <span className="text-white/90 font-medium">
                &ldquo;{rec.name}&rdquo;
              </span>
              {rec.source && (
                <>
                  {" "}
                  by <span className="text-white/90">{rec.source}</span>
                </>
              )}
              . WorldEye does not operate this camera and does not rename it:
              what the publisher calls it is what the directory carries, and
              the facts below are the record&rsquo;s own fields, not
              editorial additions.
            </p>
          </div>
          <ul className="mt-5 space-y-2 max-w-3xl">
            <li className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
              <span className="text-white/90 font-medium">Catalogue name:</span>{" "}
              {rec.name}
            </li>
            {rec.city && (
              <li className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
                <span className="text-white/90 font-medium">City field, verbatim:</span>{" "}
                {rec.city} — the place label the record itself carries
                {rec.city !== s.place.split(",")[0] &&
                  ` (this page's place line, ${s.place}, is built from the record's name and city fields together)`}
                .
              </li>
            )}
            <li className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
              <span className="text-white/90 font-medium">Position:</span>{" "}
              {s.lat.toFixed(5)}, {s.lng.toFixed(5)} — {s.place}, {s.country}.
              The feed runs on local time there: {s.tz.replace("_", " ")}{" "}
              time.
            </li>
            {mediaSentence && (
              <li className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
                <span className="text-white/90 font-medium">How the feed arrives:</span>{" "}
                {mediaSentence}
              </li>
            )}
            {group && (
              <li className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
                <span className="text-white/90 font-medium">In the family:</span>{" "}
                on the animal webcams hub, {s.short} sits in the &ldquo;
                {group.heading}&rdquo; group — one of {fmt(group.ids.length)}{" "}
                audited feeds in that group, out of the family&rsquo;s whole
                rule-matched set.
              </li>
            )}
          </ul>
        </section>
      )}

      {nearestOthers.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl md:text-2xl font-bold mb-3">
            The nearest other cameras to {s.short} in {s.country}
          </h2>
          <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
            {nearestOthers[0].d >= 100
              ? `This feed stands alone in the catalogue: the nearest other camera the directory holds in ${s.country} is ${nearestOthers[0].name}, ${distLabel(nearestOthers[0].d)} away. There is no cluster around ${s.short} to pad this page with — the feed is the page, and its isolation is stated rather than disguised.`
              : nearestOthers[0].d >= 10
                ? `${s.short} is the only animal camera in its corner of ${s.country}; the nearest other directory cameras are the town and road feeds below, starting with ${nearestOthers[0].name} at ${distLabel(nearestOthers[0].d)}. They show the place around the feed — its weather, streets and light — not more animals.`
                : `The directory also holds cameras practically next door to ${s.short} — the nearest, ${nearestOthers[0].name}, is ${distLabel(nearestOthers[0].d)} away. They are the place's ordinary public feeds (roads, rivers, city views), listed here because they show the world this animal camera sits in.`}
          </p>
          <ul className="space-y-2 max-w-3xl">
            {nearestOthers.map((o, i) => (
              <li
                key={`${o.name}-${i}`}
                className="flex items-baseline justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
              >
                <span className="text-sm text-white/80">
                  {o.name}
                  {o.city && (
                    <span className="text-white/45"> — {o.city}</span>
                  )}
                  {o.source && (
                    <span className="text-white/45"> · {o.source}</span>
                  )}
                </span>
                <span className="text-xs text-white/45 whitespace-nowrap">
                  {distLabel(o.d)} away
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {samples.length > 0 && (
        <SampleGrid
          title={n === 1 ? `The ${s.short} camera` : `The ${s.short} cameras`}
          samples={samples}
        />
      )}

      <HowTo
        title={`How to watch ${s.short} on the map`}
        steps={[
          `Open the camera from the grid above${rec ? ` — the record published as "${rec.name}"${rec.source ? ` by ${rec.source}` : ""}` : ""} — or find its marker on the free WorldEye globe; browsing needs no account.`,
          `Check the timestamp before trusting the frame${placeWeather ? ", and read the weather panel above" : ""}: animals and weather keep the same hours, and a still ${s.place} morning is information, not a broken feed.`,
          `Think in local time — this feed runs on the ${s.tz.replace("_", " ")} clock at ${s.place}, and animals keep it more faithfully than people do.`,
          `Come back across the day rather than judging one visit at ${s.short}: dawn, feeding time and dusk are different programmes.`,
          `Browse the hub for the rest of the family${group ? ` — ${s.short} is filed there under "${group.heading}"` : ""} — the nest cams and reef cams keep opposite hours to the safari feeds.`,
        ]}
      />

      <FaqSection title={`${s.short} webcam — FAQ`} faqs={faqs} />

      <RelatedLinks
        title="More animal webcams"
        links={[
          { label: "All animal webcams", href: "/animal-webcams" },
          ...siblings.map(({ star: o, d }) => ({
            label: `${o.name} live cam — ${distLabel(d)} away`,
            href: `/animal-webcams/${o.slug}`,
          })),
          ...(cityLink ? [cityLink] : []),
          {
            label: `${s.country} cameras — the country index`,
            href: `/cameras/countries/${s.countrySlug}`,
          },
          { label: "Live webcams worldwide", href: "/live-webcams" },
        ]}
      />

      <TrialCtaSection utmSource="animal-webcams" />
      <CtaRow backHref="/animal-webcams" backLabel="All animal webcams" />
    </PageShell>
  );
}
