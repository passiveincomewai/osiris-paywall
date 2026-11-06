/**
 * Browser push — pure logic: subscription-input validation and payload
 * shaping. Kept free of the DB, env and the web-push library so it is
 * unit-testable and safe to import anywhere. The impure halves live in
 * config.ts (VAPID env), service.ts (subscription storage) and
 * send.ts (delivery).
 */

/** Push services reject endpoints that are not https URLs. */
const MAX_ENDPOINT_LENGTH = 1024;
/** p256dh is an uncompressed P-256 point: 65 bytes → 88 base64url chars. */
const MAX_P256DH_LENGTH = 120;
/** auth is a 16-byte secret → ~24 base64url chars; allow generous slack. */
const MAX_AUTH_LENGTH = 64;

export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export type SubscriptionValidation =
  | { ok: true; value: PushSubscriptionInput }
  | { ok: false; error: string };

/**
 * Validate the JSON a browser's PushSubscription.toJSON() produces:
 * { endpoint, keys: { p256dh, auth } }. Anything else is refused — the
 * stored keys go straight to the push service, so shape is enforced
 * here, once.
 */
export function validateSubscriptionInput(input: unknown): SubscriptionValidation {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "Subscription must be an object." };
  }
  const sub = input as { endpoint?: unknown; keys?: unknown };
  if (typeof sub.endpoint !== "string" || sub.endpoint.length === 0) {
    return { ok: false, error: "Subscription is missing its endpoint." };
  }
  if (sub.endpoint.length > MAX_ENDPOINT_LENGTH) {
    return { ok: false, error: "Subscription endpoint is too long." };
  }
  let url: URL;
  try {
    url = new URL(sub.endpoint);
  } catch {
    return { ok: false, error: "Subscription endpoint is not a URL." };
  }
  if (url.protocol !== "https:") {
    return { ok: false, error: "Subscription endpoint must be https." };
  }
  if (typeof sub.keys !== "object" || sub.keys === null) {
    return { ok: false, error: "Subscription is missing its keys." };
  }
  const keys = sub.keys as { p256dh?: unknown; auth?: unknown };
  if (typeof keys.p256dh !== "string" || keys.p256dh.length === 0 || keys.p256dh.length > MAX_P256DH_LENGTH) {
    return { ok: false, error: "Subscription p256dh key is missing or malformed." };
  }
  if (typeof keys.auth !== "string" || keys.auth.length === 0 || keys.auth.length > MAX_AUTH_LENGTH) {
    return { ok: false, error: "Subscription auth secret is missing or malformed." };
  }
  return { ok: true, value: { endpoint: sub.endpoint, p256dh: keys.p256dh, auth: keys.auth } };
}

export interface PushMessage {
  title: string;
  body: string;
  /** Same-origin path the notification opens on click. */
  url?: string;
  /** Notifications sharing a tag replace each other instead of stacking. */
  tag?: string;
}

/** Push bodies are truncated by the OS at a few hundred characters. */
const MAX_BODY_LENGTH = 240;

export function buildPushPayload(message: PushMessage): string {
  const body = message.body.length > MAX_BODY_LENGTH
    ? `${message.body.slice(0, MAX_BODY_LENGTH - 1)}…`
    : message.body;
  const url = message.url && message.url.startsWith("/") ? message.url : "/";
  return JSON.stringify({
    title: message.title || "WorldEye",
    body,
    url,
    ...(message.tag ? { tag: message.tag } : {}),
  });
}

/** A push-service status that means the subscription is gone for good. */
export function isDeadSubscriptionStatus(statusCode: number | undefined): boolean {
  return statusCode === 404 || statusCode === 410;
}
