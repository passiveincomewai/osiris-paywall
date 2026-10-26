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
  title: "California Flood Cams — King Tide Flooding, Live Coast Cameras",
  description:
    "Record king tides are flooding California's coast from San Francisco to San Diego, with advisories through Thursday. Watch the water live on public coastal cameras — plus Miami and Charleston. Free on WorldEye.",
  alternates: { canonical: `${BASE}/california-flood-cams` },
  openGraph: {
    title: "California Flood Cams — King Tide Flooding, Live Coast Cameras",
    description:
      "Live public cameras along the king-tide-flooded California coast — San Francisco, Los Angeles, Orange County, San Diego — with Miami and Charleston. Free on WorldEye.",
    url: "/california-flood-cams",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "California Flood Cams — King Tide Flooding, Live Coast Cameras",
  description:
    "Live public cameras along the California coast during the late-October 2026 king tides and coastal flood advisories, with Southeast-coast sections for Miami and Charleston.",
  url: `${BASE}/california-flood-cams`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const FAQS = [
  {
    q: "What is a king tide?",
    a: "A king tide is an exceptionally high tide that happens when the sun and moon line up with Earth and the moon is near its closest approach (perigee), so their combined pull stacks the ocean higher than a normal high tide. King tides are predictable months ahead, they are not storms — and in low-lying coastal streets they are enough on their own to push seawater over seawalls, into harbors and across roads. They are also a preview: the places that flood on a calm king-tide day are the places everyday high tides will reach as sea levels rise.",
  },
  {
    q: "How long do the California flood advisories last?",
    a: "For this event, National Weather Service coastal flood advisories and warnings run from San Francisco south to San Diego through Thursday, October 29, 2026, peaking around each day's high tide. Flooding comes and goes with the tide cycle — a street can be under water at 10 AM and dry by noon. Always check the current advisory for your exact location at weather.gov before travelling.",
  },
  {
    q: "Where do official flood warnings come from?",
    a: "The National Weather Service (weather.gov) is the authority for coastal flood advisories, warnings and statements in the United States, and local emergency management agencies issue road closures and safety instructions. This page shows cameras; it does not issue warnings, and a dry-looking camera never overrides an official warning for your area.",
  },
  {
    q: "Can these cameras show me flooded streets?",
    a: "Some can. Harbor, bayshore and waterfront cameras show water levels directly — water over a seawall, a swamped parking lot, waves reaching the road. Road and traffic cameras a street or two inland show whether routes are passable. What a camera can't do is certify your specific street: check your local cameras, then confirm with official sources before driving anywhere near flooded roads. Never drive through floodwater.",
  },
  {
    q: "Why are Miami and Charleston on a California flood page?",
    a: "Because the same king-tide cycle is flooding the Southeast coast the same week — major-to-moderate coastal flooding is reported from Miami to Charleston, two of the most tide-prone cities in the country. Their sections are below the California walls.",
  },
  {
    q: "Are these cameras free to watch?",
    a: "Yes. Every camera here is a public feed in the WorldEye index and opens free — no account, no signup. Each wall is every catalogue camera within the stated distance of the city centre, nearest first.",
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
    key: "san-francisco",
    scopeKey: "event-ca-flood-san-francisco",
    heading: "San Francisco Bay Area",
    blurb: (n) =>
      `${n} cameras within 30 km of downtown San Francisco — the bayshore, the Embarcadero waterfront, Sausalito and the Marin shore, where king tides spill onto bayfront paths and low roads first.`,
    placeholder: "Search San Francisco Bay Area cameras…",
  },
  {
    key: "los-angeles",
    scopeKey: "event-ca-flood-los-angeles",
    heading: "Los Angeles coast",
    blurb: (n) =>
      `${n} cameras within 30 km of Santa Monica — Malibu, Santa Monica, Venice and the South Bay beach cities. Los Angeles recorded record-high king-tide water levels this week, above 2.50 ft in LA, San Diego and Santa Monica.`,
    placeholder: "Search Los Angeles coast cameras…",
  },
  {
    key: "orange-county",
    scopeKey: "event-ca-flood-orange-county",
    heading: "Orange County",
    blurb: (n) =>
      `${n} cameras within 25 km of Newport Beach — the Balboa Peninsula, Newport and Huntington harbors and the beach cities, where tide water backs up through storm drains into the lowest streets.`,
    placeholder: "Search Orange County cameras…",
  },
  {
    key: "san-diego",
    scopeKey: "event-ca-flood-san-diego",
    heading: "San Diego",
    blurb: (n) =>
      `${n} cameras within 30 km of downtown San Diego — Mission Bay, Pacific Beach, Coronado and the harbor, among the first places in the county to take tide water over the curb.`,
    placeholder: "Search San Diego cameras…",
  },
  {
    key: "miami",
    scopeKey: "event-ca-flood-miami",
    heading: "Miami & South Florida",
    blurb: (n) =>
      `${n} cameras within 30 km of downtown Miami. The same tide cycle flooding California is producing major-to-moderate coastal flooding on the Southeast coast this week — Miami's "sunny-day flooding" is the king tide's signature on the Atlantic side.`,
    placeholder: "Search Miami cameras…",
  },
  {
    key: "charleston",
    scopeKey: "event-ca-flood-charleston",
    heading: "Charleston",
    blurb: (n) =>
      `${n} cameras within 30 km of downtown Charleston — the Battery and the peninsula, a city so tide-prone that downtown streets flood on the highest tides of an ordinary month.`,
    placeholder: "Search Charleston cameras…",
  },
];

export default async function CaliforniaFloodCamsPage() {
  const counts = new Map<string, number>();
  for (const w of WALLS) {
    counts.set(w.key, await countForDef(EXPLORE_SCOPES[w.scopeKey]));
  }
  const fmt = (n: number) => n.toLocaleString("en-US");
  const sf = counts.get("san-francisco") ?? 0;
  const la = counts.get("los-angeles") ?? 0;
  const sd = counts.get("san-diego") ?? 0;

  const intro = [
    `California's coast is flooding on schedule this week. Record-high king tides are pushing seawater over seawalls, into harbors and across low coastal roads from San Francisco to San Diego, and National Weather Service coastal flood advisories for the California coast run through Thursday, October 29. This page gathers the live public cameras along that coast — ${fmt(sf)} around the San Francisco Bay Area, ${fmt(la)} along the Los Angeles coast, ${fmt(sd)} around San Diego, plus Orange County and the also-flooding Southeast — so you can see the water where you live, or where you're headed. Every feed is free to watch, no signup.`,
    "A king tide is not a storm. It is the predictable peak of the tide cycle — the sun and moon aligned, the moon near perigee — stacking the ocean a foot or more above an ordinary high tide. On a calm, sunny morning, that is enough to flood the lowest streets of Newport Beach, swamp bayshore paths in San Francisco, and put water over the curb in San Diego. Forecasters use king tides as a preview of ordinary future high tides, which is why a flood with no rain makes news.",
    "This week the tides land on a coastline already soaked: California's first major storm of the season arrived October 21–22, with flood watches over the Malibu and Santa Monica Mountains burn scars and downtown Los Angeles on track for its wettest October since 2009. Saturated ground and swollen storm drains give the tide water fewer places to go.",
    "The same tide cycle is flooding the Atlantic side the same week — major-to-moderate coastal flooding from Miami to Charleston — so both of those cities have walls below the California sections. One discipline applies everywhere on this page: the cameras are for situational awareness. Official advisories and warnings come from the National Weather Service, and if water is over a road, the only right move is to turn around — never drive through it.",
  ];

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live webcams", href: "/live-webcams" },
          { label: "California flood cams" },
        ]}
      />
      <Hero
        h1="California Flood Cams — King Tides, Live"
        sub="Record king tides are flooding the coast from San Francisco to San Diego, advisories through Thursday. Watch the water live — free, no signup."
      />
      <StatRow
        stats={[
          { value: fmt(sf + la + sd), label: "cameras on the SF–LA–San Diego coast" },
          { value: "Oct 29", label: "advisories run through Thursday" },
          { value: "2.50 ft+", label: "water levels recorded in LA & San Diego" },
        ]}
      />
      <Intro paragraphs={intro} />

      <section className="mt-12 rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/[0.05] p-6 md:p-7 max-w-3xl mx-auto">
        <h2 className="text-lg md:text-xl font-bold">Official warnings come first</h2>
        <div className="mt-3 space-y-3 text-sm text-white/65 leading-relaxed">
          <p>
            Coastal flood advisories, warnings and road closures are issued by the{" "}
            <a
              href="https://www.weather.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00E5FF] hover:underline"
            >
              National Weather Service
            </a>{" "}
            and local emergency agencies — not by any camera site. Check the current
            advisory for your exact location before you travel, and never drive through
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
            explorerId={`flood-${w.key}`}
          />
        </section>
      ))}

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-5">Understanding this flood</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="font-semibold text-white/90">What a king tide is</h3>
            <p className="text-sm text-white/55 mt-2 leading-relaxed">
              The highest tides of the year, when the sun and moon&apos;s pulls align and
              the moon is closest to Earth. They arrive on a schedule published months in
              advance — which is why a flood can be headline news on a day without a
              cloud in the sky.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="font-semibold text-white/90">Where it floods first</h3>
            <p className="text-sm text-white/55 mt-2 leading-relaxed">
              Harbor edges, bayshore paths, beach parking lots and the lowest streets
              behind them — the places built at the old high-tide line. Watch the harbor
              and bayshore cameras around each day&apos;s high tide for the peak.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="font-semibold text-white/90">Why this week is worse</h3>
            <p className="text-sm text-white/55 mt-2 leading-relaxed">
              The season&apos;s first big storm soaked the coast on October 21–22, days
              before the tide peak. Saturated ground, full storm drains and runoff from
              burn-scar hillsides mean the tide water stacks on top of water already
              there.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="font-semibold text-white/90">What happens next</h3>
            <p className="text-sm text-white/55 mt-2 leading-relaxed">
              King tides return in cycles through the winter, and the El Niño pattern
              setting up for this season is expected to bring California a stormy few
              months. This page stays live as the coast&apos;s standing flood-watch wall.
            </p>
          </div>
        </div>
      </section>

      <HowTo
        title="How to check your coast"
        steps={[
          "Find your city in the walls above — each is every public camera within the stated distance of the city centre, nearest first.",
          "Check the harbor, bayshore and beach cameras around high tide; tide flooding peaks within an hour or so either side of it.",
          "Use the road and traffic cameras just inland to judge whether your route is passable — then confirm with the National Weather Service advisory for your location.",
          "Recheck at the next high tide rather than assuming it is over: this event floods on a twice-daily cycle through Thursday.",
        ]}
      />

      <FaqSection title="California flood cams — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="More live WorldEye"
        links={[
          { label: "Beach webcams", href: "/beach-webcams" },
          { label: "California fire cameras", href: "/california-fire-cameras" },
          { label: "California traffic cameras", href: "/us-traffic-cameras/california" },
          { label: "Hurricane tracker", href: "/hurricane-tracker" },
          { label: "Live weather tracker", href: "/weather-tracker" },
        ]}
      />

      <TrialCtaSection utmSource="california-flood-cams" />

      <CtaRow backHref="/live-webcams" backLabel="All live webcams" />
    </PageShell>
  );
}
