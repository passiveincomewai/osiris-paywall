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
  camerasNearAnchors,
  camerasWithinKm,
  type GeoAnchor,
} from "@/lib/event-page-cameras";
import {
  ROSE_PARADE,
  daysUntil,
  editionIsLive,
  formatDateLong,
  formatDateShort,
  nextEdition,
} from "@/lib/seasonal-events";
import { buildGeoUrl } from "@/lib/share/links";

export const revalidate = 86400;

const SLUG = "rose-parade";
const COLORADO_MID: GeoAnchor = { lat: 34.1457, lng: -118.0966 };

/** Colorado Boulevard, west to east: the parade forms up by Orange
 *  Grove, passes the Norton Simon corner and runs the length of the
 *  boulevard to Sierra Madre. */
const ROUTE: { name: string; anchor: GeoAnchor }[] = [
  { name: "Orange Grove — the formation", anchor: { lat: 34.145, lng: -118.155 } },
  { name: "Colorado Boulevard — mid-route", anchor: COLORADO_MID },
  { name: "Sierra Madre Boulevard — the turn", anchor: { lat: 34.1443, lng: -118.052 } },
];

const edition = nextEdition(ROSE_PARADE);
const YEAR = edition?.year;

export async function generateMetadata(): Promise<Metadata> {
  const title = YEAR
    ? `Rose Parade ${YEAR} in Pasadena — Live Cameras`
    : "Rose Parade in Pasadena — Live Cameras";
  const description = edition
    ? `The Rose Parade, ${formatDateLong(edition.start)} — the public cameras along Colorado Boulevard in Pasadena, the street the floats travel on New Year's morning. Free on WorldEye, no signup.`
    : "The Rose Parade on the public cameras along Colorado Boulevard in Pasadena — New Year's morning, the floats' own street. Free on WorldEye, no signup.";
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/${SLUG}` },
    openGraph: {
      title,
      description:
        "Colorado Boulevard on New Year's morning — the parade's street on Pasadena's own public cameras. Free on WorldEye.",
      url: `/${SLUG}`,
      type: "website",
    },
  };
}

export default async function RoseParadePage() {
  const records = await loadCountryChunk("united-states");

  const route = camerasNearAnchors(
    records,
    ROUTE.map((c) => ({ anchor: c.anchor, km: 1.5 })),
  );
  const pasadena = camerasWithinKm(records, COLORADO_MID, 5);
  const metro = camerasWithinKm(records, COLORADO_MID, 10);

  const all = new Set<string>();
  for (const c of [...route, ...pasadena, ...metro]) all.add(c.id);

  const live = edition ? editionIsLive(edition) : false;
  const days = edition ? daysUntil(edition.start, new Date()) : null;
  const globeUrl =
    buildGeoUrl({ lat: COLORADO_MID.lat, lng: COLORADO_MID.lng, radiusM: 5000 }, "") ??
    "/";

  const faqs = [
    {
      q: "When is the Rose Parade?",
      a: edition
        ? `${formatDateLong(edition.start)}. The Tournament of Roses holds the parade on January 1 — with one famous exception kept since 1893: never on a Sunday, when it moves to January 2 so the horses would not be startled outside the boulevard's churches. This page rolls forward to the next edition on its own.`
        : "January 1 — never on a Sunday, when the Tournament's 1893 rule moves it to January 2. The parade runs down Colorado Boulevard in Pasadena on New Year's morning.",
    },
    {
      q: "Can I watch the floats on these cameras?",
      a: "The floats travel at street level down a street these cameras watch — Colorado Boulevard is the parade route, and the public cameras along and around it frame the boulevard itself. What you get is the parade as Pasadena sees it from the kerb: the boulevard closed and lined before dawn, the floats passing the intersections, the street sweepers' famous aftermath. The close-up floral detail — every petal placed by hand — is the broadcast's craft, and this page does not claim it. But the morning itself, in the street it happens on, is here.",
    },
    {
      q: "When do the crowds arrive?",
      a: "The night before. The grandstands fill from the small hours and the kerbs along Colorado Boulevard are claimed with chairs and blankets from New Year's Eve — the route wall below shows the occupation building through the evening, which for many Pasadenans is half the tradition. The parade itself steps off in the morning, at 8 am Pacific.",
    },
    {
      q: "Which cameras are closest to the parade?",
      a: `The first wall is every public camera in the directory within 1.5 km of the three route points — Orange Grove, mid-Colorado and the Sierra Madre turn: ${route.length} feeds. The second wall widens to 5 km of Pasadena, and the third takes the field at 10 km toward the Arroyo and the Rose Bowl.`,
    },
    {
      q: "Are the parade cameras free to watch?",
      a: "Yes. Every camera on this page is a public feed, free to open on WorldEye — no account, no signup.",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: YEAR
      ? `Rose Parade ${YEAR} in Pasadena — Live Cameras`
      : "Rose Parade in Pasadena — Live Cameras",
    description:
      "Public cameras along Colorado Boulevard in Pasadena for the Rose Parade — Orange Grove, mid-route and the Sierra Madre turn.",
    url: `${BASE}/${SLUG}`,
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  };

  const eventLd = edition
    ? {
        "@context": "https://schema.org",
        "@type": "Event",
        name: `Rose Parade ${edition.year}`,
        startDate: edition.start,
        endDate: edition.end,
        location: {
          "@type": "Place",
          name: "Colorado Boulevard, Pasadena",
          geo: { "@type": "GeoCoordinates", latitude: 34.1457, longitude: -118.0966 },
        },
        description:
          "The annual Tournament of Roses Parade — flower-covered floats, marching bands and equestrian units down Colorado Boulevard in Pasadena on New Year's morning, watched here through the public cameras along the boulevard.",
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
          { label: "Rose Parade — Pasadena" },
        ]}
      />
      <Hero
        h1={
          YEAR
            ? `Rose Parade ${YEAR} in Pasadena — Live Cameras`
            : "Rose Parade in Pasadena — Live Cameras"
        }
        sub={
          edition
            ? live
              ? `It's parade morning — ${formatDateLong(edition.start)}. Watch Colorado Boulevard as the floats make their run. Free, no signup.`
              : `The next parade is ${formatDateLong(edition.start)}${days !== null && days > 0 ? ` — ${days} days out` : ""}. Watch Colorado Boulevard on New Year's morning as the floats make their run. Free, no signup.`
            : "Watch Colorado Boulevard on New Year's morning as the floats make their run. Free, no signup."
        }
      />
      <StatRow
        stats={[
          {
            value: edition ? formatDateShort(edition.start) : "Jan 1",
            label: "the next Rose Parade",
          },
          { value: String(route.length), label: "public cameras within 1.5 km of the parade route" },
          { value: String(all.size), label: "public cameras across the three views below" },
        ]}
      />
      <Intro
        paragraphs={[
          "New Year's morning in Pasadena opens with flowers at five miles an hour. The Rose Parade has run since 1890: floats covered entirely in petals, seeds and bark, marching bands from everywhere, and horses down the middle of Colorado Boulevard, before grandstands that fill in the dark and a kerbside crowd that camps overnight for its place. The cameras on this page are Pasadena's own — the public feeds along and around the boulevard the parade travels.",
          "The honest framing, as on every event page here: a traffic camera frames a street, not a flower. The petal-by-petal close work is the television craft. What these cameras hold is the parade's street truth — Colorado Boulevard in its one transformed morning: closed, lined, and carrying the floats past the intersections at walking pace, with the San Gabriels behind. And they hold the night before, when the boulevard fills with chairs, blankets and grandstand crowds while the floats wait in the dark at the formation area.",
          "Come on New Year's Eve for the occupation of the boulevard. On the morning itself, work the route wall west to east as the parade makes its run — and stay after for the sweepers, the departing crowds and Colorado Boulevard becoming an ordinary street again by afternoon.",
        ]}
      />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">The route — Colorado Boulevard</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Every public camera in the directory within 1.5 km of the route&apos;s three defining
          points: Orange Grove, where the parade forms up; mid-Colorado, the grandstand heart
          of the run; and the turn at Sierra Madre Boulevard. These cameras watch the
          boulevard itself — the street the parade travels.
        </p>
        <SkiCameraGrid
          cameras={route}
          initial={12}
          emptyNote="No public cameras in the directory currently cover the parade route."
        />
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">Pasadena — 5 km</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Every public camera within 5 km of mid-route: Old Pasadena, the Arroyo Seco edge
          and the streets that carry a city&apos;s worth of spectators in and out.
        </p>
        <SkiCameraGrid
          cameras={pasadena}
          initial={12}
          emptyNote="No public cameras in the directory currently cover Pasadena."
        />
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">The whole field — 10 km</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Every public camera within 10 km of Colorado Boulevard — the parade, the Rose Bowl
          in the Arroyo (the game follows in the afternoon) and the foothill towns the
          morning&apos;s traffic threads through.
        </p>
        <SkiCameraGrid
          cameras={metro}
          initial={12}
          emptyNote="No public cameras in the directory currently cover the Pasadena area."
        />
      </section>

      <AreaTable
        title="The three views — camera counts"
        rows={[
          { name: "The route (three points, 1.5 km each)", count: route.length },
          { name: "Pasadena (within 5 km)", count: pasadena.length },
          { name: "The whole field (within 10 km)", count: metro.length },
        ]}
        note="Counts are public cameras in the WorldEye directory per selection; the walls overlap, and the page total counts each camera once."
      />

      <HowTo
        title="How to watch parade morning on the cameras"
        steps={[
          "New Year's Eve: open the route wall and watch Colorado Boulevard fill — chairs, blankets and grandstands, the occupation is a tradition of its own.",
          "Before dawn: the boulevard closes and the crowd settles; the formation area by Orange Grove stirs first.",
          "From the 8 am step-off, follow the route wall west to east — the parade takes about two hours to make its run.",
          "After the last float, stay for the sweepers and the great unstacking of the grandstands.",
          "In the afternoon the third wall tells the second story: the Arroyo and the Rose Bowl crowd for the game.",
        ]}
      />

      <FaqSection title="Rose Parade — FAQ" faqs={faqs} />

      <RelatedLinks
        title="Keep exploring"
        links={[
          { label: "Pasadena & Colorado Boulevard on the 3D globe", href: globeUrl },
          { label: "New Year's Eve in Times Square — live cameras", href: "/new-years-eve-times-square" },
          { label: "Live webcams in Los Angeles", href: "/city-webcams/los-angeles" },
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
          { label: "New York City Marathon — live cameras", href: "/nyc-marathon-2026" },
          { label: "Fourth of July fireworks — live cameras", href: "/fourth-of-july-fireworks" },
          { label: "Boston Marathon — live cameras", href: "/boston-marathon" },
          { label: "Albuquerque Balloon Fiesta — live cameras", href: "/albuquerque-balloon-fiesta" },
        ]}
      />

      <TrialCtaSection utmSource={SLUG} />

      <CtaRow backHref="/live-events" backLabel="All live events" />
    </PageShell>
  );
}
