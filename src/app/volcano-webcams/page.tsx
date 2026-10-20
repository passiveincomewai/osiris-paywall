import type { Metadata } from "next";
import {
  BASE,
  JsonLd,
  Breadcrumb,
  Hero,
  Intro,
  AreaTable,
  HowTo,
  FaqSection,
  FaqJsonLd,
  RelatedLinks,
  CtaRow,
  PageShell,
} from "@/components/directory-page";

export const metadata: Metadata = {
  title: "Volcano Webcams — Live Volcano Cameras Worldwide",
  description:
    "Live public cameras in the world's volcanic regions — Hawaii, Iceland, Italy, Japan, Indonesia and New Zealand — on the WorldEye map, with eruption-status sources. Free, no signup.",
  alternates: { canonical: `${BASE}/volcano-webcams` },
  openGraph: {
    title: "Volcano Webcams — Live Volcano Cameras Worldwide",
    description:
      "Public cameras across the world's volcanic regions, plotted on one map. Free on WorldEye.",
    url: "/volcano-webcams",
    type: "website",
  },
};

const INTRO = [
  "Volcanoes are the rare spectacle that runs on geological time and erupts on human time. Between the two, the world's observatories and public agencies keep cameras pointed at craters, calderas and lava fields around the clock — and many of those feeds are public. WorldEye's directory maps public cameras across volcanic regions — Hawaii, Iceland, Italy, Japan, Indonesia, New Zealand and more — on the same globe as its earthquake and weather layers, so the mountain, its seismic neighborhood and its weather are one view.",
  "The live context right now is Hawaii. Kīlauea has been erupting episodically at its summit since December 23, 2024 — short, dramatic lava-fountaining episodes inside Halemaʻumaʻu crater, separated by pauses. The 55th episode fired on October 17, 2026, captured by the US Geological Survey's summit cameras. For Kīlauea specifically, the USGS Hawaiian Volcano Observatory's own webcams and eruption updates are the canonical source; the cameras in this directory are the wider public network around volcanic regions, and eruption status should always be confirmed with the observatory responsible for the volcano.",
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
    body: "Iceland sits on the Mid-Atlantic Ridge, and its dense road-camera network doubles as a volcano watch: south-coast feeds face Katla and Eyjafjallajökull country, and Reykjanes cameras watched the Sundhnúkur eruptions redraw the peninsula. In Iceland the road cam and the volcano cam are often the same camera.",
  },
  {
    title: "Italy: Etna and Stromboli",
    body: "Mount Etna is one of the world's most active volcanoes and one of its most filmed — public cameras around Sicily catch its summit eruptions, ash plumes and lava flows, while Stromboli's island feeds show the Aeolian volcano's rhythmic explosions lighting the night roughly every half hour in active phases.",
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
    "Directory of live public cameras in volcanic regions: Hawaii, Iceland, Italy, Japan, Indonesia and New Zealand.",
  url: `${BASE}/volcano-webcams`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const FAQS = [
  {
    q: "Which volcano is erupting right now?",
    a: "Eruption status changes daily and belongs to the observatories, not to a directory: check the USGS (for US volcanoes), the Icelandic Met Office, Italy's INGV, or Japan's JMA for the volcano you care about. As of late October 2026, the headline event is Kīlauea in Hawaii, erupting episodically at its summit since December 2024 — its 55th fountaining episode occurred on October 17, 2026, with pauses between episodes.",
  },
  {
    q: "Can I watch the Kīlauea eruption live?",
    a: "Yes — the USGS Hawaiian Volcano Observatory runs the canonical summit webcams (the V1, V2 and V3 livestreaming cameras on the Halemaʻumaʻu rim) and they are the view to use during a fountaining episode. WorldEye's directory maps Hawaii's wider public camera network on the globe alongside the earthquake layer, which is the context view: the island, its seismicity, and its weather in one place.",
  },
  {
    q: "Are these dedicated volcano cameras?",
    a: "Mixed, and the distinction matters. Observatory cameras point at craters and are run for monitoring. The broader directory — road, harbor, town and scenic feeds in volcanic regions — shows the volcano as landscape: plumes, ash skies, and the world's reaction. Both are useful; only the observatory feeds are the eruption close-up.",
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

export default function VolcanoWebcamsPage() {
  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
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
      <Intro paragraphs={INTRO} />

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

      <AreaTable
        title="Camera directory totals — volcanic-region countries"
        rows={[
          { name: "United States (incl. Hawaii)", count: 41355 },
          { name: "Japan", count: 10472 },
          { name: "Italy", count: 1030 },
          { name: "Iceland", count: 482 },
          { name: "New Zealand", count: 257 },
          { name: "Indonesia", count: 256 },
        ]}
        note="Counts are each country's full WorldEye directory; volcanic-region feeds concentrate around the active belts shown on the map. Always confirm eruption status with the responsible observatory."
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

      <FaqSection title="Volcano webcams — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="More live Earth"
        links={[
          { label: "Live earthquake tracker", href: "/earthquake-tracker" },
          { label: "Earthquake tracking explained (guide)", href: "/blog/earthquake-tracking-explained" },
          { label: "Live webcams worldwide", href: "/live-webcams" },
          { label: "Live weather tracker", href: "/weather-tracker" },
        ]}
      />

      <CtaRow backHref="/live-webcams" backLabel="All live webcams" />
    </PageShell>
  );
}
