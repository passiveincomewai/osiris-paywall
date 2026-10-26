/**
 * VIP camera alerts — the globe camera viewer's pure helpers.
 *
 * Everything here is a pure function over the shapes the client already
 * holds (a raw catalogue record, the /api/camera-alerts payloads), so
 * the button's create / dedupe / gating behaviour is testable without a
 * DOM and can never drift from the service it talks to:
 *
 *  - The only rule the engine can express is "watch this camera's still
 *    photo for a plain-language condition" (lib/camera-alerts/checker.ts:
 *    a missing still is verdict 'unknown', which never alerts), with
 *    email and/or in-app channels. There are no offline/online rule
 *    types, so none are offered.
 *  - Creation truth lives in service.ts: the camera must exist in the
 *    catalogue AND have a still (stillOf in lib/vision/frames.ts), the
 *    condition is free text (validateCondition), at most
 *    MAX_ACTIVE_ALERT_RULES active rules. These helpers mirror that
 *    contract only to pre-warn honestly — the server stays the truth
 *    and its own error strings are surfaced verbatim.
 */

/** The condition examples the settings and dashboard forms offer. */
export const ALERT_CONDITION_EXAMPLES = [
  "snow on the road",
  "flooding",
  "heavy traffic",
  "a crowd of people",
  "fog",
];

export interface AlertRuleLike {
  id: string;
  cameraId: string;
  condition: string;
  active: boolean;
  emailEnabled: boolean;
  inAppEnabled: boolean;
}

const HTTP_URL = /^https?:\/\/[^\s]+$/i;

/**
 * The still image a raw catalogue record offers, or null — a deliberate
 * mirror of stillOf() in lib/vision/frames.ts: only a 'jpg' record
 * (stream_type defaults to 'jpg') carrying a feed_url has a still, and
 * a camera-proxy feed unwraps to its inner URL. The record the viewer
 * holds is the same raw record the catalogue serves.
 */
export function cameraRecordStill(
  camera: Record<string, unknown> | null | undefined,
): string | null {
  if (!camera || typeof camera !== "object") return null;
  const type =
    typeof camera.stream_type === "string" && camera.stream_type ? camera.stream_type : "jpg";
  if (type !== "jpg") return null;
  const feed = typeof camera.feed_url === "string" ? camera.feed_url : "";
  if (!feed) return null;
  if (feed.startsWith("/api/cctv/proxy?")) {
    const inner = new URLSearchParams(feed.slice(feed.indexOf("?") + 1)).get("url") ?? "";
    return HTTP_URL.test(inner) ? inner : null;
  }
  return HTTP_URL.test(feed) ? feed : null;
}

/** Can the alert service accept a rule for this camera at all? */
export function cameraAlertWatchable(
  camera: Record<string, unknown> | null | undefined,
): boolean {
  return cameraRecordStill(camera) !== null;
}

/**
 * The member's existing rule for this camera, or null. Any state counts
 * — a paused rule is still their alert for this camera and creating a
 * second one would duplicate it.
 */
export function ruleForCamera<T extends { cameraId: string }>(
  rules: readonly T[] | null | undefined,
  cameraId: string | number | null | undefined,
): T | null {
  if (!rules || cameraId === null || cameraId === undefined || cameraId === "") return null;
  const want = String(cameraId);
  return rules.find((r) => r.cameraId === want) ?? null;
}

export interface AlertsReadyView {
  vip: boolean;
  rules: AlertRuleLike[];
  activeCount: number;
  maxActive: number;
}

export type AlertsLoadState =
  | { kind: "signed-out" }
  | { kind: "ready"; view: AlertsReadyView }
  | { kind: "error" };

/** Interpret a GET /api/camera-alerts response (401 = signed out). */
export function interpretAlertsGet(status: number, body: unknown): AlertsLoadState {
  if (status === 401) return { kind: "signed-out" };
  if (status !== 200 || !body || typeof body !== "object") return { kind: "error" };
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.rules)) return { kind: "error" };
  return {
    kind: "ready",
    view: {
      vip: b.vip === true,
      rules: b.rules as AlertRuleLike[],
      activeCount: typeof b.activeCount === "number" ? b.activeCount : 0,
      maxActive: typeof b.maxActive === "number" ? b.maxActive : 10,
    },
  };
}

export type CreateOutcome =
  | { kind: "created"; rule: AlertRuleLike }
  | { kind: "signin" }
  | { kind: "vip" }
  | { kind: "error"; message: string };

/**
 * Interpret a POST /api/camera-alerts response. The service's own error
 * strings (the cap message, the stream-without-stills refusal, …) pass
 * through verbatim; the route's machine codes (signin / vip) map to
 * states the panel renders as the honest upgrade path.
 */
export function interpretCreateResult(status: number, body: unknown): CreateOutcome {
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  if (status === 201 && b.rule && typeof b.rule === "object") {
    return { kind: "created", rule: b.rule as AlertRuleLike };
  }
  if (status === 401) return { kind: "signin" };
  if (status === 403) return { kind: "vip" };
  const msg =
    typeof b.error === "string" && b.error && b.error !== "vip" && b.error !== "signin"
      ? b.error
      : "Couldn't create that alert.";
  return { kind: "error", message: msg };
}

export type DeleteOutcome = { kind: "deleted" } | { kind: "error"; message: string };

/** Interpret a DELETE /api/camera-alerts/[id] response. */
export function interpretDeleteResult(status: number, body: unknown): DeleteOutcome {
  if (status === 200) return { kind: "deleted" };
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const msg =
    typeof b.error === "string" && b.error && b.error !== "signin"
      ? b.error
      : "Couldn't remove that alert.";
  return { kind: "error", message: msg };
}
