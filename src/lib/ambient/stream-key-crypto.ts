/**
 * WorldEye Ambient — encryption for users' YouTube stream keys.
 *
 * A YouTube stream key is a live credential for the user's own
 * channel: anyone holding it can stream to that channel. It is
 * therefore never stored in plaintext and never returned by any API
 * after the user saves it. Storage is AES-256-GCM with a key derived
 * from AMBIENT_KEY_SECRET (falling back to AUTH_SECRET, which every
 * deployment already has). The relay playlist endpoint is the only
 * code path that decrypts, and it only answers a request carrying
 * the user's relay token (stored as a SHA-256 hash, compared here
 * with a timing-safe equality check).
 */
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const ALGO = "aes-256-gcm";

function encryptionKey(): Buffer {
  const secret = process.env.AMBIENT_KEY_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AMBIENT_KEY_SECRET (or AUTH_SECRET) must be set to store stream keys",
    );
  }
  return createHash("sha256").update(secret).digest();
}

/** Encrypt → "iv.tag.ciphertext", each base64. */
export function encryptStreamKey(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, encryptionKey(), iv);
  const ct = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ct].map((b) => b.toString("base64")).join(".");
}

export function decryptStreamKey(stored: string): string {
  const [ivB64, tagB64, ctB64] = stored.split(".");
  if (!ivB64 || !tagB64 || !ctB64) throw new Error("Malformed stored key");
  const decipher = createDecipheriv(
    ALGO,
    encryptionKey(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/** A fresh relay token (shown to the user exactly once). */
export function newRelayToken(): string {
  return randomBytes(24).toString("hex");
}

export function hashRelayToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function relayTokenMatches(token: string, storedHash: string): boolean {
  const a = Buffer.from(hashRelayToken(token), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
