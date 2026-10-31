/**
 * Aurora alerts — the sender. Runs from /api/cron/aurora-alerts on the
 * house cron pattern (see REPORT.md for the proposed schedule).
 *
 * Flow per run: fetch NOAA's series once → for each active
 * subscription, compose the place's outlook for ITS local night →
 * pure decision (lib/aurora/logic.decideAuroraAlert) → atomic night
 * claim → send → release the claim if the send itself failed, so a
 * later run the same evening can retry. A subscription produces at
 * most one email per place-local night, however often this runs.
 */
import { sendEmail } from "@/lib/email";
import { getKpSeries } from "./noaa";
import { decideAuroraAlert, outlookFor } from "./logic";
import { auroraAlertEmail } from "./email";
import {
  claimAlertNight,
  listActiveSubscriptionsForRun,
  releaseAlertNight,
} from "./service";

export interface AuroraRunSummary {
  dryRun: boolean;
  evaluated: number;
  sent: number;
  wouldSend: number;
  skipped: number;
  reasons: Record<string, number>;
  errors: string[];
}

export async function runAuroraAlerts(opts: { dryRun?: boolean; now?: Date } = {}): Promise<AuroraRunSummary> {
  const dryRun = opts.dryRun ?? false;
  const now = opts.now ?? new Date();
  const summary: AuroraRunSummary = {
    dryRun,
    evaluated: 0,
    sent: 0,
    wouldSend: 0,
    skipped: 0,
    reasons: {},
    errors: [],
  };
  const skip = (reason: string) => {
    summary.skipped++;
    summary.reasons[reason] = (summary.reasons[reason] ?? 0) + 1;
  };

  const points = await getKpSeries();
  if (!points) {
    summary.errors.push("noaa-unavailable");
    return summary;
  }

  const subs = await listActiveSubscriptionsForRun();
  for (const sub of subs) {
    summary.evaluated++;
    try {
      const outlook = outlookFor(
        { lat: sub.lat, lng: sub.lng, timeZone: sub.timeZone },
        sub.requiredKp,
        points,
        now,
      );
      const hoursUntilNightStart = (outlook.night.start.getTime() - now.getTime()) / 3600000;
      const decision = decideAuroraAlert({
        active: sub.active,
        emailOptOut: sub.user.emailOptOut,
        hasEmail: !!sub.user.email,
        tonightMaxKp: outlook.maxKp,
        requiredKp: sub.requiredKp,
        nightKey: outlook.night.nightKey,
        lastAlertNight: sub.lastAlertNight,
        hoursUntilNightStart,
      });
      if (!decision.send) {
        skip(decision.reason);
        continue;
      }
      if (dryRun) {
        summary.wouldSend++;
        continue;
      }
      if (!(await claimAlertNight(sub.id, outlook.night.nightKey))) {
        skip("already-sent");
        continue;
      }
      const nightLabel = new Intl.DateTimeFormat("en-US", {
        timeZone: sub.timeZone,
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(outlook.night.start);
      const { subject, html } = auroraAlertEmail({
        name: sub.user.name,
        placeName: sub.placeName,
        nightLabel,
        tonightKp: outlook.maxKp!,
        requiredKp: sub.requiredKp,
      });
      const ok = await sendEmail(sub.user.email!, subject, html);
      if (ok) {
        summary.sent++;
      } else {
        await releaseAlertNight(sub.id, outlook.night.nightKey);
        summary.errors.push(`send-failed:${sub.id}`);
        skip("send-failed");
      }
    } catch (err) {
      summary.errors.push(`sub:${sub.id}:${err instanceof Error ? err.message : "unknown"}`);
    }
  }
  return summary;
}
