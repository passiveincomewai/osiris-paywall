/**
 * Member affiliate invite (#13) — pure eligibility + the threshold.
 *
 * The bar (stated in the build report): a signed-in user who is NOT
 * already an affiliate qualifies when their own PageView record shows
 * genuinely heavy, habitual use over the last 30 days —
 *   ≥ 30 camera opens in 30 days, on ≥ 5 distinct active days.
 * The opens figure is ~daily-level use sustained over a month; the
 * distinct-days floor keeps a single binge session from qualifying.
 * Both numbers come straight from PageView rows stamped with the
 * user's id (anonymous rows carry no userId and never count).
 *
 * Once per user, and dismissal is permanent for that user — enforced
 * by the caller with per-user storage keys (the same device-bound
 * approach as trial-waiting; stated in the report).
 */

export const AFFILIATE_INVITE_MIN_OPENS_30D = 30;
export const AFFILIATE_INVITE_MIN_ACTIVE_DAYS_30D = 5;

export interface AffiliateInviteFacts {
  /** An AffiliateProfile row exists for this user (any status). */
  hasAffiliateProfile: boolean;
  /** camera_open PageView rows for this user in the last 30 days. */
  cameraOpens30d: number;
  /** Distinct UTC days with any PageView for this user in 30 days. */
  activeDays30d: number;
}

export function affiliateInviteEligible(facts: AffiliateInviteFacts): boolean {
  if (facts.hasAffiliateProfile) return false;
  return (
    facts.cameraOpens30d >= AFFILIATE_INVITE_MIN_OPENS_30D &&
    facts.activeDays30d >= AFFILIATE_INVITE_MIN_ACTIVE_DAYS_30D
  );
}
