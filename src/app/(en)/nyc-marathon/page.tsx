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
  NYC_MARATHON,
  daysUntil,
  editionIsLive,
  formatDateLong,
  formatDateShort,
  nextEdition,
} from "@/lib/seasonal-events";
import { buildGeoUrl } from "@/lib/share/links";

export const revalidate = 86400;

const SLUG = "nyc-marathon";
const FINISH: GeoAnchor = { lat: 40.7663, lng: -73.9765 };
const COURSE_MID: GeoAnchor = { lat: 40.728, lng: -73.9949 };

/** The course, in running order: the Verrazzano start, Fourth Avenue,
 *  the Queensboro Bridge, Fifth Avenue and the Central Park finish. */
const COURSE: { name: string; anchor: GeoAnchor }[] = [
  { name: "The start — Verrazzano-Narrows Bridge", anchor: { lat: 40.6059, lng: -74.0563 } },
  { name: "Fourth Avenue, Brooklyn", anchor: { lat: 40.652, lng: -74.01 } },
  { name: "Queensboro Bridge", anchor: { lat: 40.757, lng: -73.953 } },
  { name: "Fifth Avenue, Manhattan", anchor: { lat: 40.795, lng: -73.956 } },
  { name: "The finish — Central Park", anchor: FINISH },
];

const edition = nextEdition(NYC_MARATHON);
const YEAR = edition?.year;

