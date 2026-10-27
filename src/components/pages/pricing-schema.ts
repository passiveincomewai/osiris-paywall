/**
 * SoftwareApplication schema builder for the pricing page, shared by
 * the English and localized pricing routes. Offer prices are read
 * from the billing module's own plan summaries — the same source the
 * /checkout page uses — so the structured data can never drift from
 * the prices actually charged. Only the page URL and the Free offer's
 * description localize (via the pricing dictionary); the plan offers
 * stay in the billing module's own words for every locale.
 */
import { CHECKOUT_PLAN_SUMMARIES } from "@/lib/billing/trial-checkout";
import type { PricingCopy } from "@/i18n/dictionaries/en/pricing";
import type { LocaleCode } from "@/i18n/config";
import { localizedUrl } from "@/lib/i18n-seo";

const priceValue = (display: string) => display.replace(/[^0-9.]/g, "");

export function buildPricingSoftwareJsonLd(copy: PricingCopy, locale: LocaleCode) {
  const pageUrl = localizedUrl("pricing", locale);
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
      ...Object.values(CHECKOUT_PLAN_SUMMARIES).map((s) => ({
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
