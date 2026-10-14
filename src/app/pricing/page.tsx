import PricingClient from "./PricingClient";

export const metadata = {
  title: "Pricing & Plans",
  description: "The map is free. Pro unlocks the AI assistant, satellite view, global search and premium intel feeds. Weekly, monthly or annual.",
  alternates: {
    canonical: "https://worldeye.app/pricing",
  },
};

export default function PricingPage() {
  return <PricingClient />;
}
