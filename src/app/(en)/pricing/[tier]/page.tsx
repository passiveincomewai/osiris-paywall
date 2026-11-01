import { Suspense } from "react";
import { notFound } from "next/navigation";
import PlanDetailClient from "./PlanDetailClient";
import CheckoutReturnStrip from "@/components/CheckoutReturnStrip";
import StripeResourceHints from "@/components/StripeResourceHints";
import JsonLd from "@/components/JsonLd";
import { localizedMetadata, localizedUrl } from "@/lib/i18n-seo";
import { enPricing } from "@/i18n/dictionaries/en/pricing";
import { checkoutPlanSummary, type CheckoutPlanId } from "@/lib/billing/trial-checkout";
import { resolvePlans, type PlanKey } from "@/lib/billing/plans";

/**
 * Per-plan detail pages (/pricing/lite|pro|ultra) — Pricing Redesign
 * v2 (2026-11-01). English-only routes at launch: the slugs are not
 * in the i18n manifest's published set, so localizedMetadata emits
 * en + x-default hreflang only. The Spanish copy already lives in
 * the pricing dictionary's planDetails block for a later /es route.
 *
 * Structured data mirrors components/pages/pricing-schema.ts (which
 * stays untouched): offers come from the billing module's own plan
 * summaries and are advertised only when the plan's Stripe price id
 * is configured (resolvePlans().sellable) — the structured data
 * never offers a plan checkout would refuse.
 */

type TierKey = "lite" | "pro" | "ultra";
const TIERS: TierKey[] = ["lite", "pro", "ultra"];

function isTier(value: string): value is TierKey {
  return (TIERS as string[]).includes(value);
}

export function generateStaticParams() {
  return TIERS.map((tier) => ({ tier }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tier: string }>;
}) {
  const { tier } = await params;
  if (!isTier(tier)) return {};
  const detail = enPricing.planDetails[tier];
  return localizedMetadata({
    slug: `pricing/${tier}`,
    locale: "en",
    title: detail.metaTitle,
    description: detail.metaDescription,
  });
}

const CHECKOUT_KEYS: Record<TierKey, CheckoutPlanId[]> = {
  lite: ["lite_weekly", "lite_monthly", "lite_annual"],
  pro: ["weekly", "monthly", "annual"],
  ultra: ["ultra_weekly", "ultra_monthly", "ultra_annual"],
};

/** Checkout key → the plan-config key that gates it (same mapping
 *  as pricing-schema.ts). */
const PLAN_KEY_BY_CHECKOUT_KEY: Record<string, PlanKey> = {
  weekly: "pro_weekly",
  monthly: "pro_monthly",
  annual: "pro_annual",
  lite_weekly: "lite_weekly",
  lite_monthly: "lite_monthly",
  lite_annual: "lite_annual",
  ultra_weekly: "ultra_weekly",
  ultra_monthly: "ultra_monthly",
  ultra_annual: "ultra_annual",
};

const priceValue = (display: string) => display.replace(/[^0-9.]/g, "");

function buildPlanJsonLd(tier: TierKey) {
  const detail = enPricing.planDetails[tier];
  const pageUrl = localizedUrl(`pricing/${tier}`, "en");
  const plans = resolvePlans(process.env);
  const offers = CHECKOUT_KEYS[tier]
    .map((key) => checkoutPlanSummary(key))
    .filter((s) => {
      if (!s) return false;
      const planKey = PLAN_KEY_BY_CHECKOUT_KEY[s.plan];
      return planKey !== undefined && plans[planKey].sellable;
    })
    .map((s) => ({
      "@type": "Offer",
      name: s!.name,
      price: priceValue(s!.price),
      priceCurrency: "USD",
      description: `${s!.price}${s!.per} — ${s!.note}`,
      availability: "https://schema.org/InStock",
      url: pageUrl,
    }));
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `WorldEye ${enPricing.tiers[tier].name}`,
    description: detail.metaDescription,
    url: pageUrl,
    brand: { "@type": "Organization", name: "WorldEye", url: "https://worldeye.app" },
    offers,
  };
}

function buildTierFaqJsonLd(tier: TierKey) {
  const detail = enPricing.planDetails[tier];
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url: localizedUrl(`pricing/${tier}`, "en"),
    mainEntity: detail.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ tier: string }>;
}) {
  const { tier } = await params;
  if (!isTier(tier)) notFound();
  return (
    <>
      <JsonLd data={buildPlanJsonLd(tier)} />
      <JsonLd data={buildTierFaqJsonLd(tier)} />
      {/* The plan CTAs mount Stripe's embedded form in a sheet — warm
          its connections from first paint (see StripeResourceHints). */}
      <StripeResourceHints />
      {/* Renders only for ?checkout=cancelled arrivals (Stripe's cancel
          return) — everyone else sees the plain plan page. */}
      <Suspense fallback={null}>
        <CheckoutReturnStrip />
      </Suspense>
      <PlanDetailClient tier={tier} />
    </>
  );
}
