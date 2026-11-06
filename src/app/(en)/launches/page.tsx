import type { Metadata } from "next";
import Link from "next/link";
import {
  BASE,
  JsonLd,
  Breadcrumb,
  Hero,
  Intro,
  StatRow,
  FaqSection,
  FaqJsonLd,
  RelatedLinks,
  CtaRow,
  PageShell,
} from "@/components/directory-page";
import TrialCtaSection from "@/components/TrialCtaSection";
import { getLaunchesPayload } from "@/lib/launches/server";
import {
  LAUNCH_SOURCE_LABEL,
  LAUNCH_SOURCE_URL,
  launchStatusKind,
  type LaunchRecord,
  type LaunchesPayload,
  type LaunchStatusKind,
} from "@/lib/launches/types";
import { countdownTo } from "@/lib/launches/countdown";
import { formatLaunchNet } from "@/lib/launch-sites";
import { camerasNear, type NearCamera } from "@/lib/developer/service";
import LaunchCountdown from "./LaunchCountdown";

/* The board rides the launches service's own cache (15-min upcoming
   TTL server-side), so the page revalidates on the same beat. The
   countdowns tick client-side from each launch's real NET — a
   server-rendered countdown would be stale on arrival. */
export const revalidate = 900;

export const metadata: Metadata = {
  title: "Upcoming Rocket Launches — Live Countdowns, Pads & Nearest Cameras",
  description:
    "Every upcoming rocket launch worldwide: a live countdown at exactly the precision the source states, the provider, the pad, and the nearest WorldEye cameras to each launch site. Times are the published NETs — scheduled, subject to change. Data: Launch Library 2 · The Space Devs. Free, no signup.",
  alternates: { canonical: `${BASE}/launches` },
  openGraph: {
    title: "Upcoming Rocket Launches — Live Countdowns & Nearest Cameras",
    description:
      "The world launch board: real NETs in Denver time and UTC, the pad for each launch, and the closest public cameras to each site.",
    url: "/launches",
    type: "website",
  },
};

const DENVER_TZ = "America/Denver";
const DETAILED_COUNT = 12;
const CAMERA_RADIUS_KM = 50;
const CAMERAS_PER_LAUNCH = 3;

/* Same status colours as the globe's Space Missions panel. */
const KIND_COLOR: Record<LaunchStatusKind, string> = {
  go: "#69F0AE",
  tbd: "#FFC107",
  success: "#40C4FF",
  failure: "#FF5252",
  other: "#B388FF",
};

const INTRO = [
  "This is the standing board the launch stories land on: every upcoming rocket launch Launch Library 2 lists, worldwide, in liftoff order — the mission, the provider, the pad it flies from, and a live countdown. It is the same feed that powers the globe's Space Missions layer, refreshed server-side every fifteen minutes, so the board never waits on your browser to ask a rate-limited source directly.",
  "The times are NETs — No Earlier Than — printed at exactly the precision the source states for each one, in Denver time and UTC. A launch listed to the minute earns a ticking countdown; one listed to the day is a date; one listed to the month is a month, and the countdown beside it runs to that published date and says so. A NET is a plan, not a promise: launches hold, scrub and slip, and this board moves when the source moves — it never invents a time to fill a gap.",
  "Under each launch: the nearest cameras in the WorldEye catalogue to its pad, with their real distances. Read them the way the launch-sites pages state it — the pads are closed federal or company ground, so these are area cameras: the coast roads, the causeways, the towns that watch. They show you the place on launch day; the launch itself is on each card's webcast link, from the provider's own stream, when one is published.",
];

