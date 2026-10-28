import type { Metadata } from "next";
import {
  BASE,
  JsonLd,
  Breadcrumb,
  Hero,
  StatRow,
  Intro,
  AreaTable,
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
import {
  camerasWithinKm,
  distanceKm,
  type GeoAnchor,
} from "@/lib/event-page-cameras";
import {
  BALLOON_FIESTA,
  daysUntil,
  editionIsLive,
  formatDateLong,
  formatRange,
  nextEdition,
} from "@/lib/seasonal-events";
import { buildGeoUrl } from "@/lib/share/links";

export const revalidate = 86400;

const SLUG = "albuquerque-balloon-fiesta";
const PARK: GeoAnchor = { lat: 35.2349, lng: -106.5987 };
const DOWNTOWN: GeoAnchor = { lat: 35.0844, lng: -106.6504 };

const edition = nextEdition(BALLOON_FIESTA);
const YEAR = edition?.year;

export async function generateMetadata(): Promise<Metadata> {
  const title = YEAR
    ? `Albuquerque Balloon Fiesta ${YEAR} — Live Cameras`
    : "Albuquerque Balloon Fiesta — Live Cameras";
  const description = edition
    ? `The Albuquerque International Balloon Fiesta, ${formatRange(edition)} — the public cameras of the city the balloons rise over, from the pre-dawn park traffic to the evening glows. Free on WorldEye, no signup.`
    : "The Albuquerque International Balloon Fiesta on the public cameras of the city it flies over — the pre-dawn traffic, the mass ascensions' city and the evening glows. Free on WorldEye, no signup.";
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/${SLUG}` },
    openGraph: {
      title,
      description:
        "Fiesta week in Albuquerque on the city's own cameras — the 4 am traffic, the skyline the balloons climb over and the glows after dark. Free on WorldEye.",
      url: `/${SLUG}`,
      type: "website",
    },
  };
}

export default async function AlbuquerqueBalloonFiestaPage() {
  const records = await loadCountryChunk("united-states");

  const nearPark = camerasWithinKm(records, PARK, 10);
  const downtown = camerasWithinKm(records, DOWNTOWN, 10);
  const metro = camerasWithinKm(records, PARK, 25);

  // The honesty number: how close the directory actually gets to the park.
  let nearestKm = Infinity;
  for (const c of records) {
    const d = distanceKm(c, PARK);
    if (d < nearestKm) nearestKm = d;
  }

  const all = new Set<string>();
  for (const c of [...nearPark, ...downtown, ...metro]) all.add(c.id);

  const live = edition ? editionIsLive(edition) : false;
  const days = edition ? daysUntil(edition.start, new Date()) : null;
  const globeUrl =
    buildGeoUrl({ lat: PARK.lat, lng: PARK.lng, radiusM: 10000 }, "") ?? "/";

  const faqs = [
    {
      q: "When is the Albuquerque Balloon Fiesta?",
      a: edition
        ? `${formatRange(edition)} — nine days from the first Saturday of October. The dates on this page are the organiser's published dates; the Fiesta announces them well ahead, and when a new edition is published this page's table gains a row.`
        : "Nine days from the first Saturday of October, every year. The dates on this page are the organiser's published dates, added as they are announced.",
    },
    {
      q: "Can I watch the balloons on these cameras?",
      a: `Not from inside the park — and this page states it as plainly as it can: no public camera in the WorldEye directory stands in Balloon Fiesta Park, and the nearest is ${nearestKm.toFixed(1)} km away. These are Albuquerque's public city and highway cameras. What they show is the fiesta as the city lives it: the pre-dawn traffic streaming north to the park from 4 am, the corridors under a sky that — on a mass ascension morning, with several hundred balloons climbing over the whole northern city — is rarely empty of balloons for long, and the evening glow traffic coming home. The balloons' own close view belongs to the Fiesta's broadcast; the city's week belongs to these cameras.`,
    },
    {
      q: "What is a mass ascension?",
      a: "The fiesta's signature: on the flying mornings — the Saturdays, Sundays and Wednesday of the nine days — the entire field launches in two waves from about 7 am, several hundred balloons climbing at once over northern Albuquerque. Dawn Patrol goes up before them, in the dark, to taste the wind. Weather decides everything: a morning can be called for wind at the last minute, which is part of why the city cameras matter — the park traffic tells you a session is on before the sky does.",
    },
    {
      q: "Which cameras are closest to the fiesta?",
      a: `The first wall is every public camera in the directory within 10 km of Balloon Fiesta Park — ${nearPark.length} feeds along the Alameda and I-25 corridors the crowds drive. The second wall covers downtown Albuquerque at 10 km, and the third takes the whole metro field at 25 km from the park.`,
    },
    {
      q: "Are the fiesta cameras free to watch?",
      a: "Yes. Every camera on this page is a public feed, free to open on WorldEye — no account, no signup.",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: YEAR
      ? `Albuquerque Balloon Fiesta ${YEAR} — Live Cameras`
      : "Albuquerque Balloon Fiesta — Live Cameras",
    description:
      "Public cameras in Albuquerque for Balloon Fiesta week — the corridors to Balloon Fiesta Park, downtown and the metro the balloons rise over.",
    url: `${BASE}/${SLUG}`,
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  };

  const eventLd = edition
    ? {
        "@context": "https://schema.org",
        "@type": "Event",
        name: `Albuquerque International Balloon Fiesta ${edition.year}`,
        startDate: edition.start,
        endDate: edition.end,
        location: {
          "@type": "Place",
          name: "Balloon Fiesta Park, Albuquerque",
          geo: { "@type": "GeoCoordinates", latitude: 35.2349, longitude: -106.5987 },
        },
        description:
          "The annual Albuquerque International Balloon Fiesta — nine days of mass ascensions and balloon glows at Balloon Fiesta Park, watched here through the public cameras of the city around it.",
      }
    : null;

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      {eventLd && <JsonLd data={eventLd} />}
      <FaqJsonLd faqs={faqs} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live events", href: "/live-events" },
          { label: "Albuquerque Balloon Fiesta" },
        ]}
      />
      <Hero
        h1={
          YEAR
            ? `Albuquerque Balloon Fiesta ${YEAR} — Live Cameras`
            : "Albuquerque Balloon Fiesta — Live Cameras"
        }
        sub={
          edition
            ? live
              ? `The fiesta is on — ${formatRange(edition)}. Watch the city under the balloons: the pre-dawn run to the park, the corridors, the glows. Free, no signup.`
              : `The next fiesta runs ${formatRange(edition)}${days !== null && days > 0 ? ` — ${days} days out` : ""}. Watch the city under the balloons: the pre-dawn run to the park, the corridors, the glows. Free, no signup.`
            : "Watch the city under the balloons: the pre-dawn run to the park, the corridors, the glows. Free, no signup."
        }
      />
      <StatRow
        stats={[
          {
            value: edition ? formatRange(edition) : "Early Oct",
            label: "the next Albuquerque Balloon Fiesta",
          },
          { value: String(nearPark.length), label: "public cameras within 10 km of Balloon Fiesta Park" },
          { value: `${nearestKm.toFixed(1)} km`, label: "the nearest public camera to the park itself — stated, not hidden" },
        ]}
      />
      <Intro
        paragraphs={[
          "For nine mornings every October, Albuquerque wakes before dawn and drives north in the dark — because at sunrise, several hundred hot-air balloons are going to climb out of Balloon Fiesta Park at once, in the largest balloon gathering on Earth. The fiesta is the city's defining week, and the cameras on this page are the city's own: the public feeds along the Alameda and I-25 corridors, in downtown, and across the metro the balloons rise over.",
          `The honest framing comes first here, as on every event page: no public camera in the directory stands in the park itself — the nearest is ${nearestKm.toFixed(1)} km away — so the launch field's close view is the Fiesta's own broadcast, not this page's. What the city's cameras hold is the week around the balloons: gates opening at 4:30 am and the traffic arriving in the dark, Dawn Patrol mornings when the corridors are already full before the sun is, the whole northern city under a decorated sky, and the glow nights sending everyone home through lit streets.`,
          "Use the first wall as the fiesta's pulse: if the park corridors are streaming at 5 am, a session is on. Keep the metro wall for the ascension hours — a mass ascension spreads balloons across the entire valley, and the city's wide frames are where that scale shows.",
        ]}
      />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">Around the park — the Alameda & I-25 corridors</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Every public camera in the directory within 10 km of Balloon Fiesta Park — the
          corridors the city drives to the field, full from 4 am on flying mornings. No
          camera stands in the park; these are the roads to it, and they are the fiesta&apos;s
          earliest signal.
        </p>
        <SkiCameraGrid
          cameras={nearPark}
          initial={12}
          emptyNote="No public cameras in the directory currently cover the Balloon Fiesta Park area."
        />
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">Downtown Albuquerque — 10 km</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Every public camera within 10 km of downtown: the city centre under fiesta week —
          the hotels full, the old town busy, and balloons drifting the valley on the morning
          wind.
        </p>
        <SkiCameraGrid
          cameras={downtown}
          initial={12}
          emptyNote="No public cameras in the directory currently cover downtown Albuquerque."
        />
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">The whole field — 25 km of the valley</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Every public camera within 25 km of the park: the full Rio Grande valley picture,
          from the Sandia foothills to Rio Rancho — the airspace a mass ascension decorates,
          at the scale it decorates it.
        </p>
        <SkiCameraGrid
          cameras={metro}
          initial={12}
          emptyNote="No public cameras in the directory currently cover the Albuquerque metro."
        />
      </section>

      <AreaTable
        title="The three views — camera counts"
        rows={[
          { name: "Around the park (within 10 km)", count: nearPark.length },
          { name: "Downtown Albuquerque (within 10 km)", count: downtown.length },
          { name: "The whole field (within 25 km of the park)", count: metro.length },
        ]}
        note="Counts are public cameras in the WorldEye directory per selection; the walls overlap, and the page total counts each camera once."
      />

      <HowTo
        title="How to watch fiesta week on the cameras"
        steps={[
          "From 4 am on a flying morning, open the park wall: the corridors streaming north in the dark are the fiesta starting.",
          "Around 7 am, switch to the metro wall — a mass ascension fills the whole valley sky, and the wide frames carry it.",
          "A still corridor at 5 am tells its own story: wind has likely called the morning — check before you drive.",
          "On glow nights, the downtown and corridor walls show the field lit after dark and the drive home after.",
          "Between sessions, the same walls are Albuquerque as it is the rest of the year — high desert light and the Sandias turning pink at dusk.",
        ]}
      />

      <FaqSection title="Albuquerque Balloon Fiesta — FAQ" faqs={faqs} />

      <RelatedLinks
        title="Keep exploring"
        links={[
          { label: "Balloon Fiesta Park & the valley on the 3D globe", href: globeUrl },
          { label: "Oktoberfest in Munich — live cameras", href: "/oktoberfest-munich" },
          { label: "United States cameras", href: "/cameras/countries/united-states" },
          { label: "All live events", href: "/live-events" },
        ]}
      />

      <RelatedLinks
        title="The annual calendar"
        links={[
          { label: "New Year's Eve in Times Square — live cameras", href: "/new-years-eve-times-square" },
          { label: "Mardi Gras in New Orleans — live cameras", href: "/mardi-gras-new-orleans" },
          { label: "Cherry blossoms in Washington DC", href: "/cherry-blossoms-washington-dc" },
          { label: "Oktoberfest in Munich — live cameras", href: "/oktoberfest-munich" },
          { label: "Fall foliage cameras", href: "/fall-foliage-cameras" },
          { label: "Macy's Thanksgiving Day Parade — live cameras", href: "/macys-thanksgiving-parade" },
          { label: "New York City Marathon — live cameras", href: "/nyc-marathon" },
          { label: "Fourth of July fireworks — live cameras", href: "/fourth-of-july-fireworks" },
          { label: "Boston Marathon — live cameras", href: "/boston-marathon" },
          { label: "Rose Parade in Pasadena — live cameras", href: "/rose-parade" },
        ]}
      />

      <TrialCtaSection utmSource={SLUG} />

      <CtaRow backHref="/live-events" backLabel="All live events" />
    </PageShell>
  );
}
