/**
 * Enterprise feed secrets: collection feed tokens and API keys.
 *
 * Both are shown to the customer exactly once (at generation / creation)
 * and stored only as SHA-256 hashes — a database read never yields a
 * usable credential, regenerating a feed token is the revocation, and an
 * API key is revoked by timestamp. Plaintext is never logged or listed.
 */
import { createHash, randomBytes } from "node:crypto";

export const FEED_TOKEN_PREFIX = "wef_";
export const API_KEY_PREFIX = "wek_";

/** 192 bits of entropy, base64url — unguessable by construction. */
export function generateFeedToken(): string {
  return FEED_TOKEN_PREFIX + randomBytes(24).toString("base64url");
}

export function generateApiKey(): { key: string; prefix: string } {
  const key = API_KEY_PREFIX + randomBytes(24).toString("base64url");
  // The display prefix identifies a key in the dashboard list without
  // revealing anything usable (first 12 chars: "wek_" + 8 random chars).
  return { key, prefix: key.slice(0, 12) };
}

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

export function looksLikeFeedToken(value: string): boolean {
  return value.startsWith(FEED_TOKEN_PREFIX) && value.length >= FEED_TOKEN_PREFIX.length + 16;
}

export function looksLikeApiKey(value: string): boolean {
  return value.startsWith(API_KEY_PREFIX) && value.length >= API_KEY_PREFIX.length + 16;
}

/** API keys arrive as `Authorization: Bearer wek_…` or `X-Api-Key: wek_…`. */
export function extractApiKey(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth && /^Bearer\s+/i.test(auth)) {
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    if (looksLikeApiKey(token)) return token;
  }
  const header = req.headers.get("x-api-key")?.trim();
  if (header && looksLikeApiKey(header)) return header;
  return null;
}
