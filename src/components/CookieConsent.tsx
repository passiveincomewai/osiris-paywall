"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CONSENT_CHANGED_EVENT,
  CONSENT_RESET_EVENT,
  clarityConsentV2Args,
  parseConsentCookie,
  serializeConsentCookie,
  type ConsentChoice,
} from "@/lib/cookie-consent";

/** Cookie consent banner, and the wiring that makes the choice real.
 *
 *  Mounted once, site-wide, from RootShell — before MetaPixel and
 *  MicrosoftClarity, so its first effect runs ahead of theirs.
 *
 *  What it does:
 *  - No stored choice: the banner shows, and Clarity is told consent
 *    is DENIED (consentv2, both storages) as early as we can manage,
 *    so its _clck/_clsk cookies stay off until the visitor accepts.
 *    The Meta pixel is gated separately, inside MetaPixel.tsx.
 *  - Stored choice: no banner; the matching signal is re-applied so
 *    Clarity hears it on every page.
 *  - Decline: consentv2 denied, plus clarity('consent', false), which
 *    erases any Clarity cookies already set.
 *  - The footer's "Cookie settings" link clears the cookie and fires
 *    CONSENT_RESET_EVENT; the banner reopens.
 *
 *  The clarity() calls go through the queue stub the Clarity loader
 *  itself installs — calls made before clarity.ms/tag arrives are
 *  queued, not lost. If the stub isn't there yet (this effect can run
 *  first), we install the identical stub so the early calls queue the
 *  same way; the loader keeps an existing stub and drains its queue.
 */

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[] };

function callClarity(...args: unknown[]) {
  const w = window as unknown as { clarity?: ClarityFn };
  if (typeof w.clarity !== "function") {
    const stub = function (this: unknown) {
      // Same queue shape as the official snippet's stub.
      (stub.q = stub.q || []).push(arguments);
    } as unknown as ClarityFn;
    w.clarity = stub;
  }
  w.clarity(...args);
}

/** Tell Clarity where consent stands. `null` (no stored choice, or a
 *  reset) is denied until the visitor says otherwise. */
function applyConsent(choice: ConsentChoice | null) {
  callClarity("consentv2", clarityConsentV2Args(choice));
  if (choice === "declined") {
    // Also erase any Clarity cookies set before the choice existed.
    callClarity("consent", false);
  }
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = parseConsentCookie(document.cookie);
    applyConsent(stored);
    setVisible(stored === null);

    const onReset = () => {
      // The footer link has already cleared the cookie; fall back to
      // the denied default and ask again.
      applyConsent(null);
      setVisible(true);
    };
    window.addEventListener(CONSENT_RESET_EVENT, onReset);
    return () => window.removeEventListener(CONSENT_RESET_EVENT, onReset);
  }, []);

  const choose = (choice: ConsentChoice) => {
    document.cookie = serializeConsentCookie(choice);
    applyConsent(choice);
    window.dispatchEvent(
      new CustomEvent<ConsentChoice>(CONSENT_CHANGED_EVENT, { detail: choice })
    );
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] border-t border-[var(--border-primary)] bg-[var(--bg-primary)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">
          We use cookies to measure our ads (Meta) and to watch how pages get
          used (Microsoft Clarity), so we can fix what&rsquo;s rough. Anything
          you type is masked. Details in our{" "}
          <Link
            href="/privacy"
            className="text-[var(--text-primary)] underline underline-offset-2 hover:text-[var(--cyan-primary)]"
          >
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex flex-shrink-0 gap-2.5">
          <button
            type="button"
            onClick={() => choose("declined")}
            className="rounded-lg border border-[var(--border-primary)] px-4 py-2 text-[13px] text-[var(--text-primary)] transition hover:border-[var(--cyan-primary)]"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="rounded-lg bg-[var(--gold-primary)] px-4 py-2 text-[13px] font-semibold text-black transition hover:bg-[var(--gold-light)]"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
