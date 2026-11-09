/**
 * The upgrade corner promo + plan-picker popup (Jameson's spec,
 * 2026-11-09): shared state, storage contract and analytics for
 * components/upgrade/*.
 *
 * The corner promo replaces the old TimedTrialPopup at its exact mounts
 * and keeps that component's timing/frequency discipline verbatim (the
 * decision still lives in lib/camera-ladder's timedPopupShouldShow:
 * ~75s explored or ≥3 camera opens, once per session, 3-day dismissal
 * cooldown, never for premium). This module owns only what is new:
 *
 *  - the popup's open API (a DOM event any client component can fire —
 *    the app-wide "Upgrade to PRO" buttons dispatch it instead of
 *    navigating to /pricing);
 *  - the plan/interval selection, remembered for the rest of the
 *    session (sessionStorage);
 *  - the DONATION-POPUP COORDINATION CONTRACT (shared with the
 *    "Support WorldEye" donation prompt built in parallel): the two
 *    prompts must never be on screen together, and the donation prompt
 *    must not appear within 5 minutes of the upgrade promo appearing.
 *    This side of the contract:
 *      · whenever the corner promo is shown or the popup opens, stamp
 *        `we_promo_upgrade_shown_at` (ms epoch) in localStorage AND
 *        sessionStorage;
 *      · before a TIMED show (the corner's ladder trigger), defer
 *        while `we_promo_donate_shown_at` is <5 minutes old;
 *      · user-initiated opens (Upgrade button clicks) always win —
 *        they never check the donation stamp.
 *  - analytics through the site's one mechanism (trackAnalyticsEvent):
 *    event names carry the funnel step; parameters ride in the detail
 *    token (the PageView pattern stores `event:detail`, one [a-z0-9_]
 *    token ≤24 chars), so {plan, interval} encodes as e.g. "pro_annual"
 *    and {step, method} as e.g. "s4_escape".
 *
 * Prices below are DISPLAY facts pinned to lib/billing/plans (the
 * PRICE LOCK: Lite $44.99/yr · $8.99/mo, Pro $74.99/yr · $13.99/mo,
 * Ultra $149.99/yr · $24.99/mo; monthly/annual trials are 10 days).
 * Checkout itself never reads them — /api/checkout resolves the real
 * Stripe price from the plan key server-side. The $3.75/$6.25/$12.50
 * figures are the yearly plans' monthly equivalents, always shown with
 * their "billed yearly" line, exactly as on /pricing.
 */

export type UpgradeTier = "lite" | "pro" | "ultra";
export type UpgradeInterval = "annual" | "monthly";
export type UpgradeStep = 1 | 3 | 4;
export type UpgradeTrigger = "corner" | "upgrade_button";

export interface UpgradeOpenRequest {
  step: UpgradeStep;
  plan?: UpgradeTier;
  interval?: UpgradeInterval;
  trigger: UpgradeTrigger;
  /** The camera to reopen after a completed checkout, when the popup
   *  was opened from a camera context. */
  cameraId?: string;
}

/** DOM event the popup host listens for. */
export const UPGRADE_OPEN_EVENT = "worldeye:open-upgrade";
/** DOM event fired after a completed in-popup checkout. */
export const UPGRADE_COMPLETED_EVENT = "worldeye:upgrade-completed";

// ── Storage contract ────────────────────────────────────────────────

/** localStorage + sessionStorage: ms epoch of the last upgrade
 *  corner/popup appearance (donation prompt reads this). */
export const UPGRADE_SHOWN_AT_KEY = "we_promo_upgrade_shown_at";
/** The donation prompt's stamp (written by the donation build; this
 *  side only reads it). */
export const DONATE_SHOWN_AT_KEY = "we_promo_donate_shown_at";
/** The cross-prompt exclusion window: 5 minutes. */
export const PROMO_EXCLUSION_MS = 5 * 60 * 1000;

