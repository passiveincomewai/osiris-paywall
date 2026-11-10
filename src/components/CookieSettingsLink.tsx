"use client";

import {
  CONSENT_RESET_EVENT,
  serializeConsentClear,
} from "@/lib/cookie-consent";

/** Footer "Cookie settings": forgets the stored cookie choice and
 *  asks the banner (components/CookieConsent.tsx, mounted site-wide in
 *  RootShell) to reopen via CONSENT_RESET_EVENT, so a visitor can
 *  change their mind without clearing site data. */
export default function CookieSettingsLink() {
  return (
    <button
      type="button"
      onClick={() => {
        document.cookie = serializeConsentClear();
        window.dispatchEvent(new Event(CONSENT_RESET_EVENT));
      }}
      className="text-xs text-white/50 transition hover:text-[#D4AF37]"
    >
      Cookie settings
    </button>
  );
}
