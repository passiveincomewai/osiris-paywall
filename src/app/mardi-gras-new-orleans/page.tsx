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
  MARDI_GRAS,
  daysUntil,
  editionIsLive,
  formatDateLong,
  formatDateShort,
  formatRange,
  nextEdition,
} from "@/lib/seasonal-events";
import { buildGeoUrl } from "@/lib/share/links";

export const revalidate = 86400;

const SLUG = "mardi-gras-new-orleans";
const FRENCH_QUARTER: GeoAnchor = { lat: 29.9584, lng: -90.0644 };

const edition = nextEdition(MARDI_GRAS);
const YEAR = edition?.year;
/** Twelfth Night — Carnival opens January 6 of the edition's year. */
const seasonStartIso = edition ? `${edition.year}-${MARDI_GRAS.seasonStart}` : null;

export async function generateMetadata(): Promise<Metadata> {
  const title = YEAR
    ? `Mardi Gras in New Orleans ${YEAR} — Live Cameras`
    : "Mardi Gras in New Orleans — Live Cameras";
  const description = edition
    ? `Mardi Gras ${YEAR} in New Orleans: Fat Tuesday is ${formatDateLong(edition.start)}, and Carnival season opens on Twelfth Night, ${seasonStartIso ? formatDateLong(seasonStartIso) : "January 6"}. The public cameras around the French Quarter and the metro's parade-day roads. Free on WorldEye, no signup.`
    : "Mardi Gras in New Orleans — Carnival season, Fat Tuesday, and the public cameras around the French Quarter and the metro's parade-day roads. Free on WorldEye, no signup.";
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/${SLUG}` },
    openGraph: {
      title,
      description:
        "Public cameras around the French Quarter and greater New Orleans through Carnival season and Fat Tuesday. Free on WorldEye.",
      url: `/${SLUG}`,
      type: "website",
    },
  };
}

export default async function MardiGrasNewOrleansPage() {
  const records = await loadCountryChunk("united-states");

  const quarter = camerasWithinKm(records, FRENCH_QUARTER, 5);
  const metro = camerasWithinKm(records, FRENCH_QUARTER, 10);

  const all = new Set<string>();
  for (const c of [...quarter, ...metro]) all.add(c.id);

  const live = edition ? editionIsLive(edition) : false;
  const days = edition ? daysUntil(edition.start, new Date()) : null;
  const globeUrl =
    buildGeoUrl(
      { lat: FRENCH_QUARTER.lat, lng: FRENCH_QUARTER.lng, radiusM: 5000 },
      "",
    ) ?? "/";

  const faqs = [
    {
      q: YEAR ? `When is Mardi Gras ${YEAR}?` : "When is Mardi Gras?",
      a: edition
        ? `Fat Tuesday is ${formatDateLong(edition.start)}. Mardi Gras moves because Easter moves: Fat Tuesday is the day before Ash Wednesday, the last day before Lent, so its date follows the Easter computus — it can fall anywhere from early February to early March. ${edition.year}'s is ${formatDateShort(edition.start)}.`
        : "Fat Tuesday — the day before Ash Wednesday, the last day before Lent — so its date follows Easter and can fall anywhere from early February to early March.",
    },
    {
      q: "When does Carnival season start?",
      a: seasonStartIso
        ? `Carnival opens on Twelfth Night — ${formatDateLong(seasonStartIso)} — every year, and builds for weeks: parades roll from January into February, growing larger until the final five days, when the biggest krewes take over and Fat Tuesday shuts the city down in purple, green and gold.`
        : "Carnival opens on Twelfth Night — January 6 — every year, and builds for weeks until Fat Tuesday.",
    },
    {
      q: "Can I watch the parades on these cameras?",
      a: "Not the parades themselves — the honesty matters. The famous routes, St. Charles Avenue above all, have no public cameras in the WorldEye directory, and neither does Bourbon Street. Every camera here is a Louisiana DOT road feed, watching the freeways and bridges of the metro. What they show on parade days is the city's other Carnival story: the closures, the traffic waves as hundreds of thousands of people move to and from the routes, and the drive in and out — which, if you are going, is the part you most need to see.",
    },
    {
      q: "Which cameras matter most on parade days?",
      a: "The I-10 cameras at Claiborne and Orleans Avenue, which overlook the freeway corridor beside the French Quarter and Tremé, and the US 90B feeds at the Crescent City Connection — the bridge every Westbank parade-goer crosses. All of them are in the first wall below.",
    },
    {
      q: "Are the Mardi Gras cameras free to watch?",
      a: "Yes. Every camera on this page is a public feed, free to open on WorldEye — no account, no signup.",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: YEAR
      ? `Mardi Gras in New Orleans ${YEAR} — Live Cameras`
      : "Mardi Gras in New Orleans — Live Cameras",
    description:
      "Public cameras around the French Quarter and greater New Orleans through Carnival season and Fat Tuesday.",
    url: `${BASE}/${SLUG}`,
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  };

  const eventLd = edition
    ? {
        "@context": "https://schema.org",
        "@type": "Event",
        name: `Mardi Gras in New Orleans ${edition.year} (Fat Tuesday)`,
        startDate: edition.start,
        endDate: edition.end,
        location: {
          "@type": "Place",
          name: "French Quarter, New Orleans, Louisiana",
          geo: { "@type": "GeoCoordinates", latitude: 29.9584, longitude: -90.0644 },
        },
        description: `Fat Tuesday ${edition.year} in New Orleans — the climax of a Carnival season that opens on Twelfth Night, ${seasonStartIso ? formatDateLong(seasonStartIso) : "January 6"}. Parade-day New Orleans watched through the metro's public road cameras.`,
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
          { label: "Mardi Gras — New Orleans" },
        ]}
      />
      <Hero
        h1={
          YEAR
            ? `Mardi Gras in New Orleans ${YEAR} — Live Cameras`
            : "Mardi Gras in New Orleans — Live Cameras"
        }
        sub={
          edition
            ? live
              ? `It's Fat Tuesday — ${formatDateLong(edition.start)}. The metro's public cameras on the biggest day of the New Orleans year. Free, no signup.`
              : `Fat Tuesday is ${formatDateLong(edition.start)}${days !== null && days > 0 ? ` — ${days} days out` : ""}, and Carnival season opens ${seasonStartIso ? formatDateLong(seasonStartIso) : "on Twelfth Night"}. Watch parade-day New Orleans on its public cameras. Free, no signup.`
            : "Watch parade-day New Orleans — Carnival season and Fat Tuesday — on the metro's public cameras. Free, no signup."
        }
      />
      <StatRow
        stats={[
          {
            value: edition ? formatDateShort(edition.start) : "Fat Tuesday",
            label: edition ? `Fat Tuesday ${edition.year}` : "Fat Tuesday",
          },
          { value: String(quarter.length), label: "public cameras within 5 km of the French Quarter" },
          { value: String(all.size), label: "public cameras across greater New Orleans below" },
        ]}
      />
      <Intro
        paragraphs={[
          seasonStartIso
            ? `New Orleans runs on Carnival time from Twelfth Night — ${formatDateLong(seasonStartIso)} — when the season opens, through weeks of parades to Fat Tuesday, ${edition ? formatDateLong(edition.start) : "the day before Lent"}. This page gathers the public cameras of the New Orleans metro for the season: Louisiana's road feeds around the French Quarter, the freeway corridors and the river bridges — the working machinery of a city moving a million parade-goers.`
            : "New Orleans runs on Carnival time from Twelfth Night in January through weeks of parades to Fat Tuesday. This page gathers the public cameras of the New Orleans metro for the season: Louisiana's road feeds around the French Quarter, the freeway corridors and the river bridges.",
          "The honest framing, as on every event page here: the parade routes themselves have no public cameras in the directory — St. Charles Avenue and Bourbon Street are not on this page, and no camera here will show you a float. What the cameras do show is everything around the parades: the I-10 corridor over Claiborne, the Crescent City Connection, the closures and the traffic weather of parade days. For anyone driving to a route, that is the most useful view in the city.",
          "Work the first wall for the centre — the Quarter, the Marigny, Tremé and the Garden District approaches are all inside it — and the second for the whole metro, from the lakefront to the Westbank, as the season builds to its final weekend.",
        ]}
      />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">The Quarter & the centre — 5 km</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Every public camera in the directory within 5 km of the French Quarter, nearest first —
          the I-10 and US 90B corridors that ring the old city, the feeds parade-goers actually
          travel under.
        </p>
        <SkiCameraGrid
          cameras={quarter}
          initial={12}
          emptyNote="No public cameras in the directory currently cover central New Orleans."
        />
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">Greater New Orleans — 10 km</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Every public camera within 10 km of the French Quarter: the centre plus the lakefront,
          Mid-City, the I-610 split and the Westbank approaches — the full map of how the city
          moves on a parade day.
        </p>
        <SkiCameraGrid
          cameras={metro}
          initial={12}
          emptyNote="No public cameras in the directory currently cover greater New Orleans."
        />
      </section>

      <AreaTable
        title="The two views — camera counts"
        rows={[
          { name: "The Quarter & the centre (within 5 km)", count: quarter.length },
          { name: "Greater New Orleans (within 10 km)", count: metro.length },
        ]}
        note="Counts are public cameras in the WorldEye directory per selection; the 10 km wall includes the 5 km wall."
      />

      <HowTo
        title="How to watch Carnival on the cameras"
        steps={[
          "From Twelfth Night on, check the centre wall on parade evenings — the freeway corridors show the city's Carnival pulse as routes let out.",
          "Driving to a parade? The I-10 at Claiborne and the Crescent City Connection feeds are the two that decide your route; check them before you leave.",
          "The final weekend is the crescendo: Endymion Saturday, Bacchus Sunday, then Zulu and Rex on Fat Tuesday morning — the metro wall shows the whole city moving at once.",
          edition
            ? `Fat Tuesday itself is ${formatRange(edition)} — the closures around the routes go in early, and the cameras show the last drives in before the streets belong to the parades.`
            : "On Fat Tuesday the closures around the routes go in early — the cameras show the last drives in before the streets belong to the parades.",
          "Ash Wednesday is a spectacle too: a hungover, bead-strewn city going back to work, live on the same feeds.",
        ]}
      />

      <FaqSection title="Mardi Gras in New Orleans — FAQ" faqs={faqs} />

      <RelatedLinks
        title="Keep exploring"
        links={[
          { label: "Louisiana traffic cameras", href: "/us-traffic-cameras/louisiana" },
          { label: "The French Quarter on the 3D globe", href: globeUrl },
          { label: "United States cameras", href: "/cameras/countries/united-states" },
          { label: "All live events", href: "/live-events" },
        ]}
      />

      <RelatedLinks
        title="The annual calendar"
        links={[
          { label: "New Year's Eve in Times Square — live cameras", href: "/new-years-eve-times-square" },
          { label: "Cherry blossoms in Washington DC", href: "/cherry-blossoms-washington-dc" },
          { label: "Oktoberfest in Munich — live cameras", href: "/oktoberfest-munich" },
          { label: "Fall foliage cameras", href: "/fall-foliage-cameras" },
        ]}
      />

      <TrialCtaSection utmSource={SLUG} />

      <CtaRow backHref="/live-events" backLabel="All live events" />
    </PageShell>
  );
}
