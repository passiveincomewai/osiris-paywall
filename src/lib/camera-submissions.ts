// ── Submit-a-camera: shared vocabulary + validation + review flow ──────
// One source of truth for the public form (src/components/camera-submissions),
// the public POST /api/camera-submissions route, the admin review queue
// (/admin/camera-submissions) and its API — so the four can't drift.
// This module stays free of server-only imports (the form imports it in
// the browser); host checks, the probe and the emails live in
// src/lib/camera-submissions-server.ts.
//
// Flow: anyone submits → row lands "pending" → a human reviews → approve
// marks it cleared-for-import (the catalogue import is a separate ops
// step; approval is NOT the camera going live) or reject closes it. The
// submitter is emailed on receipt and again on the decision.

import { isValidEmail, normalizeEmail } from "@/lib/password-auth";

export const CAMERA_SUBMISSION_KINDS = [
  {
    value: "own",
    label: "It's my camera",
    blurb: "You operate this camera, or you're authorized by whoever does.",
  },
  {
    value: "suggest",
    label: "Suggest a public feed",
    blurb: "You found a publicly accessible camera feed WorldEye doesn't have yet.",
  },
] as const;

export type CameraSubmissionKind = (typeof CAMERA_SUBMISSION_KINDS)[number]["value"];

export const CAMERA_SUBMISSION_KIND_VALUES: readonly string[] = CAMERA_SUBMISSION_KINDS.map((k) => k.value);

export function cameraSubmissionKindLabel(value: string): string {
  return CAMERA_SUBMISSION_KINDS.find((k) => k.value === value)?.label ?? "Suggest a public feed";
}

/** The permission statement the submitter affirms, per kind. */
export const CAMERA_SUBMISSION_DECLARATIONS: Record<CameraSubmissionKind, string> = {
  own: "I operate this camera (or I'm authorized to act for whoever does), and I give WorldEye permission to list it and display its public feed.",
  suggest:
    "This feed is publicly accessible, and I understand WorldEye will only list it if it can confirm the feed is public.",
};

// Category vocabulary mirrors the site's public camera verticals
// (traffic, beach, ski, airport, city, nature, weather, harbor pages).
export const CAMERA_SUBMISSION_CATEGORIES = [
  { value: "traffic", label: "Traffic & roads" },
  { value: "city", label: "City & urban" },
  { value: "beach", label: "Beach & coast" },
  { value: "ski", label: "Ski & mountain" },
  { value: "airport", label: "Airport & aviation" },
  { value: "nature", label: "Nature & wildlife" },
  { value: "weather", label: "Weather & storms" },
  { value: "harbor", label: "Harbor, ships & water" },
  { value: "landmark", label: "Landmark & viewpoint" },
  { value: "other", label: "Something else" },
] as const;

export type CameraSubmissionCategory = (typeof CAMERA_SUBMISSION_CATEGORIES)[number]["value"];

export const CAMERA_SUBMISSION_CATEGORY_VALUES: readonly string[] = CAMERA_SUBMISSION_CATEGORIES.map((c) => c.value);

export function cameraSubmissionCategoryLabel(value: string): string {
  return CAMERA_SUBMISSION_CATEGORIES.find((c) => c.value === value)?.label ?? "Something else";
}

export const CAMERA_SUBMISSION_STATUSES = ["pending", "approved", "rejected"] as const;
export type CameraSubmissionStatus = (typeof CAMERA_SUBMISSION_STATUSES)[number];

export const CAMERA_NAME_MAX = 120;
export const CAMERA_URL_MAX = 2048;
export const CAMERA_PLACE_MAX = 100;
export const CAMERA_NOTES_MAX = 2000;
export const SUBMITTER_NAME_MAX = 100;
export const REVIEWER_NOTES_MAX = 2000;

export interface CameraSubmissionData {
  kind: CameraSubmissionKind;
  cameraName: string;
  url: string;
  category: CameraSubmissionCategory;
  city: string;
  country: string;
  lat: number | null;
  lng: number | null;
  notes: string | null;
  submitterName: string;
  submitterEmail: string;
  declaration: true;
}

export type CameraSubmissionParse =
  | { ok: true; data: CameraSubmissionData }
  | { ok: false; error: string };

function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

