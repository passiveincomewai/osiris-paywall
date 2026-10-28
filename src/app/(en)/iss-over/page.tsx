import type { Metadata } from "next";
import Link from "next/link";
import {
  BASE,
  JsonLd,
  Breadcrumb,
  Hero,
  Intro,
  AreaTable,
  StatRow,
  HowTo,
  FaqSection,
  FaqJsonLd,
  RelatedLinks,
  CtaRow,
  PageShell,
} from "@/components/directory-page";
import TrialCtaSection from "@/components/TrialCtaSection";
import { loadCountryChunk } from "@/lib/ski-resorts";
import { countWithinKm } from "@/lib/event-page-cameras";
import { propagateTLE } from "@/lib/orbit";
import {
  ISS_CITIES,
  ISS_CITY_RADIUS_KM,
  VISIBILITY_LABELS,
  findPasses,
  formatPassTime,
  type IssCity,
  type IssPass,
} from "@/lib/iss-passes";
import { getIssTle } from "@/lib/iss-server";

export const revalidate = 3600;

const SLUG = "iss-over";

export const metadata: Metadata = {
  title: "ISS Over Your City — When the Space Station Passes, City by City",
  description:
    "When the International Space Station next passes over 20 cities — computed live from the station's real orbital elements with the same SGP4 maths the globe runs, with each pass labelled by whether you could actually see it. Free on WorldEye.",
  alternates: { canonical: `${BASE}/${SLUG}` },
  openGraph: {
    title: "ISS Over Your City — Next Passes, City by City | WorldEye",
    description:
      "Next ISS passes over 20 cities, computed from the station's current TLE — rise, peak and set, with honest visibility labels. Free on WorldEye.",
    url: `/${SLUG}`,
    type: "website",
  },
};

const FAQS = [
  {
    q: "How are these pass times computed?",
    a: "From the station's own orbital elements. WorldEye fetches the ISS's current two-line element set (TLE) from CelesTrak — the same feed that drives the satellites layer on the globe — and propagates it with SGP4, the standard orbital model, converting each future position into rise, peak and set times for the city's coordinates. There is no scraped schedule and no approximation beyond the model itself; each city page prints the TLE's epoch and the time its table was computed, so a prediction is never presented as fresher than the elements behind it.",
  },
  {
    q: "What counts as a pass?",
    a: "The station rising above 10 degrees of elevation — below that, haze, rooftops and city glow hide it for most observers, whatever a timetable says. Every pass listed clears that bar, and the table gives the peak elevation so you can judge for yourself: a 15-degree pass is a low skim through the murk; an 80-degree pass goes nearly overhead and is unmissable in a dark sky.",
  },
  {
    q: "When is a pass actually visible?",
    a: "Two things must coincide: your sky must be dark and the station must be in sunlight — a 420-kilometre-high sunlit station against a dark ground is what makes the ISS the third-brightest object in the sky. Every pass here is labelled with what it is: visible (dark sky, station lit), twilight, daylight, or eclipsed — a pass through Earth's shadow, which happens on roughly a third of orbits and is invisible however dark your sky is. The label is computed per pass from the sun's position, not guessed from the clock.",
  },
  {
    q: "Why only 20 cities — and why is Stockholm not one?",
    a: "Two rules. A city needs a real camera page here, because these pages pair the passes with the city's live cameras. And the city must lie within the station's orbital band: the ISS is inclined 51.6 degrees, so poleward of that it never passes high — from Stockholm (59.3 degrees north, 349 cameras in the directory) it never climbs above low southern murk, and a page promising passes 'over Stockholm' would be a false promise. The list stops where the orbit stops.",
  },
  {
    q: "Are the pass pages free?",
    a: "Yes — the passes, the labels and every camera on the city pages are free to open on WorldEye, no account, no signup.",
  },
];

interface CityRow {
  city: IssCity;
  cameras: number;
  next: IssPass | null;
}

