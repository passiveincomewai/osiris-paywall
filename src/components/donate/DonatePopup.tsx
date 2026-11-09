"use client";

/**
 * Support WorldEye — the donation popup (spec 2026-11-09).
 *
 * Desktop: a 600px centered modal over a blurred, darkened page.
 * Mobile (<640px): a bottom sheet with a drag handle and swipe-down
 * dismissal. Three steps: 1) choose amount (DonateForm), 2) Stripe
 * Embedded Checkout, 3) thank-you. role="dialog" + aria-modal, focus
 * trap, Esc/backdrop/✕ close; every pre-completion close counts as a
 * dismissal (14-day re-prompt window + donate_dismissed event).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Lock, X } from "lucide-react";
import type { DonateCopy } from "@/i18n/dictionaries";
import {
  donateAmountDetail,
  type DonateFrequency,
  type DonateOpenDetail,
} from "@/lib/donate/config";
import DonateForm, { type DonateSelection } from "./DonateForm";
import DonateCheckoutMount from "./DonateCheckoutMount";
import DonateThanks from "./DonateThanks";
import {
  markDonateDismissed,
  markDonateSupporter,
  trackDonate,
  type DonateDismissMethod,
} from "./donate-client";

export interface DonateRequest extends DonateOpenDetail {
  amount: number;
  frequency: DonateFrequency;
}

export default function DonatePopup({
  copy,
  request,
  onClose,
  onCompleted,
}: {
  copy: DonateCopy;
  request: DonateRequest;
  onClose: () => void;
  onCompleted: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(request.checkout ? 2 : 1);
  const [selection, setSelection] = useState<DonateSelection>({
    amount: request.amount,
    frequency: request.frequency,
  });
  const completedRef = useRef(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ startY: number; dy: number } | null>(null);

  const close = useCallback(
    (method: DonateDismissMethod | "completed") => {
      if (method !== "completed" && !completedRef.current) {
        markDonateDismissed();
        trackDonate("donate_dismissed", method);
      }
      onClose();
    },
    [onClose],
  );

  // Focus trap + Esc, scoped to the popup's lifetime.
  useEffect(() => {
    const prevActive = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close("esc");
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex="0"]',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prevOverflow;
      prevActive?.focus?.({ preventScroll: true });
    };
  }, [close]);

  // Step 2 entered → donate_checkout_started (once per entry).
  useEffect(() => {
    if (step === 2) {
      trackDonate(
        "donate_checkout_started",
        donateAmountDetail(selection.amount, selection.frequency),
      );
    }
  }, [step, selection]);

  const handleComplete = useCallback(() => {
    completedRef.current = true;
    markDonateSupporter();
    trackDonate(
      "donate_completed",
      donateAmountDetail(selection.amount, selection.frequency),
    );
    onCompleted();
    setStep(3);
  }, [onCompleted, selection]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (window.innerWidth >= 640) return;
    dragRef.current = { startY: e.touches[0].clientY, dy: 0 };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragRef.current || !panelRef.current) return;
    const dy = Math.max(0, e.touches[0].clientY - dragRef.current.startY);
    dragRef.current.dy = dy;
    panelRef.current.style.transform = `translateY(${dy}px)`;
  };
  const onTouchEnd = () => {
    if (!dragRef.current || !panelRef.current) return;
    const dy = dragRef.current.dy;
    dragRef.current = null;
    panelRef.current.style.transform = "";
    if (dy > 90) close("swipe");
  };

  const amountLabel =
    selection.frequency === "monthly"
      ? `$${selection.amount}${copy.perMonthSuffix}`
      : `$${selection.amount}`;

  return (
    <div className="fixed inset-0 z-[210] flex items-end justify-center sm:items-center sm:p-4">
      <div
        aria-hidden
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => close("backdrop")}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={copy.supportPageTitle}
        className="relative max-h-[94dvh] w-full max-w-[600px] overflow-y-auto rounded-t-[26px] border border-cyan-300/[0.38] bg-[linear-gradient(180deg,#14171C,#0B0C10)] shadow-[0_0_60px_rgba(34,211,238,0.22)] motion-safe:animate-[donate-pop_180ms_ease-out] sm:rounded-[26px]"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Mobile drag handle */}
        <div aria-hidden className="absolute left-1/2 top-2 z-10 h-1 w-10 -translate-x-1/2 rounded-full bg-white/25 sm:hidden" />

        {step === 1 && (
          <DonateForm
            copy={copy}
            initialAmount={selection.amount}
            initialFrequency={selection.frequency}
            onDonate={(sel) => {
              setSelection(sel);
              setStep(2);
            }}
            onMaybeLater={() => close("maybe_later")}
            onClose={() => close("x")}
            autoFocusTiles
          />
        )}

        {step === 2 && (
          <div className="px-6 pb-6 pt-5 max-sm:px-5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 text-sm text-zinc-300 transition hover:text-white"
              >
                <ArrowLeft size={15} />
                {copy.changeAmount}
              </button>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-400">
                  <Lock size={12} />
                  {copy.secureCheckout}
                </span>
                <button
                  type="button"
                  onClick={() => close("x")}
                  aria-label={copy.close}
                  className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.06] text-zinc-200 transition hover:bg-white/[0.12]"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <h2 className="mt-4 text-[22px] font-bold text-white">
              {copy.checkoutTitle}
            </h2>

            <div className="mt-3 flex items-center justify-between rounded-xl border border-cyan-300/25 bg-cyan-300/[0.06] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-white">
                  {selection.frequency === "monthly"
                    ? copy.summaryMonthlyTitle
                    : copy.summaryOnceTitle}
                </p>
                <p className="text-xs text-zinc-400">
                  {selection.frequency === "monthly"
                    ? copy.summaryMonthlySub
                    : copy.summaryOnceSub}
                </p>
              </div>
              <p className="text-lg font-bold text-cyan-300">{amountLabel}</p>
            </div>

            <div className="mt-4">
              <DonateCheckoutMount
                key={`${selection.amount}-${selection.frequency}`}
                amount={selection.amount}
                frequency={selection.frequency}
                source={request.source}
                copy={copy}
                onComplete={handleComplete}
              />
            </div>

            <p className="mt-3.5 flex items-center justify-center gap-1.5 text-center text-xs text-zinc-500">
              <Lock size={12} />
              {copy.paymentsNote}
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="relative px-6 pb-7 pt-8 max-sm:px-5">
            <button
              type="button"
              onClick={() => close("completed")}
              aria-label={copy.close}
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/[0.06] text-zinc-200 transition hover:bg-white/[0.12]"
            >
              <X size={16} />
            </button>
            <DonateThanks
              copy={copy}
              amount={selection.amount}
              frequency={selection.frequency}
              onClose={() => close("completed")}
            />
          </div>
        )}
      </div>
      <style>{`@keyframes donate-pop{from{opacity:0;transform:translateY(10px) scale(.99)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
