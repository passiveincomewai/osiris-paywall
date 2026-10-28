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
import { camerasWithinKm } from "@/lib/event-page-cameras";
import type { CountryCamera } from "@/lib/country-cameras";
import {
  FOURTH_OF_JULY,
  JULY4_REGIONS,
  daysUntil,
  editionIsLive,
  formatDateLong,
  formatDateShort,
  nextEdition,
  type July4Region,
} from "@/lib/seasonal-events";
import { buildGeoUrl } from "@/lib/share/links";

export const revalidate = 86400;

const SLUG = "fourth-of-july-fireworks";

const edition = nextEdition(FOURTH_OF_JULY);
const YEAR = edition?.year;

export async function generateMetadata(): Promise<Metadata> {
  const title = YEAR
    ? `Fourth of July Fireworks ${YEAR} — Live Cameras in Six Cities`
    : "Fourth of July Fireworks — Live Cameras in Six Cities";
  const description = edition
    ? `Fourth of July, ${formatDateLong(edition.start)} — the public cameras on the waterfronts of New York, Washington DC, Seattle, Nashville, Boston and San Francisco, where the fireworks go up. Free on WorldEye, no signup.`
    : "Fourth of July on the public cameras of six waterfronts — New York, Washington DC, Seattle, Nashville, Boston and San Francisco. Free on WorldEye, no signup.";
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/${SLUG}` },
    openGraph: {
      title,
      description:
        "Six cities' July 4 waterfronts on live public cameras — the crowds, the closed streets and the night the shows light up. Free on WorldEye.",
      url: `/${SLUG}`,
      type: "website",
    },
  };
}

export default async function FourthOfJulyFireworksPage() {
  const records = await loadCountryChunk("united-states");

  const walls = new Map<string, CountryCamera[]>();
  const union = new Set<string>();
  for (const r of JULY4_REGIONS) {
    const wall = camerasWithinKm(records, r.anchor, r.radiusKm);
    walls.set(r.key, wall);
    for (const c of wall) union.add(c.id);
  }
  const deepest = JULY4_REGIONS.reduce((a, b) =>
    (walls.get(a.key)?.length ?? 0) >= (walls.get(b.key)?.length ?? 0) ? a : b,
  );

  const live = edition ? editionIsLive(edition) : false;
  const days = edition ? daysUntil(edition.start, new Date()) : null;
  const nyc = JULY4_REGIONS[0];
  const globeUrl =
    buildGeoUrl({ lat: nyc.anchor.lat, lng: nyc.anchor.lng, radiusM: 10000 }, "") ?? "/";

  const faqs = [
    {
      q: "When are the Fourth of July fireworks?",
      a: edition
        ? `${formatDateLong(edition.start)} — the date never moves. Each city's show is fired after dark on the Fourth itself (weather permitting, and each city is the final word on its own show). This page rolls forward to the next Fourth on its own.`
        : "July 4, after dark — the date never moves. Each city fires its show on the Fourth itself, weather permitting.",
    },
    {
      q: "Can I watch the fireworks themselves on these cameras?",
      a: "Sometimes the sky, never a promise — and the distinction is printed here rather than buried. These are the cities' public street and waterfront cameras, not the barges' broadcast feed. They watch the waterfronts the shows are fired over: the crowds arriving from the afternoon, the streets closed and filling, and the sky above the water lighting up where a camera's angle takes in the skyline. Some frames will catch the show; many will catch the night around it. San Francisco adds its own honest caveat, stated in its section: the summer fog can take the whole show, and the cameras show that too.",
    },
    {
      q: "Which city has the most cameras?",
      a: `${deepest.name.split(" — ")[0]}, with ${walls.get(deepest.key)?.length ?? 0} public cameras in its wall — the counts for all six cities are in the table below, each computed from the same directory the walls are drawn from. Every city here earned its place with a real wall; Chicago's lakefront was measured and left out, because two cameras near Navy Pier is not a wall.`,
    },
    {
      q: "Why these six cities?",
      a: "Because their fireworks are fired over water their public cameras actually watch: the East River in New York, the Mall and the Potomac in Washington, Lake Union in Seattle, the Cumberland in Nashville, the Charles in Boston and the Bay in San Francisco. A July 4 page for a city whose cameras face a parking lot would be a claim the catalogue cannot back — so the list stops where the evidence stops.",
    },
    {
      q: "Are the fireworks cameras free to watch?",
      a: "Yes. Every camera on this page is a public feed, free to open on WorldEye — no account, no signup.",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: YEAR
      ? `Fourth of July Fireworks ${YEAR} — Live Cameras in Six Cities`
      : "Fourth of July Fireworks — Live Cameras in Six Cities",
    description:
      "Public cameras on the July 4 waterfronts of New York, Washington DC, Seattle, Nashville, Boston and San Francisco.",
    url: `${BASE}/${SLUG}`,
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  };

  const eventLd = edition
    ? {
        "@context": "https://schema.org",
        "@type": "Event",
        name: `Fourth of July Fireworks ${edition.year}`,
        startDate: edition.start,
        endDate: edition.end,
        location: {
          "@type": "Place",
          name: "Six waterfronts across the United States",
        },
        description:
          "Independence Day fireworks over the East River, the National Mall, Lake Union, the Cumberland River, the Charles River and San Francisco Bay — watched here through the public cameras on those waterfronts.",
      }
    : null;

  const regionSection = (r: July4Region) => {
    const wall = walls.get(r.key) ?? [];
    return (
      <section key={r.key} className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">{r.name}</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          {r.blurb} The show: {r.show}. {wall.length} public cameras within {r.radiusKm} km of
          the waterfront, nearest first.
        </p>
        <SkiCameraGrid
          cameras={wall}
          initial={12}
          emptyNote={`No public cameras in the directory currently cover ${r.name}.`}
        />
      </section>
    );
  };

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      {eventLd && <JsonLd data={eventLd} />}
      <FaqJsonLd faqs={faqs} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live events", href: "/live-events" },
          { label: "Fourth of July fireworks" },
        ]}
      />
      <Hero
        h1={
          YEAR
            ? `Fourth of July Fireworks ${YEAR} — Live Cameras in Six Cities`
            : "Fourth of July Fireworks — Live Cameras in Six Cities"
        }
        sub={
          edition
            ? live
              ? `Tonight's the night — ${formatDateLong(edition.start)}. Six waterfronts, six shows, one page of live cameras. Free, no signup.`
              : `The next Fourth is ${formatDateLong(edition.start)}${days !== null && days > 0 ? ` — ${days} days out` : ""}. Six waterfronts, six shows, one page of live cameras. Free, no signup.`
            : "Six waterfronts, six shows, one page of live cameras. Free, no signup."
        }
      />
      <StatRow
        stats={[
          {
            value: edition ? formatDateShort(edition.start) : "Jul 4",
            label: "the next Fourth of July",
          },
          { value: String(union.size), label: "public cameras across the six waterfronts" },
          { value: "6", label: "cities — every one with a real camera wall" },
        ]}
      />
      <Intro
        paragraphs={[
          "America fires its birthday over water. New York lights the East River, Washington fires over the Mall, Seattle over Lake Union, Nashville over the Cumberland, Boston over the Charles and San Francisco over the Bay — and in each of those cities, the public camera network watches the waterfront where it happens. This page gathers those six walls in one place: the only July 4 camera page whose cities were chosen by counting cameras before writing a word.",
          "The honest framing, as on every event page here: these are street and waterfront cameras, not a broadcast feed from the barges. What they show on the Fourth is the day itself — the waterfronts filling from the afternoon, the blanket-and-cooler occupation of every lawn, the closed streets, and after dark the sky going up in colour over the water wherever a frame takes in the skyline. Some cameras will catch the show directly; all of them catch the night around it, which is most of what being there is.",
          "Work east to west as the dark does: New York and Washington first, Boston and Nashville with them, and San Francisco last — where the page keeps the city's own caveat in view, because a fogged-out show watched honestly is still the real San Francisco Fourth.",
        ]}
      />

      {JULY4_REGIONS.map(regionSection)}

      <AreaTable
        title="The six waterfronts — camera counts"
        rows={JULY4_REGIONS.map((r) => ({
          name: `${r.name} — ${r.show}`,
          count: walls.get(r.key)?.length ?? 0,
        }))}
        note="Counts are public cameras in the WorldEye directory within each waterfront's stated radius; the walls do not overlap, and the page total counts each camera once."
      />

      <HowTo
        title="How to watch the Fourth on the cameras"
        steps={[
          "Afternoon: open your city's wall and watch the waterfront fill — the land rush for viewing grass is the day's first spectacle.",
          "Evening: keep the wall open through the concerts and the dusk; the crowds at their fullest are the hour before the show.",
          "At dark, work east to west — the shows fire on local darkness, so the page lights up in sequence across the country.",
          "After the finale, stay for the exodus: six cities emptying their waterfronts at once is the Fourth's last act.",
          "Driving anywhere near a waterfront? These same walls are the traffic check — the closures and the crawl are all on camera.",
        ]}
      />

      <FaqSection title="Fourth of July fireworks — FAQ" faqs={faqs} />

      <RelatedLinks
        title="Keep exploring"
        links={[
          { label: "New York's East River on the 3D globe", href: globeUrl },
          { label: "Live webcams in Washington DC", href: "/city-webcams/washington-dc" },
          { label: "Live webcams in Seattle", href: "/city-webcams/seattle" },
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
