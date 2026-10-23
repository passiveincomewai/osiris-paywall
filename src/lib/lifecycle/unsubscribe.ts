// ── Marketing unsubscribe tokens ─────────────────────────────────────
// Every marketing lifecycle email carries an unsubscribe link:
//   /api/email/unsubscribe?u=<userId>&t=<token>
// The token is an HMAC of the user id under the Auth.js secret — no
// extra table, nothing guessable, and the route flips User.emailOptOut.
// If no secret is configured the helpers return null and templates
// simply omit the link (the engine surfaces that in its run summary —
// in production AUTH_SECRET is always set for Auth.js).

import { createHmac, timingSafeEqual } from "node:crypto";

export function unsubscribeSecret(
  env: Record<string, string | undefined> = process.env,
): string | null {
  return env.AUTH_SECRET ?? env.NEXTAUTH_SECRET ?? null;
}

export function signUnsubscribeToken(userId: string, secret: string): string {
  return createHmac("sha256", secret).update(`lifecycle-unsub:${userId}`).digest("base64url");
}

export function verifyUnsubscribeToken(
  userId: string,
  token: string | null | undefined,
  secret: string | null,
): boolean {
  if (!secret || !token || !userId) return false;
  const expected = signUnsubscribeToken(userId, secret);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Absolute unsubscribe URL for a user, or null when unconfigured. */
export function buildUnsubscribeUrl(
  baseUrl: string,
  userId: string,
  secret: string | null,
): string | null {
  if (!secret) return null;
  const t = signUnsubscribeToken(userId, secret);
  return `${baseUrl}/api/email/unsubscribe?u=${encodeURIComponent(userId)}&t=${encodeURIComponent(t)}`;
}
