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
 * no sign-in detour.
 *
 * Where checkout happens: `startPlanCheckout` lands the buyer on our own
 * /checkout page, which mounts Stripe's embedded form when a publishable
 * key is configured and otherwise falls back to the hosted redirect this
 * module originally performed (see lib/billing/embedded-checkout for the
 * flow and its fallbacks). /pricing's plan CTAs instead open that same
 * embedded form in place (components/CheckoutSheet) — and every surface
 * also offers `startHostedCheckout`, the deliberate hosted option, for
 * buyers who prefer Stripe's own page. Completion still arrives via the
 * session's success/return URL, so /welcome and the webhook see no
 * difference.
 *
 * Trial lengths are NOT restated here: `trialDaysForPlan` (./trials) is
 * the single source the checkout route turns into `trial_period_days`.
 * The copy below mirrors /pricing word for word — if pricing copy ever
 * changes, change it in both places (the tests pin these strings).
 */
import { trialDaysForPlan, type BillingPlan } from "./trials";
import { checkoutErrorFromData } from "./checkout-error";
import { trackMetaEvent } from "@/lib/meta-track";

/* The Pro trial plans sold from /pricing and the Pro lock surfaces.
 * Ambient is excluded on purpose: it is a standalone product with its
 * own landing page and checkout entry (the /ambient paywall and
 * /ambient-mode), not a row in the Pro trial picker. Powder Pass is
 * excluded for the same reason: a standalone ski-only product (dark
 * until POWDER_PASS_ENABLED — lib/ski/access), never a picker row. */
export type TrialPlan = Exclude<BillingPlan, "enterprise" | "ambient" | "ski">;

