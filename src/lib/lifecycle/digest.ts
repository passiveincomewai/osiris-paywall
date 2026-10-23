// ── "In Case You Missed It" weekly digest ────────────────────────────
// The newsletter list (NewsletterSubscriber — the double opt-in capture
// that already exists: /api/newsletter/subscribe, EmailCaptureCard,
// signup opt-in) gets ONE digest per week, built only from real data:
//
//   • Most watched countries — camera_open PageView rows on the country
//     explorer pages, counted per country (the only per-region open
//     data the analytics rows carry today; see region.ts).
//   • Largest earthquakes — USGS GeoJSON summary feed, the same feed
//     family the site's own /api/earthquakes uses (2.5_week window).
//   • Wildfires — NASA EONET open wildfire events, the same API the
//     site's /api/weather + /api/fires routes read.
//   • Active tropical storms — NOAA NHC CurrentStorms.json, the same
//     source as /api/hurricanes.
//
// Every section degrades independently: a failed or empty source just
// omits its section, and when NOTHING has data the digest does not
// send at all. State discipline mirrors the rest of the system: a
// DigestSendLog row per (email, issue) is the never-double-send
// guarantee; owner/test inboxes are excluded; subscribers who are also
// users keep their lifecycle opt-out and 48h marketing cap.

import { db } from "../db";
import { sendEmail } from "../email";
import { appBaseUrl } from "../app-url";
import { isExcludedEmail, MARKETING_CAP_WINDOW_MS } from "./config";
import { countrySlugFromPath, COUNTRY_PATH_PREFIX } from "./region";
import {
  hasDigestContent,
  weeklyDigestEmail,
  type DigestContent,
} from "./templates";
import countriesIndex from "../../data/camera-countries.json";

const COUNTRY_NAME_BY_SLUG = new Map(
  (countriesIndex as { countries: { slug: string; name: string }[] }).countries.map(
    (c) => [c.slug, c.name] as const,
  ),
);

const USGS_WEEK_FEED =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson";
const EONET_WILDFIRES =
  "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&category=wildfires&limit=100";
const NHC_CURRENT_STORMS = "https://www.nhc.noaa.gov/CurrentStorms.json";
const FETCH_UA = "WorldEye-Lifecycle-Digest/1.0";

async function fetchJson(url: string, timeoutMs = 15000): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "User-Agent": FETCH_UA },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

