"use client";

import { useState } from "react";
import Link from "next/link";
import { X, Crown } from "lucide-react";
import TrialPicker from "./TrialPicker";
import { FREE_CAMERA_CLICKS } from "@/lib/cameraGate";

/**
 * Pro upsell shown once a visitor without an active subscription has opened
 * all of their free cameras. It says exactly that, plainly, then puts the
 * trial picker in front of them as the primary action.
 *
 * The picker runs in embedded mode here: picking a plan swaps this
 * popup in place to the embedded Stripe checkout (the popup widens,
 * the pitch steps aside so the form leads) instead of navigating away
 * mid-intent. Closing from either view unmounts the picker, which
 * destroys any mounted checkout session with it.
 */
export default function CameraSignupNudge({ onClose }: { onClose: () => void }) {
  const [inCheckout, setInCheckout] = useState(false);
  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Upgrade to Pro"
    >
      <div
        className={`w-full rounded-3xl border border-white/10 bg-[#0a0e17] p-7 text-center shadow-2xl max-h-[92dvh] overflow-y-auto transition-[max-width] duration-200 ${inCheckout ? "max-w-lg" : "max-w-sm"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="float-right -mt-2 -mr-2 p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition"
        >
          <X className="w-4 h-4" />
        </button>
        {!inCheckout && (
          <>
            <div className="mx-auto w-12 h-12 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 flex items-center justify-center mb-4">
              <Crown className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <h2 className="text-lg font-bold tracking-tight">Unlock unlimited cameras</h2>
            <p className="text-sm text-white/55 mt-2 mb-6">
              You&apos;ve opened your {FREE_CAMERA_CLICKS} free cameras on this device. Upgrade to Pro for unlimited live camera access — plus the AI analyst, satellite view, live traffic, advanced search filters and premium intel feeds.
            </p>
          </>
        )}
        {inCheckout && (
          <h2 className="text-lg font-bold tracking-tight mb-4">Unlock unlimited cameras</h2>
        )}
        <div className="text-left">
          <TrialPicker mode="embedded" onCheckoutViewChange={setInCheckout} />
        </div>
        <p className="mt-3 text-xs text-white/35">
          <Link href="/pricing" className="underline hover:text-white/60 transition">Compare Free vs Pro first</Link>
        </p>
        <button
          onClick={onClose}
          className="mt-3 text-xs text-white/35 hover:text-white/60 transition"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
