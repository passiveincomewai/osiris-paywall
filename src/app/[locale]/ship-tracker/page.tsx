import type { Metadata } from "next";
import ShipTrackerPage from "@/components/pages/ShipTrackerPage";
import { localizedMetadata } from "@/lib/i18n-seo";
import { isLocaleCode, type LocaleCode } from "@/i18n/config";
import { getShipTrackerCopy } from "@/i18n/dictionaries";

/** Localized ship tracker landing page (/es/ship-tracker). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: LocaleCode = isLocaleCode(raw) ? raw : "en";
  const copy = getShipTrackerCopy(locale);
  const base = localizedMetadata({
    slug: "ship-tracker",
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
  return <ShipTrackerPage copy={getShipTrackerCopy(locale)} locale={locale} />;
}