const FAQS = [
  {
    q: "Where do these launch times come from?",
    a: `From ${LAUNCH_SOURCE_LABEL}, the community-maintained launch database — the same feed behind the globe's Space Missions layer and the /launch-sites board. WorldEye's server polls it on a fifteen-minute cache (its free tier allows only a handful of calls an hour, so no visitor's browser ever calls it directly) and every time on this page is the source's own field, shown at the source's stated precision.`,
  },
  {
    q: "What does NET mean — is the launch guaranteed to happen then?",
    a: "NET means No Earlier Than: the earliest liftoff the provider currently plans. It is explicitly not a guarantee. Weather, range availability and the vehicle itself all move NETs — Florida scrubs for weather are a tradition — and some launches are only scheduled to the day or the month, which is how this page prints them. Treat a countdown as the current plan, and expect it to change.",
  },
  {
    q: "Can I watch a launch itself on the cameras listed here?",
    a: "Not the liftoff — no camera in this catalogue stands on a launch pad, because pads are closed ground, and this page will not dress a highway camera up as a pad cam. The listed cameras watch the area around the site: the Space Coast's corridors for a Florida launch, the roads and coast a launch day fills up. For the launch itself, each card links the provider's webcast when one is published — that stream is the launch view.",
  },
  {
    q: "Why do some launches have no cameras under them?",
    a: "Two honest reasons, both printed on the card. Either Launch Library 2 does not publish that pad's coordinates, so there is no point to measure from — or there is no camera in the catalogue within 50 km of the pad, which is true of most spaceports on Earth: they are remote or restricted by design. The board states the gap rather than padding the list with a distant town's grid.",
  },
  {
    q: "Is the launch board free?",
    a: "Yes — the board, the countdowns and the cameras are free on WorldEye, no account, no signup. The same launches also appear on the globe itself: open the Space Missions layer (in the Space & Orbits group) to see every pad pinned, with each pad's own upcoming and recent flights.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Upcoming Rocket Launches — Live Countdowns, Pads & Nearest Cameras",
  description:
    "The worldwide launch board from Launch Library 2: upcoming launches with live countdowns at the source's stated precision, their pads, and the nearest WorldEye cameras to each launch site.",
  url: `${BASE}/launches`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

function StatusChip({ launch }: { launch: LaunchRecord }) {
  const color = KIND_COLOR[launchStatusKind(launch)];
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-[10px] font-mono font-bold tracking-[0.12em] whitespace-nowrap"
      style={{ color, border: `1px solid ${color}55`, background: `${color}14` }}
    >
      {(launch.statusName ?? "UNKNOWN").toUpperCase()}
    </span>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-[10px] font-mono tracking-[0.18em] text-white/35 uppercase">{label}</div>
      <div className="text-sm text-white/85 mt-0.5">{value}</div>
    </div>
  );
}

type PadCameras =
  | { state: "unavailable" }
  | { state: "ok"; total: number; cameras: NearCamera[] };

const padKeyOf = (l: LaunchRecord) =>
  l.padLat !== null && l.padLon !== null
    ? `${l.padLat.toFixed(3)},${l.padLon.toFixed(3)}`
    : null;

function CameraSection({
  launch,
  padCams,
}: {
  launch: LaunchRecord;
  padCams: Map<string, PadCameras>;
}) {
  const key = padKeyOf(launch);
  if (!key) {
    return (
      <div className="mt-4 border-t border-white/10 pt-3">
        <h3 className="text-[10px] font-mono tracking-[0.18em] text-white/35 uppercase">
          Nearest cameras
        </h3>
        <p className="text-sm text-white/50 mt-1.5 leading-relaxed">
          Launch Library 2 does not publish this pad&apos;s coordinates, so there is no
          point to measure camera distances from — the gap is stated, not filled.
        </p>
      </div>
    );
  }
  const res = padCams.get(key);
  return (
    <div className="mt-4 border-t border-white/10 pt-3">
      <h3 className="text-[10px] font-mono tracking-[0.18em] text-white/35 uppercase">
        Nearest cameras to this pad
      </h3>
      {!res || res.state === "unavailable" ? (
        <p className="text-sm text-white/50 mt-1.5 leading-relaxed">
          The nearest-camera lookup is unavailable right now — the camera catalogue
          did not answer. The launch data above is unaffected.
        </p>
      ) : res.total === 0 ? (
        <p className="text-sm text-white/50 mt-1.5 leading-relaxed">
          No cameras in the WorldEye catalogue within {CAMERA_RADIUS_KM} km of this
          pad — most spaceports are remote or restricted by design, and the board
          prints the gap rather than padding it.
        </p>
      ) : (
        <>
          <ul className="mt-2 space-y-1.5">
            {res.cameras.map((c) => (
              <li key={c.id} className="text-sm">
                <a
                  href={c.watchUrl}
                  className="text-[#00E5FF] hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {c.name}
                </a>{" "}
                <span className="text-white/50">
                  — {c.distanceKm.toFixed(1)} km · {[c.city, c.country].filter(Boolean).join(", ")}
                </span>
                <span className="block text-xs text-white/35">{c.attribution}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-white/40 mt-2 leading-relaxed">
            {res.total > res.cameras.length
              ? `The ${res.cameras.length} nearest of ${res.total} catalogue cameras within ${CAMERA_RADIUS_KM} km. `
              : `Catalogue cameras within ${CAMERA_RADIUS_KM} km of the pad. `}
            Area cameras — they watch the roads and coast around the site, not the
            pad itself.
          </p>
        </>
      )}
    </div>
  );
}

function LaunchCard({
  launch,
  next,
  padCams,
}: {
  launch: LaunchRecord;
  next: boolean;
  padCams: Map<string, PadCameras>;
}) {
  const approximate = countdownTo(launch.net, launch.netPrecision, Date.now()).approximate;
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-start gap-3">
        <h3 className="flex-1 min-w-0 font-semibold text-white/90 leading-snug">
          {launch.missionName ?? launch.name}
        </h3>
        <StatusChip launch={launch} />
      </div>
      {launch.missionName && launch.name !== launch.missionName && (
        <p className="text-xs text-white/40 mt-0.5">{launch.name}</p>
      )}
      {next && (
        <p className="text-[10px] font-mono tracking-[0.18em] text-[#B388FF] uppercase mt-2">
          Next launch
        </p>
      )}
      <div className="mt-2">
        <LaunchCountdown net={launch.net} netPrecision={launch.netPrecision} large={next} />
        {approximate && launch.net && (
          <p className="text-xs text-white/40 mt-1 leading-relaxed">
            Launch Library 2 publishes this NET at coarser than minute precision —
            the countdown runs to the published date, which is all the source states.
          </p>
        )}
      </div>
      <div className="mt-3 space-y-0.5 text-sm">
        <p className="text-white/75">
          <span className="text-white/40">Denver</span> — {formatLaunchNet(launch, DENVER_TZ)}
        </p>
        <p className="text-white/75">
          <span className="text-white/40">UTC</span> — {formatLaunchNet(launch, "UTC")}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-4">
        <Field label="Provider" value={launch.providerName} />
        <Field label="Rocket" value={launch.rocketName} />
        <Field label="Pad" value={launch.padName} />
        <Field label="Location" value={launch.padLocation} />
        <Field label="Target orbit" value={launch.orbitName} />
        <Field
          label="Launch probability"
          value={launch.probability !== null ? `${launch.probability}%` : null}
        />
      </div>
      {launch.missionDescription && (
        <p className="text-sm text-white/55 leading-relaxed mt-3">
          {launch.missionDescription}
        </p>
      )}
      {launch.videoUrl && (
        <p className="mt-3 text-sm">
          <a
            href={launch.videoUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[#00E5FF] hover:underline"
          >
            {launch.webcastLive ? "Webcast is live now — watch ↗" : "Watch the webcast ↗"}
          </a>
        </p>
      )}
      <CameraSection launch={launch} padCams={padCams} />
    </article>
  );
}

export default async function LaunchesPage() {
  let payload: LaunchesPayload | null = null;
  try {
    payload = await getLaunchesPayload();
  } catch {
    payload = null;
  }

  const shell = (children: React.ReactNode) => (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb trail={[{ label: "Home", href: "/" }, { label: "Launches" }]} />
      {children}
    </PageShell>
  );

  if (!payload) {
    return shell(
      <>
        <Hero
          h1="Upcoming Rocket Launches"
          sub="The worldwide launch board — countdowns, pads and the nearest cameras, from Launch Library 2."
        />
        <div className="rounded-2xl border border-amber-300/30 bg-amber-300/[0.06] p-5 mt-8">
          <p className="text-sm leading-relaxed text-amber-200/85">
            Launch data is unavailable right now — Launch Library 2 did not answer and
            no cached copy exists yet. The board will fill in on the next successful
            fetch; nothing here is ever backfilled with invented times.
          </p>
        </div>
        <RelatedLinks
          title="More space, live"
          links={[
            { label: "Launch sites — the Space Coast camera wall", href: "/launch-sites" },
            { label: "Satellite tracker", href: "/satellite-tracker" },
            { label: "ISS & space station tracker", href: "/space-station-tracker" },
            { label: "Live events happening now", href: "/live-events" },
          ]}
        />
        <CtaRow backHref="/live-webcams" backLabel="All live webcams" />
      </>,
    );
  }

  const upcoming = payload.upcoming;
  const detailed = upcoming.slice(0, DETAILED_COUNT);
  const rest = upcoming.slice(DETAILED_COUNT);
  const previous = payload.previous.slice(0, 8);

  /* One nearest-camera lookup per distinct pad among the detailed
     cards — pads repeat across a board (every Cape launch shares a
     handful), so the catalogue is scanned once per pad, not per card. */
  const padCams = new Map<string, PadCameras>();
  const pads = new Map<string, { lat: number; lon: number }>();
  for (const l of detailed) {
    const key = padKeyOf(l);
    if (key && !pads.has(key)) pads.set(key, { lat: l.padLat!, lon: l.padLon! });
  }
  await Promise.all(
    [...pads.entries()].map(async ([key, p]) => {
      const res = await camerasNear(
        { lat: p.lat, lng: p.lon },
        CAMERA_RADIUS_KM,
        CAMERAS_PER_LAUNCH,
        BASE,
      );
      padCams.set(
        key,
        res ? { state: "ok", total: res.total, cameras: res.cameras } : { state: "unavailable" },
      );
    }),
  );

  const padCount = new Set(upcoming.map((l) => padKeyOf(l)).filter(Boolean)).size;
  const providerCount = new Set(
    upcoming.map((l) => l.providerName).filter(Boolean),
  ).size;
  const fetchedLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: DENVER_TZ,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(payload.fetchedAt));

  return shell(
    <>
      <Hero
        h1="Upcoming Rocket Launches — Countdowns & Nearest Cameras"
        sub="Every launch on the world board, in liftoff order: the real NET at the precision the source states it, the pad it flies from, and the closest WorldEye cameras to each site."
      />
      <StatRow
        stats={[
          { value: upcoming.length.toLocaleString("en-US"), label: "launches on the board" },
          { value: padCount.toLocaleString("en-US"), label: "pads with upcoming launches" },
          { value: providerCount.toLocaleString("en-US"), label: "launch providers" },
        ]}
      />
      <Intro paragraphs={INTRO} />

      <p className="text-xs text-white/40 mt-6">
        Source:{" "}
        <a href={LAUNCH_SOURCE_URL} target="_blank" rel="noreferrer" className="text-[#00E5FF] hover:underline">
          {LAUNCH_SOURCE_LABEL}
        </a>{" "}
        — board data as of {fetchedLabel} (Denver). All times are the published NETs:
        scheduled, subject to change.
        {payload.stale && (
          <span className="text-amber-200/80">
            {" "}
            Showing last-good data — the latest refresh from Launch Library 2 failed.
          </span>
        )}
      </p>

      <section className="mt-8">
        <h2 className="text-xl md:text-2xl font-bold mb-4">The board — next launches</h2>
        {detailed.length === 0 ? (
          <p className="text-sm text-white/55 leading-relaxed">
            No upcoming launches are listed right now.
          </p>
        ) : (
          <div className="grid gap-4">
            {detailed.map((l, i) => (
              <LaunchCard key={l.id} launch={l} next={i === 0} padCams={padCams} />
            ))}
          </div>
        )}
      </section>

      {rest.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl md:text-2xl font-bold mb-3">Further out</h2>
          <ul className="divide-y divide-white/[0.06] rounded-2xl border border-white/10 bg-white/[0.03]">
            {rest.map((l) => (
              <li key={l.id} className="px-5 py-3 text-sm">
                <span className="text-white/85 font-medium">{l.missionName ?? l.name}</span>
                <span className="block text-white/50 mt-0.5">
                  {formatLaunchNet(l, DENVER_TZ)} (Denver)
                  {l.providerName ? ` · ${l.providerName}` : ""}
                  {l.padName ? ` · ${l.padName}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {previous.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl md:text-2xl font-bold mb-3">Recent launches</h2>
          <ul className="divide-y divide-white/[0.06] rounded-2xl border border-white/10 bg-white/[0.03]">
            {previous.map((l) => (
              <li key={l.id} className="px-5 py-3 text-sm flex items-start gap-3">
                <span className="flex-1 min-w-0">
                  <span className="text-white/85 font-medium">{l.missionName ?? l.name}</span>
                  <span className="block text-white/50 mt-0.5">
                    {formatLaunchNet(l, DENVER_TZ)} (Denver)
                    {l.providerName ? ` · ${l.providerName}` : ""}
                    {l.padName ? ` · ${l.padName}` : ""}
                  </span>
                </span>
                <StatusChip launch={l} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="font-semibold text-white/90">See the pads on the globe</h2>
        <p className="text-sm text-white/55 leading-relaxed mt-2">
          Every pad on this board is pinned on the WorldEye globe: open the{" "}
          <Link href="/" className="text-[#00E5FF] hover:underline">
            live globe
          </Link>{" "}
          and switch on the Space Missions layer (Space &amp; Orbits group) — pads are
          coloured by their next launch&apos;s status, and each pad opens its own
          upcoming and recent flights. For the one spaceport coast with a real camera
          wall, see{" "}
          <Link href="/launch-sites" className="text-[#00E5FF] hover:underline">
            launch sites
          </Link>
          .
        </p>
      </section>

      <FaqSection title="Launch board — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="More space, live"
        links={[
          { label: "Launch sites — the Space Coast camera wall", href: "/launch-sites" },
          { label: "Satellite tracker", href: "/satellite-tracker" },
          { label: "ISS & space station tracker", href: "/space-station-tracker" },
          { label: "Live events happening now", href: "/live-events" },
        ]}
      />

      <TrialCtaSection utmSource="launches" />

      <CtaRow backHref="/live-webcams" backLabel="All live webcams" />
    </>,
  );
}
