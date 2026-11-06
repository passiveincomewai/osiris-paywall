import type { Metadata } from "next";
import { Suspense } from "react";
import PricingClient from "@/app/(en)/pricing/PricingClient";
import CheckoutReturnStrip from "@/components/CheckoutReturnStrip";
import StripeResourceHints from "@/components/StripeResourceHints";
import JsonLd from "@/components/JsonLd";
import { localizedMetadata } from "@/lib/i18n-seo";
import { isLocaleCode, type LocaleCode } from "@/i18n/config";
import { getPricingCopy } from "@/i18n/dictionaries";
import { buildPricingSoftwareJsonLd } from "@/components/pages/pricing-schema";
import { giftSubscriptionsEnabled } from "@/lib/billing/gift-flag";

/**
 * Localized pricing (/es/pricing). Same client, same checkout
 * machinery, same USD prices — only the copy (pricing dictionary)
 * and the page URL localize.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: LocaleCode = isLocaleCode(raw) ? raw : "en";
  const copy = getPricingCopy(locale);
  const base = localizedMetadata({
    slug: "pricing",
    locale,
    title: copy.meta.title,
    description: copy.meta.description,
  });
  return {
    ...base,
    openGraph: { ...base.openGraph, description: copy.meta.ogDescription },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: LocaleCode = isLocaleCode(raw) ? raw : "en";
  const copy = getPricingCopy(locale);
  return (
    <>
      <JsonLd data={buildPricingSoftwareJsonLd(copy, locale)} />
      <StripeResourceHints />
      <Suspense fallback={null}>
        <CheckoutReturnStrip />
      </Suspense>
      <PricingClient
        copy={copy}
        locale={locale}
        giftEnabled={giftSubscriptionsEnabled(process.env)}
      />
    </>
  );
}
