/**
 * In-house subscription management (/settings/subscription) — the view
 * assembly and switch-terms math. Pure functions over the DB row + the
 * live Stripe subscription, so the page, the GET endpoint, and the tests
 * all read the same figures.
 *
 * Prices come from the central plan config (lib/billing/plans —
 * PLAN_DEFS display prices/names; the no-subscription subscribe path
 * still reads PLAN_COPY via TRIAL_PLAN_OPTIONS, and a test pins the
 * two agree on the Pro grid) and plan↔price-id resolution goes
 * through the env price ids (planByPriceIdFromEnv) — nothing here
 * restates a price.
 */
import { TRIAL_PLAN_OPTIONS, type TrialPlanOption } from "./trial-checkout";
import { planByPriceIdFromEnv } from "./trial-reminders";
import {
  PLAN_DEFS,
  PLAN_KEYS,
  resolvePlan,
  type BillingPeriod,
  type PlanKey,
  type PlanTierKey,
} from "./plans";

export const SUPPORT_EMAIL = "contact@worldeye.app";

/**
 * The switchable plans (Phase B): the full 3×3 tier×period grid. The
 * Pro grid keeps its historical bare period names ("weekly" |
 * "monthly" | "annual") — every stored reference and the checkout
 * route's Pro keys use them — and the Lite/Ultra PlanKeys name
 * themselves. Enterprise stays OUT (managed directly, see the view's
 * "enterprise" kind) and the standalone products (ambient, ski) are
 * not switch targets.
 */
export type ManageablePlan =
  | "lite_weekly"
  | "lite_monthly"
  | "lite_annual"
  | "weekly"
  | "monthly"
  | "annual"
  | "ultra_weekly"
  | "ultra_monthly"
  | "ultra_annual";

export const MANAGEABLE_PLANS: ManageablePlan[] = [
  "lite_weekly",
  "lite_monthly",
  "lite_annual",
  "weekly",
  "monthly",
  "annual",
  "ultra_weekly",
  "ultra_monthly",
  "ultra_annual",
];

/**
 * Manage-side plan name → central plan-config key (lib/billing/plans).
 * The bare period names are the Pro grid; the Lite/Ultra PlanKeys name
 * themselves. PLAN_KEY_BY_MANAGE_NAME is total over the 9 grid plans
 * (MANAGEABLE_PLANS) plus enterprise, so priceIdForPlan resolves every
 * plan the switch can name.
 */
const PLAN_KEY_BY_MANAGE_NAME: Record<string, PlanKey> = {
  weekly: "pro_weekly",
  monthly: "pro_monthly",
  annual: "pro_annual",
  enterprise: "enterprise",
  lite_weekly: "lite_weekly",
  lite_monthly: "lite_monthly",
  lite_annual: "lite_annual",
  ultra_weekly: "ultra_weekly",
  ultra_monthly: "ultra_monthly",
  ultra_annual: "ultra_annual",
};

export function priceIdForPlan(
  plan: string,
  env: Record<string, string | undefined>,
): string | null {
  const key = PLAN_KEY_BY_MANAGE_NAME[plan];
  return key ? resolvePlan(key, env).priceId : null;
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
  /**
   * A plan switch that is waiting on payment (Stripe `pending_update`):
   * the swap was requested with payment_behavior "pending_if_incomplete",
   * the card on file did not cover the prorated invoice, and the OLD plan
   * is still fully in effect until this invoice is paid. Assembled by the
   * route (it needs live Stripe calls); null/absent when no switch pends.
   */
  pendingInvoice?: {
    id: string;
    amountDue: number;
    currency: string;
    clientSecret: string | null;
    hostedUrl: string | null;
    newPriceId: string | null;
  } | null;
}

export interface ManageCurrent {
  plan: string | null;
  planName: string;
  /** e.g. "$74.99/year" — from the plan config, or the caller's live-Stripe label. */
  priceLabel: string;
  status: string;
  trialing: boolean;
  trialEndsAt: string | null;
  periodEnd: string;
  cancelAtPeriodEnd: boolean;
  pastDue: boolean;
}

