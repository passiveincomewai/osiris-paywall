/**
 * SectionShell — the standard marketing section frame (Phase 2, STAGED).
 * One shell, varied content: kills the stacked identical label+H2 strips by
 * forcing each section to declare a layout intent (head alignment, width)
 * and by keeping the eyebrow optional — most sections should pass none.
 */
import type { ReactNode } from "react";
import MicroLabel from "./MicroLabel";

export default function SectionShell({
  eyebrow,
  title,
  lede,
  children,
  width = "wide",
  align = "left",
  id,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  children: ReactNode;
  width?: "wide" | "narrow";
  align?: "left" | "center";
  id?: string;
}) {
  return (
    <section
      id={id}
      className="mx-auto w-full"
      style={{
        maxWidth: width === "wide" ? "var(--we-wide)" : "var(--we-narrow)",
        paddingLeft: "var(--we-gutter)",
        paddingRight: "var(--we-gutter)",
        paddingTop: "var(--we-section-y)",
        paddingBottom: "var(--we-section-y)",
      }}
    >
      <header
        style={{
          maxWidth: "var(--we-measure)",
          marginLeft: align === "center" ? "auto" : undefined,
          marginRight: align === "center" ? "auto" : undefined,
          textAlign: align,
          marginBottom: "var(--we-space-7)",
        }}
      >
        {eyebrow ? (
          <div style={{ marginBottom: "var(--we-space-3)" }}>
            <MicroLabel>{eyebrow}</MicroLabel>
          </div>
        ) : null}
        <h2
          className="font-[family-name:var(--we-font-display)]"
          style={{
            color: "var(--we-text-1)",
            fontSize: "var(--we-size-display-2)",
            lineHeight: "var(--we-leading-display)",
            fontWeight: 560,
            margin: 0,
          }}
        >
          {title}
        </h2>
        {lede ? (
          <p
            style={{
              color: "var(--we-text-2)",
              fontSize: "var(--we-size-lede)",
              lineHeight: "var(--we-leading-body)",
              marginTop: "var(--we-space-4)",
            }}
          >
            {lede}
          </p>
        ) : null}
      </header>
      {children}
    </section>
  );
}
