/**
 * Locale state for the site-wide machine-translation control.
 *
 * Source of truth is a pair of cookies:
 *
 *   we_locale  — our own cookie ('en' or one of TRANSLATE_LANGUAGES' codes).
 *                This is the same cookie name the queued SEO i18n project
 *                plans to read, so the two efforts share state instead of
 *                fighting over it.
 *   googtrans  — the Google Translate web element's cookie, '/en/<code>'.
 *                The element reads it once at init and translates the page.
 *
 * English is the source language and means "translation off". Selecting
 * English deletes BOTH cookies and reloads, so the page comes back as the
 * exact original DOM — no half-translated residue and no reliance on the
 * widget's own (unreliable) "restore" path.
 *
 * Switching language is deliberately reload-based: the translate element
 * only honours the cookie at init, and a fresh load is also what lets the
 * React/DOM safeguards in TranslateGate install before any translated
 * node exists.
 */

import {
  RTL_LANGUAGE_CODES,
  SOURCE_LANGUAGE_CODE,
  TRANSLATE_LANGUAGES,
} from './languages';

export const LOCALE_COOKIE = 'we_locale';
export const GOOGTRANS_COOKIE = 'googtrans';

/** One year, matching the persistence expected of a language preference. */
export const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const VALID_CODES: ReadonlySet<string> = new Set(
  TRANSLATE_LANGUAGES.map((l) => l.code),
);

/** True when `code` is a selectable translation target (not English). */
export function isTranslateLanguage(code: string | null | undefined): boolean {
  return !!code && VALID_CODES.has(code);
}

/**
 * Normalise any raw cookie value into a locale this build can honour:
 * a valid translation code, or English for anything else (missing, 'en',
 * unknown codes from a future/older build, garbage).
 */
export function parseLocale(raw: string | null | undefined): string {
  if (!raw) return SOURCE_LANGUAGE_CODE;
  const code = raw.trim();
  if (code === SOURCE_LANGUAGE_CODE) return SOURCE_LANGUAGE_CODE;
  return VALID_CODES.has(code) ? code : SOURCE_LANGUAGE_CODE;
}

/** The value the Google Translate element expects in its cookie. */
export function googTransValue(code: string): string {
  return `/en/${code}`;
}

/** True when the selected language is written right-to-left. */
export function isRtlLocale(code: string | null | undefined): boolean {
  return !!code && RTL_LANGUAGE_CODES.has(code);
}

/** Read one cookie from a Cookie header / document.cookie string. */
export function readCookieValue(
  cookieString: string | null | undefined,
  name: string,
): string | null {
  if (!cookieString) return null;
  for (const part of cookieString.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      const value = part.slice(eq + 1).trim();
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }
  return null;
}

/** The active locale given a cookie string (document.cookie on the client). */
export function activeLocale(cookieString: string | null | undefined): string {
  return parseLocale(readCookieValue(cookieString, LOCALE_COOKIE));
}

/**
 * Serialise one Set-Cookie value. Kept pure so tests can pin the exact
 * persistence contract (name, path, lifetime) without a DOM.
 */
export function buildCookie(
  name: string,
  value: string | null,
  maxAgeSeconds: number = LOCALE_COOKIE_MAX_AGE_SECONDS,
): string {
  if (value === null) {
    return `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
}

/** The cookie writes a selection implies, in order. Pure — see tests. */
export function cookiesForLocale(code: string): string[] {
  const locale = parseLocale(code);
  if (locale === SOURCE_LANGUAGE_CODE) {
    return [buildCookie(LOCALE_COOKIE, null), buildCookie(GOOGTRANS_COOKIE, null)];
  }
  return [
    buildCookie(LOCALE_COOKIE, locale),
    buildCookie(GOOGTRANS_COOKIE, googTransValue(locale)),
  ];
}

/**
 * Apply a selection in the browser: persist (or clear) the cookies. The
 * caller reloads the page afterwards — translation only takes effect on a
 * fresh load, by design (see module docblock).
 */
export function applyLocale(code: string, doc: Document = document): void {
  for (const cookie of cookiesForLocale(code)) {
    doc.cookie = cookie;
  }
  // The translate element may also have set googtrans for the registrable
  // domain (e.g. .worldeye.app); clear that variant too when restoring
  // English, or the widget would keep translating after "off".
  if (parseLocale(code) === SOURCE_LANGUAGE_CODE && doc.location?.hostname) {
    const host = doc.location.hostname;
    if (host.includes('.')) {
      doc.cookie = `${GOOGTRANS_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; Domain=.${host}`;
    }
  }
}
