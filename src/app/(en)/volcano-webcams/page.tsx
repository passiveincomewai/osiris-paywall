import type { Metadata } from "next";
import Link from "next/link";
import {
  BASE,
  JsonLd,
  Breadcrumb,
  Hero,
  Intro,
  AreaTable,
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
import { VOLCANOES } from "@/lib/volcanoes";

/* R48 (site-audit Wave 3): the Episode-56 forecast is date-boxed.
   The USGS HVO forecast window cited on this page is October 31 –
   November 6, 2026 (daily update of October 26, 2026). While today
   is on or before 2026-11-07 the page renders the forecast as a live
   window; after 2026-11-07 every Episode-56 surface renders the
   passed-window state instead. The decision is computed server-side
   at render (no client clock), and the route revalidates hourly so
   the flip happens without a redeploy. */
export const revalidate = 3600;

const EP56_PASSED_AFTER = "2026-11-07";

function ep56WindowPassed(now: Date = new Date()): boolean {
  return now.toISOString().slice(0, 10) > EP56_PASSED_AFTER;
}

export function generateMetadata(): Metadata {
  const passed = ep56WindowPassed();
  return {
    title: "Volcano Webcams — Live Volcano Cameras Worldwide",
    description: passed
      ? "Live public cameras in the world's volcanic regions — Kīlauea (the Episode 56 forecast window, Oct 31–Nov 6, has passed; latest status via USGS), Iceland, Etna, Japan and Indonesia — on the WorldEye map, with eruption-status sources. Free, no signup."
      : "Live public cameras in the world's volcanic regions — Kīlauea (Episode 56 expected Oct 31–Nov 6), Iceland, Etna, Japan and Indonesia — on the WorldEye map, with eruption-status sources. Free, no signup.",
    alternates: { canonical: `${BASE}/volcano-webcams` },
    openGraph: {
      title: "Volcano Webcams — Live Volcano Cameras Worldwide",
      description:
        "Public cameras across the world's volcanic regions, plotted on one map. Free on WorldEye.",
      url: "/volcano-webcams",
      type: "website",
    },
  };
}

const INTRO = [
  "Volcanoes are the rare spectacle that runs on geological time and erupts on human time. Between the two, the world's observatories and public agencies keep cameras pointed at craters, calderas and lava fields around the clock — and many of those feeds are public. WorldEye's directory maps public cameras across volcanic regions — Hawaii, Iceland, Italy, Japan, Indonesia, New Zealand and more — on the same globe as its earthquake and weather layers, so the mountain, its seismic neighborhood and its weather are one view.",
  "The live context right now is Hawaii. Kīlauea has been erupting episodically at its summit since December 23, 2024 — short, dramatic lava-fountaining episodes inside Halemaʻumaʻu crater, separated by pauses. The 55th episode fired on October 17, 2026, and the USGS Hawaiian Volcano Observatory's forecast window for Episode 56 is October 31 – November 6. For Kīlauea specifically, the observatory's own webcams and eruption updates are the canonical source; the cameras in this directory are the wider public network around volcanic regions, and eruption status should always be confirmed with the observatory responsible for the volcano.",
  "An honest note on what a directory page can and cannot promise: not every camera in a volcanic region points at a crater. Observatory cameras do; highway, harbor and town cameras in places like Iceland's south coast, Sicily, or Kagoshima show the volcano as landscape — the plume above the ridge, the ash-darkened sky, the evacuated-quiet street. Both kinds earn their place. Crater feeds are for watching eruptions; regional feeds are for watching what an eruption does to the world around it.",
  "Pair the cameras with the map's other layers and the picture deepens: earthquake activity under the edifice, weather moving ash, and — on the biggest days — the regional cameras that show roads closing and viewpoints filling before any news crew arrives. Every feed is free to open — no account, no signup.",
];

const CATEGORIES = [
  {
    title: "Hawaii: Kīlauea and Mauna Loa",
    body: "The most-watched volcano on Earth in 2026. Kīlauea's summit eruption proceeds in episodes — fountains, pauses, inflation, the next episode — and the USGS observatory cameras on the caldera rim are the authoritative view. Hawaii's wider public camera network covers the island's roads and coasts around the national park.",
  },
  {
    title: "Iceland: the volcanic island",
    body: "Iceland sits on the Mid-Atlantic Ridge, and its dense road-camera network doubles as a volcano watch: south-coast feeds face Katla country, and Reykjanes cameras watched the Sundhnúkur eruptions redraw the peninsula. In Iceland the road cam and the volcano cam are often the same camera.",
  },
  {
    title: "Italy: Etna, Vesuvius and Stromboli",
    body: "Mount Etna is one of the world's most active volcanoes, and the directory holds a dedicated camera on the volcano itself — the single feed in Etna's wall below. Naples' dense city network watches Vesuvius as landscape. Stromboli, honestly, has no public camera in the directory near the island; its eruptions are a boat-and-observatory watch, not a wall on this page.",
  },
  {
    title: "Japan and Indonesia: the Ring of Fire's west wall",
    body: "Japan's camera culture extends to its volcanoes — Sakurajima erupts over Kagoshima so routinely that the city treats ash as weather. Indonesia's network watches Merapi, Semeru and Bromo across Java. These are working monitoring landscapes where a camera check is part of local life.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Volcano Webcams — Live Volcano Cameras Worldwide",
  description:
    "Directory of live public cameras in volcanic regions: Hawaii, Iceland, Italy, Japan, Indonesia and New Zealand, with a per-volcano camera wall for each.",
  url: `${BASE}/volcano-webcams`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const FAQS = [
  {
    q: "Which volcano is erupting right now?",
    a: "Eruption status changes daily and belongs to the observatories, not to a directory: check the USGS (for US volcanoes), the Icelandic Met Office, Italy's INGV, or Japan's JMA for the volcano you care about. As of late October 2026, the headline event is Kīlauea in Hawaii, erupting episodically at its summit since December 2024 — its 55th fountaining episode occurred on October 17, 2026, and the next is expected in the October 31 – November 6 window.",
  },
  {
    q: "When is Kīlauea's Episode 56 expected?",
    a: "The USGS Hawaiian Volcano Observatory's daily update of October 26, 2026 puts the forecast window for Episode 56 fountaining at October 31 – November 6, 2026 — an expected window, not a scheduled time. The eruption is currently paused after Episode 55 (October 17, fountains to about 720 ft), summit re-inflation has plateaued, and the alert level is ADVISORY / aviation colour code YELLOW. Windows shift with the mountain; the observatory's daily update is the source to check as the window opens.",
  },
  {
    q: "Can I watch the Kīlauea eruption live?",
    a: "Yes — the USGS Hawaiian Volcano Observatory runs the canonical summit webcams (the V1, V2 and V3 livestreaming cameras on the Halemaʻumaʻu rim) and they are the view to use during a fountaining episode. WorldEye's directory maps Hawaii's wider public camera network on the globe alongside the earthquake layer, which is the context view: the island, its seismicity, and its weather in one place.",
  },
  {
    q: "Are these dedicated volcano cameras?",
    a: "Mixed, and the distinction matters. Observatory cameras point at craters and are run for monitoring — and the directory does hold one dedicated feed on Mount Etna itself. The broader walls — road, harbor, town and scenic feeds in volcanic regions — show the volcano as landscape: plumes, ash skies, and the world's reaction. Each section below states its real count and radius, so a one-camera volcano and an eighty-camera one are never dressed alike.",
  },
  {
    q: "Why pair volcano cameras with the earthquake layer?",
    a: "Because eruptions are seismic stories. Swarms under an edifice, inflation, and tremor usually precede and accompany eruptive episodes — Kīlauea's episodes are tracked by exactly those signals. Watching the earthquake layer around a restless volcano gives you the mountain's other voice between the camera frames.",
  },
  {
    q: "Are volcano webcams free to watch?",
    a: "Yes. Observatory and public-agency feeds are published openly, and every camera in the WorldEye directory is free to open — no account, no signup. Open the map, zoom to the volcanic region, and tap a marker.",
  },
];

interface WallDef {
  key: string;
  scopeKey: string;
  heading: string;
  radius: string;
  blurb: (count: string) => string;
  placeholder: string;
}

const WALLS: WallDef[] = [
  {
    key: "kilauea",
    scopeKey: "event-vo-kilauea",
    heading: "Kīlauea, Hawaii",
    radius: "50 km",
    blurb: (n) =>
      `${n} public cameras within 50 km of Kīlauea's summit — the island network around Hawaiʻi Volcanoes National Park: rim-road, coastal and research-tower feeds, including the Holei Pali and Pāhala camera groups. The USGS summit cameras remain the canonical crater view during an episode; this wall is the island around it, live.`,
    placeholder: "Search Kīlauea area cameras…",
  },
  {
    key: "reykjanes",
    scopeKey: "event-vo-reykjanes",
    heading: "Reykjanes Peninsula, Iceland",
    radius: "30 km",
    blurb: (n) =>
      `${n} cameras within 30 km of Grindavík — the peninsula whose Sundhnúkur fissure eruptions redrew the map outside Reykjavík, watched by the road network that serves the town, the airport road and the evacuated coast.`,
    placeholder: "Search Reykjanes cameras…",
  },
  {
    key: "katla",
    scopeKey: "event-vo-katla",
    heading: "Katla & Vík, Iceland",
    radius: "40 km",
    blurb: (n) =>
      `${n} cameras within 40 km of Vík — the south-coast road network beneath Mýrdalsjökull, the ice cap that hides Katla, one of Iceland's most closely watched volcanoes. Here the road cam is the volcano watch.`,
    placeholder: "Search Vík & south coast cameras…",
  },
  {
    key: "etna",
    scopeKey: "event-vo-etna",
    heading: "Mount Etna, Sicily",
    radius: "30 km",
    blurb: (n) =>
      `${n} camera within 30 km of Etna's summit — and it is the right one: a dedicated volcano camera on Etna itself. One feed, stated plainly, worth more than a wall of street corners.`,
    placeholder: "Search Etna cameras…",
  },
  {
    key: "vesuvius",
    scopeKey: "event-vo-vesuvius",
    heading: "Vesuvius & Naples, Italy",
    radius: "25 km",
    blurb: (n) =>
      `${n} cameras within 25 km of Vesuvius — Naples' dense city and bay network, with the volcano as the skyline it has watched for two thousand years. These are landscape cameras, not crater feeds, and the section says so.`,
    placeholder: "Search Naples cameras…",
  },
  {
    key: "sakurajima",
    scopeKey: "event-vo-sakurajima",
    heading: "Sakurajima & Kagoshima, Japan",
    radius: "20 km",
    blurb: (n) =>
      `${n} cameras within 20 km of Sakurajima — Kagoshima's city and bay feeds facing one of the world's most routinely active volcanoes, where ashfall is a weather forecast item and the mountain smokes over the city most days.`,
    placeholder: "Search Kagoshima cameras…",
  },
  {
    key: "merapi",
    scopeKey: "event-vo-merapi",
    heading: "Mount Merapi, Java, Indonesia",
    radius: "30 km",
    blurb: (n) =>
      `${n} cameras within 30 km of Merapi's summit — the Yogyakarta-region network around Indonesia's most active volcano, monitored as closely as any mountain on Earth.`,
    placeholder: "Search Merapi area cameras…",
  },
  {
    key: "ruapehu",
    scopeKey: "event-vo-ruapehu",
    heading: "Mount Ruapehu, New Zealand",
    radius: "50 km",
    blurb: (n) =>
      `Just ${n} cameras within 50 km of Ruapehu — the thinnest wall on this page, a wide net over the central North Island's volcanic plateau, stated at its real size.`,
    placeholder: "Search Ruapehu area cameras…",
  },
];

export default async function VolcanoWebcamsPage() {
  const counts = new Map<string, number>();
  for (const w of WALLS) {
    counts.set(w.key, await countForDef(EXPLORE_SCOPES[w.scopeKey]));
  }
  const volcanoCounts = new Map<string, number>();
  for (const v of VOLCANOES) {
    volcanoCounts.set(v.slug, await countForDef(EXPLORE_SCOPES[v.scopeKey]));
  }
  const fmt = (n: number) => n.toLocaleString("en-US");
  const kilauea = counts.get("kilauea") ?? 0;
  const vesuvius = counts.get("vesuvius") ?? 0;

  /* R48: server-side date gate for the Episode-56 forecast surfaces. */
  const ep56Passed = ep56WindowPassed();
  const intro = ep56Passed
    ? INTRO.map((p, i) =>
        i === 1
          ? "The live context right now is Hawaii. Kīlauea has been erupting episodically at its summit since December 23, 2024 — short, dramatic lava-fountaining episodes inside Halemaʻumaʻu crater, separated by pauses. The 55th episode fired on October 17, 2026, and the USGS Hawaiian Volcano Observatory's forecast window for Episode 56 was October 31 – November 6 — that forecast window has passed, so check the observatory's daily update (linked in the Episode 56 section below) for the latest episode and status. For Kīlauea specifically, the observatory's own webcams and eruption updates are the canonical source; the cameras in this directory are the wider public network around volcanic regions, and eruption status should always be confirmed with the observatory responsible for the volcano."
          : p,
      )
    : INTRO;
  const faqs = ep56Passed
    ? FAQS.map((f) => {
        if (f.q === "Which volcano is erupting right now?")
          return {
            ...f,
            a: "Eruption status changes daily and belongs to the observatories, not to a directory: check the USGS (for US volcanoes), the Icelandic Met Office, Italy's INGV, or Japan's JMA for the volcano you care about. As of late October 2026, the headline event is Kīlauea in Hawaii, erupting episodically at its summit since December 2024 — its 55th fountaining episode occurred on October 17, 2026, and Episode 56 was forecast for the October 31 – November 6 window, which has now passed; the USGS Kīlauea page carries the latest episode count and status.",
          };
        if (f.q === "When is Kīlauea's Episode 56 expected?")
          return {
            ...f,
            a: "The USGS Hawaiian Volcano Observatory's daily update of October 26, 2026 put the forecast window for Episode 56 fountaining at October 31 – November 6, 2026 — an expected window, not a scheduled time. That forecast window has passed; the observatory's daily update is the source for what happened in it and what is expected next.",
          };
        return f;
      })
    : FAQS;

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={faqs} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live webcams", href: "/live-webcams" },
          { label: "Volcano webcams" },
        ]}
      />
      <Hero
        h1="Volcano Webcams — Live Volcano Cameras"
        sub="Public cameras across the world's volcanic regions — Hawaii, Iceland, Italy, Japan — free, no signup."
      />
      <StatRow
        stats={[
          ep56Passed
            ? { value: "Oct 31–Nov 6", label: "Kīlauea Episode 56 forecast window — passed; latest from USGS" }
            : { value: "Oct 31–Nov 6", label: "Kīlauea Episode 56 expected window" },
          { value: fmt(kilauea), label: "cameras within 50 km of Kīlauea" },
          { value: fmt(vesuvius), label: "cameras around Vesuvius & Naples" },
        ]}
      />
      <Intro paragraphs={intro} />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">Volcanoes with their own page</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Ten volcanoes in the directory have a page of their own — their cameras,
          their weather, and their observatory, the status source that outranks any
          frame. Eight are the walls below; Mount Fuji and Mount Bromo join them on
          the strength of their own feeds. The rule for getting a page is the rule
          this hub already keeps: real catalogue cameras, anchored to the mountain.
          Stromboli and Popocatépetl have none, and get no page.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {VOLCANOES.map((v) => (
            <Link
              key={v.slug}
              href={`/volcano-webcams/${v.slug}`}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-[#00E5FF]/40 transition-colors"
            >
              <span className="font-semibold text-white/90">{v.name}</span>
              <span className="block text-sm text-white/50 mt-1">
                {v.country} · {fmt(volcanoCounts.get(v.slug) ?? 0)} camera
                {(volcanoCounts.get(v.slug) ?? 0) === 1 ? "" : "s"} within {v.radiusKm} km
              </span>
              <span className="block text-sm text-[#00E5FF] mt-2">Watch {v.short} live →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/[0.05] p-6 md:p-7 max-w-3xl mx-auto">
        <h2 className="text-lg md:text-xl font-bold">
          {ep56Passed
            ? "Kīlauea Episode 56 — the forecast window has passed"
            : "Kīlauea Episode 56 — expected October 31 – November 6"}
        </h2>
        <div className="mt-3 space-y-3 text-sm text-white/65 leading-relaxed">
          {ep56Passed ? (
            <p>
              The forecast window (Oct 31 – Nov 6) has passed — latest from USGS.
              The USGS Hawaiian Volcano Observatory&apos;s daily update of October 26
              had forecast the{" "}
              <strong className="text-white/85">Episode 56 fountaining window as October 31 – November 6</strong>,
              after Episode 55&apos;s lava fountains (which reached about 720 feet) ended on
              October 17, 2026. What the mountain did in and after that window — and what
              is expected next — is in the observatory&apos;s daily update, linked below.
            </p>
          ) : (
            <p>
              The Halemaʻumaʻu summit eruption is <strong className="text-white/85">paused</strong> —
              Episode 55&apos;s lava fountains, which reached about 720 feet, ended on
              October 17, 2026. The USGS Hawaiian Volcano Observatory&apos;s daily update
              of October 26 reports summit re-inflation plateauing and forecasts the{" "}
              <strong className="text-white/85">Episode 56 fountaining window as October 31 – November 6</strong> —
              an expected window that moves with the mountain, not a scheduled start.
              The volcano alert level is ADVISORY, aviation colour code YELLOW.
            </p>
          )}
          <p>
            When fountaining resumes, the observatory&apos;s own summit webcams are the
            canonical view; the Kīlauea wall directly below is the island around the
            crater — roads, coast and viewpoints — and the map&apos;s earthquake layer
            carries the summit seismicity that leads each episode. Confirm status with
            the{" "}
            <a
              href="https://www.usgs.gov/volcanoes/kilauea"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00E5FF] hover:underline"
            >
              USGS Kīlauea page
            </a>{" "}
            before drawing conclusions from any single frame.
          </p>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-5">The volcanic regions</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {CATEGORIES.map((c) => (
            <div
              key={c.title}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
            >
              <h3 className="font-semibold text-white/90">{c.title}</h3>
              <p className="text-sm text-white/55 mt-2 leading-relaxed">{c.body}</p>
            </div>
          ))}
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
            explorerId={`vo-${w.key}`}
          />
        </section>
      ))}

      <AreaTable
        title="Camera counts — per volcano"
        rows={WALLS.map((w) => ({
          name: `${w.heading} (${w.radius})`,
          count: counts.get(w.key) ?? 0,
        }))}
        note="Counts are the public cameras in the WorldEye directory within the stated radius of each volcano — observatory feeds, where the directory holds them, alongside the regional road, harbor and town cameras. Always confirm eruption status with the responsible observatory."
      />

      <HowTo
        title="How to watch a volcano on the map"
        steps={[
          "Open the free WorldEye map — no account or download needed.",
          "Zoom to the volcanic region (Hawaii, Iceland's south coast, Sicily, Kagoshima) and look for camera markers around the edifice.",
          "Tap a marker to open that camera's live feed, and check its timestamp before trusting the frame.",
          "Confirm what you're seeing against the responsible observatory's status page — USGS for Hawaii, IMO for Iceland, INGV for Italy, JMA for Japan.",
          "Switch on the earthquake layer to see the seismic activity under and around the volcano.",
          "During an episode, recheck across hours: fountaining episodes build, peak and stop, and the regional cameras catch the aftermath — plumes, closures, glow after dark.",
        ]}
      />

      <FaqSection title="Volcano webcams — FAQ" faqs={faqs} />

      <RelatedLinks
        title="More live Earth"
        links={[
          { label: "Live earthquake tracker", href: "/earthquake-tracker" },
          { label: "Earthquake tracking explained (guide)", href: "/blog/earthquake-tracking-explained" },
          { label: "Live webcams worldwide", href: "/live-webcams" },
          { label: "Live weather tracker", href: "/weather-tracker" },
        ]}
      />

      <TrialCtaSection utmSource="volcano-webcams" />

      <CtaRow backHref="/live-webcams" backLabel="All live webcams" />
    </PageShell>
  );
}
