/**
 * Camera alerts — the checker. Run by /api/cron/camera-alerts
 * every ~15 minutes (vercel.json), it walks the due rules oldest-first
 * and, per rule: fetches the camera's latest still (frameForModel —
 * the same 768px frame the OI analyst gets), asks the vision checker
 * whether the member's condition shows, and lets logic.ts's state
 * machine decide whether this check notifies.
 *
 * Discipline:
 *   - A missing/unreadable still is verdict 'unknown' — it NEVER alerts.
 *   - Only a clear→matches transition (or a match still pending after
 *     the cooldown) notifies; at most one alert per rule per 2 hours.
 *   - Rules whose owner has no alert plan (free — alertCapForTier 0)
 *     are skipped (paused, not deleted) — their lastCheckedAt still
 *     advances so they can't starve the queue's front. Pro and VIP
 *     owners' rules ALL run, however many they hold: the tier cap
 *     gates creating/resuming, never existing rules, so a VIP→Pro
 *     downgrade leaves every rule firing.
 *   - At most MAX_RULES_PER_RUN vision calls per run.
 *
 * Every external system sits behind AlertCheckDeps so tests drive the
 * whole run with fakes — no live AI, mail or frame fetches in tests.
 */
import { db } from "@/lib/db";
import { frameForModel } from "@/lib/vision/attach";
import { appUrl, cameraAlertEmail, sendEmail } from "@/lib/email";
import {
  alertCapForTier,
  decideAfterCheck,
  isRuleDue,
  MAX_RULES_PER_RUN,
  type AlertVerdict,
} from "./logic";
import { getUserTier, type PlanTier } from "./tier";
import { openAiVisionChecker, type VisionChecker } from "./vision";
import { eventImageUrl } from "./image-token";

export interface AlertFrame {
  name: string;
  at: string;
  image: { mime: string; data: string };
}

export interface AlertCheckDeps {
  now: () => Date;
  frame: (cameraId: string) => Promise<AlertFrame | null>;
  vision: VisionChecker;
  tierOf: (userId: string) => Promise<PlanTier>;
  mail: (to: string, subject: string, html: string) => Promise<boolean>;
  userEmail: (userId: string) => Promise<string | null>;
  /** Account alert preferences (items 13/14): quiet hours + channel.
   * Optional so unit tests keep their historical behavior; the live
   * deps always provide it, so production sends are gated. */
  prefsOf?: (userId: string) => Promise<import("@/lib/account/preferences").Preferences>;
}

const liveDeps: AlertCheckDeps = {
  now: () => new Date(),
  frame: (cameraId) => frameForModel(cameraId),
  vision: openAiVisionChecker,
  tierOf: (userId) => getUserTier(userId),
  mail: (to, subject, html) => sendEmail(to, subject, html),
  userEmail: async (userId) => {
    const u = await db.user.findUnique({ where: { id: userId }, select: { email: true } }).catch(() => null);
    return u?.email ?? null;
  },
  prefsOf: async (userId) => {
    const { getPreferences } = await import("@/lib/account/preferences");
    return getPreferences(userId);
  },
};

export interface AlertCheckSummary {
  considered: number;
  checked: number;
  alerted: number;
  skippedNoPlan: number;
  skippedNotDue: number;
}

interface RuleRow {
  id: string;
  userId: string;
  cameraId: string;
  cameraName: string;
  condition: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  active: boolean;
  matchNotified: boolean;
  lastAlertedAt: Date | null;
  lastCheckedAt: Date | null;
}

const EVENT_RETENTION_MS = 30 * 24 * 3600_000;

