/**
 * Validation helpers for the analytics ingest route
 * (src/app/api/analytics/track/route.ts).
 *
 * Two PageView fields exist for the Onboarding & Activation report:
 *  - variant: the onboarding A/B experiment group. Assigned client-side
 *    by src/lib/onboarding/storage.ts, which persists it as "a"/"b" in
 *    localStorage AND a `we_onb_group` cookie. The route accepts the
 *    group from the payload when present, else from that cookie, and
 *    normalizes to canonical "A"/"B" for storage. Anything else → null.
 *  - device: coarse device class. The client may report it; when it
 *    doesn't (or reports garbage), the route derives it from the
 *    User-Agent header so device filters work for every emitter,
 *    including the plain trackAnalyticsEvent() helper.
 *
 * A third field serves the return-visit measurement:
 *  - visitorId: the persistent first-party visitor ID. A random UUID
 *    minted client-side by src/lib/analytics/visitor-id.ts and persisted
 *    in localStorage (`we_vid`) — no fingerprinting inputs. Unlike the
 *    per-visit sessionId it survives across visits, so one visitor's
 *    rows can be grouped across days. The route accepts only the
 *    canonical UUID shape and normalizes to lowercase; anything else
 *    (missing, a sessionId-shaped token, junk) → null.
 */

export const VARIANTS = ["A", "B"] as const;
export type Variant = (typeof VARIANTS)[number];

export const DEVICE_CLASSES = ["mobile", "tablet", "desktop"] as const;
export type DeviceClass = (typeof DEVICE_CLASSES)[number];

export function parseVariant(v: unknown): Variant | null {
  if (v === "A" || v === "a") return "A";
  if (v === "B" || v === "b") return "B";
  return null;
}

export function parseDevice(v: unknown): DeviceClass | null {
  return v === "mobile" || v === "tablet" || v === "desktop" ? v : null;
}

const VISITOR_ID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate a client-sent visitor ID. Only the canonical UUID shape the
 * client mints (src/lib/analytics/visitor-id.ts) is stored, lowercased
 * so one visitor never splits across case variants. Anything else →
 * null: the row then looks like pre-visitorId history rather than
 * carrying an untrusted identifier.
 */
export function parseVisitorId(v: unknown): string | null {
  if (typeof v !== "string") return null;
  return VISITOR_ID_SHAPE.test(v) ? v.toLowerCase() : null;
}

/** Coarse device class from a User-Agent string. Null only for empty UA. */
export function deviceClassFromUserAgent(ua: string | null | undefined): DeviceClass | null {
  if (!ua) return null;
  const s = ua.toLowerCase();
  if (
    s.includes("ipad") ||
    s.includes("tablet") ||
    s.includes("playbook") ||
    s.includes("silk") ||
    (s.includes("android") && !s.includes("mobile"))
  ) {
    return "tablet";
  }
  if (
    s.includes("iphone") ||
    s.includes("ipod") ||
    s.includes("windows phone") ||
    s.includes("mobile") ||
    s.includes("android")
  ) {
    return "mobile";
  }
  return "desktop";
}

/**
 * Optional event detail suffix. Named events may carry one machine-readable
 * detail token, stored as `name:detail` in the event column:
 *   onboarding_step_complete + detail "3"     -> "onboarding_step_complete:3"
 *   feature_first_use        + detail "camera" -> "feature_first_use:camera"
 * Sanitized to lowercase [a-z0-9_], max 24 chars; anything else is dropped
 * (the bare event name is still recorded).
 */
export function parseEventDetail(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const cleaned = v.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
  return cleaned.length > 0 ? cleaned : null;
}

/** Split a stored event value into { name, detail } (detail may be null). */
export function splitEvent(raw: string): { name: string; detail: string | null } {
  const i = raw.indexOf(":");
  if (i < 0) return { name: raw, detail: null };
  return { name: raw.slice(0, i), detail: raw.slice(i + 1) || null };
}

/**
 * The one event whose detail is a small structured payload rather than a
 * bare token: on-site search (payload built by src/lib/analytics/
 * search-event.ts). Shape: "<resultCount>_<query token>", e.g.
 * "0_jamaica" (zero-result) or "12_eiffel_tower". The query token is the
 * visitor's search text normalized to the same [a-z0-9_] machine alphabet
 * as every other detail — never the raw typed string — but at up to 55
 * chars it preserves the actual terms zero-result mining needs, which the
 * 24-char bare-token cap would truncate away. The 60-char ceiling keeps
 * the stored event ("search_performed:" is 17 chars + detail) inside the
 * event column's 80-char cap in the ingest route.
 */
export const SEARCH_PERFORMED_EVENT = "search_performed";
export const SEARCH_DETAIL_MAX = 60;
const SEARCH_DETAIL_SHAPE = /^\d{1,4}_[a-z0-9][a-z0-9_]*$/;

export function parseSearchDetail(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const cleaned = v.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, SEARCH_DETAIL_MAX);
  return SEARCH_DETAIL_SHAPE.test(cleaned) ? cleaned : null;
}

/**
 * Camera identity on `camera_open` event rows (Wave 2 item 7 — the
 * "pick up where you left off" rail). The event:detail suffix cannot
 * carry a camera id (it sanitizes to [a-z0-9_], max 24 chars, while real
 * ids are long dashed slugs like
 * "sky-maldives-sunset-beach-veligandu-maldives-resort-island-5535" or
 * "CAM-9009-4833"), so the id and an ingest-time name snapshot travel as
 * their own payload fields and land in dedicated nullable PageView
 * columns. The route stamps them ONLY for camera_open events; the
 * parsers here just validate shape. Anything malformed → null, and the
 * row then looks like pre-instrumentation history.
 */
export const CAMERA_ID_MAX = 160;
export const CAMERA_NAME_MAX = 200;
const CAMERA_ID_SHAPE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function parseCameraId(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (s.length === 0 || s.length > CAMERA_ID_MAX) return null;
  return CAMERA_ID_SHAPE.test(s) ? s : null;
}

export function parseCameraName(v: unknown): string | null {
  if (typeof v !== "string") return null;
  // Strip control characters; a display label never legitimately has any.
  const s = v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, CAMERA_NAME_MAX);
  return s.length > 0 ? s : null;
}