/** A switch that was confirmed but whose prorated charge is unpaid. The
 * member's current plan stays active; paying completes the switch. */
export interface ManagePendingSwitch {
  targetPlan: string | null;
  targetName: string;
  /** Prorated amount still to pay, in the currency's minor unit. */
  amountDue: number;
  currency: string;
  /** PaymentIntent client secret for the on-page payment form (null when
   *  Stripe.js can't run — the hosted invoice URL is the fallback). */
  clientSecret: string | null;
  hostedUrl: string | null;
}

export interface ManageOption {
  plan: ManageablePlan;
  /** Entitlement tier of this option — the switch UI groups by it. */
  tier: Exclude<PlanTierKey, "free">;
  name: string;
  price: string;
  per: string;
  perDay: string;
  note: string;
  current: boolean;
  /** Honest framing vs the current plan: VIP Pro is THE upgrade from
   *  Weekly/Monthly; from VIP Pro the others are downgrades. */
  relation: "current" | "upgrade" | "downgrade" | "switch";
  /** What switching to this plan charges TODAY (prorated, minor unit),
   *  from a live Stripe invoice preview; null when unknown/not quoted
   *  (trialing subs are never quoted — nothing is charged mid-trial). */
  dueTodayCents: number | null;
}

export interface ManageView {
  kind: "none" | "self-serve" | "enterprise" | "comp";
  current: ManageCurrent | null;
  options: ManageOption[];
  pendingSwitch: ManagePendingSwitch | null;
  supportEmail: string;
}

/**
 * Plan display names, from the ONE source (PLAN_DEFS.displayName): the
 * bare period names alias the Pro defs ("Weekly" / "Monthly" /
 * "VIP Pro"), and every PlanKey names itself ("Lite Monthly", …).
 * Enterprise/Ambient/Powder Pass resolve here too, so a current-plan
 * card or a pending-switch target always has its sold name.
 */
const PLAN_NAMES: Record<string, string> = {
  weekly: PLAN_DEFS.pro_weekly.displayName,
  monthly: PLAN_DEFS.pro_monthly.displayName,
  annual: PLAN_DEFS.pro_annual.displayName,
};
for (const key of PLAN_KEYS) PLAN_NAMES[key] = PLAN_DEFS[key].displayName;

const PERIOD_PER: Record<BillingPeriod, string> = {
  weekly: "/week",
  monthly: "/month",
  annual: "/year",
};
const PERIOD_DAYS: Record<BillingPeriod, number> = {
  weekly: 7,
  monthly: 30,
  annual: 365,
};
const PERIOD_ADVERB: Record<BillingPeriod, string> = {
  weekly: "weekly",
  monthly: "monthly",
  annual: "annually",
};

/** "$0.47" a day for a "$13.99" monthly plan — the same derivation
 *  PLAN_COPY's pinned per-day figures follow (price ÷ 7/30/365). */
function perDayFor(displayPrice: string, period: BillingPeriod): string {
  const amount = Number(displayPrice.replace(/[^0-9.]/g, ""));
  return `$${(amount / PERIOD_DAYS[period]).toFixed(2)}`;
}

/**
 * The 9 grid options for a subscriber, sourced from the central plan
 * config (names + display prices from PLAN_DEFS; trial wording derived
 * from TRIAL_DAYS via resolvePlan). The Pro entries reproduce
 * TRIAL_PLAN_OPTIONS' copy exactly — a test pins that — so nothing a
 * current subscriber reads changes; Lite/Ultra follow the same pattern.
 */
