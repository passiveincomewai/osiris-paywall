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
  BEACH_SPOTS,
  SURF_SPOTS,
  spotPath,
  type CoastalSpot,
} from "@/lib/surf-spots";

export const metadata: Metadata = {
  title: "Surf Webcams — See the Break Live Before You Go",
  description:
    "Live camera walls for the world's surf towns: Waikiki, Bondi, Huntington Beach, Kamakura, Haeundae and more — every public camera within 12 km of the break, nearest first. Free, no signup.",
  alternates: { canonical: `${BASE}/surf-webcams` },
  openGraph: {
    title: "Surf Webcams — See the Break Live Before You Go",
    description:
      "Camera walls for 13 surf towns with real catalogue clusters — beach-named feeds and the towns' live road cameras. Free on WorldEye.",
    url: "/surf-webcams",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Surf Webcams — See the Break Live Before You Go",
  description:
    "Live camera walls for surf towns worldwide — every catalogue camera within 12 km of each break, nearest first.",
  url: `${BASE}/surf-webcams`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const fmt = (n: number) => n.toLocaleString("en-US");

const FEATURED = ["haeundae", "waikiki", "bondi"];

export default async function SurfWebcamsPage() {
  const counts = new Map<string, number>();
  for (const s of [...SURF_SPOTS, ...BEACH_SPOTS]) {
    counts.set(s.slug, await countForDef(EXPLORE_SCOPES[s.scopeKey]));
  }
  const surfTotal = SURF_SPOTS.reduce((sum, s) => sum + (counts.get(s.slug) ?? 0), 0);
  const fullest = [...SURF_SPOTS].sort(
    (a, b) => (counts.get(b.slug) ?? 0) - (counts.get(a.slug) ?? 0),
  )[0];
  const featured = FEATURED.map((slug) => SURF_SPOTS.find((s) => s.slug === slug)!).filter(
    Boolean,
  );

  const faqs = [
    {
      q: "Does WorldEye give surf reports or forecasts?",
      a: "No — and no page here pretends to. WorldEye is a camera directory: it shows the break and its town live, which answers the visual questions (Is the coast clear or socked in? Wind-torn or glassy-looking? Empty or crowded?) but it publishes no swell height, period or direction data and no surf forecast. Pair the wall with a dedicated surf report for the numbers; the camera is the half of the check a report can't give you.",
    },
    {
      q: "Which surf spot has the most cameras?",
      a: `${fullest.name}, on this family's rules: ${fmt(counts.get(fullest.slug) ?? 0)} catalogue cameras within ${fullest.radiusKm} km of the break — South Korea's municipal network covers Busan's beach district end to end. Waikiki follows with ${fmt(counts.get("waikiki") ?? 0)} and Bondi with ${fmt(counts.get("bondi") ?? 0)}. The counts are each wall's stated radius applied to the catalogue, computed the same way on every page here.`,
    },
    {
      q: "Are these dedicated surf cameras?",
      a: "A few walls hold beach-named feeds — Haeundae has one named for the beach itself, Kamakura one named for Shichirigahama. Most walls are the networks that cover surf towns: municipal cameras, state road feeds, street cameras within 12 km of the break, nearest first. Every spot page states its mix and counts its beach-named feeds, so a corridor wall is labelled a corridor wall.",
    },
    {
      q: "Why is there no wall for Nazaré, Biarritz or Byron Bay?",
      a: "Because the catalogue has no public cameras within reach of them — Nazaré, Biarritz, Byron Bay, Malibu, Hossegor, Newquay and Jeffrey's Bay all measure zero catalogue cameras within 12 km of the break. A wall built from distant, unrelated cameras would be a label, not a tool, so those breaks are named here as gaps instead of being dressed up. If their towns publish open feeds, the walls will follow.",
    },
    {
      q: "How were these 13 breaks chosen?",
      a: "By the data, not the fame ranking: every candidate surf town from the research list was measured against the catalogue, and a wall exists only where a genuine cluster of public cameras sits within 12 km of the break. The 13 that qualified run from Haeundae's 184 cameras down to Santa Cruz's 15 — each spot page quotes the count its own grid serves.",
    },
    {
      q: "Are the surf webcams free?",
      a: "Yes — every camera on every wall is free to watch, no account, no signup. Open a spot, start with the closest feeds, and jump to the same place on the 3D globe for the weather and buoy layers alongside.",
    },
  ];

  const intro = [
    `This is the surf family of the WorldEye directory: ${SURF_SPOTS.length} surf towns, ${fmt(surfTotal)} live public cameras, each wall built on one stated rule — every catalogue camera within 12 km of the break, nearest first. Haeundae in Busan is the fullest wall at ${fmt(counts.get("haeundae") ?? 0)}; Waikiki, Bondi, Huntington Beach, Kamakura and Santa Cruz are here; so are the quieter coasts — Ichinomiya, where surfing made its Olympic debut, and the Chiba shore an hour from Tokyo.`,
    "Read the walls for what they are. A surf town on camera is mostly its town: the beach-named feeds where a network has them, and otherwise the municipal, street and road cameras of the place itself. That is still the check surfers actually make at dawn — the sky over the break, the wind you can see, the crowd building, the weather arriving — but it is a visual check, not a surf report. WorldEye publishes no forecasts and no swell data, and no wall here will be described as one.",
    "And the gaps, stated the way this directory states them: Nazaré, Biarritz, Byron Bay, Malibu, Hossegor, Newquay and Jeffrey's Bay measure zero catalogue cameras within 12 km, so they have no walls. Fame didn't earn anyone a page; cameras did. The beach towns that qualified instead — Laguna Beach, Miami Beach, Galveston and six more — have their own walls in the beach family, linked below.",
  ];

  const spotCard = (s: CoastalSpot) => (
    <Link
      key={s.slug}
      href={spotPath(s)}
      className="block rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:bg-white/[0.06] transition-colors"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-semibold text-white/90">{s.name}</h3>
        <span className="text-xs text-white/45 whitespace-nowrap">
          {fmt(counts.get(s.slug) ?? 0)} cameras
        </span>
      </div>
      <p className="text-xs text-white/40 mt-0.5">{s.place}</p>
      <p className="text-sm text-white/55 mt-2 leading-relaxed">{s.knownFor}</p>
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
          { label: "Surf webcams" },
        ]}
      />
      <Hero
        h1="Surf Webcams — See the Break Live Before You Go"
        sub="Camera walls for the surf towns with real public clusters — Waikiki, Bondi, Huntington, Kamakura, Haeundae and more. Free, no signup."
      />
      <StatRow
        stats={[
          { value: fmt(surfTotal), label: "cameras across the 13 surf walls" },
          { value: fmt(counts.get("haeundae") ?? 0), label: "around Haeundae, Busan — the fullest wall" },
          { value: "13", label: "surf towns with a genuine catalogue cluster" },
        ]}
      />
      <Intro paragraphs={intro} />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-5">The surf towns</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SURF_SPOTS.map(spotCard)}
        </div>
      </section>

      {featured.map((s) => (
        <section key={s.slug} className="mt-12">
          <h2 className="text-xl md:text-2xl font-bold mb-3">
            {s.name} — live wall
          </h2>
          <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
            {fmt(counts.get(s.slug) ?? 0)} cameras within {s.radiusKm} km of the break.{" "}
            {s.watchNotes[0]}{" "}
            <Link href={spotPath(s)} className="text-sky-300 hover:underline">
              The full {s.shortName} page →
            </Link>
          </p>
          <DirectoryExplorer
            scopeKey={s.scopeKey}
            scopeLabel={EXPLORE_SCOPES[s.scopeKey].label}
            groupBy="none"
            searchPlaceholder={`Search cameras near ${s.shortName}…`}
            explorerId={`surf-${s.slug}`}
          />
        </section>
      ))}

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          Beach towns in the same family
        </h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          The same measurement found nine beach towns whose clusters are
          resort shores rather than named breaks. Their walls live in the
          beach family, on the same stated rule.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BEACH_SPOTS.map(spotCard)}
        </div>
      </section>

      <HowTo
        title="How to use a surf wall"
        steps={[
          "Pick your break from the towns above and start with the closest cameras in its wall — nearest feeds read the coast's weather best.",
          "Read the picture, not a prediction: sky and cloud over the break, wind texture where a feed faces open ground or water, the crowd on the sand-side streets.",
          "Check the timestamp on any feed before reading it — a paused camera and a glassy morning can look alike.",
          "For swell height, period and the forecast, use a dedicated surf report. Then come back to the wall for the half no report can give you: the place itself, live.",
        ]}
      />

      <FaqSection title="Surf webcams — FAQ" faqs={faqs} />

      <RelatedLinks
        title="More live WorldEye"
        links={[
          { label: "Beach webcams worldwide", href: "/beach-webcams" },
          { label: "Port webcams — harbour walls", href: "/port-webcams" },
          { label: "Live webcams worldwide", href: "/live-webcams" },
          { label: "Japan webcams — the national hub", href: "/japan-webcams" },
          { label: "Cameras overview", href: "/cameras" },
        ]}
      />

      <TrialCtaSection utmSource="surf-webcams" />

      <CtaRow backHref="/live-webcams" backLabel="All live webcams" />
    </PageShell>
  );
}
