import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BASE,
  JsonLd,
  Breadcrumb,
  Hero,
  Intro,
  StatRow,
  SampleGrid,
  HowTo,
  FaqSection,
  FaqJsonLd,
  RelatedLinks,
  CtaRow,
  PageShell,
  type Faq,
} from "@/components/directory-page";
import DirectoryExplorer from "@/components/DirectoryExplorer";
import TrialCtaSection from "@/components/TrialCtaSection";
import { EXPLORE_SCOPES, countForDef } from "@/lib/explore-data";
import {
  AIRPORT_PAGES,
  AIRPORT_PAGE_BY_SLUG,
  airportGlobeUrl,
  type AirportPageDef,
} from "@/lib/airport-pages";

/* Per-airport pages (keyword wave A, Oct 2026). One dynamic route over
   lib/airport-pages: each page is a radius wall over the catalogue
   (15 km from the airport's coordinates; 25 km for Denver, stated on
   its page), the counts are computed from the same scope the wall
   serves, and the flight section links the live tracker over the
   airport — the feed provides live aircraft positions, not
   per-airport boards, so no board is invented. */

export function generateStaticParams() {
  return AIRPORT_PAGES.map((a) => ({ airport: a.slug }));
}

function pageTitle(a: AirportPageDef): string {
  return `${a.name} (${a.iata}) Webcams & Live Flights`;
}

function pageDescription(a: AirportPageDef): string {
  return `${a.count} live public cameras within ${a.radiusKm} km of ${a.name} (${a.iata}) in ${a.city} — airport-area roads, weather and approach corridors, plus live flights overhead. Free, no signup.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ airport: string }>;
}): Promise<Metadata> {
  const { airport } = await params;
  const a = AIRPORT_PAGE_BY_SLUG[airport];
  if (!a) return {};
  return {
    title: pageTitle(a),
    description: pageDescription(a),
    alternates: { canonical: `${BASE}/airport-webcams/${a.slug}` },
    openGraph: {
      title: pageTitle(a),
      description: pageDescription(a),
      url: `/airport-webcams/${a.slug}`,
      type: "website",
    },
  };
}

function buildFaqs(a: AirportPageDef, count: number): Faq[] {
  const fmt = (n: number) => n.toLocaleString("en-US");
  const onField = a.faaCount > 0 && a.faaNearestKm !== null && a.faaNearestKm <= 1.5;

  const airfieldAnswer =
    a.iata === "DEN"
      ? `No — and this page doesn't pretend otherwise. DEN sits on open plains some 40 km from downtown Denver; the nearest catalogue cameras are ${a.nearestKm} km away on the I-70 corridor, and the four FAA WeatherCams in range belong to Colorado Air and Space Port, a different airfield near Watkins. What this wall honestly shows is the airport's highway lifeline in live detail.`
      : onField
        ? `Yes — ${a.faaCount} FAA WeatherCams tower cameras sit on the airfield itself, the nearest ${a.faaNearestKm} km from the airport's centre point, and they lead this page's wall. The rest of the wall is the surrounding road network that serves the airport.`
        : a.faaCount > 0
          ? `Mostly the surroundings: terminal roads, approach corridors and nearby districts. FAA WeatherCams feeds are also within the radius — the nearest ${a.faaNearestKm} km away, at the smaller airfields around ${a.city} rather than at ${a.iata} itself. That is the honest shape of public camera coverage at almost every airport.`
          : `Mostly no — the wall is the airport's surroundings rather than the airfield itself: terminal roads, approach corridors and nearby districts. That is the honest shape of public camera coverage at almost every airport, and the views are still the ones travellers use: weather over the airport's area, the state of the airport roads, and the corridors flights cross on approach.`;

  return [
    {
      q: `How many cameras are near ${a.name}?`,
      a: `${fmt(count)} public cameras in the WorldEye catalogue sit within ${a.radiusKm} km of ${a.name} (${a.iata}), nearest first. ${a.topSource.label} operates ${fmt(a.topSource.count)} of them. The wall is mostly the roads and districts that serve the airport — freeway interchanges, terminal approach roads and surrounding streets — because that is where public cameras near airports actually point.`,
    },
    {
      q: `Are there cameras on the airfield at ${a.iata}?`,
      a: airfieldAnswer,
    },
    {
      q: `Can I watch planes take off and land at ${a.iata}?`,
      a: `Not from a dedicated runway camera — the catalogue doesn't carry one for ${a.iata}, and this page won't dress a freeway camera up as one. What you can do is pair the area cameras with the live flight layer: open the globe over ${a.city} with flights on (linked above) and the aircraft overhead carry flight numbers, routes and aircraft types, so arrivals on final and departures climbing out are identified in real time.${
        onField
          ? " The on-field FAA WeatherCams do show the airfield itself and its weather directly."
          : ""
      }`,
    },
    {
      q: `Can I check the weather at ${a.city} airport before a flight?`,
      a: `Yes, as a supplement: the cameras show the actual sky and ground conditions around ${a.name} right now — fog, storm lines, snow on the roads — which is the ground truth behind a forecast. For flight decisions, always pair it with official aviation weather; cameras show what it looks like, not what it will do.`,
    },
    {
      q: `Who operates the cameras on this page?`,
      a: `${a.topSource.label} operates the largest share (${fmt(a.topSource.count)} of ${fmt(count)}). WorldEye doesn't operate cameras — it indexes public feeds that transport agencies, municipalities and airports already publish, and puts them on one map.`,
    },
    {
      q: `Is it free to watch ${a.iata} airport cameras?`,
      a: `Yes. Every camera on this page is free to open, with no account and no signup, and the live globe — cameras, flights, weather — is free too.`,
    },
  ];
}

