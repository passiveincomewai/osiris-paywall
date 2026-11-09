/**
 * Support WorldEye donations — client-side helpers: the storage
 * contract, the open/timed-request events, and analytics wrappers.
 * Imported only by client components.
 */
import { trackAnalyticsEvent } from "@/components/AnalyticsTracker";
import {
  DONATE_DISMISSED_KEY,
  DONATE_OPEN_EVENT,
  DONATE_SHOWN_KEY,
  DONATE_SUPPORTER_COOKIE,
  DONATE_SUPPORTER_KEY,
  DONATE_TOAST_SHOWN_KEY,
  SUPPORTER_WINDOW_MS,
  UPGRADE_SHOWN_KEY,
  type DonateDismissMethod,
  type DonateOpenDetail,
} from "@/lib/donate/config";

/** The popup manager's generic session claim (src/lib/popups/manager):
 * timed donation prompts honour it and set it, so two prompt systems
 * never stack in one session. Explicit opens ignore it. */
export const POPUP_SESSION_CLAIM_KEY = "worldeye.popupClaimed";
export const DONATE_TIMED_REQUEST_EVENT = "worldeye:request-donate-prompt";

export function readStamp(key: string): number | null {
  try {
    const v = window.localStorage.getItem(key);
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function writeStamp(key: string, at: number): void {
  try {
    window.localStorage.setItem(key, String(at));
  } catch {
    /* storage unavailable (private mode) — prompts just re-ask */
  }
}

/** Parent mutual-exclusion contract: stamp every donation prompt show. */
export function markDonateShown(): void {
  const now = Date.now();
  writeStamp(DONATE_SHOWN_KEY, now);
  try {
    window.sessionStorage.setItem(DONATE_SHOWN_KEY, String(now));
    window.sessionStorage.setItem(POPUP_SESSION_CLAIM_KEY, "donate");
  } catch {
    /* ignore */
  }
}

export function markDonateDismissed(): void {
  writeStamp(DONATE_DISMISSED_KEY, Date.now());
}

export function markDonateToastShown(): void {
  writeStamp(DONATE_TOAST_SHOWN_KEY, Date.now());
}

/** Completion: the 12-month supporter flag (localStorage + cookie). */
export function markDonateSupporter(): void {
  const now = Date.now();
  writeStamp(DONATE_SUPPORTER_KEY, now);
  try {
    const maxAge = Math.floor(SUPPORTER_WINDOW_MS / 1000);
    document.cookie = `${DONATE_SUPPORTER_COOKIE}=${now}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

export function isDonateSupporterStamped(now: number): boolean {
  const stamp = readStamp(DONATE_SUPPORTER_KEY);
  return stamp !== null && now - stamp < SUPPORTER_WINDOW_MS;
}

export function readUpgradeShownAt(): number | null {
  const local = readStamp(UPGRADE_SHOWN_KEY);
  try {
    const v = window.sessionStorage.getItem(UPGRADE_SHOWN_KEY);
    const n = v ? Number(v) : NaN;
    if (Number.isFinite(n) && n > 0) return Math.max(local ?? 0, n);
  } catch {
    /* ignore */
  }
  return local;
}

/** Explicit open (user clicked a Support button/link/card): always
 * opens immediately — user intent wins over every suppression rule. */
export function openDonate(detail: DonateOpenDetail): void {
  window.dispatchEvent(
    new CustomEvent<DonateOpenDetail>(DONATE_OPEN_EVENT, { detail }),
  );
}

/** Timed/auto prompt request: the provider applies every suppression
 * rule before anything shows. */
export function requestTimedDonate(source: string): void {
  window.dispatchEvent(
    new CustomEvent(DONATE_TIMED_REQUEST_EVENT, { detail: { source } }),
  );
}

/** Analytics via the site's existing mechanism (AnalyticsTracker):
 * event names are the spec's; the detail is a single machine token —
 * placement for prompt_shown/dismissed-source contexts, amount_freq
 * for selection/checkout/completion (see NOTES for the mapping). */
export function trackDonate(event: string, detail?: string): void {
  try {
    trackAnalyticsEvent(event, detail);
  } catch {
    /* analytics must never break a donation */
  }
}

export type { DonateDismissMethod };
