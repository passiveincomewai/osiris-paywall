// Shared helpers for the fleet Instagram OAuth handshake routes
// (/api/instagram/issue, /api/instagram/callback, /api/instagram/pickup).
//
// Flow: the fleet registers a single-use state nonce — only its SHA-256
// hash is stored — then sends the account's browser through Instagram's
// authorize page with that nonce as `state`. Instagram redirects back to
// the callback with a code; the code is stored against the nonce hash and
// the fleet picks it up exactly once by presenting the raw nonce, which
// burns it. Codes are credentials: they are never logged, never rendered,
// and are nulled the moment they are picked up. Handshakes live at most
// NONCE_TTL_MS from issue.
import { createHash } from "crypto";
import { db } from "@/lib/db";

export const NONCE_TTL_MS = 15 * 60 * 1000;

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function isNonceHash(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

export function isFleetUsername(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 1 &&
    value.length <= 64 &&
    /^[a-zA-Z0-9._-]+$/.test(value)
  );
}

// Opportunistic cleanup: expired handshakes (picked up or not) carry no
// live credential once the stored code is nulled, and unfinished ones are
// useless past expiry, so delete them whenever a route runs anyway.
export async function pruneExpiredHandshakes(): Promise<void> {
  await db.igOAuthHandshake
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch(() => undefined);
}
