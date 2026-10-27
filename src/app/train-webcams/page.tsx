import type { Metadata } from "next";
import Link from "next/link";
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
import {
  RAIL_PLACES,
  railPlacePath,
  type RailPlace,
} from "@/lib/railfan-places";

export const metadata: Metadata = {
  title: "Train Webcams — Live Railfan Cameras, Stations & Railway Bridges",
  description:
    "Live train webcams for railfans: a worldwide wall of every camera that names a railway, plus 14 place walls — Tokyo Station, Busan, Osaka's Shinkansen, Lincoln's BNSF yard and more. Free, no signup.",
  alternates: { canonical: `${BASE}/train-webcams` },
  openGraph: {
    title: "Train Webcams — Live Railfan Cameras, Stations & Railway Bridges",
    description:
      "393 cameras that name a railway, and 14 measured place walls — stations, yards, Shinkansen bridges and light-rail corridors on live camera. Free on WorldEye.",
    url: "/train-webcams",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Train Webcams — Live Railfan Cameras, Stations & Railway Bridges",
  description:
    "Live camera walls for rail places worldwide — every catalogue camera within 15 km of each place's rail anchor, nearest first, plus the worldwide wall of cameras that name a railway.",
  url: `${BASE}/train-webcams`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const fmt = (n: number) => n.toLocaleString("en-US");

const FEATURED = ["tokyo", "busan", "lincoln"];

/* The famous rail towns the catalogue cannot back, measured at this
   family's own rule (catalogue generated 2026-10-20; the totals are
   pinned in lib/railfan-page-scopes.test.ts). They are named here —
   not dressed up as pages. */
const GAPS: Array<{ name: string; total: number }> = [
  { name: "Tehachapi, California", total: 4 },
  { name: "Rochelle, Illinois", total: 0 },
  { name: "Folkston, Georgia", total: 3 },
  { name: "North Platte, Nebraska", total: 4 },
  { name: "Barstow, California", total: 4 },
  { name: "Gallup, New Mexico", total: 1 },
];

export default async function TrainWebcamsPage() {
  const counts = new Map<string, number>();
  for (const p of RAIL_PLACES) {
    counts.set(p.slug, await countForDef(EXPLORE_SCOPES[p.scopeKey]));
  }
  const railNamedTotal = await countForDef(EXPLORE_SCOPES["rail-named"]);
  const fullest = [...RAIL_PLACES].sort(
    (a, b) => (counts.get(b.slug) ?? 0) - (counts.get(a.slug) ?? 0),
  )[0];
  const featured = FEATURED.map((slug) =>
    RAIL_PLACES.find((p) => p.slug === slug)!,
  ).filter(Boolean);

  const faqs = [
    {
      q: "Does WorldEye track trains live — positions, schedules, Amtrak status?",
      a: "No — and nothing here pretends to. WorldEye is a camera directory: these pages show rail places live (stations, yards, bridges, the corridors through town), which answers the visual questions — what's the weather on the corridor, how does the station square look right now — but it publishes no train positions, no timetables and no operator status, Amtrak included. For times and running information, use the railway operator; for the place itself, live, use the wall.",
    },
    {
      q: "What counts as a 'rail-named' camera?",
      a: `A camera whose own title names the railway world: a railway or railroad, a station (but not a water, pumping, fire or research station — the guards are part of the rule), a named line or operator (the Shinkansen, JR, Kintetsu, BNSF, the MTR…), a depot, a light-rail stop. Across the whole catalogue that is ${fmt(railNamedTotal)} cameras — the worldwide wall at the top of this page is exactly that set, and every place page counts its own wall the same way.`,
    },
    {
      q: "Which rail place has the most cameras?",
      a: `${fullest.name}, on this family's rules: ${fmt(counts.get(fullest.slug) ?? 0)} catalogue cameras within ${fullest.radiusKm} km of its anchor — Hong Kong's Transport Department publishes its road network at a density no other source here matches, and Yuen Long's streets are shared with the Light Rail. Busan follows with ${fmt(counts.get("busan") ?? 0)} from a single municipal network, then Incheon with ${fmt(counts.get("incheon") ?? 0)}.`,
    },
    {
      q: "Why is there no page for Tehachapi, Rochelle or Folkston?",
      a: "Because the catalogue has almost nothing there — measured at this family's rule: Tehachapi 4 cameras within 15 km, Rochelle 0, Folkston 3, North Platte (Bailey Yard and all) 4. A wall built from a handful of distant highway cameras would be a label, not a tool, so those towns are named here as gaps instead. Tehachapi's own dedicated train cam does exist in the catalogue — it is in the worldwide wall above, one feed among the 393. If these towns' networks publish more open feeds, the walls will follow.",
    },
    {
      q: "Why is Japan most of this family?",
      a: "Two measured reasons. Japan's river-camera networks name their railway bridges (the JR and private-line crossings are flood landmarks), and Japanese cities publish station cameras — so Japan's rail places hold real, nameable clusters where other countries' catalogues hold road cameras that pass a railway without naming it. The United States measures exactly one qualifying place: Lincoln, Nebraska, on the strength of its two BNSF cameras. The family follows the data, not the fame ranking.",
    },
    {
      q: "Are the train webcams free?",
      a: "Yes — every camera on every wall is free to watch, no account, no signup. Open a place, start with the closest feeds, and jump to the same place on the 3D globe for the weather layer alongside.",
    },
  ];

  const intro = [
    `This is the rail family of the WorldEye directory: ${RAIL_PLACES.length} rail places with genuine camera clusters, each wall built on one stated rule — every catalogue camera within 15 km of the place's rail anchor (its station, its yard, its bridge cluster), nearest first. Above the places sits the family's other wall: the ${fmt(railNamedTotal)} cameras in the whole catalogue whose own titles name a railway — every station cam, railway bridge, depot and light-rail feed WorldEye can point at, in one grid.`,
    "Read the walls for what they are. A rail place on camera is mostly its town: the station-named feeds where a network has them — a concourse cam in Sapporo, two BNSF cameras in Lincoln, Shinkansen river crossings at Nagoya — and otherwise the municipal, river and road cameras of the place itself. That is still the railfan's dawn check in camera form: the weather on the corridor, the light on the station square, the river the line crosses. But it is a picture, not a departure board. WorldEye publishes no train positions, no schedules and no Amtrak status, and no wall here will be described as that.",
    "And the gaps, stated the way this directory states them: Tehachapi, Rochelle, Folkston and North Platte — towns any railfan can name — measure 4, 0, 3 and 4 cameras at this family's rule, so they have no walls. Fame didn't earn anyone a page; cameras did.",
  ];

  const placeCard = (p: RailPlace) => (
    <Link
      key={p.slug}
      href={railPlacePath(p)}
      className="block rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:bg-white/[0.06] transition-colors"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-semibold text-white/90">{p.name}</h3>
        <span className="text-xs text-white/45 whitespace-nowrap">
          {fmt(counts.get(p.slug) ?? 0)} cameras
        </span>
      </div>
      <p className="text-xs text-white/40 mt-0.5">{p.place}</p>
      <p className="text-sm text-white/55 mt-2 leading-relaxed">{p.knownFor}</p>
    </Link>
  );

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={faqs} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live webcams", href: "/live-webcams" },
          { label: "Train webcams" },
        ]}
      />
      <Hero
        h1="Train Webcams — Live Railfan Cameras"
        sub="Station cams, railyard feeds, Shinkansen bridges and light-rail corridors — the rail places with real public camera clusters, live. Free, no signup."
      />
      <StatRow
        stats={[
          { value: fmt(railNamedTotal), label: "cameras worldwide name a railway" },
          { value: fmt(counts.get(fullest.slug) ?? 0), label: `around ${fullest.shortName} — the fullest wall` },
          { value: String(RAIL_PLACES.length), label: "rail places with a genuine catalogue cluster" },
        ]}
      />
      <Intro paragraphs={intro} />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          The worldwide rail wall — every camera that names a railway
        </h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          {fmt(railNamedTotal)} feeds, one rule: the camera&rsquo;s own title names a
          railway, a station, a line, a depot or a light-rail stop — with the
          guards that keep water stations, fire stations and bus depots out.
          This is where the family&rsquo;s singletons live: Tehachapi&rsquo;s
          train cam, the Amersfoort and Mierlo railcams, Zürich Hauptbahnhof,
          the North Yorkshire Moors Railway — real rail cameras whose towns
          hold no cluster, gathered here instead of padded into pages.
        </p>
        <DirectoryExplorer
          scopeKey="rail-named"
          scopeLabel={EXPLORE_SCOPES["rail-named"].label}
          groupBy="country"
          searchPlaceholder="Search rail-named cameras…"
          explorerId="rail-named-world"
        />
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-5">The rail places</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {RAIL_PLACES.map(placeCard)}
        </div>
      </section>

      {featured.map((p) => (
        <section key={p.slug} className="mt-12">
          <h2 className="text-xl md:text-2xl font-bold mb-3">
            {p.name} — live wall
          </h2>
          <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
            {fmt(counts.get(p.slug) ?? 0)} cameras within {p.radiusKm} km of the
            anchor. {p.watchNotes[0]}{" "}
            <Link href={railPlacePath(p)} className="text-sky-300 hover:underline">
              The full {p.shortName} page →
            </Link>
          </p>
          <DirectoryExplorer
            scopeKey={p.scopeKey}
            scopeLabel={EXPLORE_SCOPES[p.scopeKey].label}
            groupBy="none"
            searchPlaceholder={`Search cameras near ${p.shortName}…`}
            explorerId={`rail-${p.slug}`}
          />
        </section>
      ))}

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          The gaps — famous tracks, no cameras
        </h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Measured at the same 15 km rule, the same catalogue: these are the
          railfan landmarks a wall cannot honestly be built for today. They
          are listed so the family&rsquo;s map is a true one — and so the
          towns&rsquo; own networks know the invitation stands.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {GAPS.map((g) => (
            <div
              key={g.name}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-semibold text-white/80">{g.name}</h3>
                <span className="text-xs text-white/45 whitespace-nowrap">
                  {fmt(g.total)} cameras
                </span>
              </div>
              <p className="text-sm text-white/50 mt-2 leading-relaxed">
                {g.total === 0
                  ? "No catalogue cameras within 15 km — no wall, and no page pretending otherwise."
                  : "A handful of corridor feeds within 15 km — below this family's bar for a page of its own."}
              </p>
            </div>
          ))}
        </div>
      </section>

      <HowTo
        title="How to use the rail walls"
        steps={[
          "Start with the worldwide wall to find a specific feed — a station, a bridge, a yard — or pick a place and start from its closest cameras.",
          "Read the picture, not a prediction: sky over the corridor, light on the station square, the river under the bridge. A camera shows the scene; it does not announce the next train.",
          "Check the timestamp on any feed before reading it — a paused camera and a quiet railway can look alike.",
          "For times, positions and service status, use the railway operator's own live information. Then come back to the wall for the half no timetable can give you: the place itself, live.",
        ]}
      />

      <FaqSection title="Train webcams — FAQ" faqs={faqs} />

      <RelatedLinks
        title="More live WorldEye"
        links={[
          { label: "Airport webcams — plane-spotting walls", href: "/airport-webcams" },
          { label: "Port webcams — harbour walls", href: "/port-webcams" },
          { label: "Surf webcams — see the break live", href: "/surf-webcams" },
          { label: "Japan webcams — the national hub", href: "/japan-webcams" },
          { label: "Live webcams worldwide", href: "/live-webcams" },
          { label: "Cameras overview", href: "/cameras" },
        ]}
      />

      <TrialCtaSection utmSource="train-webcams" />

      <CtaRow backHref="/live-webcams" backLabel="All live webcams" />
    </PageShell>
  );
}