function gridOptions(
  env: Record<string, string | undefined>,
  dueTodayByPlan?: Partial<Record<ManageablePlan, number | null>>,
): ManageOption[] {
  return MANAGEABLE_PLANS.map((plan) => {
    const key = PLAN_KEY_BY_MANAGE_NAME[plan];
    const def = PLAN_DEFS[key];
    const period = def.period as BillingPeriod;
    const trialDays = resolvePlan(key, env).trialDays;
    return {
      plan,
      tier: def.tier as Exclude<PlanTierKey, "free">,
      name: def.displayName,
      price: def.displayPrice,
      per: PERIOD_PER[period],
      perDay: perDayFor(def.displayPrice, period),
      note: `${trialDays} days free, then billed ${PERIOD_ADVERB[period]} · cancel anytime`,
      current: false,
      relation: "switch" as const,
      dueTodayCents: dueTodayByPlan?.[plan] ?? null,
    };
  });
}

export function assembleManageView(input: {
  dbSub: ManageDbSub | null;
  stripeSub: ManageStripeSub | null;
  env: Record<string, string | undefined>;
  /** Live-Stripe price label, used when the plan has no grid entry. */
  currentPriceLabel?: string | null;
  /** Per-plan amount due today if the member switched now (minor unit),
   *  from live Stripe invoice previews; missing/null = not quoted. */
  dueTodayByPlan?: Partial<Record<ManageablePlan, number | null>>;
}): ManageView {
  const { dbSub, stripeSub, env } = input;
  if (!dbSub) {
    // No subscription: the subscribe path is UNCHANGED — the three Pro
    // trial plans from PLAN_COPY, exactly as before Phase B. The
    // 9-plan grid exists only inside a subscriber's switch view
    // (Phases C/D own the public surfaces), which keeps this phase dark.
    const options: ManageOption[] = TRIAL_PLAN_OPTIONS.map((o) => ({
      plan: o.plan,
      tier: "pro" as const,
      name: o.name,
      price: o.price,
      per: o.per,
      perDay: o.perDay,
      note: o.note,
      current: false,
      relation: "switch" as const,
      dueTodayCents: null,
    }));
    return { kind: "none", current: null, options, pendingSwitch: null, supportEmail: SUPPORT_EMAIL };
  }

  const options = gridOptions(env, input.dueTodayByPlan);
  const plan = planByPriceIdFromEnv(env)[dbSub.stripePriceId] ?? null;
  const copy = options.find((o) => o.plan === plan);
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
  // Relation framing, tier-first (Phase B): an option outranks the
  // current plan when its TIER is higher (lite < pro < ultra); within
  // a tier the annual plan outranks its weekly/monthly peers, which
  // read as a plain "switch" against each other — exactly the framing
  // the Pro grid has always had (annual = THE upgrade from
  // Weekly/Monthly; from VIP Pro they are downgrades). Standalone
  // products (ambient, ski) and unknown prices frame as Pro peers, the
  // reading they have always had; enterprise outranks the grid but
  // never reaches this loop (its kind returns no options).
  const scoreOf = (p: string | null): number => {
    switch (p) {
      case "lite_weekly":
      case "lite_monthly":
        return 2;
      case "lite_annual":
        return 3;
      case "weekly":
      case "monthly":
        return 4;
      case "annual":
        return 5;
      case "ultra_weekly":
      case "ultra_monthly":
        return 6;
      case "ultra_annual":
        return 7;
      case "enterprise":
        return 8;
      default:
        return p ? 4 : 0;
    }
  };
  const currentScore = scoreOf(plan);
  for (const o of options) {
    o.relation = o.current
      ? "current"
      : scoreOf(o.plan) > currentScore
        ? "upgrade"
        : scoreOf(o.plan) < currentScore
          ? "downgrade"
          : "switch";
  }

  // A pending switch survives page reloads: it rides the live Stripe
  // subscription (pending_update + its open invoice), never local state.
  let pendingSwitch: ManagePendingSwitch | null = null;
  const pendingInvoice = stripeSub?.pendingInvoice ?? null;
  if (pendingInvoice && pendingInvoice.amountDue > 0) {
    const targetPlan = pendingInvoice.newPriceId
      ? (planByPriceIdFromEnv(env)[pendingInvoice.newPriceId] ?? null)
      : null;
    pendingSwitch = {
      targetPlan,
      targetName: targetPlan ? (PLAN_NAMES[targetPlan] ?? targetPlan) : "your new plan",
      amountDue: pendingInvoice.amountDue,
      currency: pendingInvoice.currency,
      clientSecret: pendingInvoice.clientSecret,
      hostedUrl: pendingInvoice.hostedUrl,
    };
  }

  // Comp rows carry comp_ ids no Stripe object can have — never offer a
  // self-serve swap against them (lib/pro/comp's hard rule).
  if (dbSub.stripeSubscriptionId.startsWith("comp_")) {
    return { kind: "comp", current, options: [], pendingSwitch: null, supportEmail: SUPPORT_EMAIL };
  }
  if (plan === "enterprise") {
    return { kind: "enterprise", current, options: [], pendingSwitch: null, supportEmail: SUPPORT_EMAIL };
  }
  return { kind: "self-serve", current, options, pendingSwitch, supportEmail: SUPPORT_EMAIL };
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

/** "$61.62" from a minor-unit amount (USD assumed unless told otherwise). */
export function fmtMoney(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

/**
 * The PaymentIntent id behind an invoice, across Stripe API shapes: the
 * legacy `invoice.payment_intent` and the current
 * `invoice.payments.data[].payment.payment_intent`. Accepts either the
 * bare id string or an expanded object. Null when the invoice carries no
 * payment intent (e.g. a zero-amount invoice).
 */
export function invoicePaymentIntentId(invoice: unknown): string | null {
  const inv = invoice as {
    payment_intent?: string | { id?: string } | null;
    payments?: {
      data?: Array<{ payment?: { payment_intent?: string | { id?: string } | null } | null }> | null;
    } | null;
  } | null;
  if (!inv) return null;
  const idOf = (v: string | { id?: string } | null | undefined): string | null =>
    typeof v === "string" ? v || null : (v?.id ?? null);
  return idOf(inv.payment_intent) ?? idOf(inv.payments?.data?.[0]?.payment?.payment_intent);
}

export function switchTerms(
  current: ManageCurrent,
  target: Pick<TrialPlanOption, "name" | "price" | "per">,
  dueTodayCents?: number | null,
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
  // Active subs: an interval-changing switch is billed by Stripe TODAY
  // (new period price minus credit for the unused part of the old plan) —
  // never promise it lands on the next invoice. The swap runs with
  // payment_behavior "pending_if_incomplete": if the card on file covers
  // the amount the switch completes instantly; if not, the member pays
  // the difference on this page and the CURRENT plan stays active until
  // they do — a failed card can no longer flip anyone to past due.
  const moneyLine =
    dueTodayCents == null
      ? "Stripe credits the unused part of your current plan toward the new plan's price. If the card on file covers the difference due today, the switch completes right away; if not, you can pay it here on this page — your current plan stays fully active until the payment completes."
      : dueTodayCents > 0
        ? `Due today: ${fmtMoney(dueTodayCents)} — the new plan's price minus credit for the unused part of your current plan. If the card on file covers it, the switch completes right away; if not, you can pay it here on this page — your current plan stays fully active until the payment completes.`
        : "No charge today — the unused part of your current plan fully covers the switch, and any leftover credit applies to your next invoice.";
  return {
    targetName: target.name,
    targetPriceLabel,
    effectiveLine:
      dueTodayCents != null && dueTodayCents > 0
        ? "The switch completes as soon as today's prorated charge is paid — " + target.name + " is active from that moment."
        : "The switch takes effect immediately — your plan becomes " + target.name + ".",
    moneyLine,
    nextChargeLine: `After the switch you pay ${targetPriceLabel}, on the new plan's schedule.`,
  };
}
