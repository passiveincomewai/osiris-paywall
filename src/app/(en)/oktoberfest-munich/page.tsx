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
import { camerasWithinKm, type GeoAnchor } from "@/lib/event-page-cameras";
import {
  OKTOBERFEST,
  daysUntil,
  editionIsLive,
  formatDateLong,
  formatRange,
  nextEdition,
} from "@/lib/seasonal-events";
import { buildGeoUrl } from "@/lib/share/links";

export const revalidate = 86400;

const SLUG = "oktoberfest-munich";
const THERESIENWIESE: GeoAnchor = { lat: 48.1319, lng: 11.5497 };

const edition = nextEdition(OKTOBERFEST);
const YEAR = edition?.year;

export async function generateMetadata(): Promise<Metadata> {
  const title = YEAR
    ? `Oktoberfest in Munich ${YEAR} — Live Cameras`
    : "Oktoberfest in Munich — Live Cameras";
  const description = edition
    ? `Oktoberfest ${edition.year} runs ${formatRange(edition)} on Munich's Theresienwiese. The public cameras of Munich and its approaches through the festival — honestly counted, the directory's Bavarian coverage is thin. Free on WorldEye.`
    : "Oktoberfest in Munich — the festival dates, and the public cameras of Munich and its approaches. Free on WorldEye.";
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/${SLUG}` },
    openGraph: {
      title,
      description:
        "Munich's public cameras through Oktoberfest — the Marienplatz old-town feed and the Bavarian road cameras of the festival's approaches. Free on WorldEye.",
      url: `/${SLUG}`,
      type: "website",
    },
  };
}

export default async function OktoberfestMunichPage() {
  const records = await loadCountryChunk("germany");

  const munich = camerasWithinKm(records, THERESIENWIESE, 20);

  const live = edition ? editionIsLive(edition) : false;
  const days = edition ? daysUntil(edition.start, new Date()) : null;
  const globeUrl =
    buildGeoUrl(
      { lat: THERESIENWIESE.lat, lng: THERESIENWIESE.lng, radiusM: 20000 },
      "",
    ) ?? "/";

  const faqs = [
    {
      q: YEAR ? `When is Oktoberfest ${YEAR}?` : "When is Oktoberfest?",
      a: edition
        ? `${formatRange(edition)}, on the Theresienwiese in Munich. Despite the name it is mostly a September festival: by rule it opens on the Saturday after September 15 and closes on the first Sunday of October — extended to October 3, German Unity Day, when that Sunday falls on the 1st or 2nd, as it does in ${edition.year}. The dates are the City of Munich's published dates.`
        : "Mostly in September, despite the name: by rule Oktoberfest opens on the Saturday after September 15 and closes on the first Sunday of October, extended to October 3 (German Unity Day) when that Sunday falls on the 1st or 2nd.",
    },
    {
      q: "When does the beer actually start flowing?",
      a: edition
        ? `At noon on opening day — ${formatDateLong(edition.start)}. The tents open in the morning, but no beer is served anywhere on the Wiesn until Munich's mayor taps the first keg in the Schottenhamel tent and declares “O'zapft is!” — “it's tapped”. The next morning, the traditional costume and riflemen's parade — some 9,000 participants in Tracht — winds seven kilometres through the city centre to the grounds.`
        : "At noon on opening Saturday, when Munich's mayor taps the first keg in the Schottenhamel tent and declares “O'zapft is!” — no beer is served on the grounds before that moment.",
    },
    {
      q: "Can I see the festival grounds on these cameras?",
      a: "No — and this page won't dress anything up as the Wiesn. No public camera in the WorldEye directory overlooks the Theresienwiese. Munich's coverage in the directory is thin and stated as it is: the wall below is every public camera within 20 km of the grounds, and it is mostly Bavarian road feeds around the city — plus one genuine old-town camera at Marienplatz, a short walk from the festival, which carries the city's Wiesn-season weather and streets.",
    },
    {
      q: "What are the cameras good for during Oktoberfest?",
      a: "The journey and the conditions. Six million or more visitors pour into a city of a million and a half over sixteen days; the road cameras show the approaches, the ring roads and the festival weather as it happens — the practical view for anyone travelling in, and the atmosphere of Munich in its loudest fortnight for everyone else.",
    },
    {
      q: "Are the Oktoberfest cameras free to watch?",
      a: "Yes. Every camera on this page is a public feed, free to open on WorldEye — no account, no signup.",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: YEAR ? `Oktoberfest in Munich ${YEAR} — Live Cameras` : "Oktoberfest in Munich — Live Cameras",
    description:
      "Oktoberfest in Munich — the festival's dates and the public cameras of the city and its approaches, honestly counted.",
    url: `${BASE}/${SLUG}`,
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  };

  const eventLd = edition
    ? {
        "@context": "https://schema.org",
        "@type": "Event",
        name: `Oktoberfest Munich ${edition.year}`,
        startDate: edition.start,
        endDate: edition.end,
        location: {
          "@type": "Place",
          name: "Theresienwiese, Munich, Germany",
          geo: { "@type": "GeoCoordinates", latitude: 48.1319, longitude: 11.5497 },
        },
        description: `Oktoberfest ${edition.year} on the Theresienwiese in Munich — the world's largest Volksfest, running ${formatRange(edition)}.`,
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
          { label: "Oktoberfest — Munich" },
        ]}
      />
      <Hero
        h1={YEAR ? `Oktoberfest in Munich ${YEAR} — Live Cameras` : "Oktoberfest in Munich — Live Cameras"}
        sub={
          edition
            ? live
              ? `The Wiesn is on — ${formatRange(edition)}. Munich's public cameras through the loudest fortnight of the Bavarian year. Free, no signup.`
              : `The world's largest Volksfest runs ${formatRange(edition)}${days !== null && days > 0 ? ` — ${days} days to the first keg` : ""} on the Theresienwiese. Munich's public cameras, honestly counted. Free, no signup.`
            : "The world's largest Volksfest, on the Theresienwiese each autumn. Munich's public cameras, honestly counted. Free, no signup."
        }
      />
      <StatRow
        stats={[
          {
            value: edition ? formatRange(edition) : "Sep – Oct",
            label: edition ? `Oktoberfest ${edition.year} (published dates)` : "Oktoberfest, each autumn",
          },
          { value: String(munich.length), label: "public cameras within 20 km of the Theresienwiese" },
          { value: "1810", label: "the first Oktoberfest — a royal wedding's horse race" },
        ]}
      />
      <Intro
        paragraphs={[
          "Oktoberfest began as a wedding party: Munich turned out in October 1810 for the marriage of Crown Prince Ludwig and Therese of Saxony-Hildburghausen, raced horses on the meadow that still bears her name — Theresienwiese — and enjoyed it so much they did it again the next year. Two centuries on it is the largest folk festival on Earth: sixteen or so days, fourteen great tents, only Munich's own breweries pouring, and six to seven million visitors.",
          edition
            ? `The ${edition.year} edition runs ${formatRange(edition)}. The opening Saturday is the ceremony: the landlords' grand entry in the morning, then at noon the mayor taps the first keg in the Schottenhamel and calls “O'zapft is!” — until that moment, no tent on the grounds may serve a beer. Sunday brings the costume parade, nine thousand strong, through the centre to the Wiesn.`
            : "The opening Saturday is the ceremony: the landlords' grand entry in the morning, then at noon the mayor taps the first keg in the Schottenhamel and calls “O'zapft is!” — until that moment, no tent on the grounds may serve a beer.",
          `And the cameras, honestly — this is the thinnest wall in the seasonal calendar, and it is labelled as such. The directory holds ${munich.length} public cameras within 20 km of the Theresienwiese, and none of them overlooks the festival grounds. One is a true city view, the old town's Marienplatz camera; the rest are Bavarian road feeds on the approaches and ring roads. They are the festival's travel weather and arrival story, not the tents — the Christmas markets page tells the same story about Munich, and both pages would rather show you a small real wall than a big borrowed one.`,
        ]}
      />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">Munich & its approaches — 20 km</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Every public camera in the directory within 20 km of the Theresienwiese, nearest first.
          The Marienplatz feed is the city&apos;s own postcard; the road cameras — the B-roads and
          state roads fanning out to Dachau, Erding, Freising and the lakes — carry the arrival
          traffic of the festival weeks.
        </p>
        <SkiCameraGrid
          cameras={munich}
          initial={12}
          emptyNote="No public cameras in the directory currently cover Munich."
        />
      </section>

      <AreaTable
        title="The coverage, stated plainly"
        rows={[{ name: "Munich & its approaches (within 20 km)", count: munich.length }]}
        note="Munich's wall is the directory's thinnest for a major festival city — German coverage here is mostly road feeds. No camera in the selection overlooks the Theresienwiese itself."
      />

      <HowTo
        title="How to watch Oktoberfest season on the cameras"
        steps={[
          edition
            ? `Opening Saturday, ${formatDateLong(edition.start)}: the Marienplatz camera carries the old town on parade morning — the costume parade passes through the centre on Sunday.`
            : "Opening Saturday: the Marienplatz camera carries the old town on parade morning — the costume parade passes through the centre on Sunday.",
          "Travelling in? The approach roads in the wall are the drive itself: Dachau and the north, Erding and the airport side, the lake roads from the south.",
          "Watch the weather like a local: the Wiesn is an outdoor festival in early-autumn Bavaria, and a cold, wet week reads completely differently from a golden one — the cameras show which you are getting.",
          "The final weekend is the farewell: the same roads carry six million visitors' worth of goodbyes, and the Marienplatz feed settles back into an ordinary, beautiful city.",
          "Come back in November: Munich's next season on this site is the Christkindlmarkt, on the Christmas markets page.",
        ]}
      />

      <FaqSection title="Oktoberfest in Munich — FAQ" faqs={faqs} />

      <RelatedLinks
        title="Keep exploring"
        links={[
          { label: "Germany cameras", href: "/cameras/countries/germany" },
          { label: "Germany traffic cameras", href: "/germany-traffic-cameras" },
          { label: "Munich & the Theresienwiese on the 3D globe", href: globeUrl },
          { label: "Christmas markets live — Munich's next season", href: "/christmas-markets-live" },
          { label: "All live events", href: "/live-events" },
        ]}
      />

      <RelatedLinks
        title="The annual calendar"
        links={[
          { label: "New Year's Eve in Times Square — live cameras", href: "/new-years-eve-times-square" },
          { label: "Mardi Gras in New Orleans — live cameras", href: "/mardi-gras-new-orleans" },
          { label: "Cherry blossoms in Washington DC", href: "/cherry-blossoms-washington-dc" },
          { label: "Fall foliage cameras", href: "/fall-foliage-cameras" },
                  { label: "Macy's Thanksgiving Day Parade — live cameras", href: "/macys-thanksgiving-parade" },
          { label: "New York City Marathon — live cameras", href: "/nyc-marathon" },
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
