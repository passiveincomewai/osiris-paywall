/**
 * WorldEye internationalization — locale configuration.
 *
 * Source of truth for the locales the multilingual SEO project supports
 * (BRIEF.md at ~/workspace/worldeye-i18n, 2026-10-14; page selection
 * refreshed 2026-10-21). English is the default and is NEVER prefixed —
 * existing English URLs do not change. The nine additional locales live
 * under `/<locale>/...` for selected pages only (see manifest.ts).
 *
 * Adding a locale here does not publish anything: a locale only appears
 * in hreflang maps, sitemaps and the language selector for a page once
 * the manifest marks that page × locale as published.
 */

export type LocaleCode =
  | "en"
  | "es"
  | "fr"
  | "de"
  | "pt-br"
  | "ja"
  | "ko"
  | "ar"
  | "hi"
  | "zh-cn";

export interface LocaleInfo {
  /** URL prefix code, e.g. "pt-br". Also the dictionary folder name. */
  code: LocaleCode;
  /** BCP 47 tag for hreflang annotations, e.g. "pt-BR". */
  hreflang: string;
  /** The language's name in its own script — used by the selector. */
  nativeName: string;
  /** English name, for admin/reporting surfaces. */
  englishName: string;
  /** Text direction for the locale's root layout. */
  dir: "ltr" | "rtl";
  /** Open Graph locale, e.g. "pt_BR". */
  ogLocale: string;
}

export const DEFAULT_LOCALE: LocaleCode = "en";

export const LOCALES: Record<LocaleCode, LocaleInfo> = {
  en: {
    code: "en",
    hreflang: "en",
    nativeName: "English",
    englishName: "English",
    dir: "ltr",
    ogLocale: "en_US",
  },
  es: {
    code: "es",
    hreflang: "es",
    nativeName: "Español",
    englishName: "Spanish",
    dir: "ltr",
    ogLocale: "es_ES",
  },
  fr: {
    code: "fr",
    hreflang: "fr",
    nativeName: "Français",
    englishName: "French",
    dir: "ltr",
    ogLocale: "fr_FR",
  },
  de: {
    code: "de",
    hreflang: "de",
    nativeName: "Deutsch",
    englishName: "German",
    dir: "ltr",
    ogLocale: "de_DE",
  },
  "pt-br": {
    code: "pt-br",
    hreflang: "pt-BR",
    nativeName: "Português (Brasil)",
    englishName: "Portuguese (Brazil)",
    dir: "ltr",
    ogLocale: "pt_BR",
  },
  ja: {
    code: "ja",
    hreflang: "ja",
    nativeName: "日本語",
    englishName: "Japanese",
    dir: "ltr",
    ogLocale: "ja_JP",
  },
  ko: {
    code: "ko",
    hreflang: "ko",
    nativeName: "한국어",
    englishName: "Korean",
    dir: "ltr",
    ogLocale: "ko_KR",
  },
  ar: {
    code: "ar",
    hreflang: "ar",
    nativeName: "العربية",
    englishName: "Arabic",
    dir: "rtl",
    ogLocale: "ar_AR",
  },
  hi: {
    code: "hi",
    hreflang: "hi",
    nativeName: "हिन्दी",
    englishName: "Hindi",
    dir: "ltr",
    ogLocale: "hi_IN",
  },
  "zh-cn": {
    code: "zh-cn",
    hreflang: "zh-CN",
    nativeName: "简体中文",
    englishName: "Simplified Chinese",
    dir: "ltr",
    ogLocale: "zh_CN",
  },
};

/** All supported locales, default first, in brief order. */
export const LOCALE_CODES: LocaleCode[] = [
  "en",
  "es",
  "fr",
  "de",
  "pt-br",
  "ja",
  "ko",
  "ar",
  "hi",
  "zh-cn",
];

/** The nine translated locales (everything except the English default). */
export const TRANSLATED_LOCALES: LocaleCode[] = LOCALE_CODES.filter(
  (code) => code !== DEFAULT_LOCALE
);

export function isLocaleCode(value: string): value is LocaleCode {
  return (LOCALE_CODES as string[]).includes(value);
}

/**
 * URL path for a page in a locale. Slugs are stored without a leading
 * slash; "" is the homepage. English is unprefixed — its path is
 * byte-identical to the page's current URL path.
 */
export function localizedPath(slug: string, locale: LocaleCode): string {
  const base = slug === "" ? "/" : `/${slug}`;
  if (locale === DEFAULT_LOCALE) return base;
  // The locale homepage serves at /es (200); /es/ 308-redirects to it,
  // so the canonical path form carries no trailing slash (SEO audit
  // 2026-10-27, fix #3) — sitemap entries, canonicals and hreflang
  // targets all derive from this one function.
  return base === "/" ? `/${locale}` : `/${locale}${base}`;
}