/** ISO-8601 week key for an instant, e.g. "2026-W43". One per issue. */
export function digestIssueKey(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // Thursday of this week
  const isoYear = d.getUTCFullYear();
  const jan1 = new Date(Date.UTC(isoYear, 0, 1));
  const dayOfYear = Math.floor((d.getTime() - jan1.getTime()) / 86400_000) + 1;
  const week = Math.ceil(dayOfYear / 7);
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

function weekLabelFor(now: Date): string {
  const end = new Date(now);
  const start = new Date(now.getTime() - 6 * 86400_000);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { timeZone: "UTC", month: "long", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}, ${end.getUTCFullYear()}`;
}

/** Build this issue's content from the live sources. Never throws —
 * a dead source yields an empty section, and the caller checks
 * hasDigestContent before sending anything. */
export async function buildDigestContent(now: Date): Promise<DigestContent> {
  const content: DigestContent = {
    weekLabel: weekLabelFor(now),
    topCountries: [],
    quakes: [],
    fireCount: 0,
    fireTitles: [],
    storms: [],
  };

  // Most watched countries — attributable camera opens, trailing 7 days.
  try {
    const grouped = await db.pageView.groupBy({
      by: ["path"],
      where: {
        event: "camera_open",
        path: { startsWith: COUNTRY_PATH_PREFIX },
        createdAt: { gte: new Date(now.getTime() - 7 * 86400_000) },
      },
      _count: { _all: true },
    });
    const bySlug = new Map<string, number>();
    for (const row of grouped) {
      const slug = countrySlugFromPath(row.path);
      if (slug) bySlug.set(slug, (bySlug.get(slug) ?? 0) + row._count._all);
    }
    content.topCountries = [...bySlug.entries()]
      .map(([slug, opens]) => ({ slug, name: COUNTRY_NAME_BY_SLUG.get(slug) ?? slug, opens }))
      .sort((a, b) => b.opens - a.opens)
      .slice(0, 5);
  } catch {
    /* section omitted */
  }

  // Largest earthquakes of the week (USGS, M4.5+).
  try {
    const geo = (await fetchJson(USGS_WEEK_FEED)) as {
      features?: { properties?: { mag?: number; place?: string; time?: number; url?: string } }[];
    };
    content.quakes = (geo.features ?? [])
      .map((f) => f.properties ?? {})
      .filter((p) => typeof p.mag === "number" && p.mag >= 4.5 && p.place && p.url)
      .sort((a, b) => (b.mag as number) - (a.mag as number))
      .slice(0, 5)
      .map((p) => ({
        magnitude: p.mag as number,
        place: p.place as string,
        url: p.url as string,
        whenLabel: new Date(p.time as number).toLocaleDateString("en-US", {
          timeZone: "UTC",
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
      }));
  } catch {
    /* section omitted */
  }

  // Open wildfires (NASA EONET).
  try {
    const eonet = (await fetchJson(EONET_WILDFIRES)) as { events?: { title?: string }[] };
    const events = eonet.events ?? [];
    content.fireCount = events.length;
    content.fireTitles = events
      .map((e) => e.title)
      .filter((t): t is string => typeof t === "string" && t.length > 0)
      .slice(0, 5);
  } catch {
    /* section omitted */
  }

  // Active tropical storms (NOAA NHC).
  try {
    const nhc = (await fetchJson(NHC_CURRENT_STORMS)) as {
      activeStorms?: { name?: string; classification?: string; intensity?: string | number }[];
    };
    content.storms = (nhc.activeStorms ?? [])
      .filter((s) => typeof s.name === "string" && s.name.length > 0)
      .map((s) => ({
        name: s.name as string,
        classification: typeof s.classification === "string" ? s.classification : "",
        intensityKt: s.intensity != null && !Number.isNaN(Number(s.intensity)) ? Number(s.intensity) : null,
      }));
  } catch {
    /* section omitted */
  }

  return content;
}

export interface DigestRunSummary {
  dryRun: boolean;
  issueKey: string;
  /** False when every source came back empty — nothing was sent. */
  hasContent: boolean;
  recipients: number;
  sent: number;
  skipped: Record<string, number>;
  /** Dry-run only: one true render (first eligible recipient's copy). */
  sampleHtml?: string;
  sampleSubject?: string;
}

/**
 * Send (or dry-run) this week's digest to verified newsletter
 * subscribers. Never double-sends an issue to the same inbox.
 */
export async function sendWeeklyDigest(
  opts: {
    dryRun?: boolean;
    now?: Date;
    send?: (to: string, subject: string, html: string) => Promise<boolean>;
  } = {},
): Promise<DigestRunSummary> {
  const now = opts.now ?? new Date();
  const send = opts.send ?? sendEmail;
  const issueKey = digestIssueKey(now);
  const summary: DigestRunSummary = {
    dryRun: !!opts.dryRun,
    issueKey,
    hasContent: false,
    recipients: 0,
    sent: 0,
    skipped: {},
  };
  const skip = (reason: string) => {
    summary.skipped[reason] = (summary.skipped[reason] ?? 0) + 1;
  };

  const content = await buildDigestContent(now);
  summary.hasContent = hasDigestContent(content);
  if (!summary.hasContent) {
    skip("no_content");
    return summary;
  }

  const subs = await db.newsletterSubscriber.findMany({
    where: { verified: true },
    select: { email: true, unsubToken: true },
    take: 10000,
  });
  summary.recipients = subs.length;
  const base = appBaseUrl();

  for (const sub of subs) {
    const email = sub.email.toLowerCase();
    if (isExcludedEmail(email)) {
      skip("excluded_recipient");
      continue;
    }
    const already = await db.digestSendLog.findUnique({
      where: { email_issueKey: { email, issueKey } },
      select: { id: true },
    });
    if (already) {
      skip("already_sent");
      continue;
    }
    // Subscribers who are also account holders keep their lifecycle
    // protections: marketing opt-out + the 48h marketing cap.
    const user = await db.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, emailOptOut: true },
    });
    if (user?.emailOptOut) {
      skip("opted_out");
      continue;
    }
    if (user) {
      const recentMarketing = await db.lifecycleEmailLog.count({
        where: {
          userId: user.id,
          kind: "marketing",
          status: "sent",
          createdAt: { gte: new Date(now.getTime() - MARKETING_CAP_WINDOW_MS) },
        },
      });
      if (recentMarketing > 0) {
        skip("marketing_cap");
        continue;
      }
    }
    const rendered = weeklyDigestEmail({
      content,
      unsubscribeUrl: `${base}/api/newsletter/unsubscribe?token=${encodeURIComponent(sub.unsubToken)}`,
    });
    if (summary.dryRun) {
      summary.sent++;
      if (!summary.sampleHtml) {
        summary.sampleHtml = rendered.html;
        summary.sampleSubject = rendered.subject;
      }
      continue;
    }
    const ok = await send(sub.email, rendered.subject, rendered.html);
    if (!ok) {
      skip("send_failed");
      continue;
    }
    await db.digestSendLog
      .create({ data: { email, issueKey } })
      .catch(() => {}); // unique race: another run logged it first
    summary.sent++;
  }
  return summary;
}
