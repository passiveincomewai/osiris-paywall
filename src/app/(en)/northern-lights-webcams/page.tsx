import type { Metadata } from "next";
import Link from "next/link";
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
import TrialCtaSection from "@/components/TrialCtaSection";
import { EXPLORE_SCOPES, countForDef } from "@/lib/explore-data";
import { AURORA_PLACES } from "@/lib/aurora-places";

export const metadata: Metadata = {
  title: "Northern Lights Webcams by Place — Aurora Cameras by Country",
  description:
    "Browse northern lights webcams by place: Iceland, Norway, Finland, Sweden, Alaska and Canada — every aurora-belt camera in the WorldEye directory, organised by country and region. Free, no signup.",
  alternates: { canonical: `${BASE}/northern-lights-webcams` },
  openGraph: {
    title: "Northern Lights Webcams by Place — Aurora Cameras by Country",
    description:
      "The aurora-belt camera directory by place: Iceland, Norway, Finland, Sweden, Alaska and Canada. Free on WorldEye.",
    url: "/northern-lights-webcams",
    type: "website",
  },
};

const INTRO = [
  "This is the directory: every northern feed in WorldEye's catalogue, organised by the places that watch the aurora — Iceland's road-cam circuit, Norway's fjords and Lofoten, Finland and Sweden's Lapland lake country, Alaska and northern Canada. A display happening over a Finnish lake at 2 AM is watchable from a couch on another continent; this page is how you find the camera that's pointing at it, country by country and region by region.",
  "An honest framing before the romance: these are not dedicated aurora cameras. They are road, weather, harbor and scenic feeds run by transport agencies, towns and resorts in aurora latitudes — cameras that happen to face dark landscapes. On an ordinary night they show ordinary darkness. On a clear, dark, active night, the same feed shows the arc standing over the road, curtains moving above the harbor. The skill is knowing which nights to look, and the map's live Kp reading is the first check.",
  "The season runs roughly September to March, when high-latitude nights are long and truly dark; midsummer's near-constant twilight hides all but the strongest displays. Within the season, autumn and spring statistically produce the strongest geomagnetic activity, and the declining phase of Solar Cycle 25 — where we are in late 2026 — historically keeps storm nights frequent. The second check is the sky itself: no aurora camera can see through cloud, so a feed under overcast is a weather report, not a verdict on the oval.",
  "Watching this way follows a rhythm the regulars know: check the Kp index, check the timestamp, judge whether the frame is genuinely dark, then give the sky a minute. Aurora on a webcam rarely matches the saturated photographs — look for a diffuse greenish arc low over the northern horizon, structure that brightens and fades, movement within the band itself. Slow change is the signature. Everything you need is free on the map — no account, no signup.",
];

