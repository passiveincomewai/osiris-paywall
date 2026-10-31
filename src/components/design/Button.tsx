/**
 * Button — the three sanctioned actions (Phase 2, STAGED).
 * primary = electric blue fill (one per view, the page's next action)
 * ghost   = hairline outline (secondary actions)
 * quiet   = text-only with arrow affordance (tertiary / inline links)
 * Renders <a> when href is set, <button> otherwise. No glow, no gradient.
 */
import type { CSSProperties, ReactNode } from "react";
const BASE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.5rem",
  fontFamily: "var(--we-font-sans)",
  fontSize: "var(--we-size-small)",
  fontWeight: 600,
  lineHeight: 1,
  textDecoration: "none",
  cursor: "pointer",
  transition:
    "background-color var(--we-dur-1) var(--we-ease), border-color var(--we-dur-1) var(--we-ease), color var(--we-dur-1) var(--we-ease)",
};

const VARIANTS: Record<string, CSSProperties> = {
  primary: {
    background: "var(--we-blue)",
    color: "var(--we-text-on-accent)",
    border: "1px solid transparent",
    borderRadius: "var(--we-radius-2)",
    padding: "0.8rem 1.35rem",
  },
  ghost: {
    background: "transparent",
    color: "var(--we-text-1)",
    border: "1px solid var(--we-line-3)",
    borderRadius: "var(--we-radius-2)",
    padding: "0.8rem 1.35rem",
  },
  quiet: {
    background: "transparent",
    color: "var(--we-blue-strong)",
    border: "1px solid transparent",
    padding: "0.4rem 0.1rem",
  },
};

export default function Button({
  variant = "primary",
  href,
  children,
  onClick,
  ariaLabel,
}: {
  variant?: "primary" | "ghost" | "quiet";
  href?: string;
  children: ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const style = { ...BASE, ...VARIANTS[variant] };
  const content = (
    <>
      {children}
      {variant === "quiet" ? <span aria-hidden>→</span> : null}
    </>
  );
  if (href) {
    return (
      <a href={href} className="we-focusable" style={style} aria-label={ariaLabel}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" className="we-focusable" style={style} onClick={onClick} aria-label={ariaLabel}>
      {content}
    </button>
  );
}
