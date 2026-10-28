import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BASE,
  JsonLd,
  Breadcrumb,
  Hero,
  StatRow,
  Intro,
  SampleGrid,
  HowTo,
  FaqSection,
  FaqJsonLd,
  RelatedLinks,
  CtaRow,
  PageShell,
  type Sample,
} from "@/components/directory-page";
import DirectoryExplorer from "@/components/DirectoryExplorer";
import TrialCtaSection from "@/components/TrialCtaSection";
import PlaceWeatherPanel from "@/components/PlaceWeatherPanel";
import { EXPLORE_SCOPES, recordsForDef } from "@/lib/explore-data";
import { getPlaceWeather } from "@/lib/place-weather";
import { getLaunchesPayload } from "@/lib/launches/server";
import { LAUNCH_SOURCE_LABEL, type LaunchRecord } from "@/lib/launches/types";
import {
  LAUNCH_SITES,
  formatLaunchNet,
  launchSiteBySlug,
  launchesAtSite,
  type LaunchSite,
} from "@/lib/launch-sites";

/* The launch board rides the launches service's own cache — 15
   minutes for the upcoming board — so the page regenerates on the
   same cadence. Weather is cached per location for 30 minutes. */
export const revalidate = 900;

interface Board {
  upcoming: LaunchRecord[];
  previous: LaunchRecord[];
  fetchedAt: number;
  stale: boolean;
}

async function loadBoard(s: LaunchSite): Promise<Board | null> {
  try {
    const payload = await getLaunchesPayload();
    return {
      upcoming: launchesAtSite(payload.upcoming, s).slice(0, 5),
      previous: launchesAtSite(payload.previous, s).slice(0, 3),
      fetchedAt: payload.fetchedAt,
      stale: payload.stale,
    };
  } catch {
    return null;
  }
}

function BoardRow({ l, site, past }: { l: LaunchRecord; site: LaunchSite; past?: boolean }) {
  return (
    <li className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-semibold text-white/90">{l.name}</span>
        <span className="text-sm text-[#00E5FF]">{formatLaunchNet(l, site.tz)}</span>
      </div>
      <p className="text-sm text-white/55 mt-1">
        {[l.rocketName, l.providerName, l.padName].filter(Boolean).join(" · ")}
      </p>
      <p className="text-sm text-white/55 mt-1">
        Status: {l.statusName}
        {l.webcastLive ? " · webcast live now" : ""}
        {!past && l.videoUrl ? (
          <>
            {" · "}
            <a
              href={l.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00E5FF] hover:underline"
            >
              Watch the webcast ↗
            </a>
          </>
        ) : null}
      </p>
      {l.missionDescription ? (
        <p className="text-sm text-white/45 mt-2 leading-relaxed line-clamp-3">
          {l.missionDescription}
        </p>
      ) : null}
    </li>
  );
}

