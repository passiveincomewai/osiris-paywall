// ── Email-capture rules ─────────────────────────────────────────────────
// The newsletter list only grows if we ask at the moments a visitor has
// just gotten value — and only ever ask a device once. These rules are
// the decision half of components/EmailCaptureCard.tsx:
//
//   • The camera card may show once the device has opened ≥1 camera
//     (lib/cameraGate's per-device count) — never before.
//   • The pricing card rides the checkout-cancel recovery strip, so its
//     only rule is the shared one below.
//   • EITHER outcome retires the ask on that device forever: a dismissal
//     is a no, and a subscribe (including "already subscribed") is a yes.
//     There is no snooze, no second placement, no re-ask after rotation.
//
// The record lives in localStorage, same as the camera gate's count:
// per device, no server state, no cookie. Subscribing itself goes through
// the existing POST /api/newsletter/subscribe double opt-in — this module
// never touches the list, it only decides whether the ask may appear.

export const EMAIL_CAPTURE_STORAGE_KEY = "worldeye.emailCapture";

/** Analytics event names (PageView.event via /api/analytics/track). */
export const CAPTURE_IMPRESSION_EVENT = "email_capture_impression";
export const CAPTURE_SUBSCRIBE_EVENT = "email_capture_subscribe";

export type CapturePlacement = "camera" | "pricing";
export type CaptureOutcome = "subscribed" | "dismissed";

export interface CaptureRecord {
  outcome: CaptureOutcome;
  at: number;
}

/** The slice of the Storage API these rules need — stubbed in tests. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function parseCaptureRecord(raw: string | null): CaptureRecord | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<CaptureRecord> | null;
    if (v && (v.outcome === "subscribed" || v.outcome === "dismissed")) {
      return { outcome: v.outcome, at: typeof v.at === "number" ? v.at : 0 };
    }
  } catch {
    /* corrupt value — treated as no record */
  }
  return null;
}

export function readCaptureRecord(storage: StorageLike | null): CaptureRecord | null {
  if (!storage) return null;
  try {
    return parseCaptureRecord(storage.getItem(EMAIL_CAPTURE_STORAGE_KEY));
  } catch {
    return null;
  }
}

/** Persist an outcome. Returns false when storage refused (private mode…). */
export function writeCaptureRecord(
  storage: StorageLike | null,
  outcome: CaptureOutcome,
  now: number = Date.now(),
): boolean {
  if (!storage) return false;
  try {
    const record: CaptureRecord = { outcome, at: now };
    storage.setItem(EMAIL_CAPTURE_STORAGE_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

/** Camera moment: only after the device's first camera open, only if never asked. */
export function shouldShowCameraCapture(
  record: CaptureRecord | null,
  cameraOpens: number,
): boolean {
  return record === null && cameraOpens >= 1;
}

/** Pricing moment: the recovery strip itself is the gate; here, only never-asked. */
export function shouldShowPricingCapture(record: CaptureRecord | null): boolean {
  return record === null;
}

/** `source` tag stored on the subscriber row (subscribe route caps at 40 chars). */
export function captureSourceFor(placement: CapturePlacement): string {
  return placement === "camera" ? "camera-first-open" : "pricing-recovery";
}

/** Analytics detail token (ingest accepts [a-z0-9_], ≤24 chars). */
export function captureDetailFor(placement: CapturePlacement): string {
  return placement;
}

/** Browser localStorage, or null where it is blocked/unavailable. */
export function browserStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
