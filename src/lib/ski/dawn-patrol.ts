/**
 * Powder Pass #1 — Dawn-patrol snow alerts.
 *
 * Vercel cron 12:00 UTC daily (≈ dawn for US resorts — stated honestly
 * in the email). For every user who follows ≥1 resort and has ski
 * access (resolveSkiAccess — the only gate), the modelled snowfall of
 * the trailing 24 complete hours is computed per followed resort from
 * Open-Meteo. Resorts at ≥ 10 cm in that window qualify; a user with
 * ≥1 qualifying resort gets ONE aggregated email listing each of them
 * with a link to its normal camera page.
 *
 * Truth rules baked in: the figures are MODELLED (labelled, with the
 * fetch time); no snow-stake camera data is claimed (the catalogue's
 * stake rule matches zero real cameras); no resort, total or time is
 * invented — a resort whose fetch fails simply takes no part.
 *
 * Never-send-twice: one SkiEmailSendLog row per (user, 'dawn', UTC run
 * date), checked before sending and written only after a successful
 * send — a re-run the same day sends nothing twice.
 *
 * 2026-11 expansion (pick 5): followers WITHOUT ski access receive a
 * once-daily TEASER instead (kind 'teaser') — the top qualifying
 * resort's figure only; the full brief stays members-only.
 */
import { shell, escapeHtml, appUrl } from "@/lib/email";
import { getSkiResort, type SkiResort } from "@/lib/ski-resorts";
import { formatCm, trailing24hSnowfallCm } from "./openmeteo";
import {
  SKI_EMAIL_KINDS,
  defaultSkiEmailDeps,
  fetchedAtLabel,
  groupFollowsByUser,
  makeSnowCache,
  skiEmailFooter,
  unsubscribeUrlFor,
  utcDateKey,
  type SkiEmailDeps,
} from "./ski-email";

/** Qualifying threshold for the trailing-24h modelled total (stated in the email). */
export const DAWN_PATROL_THRESHOLD_CM = 10;

export interface DawnResortHit {
  resort: SkiResort;
  snowCm: number;
}

export function dawnPatrolEmail(input: {
  name: string | null;
  hits: DawnResortHit[];
  fetchedAt: Date;
  unsubscribeUrl: string | null;
}): { subject: string; html: string } {
  const first = input.name?.trim().split(/\s+/)[0] || "there";
  const names = input.hits.map(h => h.resort.name).join(", ");
  const rows = input.hits
    .map(h => {
      const url = appUrl(`/ski-webcams/${h.resort.slug}`);
      return `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 10px;"><strong style="color:#fff;">${escapeHtml(h.resort.name)}</strong> — ${formatCm(h.snowCm)} modelled snowfall in the last 24 hours. <a href="${escapeHtml(url)}" style="color:#D4AF37;">See the live cameras</a></p>`;
    })
    .join("\n");
  return {
    subject: `Dawn patrol: fresh snow at ${names}`,
    html: shell(
      "Fresh snow overnight",
      `Modelled 24h snowfall reached ${DAWN_PATROL_THRESHOLD_CM} cm at ${names}.`,
      `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Hi ${escapeHtml(first)},</p>
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Good morning — the resorts you follow that picked up at least ${DAWN_PATROL_THRESHOLD_CM} cm of modelled snowfall in the 24 hours before this check:</p>
       ${rows}
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">These figures are modelled by Open-Meteo at each resort's coordinates (fetched ${escapeHtml(fetchedAtLabel(input.fetchedAt))}) — they are not measured on the mountain. Open the live cameras to see the snow for yourself before you go.</p>
       <p style="font-size:13px;color:#71717a;">Dawn patrol runs once a day at 12:00 UTC (early morning for US resorts) and only emails when a resort you follow reaches the ${DAWN_PATROL_THRESHOLD_CM} cm threshold.</p>
       ${skiEmailFooter(input.unsubscribeUrl)}`,
      { label: "Open My Powder", href: appUrl("/ski-webcams/my") },
    ),
  };
}

/** Dawn-patrol TEASER for followers WITHOUT ski access (pick 5): the
 * top qualifying resort's real figure and nothing else — the full
 * ranked brief is the member email. Same modelled-data labelling,
 * same fetch timestamp; the pitch is one honest paragraph (locked
 * price + trial from the Powder Pass facts). */
