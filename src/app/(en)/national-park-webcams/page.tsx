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
import TrialCtaSection from "@/components/TrialCtaSection";
import { EXPLORE_SCOPES, recordsForDef } from "@/lib/explore-data";
import { NATIONAL_PARKS } from "@/lib/national-parks";

export const metadata: Metadata = {
  title: "National Park Webcams — Live Cameras in America's Parks",
  description:
    "Live webcams for 22 US national parks — Yellowstone, Yosemite, Grand Canyon, Zion, Denali and more. Every count computed from the catalogue with the radius stated; every gap named. Free, no signup.",
  alternates: { canonical: `${BASE}/national-park-webcams` },
  openGraph: {
    title: "National Park Webcams — Live Cameras in America's Parks",
    description:
      "Park-service cameras, entrance roads and gateway walls for 22 US national parks, with each park's weather and sun times. Free on WorldEye.",
    url: "/national-park-webcams",
    type: "website",
  },
};

const FAQS = [
  {
    q: "Which national park has the most webcams?",
    a: "By park-service cameras, Yosemite leads: six records from the National Park Service feed, five of them the icons — Half Dome, El Capitan, Happy Isles, the High Sierra and Badger Pass. Yellowstone follows with five (Mammoth's terraces, both Mount Washburn lookouts, both entrances). By total wall size, Redwood's 45 km chain of groves leads with 21 cameras, four of them park-service grove cameras. Every count on this hub is computed from the catalogue under the radius stated on each park's page.",
  },
  {
    q: "Can I watch Old Faithful erupt live?",
    a: "Not here, and this hub would rather say so than imply it: the catalogue holds no Old Faithful camera. Yellowstone's page carries the five park-service cameras that do exist — Mammoth Hot Springs' terraces, both Mount Washburn lookouts and the east and west entrances. If an Old Faithful feed is published openly, it will join that wall automatically.",
  },
  {
    q: "Why is there no Glacier National Park page?",
    a: "Because Glacier's honest wall is two cameras — the park service's West Entrance and Two Medicine feeds, both excellent, and nothing else within the park's country. Two cameras is a beginning, not a wall, so Glacier waits in the gap list below rather than getting a page padded with Kalispell airport weather cameras. The same discipline keeps out the Great Smoky Mountains (three cameras: the Newfound Gap webcam and two research phenocams) — America's most-visited park, and this directory's most wanted gap.",
  },
  {
    q: "Are these official park webcams?",
    a: "The anchors are. Across the 22 parks, the walls include the National Park Service's own published cameras wherever the catalogue holds them — 39 records in total. Around them, each wall takes in the feeds that share the park's ground: state highway cameras on entrance roads, FAA weather cameras at gateways, university research phenocams. Every camera is labelled with its source on its park page, and walls with no park-service camera say so in their first paragraph.",
  },
  {
    q: "How are the parks chosen?",
    a: "By the cameras, not the fame rankings. A park earns a page when a radius wall around its own ground — a named centre inside the park, its entrance, or its gateway settlement — holds at least four catalogue cameras anchored to the park. Parks whose radius would just be a nearby city (Biscayne is Miami's grid, Saguaro is Tucson's, Cuyahoga Valley is Cleveland's freeways) are excluded however large the count, and listed as gaps instead.",
  },
  {
    q: "Is it free?",
    a: "Yes. Every park page and every camera on it opens free, with no account and no signup. WorldEye's paid tiers add the globe's Pro tools; the national park walls are free in full.",
  },
];

