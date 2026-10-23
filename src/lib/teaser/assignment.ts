/**
 * Teaser A/B test (Conversion Wave 2, F9) — sticky visitor assignment.
 *
 * Mirrors the onboarding A/B pattern (src/lib/onboarding/storage.ts):
 * the arm persists in localStorage AND a cookie mirror (180 days), all
 * functions tolerate missing/throwing storage, and every failure mode
 * degrades to "no test" — a marketing experiment must never break or
 * nag the homepage.
 *
 * Assignment rules:
 *  - Flag off -> null (no storage writes at all).
 *  - An existing arm is returned unchanged (sticky across visits).
 *  - A visitor drawn outside the enrollment percentage persists an
 *    "off" marker, so raising the percentage mid-run never re-draws
 *    them into the test (experiment integrity).
 *  - QA overrides: `?teaser_arm=treatment|control` forces + persists
 *    an arm; `?teaser_reset=1` clears arm + dismissal (see
 *    maybeResetTeaser).
 */

import type { TeaserConfig } from "./config";

export type TeaserArm = "treatment" | "control";

export const ARM_KEY = "we_teaser_arm";
export const DISMISSED_KEY = "we_teaser_dismissed_at";

/** Stored value for "drawn, but outside the enrollment percentage". */
const NOT_ENROLLED = "off";

const COOKIE_MAX_AGE = 180 * 86400; // 180 days, same as onboarding

export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

export interface CookieJar {
  set(name: string, value: string): void;
}

const defaultStore: KeyValueStore = {
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
      /* private mode — the teaser simply won't persist */
    }
  },
};

const defaultCookies: CookieJar = {
  set(name, value) {
    try {
      if (typeof document !== "undefined") {
        document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
      }
    } catch {
      /* ignore */
    }
  },
};

function currentSearch(): string {
  return typeof window !== "undefined" ? window.location.search : "";
}

export interface ArmResolution {
  arm: TeaserArm;
  /** True when this call made the assignment (first visit / QA force). */
  fresh: boolean;
}

/**
 * Return the visitor's teaser arm, assigning one on first eligible
 * visit. Null = not in the test (flag off, drawn outside enrollment,
 * or storage unavailable).
 */
export function resolveTeaserArm(
  config: TeaserConfig,
  rng: () => number = Math.random,
  store: KeyValueStore = defaultStore,
  cookies: CookieJar = defaultCookies,
  search: string = currentSearch(),
): ArmResolution | null {
  try {
    if (!config.enabled) return null;
    const q = new URLSearchParams(search);
    const forced = q.get("teaser_arm");
    if (forced === "treatment" || forced === "control") {
      const prev = store.get(ARM_KEY);
      store.set(ARM_KEY, forced);
      cookies.set(ARM_KEY, forced);
      return { arm: forced, fresh: prev !== forced };
    }
    const existing = store.get(ARM_KEY);
    if (existing === "treatment" || existing === "control") {
      cookies.set(ARM_KEY, existing);
      return { arm: existing, fresh: false };
    }
    if (existing === NOT_ENROLLED) return null;
    // Enrollment draw first: outside the percentage, the visitor is
    // permanently out for this run (marker persisted, see header).
    if (rng() * 100 >= config.enrollPct) {
      store.set(ARM_KEY, NOT_ENROLLED);
      cookies.set(ARM_KEY, NOT_ENROLLED);
      return null;
    }
    const arm: TeaserArm = rng() < 0.5 ? "treatment" : "control";
    store.set(ARM_KEY, arm);
    cookies.set(ARM_KEY, arm);
    return { arm, fresh: true };
  } catch {
    return null; // fail closed: no test, homepage untouched
  }
}

/**
 * Dismissal memory: once dismissed, the card never shows again for
 * this visitor (BRIEF F9 — remembered so it does not nag on every
 * visit). If storage is unreadable we report "dismissed": when we
 * cannot remember, the safe answer is not to nag.
 */
export function isTeaserDismissed(store: KeyValueStore = defaultStore): boolean {
  try {
    return store.get(DISMISSED_KEY) != null;
  } catch {
    return true;
  }
}

export function recordTeaserDismissal(
  store: KeyValueStore = defaultStore,
  now: number = Date.now(),
): void {
  try {
    store.set(DISMISSED_KEY, String(now));
  } catch {
    /* ignore — worst case the card can reappear next visit */
  }
}

/** Handle `?teaser_reset=1` for QA — clears arm + dismissal. */
export function maybeResetTeaser(
  store: KeyValueStore = defaultStore,
  search: string = currentSearch(),
): boolean {
  try {
    if (new URLSearchParams(search).get("teaser_reset") === "1") {
      store.set(ARM_KEY, "");
      store.set(DISMISSED_KEY, "");
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * Anonymous test for the value returned by /api/auth/session (the same
 * endpoint lib/premium-entitlement reads): anonymous iff there is no
 * session user. Auth.js answers `null` (v5) or `{}` (v4) when signed
 * out — both are anonymous. A non-object payload is malformed, so it
 * fails closed (NOT anonymous -> no teaser).
 */
export function isAnonymousSession(session: unknown): boolean {
  if (session === null || session === undefined) return true;
  if (typeof session !== "object") return false;
  return !(session as { user?: unknown }).user;
}
