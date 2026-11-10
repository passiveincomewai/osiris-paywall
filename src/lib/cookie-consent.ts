// Cookie consent state for the two outside tools that may only use
// cookies with a visitor's say-so: Meta's pixel (components/
// MetaPixel.tsx) and Microsoft Clarity (components/MicrosoftClarity.tsx).
// The banner itself is components/CookieConsent.tsx; the footer's
// "Cookie settings" link (components/CookieSettingsLink.tsx) reopens it
// through CONSENT_RESET_EVENT.
//
// The choice lives in one first-party cookie so every page agrees on
// it:
//
//   we_cookie_consent = accepted | declined   (12 months, path=/)
//
// No stored choice means "not asked yet": Clarity is told consent is
// denied (its cookies stay off) and the pixel does not load, until the
// visitor accepts.

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

export const CONSENT_COOKIE_NAME = "we_cookie_consent";
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 12 months
export const CONSENT_RESET_EVENT = "we:cookie-consent-reset";
export const CONSENT_CHANGED_EVENT = "we:cookie-consent-changed";

export type ConsentChoice = "accepted" | "declined";

/** Read the stored choice out of a Cookie header / document.cookie
 *  string. An absent cookie or an unrecognised value is "no choice
 *  yet" (null). */
export function parseConsentCookie(cookieString: string): ConsentChoice | null {
  for (const part of cookieString.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== CONSENT_COOKIE_NAME) continue;
    const value = part.slice(eq + 1).trim();
    return value === "accepted" || value === "declined" ? value : null;
  }
  return null;
}

/** The cookie string that stores a choice for 12 months. Assigned to
 *  document.cookie by the banner. */
export function serializeConsentCookie(choice: ConsentChoice): string {
  return `${CONSENT_COOKIE_NAME}=${choice}; Max-Age=${CONSENT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
}

/** The cookie string that forgets the stored choice. */
export function serializeConsentClear(): string {
  return `${CONSENT_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
}

/** The Clarity Consent API (v2) signal for a choice — and for no
 *  choice yet, which is denied until the visitor says otherwise. */
export function clarityConsentV2Args(choice: ConsentChoice | null): {
  ad_Storage: "granted" | "denied";
  analytics_Storage: "granted" | "denied";
} {
  const state = choice === "accepted" ? "granted" : "denied";
  return { ad_Storage: state, analytics_Storage: state };
}
