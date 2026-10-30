// ── trial_waiting: the account-state popup's eligibility rule ───────
// Batch-2 popup #10 (owner's order 2026-10-29 17:10 MDT): a signed-in,
// email-verified user who has NEVER started a trial and whose account
// is at least 3 days old gets ONE popup, ever: "Your Pro trial is
// still waiting." The rule is server-verified (the API route reads the
// real User + Subscription rows) — the session alone cannot prove
// account age or trial history, and this popup's whole value is that
// its claim is true.
//
// "Never started a trial" = no Subscription row exists. Rows are only
// created by the Stripe webhook when a subscription (trial included)
// begins, so a user who trialed and cancelled still HAS a row and is
// correctly excluded; session claims use the same rule
// (lib/billing/trial-prompt: subscriptionStatus "none").
//
// Once-ever is enforced by the caller: on show, the user key is
// written to POPUP_TRIAL_WAITING_SHOWN_KEY and the popup never fires
// for that user again — which is also why this popup is exempt from
// the manager's 7-day frequency cap.

export const TRIAL_WAITING_MIN_ACCOUNT_AGE_MS = 3 * 24 * 60 * 60 * 1000;

export interface TrialWaitingFacts {
  /** Email verified under lib/auth-verification's rule (column set OR
   *  a provider-verified OAuth link — Google sign-ins count). */
  emailVerified: boolean;
  /** Account creation instant (User.createdAt), ms epoch. */
  accountCreatedAtMs: number;
  /** Any Subscription row exists for this user (trial or paid). */
  hasSubscriptionRow: boolean;
  now: number;
}

export function trialWaitingEligible(facts: TrialWaitingFacts): boolean {
  if (!facts.emailVerified) return false;
  if (facts.hasSubscriptionRow) return false;
  if (!Number.isFinite(facts.accountCreatedAtMs) || facts.accountCreatedAtMs <= 0) {
    return false;
  }
  return facts.now - facts.accountCreatedAtMs >= TRIAL_WAITING_MIN_ACCOUNT_AGE_MS;
}
