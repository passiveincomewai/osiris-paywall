/**
 * Persistent first-party visitor ID — the client half.
 *
 * The analytics sessionId (src/components/AnalyticsTracker.tsx) is
 * per-visit: it lives in sessionStorage and dies with the tab, so PageView
 * rows can count visits but can never say whether the same visitor came
 * back on another day — the true return rate is unmeasurable from it
 * (verified 2026-10-28: of 6,680 sessions, only 8 spanned >24h, all of
 * them long-lived tabs, not returns). This module mints the missing
 * piece: a random UUID, generated once per browser profile, persisted in
 * localStorage under `we_vid`, and sent with every first-party analytics
 * payload so the ingest route can stamp it onto PageView.visitorId.
 *
 * Privacy discipline:
 *  - The ID is pure randomness (crypto.randomUUID, else random bytes).
 *    It is NOT derived from the user agent, IP address, screen, fonts,
 *    canvas, or any other fingerprinting input, and it is only ever sent
 *    to the site's own /api/analytics/track endpoint.
 *  - It follows exactly the same send conditions as sessionId — the
 *    first-party tracker has no separate opt-out surface, and this ID
 *    neither adds nor removes one.
 *  - Storage failures (private mode, blocked storage) degrade to an
 *    ephemeral per-page ID that is never persisted; the caller memoizes
 *    it so one page's events stay grouped. There is deliberately no
 *    shared fallback value — a sentinel would merge every
 *    storage-blocked visitor into one fake "returning" visitor.
 *  - Clearing the site's browser data deletes the ID with everything
 *    else; the next visit simply mints a fresh one.
 *
 * The value is read lazily (first analytics payload of the page), never
 * during render, so it cannot delay first paint or globe load.
 */

export const VISITOR_ID_KEY = "we_vid";

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when `v` is a canonical UUID string (the only shape we store/send). */
export function isVisitorId(v: unknown): v is string {
  return typeof v === "string" && UUID_SHAPE.test(v);
}

/** Minimal storage surface, injected in tests (same pattern as
 *  src/lib/onboarding/storage.ts). Implementations may throw on blocked
 *  storage; getVisitorId tolerates that. */
export interface VisitorIdStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

const defaultStore: VisitorIdStore = {
  get(key) {
    try {
      return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
    } catch {
      /* private mode — the ID just won't persist */
    }
  },
};

/** A fresh random UUID. Randomness only — no device/browser inputs. */
export function newVisitorId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through to the byte-wise path */
  }
  const bytes = new Uint8Array(16);
  try {
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
      crypto.getRandomValues(bytes);
    } else {
      throw new Error("no CSPRNG");
    }
  } catch {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  // RFC 4122 version 4 / variant bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * This browser profile's visitor ID: the persisted one when present and
 * well-formed, otherwise a freshly minted one (persisted best-effort).
 * Never throws. When storage itself is unreadable, returns an ephemeral
 * ID that will not survive the page — callers that fire several payloads
 * per page should memoize the result (AnalyticsTracker does).
 */
export function getVisitorId(store: VisitorIdStore = defaultStore): string {
  let stored: string | null = null;
  try {
    stored = store.get(VISITOR_ID_KEY);
  } catch {
    return newVisitorId(); // storage unreadable — ephemeral, unpersistable
  }
  if (isVisitorId(stored)) return stored;
  const fresh = newVisitorId();
  try {
    store.set(VISITOR_ID_KEY, fresh);
  } catch {
    /* persistence is best-effort; the in-page value is still consistent */
  }
  return fresh;
}
