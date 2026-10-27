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
  title: "Leonids Meteor Shower 2026 — Dark-Sky Cameras for Peak Night",
  description:
    "The Leonid meteor shower peaks the night of November 17–18, 2026 under dark skies. Watch from the darkest public cameras on Earth — Alaska, Iceland, the desert Southwest — plus the Beaver Supermoon on Nov 24. Free on WorldEye.",
  alternates: { canonical: `${BASE}/leonids-meteor-shower-2026` },
  openGraph: {
    title: "Leonids Meteor Shower 2026 — Dark-Sky Cameras for Peak Night",
    description:
      "Dark-sky public cameras for the Leonid peak, November 17–18, 2026 — Fairbanks, Reykjavík, Flagstaff, Moab and Joshua Tree, plus New York for the Beaver Supermoon. Free on WorldEye.",
    url: "/leonids-meteor-shower-2026",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Leonids Meteor Shower 2026 — Dark-Sky Cameras for Peak Night",
  description:
    "Public cameras in dark-sky country — Alaska, Iceland and the desert Southwest — gathered for the Leonid meteor shower peak of November 17–18, 2026, and the Beaver Supermoon of November 24.",
  url: `${BASE}/leonids-meteor-shower-2026`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const eventLd = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: "Leonid Meteor Shower Peak 2026",
  startDate: "2026-11-17",
  endDate: "2026-11-18",
  description:
    "The Leonid meteor shower peaks on the night of November 17–18, 2026, with roughly 10–15 meteors per hour expected from dark sites under a thin crescent moon that sets early.",
};

const FAQS = [
  {
    q: "When do the Leonids peak in 2026?",
    a: "The night of November 17–18, 2026. This year's peak comes under unusually dark skies — a thin crescent moon sets early, leaving the post-midnight hours properly dark. Expect roughly 10–15 meteors per hour from a dark site: a modest, steady shower rather than a storm, with the Leonids' characteristically fast, bright meteors and occasional fireballs.",
  },
  {
    q: "Can these cameras actually show the meteors?",
    a: "Sometimes — and this page will not promise more than that. A webcam at a genuinely dark site registers bright meteors and fireballs as a streak gone in under a second; the Leonids' faintest meteors fall below any webcam sensor. No specific camera can be promised a meteor on any specific night: clouds, the camera's field of view and plain luck all decide. What the walls below give you is geography — a circuit of dark places across time zones, so somewhere it is midnight, clear and dark while you watch.",
  },
  {
    q: "Why are most of these cameras road and landscape cameras?",
    a: "Because that is what the public camera networks of dark country are. The selection rule is darkness, not telescopes: remote highway, mountain and coastal cameras far from city light, whose night frames run genuinely black. A street-level camera under a dark sky still shows that sky — and a bright fireball crossing it is unmistakable.",
  },
  {
    q: "What is the Beaver Supermoon?",
    a: "The full moon of November 24, 2026 — a supermoon, falling at one of the moon's closest approaches of the year, and the first of a run of consecutive supermoons. It rises at sunset local time, largest-looking low over the skyline. The New York wall below is the moonrise wall: city cameras are exactly the right tool for a moonrise, even though they are the wrong tool for meteors.",
  },
  {
    q: "When should I watch, my time?",
    a: "Meteor rates climb after midnight at the camera's location, when its side of Earth turns into the debris stream. The walls span Alaska to Iceland — eleven time zones of night — so prime hours somewhere on this page run almost around the clock. Start with the wall whose local time is deepest past midnight and clearest.",
  },
  {
    q: "Are these cameras free to watch?",
    a: "Yes. Every camera on this page is a public feed in the WorldEye index and opens free — no account, no signup. Each wall is every catalogue camera within the stated distance of the named place, nearest first.",
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
    key: "fairbanks",
    scopeKey: "event-le-fairbanks",
    heading: "Fairbanks, Alaska — the long northern night",
    blurb: (n) =>
      `${n} cameras within 60 km of Fairbanks — Interior Alaska's highway and town cameras under some of the longest November nights on Earth. This wall doubles as aurora country: at Fairbanks' latitude, a clear peak night can serve both shows at once.`,
    placeholder: "Search Fairbanks cameras…",
  },
  {
    key: "reykjavik",
    scopeKey: "event-le-reykjavik",
    heading: "Reykjavík, Iceland — the Atlantic's dark edge",
    blurb: (n) =>
      `${n} cameras within 30 km of Reykjavík — Iceland's capital-region road and coastal network, at the edge of a country whose interior is among Europe's darkest. The last wall to reach midnight, and often the clearest when the continent is clouded.`,
    placeholder: "Search Reykjavík cameras…",
  },
  {
    key: "flagstaff",
    scopeKey: "event-le-flagstaff",
    heading: "Flagstaff, Arizona — the first Dark Sky City",
    blurb: (n) =>
      `${n} cameras within 40 km of Flagstaff — the high-elevation city that invented dark-sky lighting law, at 2,100 metres under desert air. Northern Arizona is the Leonids' classic American watching ground.`,
    placeholder: "Search Flagstaff cameras…",
  },
  {
    key: "moab",
    scopeKey: "event-le-moab",
    heading: "Moab, Utah — canyon country darkness",
    blurb: (n) =>
      `${n} cameras within 50 km of Moab — the US-191 corridor through red-rock country between two dark-sky national parks. A thin wall, because the country is empty; that emptiness is the point.`,
    placeholder: "Search Moab cameras…",
  },
  {
    key: "joshua-tree",
    scopeKey: "event-le-joshua-tree",
    heading: "Joshua Tree, California — the Mojave sky",
    blurb: (n) =>
      `${n} cameras within 40 km of Joshua Tree — the Mojave Desert's gateway towns. The smallest wall on this page, stated plainly: desert-edge feeds whose night frames run dark once you are past the town lights.`,
    placeholder: "Search Joshua Tree cameras…",
  },
  {
    key: "nyc",
    scopeKey: "event-le-nyc",
    heading: "New York City — the Beaver Supermoon moonrise, Nov 24",
    blurb: (n) =>
      `${n} cameras within 25 km of the city centre — included for the opposite kind of night watching. A week after the Leonid peak, the Beaver Supermoon rises over this skyline on November 24; for a moonrise, a bright city wall is not the compromise, it is the instrument.`,
    placeholder: "Search New York City cameras…",
  },
];

