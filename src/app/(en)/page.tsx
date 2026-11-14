import type { Metadata } from "next";
import Dashboard from "@/components/Dashboard";
import LatestStories from "@/components/home/LatestStories";
import JsonLd from "@/components/JsonLd";
import { enPricing } from "@/i18n/dictionaries/en/pricing";
import { buildPricingSoftwareJsonLd } from "@/components/pages/pricing-schema";
import { hreflangMapFor } from "@/lib/i18n-seo";

/**
 * English homepage route. The globe app itself is the Dashboard
 * client component (src/components/Dashboard.tsx — the pre-i18n
 * page.tsx, moved so this route file can carry metadata); it reads
 * the active locale from context and renders the content shell in
 * that locale's dictionary. Title/description stay the layout
 * defaults, exactly as before; this export adds only the homepage's
 * hreflang alternates (en / es / x-default).
 */
export const metadata: Metadata = {
  alternates: {
    canonical: "https://worldeye.app",
    languages: hreflangMapFor(""),
  },
};

// SoftwareApplication schema — the shared builder from the pricing
// page (offer prices come from the billing module's own plan
// summaries), so the product's structured data matches /pricing.
const softwareJsonLd = buildPricingSoftwareJsonLd(enPricing, "en");

export default function Page() {
  return (
    <>
      <JsonLd data={softwareJsonLd} />
      <Dashboard />
      <LatestStories />
    </>
  );
}
