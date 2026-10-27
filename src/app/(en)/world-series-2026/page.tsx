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

export const metadata: Metadata = {
  title: "World Series 2026 — Live Cameras in St. Petersburg & Milwaukee",
  description:
    "The Brewers and Rays play for a first-time champion — Game 3 tonight in St. Petersburg, Games 6–7 in Milwaukee if needed. Watch both ballpark cities live on WorldEye's public cameras. Free, no signup.",
  alternates: { canonical: `${BASE}/world-series-2026` },
  openGraph: {
    title: "World Series 2026 — Live Cameras in St. Petersburg & Milwaukee",
    description:
      "Live public cameras around both World Series cities: St. Petersburg & Tampa Bay for Games 3–5, Milwaukee for Games 6–7. Free on WorldEye.",
    url: "/world-series-2026",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "World Series 2026 — Live Cameras in St. Petersburg & Milwaukee",
  description:
    "Live public cameras around the 2026 World Series' two host cities: St. Petersburg, Florida (Games 3–5) and Milwaukee, Wisconsin (Games 6–7).",
  url: `${BASE}/world-series-2026`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const FAQS = [
  {
    q: "When and where is Game 3 of the 2026 World Series?",
    a: "Game 3 is tonight, Monday, October 26, 2026, at Tropicana Field in St. Petersburg, Florida — the Tampa Bay Rays' home park. Games 4 and 5 follow in St. Petersburg on October 27 and 28, and if the series goes that far, Games 6 and 7 are at American Family Field in Milwaukee on October 30 and 31.",
  },
  {
    q: "Can I watch the World Series games themselves on these cameras?",
    a: "No — and the page doesn't pretend otherwise. Both ballparks are enclosed (Tropicana Field is a permanent dome; American Family Field has a retractable roof), so no public camera shows the field. These cameras show the host cities on Series nights: the waterfronts, downtown streets, fan traffic and weather around the ballparks. The games themselves are on the broadcast.",
  },
  {
    q: "Who is playing in the 2026 World Series?",
    a: "The Milwaukee Brewers and the Tampa Bay Rays. Neither club has ever won a World Series, so 2026 crowns a first-time champion either way. Milwaukee swept the defending-champion Los Angeles Dodgers to get here, and this is the Brewers' first World Series appearance since 1982.",
  },
  {
    q: "Are these cameras free to watch?",
    a: "Yes. Every camera on this page is a public feed in the WorldEye index and opens free — no account, no signup. Open any card to watch the live feed, or jump to the same spot on the globe.",
  },
  {
    q: "What is the best time to watch the cameras?",
    a: "Game nights, in the hour before first pitch and again as the games end — that's when the streets, waterfronts and fan zones around each ballpark are busiest. In St. Petersburg, check the waterfront and downtown feeds; in Milwaukee on October 30–31, the downtown and riverwalk cameras catch the city turning out.",
  },
];

export default async function WorldSeries2026Page() {
  const stp = await countForDef(EXPLORE_SCOPES["event-world-series-st-petersburg"]);
  const mke = await countForDef(EXPLORE_SCOPES["event-world-series-milwaukee"]);
  const fmt = (n: number) => n.toLocaleString("en-US");

  const intro = [
    `The 2026 World Series is the Milwaukee Brewers against the Tampa Bay Rays, and it guarantees something no Series has had in years: a first-time champion, because neither club has ever won it. Game 3 is tonight, Monday, October 26, at Tropicana Field in St. Petersburg, Florida. Games 4 and 5 follow there on October 27 and 28 — and if the series goes the distance, Games 6 and 7 bring it to Milwaukee on October 30 and 31. This page gathers the live public cameras around both ballpark cities: ${fmt(stp)} within 25 km of Tropicana Field and ${fmt(mke)} within 25 km of downtown Milwaukee, every one free to watch with no signup.`,
    "One honest note before the walls: both ballparks are enclosed. Tropicana Field is a dome and American Family Field has a retractable roof, so no camera here — or anywhere public — shows the game itself. What these cameras show is the two cities on the biggest nights of their sporting lives: St. Petersburg's waterfront and downtown filling up before first pitch, Tampa Bay traffic on game night, and then, if the series survives Florida, Milwaukee turning out for its first World Series home games in 44 years.",
    "Milwaukee's wait is the story of the week. The Brewers swept the defending-champion Dodgers to win the pennant, reaching the World Series for the first time since 1982. If there is a Game 6 on Friday, the cameras below are the city's front porch: downtown, the riverwalk, and the avenues around American Family Field, live.",
    "Watch the St. Petersburg wall on the Florida game nights (October 26–28) and the Milwaukee wall on October 30–31 if the series gets there. Between games, the same feeds are the two cities as they always are — which, this week, is the point.",
  ];

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live events", href: "/live-events" },
          { label: "World Series 2026" },
        ]}
      />
      <Hero
        h1="World Series 2026 — Live From Both Ballpark Cities"
        sub="Brewers vs Rays for a first-time champion. Game 3 tonight in St. Petersburg; Games 6–7 in Milwaukee if needed — watch both cities live, free, no signup."
      />
      <StatRow
        stats={[
          { value: fmt(stp), label: "cameras within 25 km of Tropicana Field" },
          { value: fmt(mke), label: "cameras within 25 km of downtown Milwaukee" },
          { value: "1st", label: "first-time champion, guaranteed" },
        ]}
      />
      <Intro paragraphs={intro} />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          St. Petersburg &amp; Tampa Bay — Games 3, 4 and 5
        </h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          {fmt(stp)} public cameras within 25 km of Tropicana Field, nearest first — the
          downtown waterfront, the bayshore, the causeways and the game-night traffic of
          the Tampa Bay area while the Rays are home, October 26–28.
        </p>
        <DirectoryExplorer
          scopeKey="event-world-series-st-petersburg"
          scopeLabel="St. Petersburg & Tampa Bay"
          groupBy="none"
          searchPlaceholder="Search St. Petersburg & Tampa Bay cameras…"
          explorerId="ws-st-petersburg"
        />
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          Milwaukee — Games 6 and 7, if needed (Oct 30–31)
        </h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          {fmt(mke)} public cameras within 25 km of downtown Milwaukee, nearest first —
          the riverwalk, downtown streets and the avenues around American Family Field,
          ready for the Brewers&apos; first World Series home games since 1982.
        </p>
        <DirectoryExplorer
          scopeKey="event-world-series-milwaukee"
          scopeLabel="Milwaukee"
          groupBy="none"
          searchPlaceholder="Search Milwaukee cameras…"
          explorerId="ws-milwaukee"
        />
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-5">The series at a glance</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="font-semibold text-white/90">The matchup</h3>
            <p className="text-sm text-white/55 mt-2 leading-relaxed">
              Milwaukee Brewers vs Tampa Bay Rays — two franchises with zero championships
              between them. Whoever lifts the trophy is a first-time winner, which makes
              every remaining game a piece of one city&apos;s history.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="font-semibold text-white/90">The schedule</h3>
            <p className="text-sm text-white/55 mt-2 leading-relaxed">
              Games 3, 4 and 5: October 26, 27 and 28 at Tropicana Field, St. Petersburg.
              Games 6 and 7, if the series is still alive: October 30 and 31 at American
              Family Field, Milwaukee.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="font-semibold text-white/90">Milwaukee&apos;s long wait</h3>
            <p className="text-sm text-white/55 mt-2 leading-relaxed">
              The Brewers last played in a World Series in 1982. They reached this one by
              sweeping the defending-champion Dodgers — and if the series returns to
              Wisconsin on Friday, the city cameras above will show a celebration 44
              years in the making, one way or the other.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="font-semibold text-white/90">What the cameras can and can&apos;t show</h3>
            <p className="text-sm text-white/55 mt-2 leading-relaxed">
              Both parks are roofed, so the games themselves stay on the broadcast. The
              cameras carry everything around them: fan zones, waterfronts, traffic and
              the two cities dressed for the biggest week of their year.
            </p>
          </div>
        </div>
      </section>

      <HowTo
        title="How to watch the Series cities live"
        steps={[
          "Open the wall for tonight's host city — St. Petersburg for Games 3–5, Milwaukee for Games 6–7 if the series gets there.",
          "Check in an hour before first pitch: that's when the waterfronts, fan zones and ballpark avenues are at their busiest.",
          "Open any camera to watch its live feed, or jump to the same spot on the globe for the streets around it.",
          "Come back after the final out — the winning city's cameras are where the celebration shows up first.",
        ]}
      />

      <FaqSection title="World Series 2026 cameras — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="More live WorldEye"
        links={[
          { label: "Live events", href: "/live-events" },
          { label: "Live webcams worldwide", href: "/live-webcams" },
          { label: "Beach webcams", href: "/beach-webcams" },
          { label: "United States cameras", href: "/cameras/countries/united-states" },
        ]}
      />

      <TrialCtaSection utmSource="world-series-2026" />

      <CtaRow backHref="/live-events" backLabel="Live events" />
      <p className="mt-6 text-xs text-white/30">
        Schedule and matchup details as reported on October 26, 2026. Looking for the
        games themselves? They are on the official broadcast — these cameras cover the
        host cities, not the field. See also the{" "}
        <Link href="/live-webcams" className="text-[#00E5FF] hover:underline">
          worldwide camera directory
        </Link>
        .
      </p>
    </PageShell>
  );
}
