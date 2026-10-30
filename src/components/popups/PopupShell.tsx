"use client";

/**
 * Shared shells for the conversion popup system (lib/popups/manager
 * owns the rules; PopupManager owns the timing). Two shapes:
 *  - PopupModal: a centered card over a dimmed backdrop — the same
 *    shell language as the camera ladder's CameraSignupNudge.
 *  - PopupToast: a slim docked bar (bottom-center, clear of the
 *    bottom-left email capture card and the bottom-right timed trial
 *    card) for the lightest asks.
 * Both are role="dialog" so the manager's own modal check — and every
 * other prompt surface that respects one-dialog-at-a-time — can see
 * them. Escape and backdrop clicks dismiss.
 */

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

function useEscape(onClose: () => void) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      aria-label="Close"
      className="float-right -mt-2 -mr-2 p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition"
    >
      <X className="w-4 h-4" />
    </button>
  );
}

export function PopupModal({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEscape(onClose);
  return (
    <div
      className="fixed inset-0 z-[800] flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0a0e17] p-7 text-center shadow-2xl max-h-[92dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <CloseButton onClose={onClose} />
        {children}
      </div>
    </div>
  );
}

export function PopupToast({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEscape(onClose);
  return (
    <div className="fixed inset-x-0 bottom-20 md:bottom-6 z-[800] flex justify-center px-4 pointer-events-none">
      <div
        className="pointer-events-auto w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0e17]/95 p-4 shadow-2xl shadow-black/50 backdrop-blur"
        role="dialog"
        aria-label={label}
      >
        <CloseButton onClose={onClose} />
        {children}
      </div>
    </div>
  );
}

/** The gold icon medallion every modal leads with (ladder language). */
export function PopupMedallion({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-12 h-12 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 flex items-center justify-center mb-4">
      {children}
    </div>
  );
}

export const POPUP_CTA_CLASS =
  "block w-full rounded-xl bg-[#0096FF] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0aa5ff]";
export const POPUP_GOLD_CTA_CLASS =
  "block w-full rounded-xl bg-[#D4AF37] px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[#e5c158]";