export async function runAlertChecks(
  overrides: Partial<AlertCheckDeps> = {},
): Promise<AlertCheckSummary> {
  const deps: AlertCheckDeps = { ...liveDeps, ...overrides };
  const now = deps.now();
  const summary: AlertCheckSummary = { considered: 0, checked: 0, alerted: 0, skippedNoPlan: 0, skippedNotDue: 0 };

  // Oldest-checked first so starved rules surface; a generous pool so
  // not-due and no-plan skips don't eat the run's vision budget.
  const candidates = (await db.alertRule.findMany({
    where: { active: true },
    orderBy: [{ lastCheckedAt: { sort: "asc", nulls: "first" } }],
    take: MAX_RULES_PER_RUN * 5,
  })) as RuleRow[];
  summary.considered = candidates.length;

  // One tier resolution per owner per run.
  const tiers = new Map<string, PlanTier>();
  const tierOf = async (userId: string): Promise<PlanTier> => {
    const hit = tiers.get(userId);
    if (hit) return hit;
    const tier = await deps.tierOf(userId).catch(() => "free" as PlanTier);
    tiers.set(userId, tier);
    return tier;
  };

  for (const rule of candidates) {
    if (summary.checked >= MAX_RULES_PER_RUN) break;
    if (!isRuleDue(rule, now.getTime())) {
      summary.skippedNotDue++;
      continue;
    }
    if (alertCapForTier(await tierOf(rule.userId)) === 0) {
      summary.skippedNoPlan++;
      // Advance the stamp so a lapsed rule can't pin the queue front.
      await db.alertRule.update({ where: { id: rule.id }, data: { lastCheckedAt: now } }).catch(() => {});
      continue;
    }

    summary.checked++;
    let verdict: AlertVerdict = "unknown";
    let observation = "No still image was available for this check.";
    let frame: AlertFrame | null = null;
    try {
      frame = await deps.frame(rule.cameraId);
    } catch {
      frame = null;
    }
    if (frame) {
      try {
        const result = await deps.vision({
          imageBase64: frame.image.data,
          mime: frame.image.mime,
          cameraName: rule.cameraName,
          condition: rule.condition,
        });
        verdict = result.verdict;
        observation = result.observation;
      } catch {
        verdict = "unknown";
        observation = "The image check didn't complete this time.";
      }
    }

    const decision = decideAfterCheck(
      { matchNotified: rule.matchNotified, lastAlertedAt: rule.lastAlertedAt },
      verdict,
      now,
    );
    await db.alertRule.update({
      where: { id: rule.id },
      data: {
        lastVerdict: decision.lastVerdict,
        matchNotified: decision.matchNotified,
        lastAlertedAt: decision.lastAlertedAt,
        lastCheckedAt: now,
      },
    });

    if (!decision.notify || !frame) continue;
    summary.alerted++;

    const frameAt = parseFrameAt(frame.at);
    const event = await db.alertEvent.create({
      data: {
        ruleId: rule.id,
        userId: rule.userId,
        verdict: "matches",
        observation,
        frameAt,
        imageJpeg: frame.image.data,
        // An email-only rule's events are history, not inbox alerts:
        // they arrive already read so the unread count stays honest.
        readAt: rule.inAppEnabled ? null : now,
      },
    });

    if (rule.emailEnabled) {
      // User-level alert preferences gate the send (items 13/14):
      // channel choice + quiet hours in the user's own timezone. The
      // event is already recorded above either way — only the email
      // is held. Fail-open on a preferences error: a settings hiccup
      // must never silently swallow a safety-relevant alert.
      let deliver = true;
      if (deps.prefsOf) {
        try {
          const { alertDeliveryDecision } = await import("@/lib/account/delivery");
          const prefs = await deps.prefsOf(rule.userId);
          deliver = alertDeliveryDecision(prefs, "camera", now).email;
        } catch {
          deliver = true;
        }
      }
      const to = deliver ? await deps.userEmail(rule.userId).catch(() => null) : null;
      if (to) {
        const { subject, html } = cameraAlertEmail({
          cameraName: rule.cameraName,
          condition: rule.condition,
          observation,
          frameTimeLabel: frameTimeLabel(frameAt ?? now),
          imageUrl: eventImageUrl(event.id),
          cameraUrl: appUrl(`/?camera=${encodeURIComponent(rule.cameraId)}`),
          alertsUrl: appUrl("/settings/alerts"),
        });
        const sent = await deps.mail(to, subject, html).catch(() => false);
        if (sent) {
          await db.alertEvent.update({ where: { id: event.id }, data: { emailSent: true } }).catch(() => {});
        }
      }
    }
  }

  // Prune the inbox's old photos — events are a feed, not an archive.
  await db.alertEvent
    .deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - EVENT_RETENTION_MS) } } })
    .catch(() => {});

  return summary;
}

function parseFrameAt(at: string): Date | null {
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "3:40 PM UTC" — the email names the checked image's moment, in UTC, plainly. */
export function frameTimeLabel(d: Date): string {
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(d);
  return `${time} UTC`;
}
