/**
 * Powder Pass #2 — Thursday powder-day forecast digest.
 *
 * Vercel cron Thursdays 15:00 UTC. For every user who follows ≥1 resort
 * and has ski access (resolveSkiAccess — the only gate), each followed
 * resort's forecast daily snowfall_sum for the coming Fri–Sun weekend
 * is totalled from Open-Meteo and ranked. The email goes out only when
 * the top resort has > 0 cm forecast — all-zero weeks are skipped
 * silently, with no log row, so a later re-run the same week can still
 * send if the forecast changes.
 *
 * Truth rules baked in: figures are MODELLED forecast data (labelled,
 * with the fetch time); nothing is invented — a resort whose fetch or
 * weekend window fails takes no part in the ranking.
 *
 * Never-send-twice: one SkiEmailSendLog row per (user, 'digest', ISO
 * week), checked before sending and written only after a successful
 * send.
 */
import { shell, escapeHtml, appUrl } from "@/lib/email";
import { getSkiResort, type SkiResort } from "@/lib/ski-resorts";
import { formatCm, localDateKey, upcomingWeekendSnowfall, type DailySnowfall } from "./openmeteo";
import {
  SKI_EMAIL_KINDS,
  defaultSkiEmailDeps,
  fetchedAtLabel,
  groupFollowsByUser,
  isoWeekKey,
  makeSnowCache,
  skiEmailFooter,
  unsubscribeUrlFor,
  type SkiEmailDeps,
} from "./ski-email";

export interface DigestResortRank {
  resort: SkiResort;
  weekendCm: number;
  days: DailySnowfall[];
}

export function powderDigestEmail(input: {
  name: string | null;
  ranked: DigestResortRank[];
  fetchedAt: Date;
  unsubscribeUrl: string | null;
}): { subject: string; html: string } {
  const first = input.name?.trim().split(/\s+/)[0] || "there";
  const top = input.ranked[0];
  const rows = input.ranked
    .map(r => {
      const url = appUrl(`/ski-webcams/${r.resort.slug}`);
      const perDay = r.days
        .map(d => `${escapeHtml(d.date.slice(5))}: ${d.snowfallCm === null ? "—" : formatCm(d.snowfallCm)}`)
        .join(" · ");
      return `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 10px;"><strong style="color:#fff;">${escapeHtml(r.resort.name)}</strong> — ${formatCm(r.weekendCm)} modelled snowfall Fri–Sun (${perDay}). <a href="${escapeHtml(url)}" style="color:#D4AF37;">See the live cameras</a></p>`;
    })
    .join("\n");
  return {
    subject: `Weekend powder outlook: ${top.resort.name} leads your resorts`,
    html: shell(
      "Your weekend powder outlook",
      `${top.resort.name} has the most modelled snow forecast for your resorts this weekend.`,
      `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Hi ${escapeHtml(first)},</p>
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Here is how your followed resorts rank by forecast snowfall for this weekend (Friday–Sunday):</p>
       ${rows}
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">These are modelled forecasts from Open-Meteo at each resort's coordinates (fetched ${escapeHtml(fetchedAtLabel(input.fetchedAt))}) — forecasts change, and they are not measurements. Check the live cameras before you commit to the drive.</p>
       <p style="font-size:13px;color:#71717a;">The powder digest runs Thursdays at 15:00 UTC and only emails when at least one resort you follow has snow in the weekend forecast.</p>
       ${skiEmailFooter(input.unsubscribeUrl)}`,
      { label: "Open My Powder", href: appUrl("/ski-webcams/my") },
    ),
  };
}

export interface PowderDigestSummary {
  dryRun: boolean;
  weekKey: string;
  followers: number;
  eligible: number;
  sent: number;
  skipped: Record<string, number>;
}

export async function runPowderDigest(
  opts: { dryRun?: boolean; deps?: SkiEmailDeps } = {},
): Promise<PowderDigestSummary> {
  const deps = opts.deps ?? defaultSkiEmailDeps();
  const now = deps.now();
  const weekKey = isoWeekKey(now);
  const summary: PowderDigestSummary = {
    dryRun: !!opts.dryRun,
    weekKey,
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
    if (await deps.alreadySent(userId, SKI_EMAIL_KINDS.digest, weekKey)) {
      skip("already_sent");
      continue;
    }

    const ranked: DigestResortRank[] = [];
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
      const referenceDate =
        snow.utcOffsetSeconds !== null ? localDateKey(now, snow.utcOffsetSeconds) : now.toISOString().slice(0, 10);
      const weekend = upcomingWeekendSnowfall(snow.daily, referenceDate);
      if (!weekend) {
        skip("snow_no_data");
        continue;
      }
      ranked.push({ resort, weekendCm: weekend.totalCm, days: weekend.days });
    }
    ranked.sort((a, b) => b.weekendCm - a.weekendCm);
    if (ranked.length === 0 || ranked[0].weekendCm <= 0) {
      skip("all_zero_week");
      continue;
    }
    summary.eligible++;

    const rendered = powderDigestEmail({
      name: user.name,
      ranked,
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
    await deps.recordSent(userId, SKI_EMAIL_KINDS.digest, weekKey);
    summary.sent++;
  }
  return summary;
}
