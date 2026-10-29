// ── The free-camera ladder (Conversion Wave 2, BRIEF F4) ────────────
// The flat 5-open gate (lib/cameraGate) becomes a ladder — the owner's
// exact model, friendly at every step, never a jump straight to Pro:
//
//   1. Anonymous: FREE_CAMERA_CLICKS (5) free opens.
//   2. On the next open: the middle-tier prompt. Dropping an email
//      unlocks +5 INSTANTLY (10 total, no password step).
//   3. A signed-in account: 5 opens while its email is UNVERIFIED —
//      at the cap the prompt is "verify your email to unlock 5 more"
//      (the verify rung, owner's order 2026-10-29: first login no
//      longer waits for verification; verifying in Settings grants
//      the +5). Verified accounts (incl. Google sign-ins, verified by
//      Google) get 10 total.
//   4. Only after the verified-account allowance is used up: the
//      Pro/trial prompt.
//
// (History: the account rung originally granted its +5 for merely
// creating the account, 15 total. The 2026-10-29 verification-ladder
// change re-cut it to the owner's stated arithmetic — unverified 5,
// verified 10 — so the +5 is earned by verifying, which is also what
// makes the address proven for resets/receipts.)
//
// State is device-local (localStorage), the same trust model as the
// gate count it extends: the email unlock flag and the timed-popup
// dismissal live in one record under LADDER_STORAGE_KEY; the per-device
// open count itself stays in lib/cameraGate, untouched. A signed-in
// free account IS the top rung — no flag needed — so "signedIn" comes
// from the session (lib/premium-entitlement's readSessionIdentity) and
// is never persisted here.
//
// This module is also the prompt-discipline rulebook for Wave 2's
// softer asks (the F4 timed trial popup and the F11 share-link
// prompt): one timed popup per session, a multi-day cooldown after a
// dismissal, never on pricing/checkout/settings, never stacked with
// another prompt. Every rule is a pure function of plain inputs so the
// components stay thin and the discipline is unit-tested here.

import { FREE_CAMERA_CLICKS } from "./cameraGate";

/** Opens the email step adds, the moment the address is dropped. */
export const EMAIL_UNLOCK_OPENS = 5;
/** Opens that verifying the account's email adds (the verify rung). */
export const VERIFY_UNLOCK_OPENS = 5;
/** The account step's extra opens — since 2026-10-29 they are granted
 *  by VERIFYING the account email (VERIFY_UNLOCK_OPENS), not by the
 *  signup itself. Kept as a named constant for the prompt copy. */
export const ACCOUNT_UNLOCK_OPENS = VERIFY_UNLOCK_OPENS;
/** Total opens for a visitor who dropped an email but has no account: 10. */
export const EMAIL_LADDER_TOTAL = FREE_CAMERA_CLICKS + EMAIL_UNLOCK_OPENS;
/** Total opens for a free account with a verified email: 10. */
export const ACCOUNT_LADDER_TOTAL = FREE_CAMERA_CLICKS + VERIFY_UNLOCK_OPENS;

export type LadderTier = "anonymous" | "email" | "account-unverified" | "account";

/** Where a visitor stands on the ladder. A session (signedIn) outranks
 *  the device-local email flag: the account is the completed step.
 *  emailVerified splits the account rung in two — the session carries
 *  it (src/auth.ts, lib/auth-verification's rule: column set OR a
 *  provider-verified OAuth link, so Google sign-ins read verified);
 *  absent/false on a signed-in session means unverified. */
export function ladderTier(input: {
  signedIn: boolean;
  emailUnlocked: boolean;
  emailVerified?: boolean;
}): LadderTier {
  if (input.signedIn) return input.emailVerified ? "account" : "account-unverified";
  if (input.emailUnlocked) return "email";
  return "anonymous";
}

/** Opens this visitor may make before the next prompt. An unverified
 *  account gets the same 5 as an anonymous visitor — the +5 waits for
 *  verification, inside this same counter (no parallel allowance). */
export function ladderAllowance(tier: LadderTier): number {
  if (tier === "account") return ACCOUNT_LADDER_TOTAL;
  if (tier === "email") return EMAIL_LADDER_TOTAL;
  return FREE_CAMERA_CLICKS;
}

export type LadderPrompt = "email" | "account" | "verify" | "pro";

/**
 * The prompt an open must show, or null when the open is still free.
 * The prompt is always the NEXT rung, never a skip: anonymous → ask
 * for the email/account (the middle tier), email-only → ask for the
 * account, unverified account → ask for verification (the +5 lives
 * there now — NOT the Pro upsell), verified account → only now the
 * Pro/trial ask.
 */
export function ladderPromptFor(input: {
  opens: number;
  signedIn: boolean;
  emailUnlocked: boolean;
  emailVerified?: boolean;
}): LadderPrompt | null {
  const tier = ladderTier(input);
  if (input.opens < ladderAllowance(tier)) return null;
  if (tier === "account") return "pro";
  if (tier === "account-unverified") return "verify";
  if (tier === "email") return "account";
  return "email";
}

// ── Device-local ladder record ──────────────────────────────────────

export const LADDER_STORAGE_KEY = "worldeye.cameraLadder";

export interface LadderRecord {
  /** When this device dropped an email at the ladder's middle rung. */
  emailUnlockedAt: number | null;
  /** When the timed trial popup was last dismissed (cooldown anchor). */
  timedDismissedAt: number | null;
}