export default async function NationalParkWebcamsPage() {
  const rows = await Promise.all(
    NATIONAL_PARKS.map(async (p) => {
      const records = await recordsForDef(EXPLORE_SCOPES[p.scopeKey]);
      return {
        park: p,
        total: records.length,
        nps: records.filter((r) => r.source === "OpenCCTV / nps").length,
      };
    }),
  );
  const fmt = (n: number) => n.toLocaleString("en-US");
  const totalCams = rows.reduce((s, r) => s + r.total, 0);
  const totalNps = rows.reduce((s, r) => s + r.nps, 0);
  const sorted = [...rows].sort((a, b) => b.nps - a.nps || b.total - a.total);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "National Park Webcams — Live Cameras in America's Parks",
    description:
      "Live camera walls for 22 US national parks — park-service viewpoints, entrance roads and gateway cameras, each with its radius stated and its count computed from the catalogue.",
    url: `${BASE}/national-park-webcams`,
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: NATIONAL_PARKS.length,
      itemListElement: NATIONAL_PARKS.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: `${p.name} webcams`,
        url: `${BASE}/national-park-webcams/${p.slug}`,
      })),
    },
  };

  const intro = [
    `America's national parks are watched — unevenly, by whoever happens to publish a camera. This hub gathers what genuinely exists: ${fmt(totalCams)} catalogue cameras across ${NATIONAL_PARKS.length} park walls, including ${totalNps} National Park Service cameras — Half Dome and El Capitan, Mammoth's terraces, the Grand Canyon's Bright Angel Trailhead, Haleakalā's crater at sunrise. Every park page carries its park's live weather and its computed sunrise and sunset, because a park webcam is half a planning tool. Free to watch, no account, no signup.`,
    "The discipline is the same as everywhere in this directory: every wall is a stated rule — every catalogue camera within a named radius of a named centre, nearest first — and the count printed is the count the rule returns. Where the centre is the park's viewpoint district, the wall is the park. Where a park has no camera of its own, the centre is its entrance or its gateway town, and the page says so in its first paragraph rather than borrowing scenery. Zion's wall is its entrance corridor; Denali's is its entrance district; Glacier Bay's is Gustavus, the only front door the park has.",
    "And then there are the famous absences, which this hub treats as content, not embarrassment. There is no Old Faithful camera. Glacier — two superb park-service cameras and nothing around them — does not yet make a wall. The Great Smoky Mountains, the most-visited park in the country, holds three. Katmai's bears, Big Bend's desert, the Everglades: the cameras are not there, or not public, and the gap list below names them with their real numbers. Those gaps are also a standing invitation — a park, lodge or gateway business that publishes an open camera in one of them will find its wall here waiting.",
  ];

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live webcams", href: "/live-webcams" },
          { label: "National park webcams" },
        ]}
      />
      <Hero
        h1="National Park Webcams — America's Parks, Live"
        sub="Camera walls for 22 US national parks — the park-service viewpoints, the entrance roads and the gateways, each with its radius stated and its gaps named. Free, no signup."
      />
      <StatRow
        stats={[
          { value: fmt(totalCams), label: "cameras across the 22 park walls" },
          { value: String(totalNps), label: "National Park Service cameras" },
          { value: "22", label: "parks with real catalogue walls" },
        ]}
      />
      <Intro paragraphs={intro} />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">The parks, wall by wall</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-6">
          Ordered by park-service cameras, then wall size. A “gateway wall” badge means
          the park itself has no catalogue camera yet — the wall is its entrance
          district or gateway town, labelled as such on its page.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map(({ park: p, total, nps }) => (
            <Link
              key={p.slug}
              href={`/national-park-webcams/${p.slug}`}
              className="block rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/30 hover:bg-white/[0.05]"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-bold leading-snug">{p.name}</h3>
                <span className="shrink-0 text-sm font-semibold text-white/85">
                  {fmt(total)}
                </span>
              </div>
              <p className="mt-1 text-xs uppercase tracking-wide text-white/40">
                {p.state} · {p.radiusKm} km wall
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/60">
                {p.highlights.slice(0, 3).join(" · ")}
              </p>
              <p className="mt-4 text-xs font-medium">
                {nps > 0 ? (
                  <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-2 py-1 text-emerald-200">
                    {nps} park-service camera{nps === 1 ? "" : "s"}
                  </span>
                ) : (
                  <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-1 text-amber-200">
                    Gateway wall — no park-service camera yet
                  </span>
                )}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <HowTo
        title="How these walls work"
        steps={[
          "Each park page states its rule: every catalogue camera within a named radius of a named centre — the park's viewpoint district, its entrance, or its gateway — nearest first.",
          "Counts are computed from the catalogue under that rule, never hand-written. If the catalogue gains a camera inside a park's radius, the wall and its count grow on their own.",
          "Park-service cameras are flagged on every card and page. A wall anchored by the National Park Service says so; a gateway wall says that instead.",
          "Each park page adds the working tools: live weather at the park's coordinates and today's computed sunrise and sunset in the park's own timezone.",
          "Parks that fail the rule — too few cameras, or a radius that would just be a city's traffic grid — get no page. They are named in the gap list, with their real numbers.",
        ]}
      />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          The gaps — parks without a wall yet
        </h2>
        <div className="max-w-3xl space-y-4 text-sm leading-relaxed text-white/55">
          <p>
            <strong className="text-white/80">Great Smoky Mountains — 3 cameras.</strong>{" "}
            The most-visited park in America holds the Newfound Gap park-service webcam
            and two research phenocams inside a tight radius. Three is not a wall; the
            wider ring is Gatlinburg and Pigeon Forge tourist traffic, which this
            directory will not relabel as park cameras. First on the list when a
            fourth real camera appears.
          </p>
          <p>
            <strong className="text-white/80">Glacier — 2 cameras.</strong> Both are
            the park service's own (West Entrance, Two Medicine) and both are
            beautiful; there is simply nothing else in the park's country. A page
            padded with Flathead Valley airport cameras would be a label, not a tool.
          </p>
          <p>
            <strong className="text-white/80">Katmai — 0 cameras near the bears.</strong>{" "}
            The famous Brooks Falls bear cameras are not in the open catalogue, and the
            nearest catalogue camera of any kind is a lodge camera at King Salmon, more
            than 90 km from the falls. Katmai waits.
          </p>
          <p>
            <strong className="text-white/80">No cameras at all:</strong> Big Bend,
            Hot Springs, Dry Tortugas, Wrangell–St. Elias, and the Everglades within
            40 km of the park (Miami's grid begins beyond it). Canyonlands has no
            camera of its own either — its gateway country is served, partially and
            honestly, by the Arches &amp; Moab wall.
          </p>
          <p>
            <strong className="text-white/80">Excluded on principle:</strong> Saguaro
            (Tucson's streets), Biscayne (Miami's grid), Congaree (Columbia's suburbs),
            Indiana Dunes (the I-94 corridor), Cuyahoga Valley (Cleveland's freeways),
            Mesa Verde and Joshua Tree (highway cameras only) — big radii, wrong
            subject. If you operate a camera in or at the gate of any park on this
            list and publish an open feed, you are holding the missing wall.
          </p>
        </div>
      </section>

      <FaqSection title="National park webcams — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="More live WorldEye"
        links={[
          { label: "Volcano webcams — Kīlauea & the world's volcanoes", href: "/volcano-webcams" },
          { label: "Northern lights webcams", href: "/northern-lights-webcams" },
          { label: "Dark sky cameras", href: "/dark-sky-cameras" },
          { label: "Ski webcams", href: "/ski-webcams" },
          { label: "United States cameras — the country index", href: "/cameras/countries/united-states" },
          { label: "Live webcams worldwide", href: "/live-webcams" },
        ]}
      />

      <TrialCtaSection utmSource="national-park-webcams" />
      <CtaRow backHref="/live-webcams" backLabel="All live webcams" />
    </PageShell>
  );
}
