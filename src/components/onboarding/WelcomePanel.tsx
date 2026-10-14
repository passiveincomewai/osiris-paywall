"use client";

/** §1 — First-visit welcome panel. Small, floating, never a takeover. */

import { GlassCard, OnbButton } from "./shared";

export default function WelcomePanel({
  isMobile,
  onTour,
  onDismiss,
}: {
  isMobile: boolean;
  onTour: () => void;
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
      aria-label="Welcome to WorldEye"
    >
      <GlassCard className="p-5">
        <div className="flex items-center gap-3 mb-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/worldeye-eye.png" alt="" aria-hidden="true" width={600} height={432} className="h-9 w-auto" />
          <h2 className="text-[15px] font-semibold text-white leading-tight">
            Welcome to WorldEye 🌎
          </h2>
        </div>
        <p className="text-[12.5px] leading-relaxed text-white/70">
          Explore the world in real time. Track aircraft, discover live cameras,
          monitor global events, and uncover intelligence—all on one interactive
          globe.
        </p>
        <div className="flex flex-col gap-2 mt-4">
          <OnbButton onClick={onTour}>Take a 45-Second Tour</OnbButton>
          <OnbButton variant="ghost" onClick={onDismiss}>
            Explore On My Own
          </OnbButton>
        </div>
        <p className="text-[10px] text-white/40 mt-3 text-center">
          You can replay this tutorial anytime.
        </p>
      </GlassCard>
    </div>
  );
}
