/**
 * Signed URLs for an alert event's stored still.
 *
 * The alert email is read by mail clients with no WorldEye session, so
 * the photo it shows needs a capability URL: an HMAC of the event id
 * under the auth secret. The token names ONE event's image and
 * nothing else — no ids can be swapped, no other route accepts it.
 * Without a configured secret there are no signed URLs (null) and the
 * image route falls back to owner-session access only.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { appBaseUrl } from "@/lib/app-url";

function secret(): string | null {
  const s = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  return s && s.trim() ? s : null;
}

export function signEventImageToken(eventId: string): string | null {
  const s = secret();
  if (!s) return null;
  return createHmac("sha256", s).update(`alert-event-image:${eventId}`).digest("base64url");
}

/** Absolute URL for an event's still, or null when signing is unavailable. */
export function eventImageUrl(eventId: string): string | null {
  const token = signEventImageToken(eventId);
  if (!token) return null;
  return `${appBaseUrl()}/api/camera-alerts/events/${encodeURIComponent(eventId)}/image?t=${token}`;
}

export function verifyEventImageToken(eventId: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const expected = signEventImageToken(eventId);
  if (!expected) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
