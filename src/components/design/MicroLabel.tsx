/**
 * MicroLabel — uppercase technical micro-label (Phase 2 primitive, STAGED).
 * The system's replacement for eyebrow/badge noise: a label earns its place
 * only when it carries information (section id, feed state, timestamp).
 * Styles consume design-tokens.css (--we-*), imported via RootShell.
 */
import type { ReactNode } from "react";
export default function MicroLabel({
  children,
  tone = "default",
  live = false,
}: {
  children: ReactNode;
  /** default = off-white; data tones are reserved for real data states. */
  tone?: "default" | "live" | "alert";
  live?: boolean;
}) {
  const color =
    tone === "live"
      ? "var(--we-cyan)"
      : tone === "alert"
        ? "var(--we-data-alert)"
        : "var(--we-text-1)";
  return (
    <span
      className="inline-flex items-center gap-2 font-[family-name:var(--we-font-mono)] uppercase"
      style={{
        color,
        fontSize: "var(--we-size-micro)",
        letterSpacing: "var(--we-tracking-micro)",
        lineHeight: 1.4,
      }}
    >
      {live ? (
        <span
          aria-hidden
          className="inline-block rounded-full"
          style={{
            width: 6,
            height: 6,
            background: "var(--we-cyan)",
            boxShadow: "0 0 0 3px var(--we-cyan-dim)",
          }}
        />
      ) : null}
      {children}
    </span>
  );
}
