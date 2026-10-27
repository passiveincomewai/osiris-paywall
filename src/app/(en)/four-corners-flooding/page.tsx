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
  title: "Four Corners Flooding — San Juan River Flood Cameras, Live",
  description:
    "Flood warnings are active across the Four Corners after days of rain sent the San Juan River toward a historic crest near Shiprock. Live regional cameras along the US-491, US-160, US-550 and US-64 corridors. Free on WorldEye.",
  alternates: { canonical: `${BASE}/four-corners-flooding` },
  openGraph: {
    title: "Four Corners Flooding — San Juan River Flood Cameras, Live",
    description:
      "Live public cameras across the Four Corners region during the October 2026 San Juan River flooding — Durango, Shiprock, Cortez and Moab corridors. Free on WorldEye.",
    url: "/four-corners-flooding",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Four Corners Flooding — San Juan River Flood Cameras, Live",
  description:
    "Live public cameras along the highway corridors of the Four Corners region — southwestern Colorado, northwestern New Mexico and southeastern Utah — during the October 2026 flooding on the San Juan River.",
  url: `${BASE}/four-corners-flooding`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const FAQS = [
  {
    q: "What is happening in the Four Corners?",
    a: "Days of heavy rain — up to 5 inches in places since October 21, 2026 — have flooded parts of south-central Colorado, central New Mexico and southeastern Utah. The San Juan River surged toward historic crest levels near Shiprock, New Mexico, reported as its highest since 1935. There have been evacuations, water rescues and Colorado National Guard airlifts, and a tornado touched down in Santa Fe on October 24. Flood warnings run through October 27.",
  },
  {
    q: "Why are there so few cameras on this page?",
    a: "Because the Four Corners is rural, high-desert country and the public camera networks there are honestly sparse. The walls below use wide radii — 80 km around Shiprock, 40–50 km around the other towns — and still yield dozens of cameras, not hundreds. Farmington, New Mexico has no cameras in the directory within 40 km at all, so it has no wall rather than a dressed-up one. What exists here is a regional corridor view: the state DOT cameras along the highways the region actually travels.",
  },
  {
    q: "What can these cameras show me?",
    a: "Road conditions on the corridors that matter — US-491, US-160, US-550 and US-64 — and the look of the country around the river towns: whether highways are open and moving, standing water near crossings, and the weather still moving through. They cannot show the river's height at a specific gauge or certify any crossing as safe. River gauges and the National Weather Service carry those numbers and warnings.",
  },
  {
    q: "Where do official flood warnings come from?",
    a: "The National Weather Service (weather.gov) issues the flood warnings, and tribal, county and state emergency agencies issue evacuations and road closures. This page shows cameras; it does not issue warnings. Never drive through floodwater — desert flash floods can arrive under a clear sky from rain miles upstream.",
  },
  {
    q: "Are these cameras free to watch?",
    a: "Yes. Every camera on this page is a public feed in the WorldEye index and opens free — no account, no signup. Each wall is every catalogue camera within the stated distance of the town centre, nearest first.",
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
    key: "shiprock",
    scopeKey: "event-fc-shiprock",
    heading: "Shiprock & the San Juan River",
    blurb: (n) =>
      `${n} cameras within 80 km of Shiprock — the widest net on this page, cast around the town where the San Juan River is running toward its highest level since 1935. The wall watches the US-491 and US-64 corridors and the river-valley approaches; expect distance between cameras, because that is the country as it is.`,
    placeholder: "Search Shiprock area cameras…",
  },
  {
    key: "durango",
    scopeKey: "event-fc-durango",
    heading: "Durango & the Animas Valley",
    blurb: (n) =>
      `${n} cameras within 40 km of Durango, the densest wall in the region — the US-550 and US-160 corridors through southwestern Colorado, in the part of the state that took evacuations and National Guard airlifts during this flood.`,
    placeholder: "Search Durango cameras…",
  },
  {
    key: "cortez",
    scopeKey: "event-fc-cortez",
    heading: "Cortez & Mesa Verde country",
    blurb: (n) =>
      `${n} cameras within 40 km of Cortez — the US-491/US-160 junction town between Durango and Shiprock, on the route the whole region uses to move between Colorado and New Mexico.`,
    placeholder: "Search Cortez cameras…",
  },
  {
    key: "moab",
    scopeKey: "event-fc-moab",
    heading: "Moab & the Utah canyon country",
    blurb: (n) =>
      `${n} cameras within 50 km of Moab — the southeastern Utah end of the region, where the same rain system crossed the Colorado River canyon country and its one highway in and out, US-191.`,
    placeholder: "Search Moab cameras…",
  },
];

export default async function FourCornersFloodingPage() {
  const counts = new Map<string, number>();
  for (const w of WALLS) {
    counts.set(w.key, await countForDef(EXPLORE_SCOPES[w.scopeKey]));
  }
  const fmt = (n: number) => n.toLocaleString("en-US");
  const durango = counts.get("durango") ?? 0;
  const shiprock = counts.get("shiprock") ?? 0;
  const moab = counts.get("moab") ?? 0;

  const intro = [
    `The biggest weather story in the United States this week is in the desert. Up to 5 inches of rain since October 21 have flooded the Four Corners — flood warnings are active across south-central Colorado, central New Mexico and southeastern Utah, and the San Juan River is surging toward a historic crest near Shiprock, New Mexico, reported as its highest since 1935. Evacuations, water rescues and Colorado National Guard airlifts followed; a tornado touched down in Santa Fe on October 24. This page gathers the region's live public cameras — ${fmt(durango)} within 40 km of Durango, ${fmt(shiprock)} within a wide 80 km of Shiprock, ${fmt(moab)} around Moab — so the corridors the region travels can be checked before anyone drives them.`,
    "An honest note about density, up front: this is not a city wall. The Four Corners is high-desert country where the state DOT networks are spread a day's drive apart, and the camera counts above are what a wide regional net honestly yields — dozens, not hundreds. Farmington, in the middle of the story, has no cameras in the directory within 40 km at all, so it appears in the text and not as a wall. What the page offers is the thing that is actually useful in a desert flood: the highway corridors — US-491, US-160, US-550, US-64 — watched live, town by town.",
    "Desert flooding works differently from coastal flooding. The San Juan and its tributaries drain an enormous, sparsely gauged basin; rain that fell on red rock miles away arrives as a wall of water in an arroyo under blue sky. That is why the framing here is road conditions — which routes are passable, where the water is still rising — rather than spectacle, and why the official warning box below matters more than any camera on the page.",
    "Flood warnings for the region run through October 27. This page stays up as the region's standing flood-watch wall for the drainages it covers.",
  ];

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live webcams", href: "/live-webcams" },
          { label: "Four Corners flooding" },
        ]}
      />
      <Hero
        h1="Four Corners Flooding — The San Juan River, Live"
        sub="Flood warnings across Colorado, New Mexico and Utah; the San Juan River near a historic crest at Shiprock. Check the region's highway corridors live — free, no signup."
      />
      <StatRow
        stats={[
          { value: fmt(durango), label: "cameras within 40 km of Durango" },
          { value: "1935", label: "the San Juan at Shiprock is at its highest since" },
          { value: "Oct 27", label: "flood warnings run through" },
        ]}
      />
      <Intro paragraphs={intro} />

      <section className="mt-12 rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/[0.05] p-6 md:p-7 max-w-3xl mx-auto">
        <h2 className="text-lg md:text-xl font-bold">Official warnings come first</h2>
        <div className="mt-3 space-y-3 text-sm text-white/65 leading-relaxed">
          <p>
            Flood warnings, evacuations and road closures are issued by the{" "}
            <a
              href="https://www.weather.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00E5FF] hover:underline"
            >
              National Weather Service
            </a>{" "}
            and tribal, county and state emergency agencies — not by any camera site.
            Check the current warning for your exact location before you travel, and
            never drive through flooded roads or washes: desert flash floods arrive
            fast and carry debris.
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
            explorerId={`fc-${w.key}`}
          />
        </section>
      ))}

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-5">The event at a glance</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="font-semibold text-white/90">The rain</h3>
            <p className="text-sm text-white/55 mt-2 leading-relaxed">
              Up to 5 inches since October 21 across the Four Corners states — an
              extraordinary total for high-desert country in October, falling on ground
              and drainages built for a fraction of it.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="font-semibold text-white/90">The river</h3>
            <p className="text-sm text-white/55 mt-2 leading-relaxed">
              The San Juan River near Shiprock surged toward historic crest levels,
              reported as the highest since 1935 — the benchmark flood in the
              river&apos;s recorded history for this reach.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="font-semibold text-white/90">The response</h3>
            <p className="text-sm text-white/55 mt-2 leading-relaxed">
              Evacuations and water rescues across the region, with Colorado National
              Guard airlifts in southwestern Colorado. A tornado also touched down in
              Santa Fe on October 24 as the same system crossed New Mexico.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="font-semibold text-white/90">The honest coverage note</h3>
            <p className="text-sm text-white/55 mt-2 leading-relaxed">
              Farmington, New Mexico — in the middle of the affected area — has no
              public cameras in this directory within 40 km, so it has no wall here.
              The nearest coverage is the Shiprock and Durango walls above.
            </p>
          </div>
        </div>
      </section>

      <HowTo
        title="How to check your route"
        steps={[
          "Find the wall nearest your route — Shiprock for US-491/US-64, Durango for US-550, Cortez for the Colorado–New Mexico junction, Moab for US-191.",
          "Check the corridor cameras for standing water, closures and whether traffic is moving — then confirm with the National Weather Service warning and your state DOT before setting out.",
          "Treat every wash and low-water crossing as closed unless officials say otherwise; desert water rises faster than it drains.",
          "Recheck before the return trip: flood crests move downstream for days after the rain stops.",
        ]}
      />

      <FaqSection title="Four Corners flooding — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="More live WorldEye"
        links={[
          { label: "Atmospheric river watch", href: "/atmospheric-river-watch" },
          { label: "California flood cams", href: "/california-flood-cams" },
          { label: "Colorado traffic cameras", href: "/us-traffic-cameras/colorado" },
          { label: "Utah traffic cameras", href: "/us-traffic-cameras/utah" },
          { label: "Live weather tracker", href: "/weather-tracker" },
        ]}
      />

      <TrialCtaSection utmSource="four-corners-flooding" />

      <CtaRow backHref="/live-webcams" backLabel="All live webcams" />
    </PageShell>
  );
}