export default async function AirportPage({
  params,
}: {
  params: Promise<{ airport: string }>;
}) {
  const { airport } = await params;
  const a = AIRPORT_PAGE_BY_SLUG[airport];
  if (!a) notFound();

  const def = EXPLORE_SCOPES[a.scopeKey];
  const count = await countForDef(def);
  const fmt = (n: number) => n.toLocaleString("en-US");
  const faqs = buildFaqs(a, count);
  const onField = a.faaCount > 0 && a.faaNearestKm !== null && a.faaNearestKm <= 1.5;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Airport",
    name: a.name,
    iataCode: a.iata,
    icaoCode: a.icao,
    url: `${BASE}/airport-webcams/${a.slug}`,
    geo: { "@type": "GeoCoordinates", latitude: a.lat, longitude: a.lng },
    address: {
      "@type": "PostalAddress",
      addressLocality: a.city,
      addressCountry: a.countryCode,
    },
  };

  const intro = [
    `${a.name} (${a.iata}) serves ${a.city}, ${a.country} — and ${fmt(count)} public cameras in the WorldEye catalogue sit within ${a.radiusKm} km of it. This page gathers them into one wall, nearest first: the freeways, terminal roads and districts around the airport, all live and all free to watch, no account, no signup.`,
    ...(a.note
      ? [a.note]
      : [
          `The coverage is ${a.topSource.label}'s network first — ${fmt(a.topSource.count)} of the ${fmt(count)} feeds — which is the normal shape of airport camera coverage: transport agencies watch the roads an airport depends on, and those feeds double as the airport's weather and traffic picture.`,
        ]),
    `Travellers use the wall three ways: a pre-flight weather check (the actual sky over the airport's area, not a forecast's summary of it), a terminal-roads check before the drive in, and — paired with the live flight layer below — a way to watch arrivals and departures over the field and know which flight is which.`,
  ];

  const related: { label: string; href: string }[] = [
    { label: "Airport webcams hub — every airport area", href: "/airport-webcams" },
    { label: "Live flight tracker", href: "/live-flight-tracker" },
    ...(a.cityPageSlug
      ? [{ label: `${a.city} webcams`, href: `/city-webcams/${a.cityPageSlug}` }]
      : []),
    { label: `${a.country} cameras`, href: `/cameras/countries/${a.countrySlug}` },
    { label: "Live webcams hub", href: "/live-webcams" },
  ];

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={faqs} />
      <Breadcrumb
        trail={[
          { label: "Cameras", href: "/cameras" },
          { label: "Airport webcams", href: "/airport-webcams" },
          { label: `${a.city} (${a.iata})` },
        ]}
      />
      <Hero
        h1={pageTitle(a)}
        sub={`${fmt(count)} public cameras within ${a.radiusKm} km of ${a.name} — airport-area roads, weather and approach corridors, plus the live flights overhead. Free, no signup.`}
      />
      <StatRow
        stats={[
          { value: fmt(count), label: `cameras within ${a.radiusKm} km of the airport` },
          { value: `${a.nearestKm} km`, label: "to the nearest camera" },
          { value: fmt(a.topSource.count), label: `of the feeds are ${a.topSource.label}` },
        ]}
      />
      <Intro paragraphs={intro} />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          Live cameras near {a.city} airport ({a.iata})
        </h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Every catalogue camera within {a.radiusKm} km of {a.name}, nearest
          first. These are working cameras — mostly {a.topSource.label} feeds on
          the roads the airport depends on
          {onField
            ? ", led by the FAA WeatherCams tower cameras on the airfield itself"
            : ""}
          . Open any card for the live feed.
        </p>
        <DirectoryExplorer
          scopeKey={a.scopeKey}
          scopeLabel={def.label}
          groupBy="none"
          searchPlaceholder={`Search cameras near ${a.city} airport…`}
          explorerId={`airport-${a.iata.toLowerCase()}`}
        />
      </section>

      <SampleGrid
        title={`The nearest cameras to ${a.name}`}
        samples={a.samples.map((s) => ({ name: s.name, city: s.city, id: s.id }))}
      />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          Live flights over {a.city} ({a.iata})
        </h2>
        <div className="space-y-4 text-white/70 leading-relaxed max-w-3xl">
          <p>
            WorldEye&apos;s flight feed tracks live aircraft positions
            worldwide; it does not publish per-airport arrival and departure
            boards, so this page doesn&apos;t invent one. Instead, open the
            live globe centred on {a.name} with the flight layers switched
            on and watch the actual traffic — arrivals lining up on final,
            departures climbing out, each aircraft labelled with its flight
            number, route and aircraft type.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 mt-5">
          <a
            href={airportGlobeUrl(a)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition"
          >
            Watch live flights over {a.iata}
          </a>
          <Link
            href="/live-flight-tracker"
            className="px-5 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 transition"
          >
            Live flight tracker
          </Link>
        </div>
      </section>

      {a.spotting && (
        <section className="mt-12">
          <h2 className="text-xl md:text-2xl font-bold mb-3">
            Plane spotting at {a.city} ({a.iata})
          </h2>
          <p className="text-white/70 leading-relaxed max-w-3xl">{a.spotting}</p>
        </section>
      )}

      <HowTo
        title={`How to use the ${a.iata} cameras`}
        steps={[
          "Start at the top of the wall: cameras are ordered nearest first, so the closest feeds to the terminal come first.",
          "Before driving to the airport, check the freeway and terminal-road cameras — they show the queue itself, not a coloured line's opinion of it.",
          "Open the globe over the airport with the flight layer on (linked above) to watch live arrivals and departures and identify the aircraft.",
          "Use the area cameras for a pre-flight weather check — then confirm with official aviation weather before travelling or flying.",
          "Check a feed's timestamp before trusting it; a frozen frame is a camera having a bad day, not an empty road.",
        ]}
      />

      <FaqSection title={`${a.name} — FAQ`} faqs={faqs} />

      <RelatedLinks title="More airports, more live WorldEye" links={related} />

      <TrialCtaSection utmSource={`airport-webcams-${a.slug}`} />

      <CtaRow backHref="/airport-webcams" backLabel="All airport webcams" />
    </PageShell>
  );
}
