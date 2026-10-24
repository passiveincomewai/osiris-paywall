// Soft signup gate for the camera layer: anonymous and non-Pro visitors can
// open a handful of cameras before they're nudged to create a free account.
// Pro subscribers (active subscription) are never gated. The count lives in
// localStorage per device and counts opens (clicks), not unique cameras —
// reopening the same camera counts again. The nudge at the wall states the
// limit plainly; every other surface that quotes the allowance reads
// FREE_CAMERA_CLICKS from here so the number can never drift.
//
// Wave 2 (BRIEF F4): this base allowance is now rung 1 of the ladder in
// lib/camera-ladder — email unlock raises the device allowance to 10, a
// free account to 15. The count and its storage key are unchanged; the
// ladder decides which allowance a given visitor is measured against.
"use client";

const STORAGE_KEY = "worldeye.cameraClicks";
export const FREE_CAMERA_CLICKS = 5;

/**
 * Bonus camera opens a signed-in user earns when a friend completes
 * signup through their invite link (server-side ledger:
 * lib/camera-bonus.ts). Quoted by the camera-limit popup's invite
 * section — the amount itself lives in camera-bonus-constants, shared
 * with the server so the promise and the payout can't drift.
 */
export { INVITE_CAMERA_BONUS } from "./camera-bonus-constants";

export function getCameraClickCount(): number {
  try {
    const n = parseInt(localStorage.getItem(STORAGE_KEY) ?? "0", 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** True while the visitor may still open another camera without signing up. */
export function cameraClickAllowed(): boolean {
  return getCameraClickCount() < FREE_CAMERA_CLICKS;
}

/** Record one opened camera. Returns the new total. */
export function recordCameraClick(): number {
  const next = getCameraClickCount() + 1;
  try {
    localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    /* storage unavailable — the gate simply won't persist */
  }
  return next;
}

/**
 * Whether an open at the given device count must draw on the server-side
 * invite bonus (lib/camera-bonus) instead of the free allowance. The
 * allowance defaults to the anonymous base; the Wave 2 ladder
 * (lib/camera-ladder) passes the visitor's rung allowance, so bonus
 * opens are spent only once the rung they actually hold is used up.
 * The bonus itself is per-account and spent only through
 * POST /api/cameras/bonus/consume — the server decides.
 */
export function openDrawsOnBonus(
  deviceClicks: number,
  allowance: number = FREE_CAMERA_CLICKS,
): boolean {
  return deviceClicks >= allowance;
}

/**
 * Opens still available to a signed-in user: whatever is left of their
 * allowance, plus their unspent server bonus. Signed-out users have no
 * bonus — for them this is just the allowance remainder.
 */
export function opensRemaining(
  deviceClicks: number,
  bonusBalance: number,
  allowance: number = FREE_CAMERA_CLICKS,
): number {
  return Math.max(0, allowance - deviceClicks) + Math.max(0, bonusBalance);
}