export function generateStaticParams() {
  return LAUNCH_SITES.map((s) => ({ site: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ site: string }>;
}): Promise<Metadata> {
  const { site: slug } = await params;
  const s = launchSiteBySlug(slug);
  if (!s) return { title: "Not found" };
  const records = await recordsForDef(EXPLORE_SCOPES[s.scopeKey]);
  const title = "Kennedy Space Center & Cape Canaveral — Space Coast Cameras & Next Launches";
  const description = `The Space Coast's ${records.length} public cameras on the corridors serving Kennedy Space Center and Cape Canaveral, plus the next launches from both spaceports on the Launch Library 2 board — times stated exactly as precisely as the source states them.`;
  const url = `/launch-sites/${s.slug}`;
  return {
    title,
    description,
    alternates: { canonical: `${BASE}${url}` },
    openGraph: { title, description, url, type: "website" },
  };
}

export default async function LaunchSitePage({
  params,
}: {
  params: Promise<{ site: string }>;
}) {
  const { site: slug } = await params;
  const s = launchSiteBySlug(slug);
  if (!s) notFound();

  const def = EXPLORE_SCOPES[s.scopeKey];
  const records = await recordsForDef(def);
  const n = records.length;
  const fmt = (x: number) => x.toLocaleString("en-US");
  const featured: Sample[] = records
    .slice(0, 8)
    .map((r) => ({ name: r.name, city: r.city, id: r.id }));
  const board = await loadBoard(s);

  const canonical = `${BASE}/launch-sites/${s.slug}`;
  const placeWeather = await getPlaceWeather({
    query: `${s.lat},${s.lng}`,
    lat: s.lat,
    lng: s.lng,
  });

  const faqs = [
    ...s.faqs,
    {
      q: "How many cameras are on this page, and what do they actually show?",
      a: `The wall holds ${fmt(n)} cameras — Florida DOT feeds on the Space Coast corridors (SR-528, SR-405, SR-406, SR-520, I-95) that carry launch-day traffic to and from the two spaceports. They show the coast's roads and causeways. They do not show a pad, and no frame here is promised to catch a launch; the pads are closed federal ground with no public camera in this catalogue.`,
    },
    {
      q: "Where do the launch times come from?",
      a: `The board below is ${LAUNCH_SOURCE_LABEL} — the same feed that powers the globe's Space Missions layer. Each time is printed at exactly the precision the source states: minute-precise NETs earn a clock time, day-precise ones a date, month-precise ones a month. Nothing here counts down to a time the source has not given.`,
    },
    {
      q: "Is it free to watch?",
      a: "Yes — every camera on this page and the launch board are free on WorldEye, with no account and no signup.",
    },
  ];

  const placeLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: s.name,
    description: `${n} public cameras on the Space Coast corridors serving Kennedy Space Center and Cape Canaveral Space Force Station, with the next launches from both spaceports.`,
    url: canonical,
    geo: { "@type": "GeoCoordinates", latitude: s.lat, longitude: s.lng },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Merritt Island / Cape Canaveral",
      addressRegion: "Florida",
      addressCountry: "United States",
    },
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
      { "@type": "ListItem", position: 2, name: "Launch sites", item: `${BASE}/launch-sites` },
      { "@type": "ListItem", position: 3, name: s.short, item: canonical },
    ],
  };

  const fetchedLabel = board
    ? new Date(board.fetchedAt).toLocaleString("en-US", {
        timeZone: s.tz,
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      })
    : null;

  return (
    <PageShell>
      <JsonLd data={placeLd} />
      <JsonLd data={breadcrumbLd} />
      <FaqJsonLd faqs={faqs} />
      <Breadcrumb
        schema={false}
        trail={[
          { label: "Home", href: "/" },
          { label: "Launch sites", href: "/launch-sites" },
          { label: s.short },
        ]}
      />
      <Hero
        h1="Kennedy Space Center & Cape Canaveral — Live"
        sub={`${fmt(n)} Space Coast cameras on the corridors serving both spaceports, plus the next launches from the Cape — times stated exactly as precisely as the source states them. Free, no signup.`}
      />
      <StatRow
        stats={[
          { value: fmt(n), label: "cameras in the Space Coast wall" },
          { value: "2", label: "spaceports — Kennedy & the Cape" },
          { value: "LL2", label: "launch board — Launch Library 2" },
        ]}
      />
      <Intro paragraphs={[s.intro[0], s.intro[1]]} />

      {placeWeather && <PlaceWeatherPanel data={placeWeather} placeName="the Space Coast" />}

      <section className="mt-12" id="launch-board">
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          Next launches from Kennedy & the Cape
        </h2>
        {board === null ? (
          <p className="text-sm text-white/55 leading-relaxed max-w-3xl">
            The launch board could not be loaded just now. The same board runs
            on the globe's Space Missions layer, and the underlying schedule is
            published by Launch Library 2 (The Space Devs). The camera wall
            below is unaffected.
          </p>
        ) : (
          <>
            {board.upcoming.length > 0 ? (
              <ul className="grid gap-4 max-w-3xl">
                {board.upcoming.map((l) => (
                  <BoardRow key={l.id} l={l} site={s} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-white/55 leading-relaxed max-w-3xl">
                No Kennedy or Cape launches are on the board right now —
                schedules thin out between campaigns. The wall below keeps
                watching the coast regardless.
              </p>
            )}
            {board.previous.length > 0 && (
              <>
                <h3 className="text-lg font-bold mt-8 mb-3">Most recent from the Cape</h3>
                <ul className="grid gap-4 max-w-3xl">
                  {board.previous.map((l) => (
                    <BoardRow key={l.id} l={l} site={s} past />
                  ))}
                </ul>
              </>
            )}
            <p className="text-xs text-white/40 mt-4 max-w-3xl">
              Source: {LAUNCH_SOURCE_LABEL}. Board fetched {fetchedLabel}
              {board.stale
                ? " — showing the last good board; the source did not answer on the latest check."
                : "."}{" "}
              Times are shown at the precision the source states them — a NET
              given to the month is printed as a month, never as a countdown.
            </p>
          </>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          All {fmt(n)} Space Coast cameras, live
        </h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          The wall: every FDOT camera within {s.radiusKm} km of {s.centreLabel} —
          the Beachline, the NASA Causeway corridors and the I-95 spine. On a
          launch morning this is the coast filling up; on any other day it is
          the working space coast, causeways and all.
        </p>
        <DirectoryExplorer
          scopeKey={s.scopeKey}
          scopeLabel={def.label}
          groupBy="none"
          searchPlaceholder="Search Space Coast cameras…"
          explorerId={`ls-page-${s.slug}`}
        />
      </section>

      {featured.length > 0 && (
        <SampleGrid title="Named cameras in the wall" samples={featured} />
      )}

      <HowTo
        title="How to follow a launch day from this page"
        steps={[
          "Start at the board: the next Kennedy or Cape launch, with its NET at the precision the source states it and its status — Go, TBD, or still to be confirmed.",
          "Open the wall an hour or two before the window: SR-528 and SR-405 carry the launch-day traffic, and the causeway corridors show the coast filling up.",
          "Follow the webcast link on the board entry for the launch itself — the cameras here watch the coast, not the pad, and this page will not pretend otherwise.",
          "Afterwards, the board's 'most recent' list keeps the flight's outcome — success or failure, stated by the source's own status.",
        ]}
      />

      <FaqSection title="Kennedy & the Cape — FAQ" faqs={faqs} />

      <RelatedLinks
        title="More space, live"
        links={[
          { label: "All launch sites — and the honest gaps", href: "/launch-sites" },
          {
            label: "Kennedy & the Cape on the 3D globe",
            href: `/?geo=${s.lat.toFixed(5)},${s.lng.toFixed(5)},25000`,
          },
          { label: "Satellite tracker", href: "/satellite-tracker" },
          { label: "ISS & space station tracker", href: "/space-station-tracker" },
          { label: "Florida traffic cameras", href: "/us-traffic-cameras/florida" },
          { label: "Iconic places — famous streets, live", href: "/iconic-places" },
        ]}
      />

      <TrialCtaSection utmSource="launch-sites" />
      <CtaRow backHref="/launch-sites" backLabel="All launch sites" />
    </PageShell>
  );
}
