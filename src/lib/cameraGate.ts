// Soft signup gate for the camera layer: anonymous and non-Pro visitors can
// open a handful of cameras before they're nudged to create a free account.
// Pro subscribers (active subscription) are never gated. The count lives in
// localStorage per device; the limit itself is never shown in the UI.
"use client";

const STORAGE_KEY = "worldeye.cameraClicks";
export const FREE_CAMERA_CLICKS = 15;

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
