import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
  CtaRow,
  PageShell,
} from "@/components/directory-page";
import SkiCameraGrid from "@/components/SkiCameraGrid";
import TrialCtaSection from "@/components/TrialCtaSection";
import { loadCountryChunk } from "@/lib/ski-resorts";
import { camerasWithinKm } from "@/lib/event-page-cameras";
import { propagateTLE } from "@/lib/orbit";
import {
  ISS_CITIES,
  ISS_CITY_RADIUS_KM,
  ISS_INCLINATION_DEG,
  VISIBILITY_LABELS,
  findPasses,
  formatDuration,
  formatPassTime,
  issCityBySlug,
} from "@/lib/iss-passes";
import { getIssTle } from "@/lib/iss-server";
import { buildGeoUrl } from "@/lib/share/links";

export const revalidate = 3600;

interface Params {
  params: Promise<{ city: string }>;
}

export function generateStaticParams() {
  return ISS_CITIES.map((c) => ({ city: c.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { city: slug } = await params;
  const city = issCityBySlug(slug);
  if (!city) return {};
  const title = `ISS Over ${city.name} — Next Passes & Live Cameras`;
  const description = `When the International Space Station next passes over ${city.name} — rise, peak and set times computed from the station's real orbital elements, each pass labelled by whether you could see it, plus ${city.name}'s live public cameras. Free on WorldEye.`;
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/iss-over/${city.slug}` },
    openGraph: {
      title: `${title} | WorldEye`,
      description,
      url: `/iss-over/${city.slug}`,
      type: "website",
    },
  };
}

export default async function IssOverCityPage({ params }: Params) {
  const { city: slug } = await params;
  const city = issCityBySlug(slug);
  if (!city) notFound();

  const records = await loadCountryChunk(city.chunk);
  const wall = camerasWithinKm(records, city, ISS_CITY_RADIUS_KM);

  const tle = await getIssTle();
  const now = new Date();
  const passes = tle
    ? findPasses(tle.line1, tle.line2, city, now, 72, undefined, 8)
    : [];
  const nextVisible = passes.find((p) => p.visibility === "visible") ?? null;
  const position = tle ? propagateTLE(tle.line1, tle.line2, now) : null;

  /* This city's counted facts — the pass list and camera wall this page
     already computes, summarised as prose in the counted section below. */
  const visCounts = new Map<string, number>();
  for (const p of passes) {
    visCounts.set(p.visibility, (visCounts.get(p.visibility) ?? 0) + 1);
  }
  const visSplit = (["visible", "twilight", "daylight", "eclipsed"] as const)
    .filter((k) => (visCounts.get(k) ?? 0) > 0)
    .map((k) => `${visCounts.get(k)} labelled ${k}`)
    .join(", ");
  const highestPass = passes.length
    ? passes.reduce((a, b) => (b.maxElevationDeg > a.maxElevationDeg ? b : a))
    : null;
  const longestPass = passes.length
    ? passes.reduce((a, b) =>
        b.end.getTime() - b.start.getTime() > a.end.getTime() - a.start.getTime()
          ? b
          : a,
      )
    : null;
  const wallSourceCounts = new Map<string, number>();
  const wallAreaCounts = new Map<string, number>();
  for (const r of wall) {
    const s = r.source?.trim();
    if (s) wallSourceCounts.set(s, (wallSourceCounts.get(s) ?? 0) + 1);
    const a = r.city?.trim();
    if (a) wallAreaCounts.set(a, (wallAreaCounts.get(a) ?? 0) + 1);
  }
  const byCount = (a: { count: number; name: string }, b: { count: number; name: string }) =>
    b.count - a.count || a.name.localeCompare(b.name);
  const topWallSources = [...wallSourceCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort(byCount)
    .slice(0, 4);
  const latLabel = `${Math.abs(city.lat).toFixed(2)}° ${city.lat >= 0 ? "N" : "S"}`;
  const lngLabel = `${Math.abs(city.lng).toFixed(2)}° ${city.lng >= 0 ? "E" : "W"}`;
  const globeUrl = buildGeoUrl({ lat: city.lat, lng: city.lng, radiusM: 25000 }, "") ?? "/";

  const faqs = [
    {
      q: `When does the ISS pass over ${city.name} next?`,
      a: passes.length
        ? `The next pass above 10 degrees peaks at ${formatPassTime(passes[0].peak, city.timeZone)} (${city.name} time), reaching ${Math.round(passes[0].maxElevationDeg)} degrees. ${nextVisible ? `The next pass worth setting an alarm for — dark sky, station in sunlight — peaks at ${formatPassTime(nextVisible.peak, city.timeZone)}.` : "None of the passes in the next 72 hours pairs a dark sky with a sunlit station; the table labels each one with what it is."} Times are computed from the station's current orbital elements and refreshed hourly.`
        : `Pass times for ${city.name} are unavailable right now — the station's orbital elements could not be fetched for this build of the page. The live tracker linked below shows the station's position in real time, and this page's table returns with the next hourly refresh.`,
    },
    {
      q: "How are these times computed?",
      a: "WorldEye fetches the ISS's current two-line element set from CelesTrak — the same feed as the globe's satellites layer — and propagates it with SGP4, the standard orbital model, converting future positions into rise, peak and set times for this city's coordinates. Rise and set are bisected to the second at the 10-degree threshold. It is a computation from the station's real elements, not a copied schedule.",
    },
    {
      q: "What do the labels mean?",
      a: `Visible: at the pass's peak the sun is more than 6 degrees below your horizon and the station is out of Earth's shadow — the classic bright crossing, the one to watch. Twilight: the station is lit but the sky is not yet fully dark. Daylight: a real pass, but the sky is bright — you will not see it unaided. Eclipsed: at peak the station is inside Earth's shadow and reflects no sunlight at all; those passes are listed so the gaps in the visible list are explained rather than hidden.${passes.length ? ` In this build's 72-hour table for ${city.name} the split is ${visSplit} — ${city.name}'s own ratio, set by its latitude and this week's orbit geometry, not a template figure.` : ""}`,
    },
    {
      q: `Why pair the passes with ${city.name}'s cameras?`,
      a: `Because the station crosses the sky over a real city, and this is that city from street level: ${wall.length} public cameras within ${ISS_CITY_RADIUS_KM} km of the centre, the same wall the ${city.name} city page serves. The cameras watch the streets; the table watches the sky; together they are the whole vertical slice of the place. No street camera here is pointed at the sky as an ISS camera — the page does not claim one.`,
    },
    {
      q: "Is this free?",
      a: "Yes — the pass table and every camera on this page are free to open on WorldEye, no account, no signup.",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `ISS Over ${city.name} — Next Passes & Live Cameras`,
    description: `Next International Space Station passes over ${city.name}, computed from the station's current TLE, with the city's live public cameras.`,
    url: `${BASE}/iss-over/${city.slug}`,
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  };

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={faqs} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "ISS over your city", href: "/iss-over" },
          { label: city.name },
        ]}
      />
      <Hero
        h1={`ISS Over ${city.name} — Next Passes & Live Cameras`}
        sub={
          nextVisible
            ? `The next pass worth watching peaks at ${formatPassTime(nextVisible.peak, city.timeZone)} ${city.name} time. Times computed from the station's real orbital elements — free, no signup.`
            : `Every pass over ${city.name} in the next 72 hours, computed from the station's real orbital elements and labelled honestly. Free, no signup.`
        }
      />
      <StatRow
        stats={[
          {
            value: passes.length ? formatPassTime(passes[0].peak, city.timeZone) : "—",
            label: passes.length
              ? `the next pass over ${city.name} (peak, local time)`
              : "pass times unavailable this hour",
          },
          {
            value: nextVisible ? formatPassTime(nextVisible.peak, city.timeZone) : "None in 72 h",
            label: "the next visible pass — dark sky, station lit",
          },
          { value: String(wall.length), label: `public cameras within ${ISS_CITY_RADIUS_KM} km of central ${city.name}` },
        ]}
      />
      <Intro
        paragraphs={[
          `The space station passes over ${city.name} on a rhythm set by its orbit — a few crossings a day above the horizon, of which only some arrive in the magic configuration: your sky dark, the station still in sunlight 420 kilometres up, shining like a slow meteor that never burns. The table below computes every crossing of the next 72 hours from the station's current orbital elements and labels each with its true prospects, so the pass you plan around is the pass that will actually show.`,
          tle
            ? `The elements behind this table are dated ${tle.epoch.toISOString().slice(0, 10)} (their TLE epoch) and the table is recomputed hourly, so the times age with the orbit's own accuracy — good to the second for days ahead, drifting slowly after. ${position ? `As this page was built, the station stood at ${Math.abs(position.lat).toFixed(1)}° ${position.lat >= 0 ? "N" : "S"}, ${Math.abs(position.lng).toFixed(1)}° ${position.lng >= 0 ? "E" : "W"}, ${Math.round(position.altKm)} km up — already somewhere else by the time you read this, which is rather the point of a live tracker.` : ""}`
            : "This build of the page could not fetch the station's orbital elements, so the pass table is empty rather than invented — the cameras below and the live tracker are unaffected, and the table returns at the next hourly refresh.",
          `Below the table: ${city.name} from the ground. ${wall.length} public cameras within ${ISS_CITY_RADIUS_KM} km of the city centre — the streets the station crosses over, on the same page as the sky it crosses. For the station itself, live, the tracker follows it around the globe in real time.`,
        ]}
      />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">
          The next passes over {city.name}
        </h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Every crossing above 10 degrees in the next 72 hours, times in {city.name} local
          time. Rise and set are the moments the station crosses 10 degrees; the peak is
          its highest point.
        </p>
        {passes.length ? (
          <div className="space-y-3">
            {passes.map((p) => (
              <div
                key={p.start.toISOString()}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
              >
                <span className="font-semibold text-white/90">
                  Peaks {formatPassTime(p.peak, city.timeZone)} — {Math.round(p.maxElevationDeg)}°
                  max elevation
                </span>
                <span className="block text-sm text-white/55 mt-1">
                  Rises {formatPassTime(p.start, city.timeZone)} · sets{" "}
                  {formatPassTime(p.end, city.timeZone)} · above 10° for{" "}
                  {formatDuration(p.start, p.end)}
                </span>
                <span
                  className={`block text-sm mt-1 ${p.visibility === "visible" ? "text-[#00E5FF]" : "text-white/50"}`}
                >
                  {VISIBILITY_LABELS[p.visibility]}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/55 leading-relaxed max-w-3xl">
            {tle
              ? `No crossing above 10 degrees in the next 72 hours — the orbit's geometry gives ${city.name} a quiet stretch. Check back tomorrow; the pattern shifts daily.`
              : "Pass predictions are unavailable for this build of the page (the orbital-elements fetch failed). The station is still flying — watch it live on the tracker."}
          </p>
        )}
        <p className="text-sm text-white/40 leading-relaxed max-w-3xl mt-4">
          Computed with SGP4 from the station&apos;s CelesTrak elements
          {tle ? ` (epoch ${tle.epoch.toISOString().slice(0, 10)})` : ""}, refreshed hourly.{" "}
          <Link href="/space-station-tracker" className="text-[#00E5FF] hover:underline">
            Watch the station live on the globe →
          </Link>
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">
          {city.name}&rsquo;s next 72 hours, counted
        </h2>
        {passes.length > 0 && highestPass && longestPass ? (
          <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-4">
            Counted from the table above: {passes.length}{" "}
            {passes.length === 1 ? "crossing" : "crossings"} above 10 degrees
            in the next 72 hours — {visSplit}. The highest of them peaks at{" "}
            {formatPassTime(highestPass.peak, city.timeZone)} {city.name}{" "}
            time, reaching {Math.round(highestPass.maxElevationDeg)} degrees;
            the longest keeps the station above 10 degrees for{" "}
            {formatDuration(longestPass.start, longestPass.end)} (rises{" "}
            {formatPassTime(longestPass.start, city.timeZone)}, sets{" "}
            {formatPassTime(longestPass.end, city.timeZone)}). Those two
            numbers — how high, how long — are the ones that decide whether a
            pass is a glance or a show, and they are {city.name}&rsquo;s alone:
            every city&rsquo;s table counts differently because the geometry
            over each latitude is different.
          </p>
        ) : (
          <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-4">
            This build has no pass table to count — the reason is stated
            above, and the table returns at the next hourly refresh. The
            counted facts that stand regardless are {city.name}&rsquo;s
            coordinates and its camera wall, below.
          </p>
        )}
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-4">
          Every time on this page is computed for one point: {latLabel},{" "}
          {lngLabel} — {city.name}, {city.country} — in the {city.timeZone}{" "}
          time zone. The station&rsquo;s orbit is inclined{" "}
          {ISS_INCLINATION_DEG} degrees to the equator, and {city.name} sits
          inside that band, so near-overhead passes are geometrically
          possible here; the peak column in the table shows how close each
          actual crossing gets.
        </p>
        {wall.length > 0 && topWallSources.length > 0 && (
          <p className="text-sm text-white/55 leading-relaxed max-w-3xl">
            On the ground, the wall under those passes is {wall.length}{" "}
            public cameras within {ISS_CITY_RADIUS_KM} km of the centre,
            filed under{" "}
            {wallSourceCounts.size === 1
              ? `a single catalogue source — ${topWallSources[0].name}`
              : `${wallSourceCounts.size} catalogue sources — ${topWallSources.map((s) => `${s.name} (${s.count})`).join(", ")}`}
            {wallAreaCounts.size > 1
              ? `, with the records' own area names spanning ${wallAreaCounts.size} areas of the city`
              : ""}
            .
          </p>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">
          {city.name} from the ground — live cameras
        </h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Every public camera in the directory within {ISS_CITY_RADIUS_KM} km of central{" "}
          {city.name}, nearest first — the streets under the passes. These are street-level
          cameras; none is an ISS camera, and the sky is yours to watch with your own eyes.
        </p>
        <SkiCameraGrid
          cameras={wall}
          initial={12}
          emptyNote={`No public cameras in the directory currently cover ${city.name}.`}
        />
      </section>

      <HowTo
        title={`How to watch a pass over ${city.name}`}
        steps={[
          "Choose a pass labelled visible from the table — dark sky, station in sunlight.",
          `Be outside at the rise time, facing open sky; a peak above 40 degrees needs no particular direction — it will cross the whole sky.${highestPass ? ` In this table the highest pass over ${city.name} peaks at ${Math.round(highestPass.maxElevationDeg)}°, at ${formatPassTime(highestPass.peak, city.timeZone)}.` : ""}`,
          "Look for a bright, steady light moving fast and silently, with no blinking — aircraft blink; the station does not.",
          "It brightens as it climbs and, on eclipsed exits, can vanish mid-sky as it enters Earth's shadow — the table's label tells you if this pass ends that way at its peak.",
          "Missed it? Passes come in runs across consecutive evenings and mornings — the 72-hour table holds the next chance.",
        ]}
      />

      <FaqSection title={`ISS over ${city.name} — FAQ`} faqs={faqs} />

      <RelatedLinks
        title="Keep exploring"
        links={[
          { label: `Live webcams in ${city.name}`, href: `/city-webcams/${city.slug}` },
          { label: `${city.name} on the 3D globe`, href: globeUrl },
          { label: "All 20 ISS city pages", href: "/iss-over" },
          { label: "The space station tracker — live", href: "/space-station-tracker" },
          { label: `${city.country} cameras`, href: `/cameras/countries/${city.countrySlug}` },
        ]}
      />

      <TrialCtaSection utmSource={`iss-over-${city.slug}`} />

      <CtaRow backHref="/iss-over" backLabel="All ISS cities" />
    </PageShell>
  );
}
