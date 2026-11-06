// ── Camera requests: shared types + submission validation ─────────────
// A camera request is the DEMAND side of coverage: a visitor searched
// the globe or the camera directory for a place, found nothing, and
// asked us to look for a feed there. It is deliberately NOT the
// submit-a-camera flow (src/lib/camera-submissions) — that one is the
// SUPPLY side, where a visitor hands us a specific feed URL. A request
// carries no URL and makes no promise: the success copy says we will
// look for a feed, because some places have no legitimate feed at all.
// Used by the public POST /api/camera-requests route and the request
// form (src/components/RequestCameraForm) — one source of truth for the
// field rules so they can't drift. Mirrors the src/lib/partners.ts and
// src/lib/camera-submissions.ts idiom deliberately.

import { isValidEmail, normalizeEmail } from "@/lib/password-auth";

/** Lifecycle for a request, in the order an admin works it. New rows
 *  start at "new"; the rest exist so the admin readout can group by
 *  state once triage begins — v1 stores and displays only. */
export const CAMERA_REQUEST_STATUSES = [
  { value: "new", label: "New" },
  { value: "searching", label: "Searching for a feed" },
  { value: "added", label: "Feed added" },
  { value: "no-feed", label: "No legitimate feed found" },
] as const;

export type CameraRequestStatus = (typeof CAMERA_REQUEST_STATUSES)[number]["value"];

export const CAMERA_REQUEST_STATUS_VALUES: readonly string[] = CAMERA_REQUEST_STATUSES.map((s) => s.value);

export function cameraRequestStatusLabel(value: string): string {
  return CAMERA_REQUEST_STATUSES.find((s) => s.value === value)?.label ?? "New";
}

export const CAMERA_REQUEST_PLACE_MIN = 2;
export const CAMERA_REQUEST_PLACE_MAX = 160;
export const CAMERA_REQUEST_QUERY_MAX = 200;
export const CAMERA_REQUEST_SESSION_MAX = 64;

export interface CameraRequestInput {
  /** The exact failed search text, when the surface has one. */
  query: string | null;
  /** The place the visitor wants a camera for (pre-filled from the
   *  failed query, editable before submitting). */
  placeText: string;
  /** Optional notify-me address. Never required. */
  email: string | null;
  /** Analytics session id (sessionStorage `we_sid`), when available. */
  sessionId: string | null;
}

export type ParseCameraRequestResult =
  | { ok: true; data: CameraRequestInput }
  | { ok: false; error: string };

function cleanField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Validate a public camera-request body. Rules:
 *  - placeText is the only required field (2–160 chars after trim);
 *  - query is the failed search text when the surface has one (≤200);
 *  - email is optional, but when present it must be a valid address;
 *  - sessionId is accepted only in the analytics id shape, else dropped;
 *  - userId is NEVER read from the body — the route resolves it from
 *    the signed-in session server-side.
 */
export function parseCameraRequest(body: unknown): ParseCameraRequestResult {
  const b = (body ?? {}) as Record<string, unknown>;

  const placeText = cleanField(b.placeText);
  if (placeText.length < CAMERA_REQUEST_PLACE_MIN) {
    return { ok: false, error: "Tell us the place you'd like a camera for." };
  }
  if (placeText.length > CAMERA_REQUEST_PLACE_MAX) {
    return { ok: false, error: `Place is too long — keep it under ${CAMERA_REQUEST_PLACE_MAX} characters.` };
  }

  const rawQuery = cleanField(b.query);
  const query = rawQuery ? rawQuery.slice(0, CAMERA_REQUEST_QUERY_MAX) : null;

  const rawEmail = cleanField(b.email);
  let email: string | null = null;
  if (rawEmail) {
    if (!isValidEmail(rawEmail)) {
      return { ok: false, error: "That email address doesn't look right — check it, or leave it blank." };
    }
    email = normalizeEmail(rawEmail);
  }

  const rawSession = cleanField(b.sessionId);
  const sessionId =
    rawSession && rawSession.length <= CAMERA_REQUEST_SESSION_MAX && /^[A-Za-z0-9_-]+$/.test(rawSession)
      ? rawSession
      : null;

  return { ok: true, data: { query, placeText, email, sessionId } };
}

/**
 * The form carries a hidden "website" field real visitors never see or
 * fill. Anything in it means a bot — the route answers success and
 * stores nothing (same convention as the camera-submissions form; the
 * per-IP rate limit is the other half of the defense).
 */
export function isCameraRequestHoneypotTripped(body: unknown): boolean {
  const b = (body ?? {}) as Record<string, unknown>;
  return typeof b.website === "string" && b.website.trim().length > 0;
}
