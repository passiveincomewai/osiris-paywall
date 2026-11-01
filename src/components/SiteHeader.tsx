"use client";

import Link from "next/link";
import AccountHudControl from "./AccountHudControl";
import { localizedPath, type LocaleCode } from "@/i18n/config";
import type { ChromeCopy } from "@/i18n/dictionaries";

/**
 * Site header — SiteFooter's sibling for the docs-root marketing
 * pages (first consumer: /powder-pass, Pricing v3). Props mirror
 * SiteFooter's: callers that already hold the chrome dictionary pass
 * it as `copy` with their `locale`; with no props it renders the
 * English header.
 *
 * The account slot is AccountHudControl — the same control the globe
 * header uses. It resolves its own labels from the locale context
 * (the chrome dictionary's sign-in string) and owns the identity
 * states: Sign in + the gold Upgrade pill when anonymous, the
 * profile menu when signed in. That is why `copy` is not read here
 * directly: every string this header renders comes from that control
 * or from the logo, exactly as on the homepage. The logo link and
 * its aria-label match SiteFooter's brand row.
 */
export default function SiteHeader({
  locale = "en",
}: {
  copy?: ChromeCopy;
  locale?: LocaleCode;
} = {}) {
  return (
    <header className="relative border-b border-white/10">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <Link
          href={localizedPath("", locale)}
          aria-label="WorldEye — back to the live globe"
          className="shrink-0 inline-flex items-center"
        >
          <img
            src="/worldeye-header-logo.png"
            alt="WorldEye"
            width={1063}
            height={290}
            className="h-8 w-auto"
          />
        </Link>
        <div className="flex items-center gap-3">
          <AccountHudControl />
        </div>
      </div>
    </header>
  );
}
