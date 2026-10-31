/**
 * WorldEye public developer API — the launch/kill switch.
 *
 * Mirrors `fraudRadarEnabled` (src/lib/fraud-radar/flag.ts) exactly: a
 * pure function of an env record, true only for an explicit affirmative
 * value, DEFAULT OFF. The public API ships dark and stays invisible
 * until the owner enables it, and can be switched off independently
 * afterwards.
 *
 * Kill-switch semantics — with the flag off:
 *   - every /api/v1 route except the pre-existing Enterprise collections
 *     door returns 404 (the door is a separate, older product and is
 *     NOT behind this flag),
 *   - /api/v1/mcp returns 404,
 *   - the API-key management routes return 404 and the Account Settings
 *     API-keys page calls notFound(),
 *   - /developers calls notFound() and developerPublicPaths() returns
 *     [] so the sitemap contributes nothing.
 */

export const PUBLIC_API_ENABLED_ENV = "PUBLIC_API_ENABLED";

export function publicApiEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const v = env[PUBLIC_API_ENABLED_ENV]?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "yes";
}

/**
 * The public URL paths the developer platform contributes when enabled
 * — the single list the sitemap consumes, so flag-off provably
 * contributes nothing.
 */
export function developerPublicPaths(
  env: Record<string, string | undefined> = process.env,
): string[] {
  if (!publicApiEnabled(env)) return [];
  return ["/developers"];
}
