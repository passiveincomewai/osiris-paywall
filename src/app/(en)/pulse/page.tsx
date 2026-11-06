import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ArrowRight, Camera, Globe2, Snowflake, Waves } from "lucide-react";
import {
  BASE,
  Breadcrumb,
  JsonLd,
  PageShell,
} from "@/components/directory-page";
import {
  CAMERA_INDEX_SNAPSHOT,
  LIVE_CAMERA_COUNT_LABEL,
  SITE_STATS_AS_OF,
  formatSiteCount,
} from "@/lib/site-stats";
import { db } from "@/lib/db";
import {
  USGS_SUMMARY_FEED_URL,
  parseUsgsFeature,
} from "@/lib/events/earthquakes";
import { getPlows, getPlowFeedStatus } from "@/lib/plows";

/**
 * WorldEye Pulse — the network's public scoreboard.
 *
 * Every number on this page is computed or imported at render time
 * from the same sources the rest of the site uses, and each carries
 * its source and as-of label next to it:
 *  - Camera counts come from lib/site-stats (the canonical public
 *    statistics module). The 74,229 headline and the 91,266 Index
 *    "served" figure are DIFFERENT measures and are never blended;
 *    both are labelled with what they count and their date.
 *  - Camera opens today are counted from WorldEye's own PageView
 *    analytics (event = "camera_open", America/Denver day) — the
 *    same measure as the daily traffic reports. One indexed
 *    aggregate count; the page revalidates every 300 s, so the
 *    database sees at most a handful of these queries per hour.
 *  - Earthquakes are counted from the USGS summary feed the globe's
 *    quake layer wraps (lib/events/earthquakes).
 *  - Snow plows come from lib/plows, the pipeline behind /api/plows,
 *    with its stale flag surfaced honestly: a failed feed refresh
 *    turns the figure into a labelled "last known" count, never a
 *    silently stale "live" one.
 * A source that fails at render time shows "unavailable" — this page
 * never falls back to a typed-in number.
 */

export const revalidate = 300;

export const metadata: Metadata = {
  title: "WorldEye Pulse — Live Network Numbers",
  description:
    "The state of the WorldEye network, with sources attached: 74,229 live public cameras, camera opens today, earthquakes in the last 24 hours and snow plows tracked right now.",
  alternates: { canonical: "/pulse" },
  openGraph: {
    title: "WorldEye Pulse — Live Network Numbers",
    description:
      "Real, labelled counters from the WorldEye network — cameras, opens today, earthquakes and snow plows, each with its source and as-of time.",
    type: "website",
    url: "/pulse",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "WorldEye Pulse — Live Network Numbers",
  description:
    "The state of the WorldEye network: live camera counts, camera opens today, earthquakes in the last 24 hours and snow plows tracked now — every figure labelled with its source.",
  url: `${BASE}/pulse`,
};

/* ---------- America/Denver day boundary ---------- */

/** Offset (ms) of `timeZone` from UTC at the given instant. */
function tzOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** The UTC instant of today's midnight in America/Denver. */
function denverMidnightUtc(now: Date): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const guess = Date.UTC(get("year"), get("month") - 1, get("day"));
  // Two passes: the offset at the guess, refined at the result
  // (midnight is never inside a DST transition, which occurs 2 a.m.).
  const once = guess + tzOffsetMs(new Date(guess), "America/Denver");
  return new Date(once + (tzOffsetMs(new Date(once), "America/Denver") - tzOffsetMs(new Date(guess), "America/Denver")));
}

const timeLabel = (d: Date) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(d);

/* ---------- Live counters (all fail-soft) ---------- */

async function cameraOpensToday(): Promise<number | null> {
  try {
    return await db.pageView.count({
      where: { event: "camera_open", createdAt: { gte: denverMidnightUtc(new Date()) } },
    });
  } catch {
    return null;
  }
}

