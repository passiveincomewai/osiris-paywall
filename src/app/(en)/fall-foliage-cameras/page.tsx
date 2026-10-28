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
import { FOLIAGE_REGIONS, type FoliageRegion } from "@/lib/seasonal-events";
import { buildGeoUrl } from "@/lib/share/links";

export const revalidate = 86400;

const SLUG = "fall-foliage-cameras";

export const metadata: Metadata = {
  title: "Fall Foliage Cameras — Live Autumn Colour, Region by Region",
  description:
    "Live public cameras in America's great foliage country — Aspen's high country, Vermont, the White Mountains, Acadia, Shenandoah, Asheville and the Smokies — with each region's typical peak window, honestly labelled as a range, not a forecast. Free on WorldEye.",
  alternates: { canonical: `${BASE}/${SLUG}` },
  openGraph: {
    title: "Fall Foliage Cameras — Live Autumn Colour, Region by Region",
    description:
      "Region-by-region live cameras for the autumn colour season, from Colorado's aspens in September to the Smokies' valleys in November. Free on WorldEye.",
    url: `/${SLUG}`,
    type: "website",
  },
};

const FAQS = [
  {
    q: "When is peak foliage?",
    a: "It depends where — that is the whole shape of the season, and the table below gives each region's typical window. The colour starts high and north in mid-September (Aspen's stands, northern Vermont) and walks south and downhill for six weeks, finishing in the Smokies' and Shenandoah's valleys toward early November. Treat the windows as history, not a forecast: a wet summer, an early frost or a warm October can move a region's peak by a week or more, and the cameras are how you check what is actually happening.",
  },
  {
    q: "Can a camera really show fall colour?",
    a: "At landscape scale, yes — and that is the scale foliage happens at. These are ski-area, pass, valley and harbour cameras in the middle of famous colour country: whole hillsides of maple and aspen read clearly, especially in sun. What a camera cannot do is the close-up — the single perfect red maple is a walk, not a webcam. Bright midday light shows colour best; flat overcast days dull it on camera just as they do in person.",
  },
  {
    q: "Which region has the most cameras?",
    a: "Asheville and the Blue Ridge, by a wide margin — the deepest wall on this page. Shenandoah and Skyline Drive country follows. The thinnest wall is the White Mountains of New Hampshire, stated as it is in its section: famous colour, sparse cameras.",
  },
  {
    q: "Where does the colour start?",
    a: "Colorado's high country and northern New England, in mid-to-late September. Aspen's gold comes first on this page; Stowe and the White Mountains turn as September closes; the wave then rolls down through Acadia and central Vermont in early October and into the Blue Ridge and Smokies by mid-to-late October.",
  },
  {
    q: "Are the foliage cameras free to watch?",
    a: "Yes. Every camera on this page is a public feed, free to open on WorldEye — no account, no signup.",
  },
];

export default async function FallFoliageCamerasPage() {
  const records = await loadCountryChunk("united-states");

  const walls = new Map<string, CountryCamera[]>();
  const union = new Set<string>();
  for (const r of FOLIAGE_REGIONS) {
    const wall = camerasWithinKm(records, r.anchor, r.radiusKm);
    walls.set(r.key, wall);
    for (const c of wall) union.add(c.id);
  }
  const deepest = FOLIAGE_REGIONS.reduce((a, b) =>
    (walls.get(a.key)?.length ?? 0) >= (walls.get(b.key)?.length ?? 0) ? a : b,
  );
  const globeUrl =
    buildGeoUrl({ lat: 35.5946, lng: -82.5545, radiusM: 30000 }, "") ?? "/";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Fall Foliage Cameras — Live Autumn Colour, Region by Region",
    description:
      "Live public cameras in eight foliage regions — Colorado's high country, Vermont, New Hampshire, Maine, Virginia, North Carolina and Tennessee — with each region's typical peak window.",
    url: `${BASE}/${SLUG}`,
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  };

  const regionSection = (r: FoliageRegion) => {
    const wall = walls.get(r.key) ?? [];
    return (
      <section key={r.key} className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">{r.name}</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          {r.blurb} Typical peak: {r.peakWindow} — a range from most years, not a forecast; the
          real peak moves with weather and elevation. {wall.length} public cameras within{" "}
          {r.radiusKm} km, nearest first.
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
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live events", href: "/live-events" },
          { label: "Fall foliage cameras" },
        ]}
      />
      <Hero
        h1="Fall Foliage Cameras — Live Autumn Colour, Region by Region"
        sub="Eight great foliage regions on live public cameras — from Aspen's gold in September to the last Smokies valleys in November. Free, no signup."
      />
      <StatRow
        stats={[
          { value: String(union.size), label: "public cameras across the eight regions" },
          { value: "8", label: "foliage regions, north and high country first" },
          { value: "Mid-Sep – early Nov", label: "the season's span across the regions" },
        ]}
      />
      <Intro
        paragraphs={[
          "Autumn colour is a travelling wave. It breaks first where the continent is high or far north — the aspen stands above Aspen, the maples of northern Vermont — in the second half of September, and then it walks: down the Green Mountains and the Whites, across Acadia's granite shore, and south along the Blue Ridge until, six weeks later, the last of it drains into the valleys of the Smokies. No single week is 'peak foliage' in America; there is only ever a place where it is peaking now. This page is built around that fact.",
          `Each region below carries its own wall of live public cameras — ${union.size} in all — and its typical peak window, taken from the run of most years. The windows are history, not prophecy: weather writes the real schedule, a warm spell can hold a hillside green for an extra fortnight, and the honest way to know is to look. That is what the cameras are for. Check a region weekly through its window and you will watch the colour arrive, crest and blow off the trees.`,
          `The deepest coverage sits in the southern Appalachians — ${deepest.name} leads the page — where resort and parkway cameras lace the ridges. New England's walls are smaller and their counts are stated plainly where they stand; the White Mountains, for all their fame, keep the sparsest wall here. What every region shares is the scale: these are landscape cameras, and foliage is a landscape event.`,
        ]}
      />

      {FOLIAGE_REGIONS.map(regionSection)}

      <AreaTable
        title="The regions — typical peak windows and camera counts"
        rows={FOLIAGE_REGIONS.map((r) => ({
          name: `${r.name} — peak typically ${r.peakWindow}`,
          count: walls.get(r.key)?.length ?? 0,
        }))}
        note="Windows are the typical range from most years, labelled as such — the real peak moves with weather and elevation. Counts are public cameras in the WorldEye directory within each region's stated radius; neighbouring Vermont walls can share a camera, and the page total counts each camera once."
      />

      <HowTo
        title="How to follow the colour on the cameras"
        steps={[
          "Start at the top of the page in September: Aspen and northern Vermont turn first, and their walls show the season's opening frame.",
          "Work south as the weeks pass — Acadia and central Vermont in early October, Shenandoah and Asheville from mid-October, the Smokies last and longest.",
          "Check a region two or three times a week inside its window; colour can crest and blow off within days once it turns.",
          "Watch at midday local time for the truest colour, and after a clear cold night for the sharpest light.",
          "When the last valley wall goes bare, the season hands off: the same ski-country cameras turn to first snow — the first-snow page linked below picks the story up.",
        ]}
      />

      <FaqSection title="Fall foliage cameras — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="Keep exploring"
        links={[
          { label: "Asheville & the Blue Ridge on the 3D globe", href: globeUrl },
          { label: "First snow — the season's next act", href: "/first-snow-2026" },
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
