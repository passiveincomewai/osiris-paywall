"use client";

/**
 * §4 — Smart conversion moment. Shown tastefully after real exploration
 * (tour completion or ≥3 distinct free features), on the cadence defined
 * in lib/onboarding/storage.ts. Copy names only real Pro capabilities;
 * prices are never hardcoded — the button goes to the live /pricing page.
 */

import { GlassCard, OnbButton } from "./shared";

export default function ConversionCard({
  isMobile,
  onPro,
  onDismiss,
}: {
  isMobile: boolean;
  onPro: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      className="onb-anim-in"
      style={
        isMobile
          ? {
              position: "fixed",
              left: 12,
              right: 12,
              bottom: "calc(64px + env(safe-area-inset-bottom, 0px))",
              zIndex: 965,
            }
          : { position: "fixed", left: 64, bottom: 92, width: 330, zIndex: 965 }
      }
      role="dialog"
      aria-label="WorldEye Pro"
    >
      <GlassCard accent="gold" className="p-5">
        <div className="text-[9px] font-mono tracking-[0.22em] text-[var(--gold-primary)] mb-1.5">
          WORLDEYE PRO
        </div>
        <h2 className="text-[15px] font-semibold text-white leading-snug">
          You&rsquo;ve explored the world. Ready to go deeper?
        </h2>
        <p className="text-[12.5px] leading-relaxed text-white/70 mt-2">
          Unlock additional intelligence tools, advanced search, premium feeds,
          and OI AI analysis with WorldEye Pro.
        </p>
        <div className="flex flex-col gap-2 mt-4">
          <OnbButton variant="gold" onClick={onPro}>
            Explore Pro Features
          </OnbButton>
          <OnbButton variant="ghost" onClick={onDismiss}>
            Keep Exploring Free
          </OnbButton>
        </div>
      </GlassCard>
    </div>
  );
}
