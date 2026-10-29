"use client";

/**
 * §2 — The guided tour overlay: spotlight + glowing highlight rings on
 * REAL app elements, and the tooltip card that walks the visitor through.
 *
 * Globe protection rules baked in here:
 *  - the overlay root never intercepts the globe: dim panes and rings are
 *    pointer-events-none; only the tooltip card takes clicks;
 *  - the globe step gets a glow frame, not a dim cutout, so the planet
 *    stays fully visible and draggable;
 *  - rect tracking (resize/scroll listeners + a light interval) exists
 *    ONLY while the tour is mounted and is fully cleaned up on exit.
 */

import { useEffect, useRef, useState } from "react";
import { TOUR_STEPS, type TourStep } from "@/lib/onboarding/steps";
import { GlassCard, OnbButton } from "./shared";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const rectOf = (el: Element | null): Rect | null => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { x: r.x, y: r.y, w: r.width, h: r.height };
};

function navButtonByLabel(label: string): Element | null {
  const btns = document.querySelectorAll(".mobile-nav-btn");
  for (const b of btns) {
    if ((b.textContent || "").trim().toUpperCase().includes(label)) return b;
  }
  return null;
}

/** Resolve the primary highlight + any secondary glow targets for a step. */
function resolveAnchors(step: TourStep): { primary: Rect | null; extras: Rect[] } {
  try {
    switch (step.anchor) {
      case "globe":
        return { primary: rectOf(document.querySelector("[data-globe-section]")), extras: [] };
      case "layers": {
        // Step 3 (the event-layer step): spotlight the real Weather
        // toggle inside the open Layers panel once it exists; before
        // the panel opens, fall back to the panel root as before.
        if (step.action === "event-layer") {
          const toggle = document.querySelector('[data-tour-layer="weather"]');
          if (toggle) return { primary: rectOf(toggle), extras: [] };
        }
        const el =
          document.querySelector('[data-tour="layers"]') ?? navButtonByLabel("LAYERS");
        return { primary: rectOf(el), extras: [] };
      }
      case "tools": {
        const oi = document.querySelector('button[aria-label="OI"]') ?? navButtonByLabel("OI");
        const extras = [
          'button[aria-label="OSINT Recon"]',
          'button[aria-label="Live Alerts"]',
          "[data-search-toggle]",
        ]
          .map((s) => rectOf(document.querySelector(s)))
          .filter((r): r is Rect => !!r);
        return { primary: rectOf(oi), extras };
      }
      case "camera-viewer":
        return { primary: rectOf(document.querySelector('[data-tour="camera-viewer"]')), extras: [] };
      default:
        return { primary: null, extras: [] };
    }
  } catch {
    return { primary: null, extras: [] };
  }
}

function DimPane({ style }: { style: React.CSSProperties }) {
  return (
    <div
      aria-hidden="true"
      className="onb-anim-fade"
      style={{ position: "fixed", background: "rgba(2,4,10,0.55)", pointerEvents: "none", ...style }}
    />
  );
}

