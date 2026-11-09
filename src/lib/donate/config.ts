/**
 * Support WorldEye donations — pure configuration and decision logic.
 *
 * Everything in this module is side-effect free so the validation,
 * storage-key contract and prompt-suppression rules are unit-testable
 * (config.test.ts). The React components and the API route import
 * from here; nothing here imports React, Stripe, or the DB.
 *
 * Design rules carried from the spec (2026-11-09):
 *  - Donations are gifts, never purchases: nothing in this feature
 *    grants Lite/Pro/Ultra access, and donations are never described
 *    as tax-deductible (WorldEye is not a registered charity).
 *  - Amounts are whole dollars, $1–$1,000. Presets are resolved to
 *    Stripe prices BY LOOKUP KEY (the products are owner-created in
 *    the Stripe dashboard); custom amounts use session-time price_data.
 *  - Mutual exclusion with the upgrade popup build (parent-issued
 *    contract): shared storage keys `we_promo_upgrade_shown_at` and
 *    `we_promo_donate_shown_at` hold ms-epoch timestamps. A donation
 *    prompt never shows while an upgrade prompt is open or within
 *    5 minutes after one showed; explicit user clicks always open.
 */

export type DonateFrequency = "once" | "monthly";

/** The four preset amounts (whole dollars) and their tile order. */
export const DONATE_PRESET_AMOUNTS = [5, 10, 25, 50] as const;
/** Corner-toast chips (the toast offers three amounts). */
export const DONATE_TOAST_AMOUNTS = [5, 10, 25] as const;
/** Preselected amount everywhere (the $10 "Supporter" tile). */
export const DONATE_DEFAULT_AMOUNT = 10;

export const DONATE_MIN_AMOUNT = 1;
export const DONATE_MAX_AMOUNT = 1000;

/** Stripe lookup keys for the owner-created donation prices. */
export const DONATE_LOOKUP_KEYS: Record<DonateFrequency, Record<number, string>> = {
  once: {
    5: "donate_once_5",
    10: "donate_once_10",
    25: "donate_once_25",
    50: "donate_once_50",
  },
  monthly: {
    5: "donate_monthly_5",
    10: "donate_monthly_10",
    25: "donate_monthly_25",
    50: "donate_monthly_50",
  },
};

export function isDonatePreset(amount: number): boolean {
  return (DONATE_PRESET_AMOUNTS as readonly number[]).includes(amount);
}

/** Lookup key for a preset, or null for a custom amount. */
export function donateLookupKey(
  frequency: DonateFrequency,
  amount: number,
): string | null {
  return DONATE_LOOKUP_KEYS[frequency]?.[amount] ?? null;
}

/**
 * Validate a donor amount. Whole dollars only, $1–$1,000 — anything
 * else is rejected (never rounded or clamped: a donor must see and
 * pay exactly the number they chose).
 */
export function validateDonateAmount(
  raw: unknown,
): { ok: true; amount: number } | { ok: false; error: string } {
  const n = typeof raw === "string" ? Number(raw) : raw;
  if (typeof n !== "number" || !Number.isFinite(n)) {
    return { ok: false, error: "Amount must be a number." };
  }
  if (!Number.isInteger(n)) {
    return { ok: false, error: "Amounts are whole dollars only." };
  }
  if (n < DONATE_MIN_AMOUNT) {
    return { ok: false, error: `Minimum donation is $${DONATE_MIN_AMOUNT}.` };
  }
  if (n > DONATE_MAX_AMOUNT) {
    return { ok: false, error: `Maximum donation is $${DONATE_MAX_AMOUNT}.` };
  }
  return { ok: true, amount: n };
}

export function parseDonateFrequency(raw: unknown): DonateFrequency | null {
  return raw === "once" || raw === "monthly" ? raw : null;
}

/** Placement tokens — used as Stripe metadata.source, the Donation
 * row's source, and the analytics detail. Machine tokens only. */
export const DONATE_SOURCES = [
  "gods_eye_view",
  "gods_eye_view_hero",
  "blog",
  "live_webcams",
  "cameras_country",
  "about",
  "research_access",
  "footer_strip",
  "globe_toast",
  "support_page",
  "inline_card",
] as const;
export type DonateSource = (typeof DONATE_SOURCES)[number];

export function parseDonateSource(raw: unknown): string {
  return typeof raw === "string" &&
    (DONATE_SOURCES as readonly string[]).includes(raw)
    ? raw
    : "inline_card";
}

/** Parse + validate a POST /api/donate/session body. */
export function parseDonateSessionRequest(body: unknown):
  | { ok: true; amount: number; frequency: DonateFrequency; source: string }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body." };
  }
  const b = body as Record<string, unknown>;
  const frequency = parseDonateFrequency(b.frequency);
  if (!frequency) {
    return { ok: false, error: "Frequency must be 'once' or 'monthly'." };
  }
  const amount = validateDonateAmount(b.amount);
  if (!amount.ok) return amount;
  return {
    ok: true,
    amount: amount.amount,
    frequency,
    source: parseDonateSource(b.source),
  };
}

/* ------------------------------------------------------------------ */
/* Storage contract                                                    */
/* ------------------------------------------------------------------ */

/** Set on completion; presence (within 12 months) stops all prompts. */
export const DONATE_SUPPORTER_KEY = "we_supporter";
/** Generic cookie mirror of the supporter flag (12-month Max-Age). */
export const DONATE_SUPPORTER_COOKIE = "we_supporter";
/** Last dismissal of a donation prompt (14-day re-prompt window). */
export const DONATE_DISMISSED_KEY = "we_donate_dismissed_at";
/** Last globe-toast show (7-day cap). */
export const DONATE_TOAST_SHOWN_KEY = "we_donate_toast_shown_at";
/** Parent contract: written whenever OUR prompt/popup shows. */
export const DONATE_SHOWN_KEY = "we_promo_donate_shown_at";
/** Parent contract: written by the upgrade build when its corner
 * promo shows or its popup opens. */
