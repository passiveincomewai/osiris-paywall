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
import { trackCheckoutStarted, type PickerSurface } from "./picker-analytics";

/* The Pro trial plans sold from /pricing and the Pro lock surfaces.
 * Ambient is excluded on purpose: it is a standalone product with its
 * own landing page and checkout entry (the /ambient paywall and
 * /ambient-mode), not a row in the Pro trial picker. Powder Pass is
 * excluded for the same reason: a standalone ski-only product (dark
 * until POWDER_PASS_ENABLED — lib/ski/access), never a picker row. */
export type TrialPlan = Exclude<BillingPlan, "enterprise" | "ambient" | "ski">;

/* The Lite/Ultra grid keys (Pricing Redesign Phase C): the checkout
 * route accepts these strings directly (its PLAN_KEY_BY_CHECKOUT_PLAN
 * maps them to the central plan config), while the Pro grid keeps its
 * historical bare period names above. A CheckoutPlanId is therefore
 * anything /api/checkout will accept from a client: a BillingPlan or
 * one of the six grid keys. */
export type GridCheckoutPlan =
  | "lite_weekly"
  | "lite_monthly"
  | "lite_annual"
  | "ultra_weekly"
  | "ultra_monthly"
  | "ultra_annual";

export type CheckoutPlanId = BillingPlan | GridCheckoutPlan;

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
  plan: CheckoutPlanId;
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

/**
 * The Lite/Ultra grid summaries (Pricing Redesign Phase C). Names are
 * the central plan config's display names (lib/billing/plans), prices
 * are the verified Stripe prices, and the note / trial wording is the
 * period's own PLAN_COPY — a grid plan's trial is its PERIOD's trial
 * (weekly 3 days, monthly/annual 10), derived via trialDaysForPlan on
 * the period, never on the grid key itself.
 */
function gridSummary(
  plan: GridCheckoutPlan,
  name: string,
  price: string,
  per: string,
  perDay: string,
  period: TrialPlan,
): CheckoutPlanSummary {
  const c = PLAN_COPY[period];
  return {
    plan,
    name,
    price,
    per,
    perDay,
    note: c.note,
    trialLabel: c.trialLabel,
    trialDays: trialDaysForPlan(period),
  };
}

export const GRID_PLAN_SUMMARIES: Record<GridCheckoutPlan, CheckoutPlanSummary> = {
  lite_weekly: gridSummary("lite_weekly", "Lite Weekly", "$4.99", "/week", "$0.71", "weekly"),
  lite_monthly: gridSummary("lite_monthly", "Lite Monthly", "$8.99", "/month", "$0.30", "monthly"),
  lite_annual: gridSummary("lite_annual", "Lite Annual", "$44.99", "/year", "$0.12", "annual"),
  ultra_weekly: gridSummary("ultra_weekly", "Ultra Weekly", "$12.99", "/week", "$1.86", "weekly"),
  ultra_monthly: gridSummary("ultra_monthly", "Ultra Monthly", "$24.99", "/month", "$0.83", "monthly"),
  ultra_annual: gridSummary("ultra_annual", "Ultra Annual", "$149.99", "/year", "$0.41", "annual"),
};

/** Summary lookup that tolerates raw strings (URL params): unknown → null. */
export function checkoutPlanSummary(plan: string | null | undefined): CheckoutPlanSummary | null {
  if (plan === "weekly" || plan === "monthly" || plan === "annual" || plan === "enterprise" || plan === "ambient" || plan === "ski") {
    return CHECKOUT_PLAN_SUMMARIES[plan];
  }
  if (plan && plan in GRID_PLAN_SUMMARIES) {
    return GRID_PLAN_SUMMARIES[plan as GridCheckoutPlan];
  }
  return null;
}

/**
 * The 3×3 grid the upgrade surfaces offer (Pricing Redesign Phase D):
 * every sellable tier × period as one option list, so the shared
 * picker (components/TrialPicker), the layers-panel embed and the
 * content-page cards all render the SAME nine options from this one
 * table instead of each hard-wiring the three Pro plans. Facts are
 * composed, never restated: names, prices, notes and trial labels come
 * from the plan summaries above (themselves pinned to /pricing), the
 * CTA is the period's own PLAN_COPY wording, and trial lengths resolve
 * through trialDaysForPlan on the PERIOD — the single source the
 * checkout route uses. Enterprise, Ambient and Powder Pass stay out:
 * standalone products, never grid cells.
 */
export type PlanTier = "lite" | "pro" | "ultra";

export interface GridPlanOption
  extends Omit<CheckoutPlanSummary, "trialLabel"> {
  tier: PlanTier;
  /** The billing period, as a Pro trial-plan key — its PLAN_COPY row
   *  (note / CTA / trial label) is the period's own, shared by tiers. */
  period: TrialPlan;
  /** The period's CTA from /pricing's plan card, e.g. "Start 3-Day Free Trial". */
  cta: string;
  /** Every grid plan carries a real trial, so — unlike the summary —
   *  the label is never null here. */
  trialLabel: string;
}

