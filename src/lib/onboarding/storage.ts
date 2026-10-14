/**
 * Onboarding persistence + A/B assignment.
 *
 * Everything lives under `we_onb_*` keys so it can never collide with the
 * app's own storage. The A/B group and the welcome outcome are mirrored
 * into cookies so the server-side analytics can stamp them onto events
 * (see events.ts). All functions tolerate missing storage (private mode,
 * SSR, tests) — onboarding must degrade to "just don't show it", never throw.
 */

export type OnbGroup = "a" | "b";

export type WelcomeStatus = "pending" | "dismissed" | "tour" | "done";

export interface OnbState {
  v: 2;
  /** Welcome panel lifecycle: pending → dismissed | tour → done. */
  welcome: WelcomeStatus;
  /** Highest tour step reached (1-4), for drop-off reporting. */
  tourStep: number;
  /** Features whose feature_first_use event has fired (once per visitor). */
  features: string[];
  /** Micro-tutorial ids already shown (never shown twice). */
  micros: string[];
  /** Conversion card: how many times shown, when last, and mute flag. */
  convShows: number;
  convLast: number;
  convMuted: boolean;
  /** First-seen timestamp for this visitor's onboarding record. */
  startedAt: number;
}

export const GROUP_KEY = "we_onb_group";
export const STATE_KEY = "we_onb_state";
const COOKIE_MAX_AGE = 180 * 86400; // 180 days

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
      /* private mode — onboarding simply won't persist */
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

export function defaultState(now: number = Date.now()): OnbState {
  return {
    v: 2,
    welcome: "pending",
    tourStep: 0,
    features: [],
    micros: [],
    convShows: 0,
    convLast: 0,
    convMuted: false,
    startedAt: now,
  };
}

export function loadState(store: KeyValueStore = defaultStore): OnbState {
  try {
    const raw = store.get(STATE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Omit<Partial<OnbState>, "v"> & { v?: number };
    if (parsed.v !== 1 && parsed.v !== 2) return defaultState();
    // v1 → v2 migration (2026-10-14): the tour was shortened from 6 steps
    // to 4. Everything a v1 visitor earned carries over untouched —
    // welcome outcome, first-use features, seen micros, conversion
    // cadence — and the only step-shaped field, the persisted high-water
    // mark, clamps to the new final step. Live tour position is never
    // resumed from storage (startTour always begins at step 1), so no
    // v1 visitor can land mid-tour or behind a stuck overlay.
    const step =
      typeof parsed.tourStep === "number" && Number.isFinite(parsed.tourStep)
        ? Math.min(Math.max(0, parsed.tourStep), 4)
        : 0;
    return { ...defaultState(), ...parsed, v: 2, tourStep: step };
  } catch {
    return defaultState();
  }
}

export function saveState(state: OnbState, store: KeyValueStore = defaultStore, cookies: CookieJar = defaultCookies): void {
  try {
    store.set(STATE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  // Mirror the welcome outcome so the server can stamp it without a lookup.
  cookies.set("we_onb_welcome", state.welcome);
}

/**
 * Return the visitor's A/B group, assigning one on first visit.
 * 50/50 split; persisted in localStorage + cookie.
 * QA overrides: `?onb_group=a|b` forces + persists a group,
 * `?onb_reset=1` clears onboarding state (group kept unless re-forced).
 */
export function assignGroup(
  rng: () => number = Math.random,
  store: KeyValueStore = defaultStore,
  cookies: CookieJar = defaultCookies,
  search: string = typeof window !== "undefined" ? window.location.search : "",
): OnbGroup {
  try {
    const q = new URLSearchParams(search);
    const forced = q.get("onb_group");
    if (forced === "a" || forced === "b") {
      store.set(GROUP_KEY, forced);
      cookies.set(GROUP_KEY, forced);
      return forced;
    }
    const existing = store.get(GROUP_KEY);
    if (existing === "a" || existing === "b") {
      cookies.set(GROUP_KEY, existing);
      return existing;
    }
    const group: OnbGroup = rng() < 0.5 ? "a" : "b";
    store.set(GROUP_KEY, group);
    cookies.set(GROUP_KEY, group);
    return group;
  } catch {
    return "a"; // fail closed: control group, no proactive UI
  }
}

/** Handle `?onb_reset=1` for QA — clears state + welcome cookie mirror. */
export function maybeResetOnboarding(
  store: KeyValueStore = defaultStore,
  search: string = typeof window !== "undefined" ? window.location.search : "",
): boolean {
  try {
    if (new URLSearchParams(search).get("onb_reset") === "1") {
      store.set(STATE_KEY, "");
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * Conversion-card cadence (documented choice): eligible when the visitor
 * completed the tour OR used ≥3 distinct free features; shown at most once
 * per 7 days and at most twice ever; never after the visitor clicked
 * through to Pro (muted) — and never for premium users (checked by caller).
 */
export const CONVERSION_MIN_FEATURES = 3;
export const CONVERSION_MAX_SHOWS = 2;
export const CONVERSION_GAP_MS = 7 * 86400 * 1000;

export function conversionEligible(
  state: OnbState,
  distinctFreeFeatures: number,
  now: number = Date.now(),
): boolean {
  if (state.convMuted) return false;
  if (state.convShows >= CONVERSION_MAX_SHOWS) return false;
  if (state.convLast > 0 && now - state.convLast < CONVERSION_GAP_MS) return false;
  return state.welcome === "done" || distinctFreeFeatures >= CONVERSION_MIN_FEATURES;
}
