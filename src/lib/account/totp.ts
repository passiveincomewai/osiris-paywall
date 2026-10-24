// ── TOTP two-factor auth (item 2) ───────────────────────────────────
// RFC 4226/6238 TOTP over HMAC-SHA1, 30s step, 6 digits, ±1 step
// window. No new dependency: node:crypto does the HMAC, and the base32
// codec is 30 lines. Secrets are NEVER stored in plaintext — they are
// AES-256-GCM encrypted with a key derived from AUTH_SECRET, and the
// UserTotp row holds only the ciphertext. Backup codes are stored as
// SHA-256 hashes and consumed on use.

import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Buffer {
  const clean = s.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | B32_ALPHABET.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

function hotp(secret: Buffer, counter: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", secret).update(msg).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

export function totpCode(secretBase32: string, atMs: number = Date.now()): string {
  return hotp(base32Decode(secretBase32), Math.floor(atMs / 30_000));
}

export function verifyTotp(secretBase32: string, code: string, atMs: number = Date.now()): boolean {
  const clean = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  const secret = base32Decode(secretBase32);
  const counter = Math.floor(atMs / 30_000);
  for (const drift of [-1, 0, 1]) {
    const candidate = hotp(secret, counter + drift);
    if (timingSafeEqual(Buffer.from(candidate), Buffer.from(clean))) return true;
  }
  return false;
}

/** otpauth:// URL for authenticator apps (rendered as a QR code client-side). */
export function totpOtpAuthUrl(secretBase32: string, accountLabel: string): string {
  const issuer = "WorldEye";
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountLabel)}?secret=${secretBase32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

/* ── Secret encryption at rest ────────────────────────────────────── */

function encryptionKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set — cannot store TOTP secrets.");
  return createHash("sha256").update(`we-totp-v1|${secret}`).digest();
}

export function encryptTotpSecret(secretBase32: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ct = Buffer.concat([cipher.update(secretBase32, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(".");
}

export function decryptTotpSecret(stored: string): string {
  const [iv, tag, ct] = stored.split(".").map((p) => Buffer.from(p, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

/* ── Backup codes ─────────────────────────────────────────────────── */

const BACKUP_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    let raw = "";
    const bytes = randomBytes(10);
    for (const b of bytes) raw += BACKUP_ALPHABET[b % BACKUP_ALPHABET.length];
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
  }
  return codes;
}

export function hashBackupCode(code: string): string {
  const norm = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return createHash("sha256").update(`we-backup-v1|${norm}`).digest("hex");
}

/** Index of the matching stored hash, or -1. Caller removes it on use. */
export function matchBackupCode(storedHashes: string[], code: string): number {
  const h = hashBackupCode(code);
  return storedHashes.findIndex((stored) =>
    stored.length === h.length && timingSafeEqual(Buffer.from(stored), Buffer.from(h)),
  );
}

/* ── Step-up proof cookie ─────────────────────────────────────────── */
// After a successful challenge, the server mints this HMAC proof; the
// jwt callback accepts a session update only when it validates, so a
// client can never flip its own totpVerified claim.

export const TOTP_PROOF_COOKIE = "we_totp_proof";
const PROOF_TTL_MS = 12 * 3600_000;

export function mintTotpProof(userId: string, now: number = Date.now()): string {
  const secret = process.env.AUTH_SECRET ?? "";
  const payload = `${userId}.${now + PROOF_TTL_MS}`;
  const sig = createHmac("sha256", secret).update(`we-totp-proof|${payload}`).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyTotpProof(cookieValue: string | undefined, userId: string, now: number = Date.now()): boolean {
  if (!cookieValue) return false;
  const parts = cookieValue.split(".");
  if (parts.length !== 3) return false;
  const [uid, expStr, sig] = parts;
  if (uid !== userId) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < now) return false;
  const secret = process.env.AUTH_SECRET ?? "";
  const expected = createHmac("sha256", secret).update(`we-totp-proof|${uid}.${expStr}`).digest("base64url");
  return sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
