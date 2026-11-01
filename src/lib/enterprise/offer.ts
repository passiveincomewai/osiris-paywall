/**
 * The Enterprise offer, in one place: /pricing's enterprise card and the
 * /enterprise dashboard's landing state render these same words, and the
 * copy pins (offer.test.ts) hold them to what the product actually ships.
 * Every line is a delivered capability of the enterprise camera feed —
 * no roadmap claims.
 */
export const ENTERPRISE_OFFER_FEATURES = [
  "Everything in Pro, for your whole team",
  "Custom camera collections — build your own sets from the catalogue",
  "Embeddable live camera player for your website",
  "Private data feed (JSON) of your collections",
  "Optional API access with your own keys",
  "Priority customer support",
  "Integration help — we help you wire the embed or feed into your platform",
];

/** The guarantee sentence exactly as /pricing states it for Pro. */
export const ENTERPRISE_GUARANTEE_LINE =
  "Covered by a 7-day money-back guarantee on your first charge — email us within 7 days of the charge for a full refund, no questions asked.";

/** The published support address (same one /contact and /terms publish). */
export const SUPPORT_EMAIL = "contact@worldeye.app";

export const ENTERPRISE_SUPPORT_LINE = `Questions or integration help: ${SUPPORT_EMAIL}`;
