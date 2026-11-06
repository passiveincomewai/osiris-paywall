import { Suspense } from "react";
import PricingClient from "./PricingClient";
import CheckoutReturnStrip from "@/components/CheckoutReturnStrip";
import StripeResourceHints from "@/components/StripeResourceHints";
import JsonLd from "@/components/JsonLd";
import { localizedMetadata } from "@/lib/i18n-seo";
import { enPricing } from "@/i18n/dictionaries/en/pricing";
import { buildPricingSoftwareJsonLd } from "@/components/pages/pricing-schema";
import { giftSubscriptionsEnabled } from "@/lib/billing/gift-flag";

// Metadata via the shared localized helper: the canonical and OG
// values are byte-identical to the pre-i18n hardcoded ones; the
// helper adds the reciprocal hreflang map (en/es/x-default) and OG
// locale fields the page didn't emit before.
const baseMetadata = localizedMetadata({
  slug: "pricing",
  locale: "en",
  title: enPricing.meta.title,
  description: enPricing.meta.description,
});

export const metadata = {
  ...baseMetadata,
  // The page's OG description differs from its meta description
  // (as it did pre-i18n) — restore it over the helper's default.
  openGraph: {
    ...baseMetadata.openGraph,
    description: enPricing.meta.ogDescription,
  },
};

// SoftwareApplication schema — built by the shared builder (offer
// prices come from the billing module's own plan summaries).
const softwareJsonLd = buildPricingSoftwareJsonLd(enPricing, "en");

export default function PricingPage() {
  return (
    <>
      <JsonLd data={softwareJsonLd} />
      {/* The plan CTAs mount Stripe's embedded form in a sheet — warm
          its connections from first paint (see StripeResourceHints). */}
      <StripeResourceHints />
      {/* Renders only for ?checkout=cancelled arrivals (Stripe's cancel
          return) — everyone else sees the plain pricing page. */}
      <Suspense fallback={null}>
        <CheckoutReturnStrip />
      </Suspense>
      <PricingClient giftEnabled={giftSubscriptionsEnabled(process.env)} />
    </>
  );
}
