import Link from "next/link";
import NewsletterForm from "./NewsletterForm";
import FooterAuthButtons from "./FooterAuthButtons";
import LanguageSelector from "./LanguageSelector";
import { localizedPath, type LocaleCode } from "@/i18n/config";
import { isPublished } from "@/i18n/manifest";
import { getChromeCopy, type ChromeCopy } from "@/i18n/dictionaries";

/**
 * Site footer. Copy comes from the chrome dictionary
 * (src/i18n/dictionaries/<locale>/chrome.ts); with no props it renders
 * exactly the pre-i18n English footer. Localized pages pass their
 * locale (and their slug, which enables the language selector in the
 * bottom bar — the selector itself only renders when the manifest
 * publishes that page in more than one locale). Footer links to pages
 * published in the current locale point at the localized URL; all
 * other links keep their English URL.
 */
export default function SiteFooter({
  newsletterHeadline,
  newsletterSub,
  copy,
  locale = "en",
  slug,
}: {
  newsletterHeadline?: string;
  newsletterSub?: string;
  copy?: ChromeCopy;
  locale?: LocaleCode;
  /** Current page slug — enables the language selector when set. */
  slug?: string;
} = {}) {
  const chrome = copy ?? getChromeCopy(locale);
  const headline = newsletterHeadline ?? chrome.newsletterHeadline;
  const sub = newsletterSub ?? chrome.newsletterSub;

  const hrefFor = (href: string): string => {
    if (locale === "en") return href;
    const linkSlug = href === "/" ? "" : href.replace(/^\//, "");
    return isPublished(linkSlug, locale)
      ? localizedPath(linkSlug, locale)
      : href;
  };

  return (
    <footer className="border-t border-white/10 mt-24">
      {/* Newsletter band */}
      <div className="max-w-6xl mx-auto px-6 pt-12 pb-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-5 justify-between">
          <div>
            <p className="font-mono text-[11px] font-medium tracking-[0.25em] text-[#0096FF] mb-2">{chrome.newsletterEyebrow}</p>
            <h3 className="font-display text-2xl font-medium text-white">{headline}</h3>
            <p className="text-sm text-white/50 mt-1">{sub}</p>
          </div>
          <div className="w-full md:w-auto md:min-w-[340px]">
            <NewsletterForm source="footer" />
          </div>
        </div>
      </div>

      {/* Brand row */}
      <div className="max-w-6xl mx-auto px-6 pt-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-md">
          <Link href={localizedPath("", locale)} aria-label="WorldEye — back to the live globe" className="inline-flex items-center">
            <img
              src="/worldeye-header-logo.png"
              alt="WorldEye"
              width={1063}
              height={290}
              loading="lazy"
              decoding="async"
              className="h-10 w-auto"
            />
          </Link>
          <p className="text-sm text-white/50 mt-4 leading-relaxed">
            {chrome.brandTagline}
          </p>
          <a
            href="https://www.instagram.com/worldeye.app"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WorldEye on Instagram"
            className="mt-4 inline-flex items-center gap-2 text-sm text-white/55 hover:text-[#D4AF37] transition"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
              aria-hidden="true"
            >
              <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
            </svg>
            @worldeye.app
          </a>
        </div>
        <FooterAuthButtons />
      </div>

      {/* Link columns */}
      <nav aria-label="Footer" className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-x-6 gap-y-10">
        {chrome.footerColumns.map((col) => (
          <div key={col.title}>
            <p className="font-mono text-[11px] font-medium tracking-[0.25em] text-white/60 mb-4">
              {col.title.toUpperCase()}
            </p>
            <ul className="space-y-3">
              {col.links.map(({ label, href }) => (
                // Key is the label alone, never href + label: React keys are
                // serialized into the RSC payload, and "/pricing" + "Pricing"
                // formed a URL-like string Googlebot crawled as a 404
                // (/pricingPricing, /faqFAQ, /aboutAbout, …). Labels are
                // unique within each column, so the label alone is a safe key.
                <li key={label}>
                  <Link
                    href={hrefFor(href)}
                    className="text-sm text-white/55 hover:text-[#D4AF37] transition"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom bar */}
      <div className="border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-white/50">
          <span>{chrome.copyright}</span>
          {slug !== undefined ? (
            <LanguageSelector slug={slug} locale={locale} />
          ) : null}
          <span className="hidden sm:inline">{chrome.liveDataNote}</span>
        </div>
      </div>
    </footer>
  );
}
