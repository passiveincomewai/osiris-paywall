/**
 * Post-signup trial prompt + dismissible trial banner (Conversion
 * Wave 2, F3) — the pure decisions and the localStorage bookkeeping
 * behind components/TrialPrompt. The component is a thin shell over
 * these functions; every rule is pinned by trial-prompt.test.ts.
 *
 * Who qualifies: a signed-in FREE user whose session subscriptionStatus
 * is exactly "none" — no Subscription row has ever existed for them.
 * Trialing folds to "active" in the session
 * (lib/subscription-status), and anyone who once subscribed reads
 * canceled / past_due / …, so "none" is precisely "never trialed, not
 * paying". Team-granted premium reads as premium identity, never free,
 * so org members are excluded by the same check.
 *
 * Nothing here touches subscription state: the prompt's CTA starts the
 * ordinary checkout flow (startPlanCheckout), and the Stripe webhook
 * remains the sole subscription write path. All state lives in
 * localStorage on the visitor's own device.
 */
import type { TrialPlan } from "./trial-checkout";

export const TRIAL_PROMPT_STORAGE_KEYS = {
  /** Set by the signup form the moment an account is created. */
  pendingWelcome: "worldeye:pending-welcome",
  /** Set once the welcome prompt has been shown (it shows once, ever). */
  welcomed: "worldeye:trial-welcomed",
  /** Timestamp of the last banner/modal dismissal. */
  bannerDismissedAt: "worldeye:trial-banner-dismissed-at",
  /** The plan the visitor last selected on /pricing's toggle. */
  lastViewedPlan: "worldeye:last-viewed-plan",
} as const;

/** After any dismissal the surfaces stay away for a week — a cooldown,
 *  not a per-page nag (BRIEF F3). */
export const TRIAL_BANNER_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

/** Surfaces where a trial prompt would be noise stacked on intent:
 *  already converting (/pricing, /checkout), managing the account
 *  (/settings, /admin), or mid-auth/claim (/signin, /signup, /welcome). */
export const TRIAL_PROMPT_EXCLUDED_PREFIXES = [
  "/pricing",
  "/checkout",
  "/settings",
  "/admin",
  "/signin",
  "/signup",
  "/welcome",
] as const;

export type TrialPromptSurface = "welcome" | "banner" | "none";

export interface TrialPromptInput {
  /** Session identity state from lib/premium-entitlement. */
  identityState: "anonymous" | "free" | "premium" | "unknown";
  /** The session's own subscriptionStatus; "none" = no row ever. */
  subscriptionStatus: string | null | undefined;
  pathname: string;
  /** The signup form's flag is present on this device. */
  pendingWelcome: boolean;
  /** The welcome prompt has already been shown on this device. */
  welcomed: boolean;
  /** Last dismissal timestamp (ms), or null if never dismissed. */
  bannerDismissedAt: number | null;
  now: number;
}

export function isTrialPromptPathExcluded(pathname: string): boolean {
  return TRIAL_PROMPT_EXCLUDED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/** Only never-trialed free accounts qualify — see the module comment. */
export function trialPromptEligible(
  input: Pick<TrialPromptInput, "identityState" | "subscriptionStatus">,
): boolean {
  return input.identityState === "free" && input.subscriptionStatus === "none";
}

/**
 * Which surface (if any) shows now. The welcome prompt wins over the
 * banner exactly once per signup; the banner is what remains for
 * eligible users who skipped it, and any dismissal silences both for
 * the cooldown.
 */
export function decideTrialPromptSurface(
  input: TrialPromptInput,
): TrialPromptSurface {
  if (!trialPromptEligible(input)) return "none";
  if (isTrialPromptPathExcluded(input.pathname)) return "none";
  if (input.pendingWelcome && !input.welcomed) return "welcome";
  if (
    input.bannerDismissedAt !== null &&
    input.now - input.bannerDismissedAt < TRIAL_BANNER_COOLDOWN_MS
  ) {
    return "none";
  }
  return "banner";
}

/**
 * The plan the prompt preselects: the one the visitor last viewed on
 * /pricing, if it's a real trial plan — else Monthly (BRIEF F3's
 * default).
 */
export function resolveTrialPromptPlan(
  lastViewed: string | null | undefined,
): TrialPlan {
  return lastViewed === "weekly" || lastViewed === "annual"
    ? lastViewed
    : "monthly";
}

/* ── Storage ────────────────────────────────────────────────────────
 * Every helper takes an injectable storage (tests pass a fake) and
 * fails soft: private-mode browsers and disabled storage turn the
 * whole feature off silently rather than throwing into the layout. */

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readKey(
  key: string,
  storage: StorageLike | null | undefined,
): string | null {
  const s = storage === undefined ? defaultStorage() : storage;
  if (!s) return null;
  try {
    return s.getItem(key);
  } catch {
    return null;
  }
}

function writeKey(
  key: string,
  value: string,
  storage: StorageLike | null | undefined,
): void {
  const s = storage === undefined ? defaultStorage() : storage;
  if (!s) return;
  try {
    s.setItem(key, value);
  } catch {
    // Storage unavailable — the prompt simply won't persist state.
  }
}

function removeKey(
  key: string,
  storage: StorageLike | null | undefined,
): void {
  const s = storage === undefined ? defaultStorage() : storage;
  if (!s) return;
  try {
    s.removeItem(key);
  } catch {
    // Nothing to clean up if storage itself is unreachable.
  }
}

/** Called by the signup form the moment an account is created, on both
 *  signup paths (email + Google), so the welcome prompt can greet the
 *  user at their first signed-in page view. */
export function markPendingWelcome(storage?: StorageLike | null): void {
  writeKey(TRIAL_PROMPT_STORAGE_KEYS.pendingWelcome, "1", storage);
}

export function readPendingWelcome(storage?: StorageLike | null): boolean {
  return readKey(TRIAL_PROMPT_STORAGE_KEYS.pendingWelcome, storage) === "1";
}

export function clearPendingWelcome(storage?: StorageLike | null): void {
  removeKey(TRIAL_PROMPT_STORAGE_KEYS.pendingWelcome, storage);
}

export function markWelcomed(storage?: StorageLike | null): void {
  writeKey(TRIAL_PROMPT_STORAGE_KEYS.welcomed, "1", storage);
}

export function readWelcomed(storage?: StorageLike | null): boolean {
  return readKey(TRIAL_PROMPT_STORAGE_KEYS.welcomed, storage) === "1";
}

/** Any dismissal (banner X, welcome "Maybe later") starts the cooldown. */
export function dismissTrialSurfaces(
  now: number,
  storage?: StorageLike | null,
): void {
  writeKey(TRIAL_PROMPT_STORAGE_KEYS.bannerDismissedAt, String(now), storage);
}

export function readBannerDismissedAt(
  storage?: StorageLike | null,
): number | null {
  const raw = readKey(TRIAL_PROMPT_STORAGE_KEYS.bannerDismissedAt, storage);
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Called by /pricing's billing toggle whenever a plan is selected. */
export function recordLastViewedPlan(
  plan: string,
  storage?: StorageLike | null,
): void {
  if (plan !== "weekly" && plan !== "monthly" && plan !== "annual") return;
  writeKey(TRIAL_PROMPT_STORAGE_KEYS.lastViewedPlan, plan, storage);
}

export function readLastViewedPlan(storage?: StorageLike | null): TrialPlan {
  return resolveTrialPromptPlan(
    readKey(TRIAL_PROMPT_STORAGE_KEYS.lastViewedPlan, storage),
  );
}
