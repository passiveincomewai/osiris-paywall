"use client";

/**
 * Locale context for shared chrome (WorldEye multilingual, Phase 1).
 *
 * The two root layouts mount <LocaleProvider> with their own locale:
 * (en) passes "en", [locale] passes the route's locale. Shared client
 * chrome — the homepage shell, the site footer, the language selector —
 * reads the active locale from here and renders its strings from the
 * typed dictionaries (src/i18n/dictionaries). The default context value
 * is English, so any component rendered outside a provider (unit
 * tests, one-off mounts) renders exactly today's English chrome.
 *
 * This context carries a locale CODE only — never translated content
 * and never routing decisions. The we_locale cookie is not read here:
 * it exists only to pre-highlight the visitor's last choice inside the
 * language selector.
 */

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_LOCALE, type LocaleCode } from "./config";

const LocaleContext = createContext<LocaleCode>(DEFAULT_LOCALE);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: LocaleCode;
  children: ReactNode;
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleCode {
  return useContext(LocaleContext);
}
