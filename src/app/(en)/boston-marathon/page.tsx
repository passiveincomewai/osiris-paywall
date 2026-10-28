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
  BOSTON_MARATHON,
  daysUntil,
  editionIsLive,
  formatDateLong,
  formatDateShort,
  nextEdition,
} from "@/lib/seasonal-events";
import { buildGeoUrl } from "@/lib/share/links";

export const revalidate = 86400;

const SLUG = "boston-marathon";
const FINISH: GeoAnchor = { lat: 42.35, lng: -71.0756 };

/** The course's eastern half, in running order — where the catalogue
 *  is dense. The start in Hopkinton is included with its own honest
 *  count: the rural miles keep rural camera coverage. */
const COURSE: { name: string; anchor: GeoAnchor }[] = [
  { name: "The start — Hopkinton", anchor: { lat: 42.2287, lng: -71.5226 } },
  { name: "Wellesley — the halfway roar", anchor: { lat: 42.2964, lng: -71.2926 } },
  { name: "Newton — Heartbreak Hill", anchor: { lat: 42.3208, lng: -71.2045 } },
  { name: "Brookline — Beacon Street", anchor: { lat: 42.3318, lng: -71.1212 } },
  { name: "The finish — Copley Square", anchor: FINISH },
];

const edition = nextEdition(BOSTON_MARATHON);
const YEAR = edition?.year;

