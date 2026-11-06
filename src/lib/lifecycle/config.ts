// ── Lifecycle email configuration ────────────────────────────────────
// Every knob the lifecycle engine (src/lib/lifecycle) runs on, in one
// place. Windows and caps are constants (they are product policy, and
// the tests pin them); the discount offer is replaceable config — the
// welcome/retargeting emails must never hardcode a permanent code,
// because promotion codes expire. When the configured offer lapses the
// engine sends the same emails WITHOUT a code rather than printing a
// dead one.

/** Owner + test inboxes: never lifecycle recipients, whatever the data says. */
export const EXCLUDED_EMAILS: ReadonlySet<string> = new Set([
  "jamesonlythgoe@gmail.com",
  "passiveincomewai@gmail.com",
  "xfueltests@gmail.com",
  "xfuelmarketing@gmail.com",
  "theboodirectory@gmail.com",
]);

export function isExcludedEmail(email: string | null | undefined): boolean {
  if (!email) return true; // no address → nothing to send to, treated as excluded
  return EXCLUDED_EMAILS.has(email.trim().toLowerCase());
}

// ── Send discipline ───────────────────────────────────────────────────

/** At most one MARKETING email per user in any rolling 48h window. */
export const MARKETING_CAP_WINDOW_MS = 48 * 3600_000;
export const MARKETING_CAP_MAX = 1;

// ── Trigger windows ───────────────────────────────────────────────────

export const HOUR_MS = 3600_000;
export const DAY_MS = 24 * HOUR_MS;

/** Welcome: near-instant (owner order 2026-10-27 — the coupon code
 * should land while signup intent is hot); two minutes still lets the
 * verify email own minute zero. The engine cron runs every 15 min, so
 * the welcome lands within ~15 min of signup. Not stale: 48h cap. */
export const WELCOME_MIN_AGE_MS = 2 * 60_000;
export const WELCOME_MAX_AGE_MS = 48 * HOUR_MS;

/** Interest follow-up: give them two days to convert on their own first. */
export const INTEREST_MIN_ACCOUNT_AGE_MS = 48 * HOUR_MS;
export const INTEREST_ACTIVITY_WINDOW_MS = 14 * DAY_MS;

/** Pricing retargeting: recent pricing engagement, no recent checkout attempt. */
export const RETARGET_PRICING_WINDOW_MS = 7 * DAY_MS;
export const RETARGET_ATTEMPT_QUIET_MS = 30 * DAY_MS;

/**
 * Checkout retargeting (the code-carrying second touch): the existing
 * abandoned-cart cron sends the first, code-less reminder ~3h after an
 * attempt. This one fires only after that reminder has had 48h to work.
 */
export const RETARGET_CHECKOUT_MIN_ATTEMPT_AGE_MS = 72 * HOUR_MS;
export const RETARGET_CHECKOUT_MIN_REMIND_GAP_MS = 48 * HOUR_MS;

/** Trial started: the DB/Stripe row must be fresh — no backfill blasts. */
export const TRIAL_STARTED_WINDOW_MS = 24 * HOUR_MS;

/** Trial win-back: within a week of the trial dying unconverted. */
export const TRIAL_WINBACK_WINDOW_MS = 7 * DAY_MS;

/** Second trial win-back: ONE later touch in the 28–38 day band after
 * the trial died. The first win-back owns days 0–7, so the two bands
 * can never overlap; the once-only log is the second lock. */
export const TRIAL_WINBACK2_MIN_AGE_MS = 28 * DAY_MS;
export const TRIAL_WINBACK2_MAX_AGE_MS = 38 * DAY_MS;

/** Trialist engagement track (conversion lever #1, owner-approved
 * 2026-11-05): touches DURING a live trial — the onboarding drip
 * covers free accounts and the win-backs own dead trials; this owns
 * the living middle. Track kind derives from the sub's REAL trial
 * span (trial start → trial end): ≤5d = "short" (the weekly 3-day
 * trial), else "long" (the 10-day trials). Bands are wide and
 * disjoint per codebase discipline; the 48h marketing cap spaces the
 * actual sends inside them (deliver() skips on cap WITHOUT logging,
 * so a cap-blocked touch lands later inside its band).
 * Long track, ages measured from trial start: day-1 recap
 * [24h, 4d) · day-2 CTA [48h, 6d) · day-5 feature [5d, 8d).
 * Pre-charge recap (both tracks): fires when the trial ends in
 * (24h, 48h] — disjoint from trial-reminders' final-24h
 * transactional window by construction. On the short track it is the
 * ONLY touch, and it additionally requires trial age ≥48h with ≥6h
 * of trial still remaining. */
export const TRIAL_TRACK_SHORT_MAX_SPAN_MS = 5 * DAY_MS;
export const TRIAL_DAY1_RECAP_MIN_AGE_MS = 24 * HOUR_MS;
export const TRIAL_DAY1_RECAP_MAX_AGE_MS = 4 * DAY_MS;
export const TRIAL_DAY2_CTA_MIN_AGE_MS = 48 * HOUR_MS;
export const TRIAL_DAY2_CTA_MAX_AGE_MS = 6 * DAY_MS;
export const TRIAL_DAY5_FEATURE_MIN_AGE_MS = 5 * DAY_MS;
export const TRIAL_DAY5_FEATURE_MAX_AGE_MS = 8 * DAY_MS;
export const TRIAL_PRECHARGE_MIN_UNTIL_END_MS = 24 * HOUR_MS;
export const TRIAL_PRECHARGE_MAX_UNTIL_END_MS = 48 * HOUR_MS;
export const TRIAL_PRECHARGE_SHORT_MIN_AGE_MS = 48 * HOUR_MS;
export const TRIAL_PRECHARGE_SHORT_MIN_REMAINING_MS = 6 * HOUR_MS;

