import type { Metadata } from "next";
import LiveWebcamsPage from "@/components/pages/LiveWebcamsPage";
import { localizedMetadata } from "@/lib/i18n-seo";
import { isLocaleCode, type LocaleCode } from "@/i18n/config";
import { getLiveWebcamsCopy } from "@/i18n/dictionaries";
import { fill } from "@/i18n/dictionaries/types";
import { COUNTRY_INDEX } from "@/lib/explore-data";

/** Localized live-webcams hub (/es/live-webcams). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: LocaleCode = isLocaleCode(raw) ? raw : "en";
  const copy = getLiveWebcamsCopy(locale);
  const tokens = { countries: String(COUNTRY_INDEX.length) };
  const base = localizedMetadata({
    slug: "live-webcams",
    locale,
    title: copy.meta.title,
    description: fill(copy.meta.description, tokens),
  });
  return {
    ...base,
    openGraph: {
      ...base.openGraph,
      description: fill(copy.meta.ogDescription, tokens),
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: LocaleCode = isLocaleCode(raw) ? raw : "en";
  return <LiveWebcamsPage copy={getLiveWebcamsCopy(locale)} locale={locale} />;
}
