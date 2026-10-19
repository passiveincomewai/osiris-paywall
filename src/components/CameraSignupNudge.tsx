"use client";

import Link from "next/link";
import { X, Crown } from "lucide-react";

/**
 * Pro upsell shown once a visitor without an active subscription has opened
 * their free cameras. Deliberately says nothing about a limit or a paywall —
 * it reads as a natural upgrade moment.
 */
export default function CameraSignupNudge({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Upgrade to Pro"
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0a0e17] p-7 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="float-right -mt-2 -mr-2 p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="mx-auto w-12 h-12 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 flex items-center justify-center mb-4">
          <Crown className="w-6 h-6 text-[#D4AF37]" />
        </div>
        <h2 className="text-lg font-bold tracking-tight">Unlock unlimited cameras</h2>
        <p className="text-sm text-white/55 mt-2 mb-6">
          Upgrade to Pro for unlimited live camera access — plus the AI analyst, satellite view, live traffic, advanced search filters and premium intel feeds.
        </p>
        <Link
          href="/pricing"
          className="block w-full py-3.5 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold tracking-wide hover:brightness-110 transition"
        >
          Upgrade to PRO
        </Link>
        <button
          onClick={onClose}
          className="mt-4 text-xs text-white/35 hover:text-white/60 transition"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
