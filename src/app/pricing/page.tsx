import { Suspense } from "react";
import PricingClient from "./PricingClient";
import CheckoutReturnStrip from "@/components/CheckoutReturnStrip";
import StripeResourceHints from "@/components/StripeResourceHints";
import JsonLd from "@/components/JsonLd";
import { CHECKOUT_PLAN_SUMMARIES } from "@/lib/billing/trial-checkout";

export const metadata = {
  title: "Pricing & Plans",
  description: "The map is free — globe, 74,229 cameras, flights, transit and basic search. Pro unlocks the AI assistant, satellite view, live traffic and premium intel feeds. Weekly, monthly or annual.",
  alternates: {
    canonical: "https://worldeye.app/pricing",
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
