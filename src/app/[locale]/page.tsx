import Dashboard from "@/components/Dashboard";
import JsonLd from "@/components/JsonLd";
import { isLocaleCode, type LocaleCode } from "@/i18n/config";
import { getPricingCopy } from "@/i18n/dictionaries";
import { buildPricingSoftwareJsonLd } from "@/components/pages/pricing-schema";

/**
 * Localized homepage (/es). Title, description and the hreflang
 * alternates come from the [locale] layout's generateMetadata; the
 * Dashboard reads the route locale from context and renders its
 * content shell (and FAQ JSON-LD) in that locale's dictionary.
 */
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
      <Dashboard />
    </>
  );
}
