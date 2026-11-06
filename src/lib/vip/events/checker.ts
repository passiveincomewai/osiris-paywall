/**
 * Event-alert checker — the cron's engine (every ~15 min).
 *
 * Mirrors the camera-alert checker contract:
 *  - Rules whose owner is no longer VIP are SKIPPED (paused, never
 *    deleted); they resume on their own if VIP returns.
 *  - Every firing writes an EventAlertEvent; (ruleId, dedupeKey) is
 *    unique, so re-checks and overlapping runs are idempotent.
 *  - emailEnabled sends via the house mailer; inAppEnabled=false
 *    records the event already-read so it never enters the inbox.
 *  - Feeds fail soft: an upstream outage means no alerts this cycle.
 */
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getUserTier } from "@/lib/vip/tier";
import { getLaunchesPayload } from "@/lib/launches/server";
import { fetchIssTle, fetchQuakes } from "./feeds";
import { eventAlertEmail } from "./email";
import {
  computePasses,
  issEvent,
  launchEvent,
  launchWindowsEntered,
  nextAlertablePass,
  quakeEvent,
  quakeMatches,
  tlePropagator,
  validateEventConfig,
  type EventDraft,
  type IssConfig,
  type LaunchConfig,
  type LaunchInput,
  type QuakeConfig,
} from "./logic";

export interface CheckerSummary {
  rules: number;
  checked: number;
  skippedNotVip: number;
  eventsCreated: number;
  emailsSent: number;
}

interface RuleRow {
  id: string;
  userId: string;
  kind: string;
  placeId: string | null;
  config: unknown;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  lastCheckedAt: Date | null;
  createdAt: Date;
  place: { name: string; lat: number; lng: number; radiusKm: number } | null;
  user: { email: string | null; name: string | null };
}

async function fireEvent(
  rule: RuleRow,
  draft: EventDraft,
  summary: CheckerSummary,
): Promise<void> {
  let event: { id: string } | null = null;
  try {
    event = await db.eventAlertEvent.create({
      data: {
        ruleId: rule.id,
        userId: rule.userId,
        kind: rule.kind,
        title: draft.title,
        body: draft.body,
        data: draft.data as object,
        dedupeKey: draft.dedupeKey,
        readAt: rule.inAppEnabled ? null : new Date(),
      },
      select: { id: true },
    });
  } catch {
    // Unique (ruleId, dedupeKey) — this event already fired.
    return;
  }
  summary.eventsCreated++;
  if (rule.emailEnabled) {
    // User-level alert preferences gate the send (items 13/14):
    // event channel + quiet hours in the user's timezone. The
    // decision is computed ONCE for both channels. Fail-open on a
    // preferences error for email, fail-closed for push, same as the
    // camera-alert checker.
    let deliver = true;
    let deliverPush = false;
    try {
      const { getPreferences } = await import("@/lib/account/preferences");
      const { alertDeliveryDecision } = await import("@/lib/account/delivery");
      const prefs = await getPreferences(rule.userId);
      const decision = alertDeliveryDecision(prefs, "event", new Date());
      deliver = decision.email;
      deliverPush = decision.push;
    } catch {
      deliver = true;
      deliverPush = false;
    }
    if (deliverPush) {
      const { sendPushToUser } = await import("@/lib/push/send");
      const pushed = await sendPushToUser(rule.userId, {
        title: draft.title,
        body: draft.body,
        url: "/settings/alerts",
        tag: `event-alert-${rule.id}`,
      }).catch(() => null);
      if (pushed && pushed.accepted > 0) {
        await db.eventAlertEvent
          .update({ where: { id: event.id }, data: { pushSent: true } })
          .catch(() => undefined);
      }
    }
    if (!deliver || !rule.user.email) return;
    const mail = eventAlertEmail({ title: draft.title, body: draft.body });
    const sent = await sendEmail(rule.user.email, mail.subject, mail.html).catch(() => false);
    if (sent) {
      summary.emailsSent++;
      await db.eventAlertEvent
        .update({ where: { id: event.id }, data: { emailSent: true } })
        .catch(() => undefined);
    }
  }
}

export async function runEventAlertChecks(now: Date = new Date()): Promise<CheckerSummary> {
  const summary: CheckerSummary = {
    rules: 0,
    checked: 0,
    skippedNotVip: 0,
    eventsCreated: 0,
    emailsSent: 0,
  };
  const rules = (await db.eventAlertRule.findMany({
    where: { active: true },
    include: {
      place: { select: { name: true, lat: true, lng: true, radiusKm: true } },
      user: { select: { email: true, name: true } },
    },
    orderBy: { lastCheckedAt: "asc" },
    take: 500,
  })) as unknown as RuleRow[];
  summary.rules = rules.length;
  if (!rules.length) return summary;

  // Tier per owner, resolved once (fresh from the subscription row).
  const owners = [...new Set(rules.map((r) => r.userId))];
  const tiers = new Map<string, boolean>();
  for (const owner of owners) {
    tiers.set(owner, (await getUserTier(owner)) === "vip");
  }
  const live = rules.filter((r) => {
    if (tiers.get(r.userId)) return true;
    summary.skippedNotVip++;
    return false;
  });
  if (!live.length) return summary;

  const kinds = new Set(live.map((r) => r.kind));
  const nowMs = now.getTime();
  const quakes = kinds.has("quake") ? await fetchQuakes() : [];
  const launches: LaunchInput[] = kinds.has("launch")
    ? (await getLaunchesPayload().catch(() => null))?.upcoming.map((l) => ({
        id: l.id,
        name: l.name,
        netMs: l.net ? Date.parse(l.net) : null,
        statusName: l.statusName,
        providerName: l.providerName,
        padLocation: l.padLocation,
      })) ?? []
    : [];
  const issTle = kinds.has("iss") ? await fetchIssTle(nowMs) : null;

  for (const rule of live) {
    const checked = validateEventConfig(rule.kind, rule.config);
    if (!checked.ok) continue;
    summary.checked++;
    try {
      if (rule.kind === "quake") {
        const config = checked.config as QuakeConfig;
        const since = (rule.lastCheckedAt ?? rule.createdAt).getTime() - 5 * 60_000;
        for (const q of quakes) {
          if (q.timeMs < since) continue;
          if (!quakeMatches(config, q, rule.place)) continue;
          await fireEvent(rule, quakeEvent(q, rule.place?.name ?? null), summary);
        }
      } else if (rule.kind === "launch") {
        const config = checked.config as LaunchConfig;
        for (const l of launches) {
          for (const lead of launchWindowsEntered(config, l, nowMs)) {
            await fireEvent(rule, launchEvent(l, lead), summary);
          }
        }
      } else if (rule.kind === "iss" && rule.place && issTle) {
        const config = checked.config as IssConfig;
        const passes = computePasses(
          tlePropagator(issTle.line1, issTle.line2),
          rule.place,
          nowMs - 60 * 60_000,
          nowMs + 48 * 3_600_000,
          config.minElevationDeg,
        );
        const pass = nextAlertablePass(passes, nowMs, config.leadHours);
        if (pass) await fireEvent(rule, issEvent(pass, rule.place.name), summary);
      }
    } catch {
      // One bad rule never stops the run (camera-checker contract).
    }
    await db.eventAlertRule
      .update({ where: { id: rule.id }, data: { lastCheckedAt: now } })
      .catch(() => undefined);
  }
  return summary;
}
