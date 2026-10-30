/**
 * Pricing-funnel analytics (Pricing Redesign Phase E) — passive
 * measurement for the 9-plan grid, so the redesign can be read against
 * the frozen pre-redesign baseline (workspace/pricing-redesign/
 * BASELINE.md: session→account 1.41%, accounts→trial 26.9%,
 * trial→paid 27% certain, sessions→paying 0.09%, /pricing reach 5.8%).
 *
 * Emitted through the app's EXISTING first-party analytics path —
 * `trackAnalyticsEvent` (components/AnalyticsTracker) → POST
 * /api/analytics/track → PageView rows — never a parallel pipeline,
 * no external vendor. The track route stores one `event` string with
 * ONE machine-token detail appended as `event:detail`
 * (lib/analytics/ingest-fields: [a-z0-9_], ≤24 chars), so each event
 * below encodes its two facts — surface and plan — as one composite
 * token `<surface>_<planKey>`:
 *
 *   picker_opened:<surface>_<plan>    a plan picker was shown/opened;
 *                                     <plan> is the surface's headline
 *                                     selection at open time (below).
 *   plan_selected:<surface>_<plan>    the user changed tier or period;
 *                                     <plan> is the resulting plan.
 *   checkout_started:<surface>_<plan> a checkout flow was initiated
 *                                     from that surface for that plan.
 *
 * Surfaces:
 *   picker   components/TrialPicker inline (lock flyouts, upgrade
 *            screens, nudges — the picker's default)
 *   dialog   components/TrialPickerDialog (OI dock, trial prompt)
 *   embed    components/ProUpgradeEmbed (Layers panel, OiPreview,
 *            OsintPanel, PremiumSection)
 *   cta      components/TrialCtaCards (content-page offer sections)
 *   pricing  the /pricing page's own checkout sheet
 *   sheet    any other CheckoutSheet host (Powder/Ambient promos —
 *            the plan token, ski/ambient, says which)
 *   hosted   a hosted-checkout initiation with no narrower surface
 *   direct   startPlanCheckout call sites that name no surface
 *
 * Headline-plan rule: TrialPicker holds no single selected-plan state
 * (its period rows are independent CTAs), so for that surface the
 * "plan" in picker_opened / plan_selected is the headline plan of the
 * tier in view — the surface's emphasized plan when it belongs to
 * that tier, else the tier's annual (annual is the redesign's default
 * emphasis everywhere). Read TrialPicker plan_selected as TIER
 * interest with that headline plan attached. Surfaces that hold real
 * selection state (embed, cta) always report the exact selected plan.
 *
 * checkout_started fires ONCE per user initiation, at the client
 * choke points — EmbeddedCheckoutBody's session-creation effect,
 * TrialPicker's navigate-mode pick (via startPlanCheckout), and
 * startHostedCheckout's success — never in the API route, and the
 * /checkout page does NOT re-fire for a navigate-mode pick (it is the
 * continuation of that initiation). A retry creates a new session and
 * fires again: each firing is one session-creation attempt.
 *
 * This module is MEASUREMENT ONLY. It assigns no variants, buckets
 * no visitors and gates nothing — A/B experiment design is reserved
 * for the owner's own later brief (see BASELINE.md readiness notes).
 *
 * Read-side: PageView rows with event LIKE 'picker_opened:%' (etc.),
 * split with splitEvent() from lib/analytics/ingest-fields; the
 * detail's plan suffix is a CheckoutPlanId (bare weekly/monthly/
 * annual are the Pro plans; lite_* / ultra_* are the grid tiers).
 */
import { trackAnalyticsEvent } from "@/components/AnalyticsTracker";

export const PICKER_OPENED_EVENT = "picker_opened";
export const PLAN_SELECTED_EVENT = "plan_selected";
export const CHECKOUT_STARTED_EVENT = "checkout_started";

export type PickerSurface =
  | "picker"
  | "dialog"
  | "embed"
  | "cta"
  | "pricing"
  | "sheet"
  | "hosted"
  | "direct";

/**
 * The composite detail token for one funnel event: `<surface>_<plan>`,
 * normalized to the ingest alphabet ([a-z0-9_]) and capped at the
 * route's 24 chars. The longest real combination — pricing ×
 * ultra_monthly — is 21 chars, so the cap never truncates a plan key.
 */
export function pickerFunnelDetail(surface: PickerSurface, plan: string): string {
  const token = `${surface}_${String(plan).toLowerCase().replace(/[^a-z0-9_]/g, "")}`;
  return token.slice(0, 24);
}

/** A picker surface was shown/opened with `plan` as its headline. */
export function trackPickerOpened(surface: PickerSurface, plan: string): void {
  trackAnalyticsEvent(PICKER_OPENED_EVENT, pickerFunnelDetail(surface, plan));
}

/** The user changed tier/period; `plan` is the resulting plan. */
export function trackPlanSelected(surface: PickerSurface, plan: string): void {
  trackAnalyticsEvent(PLAN_SELECTED_EVENT, pickerFunnelDetail(surface, plan));
}

/** A checkout flow for `plan` was initiated from `surface`. */
export function trackCheckoutStarted(surface: PickerSurface, plan: string): void {
  trackAnalyticsEvent(CHECKOUT_STARTED_EVENT, pickerFunnelDetail(surface, plan));
}
