import type { Metadata } from "next";
import LiveFlightTrackerPage from "@/components/pages/LiveFlightTrackerPage";
import { localizedMetadata } from "@/lib/i18n-seo";
import { isLocaleCode, type LocaleCode } from "@/i18n/config";
import { getLiveFlightTrackerCopy } from "@/i18n/dictionaries";

/** Localized flight tracker landing page (/es/live-flight-tracker). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: LocaleCode = isLocaleCode(raw) ? raw : "en";
  const copy = getLiveFlightTrackerCopy(locale);
  const base = localizedMetadata({
    slug: "live-flight-tracker",
    locale,
    title: copy.meta.title,
    description: copy.meta.description,
  });
  return {
    ...base,
    keywords: copy.meta.keywords,
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
  return (
    <LiveFlightTrackerPage copy={getLiveFlightTrackerCopy(locale)} locale={locale} />
  );
}
