/**
 * SoftwareApplication schema builder for the pricing page, shared by
 * the English and localized pricing routes. Offer prices are read
 * from the billing module's own plan summaries — the same source the
 * /checkout page uses — so the structured data can never drift from
 * the prices actually charged. Only the page URL and the Free offer's
 * description localize (via the pricing dictionary); the plan offers
 * stay in the billing module's own words for every locale.
 *
 * DARK PLANS: CHECKOUT_PLAN_SUMMARIES is exhaustive over BillingPlan so
 * /checkout can describe a plan the day it launches — but a plan that
 * is not yet on sale must never be advertised here. Powder Pass sits
 * behind POWDER_PASS_ENABLED (default OFF); while the flag is off its
 * summary is excluded from these offers, and it appears automatically
 * the day the owner lights the product up.
 */
import { CHECKOUT_PLAN_SUMMARIES } from "@/lib/billing/trial-checkout";
import { powderPassEnabled } from "@/lib/ski/access";
import type { PricingCopy } from "@/i18n/dictionaries/en/pricing";
import type { LocaleCode } from "@/i18n/config";
import { localizedUrl } from "@/lib/i18n-seo";

const priceValue = (display: string) => display.replace(/[^0-9.]/g, "");

export function buildPricingSoftwareJsonLd(
  copy: PricingCopy,
  locale: LocaleCode,
  env: Record<string, string | undefined> = process.env,
) {
  const pageUrl = localizedUrl("pricing", locale);
  const planSummaries = Object.values(CHECKOUT_PLAN_SUMMARIES).filter(
    (s) => s.plan !== "ski" || powderPassEnabled(env),
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
