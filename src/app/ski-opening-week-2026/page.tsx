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
  title: "Ski Opening Week 2026 — First Resorts Open, Live Cameras",
  description:
    "Arapahoe Basin and Winter Park are projected to open October 30, Keystone October 31. Watch the snow, the snow stakes and the drive up on live cameras around each resort. Free on WorldEye.",
  alternates: { canonical: `${BASE}/ski-opening-week-2026` },
  openGraph: {
    title: "Ski Opening Week 2026 — First Resorts Open, Live Cameras",
    description:
      "Live cameras around Colorado's first-opening resorts of 2026: Arapahoe Basin, Winter Park and Keystone. Free on WorldEye.",
    url: "/ski-opening-week-2026",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Ski Opening Week 2026 — First Resorts Open, Live Cameras",
  description:
    "Live public cameras around the Colorado resorts projected to open first in the 2026–27 ski season — Arapahoe Basin and Winter Park (October 30) and Keystone (October 31) — with the early-season projected opening table.",
  url: `${BASE}/ski-opening-week-2026`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const FAQS = [
  {
    q: "When does the 2026–27 ski season start?",
    a: "In Colorado, this week. Arapahoe Basin and Winter Park are projected to open Friday, October 30, 2026, and Keystone is expected Saturday, October 31 — the first lifts of the North American season. Breckenridge and Copper Mountain are projected for November 6 and Vail for November 13. All of these dates are projections compiled from resort announcements (tracked by OnTheSnow as of October 26); resorts confirm their opening days, and dates move with the weather.",
  },
  {
    q: "Which resort opens first in 2026?",
    a: "On current projections it is a tie: Arapahoe Basin and Winter Park both target Friday, October 30. Arapahoe Basin — one of the highest ski areas in North America, sitting on Loveland Pass — is famous for winning this race and for staying open latest into the summer, but in 2026 the projected date is shared. Watch both resorts' cameras this week: snowmaking plumes and lift testing usually show before any announcement.",
  },
  {
    q: "Are the opening dates confirmed?",
    a: "No — they are projected, and this page says so every time it prints one. Early-season openings depend on snowmaking temperatures and natural snow (Colorado ski country expects 4–12 inches this week, under a winter weather advisory). Resorts make the final call, sometimes with a day's notice. The cameras are the ground truth between announcements: if the base area is white and the lifts are spinning for patrol, opening is real.",
  },
  {
    q: "Can I see the snow stakes and the drive up?",
    a: "Yes. Each resort's own WorldEye page pins its snow stake cameras first and carries the traffic cameras on the roads around it, plus a route tool that lines up every camera along your drive. The walls on this page gather every public camera within 30 km of each opening resort — the mountain, the pass and the corridor in one view.",
  },
  {
    q: "Are these cameras free to watch?",
    a: "Yes. Every camera here is a public feed in the WorldEye index and opens free — no account, no signup. The resort pages add conditions and alerts on top of the same free feeds.",
  },
];

/* Projected opening dates as compiled by OnTheSnow and reported
   October 26, 2026 — projections, not resort confirmations. */
const OPENINGS: Array<{ resort: string; slug: string; date: string; note: string }> = [
  { resort: "Arapahoe Basin", slug: "arapahoe-basin", date: "Fri, Oct 30", note: "Projected" },
  { resort: "Winter Park", slug: "winter-park", date: "Fri, Oct 30", note: "Projected" },
  { resort: "Keystone", slug: "keystone", date: "Sat, Oct 31", note: "Projected" },
  { resort: "Breckenridge", slug: "breckenridge", date: "Fri, Nov 6", note: "Projected" },
  { resort: "Copper Mountain", slug: "copper-mountain", date: "Fri, Nov 6", note: "Projected" },
  { resort: "Vail", slug: "vail", date: "Fri, Nov 13", note: "Projected" },
];

interface ResortWall {
  key: string;
  scopeKey: string;
  slug: string;
  heading: string;
  blurb: (count: string) => string;
  placeholder: string;
}

const WALLS: ResortWall[] = [
  {
    key: "arapahoe-basin",
    scopeKey: "event-ski-opening-arapahoe-basin",
    slug: "arapahoe-basin",
    heading: "Arapahoe Basin — projected Fri, Oct 30",
    blurb: (n) =>
      `${n} cameras within 30 km of the resort — Loveland Pass, the base area and the I-70 corridor below. A-Basin races to be first almost every year, and its high base means this week's natural snow lands on top of cold, ready snowmaking.`,
    placeholder: "Search Arapahoe Basin area cameras…",
  },
  {
    key: "winter-park",
    scopeKey: "event-ski-opening-winter-park",
    slug: "winter-park",
    heading: "Winter Park — projected Fri, Oct 30",
    blurb: (n) =>
      `${n} cameras within 30 km of the resort — Berthoud Pass, the Fraser Valley and the US-40 drive. Winter Park shares the projected first day; its cameras show both the mountain and the pass road every Front Range skier has to cross to reach it.`,
    placeholder: "Search Winter Park area cameras…",
  },
  {
    key: "keystone",
    scopeKey: "event-ski-opening-keystone",
    slug: "keystone",
    heading: "Keystone — projected Sat, Oct 31",
    blurb: (n) =>
      `${n} cameras within 30 km of the resort — the Snake River valley, Dillon and the Loveland Pass approach it shares with A-Basin. A Halloween opening would make it three Colorado resorts spinning lifts inside the season's first weekend.`,
    placeholder: "Search Keystone area cameras…",
  },
];

export default async function SkiOpeningWeek2026Page() {
  const counts = new Map<string, number>();
  for (const w of WALLS) {
    counts.set(w.key, await countForDef(EXPLORE_SCOPES[w.scopeKey]));
  }
  const fmt = (n: number) => n.toLocaleString("en-US");
  const abasin = counts.get("arapahoe-basin") ?? 0;
  const wp = counts.get("winter-park") ?? 0;
  const key = counts.get("keystone") ?? 0;

  const intro = [
    `Ski season starts this week in Colorado. Arapahoe Basin and Winter Park are projected to open on Friday, October 30, 2026, with Keystone expected to follow on Saturday, October 31 — the first lifts of the 2026–27 season, powered by this week's natural snow (4–12 inches expected across Colorado ski country, under a winter weather advisory) laid over round-the-clock snowmaking. Projected is the honest word: opening dates are forecasts until a resort confirms them, and they move with the weather. What doesn't move is the view. This page gathers the live public cameras around each opening resort — ${fmt(abasin)} within 30 km of Arapahoe Basin, ${fmt(wp)} around Winter Park, ${fmt(key)} around Keystone — free to watch, no signup, so you can see the snow arrive and judge the call yourself.`,
    "The race to open first is a real contest with real tells. Snowmaking plumes show on base cameras on cold nights days before an announcement. Lift chairs start turning for patrol and lift-crew training. Snow stakes — the marked boards resorts read their totals from, pinned first on every WorldEye resort page — begin the season at zero and become the week's scoreboard. All of it is visible here before it is official anywhere.",
    "Opening week is also a driving problem. The same storm that makes the skiing buries I-70 and the passes, and the first-weekend crowd all leaves Denver at the same hour. Every wall below mixes the resort's cameras with the corridor and pass cameras around it — Loveland Pass for A-Basin and Keystone, Berthoud Pass for Winter Park — because on opening weekend the drive is half the event.",
  ];

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Ski webcams", href: "/ski-webcams" },
          { label: "Ski opening week 2026" },
        ]}
      />
      <Hero
        h1="Ski Opening Week 2026 — First Lifts, Live"
        sub="Arapahoe Basin and Winter Park are projected to open Friday, Keystone Saturday. Watch the snow, the stakes and the drive up — free, no signup."
      />
      <StatRow
        stats={[
          { value: fmt(abasin + wp + key), label: "cameras around the three opening resorts" },
          { value: "Oct 30", label: "first projected opening day" },
          { value: "3", label: "resorts projected open by Oct 31" },
        ]}
      />
      <Intro paragraphs={intro} />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-5">Projected opening dates — Colorado&apos;s first wave</h2>
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-white/40 border-b border-white/10 bg-white/[0.02]">
                <th className="px-5 py-3 font-semibold">Resort</th>
                <th className="px-5 py-3 font-semibold">Projected opening</th>
                <th className="px-5 py-3 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {OPENINGS.map((o) => (
                <tr key={o.slug} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-3">
                    <Link href={`/ski-webcams/${o.slug}`} className="text-[#00E5FF] hover:underline">
                      {o.resort}
                    </Link>
                  </td>
                  <td className="px-5 py-3">{o.date}</td>
                  <td className="px-5 py-3 text-right text-white/50">{o.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-white/35 mt-3">
          Projections compiled by OnTheSnow and reported October 26, 2026. Resorts confirm
          their own opening days, and early-season dates move with snowmaking weather —
          treat every date above as expected, not promised, and check the resort before
          you drive.
        </p>
      </section>

      {WALLS.map((w) => (
        <section key={w.key} className="mt-12">
          <div className="flex items-baseline justify-between gap-4 mb-3">
            <h2 className="text-xl md:text-2xl font-bold">{w.heading}</h2>
            <Link
              href={`/ski-webcams/${w.slug}`}
              className="shrink-0 text-sm text-[#00E5FF] hover:underline"
            >
              Resort page →
            </Link>
          </div>
          <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
            {w.blurb(fmt(counts.get(w.key) ?? 0))}
          </p>
          <DirectoryExplorer
            scopeKey={w.scopeKey}
            scopeLabel={EXPLORE_SCOPES[w.scopeKey].label}
            groupBy="none"
            searchPlaceholder={w.placeholder}
            explorerId={`opening-${w.key}`}
          />
        </section>
      ))}

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-5">Reading opening week like a local</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="font-semibold text-white/90">The snow stake is the scoreboard</h3>
            <p className="text-sm text-white/55 mt-2 leading-relaxed">
              Each resort page pins its snow stake camera first — the marked board the
              resort itself reads at dawn. This week it goes from bare to buried; that
              number, not the forecast, is what opening day is built on.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="font-semibold text-white/90">Snowmaking tells come first</h3>
            <p className="text-sm text-white/55 mt-2 leading-relaxed">
              On cold nights, look for the white plumes of snow guns on base cameras and
              groomers packing the first run. Resorts announce openings after the
              snowmaking is visibly winning — the cameras show the campaign in progress.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="font-semibold text-white/90">The pass decides your morning</h3>
            <p className="text-sm text-white/55 mt-2 leading-relaxed">
              Loveland Pass (A-Basin, Keystone) and Berthoud Pass (Winter Park) are in
              every wall above because they are in every opening-day drive. Check the
              pass cameras before the canyon — chain laws and closures show up there
              first.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="font-semibold text-white/90">First chair is a camera habit</h3>
            <p className="text-sm text-white/55 mt-2 leading-relaxed">
              Check the night before for the storm total and grooming, the morning of for
              lift lines and visibility. Opening-weekend crowds are the season&apos;s
              most predictable surprise — the 7 AM base camera tells you exactly what
              you are driving into.
            </p>
          </div>
        </div>
      </section>

      <HowTo
        title="How to plan opening day"
        steps={[
          "Pick your resort in the table above and open its page — the projected date is a plan, the resort's confirmation is the decision.",
          "Watch its snow stake and base cameras through the week: stake totals plus snowmaking plumes mean the date is holding.",
          "The night before, check the pass and corridor cameras on the route tool for your drive's cameras in passing order.",
          "Leave early and recheck the base camera from the road — opening-day lines form before the lifts load.",
        ]}
      />

      <FaqSection title="Ski opening week 2026 — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="More live WorldEye"
        links={[
          { label: "Ski webcams hub", href: "/ski-webcams" },
          { label: "First snow 2026", href: "/first-snow-2026" },
          { label: "Arapahoe Basin cameras", href: "/ski-webcams/arapahoe-basin" },
          { label: "Colorado traffic cameras", href: "/us-traffic-cameras/colorado" },
        ]}
      />

      <TrialCtaSection utmSource="ski-opening-week-2026" />

      <CtaRow backHref="/ski-webcams" backLabel="Ski webcams" />
    </PageShell>
  );
}
