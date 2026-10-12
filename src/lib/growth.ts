// ── WorldEye Organic Growth Engine — hybrid integration (main-site side) ──
// The Growth Engine is a SEPARATE application. This module is the only bridge:
//   1. Outbound: fire-and-forget, HMAC-signed conversion events
//      (signup / paid_subscription / affiliate_signup) to GROWTH_WEBHOOK_URL.
//   2. Inbound: /api/growth/analytics serves aggregates to the engine,
//      authenticated with the same shared secret (GROWTH_WEBHOOK_SECRET).
// Design rules:
//   - No-ops completely when the env vars are not configured.
//   - NEVER throws and NEVER blocks the caller's main flow (checkout, webhook,
//     signup must succeed even if the growth engine is down).
//   - Sends only a SHA-256 hash of the user id — no email, no customer PII.
import { createHash, createHmac } from "crypto";

export interface GrowthUtm {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
}

export type GrowthEventType = "signup" | "paid_subscription" | "affiliate_signup";

export interface GrowthEvent extends GrowthUtm {
  type: GrowthEventType;
  /** sha256(userId) — stable reference, not reversible to PII. */
  userRef: string;
  plan?: string | null;
  amountCents?: number | null;
  currency?: string | null;
  /** Dedupe key: the receiver must ignore a second delivery with this key. */
  idempotencyKey: string;
  occurredAt: string; // ISO 8601
}

export function hashUserRef(userId: string): string {
  return createHash("sha256").update(`worldeye:${userId}`).digest("hex");
}

export function growthConfigured(): boolean {
  return Boolean(process.env.GROWTH_WEBHOOK_URL && process.env.GROWTH_WEBHOOK_SECRET);
}

/** Public dashboard URL for the /admin link. Null when not configured. */
export function growthDashboardUrl(): string | null {
  return process.env.GROWTH_DASHBOARD_URL || null;
}

/** Parse the we_utm cookie set by <AnalyticsTracker/> (first-touch UTMs). */
export function utmFromCookieHeader(cookieHeader: string | null | undefined): GrowthUtm {
  if (!cookieHeader) return {};
  const match = cookieHeader.match(/(?:^|;\s*)we_utm=([^;]+)/);
  if (!match) return {};
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1])) as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === "string" && v.length > 0 ? v.slice(0, 120) : null);
    return {
      utmSource: str(parsed.s),
      utmMedium: str(parsed.m),
      utmCampaign: str(parsed.c),
      utmContent: str(parsed.ct),
    };
  } catch {
    return {};
  }
}

export function utmFromRequest(req: Request): GrowthUtm {
  return utmFromCookieHeader(req.headers.get("cookie"));
}

/**
 * Send one conversion event to the Growth Engine. Fire-and-forget:
 * resolves to false (not configured / delivery failed) instead of throwing.
 */
export async function sendGrowthEvent(
  event: Omit<GrowthEvent, "occurredAt"> & { occurredAt?: string },
): Promise<boolean> {
  const url = process.env.GROWTH_WEBHOOK_URL;
  const secret = process.env.GROWTH_WEBHOOK_SECRET;
  if (!url || !secret) return false;
  const payload: GrowthEvent = { ...event, occurredAt: event.occurredAt ?? new Date().toISOString() };
  const body = JSON.stringify(payload);
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-worldeye-signature": `sha256=${signature}`,
      },
      body,
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false; // the growth engine being down must never break the product
  }
}

/** Verify an inbound request from the Growth Engine (analytics pull). */
export function verifyGrowthBearer(req: Request): boolean {
  const secret = process.env.GROWTH_WEBHOOK_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}