export default async function IssOverHubPage() {
  const tle = await getIssTle();
  const now = new Date();

  const chunks = new Map<string, Awaited<ReturnType<typeof loadCountryChunk>>>();
  for (const c of ISS_CITIES) {
    if (!chunks.has(c.chunk)) chunks.set(c.chunk, await loadCountryChunk(c.chunk));
  }

  const rows: CityRow[] = ISS_CITIES.map((city) => {
    const records = chunks.get(city.chunk) ?? [];
    const cameras = countWithinKm(records, city, ISS_CITY_RADIUS_KM);
    const next = tle
      ? (findPasses(tle.line1, tle.line2, city, now, 72, undefined, 1)[0] ?? null)
      : null;
    return { city, cameras, next };
  });

  const position = tle ? propagateTLE(tle.line1, tle.line2, now) : null;
  const totalCameras = rows.reduce((a, r) => a + r.cameras, 0);
  const epochLine = tle
    ? `Predictions on this page are computed from the station's current orbital elements (TLE epoch ${tle.epoch.toISOString().slice(0, 10)}), refreshed hourly.`
    : "Pass predictions are unavailable at the moment — the station's orbital elements could not be fetched. The city pages still carry each city's live cameras, and the tracker below shows the station live.";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "ISS Over Your City — When the Space Station Passes, City by City",
    description:
      "Next International Space Station passes over 20 cities, computed from the station's current TLE with SGP4 — with per-pass visibility labels and each city's live cameras.",
    url: `${BASE}/${SLUG}`,
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  };

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Space station tracker", href: "/space-station-tracker" },
          { label: "ISS over your city" },
        ]}
      />
      <Hero
        h1="ISS Over Your City — the Next Passes, City by City"
        sub="When the space station next crosses your sky — computed from its real orbital elements, labelled by whether you could actually see it. Free, no signup."
      />
      <StatRow
        stats={[
          { value: String(ISS_CITIES.length), label: "cities with computed pass tables" },
          { value: totalCameras.toLocaleString("en-US"), label: "public cameras within 25 km of those cities" },
          {
            value: position
              ? `${Math.abs(position.lat).toFixed(1)}° ${position.lat >= 0 ? "N" : "S"}, ${Math.abs(position.lng).toFixed(1)}° ${position.lng >= 0 ? "E" : "W"}`
              : "—",
            label: position
              ? `the station's position as this page was built — ${Math.round(position.altKm)} km up`
              : "the station's position — live on the tracker",
          },
        ]}
      />
      <Intro
        paragraphs={[
          "The International Space Station circles the Earth every 93 minutes or so, and on the right evening it crosses your city as the brightest moving thing in the sky — no telescope, no app, just a minute of looking up at the right moment. This page exists to give you that moment honestly: for each of 20 cities, the station's next passes, computed from its current orbital elements with the same SGP4 propagation that puts the station on WorldEye's globe.",
          "Honesty is the design. A pass only counts when the station climbs above 10 degrees — below that, no timetable should send you outside. And every pass is labelled with its real prospects: visible passes (dark sky, station in sunlight) are the ones worth an alarm; twilight and daylight passes are listed as what they are; and passes through Earth's shadow — invisible however clear the night — are named eclipsed rather than silently dropped, so a gap in the visible list is explained, not suspicious.",
          `${epochLine} Each city page pairs its pass table with the city's live public cameras — watch the streets below on the same evening the station crosses the sky above them.`,
        ]}
      />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">The twenty cities — next pass first</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Each card shows the city&apos;s next pass above 10 degrees in the next 72 hours, in
          the city&apos;s own time. Open a city for its full table — every pass, labelled —
          and its live cameras.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {rows.map(({ city, cameras, next }) => (
            <Link
              key={city.slug}
              href={`/iss-over/${city.slug}`}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-[#00E5FF]/40 transition-colors"
            >
              <span className="font-semibold text-white/90">
                ISS over {city.name}
              </span>
              <span className="block text-sm text-white/50 mt-1">
                {city.country} · {cameras.toLocaleString("en-US")} cameras within{" "}
                {ISS_CITY_RADIUS_KM} km
              </span>
              {next ? (
                <span className="block text-sm text-white/70 mt-2">
                  Next pass: {formatPassTime(next.peak, city.timeZone)} — peaks at{" "}
                  {Math.round(next.maxElevationDeg)}°.{" "}
                  <span className="text-white/50">
                    {VISIBILITY_LABELS[next.visibility]}
                  </span>
                </span>
              ) : (
                <span className="block text-sm text-white/50 mt-2">
                  {tle
                    ? "No pass above 10° in the next 72 hours."
                    : "Pass times unavailable right now — cameras inside."}
                </span>
              )}
              <span className="block text-sm text-[#00E5FF] mt-2">
                Passes & cameras for {city.name} →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <AreaTable
        title="Camera counts — per city"
        rows={rows.map(({ city, cameras }) => ({
          name: `${city.name} (${city.country})`,
          count: cameras,
          href: `/iss-over/${city.slug}`,
        }))}
        note={`Counts are public cameras in the WorldEye directory within ${ISS_CITY_RADIUS_KM} km of each city's centre — the same radius the city pages state on their walls.`}
      />

      <HowTo
        title="How to catch a pass"
        steps={[
          "Pick your city and find a pass labelled visible — dark sky, station lit. Those are the ones worth planning around.",
          "Note the peak time and elevation: above 40 degrees is a commanding pass; above 70, it goes nearly overhead.",
          "Be outside a minute early, looking toward the horizon the station rises from — it appears as a steady, fast, silent light that does not blink.",
          "The whole crossing takes a few minutes; the table's rise and set times are the window, bisected from the orbital model to the second.",
          "Clouded out? The table runs 72 hours ahead — the next visible pass is rarely more than a couple of days away.",
        ]}
      />

      <FaqSection title="ISS passes — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="Keep exploring"
        links={[
          { label: "The space station tracker — the station live on the globe", href: "/space-station-tracker" },
          { label: "Satellite tracker", href: "/satellite-tracker" },
          { label: "Northern lights webcams — the other great night sky", href: "/aurora-webcams" },
          { label: "Dark sky cameras", href: "/dark-sky-cameras" },
        ]}
      />

      <TrialCtaSection utmSource={SLUG} />

      <CtaRow backHref="/space-station-tracker" backLabel="Space station tracker" />
    </PageShell>
  );
}
