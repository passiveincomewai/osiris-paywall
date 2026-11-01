// ── Event-driven news alerts (2026-11 expansion, pick 14) ───────────
// The weekly digest's sources (USGS + NASA EONET) can also fire a
// same-hour alert — but only for events that clear a genuinely rare
// bar, so this stays an alert and never becomes a drip:
//   • an earthquake of magnitude 7.0+ in the last 2 hours (USGS), or
//   • a volcanic event whose first EONET geometry is in the last 2
//     hours (a newly opened eruption event).
// Audience: the verified newsletter list, with the digest's discipline
// (DigestSendLog per (email, alert key) is the never-twice guarantee;
// excluded inboxes skipped; subscribers who are also users keep their
// lifecycle opt-out). Copy names the source and links the live
// tracker — an alert, never a written-up story.

import { db } from "../db";
import { sendEmail } from "../email";
import { appBaseUrl } from "../app-url";
import { isExcludedEmail } from "./config";
import { newsAlertEmail } from "./templates";

const USGS_WEEK_FEED =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson";
const EONET_VOLCANOES =
  "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&category=volcanoes&limit=100";
const FETCH_UA = "WorldEye-Lifecycle-NewsAlerts/1.0";
export const NEWS_ALERT_WINDOW_MS = 2 * 3600_000;
export const NEWS_ALERT_MIN_MAGNITUDE = 7.0;

export interface NewsAlertCandidate {
  source: "usgs" | "eonet-volcano";
  eventId: string;
  headline: string;
  detail: string;
  sourceLabel: string;
  ctaLabel: string;
  ctaUrl: string;
  /** The DigestSendLog issue key — one per source event, forever. */
  issueKey: string;
}

/* ── Pure selectors (unit-tested; fetchers injected by the runner) ── */

interface UsgsFeature {
  id?: string;
  properties?: { mag?: number; place?: string; time?: number; url?: string };
}

export function selectUsgsAlerts(geojson: unknown, now: Date): NewsAlertCandidate[] {
  const features = (geojson as { features?: UsgsFeature[] })?.features ?? [];
  const out: NewsAlertCandidate[] = [];
  for (const f of features) {
    const p = f?.properties ?? {};
    if (typeof p.mag !== "number" || p.mag < NEWS_ALERT_MIN_MAGNITUDE) continue;
    if (typeof p.time !== "number" || !f.id) continue;
    const age = now.getTime() - p.time;
    if (age < 0 || age > NEWS_ALERT_WINDOW_MS) continue;
    const place = typeof p.place === "string" ? p.place : "an unknown location";
    out.push({
      source: "usgs",
      eventId: f.id,
      headline: `M${p.mag.toFixed(1)} earthquake — ${place}`,
      detail: `A magnitude ${p.mag.toFixed(1)} earthquake struck ${place} within the last two hours. It is on the live tracker now, with the cameras around the epicentre.`,
      sourceLabel: "USGS earthquake feed",
      ctaLabel: "Open the earthquake tracker",
      ctaUrl: `${appBaseUrl()}/earthquake-tracker`,
      issueKey: `alert:usgs:${f.id}`,
    });
  }
  return out;
}

interface EonetEvent {
  id?: string;
  title?: string;
  link?: string;
  geometry?: { date?: string }[];
}

export function selectVolcanoAlerts(eonet: unknown, now: Date): NewsAlertCandidate[] {
  const events = (eonet as { events?: EonetEvent[] })?.events ?? [];
  const out: NewsAlertCandidate[] = [];
  for (const e of events) {
    if (!e?.id || !e.title) continue;
    const first = (e.geometry ?? [])
      .map((g) => (typeof g.date === "string" ? Date.parse(g.date) : NaN))
      .filter((t) => Number.isFinite(t))
      .sort((a, b) => a - b)[0];
    if (first === undefined) continue;
    const age = now.getTime() - first;
    if (age < 0 || age > NEWS_ALERT_WINDOW_MS) continue;
    out.push({
      source: "eonet-volcano",
      eventId: e.id,
      headline: `Volcano event: ${e.title}`,
      detail: `NASA's EONET opened a volcanic event in the last two hours: ${e.title}. Follow it on the live volcano cameras as it develops.`,
      sourceLabel: "NASA EONET",
      ctaLabel: "Open the volcano cameras",
      ctaUrl: `${appBaseUrl()}/volcano-webcams`,
      issueKey: `alert:eonet:${e.id}`,
    });
  }
  return out;
}

/* ── Runner ───────────────────────────────────────────────────────── */

async function fetchJson(url: string, timeoutMs = 15000): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "User-Agent": FETCH_UA },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

export interface NewsAlertsSummary {
  candidates: number;
  sent: number;
  skipped: Record<string, number>;
}

export async function runNewsAlerts(
  opts: {
    now?: Date;
    fetchUsgs?: () => Promise<unknown>;
    fetchVolcanoes?: () => Promise<unknown>;
  } = {},
): Promise<NewsAlertsSummary> {
  const now = opts.now ?? new Date();
  const summary: NewsAlertsSummary = { candidates: 0, sent: 0, skipped: {} };
  const skip = (reason: string) => {
    summary.skipped[reason] = (summary.skipped[reason] ?? 0) + 1;
  };

  let candidates: NewsAlertCandidate[] = [];
  try {
    const geo = await (opts.fetchUsgs ?? (() => fetchJson(USGS_WEEK_FEED)))();
    candidates = candidates.concat(selectUsgsAlerts(geo, now));
  } catch {
    skip("usgs_fetch_failed");
  }
  try {
    const eonet = await (opts.fetchVolcanoes ?? (() => fetchJson(EONET_VOLCANOES)))();
    candidates = candidates.concat(selectVolcanoAlerts(eonet, now));
  } catch {
    skip("eonet_fetch_failed");
  }
  summary.candidates = candidates.length;
  if (candidates.length === 0) return summary;

  const subs = await db.newsletterSubscriber.findMany({
    where: { verified: true },
    select: { email: true, unsubToken: true },
    take: 10000,
  });

  for (const candidate of candidates) {
    for (const sub of subs) {
      if (isExcludedEmail(sub.email)) {
        skip("excluded");
        continue;
      }
      const already = await db.digestSendLog.findUnique({
        where: { email_issueKey: { email: sub.email, issueKey: candidate.issueKey } },
        select: { id: true },
      });
      if (already) {
        skip("already_sent");
        continue;
      }
      // Subscribers who are also users keep their lifecycle opt-out.
      const user = await db.user.findUnique({
        where: { email: sub.email },
        select: { emailOptOut: true },
      });
      if (user?.emailOptOut) {
        skip("opted_out");
        continue;
      }
      const unsubscribeUrl = `${appBaseUrl()}/api/newsletter/unsubscribe?token=${sub.unsubToken}`;
      const rendered = newsAlertEmail({
        headline: candidate.headline,
        detail: candidate.detail,
        sourceLabel: candidate.sourceLabel,
        ctaLabel: candidate.ctaLabel,
        ctaUrl: candidate.ctaUrl,
        unsubscribeUrl,
      });
      const ok = await sendEmail(sub.email, rendered.subject, rendered.html);
      if (!ok) {
        skip("send_failed");
        continue;
      }
      await db.digestSendLog.create({
        data: { email: sub.email, issueKey: candidate.issueKey },
      });
      summary.sent++;
    }
  }
  return summary;
}
