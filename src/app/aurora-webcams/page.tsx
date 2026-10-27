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
import AuroraKpPanel from "@/components/AuroraKpPanel";
import { EXPLORE_SCOPES, countForDef, countryEntry } from "@/lib/explore-data";

export const metadata: Metadata = {
  title: "Aurora Webcams — Northern Lights Live, With the Live Kp Index",
  description:
    "Watch the northern lights live on public webcams: 825 cameras in Finland, 482 in Iceland, 746 in Norway and the Fairbanks, Alaska wall — next to the live Kp index. Free, no signup.",
  alternates: { canonical: `${BASE}/aurora-webcams` },
  openGraph: {
    title: "Aurora Webcams — Northern Lights Live, With the Live Kp Index",
    description:
      "The aurora belt's public cameras — Finland, Iceland, Norway and Fairbanks — with the live Kp index from NOAA. Free on WorldEye.",
    url: "/aurora-webcams",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Aurora Webcams — Northern Lights Live, With the Live Kp Index",
  description:
    "Live public webcams across the aurora belt — Finland, Iceland, Norway and Fairbanks, Alaska — presented next to the live Kp geomagnetic index.",
  url: `${BASE}/aurora-webcams`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const FAQS = [
  {
    q: "Can I watch the northern lights live online for free?",
    a: "Yes. The walls on this page collect the public cameras of Finland, Iceland and Norway — the European aurora belt — plus Fairbanks, Alaska, on one page next to the live Kp index. Every feed is a public stream and opens free, with no account and no signup.",
  },
  {
    q: "What Kp index do I need to see the aurora on a webcam?",
    a: "It depends on the camera's latitude. Under the auroral oval — Finnish Lapland, Iceland, Tromsø, Fairbanks — Kp 2–3 on a dark, clear night can already produce visible arcs. Kp 4 gives high-latitude cameras a real chance, and Kp 5–6 is storm level (G1–G2), which pushes displays far enough south for northern mainland Europe and the northern United States. Cloud cover matters as much as Kp, which is why this page keeps several countries' cameras side by side.",
  },
  {
    q: "When is the best time to watch aurora webcams?",
    a: "During local darkness, roughly September to March, when high-latitude nights are long and truly dark — usually between about 10pm and 2am local time at the camera. Midsummer's near-constant twilight hides all but the strongest displays, and autumn and spring statistically bring the strongest geomagnetic activity.",
  },
  {
    q: "Are these dedicated aurora cameras?",
    a: "No — and this page won't pretend otherwise. The northern feeds in the directory are road, weather, town and harbour cameras run by transport agencies, municipalities and resorts in aurora regions. They were not built for the aurora, but a camera facing a dark landscape is well placed to catch it on a clear, dark, active night. On an ordinary night the same feed shows ordinary darkness.",
  },
  {
    q: "Why is there no wall for northern Canada?",
    a: "Because the catalogue honestly doesn't have one. Canada's directory is large — 4,685 cameras — but its feeds concentrate in the southern cities and highway networks; within 60 km of Whitehorse there are just two catalogue cameras and none near Yellowknife. Rather than dress up a southern city feed as a northern-lights camera, this page gives Canada no wall. Fairbanks carries the North American side.",
  },
];

interface WallDef {
  key: string;
  scopeKey: string;
  heading: string;
  blurb: (count: string) => string;
  placeholder: string;
  groupBy: "city" | "none";
}

const WALLS: WallDef[] = [
  {
    key: "finland",
    scopeKey: "aurora-finland",
    heading: "Finland — Lapland's lake and fell country",
    blurb: (n) =>
      `All ${n} of Finland's catalogue cameras — the national road and weather network that runs the length of the country into Lapland: Rovaniemi, Levi, Saariselkä and the quiet highways between dark lakes and fells. Finland's feeds are among the darkest in the directory, and lake ice makes a fine foreground mirror on still nights.`,
    placeholder: "Search Finland cameras…",
    groupBy: "city",
  },
  {
    key: "iceland",
    scopeKey: "aurora-iceland",
    heading: "Iceland — the road-cam circuit",
    blurb: (n) =>
      `All ${n} of Iceland's catalogue cameras — the road and coastal network that rings the island at aurora latitude. The north and east coasts face the darkest skies; Reykjavík-area feeds carry more town light but still catch strong displays. Iceland's small footprint makes the whole circuit checkable in minutes.`,
    placeholder: "Search Iceland cameras…",
    groupBy: "city",
  },
  {
    key: "norway",
    scopeKey: "aurora-norway",
    heading: "Norway — fjords, Lofoten and Tromsø",
    blurb: (n) =>
      `All ${n} of Norway's catalogue cameras — fjord and mountain-road feeds running north through the Lofoten Islands to Tromsø, a city that lives under the oval for much of the winter. Dark water in the foreground, mountains behind: some of Europe's most reliable aurora country.`,
    placeholder: "Search Norway cameras…",
    groupBy: "city",
  },
  {
    key: "fairbanks",
    scopeKey: "event-le-fairbanks",
    heading: "Fairbanks, Alaska — the North American wall",
    blurb: (n) =>
      `${n} cameras within 60 km of Fairbanks — Alaska's interior aurora capital, where the oval sits overhead on most active nights. When it is mid-morning in Europe it is the middle of the aurora night here, which is why the circuit works: as Earth rotates, different walls take their turn under the brightest part of the oval.`,
    placeholder: "Search Fairbanks cameras…",
    groupBy: "none",
  },
];

export default async function AuroraWebcamsPage() {
  const counts = new Map<string, number>();
  for (const w of WALLS) {
    counts.set(w.key, await countForDef(EXPLORE_SCOPES[w.scopeKey]));
  }
  const fmt = (n: number) => n.toLocaleString("en-US");
  const finland = counts.get("finland") ?? 0;
  const iceland = counts.get("iceland") ?? 0;
  const norway = counts.get("norway") ?? 0;
  const sweden = countryEntry("sweden")?.count ?? 0;

  const intro = [
    `The northern lights are the most-watched sky on Earth — and the hardest to travel to on a forecast. Aurora webcams solve the geography. This page gathers the public cameras of the aurora belt into live walls — ${fmt(finland)} cameras in Finland, ${fmt(iceland)} in Iceland, ${fmt(norway)} in Norway and a Fairbanks wall for Alaska — and puts the live Kp geomagnetic index at the top, because the index is the first check every aurora watcher makes. Every feed is free to watch, no signup.`,
    "The honest framing matters, so here it is in the open: these are not dedicated aurora cameras. They are the road, weather, town and harbour feeds that transport agencies, municipalities and resorts run across the north — cameras that happen to face dark landscapes. On an ordinary night they show ordinary darkness. On a clear, dark, active night, the same feed shows the arc standing over the road and curtains moving above the harbour. The skill is knowing which nights to look, and that is what the Kp panel is for.",
    `Sweden's ${fmt(sweden)} catalogue cameras belong to the same story — Abisko and Kiruna are aurora country — and the northern lights guide linked below covers the Swedish circuit alongside this page's walls. Northern Canada, by contrast, gets no wall here: the catalogue's Canadian feeds concentrate in the south, and a wall that isn't under the oval would be a label, not a tool. What is here is real; what is missing is labelled missing.`,
    "The season runs roughly September to March. Within it, the routine is simple: read the Kp, open the wall whose local night is darkest, judge whether the frame is genuinely dark and current, then give the sky a minute. Aurora on a webcam rarely matches the saturated photographs — look for a diffuse greenish arc low over the northern horizon, structure that brightens and fades, movement within the band itself. Slow change is the signature.",
  ];

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live webcams", href: "/live-webcams" },
          { label: "Aurora webcams" },
        ]}
      />
      <Hero
        h1="Aurora Webcams — the Northern Lights, Live"
        sub="Finland, Iceland, Norway and Fairbanks on live public cameras, with the live Kp index at the top of the page. Free, no signup."
      />
      <StatRow
        stats={[
          { value: fmt(finland), label: "cameras in Finland" },
          { value: fmt(iceland), label: "cameras in Iceland" },
          { value: fmt(norway), label: "cameras in Norway" },
        ]}
      />
      <Intro paragraphs={intro} />

      <AuroraKpPanel />

      {WALLS.map((w) => (
        <section key={w.key} className="mt-12">
          <h2 className="text-xl md:text-2xl font-bold mb-3">{w.heading}</h2>
          <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
            {w.blurb(fmt(counts.get(w.key) ?? 0))}
          </p>
          <DirectoryExplorer
            scopeKey={w.scopeKey}
            scopeLabel={EXPLORE_SCOPES[w.scopeKey].label}
            groupBy={w.groupBy}
            searchPlaceholder={w.placeholder}
            explorerId={`aurora-${w.key}`}
          />
        </section>
      ))}

      <HowTo
        title="How to watch the northern lights on these cameras"
        steps={[
          "Read the live Kp at the top of this page first — below Kp 2, even perfect northern cameras mostly show darkness.",
          "Open the wall whose night is darkest: Europe's walls peak while North America is in daylight, and Fairbanks takes over as Europe's dawn arrives.",
          "Pick feeds facing dark landscapes — lakes, fjords, rural highways — and confirm the timestamp is current.",
          "Judge the darkness honestly: black sky and visible stars mean a useful feed; a lit, parking-lot look means town light will wash out modest displays.",
          "Give the sky a minute, then recheck in five — aurora moves within itself; cloud moves across the frame.",
          "If one country is clouded out, switch walls: cloud is local, the oval is not.",
        ]}
      />

      <FaqSection title="Aurora webcams — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="Keep watching the night sky"
        links={[
          { label: "Northern lights webcams — the guide", href: "/northern-lights-webcams" },
          { label: "Dark-sky cameras: meteors and the night sky", href: "/dark-sky-cameras" },
          { label: "Leonids meteor shower 2026", href: "/leonids-meteor-shower-2026" },
          { label: "Finland cameras", href: "/cameras/countries/finland" },
          { label: "Iceland cameras", href: "/cameras/countries/iceland" },
          { label: "Live webcams worldwide", href: "/live-webcams" },
        ]}
      />

      <TrialCtaSection utmSource="aurora-webcams" />

      <CtaRow backHref="/live-webcams" backLabel="All live webcams" />
    </PageShell>
  );
}