export async function generateMetadata(): Promise<Metadata> {
  const title = YEAR
    ? `New York City Marathon ${YEAR} — Live Cameras`
    : "New York City Marathon — Live Cameras";
  const description = edition
    ? `The New York City Marathon, ${formatDateLong(edition.start)} — the public cameras along the course through all five boroughs, from the Verrazzano start to the Central Park finish. Free on WorldEye, no signup.`
    : "The New York City Marathon on the public cameras along the course — the Verrazzano start, Fourth Avenue, the Queensboro Bridge, Fifth Avenue and the Central Park finish. Free on WorldEye, no signup.";
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/${SLUG}` },
    openGraph: {
      title,
      description:
        "The marathon course on the city's own street cameras — follow the race borough by borough, start to finish. Free on WorldEye.",
      url: `/${SLUG}`,
      type: "website",
    },
  };
}

export default async function NycMarathonPage() {
  const records = await loadCountryChunk("united-states");

  const course = camerasNearAnchors(
    records,
    COURSE.map((c) => ({ anchor: c.anchor, km: 2 })),
  );
  const finish = camerasWithinKm(records, FINISH, 5);
  const metro = camerasWithinKm(records, COURSE_MID, 15);

  const all = new Set<string>();
  for (const c of [...course, ...finish, ...metro]) all.add(c.id);

  const live = edition ? editionIsLive(edition) : false;
  const days = edition ? daysUntil(edition.start, new Date()) : null;
  const globeUrl =
    buildGeoUrl({ lat: FINISH.lat, lng: FINISH.lng, radiusM: 5000 }, "") ?? "/";

  const faqs = [
    {
      q: "When is the New York City Marathon?",
      a: edition
        ? `${formatDateLong(edition.start)}. The marathon is held on the first Sunday of November every year — a date fixed by the calendar, so this page rolls forward to the next edition on its own.`
        : "The first Sunday of November, every year — the race runs from Staten Island through all five boroughs to the finish in Central Park.",
    },
    {
      q: "Can I follow the race on these cameras?",
      a: "At street level, yes — and that is the honest scope of it. These are New York's public street and traffic cameras, and the course runs straight down the streets they watch: Fourth Avenue in Brooklyn, the Queensboro Bridge, First and Fifth Avenues, Central Park. Runners pass through the frames as the race flows past each point. What the cameras cannot do is follow one runner — there is no tracking here, and the leaders' helicopter view is the broadcast's. Think of it as standing on the barrier at five corners of the course at once.",
    },
    {
      q: "Where does the race go?",
      a: "It starts on Staten Island and crosses the Verrazzano-Narrows Bridge into Brooklyn, runs the length of Fourth Avenue and through Williamsburg into Queens, crosses the Queensboro Bridge into Manhattan, touches the Bronx, and comes back down Fifth Avenue to the finish in Central Park by Tavern on the Green. The course wall below is anchored on five of those points in running order, so you can follow the race's geography as the morning unfolds.",
    },
    {
      q: "Which cameras are closest to the course?",
      a: `The first wall is every public camera in the directory within 2 km of the five course anchors — the start, Fourth Avenue, the Queensboro Bridge, Fifth Avenue and the finish: ${course.length} feeds. The second wall covers the finish area at 5 km, and the third takes the whole course's field at 15 km.`,
    },
    {
      q: "Are the marathon cameras free to watch?",
      a: "Yes. Every camera on this page is a public feed, free to open on WorldEye — no account, no signup.",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: YEAR
      ? `New York City Marathon ${YEAR} — Live Cameras`
      : "New York City Marathon — Live Cameras",
    description:
      "Public cameras along the New York City Marathon course — the Verrazzano start, Fourth Avenue, the Queensboro Bridge, Fifth Avenue and the Central Park finish.",
    url: `${BASE}/${SLUG}`,
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  };

  const eventLd = edition
    ? {
        "@context": "https://schema.org",
        "@type": "Event",
        name: `New York City Marathon ${edition.year}`,
        startDate: edition.start,
        endDate: edition.end,
        location: {
          "@type": "Place",
          name: "Central Park, New York City",
          geo: { "@type": "GeoCoordinates", latitude: 40.7663, longitude: -73.9765 },
        },
        description:
          "The annual New York City Marathon — 26.2 miles through all five boroughs from the Verrazzano-Narrows Bridge to Central Park, watched here through the public cameras along the course.",
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
          { label: "New York City Marathon" },
        ]}
      />
      <Hero
        h1={
          YEAR
            ? `New York City Marathon ${YEAR} — Live Cameras`
            : "New York City Marathon — Live Cameras"
        }
        sub={
          edition
            ? live
              ? `It's race day — ${formatDateLong(edition.start)}. Follow the course borough by borough on the city's street cameras, from the Verrazzano to Central Park. Free, no signup.`
              : `The next race is ${formatDateLong(edition.start)}${days !== null && days > 0 ? ` — ${days} days out` : ""}. Follow the course borough by borough on the city's street cameras, from the Verrazzano to Central Park. Free, no signup.`
            : "Follow the course borough by borough on the city's street cameras, from the Verrazzano to Central Park. Free, no signup."
        }
      />
      <StatRow
        stats={[
          {
            value: edition ? formatDateShort(edition.start) : "First Sun of Nov",
            label: "the next New York City Marathon",
          },
          { value: String(course.length), label: "public cameras within 2 km of the course anchors" },
          { value: String(all.size), label: "public cameras across the three views below" },
        ]}
      />
      <Intro
        paragraphs={[
          "The New York City Marathon is the largest marathon on Earth, and it is run entirely on streets this page watches. Fifty thousand runners cross the Verrazzano-Narrows Bridge out of Staten Island, pour down Fourth Avenue in Brooklyn, thread Queens, cross the Queensboro Bridge, brush the Bronx and come home down Fifth Avenue into Central Park — while a million spectators line the route and the city closes itself around the race. The cameras here are New York's own public street and traffic feeds, gathered along the course.",
          "The honest framing, as on every event page here: these are street cameras, not race coverage. They will not track your runner or call the leaders' duel — that is the broadcast's job. What they do is put you on the barrier at five corners of the course at once: watch the start's bridge empty as the waves leave, Fourth Avenue fill into a river of runners by mid-morning, the Queensboro carry the race into Manhattan, and the finish in Central Park run from the elites' sprint to the floodlit last finishers.",
          "On race morning, start with the course wall and move south to north in running order as the leaders progress; by afternoon the finish wall is the story. Any other day of the year, the same walls are the ordinary city — which is its own way of seeing how completely the race takes New York over.",
        ]}
      />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">The course — start to finish</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Every public camera in the directory within 2 km of the five course anchors, in
          running order: the Verrazzano start, Fourth Avenue in Brooklyn, the Queensboro
          Bridge, Fifth Avenue and the Central Park finish. The race runs down these streets;
          the cameras watch them year-round.
        </p>
        <SkiCameraGrid
          cameras={course}
          initial={12}
          emptyNote="No public cameras in the directory currently cover the marathon course."
        />
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">The finish — Central Park & the Upper West Side</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Every public camera within 5 km of the finish in Central Park: the park&apos;s
          southern end, Columbus Circle and the avenues the finishers and their families pour
          into afterwards.
        </p>
        <SkiCameraGrid
          cameras={finish}
          initial={12}
          emptyNote="No public cameras in the directory currently cover the finish area."
        />
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">The whole field — the five boroughs&apos; course</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Every public camera within 15 km of the course&apos;s midpoint — race day&apos;s
          full geography, from the Staten Island shore to the Bronx, and the ordinary city
          flowing around the closed course.
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
          { name: "The course (five anchors, 2 km each)", count: course.length },
          { name: "The finish (within 5 km of Central Park)", count: finish.length },
          { name: "The whole field (within 15 km)", count: metro.length },
        ]}
        note="Counts are public cameras in the WorldEye directory per selection; the walls overlap, and the page total counts each camera once."
      />

      <HowTo
        title="How to follow race day on the cameras"
        steps={[
          "Morning: open the course wall at the start — the Verrazzano fills with the waves and empties as the race leaves Staten Island.",
          "Mid-morning: Fourth Avenue is the spectacle — a solid river of runners the length of Brooklyn.",
          "Late morning: the Queensboro Bridge carries the field into Manhattan; the leaders reach Fifth Avenue and turn for the park.",
          "Afternoon: live on the finish wall — the finish runs for hours, and the light going down over the last finishers is the race's best hour.",
          "Driving in the city on race day? The third wall is the practical one — check which crossings and avenues are flowing before you commit.",
        ]}
      />

      <FaqSection title="New York City Marathon — FAQ" faqs={faqs} />

      <RelatedLinks
        title="Keep exploring"
        links={[
          { label: "Live webcams in New York City", href: "/city-webcams/new-york-city" },
          { label: "Central Park & the finish on the 3D globe", href: globeUrl },
          { label: "The 2026 race — the dated edition page", href: "/nyc-marathon-2026" },
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
