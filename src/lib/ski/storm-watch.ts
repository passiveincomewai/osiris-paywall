/**
 * Powder Pass — Storm-watch emails (2026-11 expansion, pick 10).
 *
 * Daily companion to dawn patrol: where dawn patrol reports snow that
 * FELL, storm watch warns about snow that's COMING — a followed resort
 * whose next-3-local-days modelled forecast totals ≥ 30 cm gets one
 * aggregated email per user. Audience is the dawn-patrol audience
 * (followers WITH ski access via resolveSkiAccess — never a new gate).
 *
 * Truth rules: every figure is the Open-Meteo MODELLED forecast at the
 * resort's coordinates, labelled as a forecast with its fetch time;
 * nothing is presented as observed or guaranteed.
 *
 * Never-send-twice: the dedupe key is the storm's first ≥5 cm forecast
 * day. Because that date slides forward as the storm arrives, the
 * runner also treats a send logged under the two preceding dates as
 * the same storm — one storm, one email; a genuinely new storm whose
 * first snow day lands 3+ days later sends again.
 */
import { shell, escapeHtml, appUrl } from "@/lib/email";
import { getSkiResort, type SkiResort } from "@/lib/ski-resorts";
import { formatCm, localDateKey, type DailySnowfall } from "./openmeteo";
import {
  SKI_EMAIL_KINDS,
  defaultSkiEmailDeps,
  fetchedAtLabel,
  groupFollowsByUser,
  makeSnowCache,
  skiEmailFooter,
  unsubscribeUrlFor,
  type SkiEmailDeps,
} from "./ski-email";

/** Qualifying forecast total across the next 3 local days. */
export const STORM_WATCH_THRESHOLD_CM = 30;
export const STORM_WATCH_DAYS = 3;
/** A forecast day counts as the storm's start at ≥ this much snow. */
export const STORM_FIRST_SNOW_MIN_CM = 5;

export interface StormWindow {
  totalCm: number;
  /** First day in the window at ≥ STORM_FIRST_SNOW_MIN_CM, else null. */
  firstSnowDate: string | null;
  days: DailySnowfall[];
}

/** Pure: the 3-day forecast window starting at the first daily entry
 * on/after startKey. Null when the feed has no usable entries. */
export function stormWindow(
  daily: DailySnowfall[],
  startKey: string,
  days: number = STORM_WATCH_DAYS,
): StormWindow | null {
  const idx = daily.findIndex(d => d.date >= startKey);
  if (idx < 0) return null;
  const window = daily.slice(idx, idx + days);
  let total = 0;
  let any = false;
  let firstSnowDate: string | null = null;
  for (const d of window) {
    if (d.snowfallCm == null) continue;
    any = true;
    total += d.snowfallCm;
    if (firstSnowDate === null && d.snowfallCm >= STORM_FIRST_SNOW_MIN_CM) {
      firstSnowDate = d.date;
    }
  }
  if (!any) return null;
  return { totalCm: total, firstSnowDate, days: window };
}

