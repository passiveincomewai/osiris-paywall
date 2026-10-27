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
  title: "First Snow 2026 — Watch the Season's First Snowfall Live",
  description:
    "The first snow of the season is falling across the Dakotas, the Black Hills, Alaska and Colorado ski country. Watch it live on cameras from Denver & I-70, Anchorage and Rapid City. Free, no signup.",
  alternates: { canonical: `${BASE}/first-snow-2026` },
  openGraph: {
    title: "First Snow 2026 — Watch the Season's First Snowfall Live",
    description:
      "Live cameras from the places getting the 2026 season's first snow: Colorado's I-70 corridor, Anchorage, and Rapid City & the Black Hills. Free on WorldEye.",
    url: "/first-snow-2026",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "First Snow 2026 — Watch the Season's First Snowfall Live",
  description:
    "Live public cameras from the regions receiving the first snow of the 2026–27 season: Colorado ski country and the I-70 corridor, Southcentral Alaska, and Rapid City & the Black Hills.",
  url: `${BASE}/first-snow-2026`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const FAQS = [
  {
    q: "Where is the first snow of the 2026 season falling?",
    a: "As reported on Monday, October 26, 2026, the season's first snowfall is spreading across the Dakotas, eastern Wyoming and western Nebraska — with the Black Hills of South Dakota in line for the deepest of it — while snow also falls in the Cascades and northern Rockies. A separate, bigger storm is hitting Alaska, and Colorado's ski country is under a winter weather advisory. The camera walls on this page cover the three best-watched regions: Denver & the I-70 corridor, Anchorage, and Rapid City & the Black Hills.",
  },
  {
    q: "How much snow is expected?",
    a: "Forecasts reported October 26 call for several inches in the Black Hills with slushy accumulation in Rapid City, up to 16 inches with 55 mph gusts in the Alaska storm, and 4–12 inches this week in Colorado's ski country under a winter weather advisory. Those are forecasters' numbers, not measurements — for the official forecast and warnings for a specific place, the National Weather Service (weather.gov) is the authority. The cameras show what has actually fallen.",
  },
  {
    q: "Can I watch the snow arrive live?",
    a: "Yes — that is what this page is for. Mountain and highway cameras update around the clock, so you can watch passes whiten, snow stakes start to fill and roads go from wet to snow-covered in real time. Every feed is free to open, no signup.",
  },
  {
    q: "What does first snow mean for ski season?",
    a: "It starts the clock. Colorado's earliest resorts are projected to open within the week — Arapahoe Basin and Winter Park on October 30, Keystone on October 31 — and natural snow on top of snowmaking is what makes those dates possible. The opening-week page tracks the resorts; this page tracks the storm that feeds them.",
  },
  {
    q: "Why are there so few cameras in the Black Hills section?",
    a: "Because the catalogue is honest about the Plains: rural South Dakota has sparse public camera coverage compared with Colorado's corridor network — twelve cameras watch the Rapid City area, and the page shows all twelve rather than padding the wall. The Colorado and Alaska sections carry the deep coverage.",
  },
];

export default async function FirstSnow2026Page() {
  const co = await countForDef(EXPLORE_SCOPES["event-first-snow-colorado"]);
  const ak = await countForDef(EXPLORE_SCOPES["event-first-snow-alaska"]);
  const bh = await countForDef(EXPLORE_SCOPES["event-first-snow-black-hills"]);
  const fmt = (n: number) => n.toLocaleString("en-US");

  const intro = [
    `The first snow of the 2026–27 season is falling today, Monday, October 26 — across the Dakotas and the Black Hills, in a major early storm in Alaska, and under winter weather advisories in Colorado's ski country. This page gathers the live public cameras from the places getting it first: ${fmt(co)} around Denver and the I-70 mountain corridor, ${fmt(ak)} around Anchorage and Southcentral Alaska, and ${fmt(bh)} around Rapid City and the Black Hills — every one free to watch, no signup, updating around the clock as the snow arrives.`,
    "As reported nationally on October 26, the Plains system is spreading the season's first snowfall across the Dakotas, eastern Wyoming and western Nebraska, with several inches possible in the Black Hills and a slushy accumulation in Rapid City. Snow is also falling in the Cascades and the northern Rockies. In Alaska, a separate storm threatens up to 16 inches with gusts to 55 mph. And in Colorado, ski country sits under a winter weather advisory with 4–12 inches expected this week — the storm that decides whether the first resorts really open on Friday.",
    "First snow is a threshold event, and cameras are the honest way to watch it. A forecast can promise six inches; the camera on Loveland Pass, the snow stake at a resort base, or the I-90 feed outside Rapid City shows the flakes accumulating — or not — in real time. Road crews, ski patrols and anyone planning a mountain drive this week are all reading the same frames.",
    "This page stays up as the season's front door: the winter-storm entry point for the months ahead, pointing on to the ski opening week hub and the resort pages where the snow is about to be skied.",
  ];

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live webcams", href: "/live-webcams" },
          { label: "First snow 2026" },
        ]}
      />
      <Hero
        h1="First Snow 2026 — The Season's First Snowfall, Live"
        sub="Snow is falling today in the Black Hills, Alaska and Colorado ski country. Watch it arrive on live cameras — free, no signup."
      />
      <StatRow
        stats={[
          { value: fmt(co), label: "cameras around Denver & the I-70 corridor" },
          { value: fmt(ak), label: "cameras around Anchorage, Alaska" },
          { value: fmt(bh), label: "cameras around Rapid City & the Black Hills" },
        ]}
      />
      <Intro paragraphs={intro} />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">Colorado high country &amp; the I-70 corridor</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          {fmt(co)} cameras within 40 km of Denver, nearest first — the metro, the foothills
          and the I-70 mountain corridor toward the ski resorts. Colorado ski country is
          under a winter weather advisory this week, with 4–12 inches expected in the high
          country: this is the wall that shows the passes whitening and the storm total
          building before opening day.
        </p>
        <DirectoryExplorer
          scopeKey="event-first-snow-colorado"
          scopeLabel="Denver & the I-70 corridor"
          groupBy="none"
          searchPlaceholder="Search Denver & I-70 corridor cameras…"
          explorerId="snow-colorado"
        />
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">Anchorage &amp; Southcentral Alaska</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          {fmt(ak)} cameras within 50 km of Anchorage, nearest first. Alaska&apos;s storm is
          the biggest of this first-snow round — forecasters warn of up to 16 inches with
          55 mph gusts — and Anchorage&apos;s road and city cameras show it arriving off
          the inlet.
        </p>
        <DirectoryExplorer
          scopeKey="event-first-snow-alaska"
          scopeLabel="Anchorage & Southcentral Alaska"
          groupBy="none"
          searchPlaceholder="Search Anchorage cameras…"
          explorerId="snow-alaska"
        />
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">Rapid City &amp; the Black Hills</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          {fmt(bh)} cameras within 40 km of Rapid City — every one the catalogue holds for
          the area, because the rural Plains are DOT-sparse next to Colorado&apos;s
          corridor. The Black Hills are in line for the deepest snow of the Plains system,
          with a slushy first accumulation in Rapid City itself.
        </p>
        <DirectoryExplorer
          scopeKey="event-first-snow-black-hills"
          scopeLabel="Rapid City & the Black Hills"
          groupBy="none"
          searchPlaceholder="Search Rapid City & Black Hills cameras…"
          explorerId="snow-black-hills"
        />
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-5">Why first snow gets its own page</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="font-semibold text-white/90">It decides opening week</h3>
            <p className="text-sm text-white/55 mt-2 leading-relaxed">
              Colorado&apos;s first resorts are projected to open October 30–31, and the
              difference between a ribbon of snowmaking and a real opening is a week like
              this one. The corridor cameras show the natural snow the schedules are
              counting on.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="font-semibold text-white/90">It is the roads&apos; first test</h3>
            <p className="text-sm text-white/55 mt-2 leading-relaxed">
              The season&apos;s first snow catches more drivers unprepared than any January
              blizzard. Pass and interstate cameras show the moment wet pavement turns to
              ice and slush — check them before a mountain drive, not during it.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="font-semibold text-white/90">It is a national ritual</h3>
            <p className="text-sm text-white/55 mt-2 leading-relaxed">
              Every October, the first flakes in the high country make national news —
              the official start of the winter story. Mountain towns plan around it;
              skiers start counting days. The cameras turn the ritual into a live view
              instead of a headline.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="font-semibold text-white/90">Forecast vs frame</h3>
            <p className="text-sm text-white/55 mt-2 leading-relaxed">
              Expected totals are forecasters&apos; best work, and the National Weather
              Service remains the authority for warnings. But for the question everyone
              actually asks — is it snowing there yet? — a live camera is the answer.
            </p>
          </div>
        </div>
      </section>

      <HowTo
        title="How to watch the first snow live"
        steps={[
          "Start with the Colorado wall if you care about ski country, or your region's wall if the storm is headed your way.",
          "Look for the pass and summit cameras first — snow shows there hours before it sticks in town.",
          "Check the road cameras before any mountain drive: first snow is the season's most underestimated road hazard.",
          "Follow the snow on to the ski opening week page, where the same storm becomes opening day.",
        ]}
      />

      <FaqSection title="First snow 2026 — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="More live WorldEye"
        links={[
          { label: "Ski opening week 2026", href: "/ski-opening-week-2026" },
          { label: "Ski webcams", href: "/ski-webcams" },
          { label: "Live weather tracker", href: "/weather-tracker" },
          { label: "Live webcams worldwide", href: "/live-webcams" },
        ]}
      />

      <TrialCtaSection utmSource="first-snow-2026" />

      <CtaRow backHref="/ski-webcams" backLabel="Ski webcams" />
    </PageShell>
  );
}
