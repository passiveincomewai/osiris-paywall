"use client";

/**
 * The upgrade popup's host — mounted once in RootShell. It listens for
 * the open event (lib/upgrade-popup's openUpgradePopup, fired by the
 * corner promo and every "Upgrade to PRO" button), owns the popup's
 * state (step, selection, expanded row), and renders the modal:
 * desktop a centered 760px dialog, mobile a bottom sheet with a drag
 * handle and swipe-down-to-close. The app behind is blurred (~9px)
 * and darkened to ~45% brightness. Paid users never see it (identity
 * is checked before opening, like every upgrade surface).
 *
 * Border, glow and the main button follow the SELECTED plan's color
 * (150ms transition). The selection is remembered for the session.
 * Closing fires upgrade_popup_closed {step, method}; a completed
 * checkout closes the popup, shows the welcome toast, and broadcasts
 * worldeye:upgrade-completed (with the pending camera, if any).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { trackAnalyticsEvent } from "../AnalyticsTracker";
import { readSessionIdentity } from "@/lib/premium-entitlement";
import {
  CAMERA_COUNT_LABEL,
  UPGRADE_COMPLETED_EVENT,
  UPGRADE_OPEN_EVENT,
  UPGRADE_PENDING_CAMERA_KEY,
  UPGRADE_PLANS,
  browserLocal,
  browserSession,
  markUpgradeShown,
  readSelection,
  writeSelection,
  type UpgradeInterval,
  type UpgradeOpenRequest,
  type UpgradeStep,
  type UpgradeTier,
} from "@/lib/upgrade-popup";
import { StepChoose, StepCompare, UpgradeMosaic } from "./UpgradeSteps";
import { UpgradeCheckoutStep } from "./UpgradeCheckoutStep";

type CloseMethod = "esc" | "backdrop" | "button" | "swipe" | "complete";

export default function UpgradePopupHost() {
  const [open, setOpen] = useState(false);
  const [entered, setEntered] = useState(false);
  const [step, setStep] = useState<UpgradeStep>(1);
  const [plan, setPlan] = useState<UpgradeTier>("pro");
  const [interval, setIntervalState] = useState<UpgradeInterval>("annual");
  const [expanded, setExpanded] = useState<UpgradeTier | null>(null);
  const [seed, setSeed] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [dragY, setDragY] = useState(0);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);
  const dragStartRef = useRef<number | null>(null);
  const stepRef = useRef<UpgradeStep>(1);
  stepRef.current = step;

  const selection = { plan, interval };

  const close = useCallback((method: CloseMethod) => {
    trackAnalyticsEvent("upgrade_popup_closed", `s${stepRef.current}_${method}`);
    setOpen(false);
    setEntered(false);
    setDragY(0);
  }, []);

  // ── Opening ──────────────────────────────────────────────────────
  useEffect(() => {
    const onOpen = (e: Event) => {
      const req = (e as CustomEvent<UpgradeOpenRequest>).detail;
      if (!req) return;
      void (async () => {
        // Never show to paid users (an "unknown" read follows the
        // app's pattern: not premium until proven).
        const identity = await readSessionIdentity().catch(() => null);
        if (identity?.state === "premium") return;
        const stored = readSelection(browserSession());
        const nextPlan = req.plan ?? stored.plan;
        const nextInterval = req.interval ?? stored.interval;
        setPlan(nextPlan);
        setIntervalState(nextInterval);
        setStep(req.step);
        setExpanded(null);
        setSeed((s) => s + 1);
        writeSelection(browserSession(), { plan: nextPlan, interval: nextInterval });
        if (req.cameraId) {
          try {
            window.sessionStorage.setItem(UPGRADE_PENDING_CAMERA_KEY, req.cameraId);
          } catch {
            // Non-fatal.
          }
        }
        markUpgradeShown(Date.now(), browserLocal(), browserSession());
        trackAnalyticsEvent("upgrade_popup_shown", req.trigger);
        lastFocusRef.current = document.activeElement as HTMLElement | null;
        setOpen(true);
      })();
    };
    window.addEventListener(UPGRADE_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(UPGRADE_OPEN_EVENT, onOpen);
  }, []);

  // Entrance + initial focus (the selected plan row).
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => {
      setEntered(true);
      const row = dialogRef.current?.querySelector<HTMLElement>(`[data-plan-row="${plan}"]`);
      (row ?? dialogRef.current)?.focus();
    });
    return () => cancelAnimationFrame(raf);
    // Only on the open transition, not on later selection changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open ]);

  // Scroll lock while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open ]);

  // Esc + focus trap.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close("esc");
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex="0"], input, select, textarea, iframe',
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
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  // Restore focus on close.
  useEffect(() => {
    if (!open && lastFocusRef.current) {
      lastFocusRef.current.focus?.();
      lastFocusRef.current = null;
    }
  }, [open ]);

  // Toast auto-dismiss.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6500);
    return () => clearTimeout(t);
  }, [toast]);

  // Step changes start at the top of the sheet.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [step]);

  const applySelection = (next: { plan: UpgradeTier; interval: UpgradeInterval }, fire: boolean) => {
    setPlan(next.plan);
    setIntervalState(next.interval);
    writeSelection(browserSession(), next);
    if (fire) {
      trackAnalyticsEvent("upgrade_plan_selected", `${next.plan}_${next.interval}`);
    }
  };

  const handleSelect = (p: UpgradeTier) => applySelection({ plan: p, interval }, true);
  const handleInterval = (iv: UpgradeInterval) => applySelection({ plan, interval: iv }, true);
  const handleToggleFeatures = (p: UpgradeTier) => {
    applySelection({ plan: p, interval }, true);
    setExpanded((cur) => {
      const next = cur === p ? null : p;
      if (next) trackAnalyticsEvent("upgrade_features_expanded", p);
      return next;
    });
  };

  const handleComplete = () => {
    trackAnalyticsEvent("upgrade_checkout_completed", `${plan}_${interval}`);
    let cameraId: string | null = null;
    try {
      cameraId = window.sessionStorage.getItem(UPGRADE_PENDING_CAMERA_KEY);
      window.sessionStorage.removeItem(UPGRADE_PENDING_CAMERA_KEY);
    } catch {
      // Non-fatal.
    }
    close("complete");
    setToast(`Welcome to ${UPGRADE_PLANS[plan].name}. All ${CAMERA_COUNT_LABEL} cameras are unlocked.`);
    try {
      window.dispatchEvent(
        new CustomEvent(UPGRADE_COMPLETED_EVENT, { detail: { plan, interval, cameraId } }),
      );
    } catch {
      // Non-fatal.
    }
  };

  const facts = UPGRADE_PLANS[plan];
  const reducedMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[400] flex items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Upgrade to WorldEye Pro"
        >
          <div
            className={`absolute inset-0 transition-opacity duration-200 ${
              entered ? "opacity-100" : "opacity-0"
            }`}
            style={{ backdropFilter: "blur(9px) brightness(0.45)", background: "rgba(0,0,0,0.35)" }}
            onClick={() => close("backdrop")}
          />
          <div
            ref={dialogRef}
            tabIndex={-1}
            className={`relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-[26px] outline-none transition-all sm:rounded-[26px] ${
              reducedMotion ? "" : "duration-200"
            } ${
              entered
                ? "translate-y-0 opacity-100 sm:scale-100"
                : "translate-y-8 opacity-0 sm:translate-y-3 sm:scale-[0.98]"
            }`}
            style={{
              maxWidth: 760,
              background: "linear-gradient(180deg, #15171C 0%, #0B0C10 100%)",
              border: `1px solid ${facts.color}`,
              boxShadow: `0 0 0 1px ${facts.color}55, 0 24px 80px rgba(0,0,0,0.7), 0 0 64px ${facts.color}30`,
              transitionProperty: "transform, opacity, border-color, box-shadow",
              transitionDuration: "200ms, 200ms, 150ms, 150ms",
              transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
            }}
          >
            {/* Mobile drag handle / swipe-down zone. */}
            <div
              className="flex shrink-0 touch-none justify-center pb-1 pt-2.5 sm:hidden"
              onPointerDown={(e) => {
                dragStartRef.current = e.clientY;
              }}
              onPointerMove={(e) => {
                if (dragStartRef.current === null) return;
                setDragY(Math.max(0, e.clientY - dragStartRef.current));
              }}
              onPointerUp={() => {
                if (dragY > 110) close("swipe");
                setDragY(0);
                dragStartRef.current = null;
              }}
              onPointerCancel={() => {
                setDragY(0);
                dragStartRef.current = null;
              }}
            >
              <span className="h-1.5 w-10 rounded-full bg-white/25" />
            </div>
            <button
              type="button"
              onClick={() => close("button")}
              aria-label="Close"
              className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white/85 backdrop-blur-sm transition hover:bg-black/75 hover:text-white"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {step === 1 && (
                <>
                  <UpgradeMosaic seed={seed} />
                  <StepChoose
                    selection={selection}
                    expanded={expanded}
                    onSelect={handleSelect}
                    onInterval={handleInterval}
                    onToggleFeatures={handleToggleFeatures}
                    onStart={() => setStep(4)}
                    onCompare={() => {
                      trackAnalyticsEvent("upgrade_compare_opened");
                      setStep(3);
                    }}
                  />
                </>
              )}
              {step === 3 && (
                <StepCompare
                  selection={selection}
                  onBack={() => setStep(1)}
                  onChoose={(p) => {
                    applySelection({ plan: p, interval }, true);
                    setStep(4);
                  }}
                />
              )}
              {step === 4 && (
                <UpgradeCheckoutStep
                  selection={selection}
                  onBack={() => setStep(1)}
                  onComplete={handleComplete}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[450] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl border border-[#34D399]/40 bg-[#0B0C10]/95 px-4 py-3.5 shadow-2xl shadow-black/60 backdrop-blur"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#34D399]/15 text-[#34D399]">
            <Check className="h-4.5 w-4.5" />
          </span>
          <p className="text-sm font-medium leading-snug text-white">{toast}</p>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss"
            className="ml-auto shrink-0 text-white/40 transition hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}
