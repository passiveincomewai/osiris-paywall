import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import RootShell, {
  SITE_ICONS,
  SITE_KEYWORDS,
  SITE_NAME,
  siteViewport,
} from "@/components/RootShell";
import { LOCALES, isLocaleCode, type LocaleCode } from "@/i18n/config";
import { publishedTranslatedLocales } from "@/i18n/manifest";
import { getHomeCopy } from "@/i18n/dictionaries";
import { hreflangMapFor, localizedUrl } from "@/lib/i18n-seo";

/**
 * Localized root layout — the [locale] tree carries its OWN root
 * layout (brief §4, Option B) so <html lang>/<dir> are correct per
 * language. Only locales the manifest publishes at least one page in
 * get routes at all; anything else (fr, de, … until their tranche
 * lands, or junk segments) 404s here instead of serving English under
 * a localized prefix. No redirects, ever.
 */

export function generateStaticParams() {
  return publishedTranslatedLocales().map((locale) => ({ locale }));
}

export const viewport: Viewport = siteViewport;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocaleCode(raw) || !publishedTranslatedLocales().includes(raw)) {
    return {};
  }
  const locale = raw as LocaleCode;
  const home = getHomeCopy(locale);
  return {
    metadataBase: new URL("https://worldeye.app"),
    title: {
      default: home.metaTitle,
      template: "%s | WorldEye",
    },
    description: home.metaDescription,
    keywords: SITE_KEYWORDS,
    authors: [{ name: "WorldEye", url: "https://worldeye.app" }],
    creator: "WorldEye",
    publisher: "WorldEye",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    icons: SITE_ICONS,
    manifest: "/manifest.webmanifest",
    alternates: {
      canonical: localizedUrl("", locale),
      languages: hreflangMapFor(""),
    },
    openGraph: {
      title: home.ogTitle,
      description: home.ogDescription,
      type: "website",
      siteName: SITE_NAME,
      locale: LOCALES[locale].ogLocale,
      url: localizedUrl("", locale),
      images: [
        {
          url: "https://worldeye.app/og-image.png",
          width: 1200,
          height: 630,
          alt: "WorldEye — Live 3D Intelligence Globe",
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: home.ogTitle,
      description: home.ogDescription,
      images: ["https://worldeye.app/og-image.png"],
    },
    category: "technology",
    classification: "Intelligence & Security",
  };
}

export default async function LocaleRootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocaleCode(raw) || !publishedTranslatedLocales().includes(raw)) {
    notFound();
  }
  return <RootShell locale={raw as LocaleCode}>{children}</RootShell>;
}
