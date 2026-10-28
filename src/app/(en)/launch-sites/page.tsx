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
import { getLaunchesPayload } from "@/lib/launches/server";
import { LAUNCH_SOURCE_LABEL } from "@/lib/launches/types";
import {
  LAUNCH_SITE_GAPS,
  LAUNCH_SITES,
  formatLaunchNet,
  launchesAtSite,
} from "@/lib/launch-sites";

/* The hub shows the next launches from the one qualifying site; the
   board rides the launches service's 15-minute cache. */
export const revalidate = 900;

export const metadata: Metadata = {
  title: "Launch Sites — Space Coast Cameras & Next Launches, Honestly Counted",
  description:
    "One launch site on Earth has a real public camera wall in this catalogue — Kennedy Space Center & Cape Canaveral, with 27 Space Coast cameras and the next launches from Launch Library 2. Starbase, Vandenberg and Wallops were measured and have none; their gaps are printed, not padded. Free, no signup.",
  alternates: { canonical: `${BASE}/launch-sites` },
  openGraph: {
    title: "Launch Sites — Space Coast Cameras & Next Launches",
    description:
      "Kennedy & the Cape: 27 corridor cameras and the real launch board. The other famous spaceports, measured and honestly absent.",
    url: "/launch-sites",
    type: "website",
  },
};