export function dawnPatrolTeaserEmail(input: {
  name: string | null;
  topHit: DawnResortHit;
  otherCount: number;
  fetchedAt: Date;
  unsubscribeUrl: string | null;
}): { subject: string; html: string } {
  const first = input.name?.trim().split(/\s+/)[0] || "there";
  const others =
    input.otherCount > 0
      ? ` — and ${input.otherCount} more resort${input.otherCount === 1 ? "" : "s"} you follow crossed the ${DAWN_PATROL_THRESHOLD_CM} cm line too`
      : "";
  return {
    subject: `Fresh snow at ${input.topHit.resort.name} — members got the full dawn brief`,
    html: shell(
      "Fresh snow where you follow",
      `${input.topHit.resort.name} picked up ${formatCm(input.topHit.snowCm)} of modelled snow in the last 24 hours.`,
      `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Hi ${escapeHtml(first)},</p>
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">A taste of this morning's dawn patrol: <strong style="color:#fff;">${escapeHtml(input.topHit.resort.name)}</strong> picked up <strong style="color:#fff;">${formatCm(input.topHit.snowCm)}</strong> of modelled snowfall in the last 24 hours${others}.</p>
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Powder Pass members got the full brief at dawn — every resort they follow past the ${DAWN_PATROL_THRESHOLD_CM} cm line, with the live camera links. Your follows are saved on your free account either way; the brief itself is the members-only part. Powder Pass is $4.99/month after a 10-day free trial.</p>
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">The figure is modelled by Open-Meteo at the resort's coordinates (fetched ${escapeHtml(fetchedAtLabel(input.fetchedAt))}), not measured on the mountain — the live cameras show the real thing.</p>
       ${skiEmailFooter(input.unsubscribeUrl)}`,
      { label: "See Powder Pass", href: appUrl("/powder-pass") },
    ),
  };
}

export interface DawnPatrolSummary {
  dryRun: boolean;
  dateKey: string;
  /** Users following ≥1 resort. */
  followers: number;
  /** Users who passed email + opt-out + ski-access + dedupe gates. */
  eligible: number;
  sent: number;
  /** Dawn-patrol TEASERS sent to followers without ski access (pick 5). */
  teasersSent: number;
  skipped: Record<string, number>;
}

export async function runDawnPatrol(
  opts: { dryRun?: boolean; deps?: SkiEmailDeps } = {},
): Promise<DawnPatrolSummary> {
  const deps = opts.deps ?? defaultSkiEmailDeps();
  const now = deps.now();
  const dateKey = utcDateKey(now);
  const summary: DawnPatrolSummary = {
    dryRun: !!opts.dryRun,
    dateKey,
    followers: 0,
    eligible: 0,
    sent: 0,
    teasersSent: 0,
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

    // Hits are computed for EVERY follower: members get the brief,
    // followers without ski access get the one-resort teaser (pick 5).
    const hits: DawnResortHit[] = [];
    let fetchedAt: Date | null = null;
    for (const slug of slugs) {
      const resort = getSkiResort(slug);
      if (!resort) continue; // follows are slug-validated at write time; defensive only
      const snow = await snowFor(resort);
      if (!snow) {
        skip("snow_fetch_failed");
        continue;
      }
      fetchedAt = snow.fetchedAt;
      const cm = trailing24hSnowfallCm(snow.hourly, now, snow.utcOffsetSeconds);
      if (cm === null) {
        skip("snow_no_data");
        continue;
      }
      if (cm >= DAWN_PATROL_THRESHOLD_CM) hits.push({ resort, snowCm: cm });
    }
    if (hits.length === 0) {
      skip("no_qualifying_resort");
      continue;
    }

    if (await deps.hasSkiAccess(userId)) {
      if (await deps.alreadySent(userId, SKI_EMAIL_KINDS.dawn, dateKey)) {
        skip("already_sent");
        continue;
      }
      summary.eligible++;

      const rendered = dawnPatrolEmail({
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
      await deps.recordSent(userId, SKI_EMAIL_KINDS.dawn, dateKey);
      summary.sent++;
    } else {
      // Teaser: top hit only, once per UTC day, same never-twice log.
      if (await deps.alreadySent(userId, SKI_EMAIL_KINDS.teaser, dateKey)) {
        skip("already_sent");
        continue;
      }
      const topHit = [...hits].sort((a, b) => b.snowCm - a.snowCm)[0];
      const rendered = dawnPatrolTeaserEmail({
        name: user.name,
        topHit,
        otherCount: hits.length - 1,
        fetchedAt: fetchedAt ?? now,
        unsubscribeUrl: unsubscribeUrlFor(userId),
      });
      if (summary.dryRun) {
        summary.teasersSent++;
        continue;
      }
      const ok = await deps.send(user.email, rendered.subject, rendered.html);
      if (!ok) {
        skip("send_failed");
        continue;
      }
      await deps.recordSent(userId, SKI_EMAIL_KINDS.teaser, dateKey);
      summary.teasersSent++;
    }
  }
  return summary;
}