/** "YYYY-MM-DD" shifted by whole days (UTC arithmetic — date only). */
export function shiftDateKey(key: string, deltaDays: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

export interface StormHit {
  resort: SkiResort;
  totalCm: number;
  firstSnowDate: string;
  days: DailySnowfall[];
}

export function stormWatchEmail(input: {
  name: string | null;
  hits: StormHit[];
  fetchedAt: Date;
  unsubscribeUrl: string | null;
}): { subject: string; html: string } {
  const first = input.name?.trim().split(/\s+/)[0] || "there";
  const names = input.hits.map(h => h.resort.name).join(", ");
  const rows = input.hits
    .map(h => {
      const url = appUrl(`/ski-webcams/${h.resort.slug}`);
      const perDay = h.days
        .filter(d => d.snowfallCm != null)
        .map(d => `${d.date.slice(5)}: ${formatCm(d.snowfallCm!)}`)
        .join(" · ");
      return `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 10px;"><strong style="color:#fff;">${escapeHtml(h.resort.name)}</strong> — ${formatCm(h.totalCm)} modelled over the next ${STORM_WATCH_DAYS} days (${escapeHtml(perDay)}). <a href="${escapeHtml(url)}" style="color:#D4AF37;">Watch the live cameras</a></p>`;
    })
    .join("\n");
  return {
    subject: `Storm watch: ${names} — ${STORM_WATCH_THRESHOLD_CM} cm+ in the forecast`,
    html: shell(
      "A storm is lining up",
      `Modelled forecast totals reach ${STORM_WATCH_THRESHOLD_CM} cm over the next ${STORM_WATCH_DAYS} days at ${names}.`,
      `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Hi ${escapeHtml(first)},</p>
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Heads up — the resorts you follow with at least ${STORM_WATCH_THRESHOLD_CM} cm of snow in the next ${STORM_WATCH_DAYS} days of the forecast:</p>
       ${rows}
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">These are Open-Meteo MODELLED forecasts at each resort's coordinates (fetched ${escapeHtml(fetchedAtLabel(input.fetchedAt))}) — they can strengthen, fade or shift, and they are not measured snowfall. Check the live cameras as the storm arrives to see what's actually falling.</p>
       ${skiEmailFooter(input.unsubscribeUrl)}`,
      { label: "Open My Powder", href: appUrl("/ski-webcams/my") },
    ),
  };
}

export interface StormWatchSummary {
  dryRun: boolean;
  followers: number;
  eligible: number;
  sent: number;
  skipped: Record<string, number>;
}

export async function runStormWatch(
  opts: { dryRun?: boolean; deps?: SkiEmailDeps } = {},
): Promise<StormWatchSummary> {
  const deps = opts.deps ?? defaultSkiEmailDeps();
  const now = deps.now();
  const summary: StormWatchSummary = {
    dryRun: !!opts.dryRun,
    followers: 0,
    eligible: 0,
    sent: 0,
    skipped: {},
  };
  const skip = (reason: string) => {
    summary.skipped[reason] = (summary.skipped[reason] ?? 0) + 1;
  };

  const byUser = groupFollowsByUser(await deps.listAllFollows());
  summary.followers = byUser.size;
  const snowFor = makeSnowCache(deps.fetchSnow);

  for (const [userId, slugs] of byUser) {
    const user = await deps.getUser(userId);
    if (!user?.email) {
      skip("no_email");
      continue;
    }
    if (user.emailOptOut) {
      skip("opted_out");
      continue;
    }
    if (!(await deps.hasSkiAccess(userId))) {
      skip("no_ski_access");
      continue;
    }

    const hits: StormHit[] = [];
    let fetchedAt: Date | null = null;
    for (const slug of slugs) {
      const resort = getSkiResort(slug);
      if (!resort) continue;
      const snow = await snowFor(resort);
      if (!snow) {
        skip("snow_fetch_failed");
        continue;
      }
      fetchedAt = snow.fetchedAt;
      if (snow.utcOffsetSeconds == null) {
        skip("snow_no_data");
        continue;
      }
      const w = stormWindow(snow.daily, localDateKey(now, snow.utcOffsetSeconds));
      if (!w) {
        skip("snow_no_data");
        continue;
      }
      if (w.totalCm >= STORM_WATCH_THRESHOLD_CM && w.firstSnowDate) {
        hits.push({ resort, totalCm: w.totalCm, firstSnowDate: w.firstSnowDate, days: w.days });
      }
    }
    if (hits.length === 0) {
      skip("no_qualifying_resort");
      continue;
    }

    // One email per storm: keyed on the earliest first-snow day, and
    // suppressed when a send already went out under that date or
    // either of the two preceding dates (the same storm re-forecast).
    const stormKey = hits.map(h => h.firstSnowDate).sort()[0];
    let already = false;
    for (const back of [0, -1, -2]) {
      if (await deps.alreadySent(userId, SKI_EMAIL_KINDS.storm, shiftDateKey(stormKey, back))) {
        already = true;
        break;
      }
    }
    if (already) {
      skip("already_sent");
      continue;
    }
    summary.eligible++;

    const rendered = stormWatchEmail({
      name: user.name,
      hits,
      fetchedAt: fetchedAt ?? now,
      unsubscribeUrl: unsubscribeUrlFor(userId),
    });
    if (summary.dryRun) {
      summary.sent++;
      continue;
    }
    const ok = await deps.send(user.email, rendered.subject, rendered.html);
    if (!ok) {
      skip("send_failed");
      continue;
    }
    await deps.recordSent(userId, SKI_EMAIL_KINDS.storm, stormKey);
    summary.sent++;
  }
  return summary;
}