export const UPGRADE_SHOWN_KEY = "we_promo_upgrade_shown_at";
/** Session-scoped twin of the shown-stamp (survives soft navigations). */
export const DONATE_SHOWN_SESSION_KEY = "we_promo_donate_shown_at";

export const MINUTE_MS = 60_000;
export const MUTUAL_EXCLUSION_MS = 5 * MINUTE_MS;
export const DISMISS_WINDOW_MS = 14 * 24 * 60 * MINUTE_MS;
export const TOAST_WINDOW_MS = 7 * 24 * 60 * MINUTE_MS;
export const SUPPORTER_WINDOW_MS = 365 * 24 * 60 * MINUTE_MS;
/** Globe toast dwell: 20 minutes in one app session. */
export const TOAST_DWELL_MS = 20 * MINUTE_MS;

/** Paths where donation prompts never appear (spec §6 + provider). */
export const DONATE_EXCLUDED_PATH_PREFIXES = [
  "/pricing",
  "/enterprise",
  "/team",
  "/checkout",
  "/account",
  "/settings",
  "/admin",
  "/signin",
  "/signup",
  "/welcome",
  "/support",
  "/vip",
  "/auth",
] as const;

export function isDonateExcludedPath(pathname: string): boolean {
  return DONATE_EXCLUDED_PATH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

/* ------------------------------------------------------------------ */
/* Prompt decision (pure)                                              */
/* ------------------------------------------------------------------ */

export interface DonatePromptContext {
  now: number;
  /** "premium" = paid subscriber, "free" = signed-in free,
   *  "anonymous"/"unknown" = not (provably) paid. Only "premium"
   *  suppresses — an unreadable session must not hide the feature
   *  from a genuinely free visitor, matching checkPremiumEntitlement's
   *  fail-soft contract. Paid users are additionally protected
   *  server-side: prompts are cosmetic, checkout is user-initiated. */
  identityState: "anonymous" | "free" | "premium" | "unknown";
  /** Account-level supporter flag from the session claims. */
  accountSupporter: boolean;
  /** we_supporter localStorage stamp (ms epoch) or null. */
  supporterStamp: number | null;
  dismissedAt: number | null;
  upgradeShownAt: number | null;
  /** Any dialog currently open (ours, the upgrade popup, any other). */
  anyDialogOpen: boolean;
  /** The upgrade corner promo is on screen right now. */
  upgradePromoVisible: boolean;
  pathname: string;
}

export type DonatePromptDecision =
  | { show: true }
  | { show: false; reason: string };

/** The timed-trigger gate: every suppression rule from the spec in
 * one pure function. Explicit user clicks bypass this entirely. */
export function decideTimedDonatePrompt(
  ctx: DonatePromptContext,
): DonatePromptDecision {
  if (isDonateExcludedPath(ctx.pathname)) {
    return { show: false, reason: "excluded_path" };
  }
  if (ctx.identityState === "premium") {
    return { show: false, reason: "paid_subscriber" };
  }
  if (ctx.accountSupporter) {
    return { show: false, reason: "account_supporter" };
  }
  if (
    ctx.supporterStamp !== null &&
    ctx.now - ctx.supporterStamp < SUPPORTER_WINDOW_MS
  ) {
    return { show: false, reason: "supporter" };
  }
  if (
    ctx.dismissedAt !== null &&
    ctx.now - ctx.dismissedAt < DISMISS_WINDOW_MS
  ) {
    return { show: false, reason: "dismissed_recently" };
  }
  if (ctx.anyDialogOpen) {
    return { show: false, reason: "dialog_open" };
  }
  if (ctx.upgradePromoVisible) {
    return { show: false, reason: "upgrade_promo_visible" };
  }
  if (
    ctx.upgradeShownAt !== null &&
    ctx.now - ctx.upgradeShownAt < MUTUAL_EXCLUSION_MS
  ) {
    return { show: false, reason: "upgrade_recent" };
  }
  return { show: true };
}

/** The globe corner-toast gate (adds the dwell + 7-day cap on top of
 * the shared timed-prompt rules). */
export function decideDonateToast(
  ctx: DonatePromptContext & {
    dwellMs: number;
    toastShownAt: number | null;
  },
): DonatePromptDecision {
  if (ctx.dwellMs < TOAST_DWELL_MS) {
    return { show: false, reason: "dwell" };
  }
  if (
    ctx.toastShownAt !== null &&
    ctx.now - ctx.toastShownAt < TOAST_WINDOW_MS
  ) {
    return { show: false, reason: "toast_recent" };
  }
  return decideTimedDonatePrompt(ctx);
}

/* ------------------------------------------------------------------ */
/* Analytics detail tokens (AnalyticsTracker stores ONE machine token */
/* per event as `event:detail`, [a-z0-9_], ≤24 chars).                */
/* ------------------------------------------------------------------ */

export function donateAmountDetail(amount: number, frequency: DonateFrequency): string {
  return `${amount}_${frequency === "once" ? "once" : "monthly"}`;
}

export type DonateDismissMethod = "esc" | "backdrop" | "x" | "maybe_later" | "swipe";

export const DONATE_OPEN_EVENT = "worldeye:open-donate";

export interface DonateOpenDetail {
  amount?: number;
  frequency?: DonateFrequency;
  source: string;
  /** Open straight at the checkout step (the /support page's own form
   * already collected the amount — its Donate button goes to payment). */
  checkout?: boolean;
}
