/**
 * Trial-end reminder logic — the pure half of /api/cron/trial-reminders.
 *
 * Until now nothing warned a trial user before the first charge: the
 * trial simply converted. A short, honest heads-up (plan, exact amount,
 * exact end date, how to cancel) is both the fair thing to do and the
 * cheapest chargeback/refund protection the funnel has — a surprised
 * first charge is where disputes come from.
 *
 * Everything money-shaped here is derived from the live Stripe price
 * object at send time — never from a restated constant — so a price
 * change can never make the email lie. Plan NAMES resolve through the
 * app's own price-id env config when the id matches, and fall back to
 * the price's billing interval when it doesn't.
 *
 * Dedupe lives in Stripe subscription metadata (TRIAL_REMINDER_METADATA_KEY):
 * the schema has no reminder column and the Subscription table doesn't
 * even store trial end — Stripe is the source of truth for both.
 */
import { planNameByPriceId } from "./plans";

/** Remind when the trial ends within this window (and hasn't ended). */
export const TRIAL_REMINDER_WINDOW_MS = 24 * 3600_000;

/** Subscription metadata key stamped after a successful send. */
export const TRIAL_REMINDER_METADATA_KEY = "trialReminderSentAt";

export interface TrialSubscriptionSnapshot {
  status: string;
  /** Unix seconds, as Stripe reports `trial_end`; null when not trialing. */
  trialEnd: number | null;
  metadata: Record<string, string> | null | undefined;
}

/**
 * Due = actively trialing, trial ends inside the window (already-ended
 * trials are excluded — a "reminder" after the charge is an apology,
 * not a reminder), and no reminder has been sent for this trial yet.
 */
export function trialReminderDue(
  sub: TrialSubscriptionSnapshot,
  nowMs: number = Date.now(),
): boolean {
  if (sub.status !== "trialing") return false;
  if (!sub.trialEnd) return false;
  if (sub.metadata?.[TRIAL_REMINDER_METADATA_KEY]) return false;
  const endMs = sub.trialEnd * 1000;
  return endMs > nowMs && endMs <= nowMs + TRIAL_REMINDER_WINDOW_MS;
}

/**
 * Map the app's Stripe price-id env config to plan names.
 *
 * Since Pricing Phase A this delegates to the central plan config
 * (lib/billing/plans — planNameByPriceId): the four historical IDs
 * resolve exactly as before ("weekly" | "monthly" | "annual" |
 * "enterprise"), the six new Lite/Ultra price ids resolve to their
 * PlanKeys ("lite_weekly" … "ultra_annual"), the standalone products
 * to "ambient" | "ski", and the legacy grandfathered prices to the
 * Pro plan names they have always carried — so reminder emails name
 * every plan correctly.
 */
export function planByPriceIdFromEnv(
  env: Record<string, string | undefined>,
): Record<string, string> {
  return planNameByPriceId(env);
}

/**
 * Format an amount in the currency's smallest unit, the way Stripe
 * reports `unit_amount`. Fraction digits come from the currency itself
 * (USD 2, JPY 0) via Intl — no per-currency table to drift.
 */
export function formatMoney(unitAmount: number, currency: string): string {
  const cur = (currency || "usd").toUpperCase();
  let digits = 2;
  try {
    digits =
      new Intl.NumberFormat("en-US", { style: "currency", currency: cur })
        .resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    digits = 2;
  }
  const value = unitAmount / 10 ** digits;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: cur,
    }).format(value);
  } catch {
    return `${value.toFixed(digits)} ${cur}`;
  }
}

export interface StripePriceLike {
  id?: string | null;
  unit_amount: number | null;
  currency: string;
  recurring?: { interval: string; interval_count?: number | null } | null;
}

export interface PriceDescription {
  /** "Monthly plan" — from the env plan map, else the interval. */
  planLabel: string;
  /** "$13.99" */
  amountLabel: string;
  /** "$13.99/month", "$74.99/year", "$29.97 every 3 months" */
  chargeLabel: string;
  /** Annual only: "$6.25/month" — the honest per-month equivalent. */
  perMonthLabel: string | null;
}

const INTERVAL_PLAN: Record<string, string> = {
  week: "Weekly",
  month: "Monthly",
  year: "Yearly",
  day: "Daily",
};

/** Plan-key → the name the plan is SOLD under (annual = VIP Pro). */
const PLAN_DISPLAY_LABEL: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  annual: "VIP Pro",
  enterprise: "Enterprise",
  lite_weekly: "Lite Weekly",
  lite_monthly: "Lite Monthly",
  lite_annual: "Lite Annual",
  ultra_weekly: "Ultra Weekly",
  ultra_monthly: "Ultra Monthly",
  ultra_annual: "Ultra Annual",
  ambient: "Ambient",
  ski: "Powder Pass",
};

const INTERVAL_NOUN: Record<string, string> = {
  week: "week",
  month: "month",
  year: "year",
  day: "day",
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function describeStripePrice(
  price: StripePriceLike,
  planByPriceId: Record<string, string>,
): PriceDescription {
  const amount = price.unit_amount ?? 0;
  const amountLabel = formatMoney(amount, price.currency);
  const interval = price.recurring?.interval ?? null;
  const count = price.recurring?.interval_count ?? 1;

  const planFromEnv = price.id ? planByPriceId[price.id] : undefined;
  const planLabel = planFromEnv
    ? `${PLAN_DISPLAY_LABEL[planFromEnv] ?? capitalize(planFromEnv)} plan`
    : interval && INTERVAL_PLAN[interval]
      ? `${INTERVAL_PLAN[interval]} plan`
      : "Pro plan";

  const noun = interval ? (INTERVAL_NOUN[interval] ?? interval) : null;
  const chargeLabel = noun
    ? count <= 1
      ? `${amountLabel}/${noun}`
      : `${amountLabel} every ${count} ${noun}s`
    : amountLabel;

  const perMonthLabel =
    interval === "year" && amount > 0
      ? `${formatMoney(Math.round(amount / 12), price.currency)}/month`
      : null;

  return { planLabel, amountLabel, chargeLabel, perMonthLabel };
}

/**
 * "October 21, 2026 at 3:42 PM UTC" — the exact moment of the first
 * charge, labeled in UTC because the subscriber's timezone is unknown
 * and an unlabeled local time would be a guess dressed as a fact.
 */
export function formatTrialEnd(trialEndSec: number): string {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${fmt.format(new Date(trialEndSec * 1000))} UTC`;
}
