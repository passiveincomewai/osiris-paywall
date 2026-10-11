// Shared helpers for the email+password account system:
// hashing, validation, single-use tokens, and a light in-memory rate limiter
// for the public auth endpoints (per-IP + per-key buckets).
import { randomBytes, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim()) && email.length <= 254;
}

// Minimum 8 chars. We deliberately don't force character classes —
// length is what matters (NIST 800-63B).
export function passwordError(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (pw.length > 128) return "Password must be under 128 characters.";
  return null;
}

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, BCRYPT_ROUNDS);
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(pw, hash);
  } catch {
    return false;
  }
}

/** 256-bit token, hex-encoded, safe for URLs. */
export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/** Constant-time token comparison to blunt timing probes. */
export function tokensEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/* ------------------------------------------------------------------ */
/* Rate limiting                                                       */
/* ------------------------------------------------------------------ */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * Sliding-window limiter. Returns true when the caller is over the limit.
 * Purely in-memory: each server instance tracks its own counts, which is
 * fine as abuse backpressure (not a security boundary — auth checks still apply).
 */
export function isRateLimited(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  b.count += 1;
  // Opportunistic cleanup so the map can't grow forever.
  if (buckets.size > 5000 && Math.random() < 0.01) {
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
  }
  return b.count > maxAttempts;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/* ------------------------------------------------------------------ */
/* VerificationToken helpers (Auth.js table, reused for our flows)     */
/* ------------------------------------------------------------------ */

export const VERIFY_ID_PREFIX = "verify-email:";
export const RESET_ID_PREFIX = "reset-password:";
