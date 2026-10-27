import type { Metadata } from "next";
import FaqPage from "@/components/pages/FaqPage";
import { localizedMetadata } from "@/lib/i18n-seo";
import { isLocaleCode, type LocaleCode } from "@/i18n/config";
import { getFaqCopy } from "@/i18n/dictionaries";

/** Localized FAQ (/es/faq). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: LocaleCode = isLocaleCode(raw) ? raw : "en";
  const copy = getFaqCopy(locale);
  const base = localizedMetadata({
    slug: "faq",
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
  return <FaqPage copy={getFaqCopy(locale)} locale={locale} />;
}
