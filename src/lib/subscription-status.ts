// The session's subscriptionStatus mapping, as a pure function (used by
// resolveSubscriptionStatus in src/auth.ts). Extracted so the mapping is
// pinned by tests without importing the NextAuth module.
//
// Rules (unchanged from the original inline implementation):
//  - "active" or "trialing" with the current period still in the future
//    folds to "active" — trialing counts as full Pro until the trial ends.
//  - Anything else returns the row's raw status (past_due, canceled, an
//    active row whose period has lapsed, ...) or "none" when the user has
//    no subscription row at all. Callers gate on === "active" exactly.
export function subscriptionStatusFromRow(
  sub: { status: string; currentPeriodEnd: Date } | null | undefined,
  now: Date = new Date(),
): string {
  if (
    sub &&
    (sub.status === "active" || sub.status === "trialing") &&
    sub.currentPeriodEnd > now
  ) {
    return "active";
  }
  return sub?.status ?? "none";
}