/** Annual renewal advance notice: inside the final week before an
 * annual period ends and the card is charged for another year. The
 * trial-ending email covers only a trial's FIRST charge; this covers
 * every annual renewal after it. */
export const RENEWAL_NOTICE_WINDOW_MS = 7 * DAY_MS;

/** Paid subscription ended (a real paid period lapsed or a
 * cancel-at-period-end reached its end — NOT a trial death, which the
 * trial win-back owns) → win-back inside the first week after the end. */
export const SUBSCRIPTION_ENDED_WINBACK_WINDOW_MS = 7 * DAY_MS;

/** Onboarding drip (verified, never-paid free accounts): a day-2
 * "get more from your account" email in the 2–5 day age band, then a
 * day-5 trial invitation in the 5–9 day band. Bands are disjoint and
 * each template is once-only per user. */
export const ONBOARDING_DAY2_MIN_AGE_MS = 2 * DAY_MS;
export const ONBOARDING_DAY2_MAX_AGE_MS = 5 * DAY_MS;
export const ONBOARDING_DAY5_MIN_AGE_MS = 5 * DAY_MS;
export const ONBOARDING_DAY5_MAX_AGE_MS = 9 * DAY_MS;

/** Inactive re-engagement (free accounts): quiet = no signed-in page
 * view since max(account creation, last view). Stage 1 in the 14–21
 * day quiet band, stage 2 in the 30–45 day band. Two touches, ever. */
export const INACTIVE_STAGE1_MIN_MS = 14 * DAY_MS;
export const INACTIVE_STAGE1_MAX_MS = 21 * DAY_MS;
export const INACTIVE_STAGE2_MIN_MS = 30 * DAY_MS;
export const INACTIVE_STAGE2_MAX_MS = 45 * DAY_MS;

/** Exit survey: trial died unconverted 3–5 days ago. Lands after the
 * first win-back touch (which fires at day 0–1) and asks ONE question;
 * answers come back through the site's contact form (owner-alerted). */
export const EXIT_SURVEY_MIN_AGE_MS = 3 * DAY_MS;
export const EXIT_SURVEY_MAX_AGE_MS = 5 * DAY_MS;

/** Verification reminder (round 2, R1): unverified accounts, 1–30 days
 * old. The benefit is the ladder's verify rung — verifying grants
 * VERIFY_UNLOCK_OPENS (+5) more camera opens (lib/camera-ladder). */
export const VERIFICATION_REMINDER_MIN_AGE_MS = 1 * DAY_MS;
export const VERIFICATION_REMINDER_MAX_AGE_MS = 30 * DAY_MS;

/** Affiliate notifications: evaluated promptly, never archaeology. */
export const AFFILIATE_SIGNUP_WINDOW_MS = 24 * HOUR_MS;
export const AFFILIATE_COMMISSION_WINDOW_MS = 7 * DAY_MS;

/** (f) Region interest: trailing window a user's country activity is
 * measured over, and the concrete "heavy time on one region" bar — ALL
 * of these must hold for the user's top country (see region.ts):
 * at least REGION_MIN_OPENS camera opens, at least REGION_MIN_TOUCHES
 * opens + country-page views combined, at least REGION_MIN_DWELL_SEC
 * seconds of dwell on that country's pages, and the top country must
 * hold at least REGION_MIN_SHARE of the user's region-attributed opens
 * (a focused interest, not a world tour). */
export const REGION_WINDOW_MS = 14 * DAY_MS;
export const REGION_MIN_OPENS = 8;
export const REGION_MIN_TOUCHES = 12;
export const REGION_MIN_DWELL_SEC = 180;
export const REGION_MIN_SHARE = 0.5;

// ── Discount offer (replaceable config) ───────────────────────────────

export interface DiscountOffer {
  /** The code string the user types at checkout, e.g. "EARLY50". */
  code: string;
  /** Human label, e.g. "50% off your first payment". */
  label: string;
  /** When the promotion stops redeeming; null = no known expiry. */
  expiresAt: Date | null;
}

/**
 * The offer lifecycle emails may print right now. Defaults carry the
 * EARLY50 promotion the owner has been sending by hand (50% off, max 50
 * redemptions, created 2026-10-20, expires Sun 2026-10-25 23:59 MDT =
 * 2026-10-26T05:59:00Z). Override via env when a campaign replaces it:
 *   LIFECYCLE_DISCOUNT_CODE, LIFECYCLE_DISCOUNT_LABEL,
 *   LIFECYCLE_DISCOUNT_EXPIRES_AT (ISO; empty string = no expiry).
 * Returns null when the configured offer has expired — callers render
 * the no-code variant instead of advertising a dead code.
 */
export function currentDiscountOffer(
  env: Record<string, string | undefined> = process.env,
  now: Date = new Date(),
): DiscountOffer | null {
  const code = (env.LIFECYCLE_DISCOUNT_CODE ?? "EARLY50").trim();
  if (!code) return null;
  const label = (env.LIFECYCLE_DISCOUNT_LABEL ?? "50% off your first payment").trim();
  const rawExpiry = env.LIFECYCLE_DISCOUNT_EXPIRES_AT ?? "2026-10-26T05:59:00.000Z";
  const expiresAt = rawExpiry.trim() === "" ? null : new Date(rawExpiry);
  if (expiresAt && (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime())) {
    return null;
  }
  return { code, label, expiresAt };
}
