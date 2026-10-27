import { Suspense } from "react";
import PricingClient from "./PricingClient";
import CheckoutReturnStrip from "@/components/CheckoutReturnStrip";
import StripeResourceHints from "@/components/StripeResourceHints";
import JsonLd from "@/components/JsonLd";
import { CHECKOUT_PLAN_SUMMARIES } from "@/lib/billing/trial-checkout";

export const metadata = {
  title: "Pricing — Free, Pro, VIP Pro & Enterprise Plans",
  description: "WorldEye pricing: the live globe, 74,229 cameras and flight tracking are free forever. Pro is $7.99/week (3-day free trial), $13.99/month (10-day free trial) or VIP Pro $74.99/year (10-day free trial). Enterprise — the camera feed API and embed — is $999/year. Cancel anytime.",
  alternates: {
    canonical: "https://worldeye.app/pricing",
  },
  openGraph: {
    title: "Pricing — Free, Pro, VIP Pro & Enterprise Plans | WorldEye",
    description: "The live globe, 74,229 cameras and flight tracking are free forever. Pro from $7.99/week with a free trial; VIP Pro $74.99/year; Enterprise camera feed $999/year. Cancel anytime.",
    url: "https://worldeye.app/pricing",
    type: "website",
  },
};

// SoftwareApplication schema for the pricing page. Offer prices are read
// from the billing module's own plan summaries — the same source the
// /checkout page uses — so the structured data can never drift from the
// prices actually charged.
const priceValue = (display: string) => display.replace(/[^0-9.]/g, "");
const softwareJsonLd = {
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
      description:
        "Free forever — the live globe, 74,229 cameras, flight and satellite tracking, weather, earthquakes and basic search. No account needed.",
      availability: "https://schema.org/InStock",
      url: "https://worldeye.app/pricing",
    },
    ...Object.values(CHECKOUT_PLAN_SUMMARIES).map((s) => ({
      "@type": "Offer",
      name: s.name,
      price: priceValue(s.price),
      priceCurrency: "USD",
      description: `${s.price}${s.per} — ${s.note}`,
      availability: "https://schema.org/InStock",
      url: "https://worldeye.app/pricing",
    })),
  ],
};

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
      <PricingClient />
    </>
  );
}