export interface TrialPlanOption {
  plan: TrialPlan;
  /** Plan name as shown on /pricing's billing toggle. */
  name: string;
  price: string;
  per: string;
  perDay: string;
  /** Verbatim from /pricing's plan card, e.g. "3 days free, then billed weekly · cancel anytime". */
  note: string;
  /** Verbatim CTA from /pricing's plan card, e.g. "Start 3-Day Free Trial". */
  cta: string;
  /** Trial badge text from /pricing's plan card, e.g. "3 days free". */
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
    note: "3 days free, then billed weekly · cancel anytime",
    cta: "Start 3-Day Free Trial",
    trialLabel: "3 days free",
  },
  monthly: {
    name: "Monthly",
    price: "$13.99",
    per: "/month",
    perDay: "$0.47",
    note: "10 days free, then billed monthly · cancel anytime",
    cta: "Start 10-Day Free Trial",
    trialLabel: "10 days free",
  },
  annual: {
    // The annual plan is sold as VIP Pro (a real tier — lib/plan-tier).
    // "Annual" survives only as cadence ("billed annually"), never as
    // the plan's name.
    name: "VIP Pro",
    price: "$74.99",
    per: "/year",
    perDay: "$0.21",
    note: "10 days free, then billed annually · cancel anytime",
    cta: "Start 10-Day Free Trial",
    trialLabel: "10 days free",
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

/**
 * What the /checkout page shows about the plan being bought — for ALL
 * four plans, enterprise included (it reaches checkout from /pricing even
 * though the picker never offers it). Wording is /pricing's own: the
 * trial plans reuse PLAN_COPY untouched; the enterprise fields mirror
 * /pricing's PLANS.enterprise verbatim (price, per, perDay, note) and are
 * pinned against it by trial-checkout.test.ts.
 */
export interface CheckoutPlanSummary {
  plan: BillingPlan;
  name: string;
  price: string;
  per: string;
  perDay: string;
  note: string;
  /** Trial badge text ("10 days free"), or null when the plan has no trial. */
  trialLabel: string | null;
  trialDays: number;
}

function trialSummary(plan: TrialPlan): CheckoutPlanSummary {
  const c = PLAN_COPY[plan];
  return {
    plan,
    name: c.name,
    price: c.price,
    per: c.per,
    perDay: c.perDay,
    note: c.note,
    trialLabel: c.trialLabel,
    trialDays: trialDaysForPlan(plan),
  };
}

export const CHECKOUT_PLAN_SUMMARIES: Record<BillingPlan, CheckoutPlanSummary> = {
  weekly: trialSummary("weekly"),
  monthly: trialSummary("monthly"),
  annual: trialSummary("annual"),
  enterprise: {
    plan: "enterprise",
    name: "Enterprise",
    price: "$999",
    per: "/year",
    perDay: "$2.74",
    note: "Billed annually · cancel anytime",
    trialLabel: null,
    trialDays: trialDaysForPlan("enterprise"),
  },
  // WorldEye Ambient: a standalone product, not a Pro trial plan — it
  // never appears in the trial picker, but /checkout?plan=ambient
  // must still describe it correctly if a buyer lands there.
  ambient: {
    plan: "ambient",
    name: "WorldEye Ambient",
    price: "$4.99",
    per: "/month",
    perDay: "$0.17",
    note: "10 days free, then billed monthly · cancel anytime",
    trialLabel: "10 days free",
    trialDays: trialDaysForPlan("ambient"),
  },
  // Powder Pass: the ski-only standalone, same treatment as Ambient —
  // never in the trial picker and unreachable while POWDER_PASS_ENABLED
  // is off (the checkout route rejects the plan), but the summary
  // record is exhaustive over BillingPlan so the plan describes
  // correctly the day the owner lights it up.
  ski: {
    plan: "ski",
    name: "Powder Pass",
    price: "$4.99",
    per: "/month",
    perDay: "$0.17",
    note: "10 days free, then billed monthly · cancel anytime",
    trialLabel: "10 days free",
    trialDays: trialDaysForPlan("ski"),
  },
};

/** Summary lookup that tolerates raw strings (URL params): unknown → null. */
export function checkoutPlanSummary(plan: string | null | undefined): CheckoutPlanSummary | null {
  if (plan === "weekly" || plan === "monthly" || plan === "annual" || plan === "enterprise" || plan === "ambient" || plan === "ski") {
    return CHECKOUT_PLAN_SUMMARIES[plan];
  }
  return null;
}

/** The request body /api/checkout expects. Trial length, prices and
 *  affiliate attribution are all resolved server-side — the client cannot
 *  (and must not) restate them. `ui: "embedded"` asks the route for a
 *  session the /checkout page can mount on this domain (it answers with a
 *  clientSecret); without it the route answers with the hosted url. */
export function checkoutRequestBody(
  plan: BillingPlan,
  ui?: "embedded",
): { plan: BillingPlan; ui?: "embedded" } {
  return ui ? { plan, ui } : { plan };
}

/**
 * The on-site checkout destination for a plan. Every buy surface lands
 * here; the page itself decides between the embedded form and the hosted
 * redirect, so entry points never branch on Stripe configuration.
 */
export function checkoutPagePath(plan: BillingPlan): string {
  return `/checkout?plan=${plan}`;
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

/**
 * Send a buyer to checkout for a plan: navigate to the on-site /checkout
 * page, which mounts Stripe's embedded form when configured and falls
 * back to the hosted redirect otherwise (lib/billing/embedded-checkout
 * owns that decision, so it lives in exactly one place). Returns the path
 * navigated to. The navigate step is injectable for tests; in the browser
 * it is a full-page navigation, matching the redirect this replaced.
 */
export function startPlanCheckout(
  plan: BillingPlan,
  navigate: (path: string) => void = (path) => {
    window.location.href = path;
  },
): string {
  const path = checkoutPagePath(plan);
  navigate(path);
  return path;
}

export interface HostedCheckoutDeps {
  /** Injectable for tests; defaults to the global fetch. */
  fetchImpl?: (
    input: string,
    init: RequestInit,
  ) => Promise<{ ok: boolean; json: () => Promise<any> }>;
  /** Injectable for tests; defaults to a full-page navigation. */
  navigate?: (url: string) => void;
}

/**
 * The hosted-checkout option (Jameson's standing ask: always keep a way
 * to use Stripe's main checkout page too). POSTs /api/checkout WITHOUT
 * ui:"embedded" — the route then answers with the hosted {url}, the same
 * answer lib/billing/embedded-checkout's fallback navigates to — and
 * navigates there. This is the explicit, user-chosen version of that
 * fallback: it leaves worldeye.app for Stripe's page and returns via the
 * session's success/cancel URLs, so /welcome and the webhook see no
 * difference. Resolves with the URL navigated to; on refusal it throws
 * a CheckoutError (lib/billing/checkout-error) carrying the server's
 * message verbatim — plus its code and manage path, so a member who
 * already holds a plan can be offered the manage action instead of a
 * bare string and a futile retry.
 */
export async function startHostedCheckout(
  plan: BillingPlan,
  deps: HostedCheckoutDeps = {},
): Promise<string> {
  const fetchImpl =
    deps.fetchImpl ?? (fetch as unknown as NonNullable<HostedCheckoutDeps["fetchImpl"]>);
  const navigate =
    deps.navigate ??
    ((url: string) => {
      window.location.href = url;
    });
  const res = await fetchImpl("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(checkoutRequestBody(plan)),
  });
  const data = await res.json().catch(() => null);
  if (res.ok && typeof data?.url === "string") {
    // Browser twin of the route's Conversions API InitiateCheckout —
    // same event id, so Meta deduplicates the pair. Fired before the
    // navigation so it isn't lost to the page unload.
    if (typeof data?.metaEventId === "string") {
      trackMetaEvent("InitiateCheckout", {}, data.metaEventId);
    }
    navigate(data.url);
    return data.url;
  }
  throw checkoutErrorFromData(data);
}
