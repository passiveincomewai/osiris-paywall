// ── Past-due banner: pure visibility logic ────────────────────────────
// Kept free of server imports (no db / Stripe / mailer) so the client
// banner component can share it and unit tests can pin it directly.
//
// The rule: a signed-in user whose subscription row is past_due sees the
// banner. Dismissal is PER INVOICE — the client stores the token of the
// banner it dismissed (the open invoice's id, or "none" for the generic
// no-invoice form); a NEW failed invoice carries a different token and
// shows the banner again.

/** The dismissal token for a banner instance: invoice id, or "none". */
export function pastDueBannerToken(invoiceId: string | null | undefined): string {
  return invoiceId ?? "none";
}

/** localStorage key the dismissal token is stored under. */
export const PAST_DUE_BANNER_STORAGE_KEY = "worldeye:past-due-banner-dismissed";

export interface PastDueBannerVisibility {
  /** The subscription row's status (only "past_due" can ever show). */
  status: string | null | undefined;
  /** The open invoice the banner points at, or null for the generic form. */
  invoiceId: string | null;
  /** The token the user previously dismissed, or null if never. */
  dismissedToken: string | null;
}

export function shouldShowPastDueBanner(input: PastDueBannerVisibility): boolean {
  if (input.status !== "past_due") return false;
  return input.dismissedToken !== pastDueBannerToken(input.invoiceId);
}
