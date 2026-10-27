import { Suspense } from "react";
import PricingClient from "./PricingClient";
import CheckoutReturnStrip from "@/components/CheckoutReturnStrip";
import StripeResourceHints from "@/components/StripeResourceHints";
import JsonLd from "@/components/JsonLd";
import { CHECKOUT_PLAN_SUMMARIES } from "@/lib/billing/trial-checkout";

export const metadata = {
  title: "Pricing & Plans — 10-Day Free Trial on Every Plan",
  description: "WorldEye is free: the globe, 74,229 live cameras and flight tracking. Go Pro from $7.99/week, $13.99/month or VIP Pro $74.99/year — Weekly starts with a 3-day free trial; Monthly and VIP Pro start with 10 days free.",
  alternates: {
    canonical: "https://worldeye.app/pricing",
  },
  openGraph: {
    title: "Pricing & Plans — 10-Day Free Trial on Every Plan | WorldEye",
    description: "The globe, 74,229 live cameras and flight tracking are free. Pro from $7.99/week or VIP Pro $74.99/year — Weekly starts with a 3-day free trial; Monthly and VIP Pro start with 10 days free.",
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
