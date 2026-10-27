"use client";

/**
 * Language selector (brief §7) — manifest-driven.
 *
 * Renders one link per locale in which the CURRENT page is actually
 * published (src/i18n/manifest.ts), via the same localizedPath() the
 * hreflang map uses, so the selector can never offer a translation
 * that doesn't exist. Plain <Link> anchors — real, crawlable
 * cross-links between the language versions — preserving the current
 * query string. Clicking a link is the ONLY thing that writes the
 * `we_locale` cookie (pre-highlight preference for a future visit);
 * nothing reads the cookie for routing and there are no redirects,
 * ever (brief §4/§7).
 */

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LOCALES, localizedPath, type LocaleCode } from "@/i18n/config";
import { publishedLocalesFor } from "@/i18n/manifest";

function rememberLocale(locale: LocaleCode) {
  try {
    document.cookie = `we_locale=${locale}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    /* cookie is a nicety, never load-bearing */
  }
}

function GlobeIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 opacity-70"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function SelectorLinks({
  slug,
  locale,
  className,
}: {
  slug: string;
  locale: LocaleCode;
  className?: string;
}) {
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const locales = publishedLocalesFor(slug);
  if (locales.length < 2) return null;
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <GlobeIcon />
      <span role="list" className="inline-flex items-center gap-2">
        {locales.map((code) => {
          const href = localizedPath(slug, code) + (query ? `?${query}` : "");
          const label = LOCALES[code].nativeName;
          return code === locale ? (
            <span
              key={code}
              role="listitem"
              aria-current="true"
              lang={LOCALES[code].hreflang}
              className="font-semibold text-[#e8e4da]"
            >
              {label}
            </span>
          ) : (
            <Link
              key={code}
              role="listitem"
              href={href}
              hrefLang={LOCALES[code].hreflang}
              lang={LOCALES[code].hreflang}
              onClick={() => rememberLocale(code)}
              className="transition-colors hover:text-[#e8e4da]"
            >
              {label}
            </Link>
          );
        })}
      </span>
    </span>
  );
}

export default function LanguageSelector({
  slug,
  locale,
  className,
}: {
  /** Page slug ("" for home) — the manifest decides what renders. */
  slug: string;
  /** The locale of the page being rendered. */
  locale: LocaleCode;
  className?: string;
}) {
  return (
    <Suspense fallback={null}>
      <SelectorLinks slug={slug} locale={locale} className={className} />
    </Suspense>
  );
}