export default function TourOverlay({
  step,
  phase,
  isMobile,
  isTouch,
  drawerOpen,
  onBack,
  onNext,
  onSkip,
  onExit,
  onFinish,
  onWatchCamera,
}: {
  step: TourStep;
  /** waiting = visitor must act (or read, for info steps); success = brief celebration before auto-advance. */
  phase: "waiting" | "success";
  isMobile: boolean;
  isTouch: boolean;
  drawerOpen: boolean;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  onExit: () => void;
  /** Final step only: true = start exploring, false = discover Pro. */
  onFinish: (explore: boolean) => void;
  /** Camera step only: open a featured camera for the visitor
   *  (lib/onboarding/first-camera). The step still completes through the
   *  real camera-opened signal — this just removes the "find a dot
   *  yourself" hunting that most visitors never finish. */
  onWatchCamera?: () => void;
}) {
  const [anchors, setAnchors] = useState<{ primary: Rect | null; extras: Rect[] }>({
    primary: null,
    extras: [],
  });
  const stepRef = useRef(step);
  stepRef.current = step;

  useEffect(() => {
    let live = true;
    const update = () => {
      if (live) setAnchors(resolveAnchors(stepRef.current));
    };
    update();
    const t = window.setInterval(update, 500);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { capture: true, passive: true });
    return () => {
      live = false;
      window.clearInterval(t);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, { capture: true });
    };
  }, [step.n]);

  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const pad = 6;
  const r = anchors.primary;
  const isGlobeStep = step.anchor === "globe";

  // Tooltip placement.
  let cardStyle: React.CSSProperties;
  if (isMobile) {
    cardStyle = drawerOpen
      ? {
          position: "fixed",
          left: 12,
          right: 12,
          top: "calc(10px + env(safe-area-inset-top, 0px))",
          zIndex: 970,
          maxHeight: "44vh",
          overflowY: "auto",
        }
      : {
          position: "fixed",
          left: 12,
          right: 12,
          bottom: "calc(64px + env(safe-area-inset-bottom, 0px))",
          zIndex: 970,
          maxHeight: "46vh",
          overflowY: "auto",
        };
  } else if (!isMobile && step.action === "event-layer") {
    // Step 3: the Layers sheet opens on the LEFT at this step, so the
    // card moves to the opposite side of the screen (clear of the right
    // tool strip too) — it must never render over the panel it teaches.
    cardStyle = {
      position: "fixed",
      right: 84,
      top: Math.max(76, vh / 2 - 140),
      width: 340,
      zIndex: 970,
    };
  } else if (r && step.anchor === "layers") {
    cardStyle = {
      position: "fixed",
      left: Math.min(r.x + r.w + 16, vw - 356),
      top: Math.max(76, Math.min(r.y + r.h / 2 - 110, vh - 300)),
      width: 340,
      zIndex: 970,
    };
  } else if (r && step.anchor === "tools") {
    cardStyle = {
      position: "fixed",
      right: Math.min(vw - r.x + 16, vw - 356),
      top: Math.max(76, Math.min(r.y + r.h / 2 - 110, vh - 300)),
      width: 340,
      zIndex: 970,
    };
  } else {
    cardStyle = { position: "fixed", left: 64, bottom: 92, width: 340, zIndex: 970 };
  }

  return (
    <div aria-live="polite">
      {/* Spotlight dim panes (skipped for the globe step — the planet stays bright). */}
      {r && !isGlobeStep && (
        <>
          <DimPane style={{ left: 0, top: 0, width: "100%", height: Math.max(0, r.y - pad) }} />
          <DimPane style={{ left: 0, top: r.y + r.h + pad, width: "100%", bottom: 0 }} />
          <DimPane style={{ left: 0, top: Math.max(0, r.y - pad), width: Math.max(0, r.x - pad), height: r.h + pad * 2 }} />
          <DimPane style={{ left: r.x + r.w + pad, top: Math.max(0, r.y - pad), right: 0, height: r.h + pad * 2 }} />
        </>
      )}
      {/* Glow ring on the primary target. */}
      {r && (
        <div
          aria-hidden="true"
          className={phase === "waiting" && step.action !== "info" ? "onb-pulse" : undefined}
          style={{
            position: "fixed",
            left: r.x - pad,
            top: r.y - pad,
            width: r.w + pad * 2,
            height: r.h + pad * 2,
            border: "1.5px solid rgba(0,229,255,0.85)",
            borderRadius: isGlobeStep ? 0 : 14,
            pointerEvents: "none",
            zIndex: 966,
            boxShadow: "0 0 18px rgba(0,229,255,0.35), inset 0 0 18px rgba(0,229,255,0.12)",
          }}
        />
      )}
      {/* Secondary glow rings (the tools step's other targets). */}
      {anchors.extras.map((er, i) => (
        <div
          key={i}
          aria-hidden="true"
          style={{
            position: "fixed",
            left: er.x - 4,
            top: er.y - 4,
            width: er.w + 8,
            height: er.h + 8,
            border: "1px solid rgba(0,229,255,0.5)",
            borderRadius: 999,
            pointerEvents: "none",
            zIndex: 966,
          }}
        />
      ))}

      {/* Tooltip card. */}
      <div className={isMobile && drawerOpen ? "onb-anim-in-top" : "onb-anim-in"} style={cardStyle} role="dialog" aria-label={`Tour step ${step.n}: ${step.title}`}>
        <GlassCard className="p-4">
          {phase === "success" ? (
            <div className="flex items-center gap-3 py-1">
              <span
                className="onb-pop flex items-center justify-center rounded-full shrink-0"
                style={{ width: 34, height: 34, background: "rgba(0,229,255,0.15)", border: "1.5px solid rgba(0,229,255,0.7)" }}
                aria-hidden="true"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2.5 8.5L6 12L13.5 4" stroke="#00E5FF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div>
                <div className="text-[13px] font-semibold text-white">That&rsquo;s it — nicely done.</div>
                <div className="text-[11px] text-white/55">Moving on…</div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[9px] font-mono tracking-[0.22em] text-[var(--cyan-primary)]">
                  STEP {step.n} OF {TOUR_STEPS.length}
                </span>
                <button
                  type="button"
                  onClick={onExit}
                  aria-label="Exit tour"
                  className="text-white/45 hover:text-white text-sm leading-none p-1 -m-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50 rounded"
                >
                  ✕
                </button>
              </div>
              <div className="flex gap-1 mt-2" aria-hidden="true">
                {TOUR_STEPS_DOTS.map((n) => (
                  <span
                    key={n}
                    className="h-[3px] rounded-full flex-1"
                    style={{ background: n <= step.n ? "var(--cyan-primary)" : "rgba(255,255,255,0.15)" }}
                  />
                ))}
              </div>
              <h3 className="text-[14px] font-semibold text-white mt-3">{step.title}</h3>
              <p className="text-[12.5px] leading-relaxed text-white/70 mt-1">
                {isTouch ? step.bodyTouch : step.body}
              </p>

              {step.n === TOUR_STEPS.length ? (
                <div className="flex flex-col gap-2 mt-4">
                  <OnbButton onClick={() => onFinish(true)}>Start Exploring WorldEye</OnbButton>
                  <OnbButton variant="gold" onClick={() => onFinish(false)}>
                    Discover WorldEye Pro
                  </OnbButton>
                </div>
              ) : (
                <>
                {phase === "waiting" && step.action === "camera-open" && onWatchCamera && (
                  <div className="mt-4">
                    <OnbButton onClick={onWatchCamera}>
                      ▶ Open a Featured Camera For Me
                    </OnbButton>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 mt-4">
                  <div className="flex items-center gap-2">
                    {step.n > 1 && (
                      <button
                        type="button"
                        onClick={onBack}
                        className="text-[11px] font-mono text-white/55 hover:text-white px-2 py-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50 rounded"
                      >
                        ← Back
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onSkip}
                      className="text-[11px] font-mono text-white/55 hover:text-white px-2 py-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50 rounded"
                    >
                      Skip
                    </button>
                  </div>
                  {step.action === "info" ? (
                    <OnbButton onClick={onNext}>Next</OnbButton>
                  ) : (
                    <span className="text-[10px] font-mono text-[var(--cyan-primary)]/80 text-right leading-tight">
                      {step.hint}
                    </span>
                  )}
                </div>
                </>
              )}
            </>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

const TOUR_STEPS_DOTS = TOUR_STEPS.map((s) => s.n);