export default async function LeonidsMeteorShower2026Page() {
  const counts = new Map<string, number>();
  for (const w of WALLS) {
    counts.set(w.key, await countForDef(EXPLORE_SCOPES[w.scopeKey]));
  }
  const fmt = (n: number) => n.toLocaleString("en-US");
  const reykjavik = counts.get("reykjavik") ?? 0;
  const fairbanks = counts.get("fairbanks") ?? 0;
  const nyc = counts.get("nyc") ?? 0;

  const intro = [
    `The Leonid meteor shower peaks on the night of November 17–18, 2026, and this year the Moon cooperates: a thin crescent sets early, leaving the deep night properly dark. From a dark site expect roughly 10–15 meteors an hour — not a storm year, but the Leonids are the fastest meteors of the calendar, and their bright ones leave trains. This page gathers the darkest public cameras in the WorldEye directory for the peak: ${fmt(fairbanks)} within 60 km of Fairbanks, ${fmt(reykjavik)} around Reykjavík, and the desert walls of Flagstaff, Moab and Joshua Tree below. Every feed is free to watch, no signup.`,
    "The honest limits, stated before the walls: no camera can be promised a meteor. Webcam sensors catch the bright end of a shower — the fireballs — and miss the faint majority your eyes would catch from the same ground. Cloud decides more than geography does. What a page like this actually sells is a circuit: dark places spread across eleven time zones, so that when it is cloudy or dawn where you are, it is past midnight and clear somewhere below. Rotate the walls; the shower is patient even when the weather is not.",
    "A week later the same page changes instruments. On November 24 the Beaver Supermoon rises — the first of a run of consecutive supermoons — and the right camera for a moonrise is not a desert feed but a skyline. The New York wall closes the page for exactly that: the full moon coming up over the city, watched from the city's own cameras.",
    "Peak night is November 17–18; the supermoon follows on November 24. Both are in the diary — the walls stay live between them.",
  ];

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <JsonLd data={eventLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live events", href: "/live-events" },
          { label: "Leonids meteor shower 2026" },
        ]}
      />
      <Hero
        h1="Leonids Meteor Shower 2026 — Watch From the Darkest Cameras on Earth"
        sub="Peak night November 17–18, under a thin crescent moon that sets early. Dark-sky cameras across Alaska, Iceland and the desert Southwest — plus the Beaver Supermoon on Nov 24. Free, no signup."
      />
      <StatRow
        stats={[
          { value: "Nov 17–18", label: "Leonid peak night, 2026" },
          { value: "10–15/hr", label: "expected rate from dark sites" },
          { value: fmt(nyc), label: "NYC cameras for the Nov 24 supermoon moonrise" },
        ]}
      />
      <Intro paragraphs={intro} />

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
            explorerId={`le-${w.key}`}
          />
        </section>
      ))}

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-5">Two nights, two kinds of sky</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="font-semibold text-white/90">Nov 17–18: the Leonid peak</h3>
            <p className="text-sm text-white/55 mt-2 leading-relaxed">
              The Earth crosses the debris stream of comet Tempel–Tuttle. Rates build
              after local midnight and peak before dawn; the thin crescent moon sets
              early and leaves the sky to the shower. Fast meteors, occasional
              fireballs, lingering trains.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="font-semibold text-white/90">Nov 24: the Beaver Supermoon</h3>
            <p className="text-sm text-white/55 mt-2 leading-relaxed">
              A full moon at close approach, rising at sunset. The camera craft is
              different: you want the moon low, over a skyline or a ridge, in its
              first half hour — which is what the New York wall at the foot of this
              page is for.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="font-semibold text-white/90">Meteor or satellite?</h3>
            <p className="text-sm text-white/55 mt-2 leading-relaxed">
              On a dark feed you will see both. A meteor is gone in under a second,
              often brightening as it crosses. A satellite or the space station
              crosses steadily, over minutes, at constant brightness. Blinking means
              aircraft. All three are worth watching; only the first counts.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="font-semibold text-white/90">Why cameras, not just eyes?</h3>
            <p className="text-sm text-white/55 mt-2 leading-relaxed">
              Because the weather is local and the shower is global. A circuit of
              dark cameras across longitudes turns one cloudy night at home into a
              planet-wide watch — the same trick the aurora hunters use, pointed at a
              different sky.
            </p>
          </div>
        </div>
      </section>

      <HowTo
        title="How to watch peak night on the walls"
        steps={[
          "Start after your local midnight if you can — rates climb as your side of Earth turns into the stream; the walls let you cheat by starting where it is already late.",
          "Open the wall whose local time is deepest into the night and check its frame honestly: black sky, visible stars, ground as dim shapes. A lit parking lot is not a dark-sky feed.",
          "Keep three to five feeds across different longitudes in rotation, so one bank of cloud never ends your night.",
          "Watch for the fast signature — a streak, gone. Log the slow bright points as satellites and enjoy them separately.",
          "Come back on November 24 at sunset for the other show: the Beaver Supermoon rising over the New York wall.",
        ]}
      />

      <FaqSection title="Leonids 2026 — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="More night watching"
        links={[
          { label: "Dark-sky cameras", href: "/dark-sky-cameras" },
          { label: "Northern lights webcams", href: "/northern-lights-webcams" },
          { label: "Sunrise around the world", href: "/sunrise-around-the-world" },
          { label: "Space station tracker", href: "/space-station-tracker" },
          { label: "Live events", href: "/live-events" },
        ]}
      />

      <TrialCtaSection utmSource="leonids-meteor-shower-2026" />

      <CtaRow backHref="/live-events" backLabel="Live events" />
    </PageShell>
  );
}