export async function generateMetadata(): Promise<Metadata> {
  const title = YEAR
    ? `Boston Marathon ${YEAR} — Live Cameras`
    : "Boston Marathon — Live Cameras";
  const description = edition
    ? `The Boston Marathon, ${formatDateLong(edition.start)} — Patriots' Day on the public cameras along the course from Hopkinton to the Copley Square finish. Free on WorldEye, no signup.`
    : "The Boston Marathon on the public cameras along the course — Hopkinton, Wellesley, Heartbreak Hill, Brookline and the Copley Square finish. Free on WorldEye, no signup.";
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/${SLUG}` },
    openGraph: {
      title,
      description:
        "Patriots' Day on the course's own street cameras — Heartbreak Hill, Beacon Street and the Boylston Street finish. Free on WorldEye.",
      url: `/${SLUG}`,
      type: "website",
    },
  };
}

export default async function BostonMarathonPage() {
  const records = await loadCountryChunk("united-states");

  const course = camerasNearAnchors(
    records,
    COURSE.map((c) => ({ anchor: c.anchor, km: 2 })),
  );
  const finish = camerasWithinKm(records, FINISH, 5);
  const metro = camerasWithinKm(records, FINISH, 10);

  const all = new Set<string>();
  for (const c of [...course, ...finish, ...metro]) all.add(c.id);

  const live = edition ? editionIsLive(edition) : false;
  const days = edition ? daysUntil(edition.start, new Date()) : null;
  const globeUrl =
    buildGeoUrl({ lat: FINISH.lat, lng: FINISH.lng, radiusM: 5000 }, "") ?? "/";

  const faqs = [
    {
      q: "When is the Boston Marathon?",
      a: edition
        ? `${formatDateLong(edition.start)}. The marathon is run on Patriots' Day — the third Monday of April, a Massachusetts holiday — every year, so this page rolls forward to the next edition on its own.`
        : "Patriots' Day — the third Monday of April, every year. The race runs from Hopkinton to Copley Square in Boston.",
    },
    {
      q: "Can I follow the race on these cameras?",
      a: "At street level, in the race's eastern half — and the page is plain about where the coverage lives. These are Massachusetts' public street and traffic cameras. Boston's network is dense: the finish on Boylston Street, Brookline's Beacon Street and the Newton hills sit inside real walls of cameras, and the runners pass through the frames as the race flows east. The start in Hopkinton is rural and its wall is correspondingly small — it is included with its true count rather than padded. No camera here tracks an individual runner; the leaders' duel is the broadcast's.",
    },
    {
      q: "What is Heartbreak Hill?",
      a: "The last and most famous of the Newton hills, rising around mile 20 of the course where it climbs past Boston College — the point where the race's early, deceptively downhill miles present their bill. The course wall below carries a Newton anchor for it, and on race morning it is the wall to watch as the field's character changes from racing to enduring.",
    },
    {
      q: "Which cameras are closest to the course?",
      a: `The first wall is every public camera in the directory within 2 km of the five course anchors — Hopkinton, Wellesley, Newton, Brookline and Copley Square: ${course.length} feeds. The finish wall widens to 5 km around Copley, and the third wall takes the Boston field at 10 km.`,
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
      ? `Boston Marathon ${YEAR} — Live Cameras`
      : "Boston Marathon — Live Cameras",
    description:
      "Public cameras along the Boston Marathon course — Hopkinton, Wellesley, Heartbreak Hill, Brookline and the Copley Square finish.",
    url: `${BASE}/${SLUG}`,
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  };

  const eventLd = edition
    ? {
        "@context": "https://schema.org",
        "@type": "Event",
        name: `Boston Marathon ${edition.year}`,
        startDate: edition.start,
        endDate: edition.end,
        location: {
          "@type": "Place",
          name: "Copley Square, Boston",
          geo: { "@type": "GeoCoordinates", latitude: 42.35, longitude: -71.0756 },
        },
        description:
          "The annual Boston Marathon on Patriots' Day — 26.2 miles from Hopkinton to Copley Square, watched here through the public cameras along the course.",
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
          { label: "Boston Marathon" },
        ]}
      />
      <Hero
        h1={
          YEAR ? `Boston Marathon ${YEAR} — Live Cameras` : "Boston Marathon — Live Cameras"
        }
        sub={
          edition
            ? live
              ? `It's Patriots' Day — ${formatDateLong(edition.start)}. Follow the race east on the course's street cameras, Heartbreak Hill to Boylston Street. Free, no signup.`
              : `The next race is ${formatDateLong(edition.start)}${days !== null && days > 0 ? ` — ${days} days out` : ""}. Follow the race east on the course's street cameras, Heartbreak Hill to Boylston Street. Free, no signup.`
            : "Follow the race east on the course's street cameras, Heartbreak Hill to Boylston Street. Free, no signup."
        }
      />
      <StatRow
        stats={[
          {
            value: edition ? formatDateShort(edition.start) : "Third Mon of Apr",
            label: "the next Boston Marathon — Patriots' Day",
          },
          { value: String(course.length), label: "public cameras within 2 km of the course anchors" },
          { value: String(all.size), label: "public cameras across the three views below" },
        ]}
      />
      <Intro
        paragraphs={[
          "The Boston Marathon is the world's oldest annual marathon, run since 1897 on Patriots' Day, and its course is a single eastbound road story: out of Hopkinton at dawn, through the Wellesley scream tunnel at halfway, up the Newton hills to Heartbreak, and down into the roar of Boylston Street at Copley Square. The cameras on this page are Massachusetts' own — the public street and traffic feeds along the course's eastern half, where the state's network is at its densest.",
          "The honest framing, as on every event page here: the coverage follows the cameras, and the cameras live in the east. The finish, Beacon Street and the Brookline stretch carry deep walls; Wellesley and Newton are thinner; Hopkinton's start line is rural and its wall is small, stated in its own count rather than disguised. Along the anchored points the runners pass through real frames — this is the race at street level, the way the towns along Route 135 and Commonwealth Avenue actually see it.",
          "On race morning, move east with the field: the start's wall early, Wellesley at halfway, Heartbreak Hill for the race's turning, and the finish wall from the leaders' arrival to the evening's last medal. The same cameras, the other 364 days, are Boston's ordinary arteries — race day is the one morning the whole road belongs to the runners.",
        ]}
      />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">The course — Hopkinton to Copley Square</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Every public camera in the directory within 2 km of the five course anchors, in
          running order: Hopkinton, Wellesley, Newton&apos;s Heartbreak Hill, Brookline and
          the Copley Square finish. The counts thin westward exactly as the towns do — the
          start&apos;s small wall is the honest picture of a rural start line.
        </p>
        <SkiCameraGrid
          cameras={course}
          initial={12}
          emptyNote="No public cameras in the directory currently cover the marathon course."
        />
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">The finish — Copley Square & Back Bay</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Every public camera within 5 km of Copley Square: Boylston Street&apos;s finish
          chute, the Back Bay grid the crowds fill, and the Charles River crossings the city
          pours over on race day.
        </p>
        <SkiCameraGrid
          cameras={finish}
          initial={12}
          emptyNote="No public cameras in the directory currently cover the finish area."
        />
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">The whole field — 10 km of Boston</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Every public camera within 10 km of Copley Square — the full Patriots&apos; Day
          picture, from the course&apos;s eastern miles to the harbour, on the morning Boston
          closes its centre to everything but runners.
        </p>
        <SkiCameraGrid
          cameras={metro}
          initial={12}
          emptyNote="No public cameras in the directory currently cover Boston."
        />
      </section>

      <AreaTable
        title="The three views — camera counts"
        rows={[
          { name: "The course (five anchors, 2 km each)", count: course.length },
          { name: "The finish (within 5 km of Copley Square)", count: finish.length },
          { name: "The whole field (within 10 km)", count: metro.length },
        ]}
        note="Counts are public cameras in the WorldEye directory per selection; the walls overlap, and the page total counts each camera once."
      />

      <HowTo
        title="How to follow race day on the cameras"
        steps={[
          "Early morning: the course wall at Hopkinton — the start town filling before the waves leave.",
          "Mid-morning: Wellesley's wall — halfway, and the loudest half-mile in marathoning.",
          "Late morning: Heartbreak Hill. Watch the field's rhythm change on the climb; this is where Boston is won and survived.",
          "From the leaders' turn onto Boylston, live on the finish wall — then stay for the hours of finishers behind them.",
          "Spectating in person? The third wall is the traffic check for every road the race has closed around.",
        ]}
      />

      <FaqSection title="Boston Marathon — FAQ" faqs={faqs} />

      <RelatedLinks
        title="Keep exploring"
        links={[
          { label: "Boston & the Charles River on the 3D globe", href: globeUrl },
          { label: "New York City Marathon — live cameras", href: "/nyc-marathon" },
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
          { label: "Rose Parade in Pasadena — live cameras", href: "/rose-parade" },
          { label: "Albuquerque Balloon Fiesta — live cameras", href: "/albuquerque-balloon-fiesta" },
        ]}
      />

      <TrialCtaSection utmSource={SLUG} />

      <CtaRow backHref="/live-events" backLabel="All live events" />
    </PageShell>
  );
}
