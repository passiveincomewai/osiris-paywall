// ── Post-signup account popup (newsletter → account conversion test) ──
// Jameson's order, 2026-10-29: after EVERY successful newsletter
// signup, offer the subscriber a free WorldEye account with a
// "Continue with Google" popup — a NEW surface alongside /signin,
// built to test whether the moment converts better than the sign-in
// page alone. This module is the decision half of
// components/NewsletterAccountPopup.tsx; the trigger half is one event
// dispatch in components/NewsletterForm (the form every newsletter
// surface shares), so footer, capture cards and the ladder email step
// all feed the same popup.
//
// Rules:
//   • Fires only off a completed subscribe — never on page load.
//   • At most once per browser session: the shown flag lives in
//     sessionStorage, and dismissing is permanent for that session.
//   • Never for signed-in users (the host checks /api/auth/session
//     before showing, the same way the affiliate surfaces do).
//   • The popup never blocks the form's own success state — it is a
//     separate overlay that arrives after a short delay.
//
// Measurement (PageView.event via /api/analytics/track, the same store
// ladder_prompt_shown lands in): popup_shown, popup_google_clicked,
// popup_dismissed — each with the surface as the detail token. The
// funnel's last step is server-side: the Google button also sets the
// we_acq_src cookie (the we_utm pattern — set client-side, read
// server-side), and src/auth.ts stamps a "newsletter_popup_signup"
// PageView row from events.createUser when an account is actually
// created under it. No marker exists for accounts that were merely
// signed in again — createUser fires only on creation.

import type { StorageLike } from "./capture";

export type { StorageLike } from "./capture";

/** Window event NewsletterForm dispatches on a successful subscribe. */
export const NEWSLETTER_SUBSCRIBED_EVENT = "worldeye:newsletter-subscribed";

/** Analytics event names (ingest accepts [a-z0-9_], event+detail ≤80 chars). */
export const POPUP_SHOWN_EVENT = "popup_shown";
export const POPUP_GOOGLE_CLICKED_EVENT = "popup_google_clicked";
export const POPUP_DISMISSED_EVENT = "popup_dismissed";
/** Server-stamped event for an account created via the popup (auth.ts). */
export const POPUP_SIGNUP_EVENT = "newsletter_popup_signup";

/** sessionStorage flag: the popup has been shown this session. */
export const NEWSLETTER_POPUP_STORAGE_KEY = "worldeye.newsletterPopup";

/** First-party attribution cookie (mirrors the we_utm pattern). */
export const ACQUISITION_COOKIE = "we_acq_src";
export const NEWSLETTER_POPUP_SOURCE = "newsletter_popup";

/** Pause between the form's success state and the popup, so the
 *  "You're subscribed" feedback lands first. */
export const POPUP_DELAY_MS = 900;

/** Browser sessionStorage, or null where it is blocked/unavailable. */
export function browserSessionStorage(): StorageLike | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function readPopupSeen(storage: StorageLike | null): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(NEWSLETTER_POPUP_STORAGE_KEY) === "shown";
  } catch {
    return false;
  }
}

/** Persist the shown flag. Returns false when storage refused. */
export function markPopupSeen(storage: StorageLike | null): boolean {
  if (!storage) return false;
  try {
    storage.setItem(NEWSLETTER_POPUP_STORAGE_KEY, "shown");
    return true;
  } catch {
    return false;
  }
}

/** The whole show/don't-show decision in one place (host + tests). */
export function shouldOfferPopup(input: { seen: boolean; signedIn: boolean }): boolean {
  return !input.seen && !input.signedIn;
}

/**
 * Analytics detail token for the subscribe surface's `source` tag:
 * one machine token ([a-z0-9_], ≤24 chars) per surface, mirroring
 * captureDetailFor's tokens for the surfaces that have placements.
 */
export function popupDetailFor(source: string | undefined | null): string {
  switch (source) {
    case "footer":
      return "footer";
    case "camera-first-open":
      return "camera";
    case "pricing-recovery":
      return "pricing";
    case "ladder-email-unlock":
      return "ladder";
    case "page-inline":
      return "page";
    default: {
      const cleaned = (source ?? "").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
      return cleaned.length > 0 ? cleaned : "site";
    }
  }
}

/** The document.cookie assignment the Google button makes before signIn. */
export function buildAcquisitionCookie(maxAgeSec = 1800): string {
  return `${ACQUISITION_COOKIE}=${NEWSLETTER_POPUP_SOURCE}; Max-Age=${maxAgeSec}; Path=/; SameSite=Lax`;
}
