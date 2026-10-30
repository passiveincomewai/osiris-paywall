/**
 * SoftwareApplication schema builder for the pricing page, shared by
 * the English and localized pricing routes. Offer prices are read
 * from the billing module's own plan summaries — the same source the
 * /checkout page uses — so the structured data can never drift from
 * the prices actually charged. Only the page URL and the Free offer's
 * description localize (via the pricing dictionary); the plan offers
 * stay in the billing module's own words for every locale.
 *
 * OFFERS ARE CONFIG-GATED (Pricing Redesign Phase C): an option is
 * advertised only when its Stripe price id is actually configured
 * (resolvePlans(process.env).sellable, the central plan config) — the
 * structured data never offers a plan checkout would refuse. The Pro
 * grid's summaries are keyed by their historical bare period names,
 * the Lite/Ultra summaries by their grid keys; both resolve to the
 * same PlanKeys in the config.
 *
 * POWDER PASS STAYS OUT — ALWAYS: the ski (Powder Pass) summary is
 * excluded from these offers unconditionally (it is not in
 * OFFER_ORDER at all). The owner ruled the pricing page carries no
 * ski offering at all (2026-10-29: "leave the ski out of this page
 * entirely") — Powder Pass is sold only from the ski pages
 * (components/PowderPassPromo), whatever the state of
 * POWDER_PASS_ENABLED.
 */
import { checkoutPlanSummary, type CheckoutPlanId } from "@/lib/billing/trial-checkout";
import { resolvePlans, type PlanKey } from "@/lib/billing/plans";
import type { PricingCopy } from "@/i18n/dictionaries/en/pricing";
import type { LocaleCode } from "@/i18n/config";
import { localizedUrl } from "@/lib/i18n-seo";

const priceValue = (display: string) => display.replace(/[^0-9.]/g, "");

/** Checkout key → the plan-config key that gates it. */
const PLAN_KEY_BY_CHECKOUT_KEY: Record<string, PlanKey> = {
  weekly: "pro_weekly",
  monthly: "pro_monthly",
  annual: "pro_annual",
  lite_weekly: "lite_weekly",
  lite_monthly: "lite_monthly",
  lite_annual: "lite_annual",
  ultra_weekly: "ultra_weekly",
  ultra_monthly: "ultra_monthly",
  ultra_annual: "ultra_annual",
  enterprise: "enterprise",
  ambient: "ambient",
};

/** Offer order: the 3×3 grid by tier, then the standalone
 *  Enterprise and Ambient offers. */
const OFFER_ORDER: CheckoutPlanId[] = [
  "lite_weekly",
  "lite_monthly",
  "lite_annual",
  "weekly",
  "monthly",
  "annual",
  "ultra_weekly",
  "ultra_monthly",
  "ultra_annual",
  "enterprise",
  "ambient",
];

export function buildPricingSoftwareJsonLd(
  copy: PricingCopy,
  locale: LocaleCode,
) {
  const pageUrl = localizedUrl("pricing", locale);
  const plans = resolvePlans(process.env);
  const planSummaries = OFFER_ORDER.map((key) => checkoutPlanSummary(key)).filter(
    (s) => {
      if (!s) return false;
      const planKey = PLAN_KEY_BY_CHECKOUT_KEY[s.plan];
      return planKey !== undefined && plans[planKey].sellable;
    },
  );
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "WorldEye",
    url: "https://worldeye.app",
    applicationCategory: "SecurityApplication",
    operatingSystem: "Web",
    publisher: { "@id": "https://worldeye.app/#organization" },
    offers: [
      {
        "@type": "Offer",
        name: "Free",
        price: "0",
        priceCurrency: "USD",
        description: copy.schemaFreeOfferDescription,
        availability: "https://schema.org/InStock",
        url: pageUrl,
      },
      ...planSummaries.map((s) => ({
        "@type": "Offer",
        name: s!.name,
        price: priceValue(s!.price),
        priceCurrency: "USD",
        description: `${s!.price}${s!.per} — ${s!.note}`,
        availability: "https://schema.org/InStock",
        url: pageUrl,
      })),
    ],
  };
}