async function earthquakes24h(): Promise<{ count: number; fetchedAt: Date } | null> {
  try {
    const res = await fetch(USGS_SUMMARY_FEED_URL, {
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const features: unknown[] = Array.isArray(data?.features) ? data.features : [];
    const count = features.filter((f) => parseUsgsFeature(f) !== null).length;
    return { count, fetchedAt: new Date() };
  } catch {
    return null;
  }
}

async function plowsNow(): Promise<{
  count: number;
  ok: boolean | null;
  fetchedAt: string | null;
} | null> {
  try {
    const plows = await getPlows();
    const status = getPlowFeedStatus();
    return { count: plows.length, ok: status.ok, fetchedAt: status.fetchedAt };
  } catch {
    return null;
  }
}

/* ---------- Page ---------- */

interface Counter {
  icon: React.ReactNode;
  value: string;
  label: string;
  source: string;
}

export default async function PulsePage() {
  const [opens, quakes, plows] = await Promise.all([
    cameraOpensToday(),
    earthquakes24h(),
    plowsNow(),
  ]);

  const counters: Counter[] = [
    {
      icon: <Camera className="w-4 h-4" />,
      value: LIVE_CAMERA_COUNT_LABEL,
      label: "Live public cameras on the globe",
      source: `WorldEye's standing public count · figures reconciled ${SITE_STATS_AS_OF}`,
    },
    {
      icon: <Globe2 className="w-4 h-4" />,
      value: CAMERA_INDEX_SNAPSHOT.servedLabel,
      label: "Cameras served by the catalogue API",
      source: `Live Camera Index snapshot · ${CAMERA_INDEX_SNAPSHOT.snapshotDateLabel} · unique cameras, deduplicated by camera ID`,
    },
    {
      icon: <Activity className="w-4 h-4" />,
      value: opens === null ? "—" : formatSiteCount(opens),
      label: "Camera opens today",
      source:
        opens === null
          ? "WorldEye analytics · temporarily unavailable"
          : "WorldEye analytics · since midnight America/Denver · this page refreshes about every 5 minutes",
    },
    {
      icon: <Waves className="w-4 h-4" />,
      value: quakes === null ? "—" : formatSiteCount(quakes.count),
      label: "Earthquakes in the last 24 hours (M2.5+)",
      source:
        quakes === null
          ? "USGS summary feed · temporarily unavailable"
          : `USGS summary feed · fetched ${timeLabel(quakes.fetchedAt)} Denver time`,
    },
    {
      icon: <Snowflake className="w-4 h-4" />,
      value:
        plows === null || (plows.ok === false && plows.count === 0)
          ? "—"
          : formatSiteCount(plows.count),
      label:
        plows !== null && plows.ok === false && plows.count > 0
          ? "Snow plows tracked (last known)"
          : "Snow plows tracked right now",
      source:
        plows === null
          ? "State & provincial DOT feeds · temporarily unavailable"
          : plows.ok === false && plows.count === 0
            ? "State & provincial DOT feeds · unreachable at the last check"
            : `10 state & provincial DOT feeds · as of ${
                plows.fetchedAt ? timeLabel(new Date(plows.fetchedAt)) : "the last feed check"
              } Denver time`,
    },
  ];

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <Breadcrumb
        trail={[{ label: "Home", href: "/" }, { label: "WorldEye Pulse" }]}
      />

      <div className="text-center max-w-3xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
          <Activity className="w-3.5 h-3.5" /> WORLDEYE PULSE
        </p>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
          The network, in numbers
        </h1>
        <p className="mt-4 text-white/55">
          Every figure on this page comes straight from the systems that
          run WorldEye — and says where it came from, right next to the
          number. No estimates, no rounding up.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl mx-auto">
        {counters.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center"
          >
            <div className="flex items-center justify-center gap-1.5 text-[#D4AF37] text-xs font-semibold tracking-[0.18em]">
              {c.icon}
            </div>
            <div className="text-3xl md:text-4xl font-bold text-white mt-2">
              {c.value}
            </div>
            <div className="text-sm text-white/70 mt-1">{c.label}</div>
            <div className="text-[11px] leading-relaxed text-white/35 mt-2">
              {c.source}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 space-y-4 text-white/70 leading-relaxed max-w-3xl mx-auto">
        <p>
          WorldEye is a free live globe of the planet: public cameras,
          flights, satellites, weather, earthquakes and winter road
          fleets on one map, with no signup needed to look around.
          Pulse is its scoreboard — the page journalists, directories
          and curious visitors can cite when they need the network's
          size from the source.
        </p>
        <p>
          Why two camera numbers? They measure different things. The
          headline counts the live public cameras placed on the globe;
          the Live Camera Index snapshot counts every unique camera the
          catalogue API served that day, including cameras not yet
          placed on the globe — so it runs higher. Both are published,
          labelled, and never averaged into each other.
        </p>
        <p className="text-sm text-white/40">
          Citing this page: “WorldEye Pulse — worldeye.app/pulse”,
          with the figure's own source and date as labelled above.
        </p>
      </div>

      <div className="mt-12 flex flex-wrap justify-center gap-3">
        <a
          href={BASE}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition"
        >
          <Globe2 className="w-4 h-4" /> Open the live globe
        </a>
        <Link
          href="/live-webcams"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 transition"
        >
          Browse live webcams <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </PageShell>
  );
}
