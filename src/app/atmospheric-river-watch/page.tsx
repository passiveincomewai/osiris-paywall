import type { Metadata } from "next";
import {
  BASE,
  JsonLd,
  Breadcrumb,
  Hero,
  Intro,
  StatRow,
  HowTo,
  FaqSection,
  FaqJsonLd,
  RelatedLinks,
  CtaRow,
  PageShell,
} from "@/components/directory-page";
import DirectoryExplorer from "@/components/DirectoryExplorer";
import TrialCtaSection from "@/components/TrialCtaSection";
import { EXPLORE_SCOPES, countForDef } from "@/lib/explore-data";

export const metadata: Metadata = {
  title: "Atmospheric River Watch — West Coast Storm Cameras, Live",
  description:
    "An intensifying El Niño is setting up a wet, stormy West Coast winter. Watch the coast atmospheric rivers hit first — Seattle, Portland, San Francisco, Sacramento, Los Angeles and San Diego live cameras. Free on WorldEye.",
  alternates: { canonical: `${BASE}/atmospheric-river-watch` },
  openGraph: {
    title: "Atmospheric River Watch — West Coast Storm Cameras, Live",
    description:
      "Live public cameras along the US West Coast and its river corridors for the 2026–27 atmospheric river season. Free on WorldEye.",
    url: "/atmospheric-river-watch",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Atmospheric River Watch — West Coast Storm Cameras, Live",
  description:
    "Live public cameras along the US West Coast — Washington, Oregon and California coastal cities, the Central Valley and the Sierra Nevada passes — for the atmospheric river season.",
  url: `${BASE}/atmospheric-river-watch`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const FAQS = [
  {
    q: "What is an atmospheric river?",
    a: "A long, narrow corridor of concentrated water vapour in the sky — in effect, a river in the atmosphere, carrying moisture from the tropics toward the poles. When one makes landfall on the West Coast and stalls against the coastal ranges and the Sierra Nevada, it can deliver a large share of a region's annual rainfall in a few days: flooding in the valleys, feet of snow at altitude, and mudslide risk on burn scars.",
  },
  {
    q: "When is atmospheric river season?",
    a: "Roughly November through March on the US West Coast. Forecasters reporting in October 2026 say an intensifying El Niño is setting up a wet, stormy winter, with the season's first powerful atmospheric rivers expected within a few weeks of late October and the recurring threat running through January and February. Individual storms are only predictable days ahead — which is why this page is a standing watch, not a one-event page.",
  },
  {
    q: "What can these cameras actually show during a storm?",
    a: "The coast as the storm arrives: surf and harbor water, rain on the bayshore and waterfronts, traffic on the coastal highways, snow accumulating at the Sierra passes, and — after the rain — how full the rivers and reservoirs look from the bridges and corridor cameras near them. Cameras show conditions, not measurements: river gauges and the National Weather Service carry the numbers and the warnings.",
  },
  {
    q: "Where do official flood warnings come from?",
    a: "The National Weather Service (weather.gov) issues flood watches and warnings, and local emergency agencies issue evacuations and road closures. This page shows cameras; it does not issue warnings, and a calm-looking camera never overrides an official warning for your area. Never drive through floodwater.",
  },
  {
    q: "Are these cameras free to watch?",
    a: "Yes. Every camera on this page is a public feed in the WorldEye index and opens free — no account, no signup. Each wall is every catalogue camera within the stated distance of the city centre, nearest first.",
  },
];

interface WallDef {
  key: string;
  scopeKey: string;
  heading: string;
  blurb: (count: string) => string;
  placeholder: string;
}

const WALLS: WallDef[] = [
  {
    key: "seattle",
    scopeKey: "event-ar-seattle",
    heading: "Seattle & Puget Sound",
    blurb: (n) =>
      `${n} cameras within 30 km of downtown Seattle — the waterfront, the ship canal, the floating bridges and the freeway corridors where the northern storm track makes landfall.`,
    placeholder: "Search Seattle cameras…",
  },
  {
    key: "portland",
    scopeKey: "event-ar-portland",
    heading: "Portland & the Columbia",
    blurb: (n) =>
      `${n} cameras within 30 km of downtown Portland — the Willamette and Columbia river bridges, the gorge approaches and the valley freeways that flood first when the rivers rise.`,
    placeholder: "Search Portland cameras…",
  },
  {
    key: "eureka",
    scopeKey: "event-ar-eureka",
    heading: "Eureka & the North Coast",
    blurb: (n) =>
      `${n} cameras within 40 km of Eureka — the thinnest wall on this page, because California's North Coast is rural camera country. What is here watches Humboldt Bay, Highway 101 and the Eel River corridor, where atmospheric rivers arrive earliest and hardest.`,
    placeholder: "Search Eureka & North Coast cameras…",
  },
  {
    key: "san-francisco",
    scopeKey: "event-ca-flood-san-francisco",
    heading: "San Francisco Bay Area",
    blurb: (n) =>
      `${n} cameras within 30 km of downtown San Francisco — the bayshore, the Embarcadero, the Marin shore and the bay bridges. The same wall that watched October's record king tides, now on storm watch for the winter.`,
    placeholder: "Search San Francisco Bay Area cameras…",
  },
  {
    key: "sacramento",
    scopeKey: "event-ar-sacramento",
    heading: "Sacramento & the Central Valley",
    blurb: (n) =>
      `${n} cameras within 30 km of Sacramento — the Sacramento and American River corridors and the valley freeways. This is where coastal rain becomes river water: the valley floor is the flood story of every big atmospheric river.`,
    placeholder: "Search Sacramento cameras…",
  },
  {
    key: "sierra",
    scopeKey: "event-ar-sierra",
    heading: "The Sierra Nevada passes",
    blurb: (n) =>
      `${n} cameras within 40 km of Truckee — Donner Pass, the I-80 and US-50 corridors and the high-country towns. The same storm that floods the coast buries these passes: watch the rain-snow line climb and fall as each system arrives.`,
    placeholder: "Search Sierra Nevada cameras…",
  },
  {
    key: "los-angeles",
    scopeKey: "event-ca-flood-los-angeles",
    heading: "Los Angeles coast",
    blurb: (n) =>
      `${n} cameras within 30 km of Santa Monica — Malibu, the beach cities and the canyon roads below the burn scars, where forecasters watch debris-flow risk most closely in the first storms after fire.`,
    placeholder: "Search Los Angeles coast cameras…",
  },
  {
    key: "san-diego",
    scopeKey: "event-ca-flood-san-diego",
    heading: "San Diego",
    blurb: (n) =>
      `${n} cameras within 30 km of downtown San Diego — Mission Bay, the harbor and the river valley crossings at the southern end of the storm track.`,
    placeholder: "Search San Diego cameras…",
  },
];

export default async function AtmosphericRiverWatchPage() {
  const counts = new Map<string, number>();
  for (const w of WALLS) {
    counts.set(w.key, await countForDef(EXPLORE_SCOPES[w.scopeKey]));
  }
  const fmt = (n: number) => n.toLocaleString("en-US");
  const seattle = counts.get("seattle") ?? 0;
  const portland = counts.get("portland") ?? 0;
  const sf = counts.get("san-francisco") ?? 0;

  const intro = [
    `The West Coast's wet season runs on atmospheric rivers, and the winter ahead is shaping up wet: forecasters say an intensifying El Niño is setting up a stormy season, with the first powerful atmospheric rivers expected within a few weeks and the recurring threat running through January and February. This page is the season-long watch — live public cameras from Puget Sound to San Diego, arranged north to south in the order the storms arrive: ${fmt(seattle)} around Seattle, ${fmt(portland)} around Portland, ${fmt(sf)} around San Francisco Bay, and walls for the North Coast, Sacramento, the Sierra passes, Los Angeles and San Diego below. Every feed is free to watch, no signup.`,
    "An atmospheric river is exactly what it sounds like: a river in the sky, a narrow corridor of tropical moisture thousands of kilometres long. When one points at the coast and stalls, the coastal ranges and the Sierra Nevada wring it out — valley flooding on one side of the range, blizzard snowfall on the other, and mudslide risk wherever a recent burn scar meets saturated soil. The remnants of Hurricane Rachel already flooded Southern California earlier in October, on a day Las Vegas recorded its wettest October on record; that was the overture, not the season.",
    "The cameras are the ground truth underneath the forecasts. Harbor and bayshore feeds show the surf and the water level as a system arrives; river-corridor and bridge cameras show the valleys answering hours later; the Sierra pass cameras show the rain-snow line deciding, storm by storm, whether this one is a flood event or a snowpack event. Both matter — California's reservoirs and its flood control are the same system viewed from different ends.",
    "One discipline applies everywhere on this page: cameras show conditions, they do not issue warnings. Flood watches, warnings and evacuation orders come from the National Weather Service and local emergency agencies. Check them first, watch second — and never drive through floodwater.",
  ];

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live webcams", href: "/live-webcams" },
          { label: "Atmospheric river watch" },
        ]}
      />
      <Hero
        h1="Atmospheric River Watch — The West Coast, Live"
        sub="An El Niño winter is setting up wet and stormy. Watch the coast the storms hit first — live cameras from Puget Sound to San Diego, all season. Free, no signup."
      />
      <StatRow
        stats={[
          { value: fmt(seattle + portland + sf), label: "cameras on the Seattle–Portland–San Francisco coast" },
          { value: "Nov–Mar", label: "the atmospheric river season" },
          { value: "8", label: "coastal and river-corridor walls below" },
        ]}
      />
      <Intro paragraphs={intro} />

      <section className="mt-12 rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/[0.05] p-6 md:p-7 max-w-3xl mx-auto">
        <h2 className="text-lg md:text-xl font-bold">Official warnings come first</h2>
        <div className="mt-3 space-y-3 text-sm text-white/65 leading-relaxed">
          <p>
            Flood watches, warnings and evacuation orders are issued by the{" "}
            <a
              href="https://www.weather.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00E5FF] hover:underline"
            >
              National Weather Service
            </a>{" "}
            and local emergency agencies — not by any camera site. Check the current
            warning for your exact location before you travel, and never drive through
            flooded roads: a foot of moving water can float a car.
          </p>
        </div>
      </section>

      {WALLS.map((w) => (
        <section key={w.key} className="mt-12">
          <h2 className="text-xl md:text-2xl font-bold mb-3">{w.heading}</h2>
          <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
            {w.blurb(fmt(counts.get(w.key) ?? 0))}
          </p>
          <DirectoryExplorer
            scopeKey={w.scopeKey}
            scopeLabel={EXPLORE_SCOPES[w.scopeKey].label}
            groupBy="none"
            searchPlaceholder={w.placeholder}
            explorerId={`ar-${w.key}`}
          />
        </section>
      ))}

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-5">Reading a storm on cameras</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="font-semibold text-white/90">The coast answers first</h3>
            <p className="text-sm text-white/55 mt-2 leading-relaxed">
              Surf, harbor chop and driving rain show up on the coastal walls hours
              before the rivers respond. Watch Seattle, Portland and the North Coast
              first for a northern-track storm; the California walls lead a southern one.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="font-semibold text-white/90">Then the valleys</h3>
            <p className="text-sm text-white/55 mt-2 leading-relaxed">
              Sacramento and the Central Valley walls are the flood story: bridge and
              corridor cameras show how the rivers and the freeways are carrying the
              runoff a day after the rain peaks.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="font-semibold text-white/90">The rain-snow line</h3>
            <p className="text-sm text-white/55 mt-2 leading-relaxed">
              At Truckee and the Sierra passes, the same storm is either flood or
              snowpack depending on where the freezing level sits. The pass cameras
              show which one it is, chain controls and all.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="font-semibold text-white/90">Burn scars are the risk map</h3>
            <p className="text-sm text-white/55 mt-2 leading-relaxed">
              The season&apos;s first big storm, on October 21–22, put flood watches
              over the Malibu and Santa Monica Mountains burn scars. After fire,
              moderate rain on bare slopes is a debris-flow threat — the Los Angeles
              wall watches those canyon mouths.
            </p>
          </div>
        </div>
      </section>

      <HowTo
        title="How to follow a landfalling storm"
        steps={[
          "Start at the top of the page and work south — the walls are ordered the way the weather travels, northern landfall first.",
          "Check the coastal wall nearest the forecast landfall point for the arrival itself: surf, harbor water and the first hard rain.",
          "Move inland a few hours later: the Sacramento and valley walls show the runoff, and the Sierra walls show whether the high country is taking snow or rain.",
          "Before driving anywhere, confirm the National Weather Service warnings for your exact area — the cameras inform, they never clear a route.",
          "Come back between storms: this page stays up all season, and back-to-back atmospheric rivers are when the flooding compounds.",
        ]}
      />

      <FaqSection title="Atmospheric river watch — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="More live WorldEye"
        links={[
          { label: "California flood cams — king tides", href: "/california-flood-cams" },
          { label: "California fire cameras", href: "/california-fire-cameras" },
          { label: "Hurricane tracker", href: "/hurricane-tracker" },
          { label: "Live weather tracker", href: "/weather-tracker" },
          { label: "Beach webcams", href: "/beach-webcams" },
        ]}
      />

      <TrialCtaSection utmSource="atmospheric-river-watch" />

      <CtaRow backHref="/live-webcams" backLabel="All live webcams" />
    </PageShell>
  );
}
