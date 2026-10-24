"use client";

/**
 * F11's share-link loop-in card. Purely presentational — page.tsx owns
 * the trigger (lib/camera-ladder's shareAwayShouldShow: a shared-link
 * visitor who opened the shared camera and then navigated away to
 * explore, once per session, never stacked). Docked, dismissible, and
 * never in the way of the shared view itself, which has already been
 * watched by the time this can appear.
 */

import Link from "next/link";
import { X, Bookmark } from "lucide-react";
import { ACCOUNT_UNLOCK_OPENS, EMAIL_UNLOCK_OPENS } from "@/lib/camera-ladder";

export default function ShareAwayPrompt({ onClose }: { onClose: () => void }) {
  return (
    <section
      aria-label="Create a free account"
      className="fixed bottom-[4.5rem] left-4 z-[350] w-[calc(100%-2rem)] max-w-xs rounded-2xl border border-white/15 bg-[#0a0a12]/95 p-4 shadow-2xl shadow-black/50 backdrop-blur md:bottom-6"
    >
      <div className="relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className="absolute right-0 top-0 rounded-full p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 pr-8">
          <Bookmark className="h-4 w-4 text-[#D4AF37]" />
          <h3 className="text-sm font-bold tracking-tight text-white">Keep exploring — it&apos;s free</h3>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-white/55">
          Create a free account to get {EMAIL_UNLOCK_OPENS + ACCOUNT_UNLOCK_OPENS} more free
          camera opens, save the cameras you find, and pick up right where you left off on
          any device.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <Link
            href="/signup"
            className="rounded-xl bg-[#0096FF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0aa5ff]"
          >
            Create free account
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-white/35 transition hover:text-white/60"
          >
            Not now
          </button>
        </div>
      </div>
    </section>
  );
}