const CATEGORIES = [
  {
    title: "Iceland: the road-cam circuit",
    body: "Iceland's road and coastal cameras ring the island at aurora latitude, and the country's small time-zone footprint makes the whole circuit checkable in minutes. Feeds around the north and east coasts face the darkest skies; Reykjavík-area cams carry more town light but still catch strong displays.",
  },
  {
    title: "Norway: fjords, Lofoten and Tromsø",
    body: "Norwegian feeds cluster along the fjords and in the Lofoten Islands — dark water in the foreground, mountains behind, and skies that host some of Europe's most reliable aurora. Tromsø-area cameras add a city that lives under the oval for much of the winter.",
  },
  {
    title: "Finland and Sweden: Lapland's lake country",
    body: "Lapland's cameras watch lakes, fells and quiet highways deep in the auroral zone — Rovaniemi, Levi and Saariselkä in Finland, Abisko and Kiruna in Sweden. These are among the darkest feeds in the directory, and lake ice makes a fine foreground mirror on still nights.",
  },
  {
    title: "Alaska and Canada: the long North American night",
    body: "Alaskan feeds around Fairbanks and Canadian cameras across the Yukon, Northwest Territories and the northern provinces sit under the oval on the other side of the pole. When it's mid-morning in Europe, it's the middle of the aurora night in Yellowknife — the circuit never fully sleeps.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Northern Lights Webcams by Place — Aurora Cameras by Country",
  description:
    "Directory of live public webcams across the aurora belt: Iceland, Norway, Finland, Sweden, Alaska and Canada.",
  url: `${BASE}/northern-lights-webcams`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const FAQS = [
  {
    q: "When is the best time of year to watch aurora webcams?",
    a: "Roughly September to March, when nights at high latitude are long and fully dark. Autumn and spring tend to bring the strongest geomagnetic activity, and mid-winter offers the longest viewing windows. In summer, near-constant twilight at aurora latitudes hides all but exceptional displays.",
  },
  {
    q: "What Kp index do I need to see the northern lights on a webcam?",
    a: "It depends on the camera's latitude. Under the auroral oval — Iceland, Lapland, Tromsø, Fairbanks, Yellowknife — Kp 2-3 on a dark, clear night can produce visible arcs overhead. Kp 5 (a G1 geomagnetic storm) pushes the oval far enough south for displays from Scotland, the northern US states and northern Europe's mainland coasts. The WorldEye map shows the live Kp reading in its status bar.",
  },
  {
    q: "Are these dedicated aurora cameras?",
    a: "No — and that honesty matters. The northern feeds in the directory are road, weather, harbor and scenic cameras run by third parties in aurora regions. They were not built for the aurora, but cameras facing dark landscapes are well placed to catch it on clear, dark, active nights.",
  },
  {
    q: "Why does a strong forecast still show nothing on the cameras?",
    a: "Three independent conditions must coincide: real darkness at the camera, clear sky above it, and enough geomagnetic activity over its latitude. A strong forecast with a cloudy valley — or a clear sky under a calm oval — shows an ordinary night. Cloud cover is the most common spoilsport, which is why watchers check a circuit of feeds across several countries.",
  },
  {
    q: "How can I tell real aurora from cloud or town light?",
    a: "Check the timestamp first, then look for structure in the sky itself: a greenish arc or band that brightens, fades and moves within itself over several minutes. Cloud lit from below moves across the frame and sits low; headlights sweep and vanish. Recheck after five minutes — a real display evolves rather than repeating identically.",
  },
  {
    q: "Are northern lights webcams free to watch?",
    a: "Yes. Every feed in the directory is a public stream, and the WorldEye map layer is free with no account or signup. Open the map, zoom to the aurora belt, and tap a camera marker.",
  },
  {
    q: "Can I get an alert when the aurora is likely to be visible?",
    a: "Yes. Aurora alerts watch the Kp index for the cameras you follow and let you know when activity climbs toward what is visible at their latitude — a Pro feature. Free, the map shows the live Kp reading in its status bar, and this page's cameras sit under the auroral oval so you can check the sky yourself.",
  },
];

export default async function NorthernLightsWebcamsPage() {
  const placeCounts = new Map<string, number>();
  for (const p of AURORA_PLACES) {
    placeCounts.set(p.slug, await countForDef(EXPLORE_SCOPES[p.scopeKey]));
  }
  const fmt = (n: number) => n.toLocaleString("en-US");

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live webcams", href: "/live-webcams" },
          { label: "Northern lights webcams" },
        ]}
      />
      <Hero
        h1="Northern Lights Webcams by Place"
        sub="Every aurora-belt camera in the directory, organised by country and region — Iceland, Norway, Finland, Sweden, Alaska and Canada. Free, no signup."
      />
      <Intro paragraphs={INTRO} />
      <p className="mt-4 text-white/70 leading-relaxed max-w-3xl mx-auto">
        For tonight's Kp and the cameras most likely to be lit right now, see{" "}
        <Link href="/aurora-webcams" className="text-[#00E5FF] hover:underline">
          the live aurora page
        </Link>
        .
      </p>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-5">Northern lights, place by place</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Thirteen places have a tonight page of their own — the live Kp, that
          place's darkness window, the Kp band its latitude needs, and its cameras.
          A place earns one only with a real camera wall of its own: Yellowknife
          has no catalogue cameras at all, and Whitehorse, Kiruna and Saariselkä
          hold two each, so they get no page — the absence is stated rather than
          dressed up.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {AURORA_PLACES.map((p) => (
            <Link
              key={p.slug}
              href={`/northern-lights-webcams/${p.slug}`}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-[#00E5FF]/40 transition-colors"
            >
              <span className="font-semibold text-white/90">{p.name}</span>
              <span className="block text-sm text-white/50 mt-1">
                {p.country} · {fmt(placeCounts.get(p.slug) ?? 0)} cameras within {p.radiusKm} km
              </span>
              <span className="block text-sm text-[#00E5FF] mt-2">
                {p.name} aurora tonight →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-5">Where the aurora cameras are</h2>
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
        title="Camera directory totals — aurora-belt countries"
        rows={[
          { name: "Canada", count: 4685 },
          { name: "Sweden", count: 1569 },
          { name: "Finland", count: 825 },
          { name: "Norway", count: 746 },
          { name: "Iceland", count: 482 },
          { name: "United States (incl. Alaska)", count: 41355 },
        ]}
        note="Counts are each country's full WorldEye directory; aurora viewing concentrates in the northern regions of each. The map's camera layer shows exactly which feeds sit at high latitude."
      />

      <HowTo
        title="How to watch the northern lights on webcams"
        steps={[
          "Check the live Kp index in the WorldEye map's status bar — below Kp 2, even perfect northern cameras mostly show darkness.",
          "Open the free map and zoom to the aurora belt: Iceland, northern Norway, Finnish and Swedish Lapland, Alaska, northern Canada.",
          "Pick feeds facing dark landscapes — lakes, fjords, rural highways — and confirm the timestamp is current.",
          "Judge the darkness honestly: black sky and visible stars mean a useful feed; a lit parking-lot look means town light will wash out modest displays.",
          "Give the sky a minute, then recheck in five — aurora moves within itself; cloud moves across the frame.",
          "Work a circuit across longitudes: as Earth rotates, different regions take turns under the brightest part of the oval.",
        ]}
      />

      <FaqSection title="Northern lights webcams — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="Keep watching the night sky"
        links={[
          { label: "Watching the northern lights on live webcams (guide)", href: "/blog/northern-lights-live-webcams" },
          { label: "Dark-sky cameras: meteors and the night sky", href: "/dark-sky-cameras" },
          { label: "Live webcams worldwide", href: "/live-webcams" },
          { label: "Live weather tracker", href: "/weather-tracker" },
          { label: "Volcano webcams: eruptions on live cameras", href: "/volcano-webcams" },
        ]}
      />

      <TrialCtaSection utmSource="northern-lights-webcams" />

      <CtaRow backHref="/live-webcams" backLabel="All live webcams" />
    </PageShell>
  );
}
