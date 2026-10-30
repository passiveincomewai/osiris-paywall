/**
 * SoftwareApplication schema builder for the pricing page, shared by
 * the English and localized pricing routes. Offer prices are read
 * from the billing module's own plan summaries — the same source the
 * /checkout page uses — so the structured data can never drift from
 * the prices actually charged. Only the page URL and the Free offer's
 * description localize (via the pricing dictionary); the plan offers
 * stay in the billing module's own words for every locale.
 *
 * POWDER PASS STAYS OUT — ALWAYS: CHECKOUT_PLAN_SUMMARIES is
 * exhaustive over BillingPlan so /checkout can describe a plan the
 * day it launches, but the ski (Powder Pass) summary is excluded
 * from these offers unconditionally. The owner ruled the pricing
 * page carries no ski offering at all (2026-10-29: "leave the ski
 * out of this page entirely") — Powder Pass is sold only from the
 * ski pages (components/PowderPassPromo), whatever the state of
 * POWDER_PASS_ENABLED.
 */
import { CHECKOUT_PLAN_SUMMARIES } from "@/lib/billing/trial-checkout";
import type { PricingCopy } from "@/i18n/dictionaries/en/pricing";
import type { LocaleCode } from "@/i18n/config";
import { localizedUrl } from "@/lib/i18n-seo";

const priceValue = (display: string) => display.replace(/[^0-9.]/g, "");

export function buildPricingSoftwareJsonLd(
  copy: PricingCopy,
  locale: LocaleCode,
) {
  const pageUrl = localizedUrl("pricing", locale);
  const planSummaries = Object.values(CHECKOUT_PLAN_SUMMARIES).filter(
    (s) => s.plan !== "ski",
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
        name: s.name,
        price: priceValue(s.price),
        priceCurrency: "USD",
        description: `${s.price}${s.per} — ${s.note}`,
        availability: "https://schema.org/InStock",
        url: pageUrl,
      })),
    ],
  };
}
