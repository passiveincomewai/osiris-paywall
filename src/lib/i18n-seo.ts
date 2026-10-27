/**
 * Localized metadata helper (WorldEye multilingual SEO, Phase 1).
 *
 * One place builds the Next `Metadata` for a localized page:
 * localized title/description, a SELF-referencing canonical, and a
 * reciprocal hreflang map generated from the publication manifest —
 * so hreflang can never drift by hand (brief §5). A locale appears in
 * the map only when the manifest marks that page × locale published;
 * `x-default` points at the English URL.
 *
 * English canonicals produced here are byte-identical to the values
 * pages hardcode today (verified by unit tests): production base from
 * src/lib/app-url.ts, unprefixed path.
 */

import type { Metadata } from "next";
import { PRODUCTION_APP_URL } from "./app-url";
import {
  LOCALES,
  localizedPath,
  type LocaleCode,
} from "@/i18n/config";
import { publishedLocalesFor } from "@/i18n/manifest";

/** Absolute URL for a page in a locale, on the production domain. */
export function localizedUrl(slug: string, locale: LocaleCode): string {
  return `${PRODUCTION_APP_URL}${localizedPath(slug, locale)}`;
}

/**
 * The hreflang map for a slug: one entry per published locale plus
 * `x-default`. Identical no matter which locale version asks for it —
 * that identity is what makes the annotations reciprocal.
 */
export function hreflangMapFor(slug: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of publishedLocalesFor(slug)) {
    languages[LOCALES[locale].hreflang] = localizedUrl(slug, locale);
  }
  languages["x-default"] = localizedUrl(slug, "en");
  return languages;
}

export interface LocalizedMetadataInput {
  /** Page slug without a leading slash; "" is the homepage. */
  slug: string;
  locale: LocaleCode;
  /** Localized title (without the "| WorldEye" template suffix). */
  title: string;
  /** Localized meta description. */
  description: string;
}

export function localizedMetadata({
  slug,
  locale,
  title,
  description,
}: LocalizedMetadataInput): Metadata {
  const url = localizedUrl(slug, locale);
  const published = publishedLocalesFor(slug);
  const alternateLocale = published
    .filter((other) => other !== locale)
    .map((other) => LOCALES[other].ogLocale);

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: hreflangMapFor(slug),
    },
    openGraph: {
      title: `${title} | WorldEye`,
      description,
      url,
      type: "website",
      siteName: "WorldEye",
      locale: LOCALES[locale].ogLocale,
      ...(alternateLocale.length > 0 ? { alternateLocale } : {}),
    },
  };
}
