"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

/**
 * Sticky mobile call-to-action for /gods-eye-view.
 *
 * Most of this page's search traffic is on phones, and the visitor's
 * intent is to use a live globe — so on small screens the way in stays
 * one tap away at the bottom of the viewport. Dismissal follows the
 * CheckoutReturnStrip pattern: sessionStorage, remembered for the
 * session, and nothing renders until the stored state is known (no
 * flash of a bar that then vanishes). An in-flow spacer of the bar's
 * height keeps it from ever covering page content. Desktop keeps the
 * in-flow CTAs and never sees this.
 */

const DISMISSED_KEY = "we-gev-cta-dismissed";

export default function GodsEyeStickyCta() {
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISSED_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed === null || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      /* private mode — dismissal just won't persist */
    }
  };

  return (
    <>
      <div className="h-16 md:hidden" aria-hidden />
      <div className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-white/10 bg-[#0a0a12]/95 backdrop-blur px-4 py-3 flex items-center gap-3">
        <Link
          href="/?utm_source=gods-eye-view&utm_medium=sticky-bar"
          className="flex-1 text-center px-5 py-3 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-sm tracking-wide active:brightness-110 transition"
        >
          Open WorldEye — free
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 p-2 text-white/50 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </>
  );
}