/** The slice of the Storage API these rules need — stubbed in tests. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function parseLadderRecord(raw: string | null): LadderRecord | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<LadderRecord> | null;
    if (!v || typeof v !== "object") return null;
    return {
      emailUnlockedAt: typeof v.emailUnlockedAt === "number" ? v.emailUnlockedAt : null,
      timedDismissedAt: typeof v.timedDismissedAt === "number" ? v.timedDismissedAt : null,
    };
  } catch {
    return null;
  }
}

export function readLadderRecord(storage: StorageLike | null): LadderRecord | null {
  if (!storage) return null;
  try {
    return parseLadderRecord(storage.getItem(LADDER_STORAGE_KEY));
  } catch {
    return null;
  }
}

/** Merge-write the given fields, preserving the rest. False when storage refused. */
export function writeLadderRecord(
  storage: StorageLike | null,
  patch: Partial<LadderRecord>,
): boolean {
  if (!storage) return false;
  try {
    const current = readLadderRecord(storage) ?? { emailUnlockedAt: null, timedDismissedAt: null };
    const next: LadderRecord = { ...current, ...patch };
    storage.setItem(LADDER_STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

export function markEmailUnlocked(storage: StorageLike | null, now: number = Date.now()): boolean {
  return writeLadderRecord(storage, { emailUnlockedAt: now });
}

export function markTimedDismissed(storage: StorageLike | null, now: number = Date.now()): boolean {
  return writeLadderRecord(storage, { timedDismissedAt: now });
}

/** Browser localStorage, or null where it is blocked/unavailable. */
export function browserLadderStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Browser sessionStorage, or null where it is blocked/unavailable. */
export function browserSessionStorage(): StorageLike | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

// ── Once-per-session flags (sessionStorage) ─────────────────────────

export const TIMED_POPUP_SESSION_KEY = "worldeye.timedPopupShown";
export const SHARE_PROMPT_SESSION_KEY = "worldeye.sharePromptShown";

export function readSessionFlag(storage: StorageLike | null, key: string): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function writeSessionFlag(storage: StorageLike | null, key: string): void {
  if (!storage) return;
  try {
    storage.setItem(key, "1");
  } catch {
    /* storage unavailable — the flag simply won't persist */
  }
}

// ── Prompt discipline ───────────────────────────────────────────────

/** Timed popup: ~75s of exploring (the owner's 60–90s window) … */
export const TIMED_POPUP_DELAY_MS = 75_000;
/** … or a few camera opens, whichever comes first. */
export const TIMED_POPUP_MIN_OPENS = 3;
/** A dismissal retires the timed popup for days, not hours. */
export const TIMED_POPUP_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;

/** Surfaces a conversion prompt must never interrupt. */
export const PROMPT_EXCLUDED_PATH_PREFIXES = ["/pricing", "/checkout", "/settings"] as const;

export function isPromptExcludedPath(pathname: string): boolean {
  return PROMPT_EXCLUDED_PATH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export interface TimedPopupInput {
  now: number;
  /** When the surface mounted (the "let visitors explore first" clock). */
  mountedAt: number;
  /** This device's camera opens so far (lib/cameraGate's count). */
  opens: number;
  shownThisSession: boolean;
  /** A wall, another prompt, or the camera viewer is up — never stack. */
  otherPromptOpen: boolean;
  record: LadderRecord | null;
  pathname: string;
  /** Premium viewers are never asked to trial what they already have. */
  premium: boolean;
}

/** F4 timed popup: one per session, after real exploring, retired for
 *  TIMED_POPUP_COOLDOWN_MS by a dismissal, silent on excluded surfaces. */
export function timedPopupShouldShow(input: TimedPopupInput): boolean {
  if (input.premium) return false;
  if (input.shownThisSession) return false;
  if (input.otherPromptOpen) return false;
  if (isPromptExcludedPath(input.pathname)) return false;
  const dismissedAt = input.record?.timedDismissedAt ?? null;
  if (dismissedAt !== null && input.now - dismissedAt < TIMED_POPUP_COOLDOWN_MS) return false;
  const explored = input.now - input.mountedAt >= TIMED_POPUP_DELAY_MS;
  return explored || input.opens >= TIMED_POPUP_MIN_OPENS;
}

export interface ShareAwayInput {
  /** The visit landed on /?camera=<id> (lib/camera-share). */
  arrivedViaShare: boolean;
  /** The shared camera actually opened (a walled attempt doesn't count —
   *  that visitor already met the stronger ladder prompt instead). */
  sharedCameraOpened: boolean;
  /** The visitor has since left that camera to explore the globe. */
  navigatedAway: boolean;
  shownThisSession: boolean;
  otherPromptOpen: boolean;
  pathname: string;
  /** The prompt is a signup ask; accounts and premium never see it. */
  signedIn: boolean;
  premium: boolean;
}

/** F11: one soft signup prompt when a shared-link visitor first
 *  navigates away from the shared camera — never before, never twice. */
export function shareAwayShouldShow(input: ShareAwayInput): boolean {
  if (!input.arrivedViaShare || !input.sharedCameraOpened || !input.navigatedAway) return false;
  if (input.shownThisSession) return false;
  if (input.otherPromptOpen) return false;
  if (input.signedIn || input.premium) return false;
  if (isPromptExcludedPath(input.pathname)) return false;
  return true;
}
