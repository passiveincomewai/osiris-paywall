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
  title: "Christmas Markets Live — Europe's Market Cities on Camera",
  description:
    "Europe's Christmas markets open from mid-November: Cologne Nov 16, Munich Nov 20, Dresden Nov 25, Nuremberg Nov 27. Watch the market cities live on public cameras — Vienna, Salzburg, Munich and more. Free on WorldEye.",
  alternates: { canonical: `${BASE}/christmas-markets-live` },
  openGraph: {
    title: "Christmas Markets Live — Europe's Market Cities on Camera",
    description:
      "Live public cameras in Europe's great Christmas market cities — Vienna, Salzburg, Graz, Innsbruck, Munich, Nuremberg and Berlin. Free on WorldEye.",
    url: "/christmas-markets-live",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Christmas Markets Live — Europe's Market Cities on Camera",
  description:
    "Live public cameras in the European cities hosting the great Christmas markets of 2026 — Vienna, Salzburg, Graz, Innsbruck, Munich, Nuremberg and Berlin — with the season's scheduled opening dates.",
  url: `${BASE}/christmas-markets-live`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const FAQS = [
  {
    q: "When do the 2026 Christmas markets open?",
    a: "The scheduled 2026 openings roll across November: Essen on November 13, Cologne's cathedral market on November 16, Munich on November 20, Berlin's Gendarmenmarkt on November 23, Dresden's Striezelmarkt on November 25, and the Nuremberg Christkindlesmarkt on November 27 — opened by the Christkind's prologue from the Frauenkirche balcony at 17:30, and running to December 24. Austria's market cities open across the same Advent season. Dates are the markets' scheduled dates; a city's own site is the final word.",
  },
  {
    q: "Can I watch the market squares themselves on these cameras?",
    a: "Sometimes, and this page is explicit about where. Vienna's dense public camera network watches the old town around its markets. In the German cities the directory's cameras are mostly city and road feeds near the centre — atmosphere and weather, not a stall-level view. And two famous market cities, Cologne and Dresden, have no public cameras in the directory at all, so they appear in the calendar below without a wall: no wall, rather than an unrelated camera dressed up as a market view.",
  },
  {
    q: "Which city has the most cameras?",
    a: "Vienna, by a wide margin — it is one of the densest public camera networks in Europe, and its wall below is the fullest on this page. Salzburg, Graz and Innsbruck follow; the German walls (Munich, Nuremberg, Berlin) are thinner, and each section states its real count.",
  },
  {
    q: "When is the best time to watch?",
    a: "After dark, local time. The markets are an evening spectacle — lights, steam and crowds against early winter dusk. Central Europe is six hours ahead of US Eastern Time, so the market evening lands in the North American afternoon: a lunchtime window onto the Rathausplatz at its glowing best.",
  },
  {
    q: "Are these cameras free to watch?",
    a: "Yes. Every camera on this page is a public feed in the WorldEye index and opens free — no account, no signup. Each wall is every catalogue camera within 20 km of the city centre, nearest first.",
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
    key: "vienna",
    scopeKey: "event-cm-vienna",
    heading: "Vienna — the capital of Christmas markets",
    blurb: (n) =>
      `${n} cameras within 20 km of central Vienna — the Innere Stadt, the Ringstrasse and the districts around the Rathausplatz Christkindlmarkt and the palace markets. The richest market-city wall in the directory, and the page's anchor.`,
    placeholder: "Search Vienna cameras…",
  },
  {
    key: "salzburg",
    scopeKey: "event-cm-salzburg",
    heading: "Salzburg — the Christkindlmarkt under the fortress",
    blurb: (n) =>
      `${n} cameras within 20 km of Salzburg's old town — the cathedral and Residenzplatz market ground, the Salzach riverbanks and the lanes beneath Hohensalzburg fortress.`,
    placeholder: "Search Salzburg cameras…",
  },
  {
    key: "graz",
    scopeKey: "event-cm-graz",
    heading: "Graz — Advent in the old town",
    blurb: (n) =>
      `${n} cameras within 20 km of Graz — the Hauptplatz and the old-town squares of Austria's second city, a UNESCO-listed centre that fills with market stalls through Advent.`,
    placeholder: "Search Graz cameras…",
  },
  {
    key: "innsbruck",
    scopeKey: "event-cm-innsbruck",
    heading: "Innsbruck — markets under the Nordkette",
    blurb: (n) =>
      `${n} cameras within 20 km of Innsbruck — the Golden Roof old town and the Inn valley, where the market sits in a natural amphitheatre of Alpine peaks and the evening light goes early.`,
    placeholder: "Search Innsbruck cameras…",
  },
  {
    key: "munich",
    scopeKey: "event-cm-munich",
    heading: "Munich — Christkindlmarkt at Marienplatz (opens Nov 20, scheduled)",
    blurb: (n) =>
      `${n} cameras within 20 km of central Munich — a thinner wall, mostly city and road feeds around the centre rather than square-level views. The market opens on November 20 as scheduled; the cameras carry the city's Advent weather and streets.`,
    placeholder: "Search Munich cameras…",
  },
  {
    key: "nuremberg",
    scopeKey: "event-cm-nuremberg",
    heading: "Nuremberg — the Christkindlesmarkt (opens Nov 27, scheduled)",
    blurb: (n) =>
      `${n} cameras within 20 km of Nuremberg — the most famous market of all, drawing around two million visitors a season to the Hauptmarkt's red-and-white stalls. The directory's cameras here are city feeds; the count is stated plainly because it is small.`,
    placeholder: "Search Nuremberg cameras…",
  },
  {
    key: "berlin",
    scopeKey: "event-cm-berlin",
    heading: "Berlin — Gendarmenmarkt and a city of markets (opens Nov 23, scheduled)",
    blurb: (n) =>
      `Just ${n} cameras within 20 km of central Berlin in the directory — the thinnest wall on this page, stated as it is. Berlin hosts dozens of markets, the Gendarmenmarkt scheduled first on November 23; these feeds are a keyhole, not a panorama.`,
    placeholder: "Search Berlin cameras…",
  },
];

const OPENINGS = [
  { city: "Essen", date: "Fri, Nov 13", note: "Among the season's first openings in Germany." },
  { city: "Cologne — Cathedral market", date: "Mon, Nov 16", note: "No cameras in the directory — calendar entry only, honestly without a wall." },
  { city: "Munich — Marienplatz", date: "Fri, Nov 20", note: "Wall below." },
  { city: "Berlin — Gendarmenmarkt", date: "Mon, Nov 23", note: "Wall below — the directory's thinnest." },
  { city: "Dresden — Striezelmarkt", date: "Wed, Nov 25", note: "Germany's oldest market — and no cameras in the directory within 60 km. Calendar entry only." },
  { city: "Nuremberg — Christkindlesmarkt", date: "Fri, Nov 27", note: "Opened by the Christkind's prologue, 17:30; runs to Dec 24. Wall below." },
];

export default async function ChristmasMarketsLivePage() {
  const counts = new Map<string, number>();
  for (const w of WALLS) {
    counts.set(w.key, await countForDef(EXPLORE_SCOPES[w.scopeKey]));
  }
  const fmt = (n: number) => n.toLocaleString("en-US");
  const vienna = counts.get("vienna") ?? 0;
  const salzburg = counts.get("salzburg") ?? 0;

  const intro = [
    `For five weeks from mid-November, Europe's old towns run on a second calendar: the Christmas markets. Cologne's cathedral market opens November 16, Munich on November 20, Dresden's Striezelmarkt on November 25, and Nuremberg's Christkindlesmarkt — the most famous of them all — on November 27, each date the market's scheduled opening for 2026. This page gathers the live public cameras of the market cities: ${fmt(vienna)} within 20 km of central Vienna, ${fmt(salzburg)} around Salzburg, and walls for Graz, Innsbruck, Munich, Nuremberg and Berlin below. Every feed is free to watch, no signup.`,
    "The honest shape of the coverage matters, so here it is in the open: Austria carries this page. Vienna's public camera network is one of Europe's densest, and Salzburg, Graz and Innsbruck are well covered. Germany's great market cities are thinner in the directory — Munich and Nuremberg have city walls in the teens and single digits — and Cologne and Dresden have no catalogue cameras at all. Rather than dress up an unrelated feed as a market view, those two appear in the opening calendar below with no wall. What is here is real; what is missing is labelled missing.",
    "Markets are a night product. The stalls, the Glühwein steam and the light canopies earn their reputation after dark, and Central Europe's early winter dusk means the best watching from North America is the afternoon — Vienna at full glow while it is lunchtime in New York. Snow, when it comes, turns the whole circuit into the postcard.",
    "The season runs to December 24. This page stays up through it — come back on opening nights, when the crowds and the lights arrive together.",
  ];

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live events", href: "/live-events" },
          { label: "Christmas markets live" },
        ]}
      />
      <Hero
        h1="Christmas Markets Live — Europe's Market Cities"
        sub="The markets open from mid-November — Cologne Nov 16, Munich Nov 20, Dresden Nov 25, Nuremberg Nov 27. Watch the market cities light up, live and free."
      />
      <StatRow
        stats={[
          { value: fmt(vienna), label: "cameras within 20 km of central Vienna" },
          { value: "Nov 27", label: "Nuremberg Christkindlesmarkt opens (scheduled)" },
          { value: "Dec 24", label: "the season runs to Christmas Eve" },
        ]}
      />
      <Intro paragraphs={intro} />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-5">The 2026 opening calendar (scheduled dates)</h2>
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-white/45">
                <th className="px-5 py-3 font-medium">Market</th>
                <th className="px-5 py-3 font-medium">Opens</th>
                <th className="px-5 py-3 font-medium">On this page</th>
              </tr>
            </thead>
            <tbody>
              {OPENINGS.map((o) => (
                <tr key={o.city} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-3 font-medium text-white/85">{o.city}</td>
                  <td className="px-5 py-3 text-white/65">{o.date}</td>
                  <td className="px-5 py-3 text-white/55">{o.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-white/35">
          Opening dates are the markets&apos; scheduled 2026 dates as published in
          October 2026; confirm on each market&apos;s own site before travelling.
          Austria&apos;s market cities — Vienna, Salzburg, Graz, Innsbruck — open
          across the same Advent season and have walls below.
        </p>
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
            explorerId={`cm-${w.key}`}
          />
        </section>
      ))}

      <HowTo
        title="How to watch the markets light up"
        steps={[
          "Time it for the European evening: Central Europe runs six hours ahead of US Eastern, so mid-afternoon in New York is full market glow in Vienna.",
          "Start with Vienna — the densest wall — then work west through Salzburg and Innsbruck as their dusks deepen.",
          "Check opening nights in the calendar above: the first evening is when the light switch-ons and the biggest crowds land.",
          "Watch the weather as part of the show — the first snow over the stalls is the season's signature frame, and the mountain-city walls (Innsbruck, Salzburg) show it first.",
        ]}
      />

      <FaqSection title="Christmas markets — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="More live WorldEye"
        links={[
          { label: "Europe live cameras", href: "/europe-live-cameras" },
          { label: "Austria cameras", href: "/cameras/countries/austria" },
          { label: "Germany traffic cameras", href: "/germany-traffic-cameras" },
          { label: "Live events", href: "/live-events" },
          { label: "Live webcams worldwide", href: "/live-webcams" },
        ]}
      />

      <TrialCtaSection utmSource="christmas-markets-live" />

      <CtaRow backHref="/live-events" backLabel="Live events" />
    </PageShell>
  );
}
