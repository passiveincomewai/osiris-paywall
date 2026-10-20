import { Suspense } from "react";
import PricingClient from "./PricingClient";
import CheckoutReturnStrip from "@/components/CheckoutReturnStrip";
import StripeResourceHints from "@/components/StripeResourceHints";

export const metadata = {
  title: "Pricing & Plans",
  description: "The map is free — globe, 74,229 cameras, flights, transit and basic search. Pro unlocks the AI assistant, satellite view, live traffic and premium intel feeds. Weekly, monthly or annual.",
  alternates: {
    canonical: "https://worldeye.app/pricing",
  },
};

export default function PricingPage() {
  return (
    <>
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
