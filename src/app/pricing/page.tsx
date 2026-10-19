import PricingClient from "./PricingClient";

export const metadata = {
  title: "Pricing & Plans",
  description: "The map is free — globe, 76,000+ cameras, flights, transit and basic search. Pro unlocks the AI assistant, satellite view, live traffic and premium intel feeds. Weekly, monthly or annual.",
  alternates: {
    canonical: "https://worldeye.app/pricing",
  },
};

export default function PricingPage() {
  return <PricingClient />;
}