const INTRO = [
  "A launch site is the hardest subject in this directory: the pads sit on closed federal or company ground, and the famous 'launch cams' are venue-run streams that are not published into public catalogues. So this hub applies the same rule as the rest of the site — a site earns a page only where real cameras and real data exist — and prints what the measurement found, site by site.",
  "One site qualifies. Kennedy Space Center and Cape Canaveral Space Force Station share a coast, and that coast is covered: twenty-seven Florida DOT cameras on the corridors that serve both spaceports — the SR-528 Beachline, the SR-405 and SR-406 causeway routes, SR-520 and the I-95 spine. Paired with the Launch Library 2 board — the same feed behind the globe's Space Missions layer — the page carries the site's cameras and its next launches, with every time stated at exactly the precision the source states it.",
  "The other three famous sites were measured and are absent, and their absences are the honest half of this page. Starbase has no catalogue camera within ten kilometres — one Texas highway camera stands 9.9 km away, and a highway camera is not a Starbase cam. Vandenberg's nearest cameras are fourteen kilometres off, in Lompoc. Wallops has none within ten kilometres at all. Each is named below with its measurement; if a real feed is published openly for any of them, it will earn its page by the same rule.",
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Launch Sites — Space Coast Cameras & Next Launches",
  description:
    "Directory of launch sites with real public cameras and a real launch board: Kennedy Space Center & Cape Canaveral qualifies; Starbase, Vandenberg and Wallops are measured gaps.",
  url: `${BASE}/launch-sites`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const FAQS = [
  {
    q: "Is there a Starbase live cam?",
    a: "Not in this catalogue — and the answer is measured: no camera names Boca Chica, Starbase or SpaceX anywhere in it, and within ten kilometres of the launch mount there is exactly one record, a TxDOT highway camera on SH 100 at the Port Isabel turnoff, 9.9 km away. SpaceX's own Starbase streams are not published into public catalogues. Naming that highway camera 'Starbase live cam' would be exactly the inflation this directory refuses; the gap is printed instead.",
  },
  {
    q: "Can I watch a launch itself on the Kennedy page?",
    a: "The page's cameras watch the Space Coast's roads and causeways — the launch-day build-up, honestly framed. The launch itself is on the board entry's webcast link, from the provider's own stream. No camera in this catalogue stands on either spaceport, and the page says so rather than implying a pad view.",
  },
  {
    q: "Where do the launch times come from — and how exact are they?",
    a: `From ${LAUNCH_SOURCE_LABEL}, the feed behind the globe's Space Missions layer. Each NET is printed at the precision the source states: minute-precise times earn a clock time; a NET given to the day is a date; one given to the month is a month. This page never turns a month into a countdown.`,
  },
  {
    q: "Why is there no Falcon 9 or Starship page?",
    a: "Because no dataset in this project supports one honestly. Launch Library 2 is a live feed of upcoming and recent flights, not a per-rocket archive — a rocket page built from it would be a snapshot pretending to be a reference. Rockets appear where the data carries them: named on every board entry, with their provider and pad.",
  },
  {
    q: "Are the launch site pages free?",
    a: "Yes — the cameras and the launch board are free on WorldEye, no account, no signup.",
  },
];

export default async function LaunchSitesPage() {
  const site = LAUNCH_SITES[0];
  const wallCount = await countForDef(EXPLORE_SCOPES[site.scopeKey]);
  const fmt = (n: number) => n.toLocaleString("en-US");

  let next: { name: string; when: string; pad: string | null }[] = [];
  try {
    const payload = await getLaunchesPayload();
    next = launchesAtSite(payload.upcoming, site)
      .slice(0, 3)
      .map((l) => ({ name: l.name, when: formatLaunchNet(l, site.tz), pad: l.padName }));
  } catch {
    next = [];
  }

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Launch sites" },
        ]}
      />
      <Hero
        h1="Launch Sites — Cameras & Next Launches"
        sub="One spaceport coast has a real camera wall; the others were measured and are named as gaps. No pad views promised, no launch times invented."
      />
      <StatRow
        stats={[
          { value: "1", label: "site with a qualifying camera wall" },
          { value: fmt(wallCount), label: "Space Coast cameras at Kennedy & the Cape" },
          { value: fmt(LAUNCH_SITE_GAPS.length), label: "famous sites measured — and absent" },
        ]}
      />
      <Intro paragraphs={INTRO} />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">The site with a page</h2>
        <div className="grid gap-4">
          <Link
            href={`/launch-sites/${site.slug}`}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-[#00E5FF]/40 transition-colors"
          >
            <span className="font-semibold text-white/90">{site.name}</span>
            <span className="block text-sm text-white/50 mt-1">
              Florida's Space Coast · {fmt(wallCount)} cameras within {site.radiusKm} km of{" "}
              {site.centreLabel} — the corridors serving Kennedy Space Center and Cape
              Canaveral Space Force Station, plus the next launches from both.
            </span>
            <span className="block text-sm text-[#00E5FF] mt-2">
              The Kennedy &amp; Cape page →
            </span>
          </Link>
        </div>
        {next.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 mt-4">
            <h3 className="font-semibold text-white/90">Next from Kennedy & the Cape</h3>
            <ul className="mt-2 space-y-1.5">
              {next.map((l) => (
                <li key={l.name} className="text-sm text-white/55">
                  <span className="text-white/85">{l.name}</span>
                  {l.pad ? ` · ${l.pad}` : ""} · {l.when}
                </li>
              ))}
            </ul>
            <p className="text-xs text-white/40 mt-3">
              Source: {LAUNCH_SOURCE_LABEL} — times at the precision the source states
              them. Full board on{" "}
              <Link href={`/launch-sites/${site.slug}`} className="text-[#00E5FF] hover:underline">
                the site page
              </Link>
              .
            </p>
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          Kennedy &amp; the Cape — the wall, live
        </h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Every camera in the qualifying wall — FDOT's Space Coast corridors, the
          roads a launch day runs on.
        </p>
        <DirectoryExplorer
          scopeKey={site.scopeKey}
          scopeLabel={EXPLORE_SCOPES[site.scopeKey].label}
          groupBy="none"
          searchPlaceholder="Search Space Coast cameras…"
          explorerId="ls-kennedy"
        />
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          The measured absences
        </h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Searched by name and by radius against the whole catalogue. The true
          answer for each today is no qualifying camera — stated plainly rather
          than padded with the nearest town's grid.
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          {LAUNCH_SITE_GAPS.map((g) => (
            <div
              key={g.name}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
            >
              <h3 className="font-semibold text-white/90">{g.name}</h3>
              <p className="text-sm text-white/55 mt-2 leading-relaxed">{g.note}</p>
            </div>
          ))}
        </div>
      </section>

      <AreaTable
        title="Qualifying cameras — per site measured"
        rows={[
          {
            name: "Kennedy Space Center & Cape Canaveral (Florida)",
            count: wallCount,
            href: `/launch-sites/${site.slug}`,
          },
          { name: "Starbase (Texas)", count: 0 },
          { name: "Vandenberg Space Force Base (California)", count: 0 },
          { name: "Wallops Flight Facility (Virginia)", count: 0 },
        ]}
        note="A qualifying camera is one at or genuinely serving the site — for Kennedy & the Cape, the FDOT corridor wall within 25 km of the coast between the two spaceports. A highway camera 9.9 km from Starbase does not qualify, and is not counted."
      />

      <HowTo
        title="How to use this hub"
        steps={[
          "Open the Kennedy & Cape page for the wall and the board together.",
          "Read the board's times at their stated precision — a month is a month, not a countdown.",
          "Watch the corridors on a launch morning for the coast filling up; follow the board's webcast link for the launch itself.",
          "For everything above the pad: the satellite and space-station trackers linked below run on live orbital data.",
        ]}
      />

      <FaqSection title="Launch sites — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="More space, live"
        links={[
          { label: "Satellite tracker", href: "/satellite-tracker" },
          { label: "ISS & space station tracker", href: "/space-station-tracker" },
          { label: "Iconic places — famous streets, live", href: "/iconic-places" },
          { label: "Live events happening now", href: "/live-events" },
        ]}
      />

      <TrialCtaSection utmSource="launch-sites" />

      <CtaRow backHref="/live-webcams" backLabel="All live webcams" />
    </PageShell>
  );
}
