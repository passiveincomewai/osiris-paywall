/**
 * The one client-side path into Stripe checkout, shared by /pricing and by
 * every Pro lock surface (layer panel, OI gate, flight-path lock, recording
 * gate, timelapse lock, signup nudge). Locks used to bounce users to
 * /pricing and lose them there; now they offer the trial right where the
 * intent showed up — through this exact call, so a lock can never drift
 * into a second, divergent checkout flow.
 *
 * POST /api/checkout is GUEST checkout: it requires no sign-in. The
 * account is created (or linked) from the Stripe customer's email when
 * the webhook fires, and a guest claims it on /welcome after paying.
 * That is why `trialEntryDecision` sends signed-out users straight to
 * checkout too — precisely what /pricing does with them today. There is
 * no sign-in detour and no return path to construct: checkout itself is
 * the destination, and its success URL brings the buyer back to the app.
 *
 * Trial lengths are NOT restated here: `trialDaysForPlan` (./trials) is
 * the single source the checkout route turns into `trial_period_days`.
 * The copy below mirrors /pricing word for word — if pricing copy ever
 * changes, change it in both places (the tests pin these strings).
 */
import { trialDaysForPlan, type BillingPlan } from "./trials";

export type TrialPlan = Exclude<BillingPlan, "enterprise">;

export interface TrialPlanOption {
  plan: TrialPlan;
  /** Plan name as shown on /pricing's billing toggle. */
  name: string;
  price: string;
  per: string;
  perDay: string;
  /** Verbatim from /pricing's plan card, e.g. "1 day free, then billed weekly · cancel anytime". */
  note: string;
  /** Verbatim CTA from /pricing's plan card, e.g. "Start 1-Day Free Trial". */
  cta: string;
  /** Trial badge text from /pricing's plan card, e.g. "1 day free". */
  trialLabel: string;
  /** Resolved through trialDaysForPlan — never restated. */
  trialDays: number;
}

const PLAN_COPY: Record<TrialPlan, Omit<TrialPlanOption, "plan" | "trialDays">> = {
  weekly: {
    name: "Weekly",
    price: "$7.99",
    per: "/week",
    perDay: "$1.14",
    note: "1 day free, then billed weekly · cancel anytime",
    cta: "Start 1-Day Free Trial",
    trialLabel: "1 day free",
  },
  monthly: {
    name: "Monthly",
    price: "$13.99",
    per: "/month",
    perDay: "$0.47",
    note: "1 day free, then billed monthly · cancel anytime",
    cta: "Start 1-Day Free Trial",
    trialLabel: "1 day free",
  },
  annual: {
    name: "Annual",
    price: "$74.99",
    per: "/year",
    perDay: "$0.21",
    note: "3 days free, then billed annually · cancel anytime",
    cta: "Start 3-Day Free Trial",
    trialLabel: "3 days free",
  },
};

/** The three trial plans, in /pricing's toggle order. Enterprise has no
 *  trial and is deliberately absent — it is sold from /pricing only. */
export const TRIAL_PLAN_OPTIONS: TrialPlanOption[] = (
  ["weekly", "monthly", "annual"] as TrialPlan[]
).map((plan) => ({
  plan,
  ...PLAN_COPY[plan],
  trialDays: trialDaysForPlan(plan),
}));

/** The request body /api/checkout expects: the plan name, nothing else.
 *  Trial length, prices and affiliate attribution are all resolved
 *  server-side — the client cannot (and must not) restate them. */
export function checkoutRequestBody(plan: BillingPlan): { plan: BillingPlan } {
  return { plan };
}

export type TrialEntryDecision = { kind: "checkout"; guest: boolean };

/**
 * Where a "Start free trial" click goes, by sign-in state. Both states
 * end at the same guest-capable checkout — mirroring /pricing, whose
 * checkout button fires the identical POST for signed-out visitors.
 * `guest` is carried only so callers can tell the two apart (analytics,
 * copy); it changes nothing about the destination.
 */
export function trialEntryDecision(signedIn: boolean): TrialEntryDecision {
  return { kind: "checkout", guest: !signedIn };
}

type FetchLike = (input: string, init: RequestInit) => Promise<{
  ok: boolean;
  json: () => Promise<any>;
}>;

/**
 * Fire the checkout call /pricing's CheckoutButton has always made and
 * resolve to the Stripe URL to redirect to. Throws an Error carrying the
 * server's message (or "Checkout failed") — the same failure semantics
 * the pricing button presents today.
 */
export async function startPlanCheckout(
  plan: BillingPlan,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
): Promise<string> {
  const res = await fetchImpl("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(checkoutRequestBody(plan)),
  });
  const data = await res.json();
  if (!res.ok || !data.url) throw new Error(data.error || "Checkout failed");
  return data.url as string;
}
