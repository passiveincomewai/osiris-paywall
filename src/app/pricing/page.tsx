import { Suspense } from "react";
import PricingClient from "./PricingClient";
import CheckoutReturnStrip from "@/components/CheckoutReturnStrip";

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
      {/* Renders only for ?checkout=cancelled arrivals (Stripe's cancel
          return) — everyone else sees the plain pricing page. */}
      <Suspense fallback={null}>
        <CheckoutReturnStrip />
      </Suspense>
      <PricingClient />
    </>
  );
}
