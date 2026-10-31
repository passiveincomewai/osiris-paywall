/**
 * Gift subscriptions — the launch/kill switch.
 *
 * Mirrors `publicApiEnabled` (src/lib/developer/flag.ts) exactly: a
 * pure function of an env record, true only for an explicit affirmative
 * value, DEFAULT OFF. Gift subscriptions ship dark and stay invisible
 * until the owner enables them, and can be switched off independently
 * afterwards.
 *
 * Kill-switch semantics — with the flag off:
 *   - /gift, /gift/sent and /gift/redeem call notFound(),
 *   - POST /api/gift/checkout and GET/POST /api/gift/redeem return 404,
 *   - giftPublicPaths() returns [] so the sitemap contributes nothing.
 * The Stripe webhook's gift branch is NOT flag-gated: a gift bought
 * while the flag was on must still fulfil if the flag is later turned
 * off mid-flight (the buyer already paid).
 */

export const GIFT_SUBSCRIPTIONS_ENABLED_ENV = "GIFT_SUBSCRIPTIONS_ENABLED";

export function giftSubscriptionsEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const v = env[GIFT_SUBSCRIPTIONS_ENABLED_ENV]?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "yes";
}

/**
 * The public URL paths gift subscriptions contribute when enabled —
 * the single list the sitemap consumes, so flag-off provably
 * contributes nothing. Only the purchase page is listed; /gift/sent
 * and /gift/redeem are transactional (a redemption link is a bearer
 * URL from an email, never a crawl target).
 */
export function giftPublicPaths(
  env: Record<string, string | undefined> = process.env,
): string[] {
  if (!giftSubscriptionsEnabled(env)) return [];
  return ["/gift"];
}
