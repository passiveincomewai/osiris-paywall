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
  /** e.g. "$74.99/year" — from PLAN_COPY, or the caller's live-Stripe label. */
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

const PLAN_NAMES: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  annual: "VIP Pro",
  enterprise: "Enterprise",
};

export function assembleManageView(input: {
  dbSub: ManageDbSub | null;
  stripeSub: ManageStripeSub | null;
  env: Record<string, string | undefined>;
  /** Live-Stripe price label, used when the plan has no PLAN_COPY entry. */
  currentPriceLabel?: string | null;
  /** Per-plan amount due today if the member switched now (minor unit),
   *  from live Stripe invoice previews; missing/null = not quoted. */
  dueTodayByPlan?: Partial<Record<ManageablePlan, number | null>>;
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
    relation: "switch" as const,
    dueTodayCents: input.dueTodayByPlan?.[o.plan] ?? null,
  }));
  if (!dbSub) {
    return { kind: "none", current: null, options, pendingSwitch: null, supportEmail: SUPPORT_EMAIL };
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
  // Tier framing (lib/plan-tier): annual is the vip tier, weekly/monthly
  // are pro — an option is an upgrade iff its tier outranks the current.
  const tierOf = (p: string | null) => (p === "annual" || p === "enterprise" ? 2 : p ? 1 : 0);
  const currentTier = tierOf(plan);
  for (const o of options) {
    o.relation = o.current
      ? "current"
      : tierOf(o.plan) > currentTier
        ? "upgrade"
        : tierOf(o.plan) < currentTier
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
