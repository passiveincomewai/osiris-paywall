// Canonical base URL for user-facing absolute links — activation/reset
// emails, checkout success/cancel returns, share links, redirects.
//
// Single source of truth. Do NOT rebuild this from VERCEL_URL elsewhere:
// on Vercel, VERCEL_URL is always the project's *.vercel.app deployment
// domain (e.g. osiris-lime.vercel.app), never the custom domain — using
// it in production sent users to the wrong domain (2026-10-12 bug).

export const PRODUCTION_APP_URL = "https://worldeye.app";

type EnvLike = Record<string, string | undefined>;

/**
 * Resolution order:
 *   1. NEXT_PUBLIC_APP_URL — explicit override, wins in any environment.
 *   2. https://worldeye.app in production (NODE_ENV=production or
 *      VERCEL_ENV=production) — the custom domain beats VERCEL_URL.
 *   3. https://$VERCEL_URL — preview/dev deployments keep their own URL.
 *   4. http://localhost:3000 — local development.
 *
 * `env` is injectable for tests; callers use the default (process.env).
 */
export function appBaseUrl(env: EnvLike = process.env): string {
  const explicit = env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  if (env.NODE_ENV === "production" || env.VERCEL_ENV === "production") {
    return PRODUCTION_APP_URL;
  }
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  return "http://localhost:3000";
}
