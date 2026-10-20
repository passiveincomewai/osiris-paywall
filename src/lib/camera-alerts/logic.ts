/**
 * VIP camera alerts — the pure rules. No I/O lives here: the API routes
 * and the cron checker both call these functions so the cap, the
 * cooldown and the alert-on-change state machine can never drift
 * between "what the UI promises" and "what the checker does".
 */

/** VIP members watch up to this many cameras at once. */
export const MAX_ACTIVE_ALERT_RULES = 10;

/** The refusal a member sees when the cap is full — one string, everywhere. */
export const CAP_MESSAGE =
  "VIP alerts are limited to 10 active cameras — pause or remove one to add another.";

/** A rule is re-checked at most this often. */
export const ALERT_CHECK_INTERVAL_MS = 15 * 60_000;

/** Even if a condition flaps, a rule never alerts twice inside this window. */
export const ALERT_COOLDOWN_MS = 2 * 3600_000;

/** Cost discipline: at most this many rules per cron run (oldest-checked first). */
export const MAX_RULES_PER_RUN = 40;

/** The cron cadence wired in vercel.json — keep the two in step. */
export const ALERT_CRON_SCHEDULE = "*/15 * * * *";

export const CONDITION_MIN_LENGTH = 3;
export const CONDITION_MAX_LENGTH = 140;

/** What the last check concluded. "unknown" never alerts, by design. */
export type AlertVerdict = "matches" | "clear" | "unknown";

export function validateCondition(
  raw: unknown,
): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof raw !== "string") return { ok: false, error: "Describe what to watch for." };
  const value = raw.trim().replace(/\s+/g, " ");
  if (value.length < CONDITION_MIN_LENGTH) {
    return { ok: false, error: "The condition is too short — a few words, like “snow on the road”." };
  }
  if (value.length > CONDITION_MAX_LENGTH) {
    return { ok: false, error: `Keep the condition under ${CONDITION_MAX_LENGTH} characters.` };
  }
  return { ok: true, value };
}

/** Channels: at least one must be on, or the rule could never tell anyone. */
export function validateChannels(input: {
  emailEnabled?: unknown;
  inAppEnabled?: unknown;
}): { ok: true; emailEnabled: boolean; inAppEnabled: boolean } | { ok: false; error: string } {
  const emailEnabled = input.emailEnabled === undefined ? true : input.emailEnabled === true;
  const inAppEnabled = input.inAppEnabled === undefined ? true : input.inAppEnabled === true;
  if (!emailEnabled && !inAppEnabled) {
    return { ok: false, error: "Turn on at least one way to be told — email or in-app." };
  }
  return { ok: true, emailEnabled, inAppEnabled };
}

/** Creating or resuming a rule is refused when the active count is at the cap. */
export function activeCapReached(activeCount: number): boolean {
  return activeCount >= MAX_ACTIVE_ALERT_RULES;
}

/** Due = active and not checked inside the current interval window. */
export function isRuleDue(
  rule: { active: boolean; lastCheckedAt: Date | null },
  nowMs: number,
): boolean {
  if (!rule.active) return false;
  if (!rule.lastCheckedAt) return true;
  return nowMs - rule.lastCheckedAt.getTime() >= ALERT_CHECK_INTERVAL_MS;
}

export interface EpisodeState {
  /** Has the current matching episode already been notified? */
  matchNotified: boolean;
  lastAlertedAt: Date | null;
}

export interface EpisodeDecision extends EpisodeState {
  /** Send a notification for this check. */
  notify: boolean;
  /** The verdict to store on the rule. */
  lastVerdict: AlertVerdict;
}

/**
 * The alert-on-change state machine, one check at a time:
 *
 *   matches + episode not yet notified + cooldown satisfied → NOTIFY
 *   matches + already notified                               → stay quiet
 *   matches + notified=false but inside the cooldown         → stay quiet
 *     this check, but the episode stays un-notified, so the next
 *     check after the cooldown delivers it (a flap never spams,
 *     and a real match is never silently swallowed).
 *   clear                                                    → episode ends
 *   unknown (no still / unreadable still)                    → nothing
 *     changes: it never alerts and never ends an episode.
 */
export function decideAfterCheck(
  prev: EpisodeState,
  verdict: AlertVerdict,
  now: Date,
): EpisodeDecision {
  if (verdict === "unknown") {
    return { notify: false, matchNotified: prev.matchNotified, lastAlertedAt: prev.lastAlertedAt, lastVerdict: "unknown" };
  }
  if (verdict === "clear") {
    return { notify: false, matchNotified: false, lastAlertedAt: prev.lastAlertedAt, lastVerdict: "clear" };
  }
  // verdict === "matches"
  if (prev.matchNotified) {
    return { notify: false, matchNotified: true, lastAlertedAt: prev.lastAlertedAt, lastVerdict: "matches" };
  }
  const cooledDown =
    !prev.lastAlertedAt || now.getTime() - prev.lastAlertedAt.getTime() >= ALERT_COOLDOWN_MS;
  if (!cooledDown) {
    return { notify: false, matchNotified: false, lastAlertedAt: prev.lastAlertedAt, lastVerdict: "matches" };
  }
  return { notify: true, matchNotified: true, lastAlertedAt: now, lastVerdict: "matches" };
}