/** sessionStorage: the remembered {plan, interval} selection. */
export const UPGRADE_SELECTION_KEY = "we_upgrade_selection";
/** sessionStorage: camera id to reopen after checkout completes. */
export const UPGRADE_PENDING_CAMERA_KEY = "we_upgrade_pending_camera";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function browserLocal(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function browserSession(): StorageLike | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function readStamp(storage: StorageLike | null, key: string): number | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function writeStamp(storage: StorageLike | null, key: string, at: number): void {
  if (!storage) return;
  try {
    storage.setItem(key, String(at));
  } catch {
    // Private mode / quota — the contract degrades to this session's
    // other storage; never let a stamp failure break the promo.
  }
}

/** Record that the upgrade corner promo or popup appeared just now. */
export function markUpgradeShown(
  at: number,
  local: StorageLike | null,
  session: StorageLike | null,
): void {
  writeStamp(local, UPGRADE_SHOWN_AT_KEY, at);
  writeStamp(session, UPGRADE_SHOWN_AT_KEY, at);
}

/** The donation prompt's last appearance across both storages. */
export function donateShownAt(
  local: StorageLike | null,
  session: StorageLike | null,
): number | null {
  const a = readStamp(local, DONATE_SHOWN_AT_KEY);
  const b = readStamp(session, DONATE_SHOWN_AT_KEY);
  if (a === null) return b;
  if (b === null) return a;
  return Math.max(a, b);
}

/**
 * Whether a TIMED upgrade show must defer for the donation contract:
 * a donation prompt shown <5 minutes ago blocks the timed show (the
 * corner simply re-checks on its next tick; nothing is consumed).
 * User-initiated opens never call this — explicit clicks always win.
 */
export function donateDeferActive(
  now: number,
  local: StorageLike | null,
  session: StorageLike | null,
): boolean {
  const at = donateShownAt(local, session);
  return at !== null && now - at < PROMO_EXCLUSION_MS;
}

// ── Selection ───────────────────────────────────────────────────────

export interface UpgradeSelection {
  plan: UpgradeTier;
  interval: UpgradeInterval;
}

export const DEFAULT_SELECTION: UpgradeSelection = { plan: "pro", interval: "annual" };

export function readSelection(session: StorageLike | null): UpgradeSelection {
  if (!session) return DEFAULT_SELECTION;
  try {
    const raw = session.getItem(UPGRADE_SELECTION_KEY);
    if (!raw) return DEFAULT_SELECTION;
    const parsed = JSON.parse(raw) as Partial<UpgradeSelection>;
    const plan =
      parsed.plan === "lite" || parsed.plan === "pro" || parsed.plan === "ultra"
        ? parsed.plan
        : DEFAULT_SELECTION.plan;
    const interval =
      parsed.interval === "annual" || parsed.interval === "monthly"
        ? parsed.interval
        : DEFAULT_SELECTION.interval;
    return { plan, interval };
  } catch {
    return DEFAULT_SELECTION;
  }
}

export function writeSelection(session: StorageLike | null, sel: UpgradeSelection): void {
  if (!session) return;
  try {
    session.setItem(UPGRADE_SELECTION_KEY, JSON.stringify(sel));
  } catch {
    // Non-fatal: the popup still works, it just won't remember.
  }
}

// ── Open API ────────────────────────────────────────────────────────

/**
 * Ask the popup host (mounted once in RootShell) to open the upgrade
 * popup. Fire-and-forget: if the host isn't mounted (a surface without
 * the root shell), nothing happens. User-initiated by definition —
 * callers are click handlers, so no donation-defer check applies.
 */
export function openUpgradePopup(req: UpgradeOpenRequest): void {
  try {
    window.dispatchEvent(new CustomEvent<UpgradeOpenRequest>(UPGRADE_OPEN_EVENT, { detail: req }));
  } catch {
    // Non-browser context — nothing to open.
  }
}

// ── Plan display facts ──────────────────────────────────────────────

export interface UpgradePlanFacts {
  tier: UpgradeTier;
  name: string;
  tagline: string;
  /** Plan accent (border / glow / button). */
  color: string;
  /** Yearly: the struck-through monthly price, e.g. "$13.99". */
  monthlyPrice: string;
  /** Yearly: monthly equivalent, e.g. "$6.25". Monthly view: the
   *  monthly price itself. */
  yearlyEquivalent: string;
  /** Yearly total, e.g. "$74.99". */
  yearlyTotal: string;
  /** Save-percent pill on Yearly (Lite 58 / Pro 55 / Ultra 50). */
  savePct: number;
  popular: boolean;
}

export const UPGRADE_PLANS: Record<UpgradeTier, UpgradePlanFacts> = {
  lite: {
    tier: "lite",
    name: "Lite",
    tagline: "Watch everything",
    color: "#22D3EE",
    monthlyPrice: "$8.99",
    yearlyEquivalent: "$3.75",
    yearlyTotal: "$44.99",
    savePct: 58,
    popular: false,
  },
  pro: {
    tier: "pro",
    name: "Pro",
    tagline: "Investigate anything",
    color: "#E4B93F",
    monthlyPrice: "$13.99",
    yearlyEquivalent: "$6.25",
    yearlyTotal: "$74.99",
    savePct: 55,
    popular: true,
  },
  ultra: {
    tier: "ultra",
    name: "Ultra",
    tagline: "See the full picture",
    color: "#A78BFA",
    monthlyPrice: "$24.99",
    yearlyEquivalent: "$12.50",
    yearlyTotal: "$149.99",
    savePct: 50,
    popular: false,
  },
};

export const UPGRADE_TIERS: UpgradeTier[] = ["lite", "pro", "ultra"];

/** The locked headline camera figure (the site's one public count). */
export const CAMERA_COUNT_LABEL = "74,229";

/** The /api/checkout plan key for a tier × interval (the route's
 *  contract, mirrored from lib/billing/trial-checkout's
 *  gridCheckoutPlan: Pro keeps its bare period names). */
export function upgradeCheckoutPlan(
  tier: UpgradeTier,
  interval: UpgradeInterval,
): "lite_monthly" | "lite_annual" | "monthly" | "annual" | "ultra_monthly" | "ultra_annual" {
  const period = interval === "annual" ? "annual" : "monthly";
  return tier === "pro" ? period : (`${tier}_${period}` as "lite_monthly" | "lite_annual" | "ultra_monthly" | "ultra_annual");
}

/** Analytics detail token for {plan, interval} — e.g. "pro_annual". */
export function selectionDetail(sel: UpgradeSelection): string {
  return `${sel.plan}_${sel.interval}`;
}
