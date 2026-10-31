/**
 * MediaFrame — framed media with a mandatory honesty caption (Phase 2, STAGED).
 *
 * The audit's core fix: product visuals must state what they are.
 * `state` is required, not decorative:
 *   live      → "LIVE VIDEO" chip (cyan) — only for feeds playing video now
 *   snapshot  → "SNAPSHOT" chip — still-image feeds on a refresh schedule
 *   dated     → "DATED IMAGERY · <date>" — satellite/basemap stills, never "live"
 *   computed  → "COMPUTED" — e.g. satellite positions computed from TLE data
 *   mock      → "ILLUSTRATIVE MOCK" — labelled concepts (white-label pilots)
 *   none      → no chip (photography that needs no feed claim)
 * `source` renders the attribution line (camera operator, agency, Esri, …).
 */
import type { ReactNode } from "react";
export type MediaState =
  | "live"
  | "snapshot"
  | "dated"
  | "computed"
  | "mock"
  | "none";

const CHIP: Record<Exclude<MediaState, "none">, { label: string; color: string }> = {
  live: { label: "LIVE VIDEO", color: "var(--we-state-live)" },
  snapshot: { label: "SNAPSHOT", color: "var(--we-state-snapshot)" },
  dated: { label: "DATED IMAGERY", color: "var(--we-state-dated)" },
  computed: { label: "COMPUTED", color: "var(--we-state-snapshot)" },
  mock: { label: "ILLUSTRATIVE MOCK", color: "var(--we-state-snapshot)" },
};

export default function MediaFrame({
  children,
  state = "none",
  stateNote,
  caption,
  source,
}: {
  children: ReactNode;
  state?: MediaState;
  /** e.g. the capture date for state="dated": "Imagery captured 2026-10-30" */
  stateNote?: string;
  caption?: string;
  source?: string;
}) {
  const chip = state !== "none" ? CHIP[state] : null;
  return (
    <figure
      className="overflow-hidden"
      style={{
        background: "var(--we-ink-2)",
        border: "1px solid var(--we-line-2)",
        borderRadius: "var(--we-radius-3)",
        boxShadow: "var(--we-shadow-media)",
      }}
    >
      <div className="relative">
        {children}
        {chip ? (
          <span
            className="absolute left-3 top-3 inline-flex items-center gap-2 px-2 py-1 font-[family-name:var(--we-font-mono)] uppercase"
            style={{
              background: "rgba(5, 7, 11, 0.82)",
              border: "1px solid var(--we-line-2)",
              borderRadius: "var(--we-radius-1)",
              color: chip.color,
              fontSize: "var(--we-size-micro)",
              letterSpacing: "var(--we-tracking-micro)",
            }}
          >
            {state === "live" ? (
              <span
                aria-hidden
                className="inline-block rounded-full"
                style={{ width: 6, height: 6, background: chip.color }}
              />
            ) : null}
            {chip.label}
            {stateNote ? <span style={{ color: "var(--we-text-1)" }}>· {stateNote}</span> : null}
          </span>
        ) : null}
      </div>
      {caption || source ? (
        <figcaption
          className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3"
          style={{ borderTop: "1px solid var(--we-line-1)" }}
        >
          {caption ? (
            <span style={{ color: "var(--we-text-1)", fontSize: "var(--we-size-small)" }}>
              {caption}
            </span>
          ) : (
            <span />
          )}
          {source ? (
            <span
              className="font-[family-name:var(--we-font-mono)] uppercase"
              style={{
                color: "var(--we-text-1)",
                fontSize: "var(--we-size-micro)",
                letterSpacing: "var(--we-tracking-micro)",
                opacity: 0.75,
              }}
            >
              {source}
            </span>
          ) : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
