"use client";

/**
 * Shared visual shell for all onboarding surfaces: dark glassmorphism with
 * a cyan/blue glow, matching the app's HUD language (glass-panel, CSS vars).
 * Animations are pure CSS keyframes, disabled under prefers-reduced-motion.
 * Spotlight overlays are pointer-events-none by design — only the cards
 * themselves take clicks, so the globe underneath never stops working.
 */

import type { ReactNode } from "react";

export const ONB_STYLE = `
@keyframes onb-in { from { opacity: 0; transform: translateY(14px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes onb-in-top { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes onb-pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(0,229,255,0.45), 0 0 18px rgba(0,229,255,0.35); } 70% { box-shadow: 0 0 0 10px rgba(0,229,255,0), 0 0 18px rgba(0,229,255,0.35); } 100% { box-shadow: 0 0 0 0 rgba(0,229,255,0), 0 0 18px rgba(0,229,255,0.35); } }
@keyframes onb-pop { 0% { transform: scale(0.4); opacity: 0; } 60% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
@keyframes onb-fade { from { opacity: 0; } to { opacity: 1; } }
.onb-anim-in { animation: onb-in 0.38s cubic-bezier(0.22, 1, 0.36, 1) both; }
.onb-anim-in-top { animation: onb-in-top 0.32s cubic-bezier(0.22, 1, 0.36, 1) both; }
.onb-anim-fade { animation: onb-fade 0.3s ease both; }
.onb-pulse { animation: onb-pulse-ring 1.8s ease-out infinite; }
.onb-pop { animation: onb-pop 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
@media (prefers-reduced-motion: reduce) {
  .onb-anim-in, .onb-anim-in-top, .onb-anim-fade, .onb-pop { animation: none; }
  .onb-pulse { animation: none; }
}
`;

export function OnbStyles() {
  return <style>{ONB_STYLE}</style>;
}

export function GlassCard({
  children,
  accent = "cyan",
  className = "",
  style,
}: {
  children: ReactNode;
  accent?: "cyan" | "gold";
  className?: string;
  style?: React.CSSProperties;
}) {
  const glow =
    accent === "cyan"
      ? "0 12px 44px rgba(0,0,0,0.65), 0 0 24px rgba(0,150,255,0.16), inset 0 0 24px rgba(0,150,255,0.05)"
      : "0 12px 44px rgba(0,0,0,0.65), 0 0 24px rgba(212,175,55,0.18), inset 0 0 24px rgba(212,175,55,0.05)";
  return (
    <div
      className={`glass-panel rounded-2xl ${className}`}
      style={{ boxShadow: glow, ...style }}
    >
      {children}
    </div>
  );
}

export function OnbButton({
  children,
  onClick,
  variant = "primary",
  href,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "gold";
  href?: string;
}) {
  const base =
    "px-4 py-2 rounded-full text-[11px] font-mono font-semibold tracking-[0.08em] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 text-center";
  const styles =
    variant === "primary"
      ? "bg-[var(--cyan-primary)] text-black hover:brightness-110"
      : variant === "gold"
        ? "bg-[var(--gold-primary)] text-black hover:brightness-110"
        : "bg-white/[0.06] text-white/80 border border-white/15 hover:bg-white/[0.12]";
  if (href) {
    return (
      <a href={href} className={`${base} ${styles} inline-block`} onClick={onClick}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={`${base} ${styles}`}>
      {children}
    </button>
  );
}

export function StepDots({ total, index }: { total: number; index: number }) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className="h-1 rounded-full transition-all"
          style={{
            width: i === index ? 16 : 6,
            background: i === index ? "var(--cyan-primary)" : "rgba(255,255,255,0.22)",
          }}
        />
      ))}
    </div>
  );
}
