// ── Referral code minting ────────────────────────────────────────────
// Codes are RANDOM, never derived from the member's name or email.
//
// The pre-fix join flow slugified the account name into the code: the
// owner testing with an account named "Test" was issued the code
// "test" — a share link (worldeye.app/ref/test) indistinguishable from
// a placeholder, which is exactly what he reported. Name-derived
// codes also leak the owner's identity in every shared link, are
// trivially guessable, and let the first "Test" squat a dictionary
// word forever. Random codes fix all four; existing profiles keep
// their stored codes untouched (links already shared keep resolving).

import { randomInt } from "crypto";
import { REF_CODE_RE } from "./attribution";

/** Unambiguous lowercase alphabet: no l, o, 0 or 1 to misread aloud. */
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export const REFERRAL_CODE_LENGTH = 10;

/** One random candidate: 31^10 ≈ 2^49.6 possibilities. */
export function referralCodeCandidate(): string {
  let code = "";
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}

/**
 * Mint a code that `isTaken` confirms is free (the caller checks every
 * namespace the code must be unique across: affiliate referralCode +
 * customCode, and share-identity codes). Retries on collision; throws
 * after `maxTries` — with a 2^49.6 space that means the checker is
 * broken, and failing the join honestly beats issuing a bad code.
 */
export async function mintReferralCode(
  isTaken: (code: string) => Promise<boolean>,
  maxTries = 12,
): Promise<string> {
  for (let i = 0; i < maxTries; i++) {
    const candidate = referralCodeCandidate();
    if (!REF_CODE_RE.test(candidate)) continue;
    if (!(await isTaken(candidate))) return candidate;
  }
  throw new Error("Could not mint a unique referral code");
}