const GRID_TIERS: PlanTier[] = ["lite", "pro", "ultra"];
const GRID_PERIODS: TrialPlan[] = ["weekly", "monthly", "annual"];

/** The checkout plan key for a tier × period (the route contract:
 *  Pro keeps its historical bare period names; Lite/Ultra use the
 *  grid keys). */
export function gridCheckoutPlan(tier: PlanTier, period: TrialPlan): CheckoutPlanId {
  return tier === "pro" ? period : (`${tier}_${period}` as GridCheckoutPlan);
}

function gridOption(tier: PlanTier, period: TrialPlan): GridPlanOption {
  const plan = gridCheckoutPlan(tier, period);
  const summary = checkoutPlanSummary(plan);
  if (!summary) throw new Error(`no checkout summary for grid plan ${plan}`);
  return {
    ...summary,
    tier,
    period,
    cta: PLAN_COPY[period].cta,
    // Grid plans all carry a real trial, so the label is never the
    // summary's null (free-plan) case; fall back to the same wording
    // shape rather than ever rendering an empty badge.
    trialLabel: summary.trialLabel ?? `${summary.trialDays} days free`,
  };
}

/** All nine grid options, tier-major then period (Lite W/M/A, Pro
 *  W/M/A, Ultra W/M/A) — the picker's canonical order. */
export const GRID_PLAN_OPTIONS: GridPlanOption[] = GRID_TIERS.flatMap((tier) =>
  GRID_PERIODS.map((period) => gridOption(tier, period)),
);

/** The grid grouped by tier — the picker's tab content. */
export const TIER_PLAN_OPTIONS: Record<PlanTier, GridPlanOption[]> = {
  lite: GRID_PLAN_OPTIONS.filter((o) => o.tier === "lite"),
  pro: GRID_PLAN_OPTIONS.filter((o) => o.tier === "pro"),
  ultra: GRID_PLAN_OPTIONS.filter((o) => o.tier === "ultra"),
};

/** The tier a checkout plan belongs to, or null for the standalone
 *  plans (enterprise / ambient / ski) that are never grid cells. */
export function tierForCheckoutPlan(plan: CheckoutPlanId): PlanTier | null {
  if (plan.startsWith("lite_")) return "lite";
  if (plan.startsWith("ultra_")) return "ultra";
  if (plan === "weekly" || plan === "monthly" || plan === "annual") return "pro";
  return null;
}

/** One grid option by plan key, or null for standalone plans. */
export function gridPlanOption(plan: CheckoutPlanId): GridPlanOption | null {
  return GRID_PLAN_OPTIONS.find((o) => o.plan === plan) ?? null;
}

/** The request body /api/checkout expects. Trial length, prices and
 *  affiliate attribution are all resolved server-side — the client cannot
 *  (and must not) restate them. `ui: "embedded"` asks the route for a
 *  session the /checkout page can mount on this domain (it answers with a
 *  clientSecret); without it the route answers with the hosted url. */
export function checkoutRequestBody(
  plan: CheckoutPlanId,
  ui?: "embedded",
): { plan: CheckoutPlanId; ui?: "embedded" } {
  return ui ? { plan, ui } : { plan };
}

/**
 * The on-site checkout destination for a plan. Every buy surface lands
 * here; the page itself decides between the embedded form and the hosted
 * redirect, so entry points never branch on Stripe configuration.
 */
export function checkoutPagePath(plan: CheckoutPlanId): string {
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
  plan: CheckoutPlanId,
  navigate: (path: string) => void = (path) => {
    window.location.href = path;
  },
  // Phase E funnel attribution: the surface that initiated this
  // checkout (lib/billing/picker-analytics). Call sites that name no
  // surface record "direct"; the /checkout page this navigates to is
  // the continuation of the initiation and does not fire again.
  surface: PickerSurface = "direct",
): string {
  const path = checkoutPagePath(plan);
  trackCheckoutStarted(surface, plan);
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
  /** Phase E funnel attribution: the surface that initiated this
   *  hosted checkout (lib/billing/picker-analytics); "hosted" when
   *  the call site names no narrower surface. */
  surface?: PickerSurface;
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
  plan: CheckoutPlanId,
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
    // Phase E: the session now exists — record the funnel's
    // checkout_started for the initiating surface, also before the
    // navigation. A refused POST never reaches here, so a failure
    // fires nothing (no session was created).
    trackCheckoutStarted(deps.surface ?? "hosted", plan);
    navigate(data.url);
    return data.url;
  }
  throw checkoutErrorFromData(data);
}
