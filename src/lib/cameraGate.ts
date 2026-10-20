// Soft signup gate for the camera layer: anonymous and non-Pro visitors can
// open a handful of cameras before they're nudged to create a free account.
// Pro subscribers (active subscription) are never gated. The count lives in
// localStorage per device and counts opens (clicks), not unique cameras —
// reopening the same camera counts again. The nudge at the wall states the
// limit plainly; every other surface that quotes the allowance reads
// FREE_CAMERA_CLICKS from here so the number can never drift.
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
 * invite bonus (lib/camera-bonus) instead of the free base allowance.
 * The base is per-device (above); the bonus is per-account and spent
 * only through POST /api/cameras/bonus/consume — the server decides.
 */
export function openDrawsOnBonus(deviceClicks: number): boolean {
  return deviceClicks >= FREE_CAMERA_CLICKS;
}

/**
 * Opens still available to a signed-in user: whatever is left of this
 * device's free base, plus their unspent server bonus. Signed-out users
 * have no bonus — for them this is just the base remainder.
 */
export function opensRemaining(deviceClicks: number, bonusBalance: number): number {
  return Math.max(0, FREE_CAMERA_CLICKS - deviceClicks) + Math.max(0, bonusBalance);
}