/** Shape-level URL rules (sync). Host safety is the server module's job. */
export function cameraUrlShapeError(raw: string): string | null {
  const url = raw.trim();
  if (!url) return "Paste the camera's stream or page address.";
  if (url.length > CAMERA_URL_MAX) return "That address is too long — paste the direct stream or page URL.";
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "That doesn't look like a complete web address — include the https:// part.";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "The address must start with http:// or https://.";
  }
  if (parsed.username || parsed.password) {
    return "Remove any username or password from the address — only send feeds that are openly viewable.";
  }
  if (!parsed.hostname) return "That address is missing a host name.";
  return null;
}

/** Validate + normalize a raw submit-a-camera body. Pure — safe to unit test. */
export function parseCameraSubmission(body: unknown): CameraSubmissionParse {
  const b = (body ?? {}) as Record<string, unknown>;

  const kind = str(b.kind).trim();
  if (!CAMERA_SUBMISSION_KIND_VALUES.includes(kind)) {
    return { ok: false, error: "Tell us whether this is your camera or a public feed you're suggesting." };
  }

  const cameraName = str(b.cameraName).trim().slice(0, CAMERA_NAME_MAX);
  if (cameraName.length < 2) return { ok: false, error: "Give the camera a name (what it shows or where it is)." };

  const url = str(b.url).trim();
  const urlError = cameraUrlShapeError(url);
  if (urlError) return { ok: false, error: urlError };

  const category = str(b.category).trim();
  if (!CAMERA_SUBMISSION_CATEGORY_VALUES.includes(category)) {
    return { ok: false, error: "Choose the category that fits this camera best." };
  }

  const city = str(b.city).trim().slice(0, CAMERA_PLACE_MAX);
  if (!city) return { ok: false, error: "Enter the city or area the camera is in." };
  const country = str(b.country).trim().slice(0, CAMERA_PLACE_MAX);
  if (!country) return { ok: false, error: "Enter the country the camera is in." };

  // Coordinates are optional, but they come as a pair — one without the
  // other can't place a camera and usually means a typo.
  const latRaw = str(b.lat).trim();
  const lngRaw = str(b.lng).trim();
  let lat: number | null = null;
  let lng: number | null = null;
  if (latRaw !== "" || lngRaw !== "") {
    if (latRaw === "" || lngRaw === "") {
      return { ok: false, error: "Coordinates need both latitude and longitude — or leave both blank." };
    }
    lat = Number(latRaw);
    lng = Number(lngRaw);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return { ok: false, error: "Latitude must be a number between -90 and 90." };
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      return { ok: false, error: "Longitude must be a number between -180 and 180." };
    }
  }

  const submitterName = str(b.submitterName).trim().slice(0, SUBMITTER_NAME_MAX);
  if (!submitterName) return { ok: false, error: "Enter your name so we know who sent this." };
  const submitterEmail = normalizeEmail(str(b.submitterEmail));
  if (!isValidEmail(submitterEmail)) return { ok: false, error: "Enter a valid email address — the review decision goes there." };

  if (b.declaration !== true) {
    return { ok: false, error: "Please confirm the permission statement — we can't review a camera without it." };
  }

  const notes = str(b.notes).trim().slice(0, CAMERA_NOTES_MAX);

  return {
    ok: true,
    data: {
      kind: kind as CameraSubmissionKind,
      cameraName,
      url,
      category: category as CameraSubmissionCategory,
      city,
      country,
      lat,
      lng,
      notes: notes || null,
      submitterName,
      submitterEmail,
      declaration: true,
    },
  };
}

/**
 * The form carries a hidden "website" field real visitors never see or
 * fill. Anything in it means a bot — the route answers success and stores
 * nothing (the contact form's rate limit is the other half of the defense).
 */
export function isHoneypotTripped(body: unknown): boolean {
  const b = (body ?? {}) as Record<string, unknown>;
  return typeof b.website === "string" && b.website.trim().length > 0;
}

/** Pure review-state rule: only a pending submission can be decided. */
export function reviewDecision(
  currentStatus: string,
  decision: unknown,
): { ok: true; nextStatus: CameraSubmissionStatus } | { ok: false; error: string; conflict?: boolean } {
  if (decision !== "approve" && decision !== "reject") {
    return { ok: false, error: "decision must be \"approve\" or \"reject\"" };
  }
  if (currentStatus !== "pending") {
    return { ok: false, error: `Submission already ${currentStatus}`, conflict: true };
  }
  return { ok: true, nextStatus: decision === "approve" ? "approved" : "rejected" };
}
