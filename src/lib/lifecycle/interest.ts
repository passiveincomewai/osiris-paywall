// ── Plan-interest inference ──────────────────────────────────────────
// "Which plan did this user seem most interested in?" — answered only
// from data the site already records, in a strict honesty order:
//
//   1. A CheckoutAttempt names the plan outright (they picked it and
//      reached Stripe). That is the plan, full stop.
//   2. PageView rows for /pricing prove engagement with pricing but do
//      NOT record which plan card was looked at — so they can justify
//      a generic follow-up, never a plan-specific claim. Inferring a
//      plan from a page view would be inventing intent.
//
// Pure functions over plain snapshots; the engine adapts DB rows.

export type PlanKey = "weekly" | "monthly" | "annual";

export interface AttemptSignal {
  plan: string | null;
  createdAt: Date;
}

export interface PricingViewSignal {
  durationSec: number | null;
  createdAt: Date;
}

export interface InterestResult {
  /** The plan we may honestly name in an email, or null for generic copy. */
  plan: PlanKey | null;
  basis: "checkout_attempt" | "pricing_engagement" | "none";
  /** True when pricing engagement clears the "actually looked" bar. */
  pricingEngaged: boolean;
  /** Most recent /pricing view, or null. */
  lastPricingViewAt: Date | null;
  /** Total recorded seconds on /pricing across the supplied views. */
  pricingSeconds: number;
}

/** Normalize whatever a checkout row stored into a plan key, or null. */
export function normalizePlan(raw: string | null | undefined): PlanKey | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (s === "weekly" || s === "week") return "weekly";
  if (s === "monthly" || s === "month") return "monthly";
  if (s === "annual" || s === "yearly" || s === "year" || s === "vip" || s === "vip_pro" || s === "vip pro") {
    return "annual";
  }
  return null;
}

// The engagement bar: pricing is one page with three cards — a bounce
// records ~0s. Either repeated visits or real dwell time counts as
// "actually looked at the prices".
export const PRICING_MIN_VIEWS = 2;
export const PRICING_MIN_SINGLE_VIEW_SEC = 15;
export const PRICING_MIN_TOTAL_SEC = 30;

export function inferPlanInterest(input: {
  attempts: AttemptSignal[];
  pricingViews: PricingViewSignal[];
}): InterestResult {
  const views = [...input.pricingViews].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const lastPricingViewAt = views.length > 0 ? views[0].createdAt : null;
  const pricingSeconds = views.reduce((sum, v) => sum + (v.durationSec ?? 0), 0);
  const longestView = views.reduce((max, v) => Math.max(max, v.durationSec ?? 0), 0);
  const pricingEngaged =
    views.length >= PRICING_MIN_VIEWS ||
    longestView >= PRICING_MIN_SINGLE_VIEW_SEC ||
    pricingSeconds >= PRICING_MIN_TOTAL_SEC;

  // Most recent attempt that names a recognizable plan wins.
  const attempts = [...input.attempts].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  for (const a of attempts) {
    const plan = normalizePlan(a.plan);
    if (plan) {
      return { plan, basis: "checkout_attempt", pricingEngaged, lastPricingViewAt, pricingSeconds };
    }
  }
  if (pricingEngaged) {
    return { plan: null, basis: "pricing_engagement", pricingEngaged, lastPricingViewAt, pricingSeconds };
  }
  return { plan: null, basis: "none", pricingEngaged: false, lastPricingViewAt, pricingSeconds };
}
