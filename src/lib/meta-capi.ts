// Meta Conversions API (server-side events) for the WorldEye pixel /
// dataset 1785770122642831 — the server twin of components/MetaPixel.tsx.
//
// Events sent here carry the SAME event_id as their browser counterparts
// (fbq track calls made with { eventID }) so Meta deduplicates the pair:
//   - CompleteRegistration — POST /api/auth/signup (id generated there,
//     returned in the response, fired client-side by the signup form)
//   - InitiateCheckout — POST /api/checkout (same pattern)
//   - StartTrial / Purchase — the Stripe webhook, keyed by the Stripe
//     checkout session id, which is also the eventID /welcome fires.
//
// The access token comes ONLY from the META_CAPI_ACCESS_TOKEN env var
// (stored in Vercel env, never in code). Unset → every send is a clean
// no-op. Sends are fire-and-forget: errors are logged, never thrown into
// a user flow — least of all the Stripe webhook, whose subscription
// writes must not depend on Meta being reachable.
import { createHash } from "node:crypto";

export const META_PIXEL_ID = "1785770122642831";
const GRAPH_URL = `https://graph.facebook.com/v21.0/${META_PIXEL_ID}/events`;

export type MetaEventName =
  | "CompleteRegistration"
  | "InitiateCheckout"
  | "StartTrial"
  | "Purchase";

export interface MetaUserDataInput {
  email?: string | null;
  /** _fbp / _fbc first-party cookies from the browser, when available. */
  fbp?: string | null;
  fbc?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
}

export interface MetaEventInput {
  eventName: MetaEventName;
  /** Dedup key shared with the browser event of the same conversion. */
  eventId: string;
  eventSourceUrl?: string;
  userData?: MetaUserDataInput;
  /** Purchase value (major units, e.g. dollars) + ISO currency. */
  value?: number;
  currency?: string;
}

/** SHA-256 hex of the trimmed, lowercased email — Meta's em format. */
export function hashEmailForMeta(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

/** Pull the Meta match keys a server route can see off a Request:
 *  _fbp/_fbc cookies, client IP (first x-forwarded-for hop), user agent. */
export function metaUserDataFromRequest(
  req: Request,
  email?: string | null,
): MetaUserDataInput {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookie = (name: string): string | null => {
    const m = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : null;
  };
  const forwarded = req.headers.get("x-forwarded-for");
  return {
    email: email ?? null,
    fbp: cookie("_fbp"),
    fbc: cookie("_fbc"),
    clientIp: forwarded ? forwarded.split(",")[0].trim() : null,
    userAgent: req.headers.get("user-agent"),
  };
}

/** The Graph payload for one event — pure, so tests can pin its shape. */
export function buildMetaEventPayload(
  input: MetaEventInput,
  nowSeconds: number = Math.floor(Date.now() / 1000),
) {
  const u = input.userData ?? {};
  const userData: Record<string, unknown> = {};
  if (u.email) userData.em = [hashEmailForMeta(u.email)];
  if (u.fbp) userData.fbp = u.fbp;
  if (u.fbc) userData.fbc = u.fbc;
  if (u.clientIp) userData.client_ip_address = u.clientIp;
  if (u.userAgent) userData.client_user_agent = u.userAgent;

  const event: Record<string, unknown> = {
    event_name: input.eventName,
    event_time: nowSeconds,
    event_id: input.eventId,
    action_source: "website",
    user_data: userData,
  };
  if (input.eventSourceUrl) event.event_source_url = input.eventSourceUrl;
  if (typeof input.value === "number" && input.currency) {
    event.custom_data = { value: input.value, currency: input.currency };
  }
  return { data: [event] };
}

type FetchLike = (input: string, init: RequestInit) => Promise<{ ok: boolean }>;

/**
 * Send one event to the Conversions API. Returns true when Meta accepted
 * it, false for the no-token no-op and for any failure — never throws.
 */
export async function sendMetaEvent(
  input: MetaEventInput,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
): Promise<boolean> {
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  if (!token) return false;
  try {
    const res = await fetchImpl(
      `${GRAPH_URL}?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildMetaEventPayload(input)),
      },
    );
    if (!res.ok) {
      console.error(`[meta-capi] ${input.eventName} rejected (HTTP ${"status" in res ? (res as { status: unknown }).status : "?"}), event_id ${input.eventId}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[meta-capi] ${input.eventName} send failed, event_id ${input.eventId}:`, err);
    return false;
  }
}
