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
  NEW_YEARS_EVE,
  daysUntil,
  editionIsLive,
  formatDateLong,
  formatDateShort,
  nextEdition,
} from "@/lib/seasonal-events";
import { buildGeoUrl } from "@/lib/share/links";

export const revalidate = 86400;

const SLUG = "new-years-eve-times-square";
const TIMES_SQUARE: GeoAnchor = { lat: 40.758, lng: -73.9855 };

const CROSSINGS: { name: string; anchor: GeoAnchor }[] = [
  { name: "George Washington Bridge", anchor: { lat: 40.851, lng: -73.958 } },
  { name: "Lincoln Tunnel approaches", anchor: { lat: 40.771, lng: -74.021 } },
  { name: "Holland Tunnel approaches", anchor: { lat: 40.727, lng: -74.011 } },
  { name: "Queensboro Bridge", anchor: { lat: 40.757, lng: -73.953 } },
  { name: "Brooklyn Bridge", anchor: { lat: 40.707, lng: -73.996 } },
  { name: "Williamsburg Bridge", anchor: { lat: 40.713, lng: -73.972 } },
];

const edition = nextEdition(NEW_YEARS_EVE);
const YEAR = edition?.year;

export async function generateMetadata(): Promise<Metadata> {
  const title = YEAR
    ? `New Year's Eve in Times Square ${YEAR} — Live Cameras`
    : "New Year's Eve in Times Square — Live Cameras";
  const description = edition
    ? `New Year's Eve at Times Square, ${formatDateLong(edition.start)} — the public cameras around Midtown, the West Side and the crossings into Manhattan as the city counts down. Free on WorldEye, no signup.`
    : "New Year's Eve at Times Square — the public cameras around Midtown, the West Side and the crossings into Manhattan as the city counts down. Free on WorldEye, no signup.";
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/${SLUG}` },
    openGraph: {
      title,
      description:
        "Public cameras around Midtown and the river crossings on New Year's Eve — the build-up, the midnight hour and the getaway. Free on WorldEye.",
      url: `/${SLUG}`,
      type: "website",
    },
  };
}

export default async function NewYearsEveTimesSquarePage() {
  const records = await loadCountryChunk("united-states");

  const near = camerasWithinKm(records, TIMES_SQUARE, 5);
  const crossings = camerasNearAnchors(
    records,
    CROSSINGS.map((c) => ({ anchor: c.anchor, km: 2 })),
  );
  const metro = camerasWithinKm(records, TIMES_SQUARE, 10);

  const all = new Set<string>();
  for (const c of [...near, ...crossings, ...metro]) all.add(c.id);

  const live = edition ? editionIsLive(edition) : false;
  const days = edition ? daysUntil(edition.start, new Date()) : null;
  const globeUrl =
    buildGeoUrl({ lat: TIMES_SQUARE.lat, lng: TIMES_SQUARE.lng, radiusM: 5000 }, "") ??
    "/";

  const faqs = [
    {
      q: "When is New Year's Eve in Times Square?",
      a: edition
        ? `${formatDateLong(edition.start)}. The evening's programme in the Square builds from late afternoon: the ball is raised up the flagpole on One Times Square at 6 pm, and at 11:59 pm it begins its one-minute descent, reaching the bottom as the new year arrives and the confetti comes down. The date never moves — December 31, every year — so this page rolls forward to the next edition on its own.`
        : "December 31, every year — the date never moves. The evening's programme in the Square builds from late afternoon: the ball is raised up the flagpole on One Times Square at 6 pm, and at 11:59 pm it begins its one-minute descent into the new year.",
    },
    {
      q: "Can I watch the ball drop on these cameras?",
      a: "Not the drop itself — and this page says so plainly. No public camera in the WorldEye directory looks into Times Square; the Square's famous view belongs to the broadcast. What is here is the city's own camera network around the night: New York's public street and traffic feeds across Midtown, along the West Side, and at the bridges and tunnels. They show New Year's Eve the way the city lives it — the avenues filling, the closures, the midnight surge and the getaway — rather than the sixty seconds on television.",
    },
    {
      q: "Which cameras are closest to Times Square?",
      a: `The first wall below is every public camera in the directory within 5 km of Times Square — ${near.length} feeds, mostly the West Side Highway and Henry Hudson Parkway corridor west of the theatre district and the avenues feeding Midtown. Midtown's cameras watch the streets around the celebration rather than the fenced pens inside it.`,
    },
    {
      q: "When is the best time to watch?",
      a: "From about 6 pm Eastern, when the ball goes up and the evening crowd settles in, through the midnight hour itself. After midnight the story flips to the crossings wall: a million people leaving one neighbourhood at once is one of the great traffic spectacles of the American year, and the bridges and tunnels show it in real time.",
    },
    {
      q: "Are the New Year's Eve cameras free to watch?",
      a: "Yes. Every camera on this page is a public feed, free to open on WorldEye — no account, no signup.",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: YEAR
      ? `New Year's Eve in Times Square ${YEAR} — Live Cameras`
      : "New Year's Eve in Times Square — Live Cameras",
    description:
      "Public cameras around Times Square, Midtown and the crossings into Manhattan on New Year's Eve.",
    url: `${BASE}/${SLUG}`,
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  };

  const eventLd = edition
    ? {
        "@context": "https://schema.org",
        "@type": "Event",
        name: `New Year's Eve in Times Square ${edition.year}`,
        startDate: edition.start,
        endDate: edition.end,
        location: {
          "@type": "Place",
          name: "Times Square, New York City",
          geo: { "@type": "GeoCoordinates", latitude: 40.758, longitude: -73.9855 },
        },
        description:
          "The annual New Year's Eve celebration in Times Square, New York City — the ball drop at midnight, watched here through the public cameras around Midtown and the river crossings.",
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
          { label: "New Year's Eve — Times Square" },
        ]}
      />
      <Hero
        h1={
          YEAR
            ? `New Year's Eve in Times Square ${YEAR} — Live Cameras`
            : "New Year's Eve in Times Square — Live Cameras"
        }
        sub={
          edition
            ? live
              ? `Tonight's the night — ${formatDateLong(edition.start)}. Watch Midtown, the West Side and the crossings into Manhattan as the countdown runs. Free, no signup.`
              : `The next edition is ${formatDateLong(edition.start)}${days !== null && days > 0 ? ` — ${days} days out` : ""}. Watch Midtown, the West Side and the crossings into Manhattan as the city counts down. Free, no signup.`
            : "Watch Midtown, the West Side and the crossings into Manhattan as the city counts down to midnight. Free, no signup."
        }
      />
      <StatRow
        stats={[
          {
            value: edition ? formatDateShort(edition.start) : "Dec 31",
            label: "New Year's Eve in Times Square",
          },
          { value: String(near.length), label: "public cameras within 5 km of Times Square" },
          { value: String(all.size), label: "public cameras across the three views below" },
        ]}
      />
      <Intro
        paragraphs={[
          "Times Square on December 31 is the world's best-known street party: a million people in the pens along Broadway and Seventh Avenue, the ball on its pole above One Times Square, and a minute to midnight that the whole planet watches. The cameras on this page are New York's own — the public street and traffic feeds that watch Midtown every day of the year, gathered here for the one night they were unknowingly built for.",
          "The honest framing, as on every event page here: no public camera in the directory looks into the Square itself, so the drop is the broadcast's view, not this page's. What these cameras show instead is the city around the celebration — the West Side Highway corridor and the Midtown avenues in the first wall, the bridges and tunnels in the second, and the whole 10 km field in the third. It is New Year's Eve at street level: the build-up, the closures, the surge at midnight and the great exodus after.",
          "Start in the early evening with the Midtown wall as the pens fill, keep the crossings open if you are driving in (Midtown closes to traffic early and completely), and after midnight watch the getaway — the bridges and tunnels draining a million people out of a few city blocks is a show of its own.",
        ]}
      />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">Around the Square — Midtown & the West Side</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Every public camera in the directory within 5 km of Times Square, nearest first. The
          coverage leans west — the West Side Highway and Henry Hudson Parkway corridors and the
          avenues feeding them — because that is where New York points its public cameras. Nothing
          here is inside the Square; these are the streets the celebration spills across.
        </p>
        <SkiCameraGrid
          cameras={near}
          initial={12}
          emptyNote="No public cameras in the directory currently cover Midtown Manhattan."
        />
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">Getting there — bridges & tunnels</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          The public cameras within 2 km of the six crossings most of the city uses on New
          Year&apos;s Eve — the George Washington Bridge, the Lincoln and Holland Tunnels, and the
          Queensboro, Brooklyn and Williamsburg Bridges. Check them before you leave, and again
          after midnight for the trip home.
        </p>
        <SkiCameraGrid
          cameras={crossings}
          initial={12}
          emptyNote="No public cameras in the directory currently cover the Manhattan crossings."
        />
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">The whole field — 10 km of New York</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Every public camera within 10 km of Times Square: Midtown and the West Side, the East
          River crossings, the parkways up and down Manhattan. The fullest picture of the
          city&apos;s biggest night, at the scale the night actually happens.
        </p>
        <SkiCameraGrid
          cameras={metro}
          initial={12}
          emptyNote="No public cameras in the directory currently cover New York City."
        />
      </section>

      <AreaTable
        title="The three views — camera counts"
        rows={[
          { name: "Around the Square (within 5 km)", count: near.length },
          { name: "Bridges & tunnels (six crossings, 2 km each)", count: crossings.length },
          { name: "The whole field (within 10 km)", count: metro.length },
        ]}
        note="Counts are public cameras in the WorldEye directory per selection; the walls overlap, and the page total counts each camera once."
      />

      <HowTo
        title="How to watch New Year's Eve on the cameras"
        steps={[
          "Early evening: open the Midtown wall and watch the avenues around the theatre district fill as the pens close and the programme starts.",
          "Around 6 pm Eastern the ball is raised over One Times Square — the broadcast moment, but the street cameras show the crowd reaction spreading down the avenues.",
          "Driving in or out? The crossings wall is the practical one: check the bridges and tunnels before you commit to a route.",
          "At midnight, keep the Midtown wall open — the surge, the confetti weather and the first movement of a million people is the street-level version of the drop.",
          "After midnight, the crossings tell the rest of the story: the getaway, live.",
        ]}
      />

      <FaqSection title="New Year's Eve in Times Square — FAQ" faqs={faqs} />

      <RelatedLinks
        title="Keep exploring"
        links={[
          { label: "Live webcams in New York City", href: "/city-webcams/new-york-city" },
          { label: "Times Square & Midtown on the 3D globe", href: globeUrl },
          { label: "Macy's Thanksgiving Day Parade — live cameras", href: "/macys-thanksgiving-parade" },
          { label: "United States cameras", href: "/cameras/countries/united-states" },
          { label: "All live events", href: "/live-events" },
        ]}
      />

      <RelatedLinks
        title="The annual calendar"
        links={[
          { label: "Mardi Gras in New Orleans — live cameras", href: "/mardi-gras-new-orleans" },
          { label: "Cherry blossoms in Washington DC", href: "/cherry-blossoms-washington-dc" },
          { label: "Oktoberfest in Munich — live cameras", href: "/oktoberfest-munich" },
          { label: "Fall foliage cameras", href: "/fall-foliage-cameras" },
                  { label: "Macy's Thanksgiving Day Parade — live cameras", href: "/macys-thanksgiving-parade" },
          { label: "New York City Marathon — live cameras", href: "/nyc-marathon-2026" },
          { label: "Fourth of July fireworks — live cameras", href: "/fourth-of-july-fireworks" },
          { label: "Boston Marathon — live cameras", href: "/boston-marathon" },
          { label: "Rose Parade in Pasadena — live cameras", href: "/rose-parade" },
          { label: "Albuquerque Balloon Fiesta — live cameras", href: "/albuquerque-balloon-fiesta" },
]}
      />

      <TrialCtaSection utmSource={SLUG} />

      <CtaRow backHref="/live-events" backLabel="All live events" />
    </PageShell>
  );
}
