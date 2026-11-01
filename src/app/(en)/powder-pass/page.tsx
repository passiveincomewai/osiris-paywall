import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PowderPassClient from "./PowderPassClient";
import { POWDER_FAQS } from "./powder-faqs";
import CheckoutReturnStrip from "@/components/CheckoutReturnStrip";
import StripeResourceHints from "@/components/StripeResourceHints";
import JsonLd from "@/components/JsonLd";
import { powderPassEnabled } from "@/lib/ski/access";
import { CHECKOUT_PLAN_SUMMARIES } from "@/lib/billing/trial-checkout";

/**
 * /powder-pass — the Powder Pass membership's own pricing page
 * (Pricing v3, 2026-11-01). English-only route: Powder Pass has no
 * localized dictionary (it is deliberately absent from /pricing and
 * its dictionaries), so metadata is stated here directly.
 *
 * DARK-LAUNCH RULE: the page exists only while POWDER_PASS_ENABLED
 * is on — the same switch that gates the ski pages' promo card and
 * plan "ski" at checkout (lib/ski/access). Flag off → 404, exactly
 * as if the page had never shipped.
 */

const TITLE = "Powder Pass — WorldEye's Ski-Only Membership";
const DESCRIPTION =
  "Powder Pass is WorldEye's ski-only membership: dawn-patrol snow alerts, the Thursday powder digest, Storm Watch, snow-stake cameras, plow tracking and the pass-value tracker — $4.99/month after a 10-day free trial.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://worldeye.app/powder-pass" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://worldeye.app/powder-pass",
    siteName: "WorldEye",
    type: "website",
  },
};

// Product + FAQ structured data. The offer price comes from the
// billing module's own plan summary — the same source the page's
// checkout sheet charges — never a hardcoded copy.
const ski = CHECKOUT_PLAN_SUMMARIES.ski;
const productJsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Powder Pass",
  description: DESCRIPTION,
  brand: { "@type": "Brand", name: "WorldEye" },
  offers: {
    "@type": "Offer",
    url: "https://worldeye.app/powder-pass",
    price: ski.price.replace("$", ""),
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
};
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: POWDER_FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function PowderPassPage() {
  if (!powderPassEnabled(process.env)) notFound();
  return (
    <>
      <JsonLd data={productJsonLd} />
      <JsonLd data={faqJsonLd} />
      {/* The CTA mounts Stripe's embedded form in a sheet — warm its
          connections from first paint (see StripeResourceHints). */}
      <StripeResourceHints />
      <Suspense fallback={null}>
        <CheckoutReturnStrip />
      </Suspense>
      <PowderPassClient />
    </>
  );
}
