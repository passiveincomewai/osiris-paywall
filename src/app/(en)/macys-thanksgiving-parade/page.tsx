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
  MACYS_PARADE,
  daysUntil,
  editionIsLive,
  formatDateLong,
  formatDateShort,
  nextEdition,
} from "@/lib/seasonal-events";
import { buildGeoUrl } from "@/lib/share/links";

export const revalidate = 86400;

const SLUG = "macys-thanksgiving-parade";
const HERALD_SQUARE: GeoAnchor = { lat: 40.7494, lng: -73.9879 };

/** The route, north to south: the balloons step off on Central Park
 *  West by the American Museum of Natural History, turn at Columbus
 *  Circle, and come down Sixth Avenue to Herald Square. */
const ROUTE: { name: string; anchor: GeoAnchor }[] = [
  { name: "Central Park West — the step-off", anchor: { lat: 40.7812, lng: -73.971 } },
  { name: "Columbus Circle", anchor: { lat: 40.7681, lng: -73.9819 } },
  { name: "Sixth Avenue", anchor: { lat: 40.7549, lng: -73.987 } },
  { name: "Herald Square — the finish", anchor: HERALD_SQUARE },
];

const edition = nextEdition(MACYS_PARADE);
const YEAR = edition?.year;

export async function generateMetadata(): Promise<Metadata> {
  const title = YEAR
    ? `Macy's Thanksgiving Day Parade ${YEAR} — Live Cameras`
    : "Macy's Thanksgiving Day Parade — Live Cameras";
  const description = edition
    ? `The Macy's Thanksgiving Day Parade, ${formatDateLong(edition.start)} — the public cameras along Central Park West, Columbus Circle and Sixth Avenue to Herald Square, plus the balloon-inflation night before. Free on WorldEye, no signup.`
    : "The Macy's Thanksgiving Day Parade on the public cameras along its route — Central Park West, Columbus Circle and Sixth Avenue to Herald Square, plus the balloon-inflation night before. Free on WorldEye, no signup.";
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/${SLUG}` },
    openGraph: {
      title,
      description:
        "The parade route on New York's own street cameras — the inflation night, the step-off, and Sixth Avenue down to Herald Square. Free on WorldEye.",
      url: `/${SLUG}`,
      type: "website",
    },
  };
}

export default async function MacysThanksgivingParadePage() {
  const records = await loadCountryChunk("united-states");

  const route = camerasNearAnchors(
    records,
    ROUTE.map((c) => ({ anchor: c.anchor, km: 2 })),
  );
  const midtown = camerasWithinKm(records, HERALD_SQUARE, 5);
  const metro = camerasWithinKm(records, HERALD_SQUARE, 10);

  const all = new Set<string>();
  for (const c of [...route, ...midtown, ...metro]) all.add(c.id);

  const live = edition ? editionIsLive(edition) : false;
  const days = edition ? daysUntil(edition.start, new Date()) : null;
  const globeUrl =
    buildGeoUrl({ lat: HERALD_SQUARE.lat, lng: HERALD_SQUARE.lng, radiusM: 5000 }, "") ??
    "/";

  const faqs = [
    {
      q: "When is the Macy's Thanksgiving Day Parade?",
      a: edition
        ? `${formatDateLong(edition.start)} — Thanksgiving morning. The date is fixed by the holiday itself: Thanksgiving is the fourth Thursday of November, and the parade steps off that morning down Central Park West. This page rolls forward to the next edition on its own.`
        : "Thanksgiving morning — the fourth Thursday of November, every year. The parade steps off on Central Park West and comes down Sixth Avenue to Herald Square.",
    },
    {
      q: "Can I watch the balloons on these cameras?",
      a: "The balloons themselves are the broadcast's view — this page says so plainly, as every event page here does. These are New York's public street and traffic cameras along and around the route: they show parade morning at street level — the avenues closed and filling, the crowds at the barriers, the march down Sixth Avenue passing the intersections, and the great dispersal from Herald Square afterwards. The night before is the sleeper pick: the balloons are inflated on the streets around the American Museum of Natural History, in the first wall below, and the inflation is a public spectacle of its own.",
    },
    {
      q: "What is balloon inflation night?",
      a: "On the Wednesday before Thanksgiving, the giant balloons are inflated on the streets beside the American Museum of Natural History — Central Park West and Columbus Avenue around West 77th–81st Streets — and the public files past to watch them rise and strain at their nets. It runs through the afternoon and evening, and the route wall below covers that corner of the Upper West Side.",
    },
    {
      q: "Which cameras are closest to the parade?",
      a: `The first wall is every public camera in the directory within 2 km of the four route points — the step-off on Central Park West, Columbus Circle, Sixth Avenue and Herald Square: ${route.length} feeds. The second wall widens to 5 km around Herald Square, and the third takes in the whole Midtown field at 10 km.`,
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
      ? `Macy's Thanksgiving Day Parade ${YEAR} — Live Cameras`
      : "Macy's Thanksgiving Day Parade — Live Cameras",
    description:
      "Public cameras along the Macy's Thanksgiving Day Parade route — Central Park West, Columbus Circle, Sixth Avenue and Herald Square.",
    url: `${BASE}/${SLUG}`,
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  };

  const eventLd = edition
    ? {
        "@context": "https://schema.org",
        "@type": "Event",
        name: `Macy's Thanksgiving Day Parade ${edition.year}`,
        startDate: edition.start,
        endDate: edition.end,
        location: {
          "@type": "Place",
          name: "Herald Square, New York City",
          geo: { "@type": "GeoCoordinates", latitude: 40.7494, longitude: -73.9879 },
        },
        description:
          "The annual Macy's Thanksgiving Day Parade — giant balloons, floats and marching bands from Central Park West down Sixth Avenue to Herald Square, watched here through the public cameras along the route.",
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
          { label: "Macy's Thanksgiving Day Parade" },
        ]}
      />
      <Hero
        h1={
          YEAR
            ? `Macy's Thanksgiving Day Parade ${YEAR} — Live Cameras`
            : "Macy's Thanksgiving Day Parade — Live Cameras"
        }
        sub={
          edition
            ? live
              ? `It's parade morning — ${formatDateLong(edition.start)}. Watch the route fill, the march down Sixth Avenue and the finish at Herald Square. Free, no signup.`
              : `The next parade is ${formatDateLong(edition.start)}${days !== null && days > 0 ? ` — ${days} days out` : ""}. Watch the route fill, the march down Sixth Avenue and the finish at Herald Square. Free, no signup.`
            : "Watch the route fill, the march down Sixth Avenue and the finish at Herald Square on parade morning. Free, no signup."
        }
      />
      <StatRow
        stats={[
          {
            value: edition ? formatDateShort(edition.start) : "Thanksgiving",
            label: "the next Macy's Thanksgiving Day Parade",
          },
          { value: String(route.length), label: "public cameras within 2 km of the parade route" },
          { value: String(all.size), label: "public cameras across the three views below" },
        ]}
      />
      <Intro
        paragraphs={[
          "Thanksgiving morning in New York belongs to the balloons. The parade steps off on Central Park West beside the American Museum of Natural History, turns at Columbus Circle, and marches down Sixth Avenue to the finish in Herald Square — giant character balloons overhead, floats and marching bands below, and a crowd several deep behind the barriers the whole way. The cameras on this page are the city's own: the public street and traffic feeds that watch those avenues every day of the year.",
          "The honest framing, as on every event page here: no public camera gives you the television shot of a balloon sailing between the towers, and this page does not pretend otherwise. What the cameras show is the parade at street level — the route the night before, when the balloons are inflated on the Upper West Side streets to a wandering crowd; the avenues closed and filling from dawn; the march passing intersection by intersection; and the moment it ends, when Herald Square lets go of a million people at once.",
          "Start on Wednesday evening with the route wall for inflation night. On Thursday, keep the route wall open from the step-off, and switch to the Midtown wall for the finish and the dispersal — the city's biggest morning emptying back into its streets is a show of its own.",
        ]}
      />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">The route — step-off to Herald Square</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Every public camera in the directory within 2 km of the four points that define the
          route: the step-off on Central Park West — where Wednesday&apos;s balloon inflation
          happens on the streets around the museum — Columbus Circle, Sixth Avenue and Herald
          Square. Street-level feeds: they watch the avenues the parade travels, not the sky
          above them.
        </p>
        <SkiCameraGrid
          cameras={route}
          initial={12}
          emptyNote="No public cameras in the directory currently cover the parade route."
        />
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">Herald Square & Midtown — 5 km</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Every public camera within 5 km of Herald Square: the finish, the Midtown avenues
          that feed the crowds in, and the Penn Station blocks the dispersal pours through.
        </p>
        <SkiCameraGrid
          cameras={midtown}
          initial={12}
          emptyNote="No public cameras in the directory currently cover Midtown Manhattan."
        />
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">The whole field — 10 km of New York</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Every public camera within 10 km of Herald Square — the full Thanksgiving-morning
          picture: the route, the park, the crossings and the avenues carrying the city to and
          from its parade.
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
          { name: "The route (four points, 2 km each)", count: route.length },
          { name: "Herald Square & Midtown (within 5 km)", count: midtown.length },
          { name: "The whole field (within 10 km)", count: metro.length },
        ]}
        note="Counts are public cameras in the WorldEye directory per selection; the walls overlap, and the page total counts each camera once."
      />

      <HowTo
        title="How to watch parade day on the cameras"
        steps={[
          "Wednesday evening: open the route wall and watch inflation night on the Upper West Side — the balloons rising between the museum blocks.",
          "Thursday from dawn: the route fills behind the barriers; the Midtown avenues close and the crowd settles in.",
          "During the march, follow the route wall south — the parade passes Columbus Circle, then Sixth Avenue, then Herald Square.",
          "At the finish, switch to the Midtown wall: the dispersal through the Penn Station blocks is the morning's second spectacle.",
          "Later in the day the same avenues carry the city's quietest afternoon of the year — the third wall shows Thanksgiving in New York winding down.",
        ]}
      />

      <FaqSection title="Macy's Thanksgiving Day Parade — FAQ" faqs={faqs} />

      <RelatedLinks
        title="Keep exploring"
        links={[
          { label: "Live webcams in New York City", href: "/city-webcams/new-york-city" },
          { label: "Herald Square & Midtown on the 3D globe", href: globeUrl },
          { label: "The 100th parade — the 2026 edition page", href: "/macys-thanksgiving-parade-2026" },
          { label: "Thanksgiving travel — airports & highways live", href: "/thanksgiving-travel-2026" },
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
