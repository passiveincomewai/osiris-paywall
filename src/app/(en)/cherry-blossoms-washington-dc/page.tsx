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
  CHERRY_BLOSSOM_FESTIVAL,
  CHERRY_BLOSSOM_TYPICAL,
  daysUntil,
  editionIsLive,
  formatDateShort,
  formatRange,
  nextEdition,
} from "@/lib/seasonal-events";
import { buildGeoUrl } from "@/lib/share/links";

export const revalidate = 86400;

const SLUG = "cherry-blossoms-washington-dc";
const TIDAL_BASIN: GeoAnchor = { lat: 38.8839, lng: -77.0348 };

const edition = nextEdition(CHERRY_BLOSSOM_FESTIVAL);
const YEAR = edition?.year;

export async function generateMetadata(): Promise<Metadata> {
  const title = YEAR
    ? `Cherry Blossoms in Washington DC ${YEAR} — Festival & Live Cameras`
    : "Cherry Blossoms in Washington DC — Festival & Live Cameras";
  const description = edition
    ? `The National Cherry Blossom Festival runs ${formatRange(edition)}. Peak bloom is the trees' decision — the Park Service forecasts it each March. Plus the public cameras on the bridges and approaches to the Tidal Basin. Free on WorldEye.`
    : "Washington DC's cherry blossom season, the National Cherry Blossom Festival, and the public cameras on the bridges and approaches to the Tidal Basin. Free on WorldEye.";
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/${SLUG}` },
    openGraph: {
      title,
      description:
        "The festival, the honest peak-bloom picture, and the public cameras on the crossings and approaches to the Tidal Basin. Free on WorldEye.",
      url: `/${SLUG}`,
      type: "website",
    },
  };
}

export default async function CherryBlossomsWashingtonDcPage() {
  const records = await loadCountryChunk("united-states");

  const approaches = camerasWithinKm(records, TIDAL_BASIN, 5);
  const region = camerasWithinKm(records, TIDAL_BASIN, 10);

  const all = new Set<string>();
  for (const c of [...approaches, ...region]) all.add(c.id);

  const live = edition ? editionIsLive(edition) : false;
  const days = edition ? daysUntil(edition.start, new Date()) : null;
  const globeUrl =
    buildGeoUrl({ lat: TIDAL_BASIN.lat, lng: TIDAL_BASIN.lng, radiusM: 5000 }, "") ??
    "/";

  const faqs = [
    {
      q: YEAR
        ? `When is the National Cherry Blossom Festival ${YEAR}?`
        : "When is the National Cherry Blossom Festival?",
      a: edition
        ? `The festival's announced dates are ${formatRange(edition)} — published by the National Cherry Blossom Festival itself. When the next year's dates are announced, this page takes them up; until then it shows the season in its typical window, ${CHERRY_BLOSSOM_TYPICAL.seasonWindow}.`
        : `The festival runs in the blossom season, ${CHERRY_BLOSSOM_TYPICAL.seasonWindow}. Its dates are announced by the National Cherry Blossom Festival ahead of each edition; when the next dates publish, this page takes them up.`,
    },
    {
      q: "When will peak bloom be?",
      a: `Nobody knows yet — and any page that gives you a firm date in October is guessing. Peak bloom is the trees' decision, driven by the winter and the early spring. ${CHERRY_BLOSSOM_TYPICAL.peakBloomNote} A warm February pulls it forward; a cold snap pushes it back. The festival is scheduled around the historical window precisely because the bloom cannot be scheduled.`,
    },
    {
      q: "Can I see the cherry blossoms on these cameras?",
      a: "Not the blossoms themselves — this page is explicit about it. No public camera in the WorldEye directory overlooks the Tidal Basin or its cherry trees. The cameras below are the public feeds nearest the Basin, and they are on the Virginia bank of the Potomac: the 14th Street Bridge, the Key Bridge approaches, the parkways and freeways that carry visitors across the river to the trees. For the blossoms you have to go — these cameras are for the getting there.",
    },
    {
      q: "How do the cameras help a blossom trip?",
      a: "Blossom season is one of Washington's great traffic events. The 5 km wall watches the crossings and approaches — I-395 and the 14th Street Bridge land almost at the Tidal Basin's edge — so you can see whether the drive in is moving before you commit to it, and how the festival crowds are flowing on the day.",
    },
    {
      q: "Are the cameras free to watch?",
      a: "Yes. Every camera on this page is a public feed, free to open on WorldEye — no account, no signup.",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: YEAR
      ? `Cherry Blossoms in Washington DC ${YEAR} — Festival & Live Cameras`
      : "Cherry Blossoms in Washington DC — Festival & Live Cameras",
    description:
      "The National Cherry Blossom Festival, the honest peak-bloom picture, and the public cameras on the bridges and approaches to Washington DC's Tidal Basin.",
    url: `${BASE}/${SLUG}`,
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  };

  const eventLd = edition
    ? {
        "@context": "https://schema.org",
        "@type": "Event",
        name: `National Cherry Blossom Festival ${edition.year}`,
        startDate: edition.start,
        endDate: edition.end,
        location: {
          "@type": "Place",
          name: "Tidal Basin, Washington, DC",
          geo: { "@type": "GeoCoordinates", latitude: 38.8839, longitude: -77.0348 },
        },
        description: `The National Cherry Blossom Festival ${edition.year} around Washington DC's Tidal Basin cherry trees. Peak bloom timing is forecast by the National Park Service each March.`,
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
          { label: "Cherry blossoms — Washington DC" },
        ]}
      />
      <Hero
        h1={
          YEAR
            ? `Cherry Blossoms in Washington DC ${YEAR} — Festival & Live Cameras`
            : "Cherry Blossoms in Washington DC — Festival & Live Cameras"
        }
        sub={
          edition
            ? live
              ? `The festival is on — ${formatRange(edition)} — around the Tidal Basin's cherry trees. The bridges and approaches, live. Free, no signup.`
              : `The National Cherry Blossom Festival runs ${formatRange(edition)}${days !== null && days > 0 ? ` — ${days} days to go` : ""}. Peak bloom is the trees' call; the cameras below watch the way in. Free, no signup.`
            : `The blossom season runs ${CHERRY_BLOSSOM_TYPICAL.seasonWindow}. Peak bloom is the trees' call; the cameras below watch the way in. Free, no signup.`
        }
      />
      <StatRow
        stats={[
          {
            value: edition ? formatRange(edition) : CHERRY_BLOSSOM_TYPICAL.seasonWindow,
            label: edition
              ? `National Cherry Blossom Festival ${edition.year} (announced)`
              : "the typical blossom season",
          },
          { value: String(approaches.length), label: "public cameras within 5 km of the Tidal Basin" },
          { value: "1912", label: "the year Tokyo gifted the Tidal Basin its trees" },
        ]}
      />
      <Intro
        paragraphs={[
          "For a few weeks each spring, Washington DC belongs to the cherry trees. The 3,000 trees Tokyo gifted the city in 1912 ring the Tidal Basin, and when they bloom — thousands of Yoshino cherries opening within days of each other — the National Mall becomes the most walked garden in America, and the National Cherry Blossom Festival runs around them.",
          edition
            ? `The festival's announced dates for ${edition.year} are ${formatRange(edition)}. What the dates cannot promise is the bloom itself: peak bloom — the day the greatest number of blossoms open — moves with the weather. ${CHERRY_BLOSSOM_TYPICAL.peakBloomNote} Plan around the festival window, trust the Park Service's March forecast over any page's October guess, this one included.`
            : `What no date can promise is the bloom itself: peak bloom — the day the greatest number of blossoms open — moves with the weather. ${CHERRY_BLOSSOM_TYPICAL.peakBloomNote} Plan around the season, and trust the Park Service's March forecast over any page's guess, this one included.`,
          "And the cameras, honestly: no public camera in the directory overlooks the Tidal Basin, so this page cannot show you a single blossom — it will not pretend otherwise. What it gathers is the nearest public coverage, across the Potomac in Virginia: the bridges and parkways that carry the festival's visitors to the trees. On a peak-bloom weekend those crossings are half the experience, and the cameras show them live: the 14th Street Bridge landing almost at the Basin's edge, Key Bridge into Georgetown, the I-395 and I-66 approaches.",
        ]}
      />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">The crossings & approaches — 5 km</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Every public camera in the directory within 5 km of the Tidal Basin, nearest first. They
          sit on the Virginia bank — the 14th Street Bridge, the George Washington Parkway
          corridor and the Arlington approaches — because that is where the public cameras near
          the Basin are. Festival traffic runs over every one of them.
        </p>
        <SkiCameraGrid
          cameras={approaches}
          initial={12}
          emptyNote="No public cameras in the directory currently cover the Tidal Basin approaches."
        />
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">The wider capital region — 10 km</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Every public camera within 10 km of the Tidal Basin: the crossings plus the Arlington,
          Alexandria and Maryland-shore approaches — the full map of getting to the blossoms, and
          of the city waking up around them in spring.
        </p>
        <SkiCameraGrid
          cameras={region}
          initial={12}
          emptyNote="No public cameras in the directory currently cover the Washington DC region."
        />
      </section>

      <AreaTable
        title="The two views — camera counts"
        rows={[
          { name: "Crossings & approaches (within 5 km of the Tidal Basin)", count: approaches.length },
          { name: "The wider capital region (within 10 km)", count: region.length },
        ]}
        note="Counts are public cameras in the WorldEye directory per selection; the 10 km wall includes the 5 km wall. No camera in either wall overlooks the Tidal Basin itself — the nearest public cameras are the Virginia-side crossings and approaches."
      />

      <HowTo
        title="How to use the cameras in blossom season"
        steps={[
          "Before you drive in, open the 5 km wall: the 14th Street Bridge and I-395 feeds show whether the crossing is moving or parked.",
          "Peak bloom is announced by the National Park Service, not by this page — when the forecast lands in March, the festival weekends either side of it are the busiest of the year.",
          "Weekday mornings are the local's window: the crossings run free and the Basin paths are at their quietest — check the wall and go early.",
          "Watch the weather on the region wall: the blossoms are fragile, and the first hard rain after peak ends the show — the cameras show that rain arriving over the river.",
          edition
            ? `The festival closes ${formatDateShort(edition.end)} — the last weekend is the final call for the season.`
            : "When the festival closes, the season is done — the same crossings carry the city back to its ordinary spring.",
        ]}
      />

      <FaqSection title="Cherry blossoms in Washington DC — FAQ" faqs={faqs} />

      <RelatedLinks
        title="Keep exploring"
        links={[
          { label: "Live webcams in Washington DC", href: "/city-webcams/washington-dc" },
          { label: "The Tidal Basin on the 3D globe", href: globeUrl },
          { label: "United States cameras", href: "/cameras/countries/united-states" },
          { label: "All live events", href: "/live-events" },
        ]}
      />

      <RelatedLinks
        title="The annual calendar"
        links={[
          { label: "New Year's Eve in Times Square — live cameras", href: "/new-years-eve-times-square" },
          { label: "Mardi Gras in New Orleans — live cameras", href: "/mardi-gras-new-orleans" },
          { label: "Oktoberfest in Munich — live cameras", href: "/oktoberfest-munich" },
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
