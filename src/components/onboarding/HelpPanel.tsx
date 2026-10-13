"use client";

/**
 * §5 — Persistent help: an unobtrusive "?" button in the globe interface
 * and the panel it opens. Available to ALL A/B groups and returning
 * visitors; any guide or the full tour can be (re)started from here
 * without a refresh. "WorldEye Documentation" from the original spec is
 * the "Help & FAQ" link — /docs was removed on the owner's order.
 */

import { HELP_ENTRIES } from "@/lib/onboarding/steps";
import { GlassCard } from "./shared";

export function HelpButton({ isMobile, onClick }: { isMobile: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Help and tutorials"
      title="Help & tutorials"
      className="flex items-center justify-center rounded-full border border-white/20 bg-black/45 backdrop-blur-md text-white/75 hover:text-white hover:border-[var(--cyan-primary)]/60 hover:shadow-[0_0_14px_rgba(0,229,255,0.3)] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      style={
        isMobile
          ? {
              position: "fixed",
              right: 12,
              bottom: "calc(64px + env(safe-area-inset-bottom, 0px))",
              width: 38,
              height: 38,
              zIndex: 940,
              fontSize: 15,
              fontFamily: "var(--font-mono, monospace)",
            }
          : {
              position: "fixed",
              right: 16,
              bottom: 52,
              width: 38,
              height: 38,
              zIndex: 940,
              fontSize: 15,
              fontFamily: "var(--font-mono, monospace)",
            }
      }
    >
      ?
    </button>
  );
}

export default function HelpPanel({
  isMobile,
  onClose,
  onStartTour,
  onMicro,
}: {
  isMobile: boolean;
  onClose: () => void;
  onStartTour: () => void;
  onMicro: (microId: string) => void;
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
              maxHeight: "62vh",
              overflowY: "auto",
            }
          : { position: "fixed", right: 16, bottom: 100, width: 300, zIndex: 965, maxHeight: "70vh", overflowY: "auto" }
      }
      role="dialog"
      aria-label="Help and tutorials"
    >
      <GlassCard className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono tracking-[0.22em] text-[var(--cyan-primary)]">
            HELP &amp; TUTORIALS
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help"
            className="text-white/45 hover:text-white text-sm leading-none p-1 -m-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50 rounded"
          >
            ✕
          </button>
        </div>
        <div className="flex flex-col mt-2">
          {HELP_ENTRIES.map((e) => {
            const cls =
              "flex items-center justify-between gap-2 w-full text-left px-2 py-2.5 rounded-lg text-[12.5px] text-white/80 hover:bg-white/[0.06] hover:text-white transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50";
            if (e.kind === "tour") {
              return (
                <button key={e.label} type="button" className={cls} onClick={onStartTour}>
                  <span>{e.label}</span>
                  <span className="text-[var(--cyan-primary)] text-[10px] font-mono">45 SEC</span>
                </button>
              );
            }
            if (e.kind === "micro") {
              return (
                <button key={e.label} type="button" className={cls} onClick={() => onMicro(e.microId)}>
                  <span>{e.label}</span>
                  <span className="text-white/30">→</span>
                </button>
              );
            }
            return (
              <a key={e.label} className={cls} href={e.href}>
                <span>{e.label}</span>
                <span className="text-white/30">↗</span>
              </a>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}
