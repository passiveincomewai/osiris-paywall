/**
 * In-house subscription management (/settings/subscription) — the view
 * assembly and switch-terms math. Pure functions over the DB row + the
 * live Stripe subscription, so the page, the GET endpoint, and the tests
 * all read the same figures.
 *
 * Prices come from the ONE source the pricing page uses (PLAN_COPY via
 * TRIAL_PLAN_OPTIONS) and plan↔price-id resolution goes through the env
 * price ids (planByPriceIdFromEnv) — nothing here restates a price.
 */
import { TRIAL_PLAN_OPTIONS, type TrialPlanOption } from "./trial-checkout";
import { planByPriceIdFromEnv } from "./trial-reminders";

export const SUPPORT_EMAIL = "passiveincomewai@gmail.com";

export type ManageablePlan = "weekly" | "monthly" | "annual";
export const MANAGEABLE_PLANS: ManageablePlan[] = ["weekly", "monthly", "annual"];

const PRICE_ENV_KEYS: Record<string, string> = {
  weekly: "STRIPE_WEEKLY_PRICE_ID",
  monthly: "STRIPE_MONTHLY_PRICE_ID",
  annual: "STRIPE_ANNUAL_PRICE_ID",
  enterprise: "STRIPE_ENTERPRISE_PRICE_ID",
};

export function priceIdForPlan(
  plan: string,
  env: Record<string, string | undefined>,
): string | null {
  const key = PRICE_ENV_KEYS[plan];
  return key ? (env[key] ?? null) : null;
}

export interface ManageDbSub {
  stripePriceId: string;
  stripeSubscriptionId: string;
  status: string;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

export interface ManageStripeSub {
  status: string;
  trial_end: number | null;
}

export interface ManageCurrent {
  plan: string | null;
  planName: string;
  /** e.g. "$74.99/year" — from PLAN_COPY, or the caller's live-Stripe label. */
  priceLabel: string;
  status: string;
  trialing: boolean;
  trialEndsAt: string | null;
  periodEnd: string;
  cancelAtPeriodEnd: boolean;
  pastDue: boolean;
}

export interface ManageOption {
  plan: ManageablePlan;
  name: string;
  price: string;
  per: string;
  perDay: string;
  note: string;
  current: boolean;
}

export interface ManageView {
  kind: "none" | "self-serve" | "enterprise" | "comp";
  current: ManageCurrent | null;
  options: ManageOption[];
  supportEmail: string;
}

const PLAN_NAMES: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  annual: "Annual",
  enterprise: "Enterprise",
};

export function assembleManageView(input: {
  dbSub: ManageDbSub | null;
  stripeSub: ManageStripeSub | null;
  env: Record<string, string | undefined>;
  /** Live-Stripe price label, used when the plan has no PLAN_COPY entry. */
  currentPriceLabel?: string | null;
}): ManageView {
  const { dbSub, stripeSub, env } = input;
  const options: ManageOption[] = TRIAL_PLAN_OPTIONS.map((o) => ({
    plan: o.plan,
    name: o.name,
    price: o.price,
    per: o.per,
    perDay: o.perDay,
    note: o.note,
    current: false,
  }));
  if (!dbSub) {
    return { kind: "none", current: null, options, supportEmail: SUPPORT_EMAIL };
  }

  const plan = planByPriceIdFromEnv(env)[dbSub.stripePriceId] ?? null;
  const copy = TRIAL_PLAN_OPTIONS.find((o) => o.plan === plan);
  const trialing = dbSub.status === "trialing";
  const current: ManageCurrent = {
    plan,
    planName: plan ? (PLAN_NAMES[plan] ?? plan) : "Pro",
    priceLabel: copy ? `${copy.price}${copy.per}` : (input.currentPriceLabel ?? ""),
    status: dbSub.status,
    trialing,
    trialEndsAt:
      trialing && stripeSub?.trial_end
        ? new Date(stripeSub.trial_end * 1000).toISOString()
        : null,
    periodEnd: dbSub.currentPeriodEnd.toISOString(),
    cancelAtPeriodEnd: dbSub.cancelAtPeriodEnd,
    pastDue: dbSub.status === "past_due",
  };
  for (const o of options) o.current = o.plan === plan;

  // Comp rows carry comp_ ids no Stripe object can have — never offer a
  // self-serve swap against them (lib/pro/comp's hard rule).
  if (dbSub.stripeSubscriptionId.startsWith("comp_")) {
    return { kind: "comp", current, options: [], supportEmail: SUPPORT_EMAIL };
  }
  if (plan === "enterprise") {
    return { kind: "enterprise", current, options: [], supportEmail: SUPPORT_EMAIL };
  }
  return { kind: "self-serve", current, options, supportEmail: SUPPORT_EMAIL };
}

/* ------------------------------------------------------------------ */
/* The confirm step's figures — exactly what the switch will do, in    */
/* plain terms. The endpoint re-resolves the same price id from env,   */
/* so what the user confirms is what Stripe is asked to do.            */
/* ------------------------------------------------------------------ */

export interface SwitchTerms {
  targetName: string;
  targetPriceLabel: string;
  effectiveLine: string;
  moneyLine: string;
  nextChargeLine: string;
}

export function fmtManageDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function switchTerms(
  current: ManageCurrent,
  target: Pick<TrialPlanOption, "name" | "price" | "per">,
): SwitchTerms {
  const targetPriceLabel = `${target.price}${target.per}`;
  if (current.trialing && current.trialEndsAt) {
    return {
      targetName: target.name,
      targetPriceLabel,
      effectiveLine: "The switch takes effect immediately — your plan becomes " + target.name + ".",
      moneyLine: `No charge now. Your free trial still ends ${fmtManageDate(current.trialEndsAt)}.`,
      nextChargeLine: `First charge on ${fmtManageDate(current.trialEndsAt)}: ${targetPriceLabel} — the new plan's price, not the old one.`,
    };
  }
  return {
    targetName: target.name,
    targetPriceLabel,
    effectiveLine: "The switch takes effect immediately — your plan becomes " + target.name + ".",
    moneyLine:
      "Stripe credits the unused part of your current plan and adds a prorated charge for the new plan covering the rest of this billing period. The adjustment appears on your next invoice.",
    nextChargeLine: `From ${fmtManageDate(current.periodEnd)} you pay ${targetPriceLabel}, on the new plan's schedule.`,
  };
}
