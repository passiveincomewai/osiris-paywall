"use client";

/**
 * §3 — Generic contextual micro-tutorial card (≤3 short steps, instantly
 * dismissible). Desktop: bottom-left card. Mobile: top sheet, so it never
 * fights the bottom nav, the mobile drawer, or the camera viewer.
 */

import { useState } from "react";
import type { MicroDef } from "@/lib/onboarding/steps";
import { GlassCard, OnbButton, StepDots } from "./shared";

export default function MicroCard({
  micro,
  isMobile,
  onDone,
}: {
  micro: MicroDef;
  isMobile: boolean;
  /** Fired on finish AND on dismiss — the micro is marked seen either way. */
  onDone: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const step = micro.steps[idx];
  const last = idx >= micro.steps.length - 1;
  return (
    <div
      className={isMobile ? "onb-anim-in-top" : "onb-anim-in"}
      style={
        isMobile
          ? {
              position: "fixed",
              left: 12,
              right: 12,
              top: "calc(10px + env(safe-area-inset-top, 0px))",
              zIndex: 960,
            }
          : { position: "fixed", left: 64, bottom: 92, width: 320, zIndex: 960 }
      }
      role="dialog"
      aria-label={step.title}
    >
      <GlassCard className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[13px] font-semibold text-white leading-snug">{step.title}</h3>
          <button
            type="button"
            onClick={onDone}
            aria-label="Dismiss guide"
            className="text-white/45 hover:text-white text-sm leading-none p-1 -m-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50 rounded"
          >
            ✕
          </button>
        </div>
        <p className="text-[12px] leading-relaxed text-white/70 mt-1.5">{step.body}</p>
        <div className="flex items-center justify-between mt-3.5">
          <StepDots total={micro.steps.length} index={idx} />
          {last ? (
            <OnbButton onClick={onDone}>Got it</OnbButton>
          ) : (
            <OnbButton onClick={() => setIdx(idx + 1)}>Next</OnbButton>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
