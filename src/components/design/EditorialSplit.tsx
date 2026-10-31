/**
 * EditorialSplit — asymmetric text/media split (Phase 2, STAGED).
 * The default replacement for icon+heading+paragraph card grids:
 * one idea, one real visual, copy kept to a headline + short body + link.
 * Media should be a MediaFrame (it carries the honesty caption).
 */
import type { ReactNode } from "react";
export default function EditorialSplit({
  media,
  children,
  flip = false,
  ratio = "7-5",
}: {
  media: ReactNode;
  children: ReactNode;
  flip?: boolean;
  /** grid split: "7-5" media-led, "5-7" copy-led, "6-6" even */
  ratio?: "7-5" | "5-7" | "6-6";
}) {
  const cols =
    ratio === "7-5"
      ? "minmax(0,7fr) minmax(0,5fr)"
      : ratio === "5-7"
        ? "minmax(0,5fr) minmax(0,7fr)"
        : "minmax(0,1fr) minmax(0,1fr)";
  return (
    <div
      className="grid items-center"
      style={{
        gridTemplateColumns: cols,
        gap: "clamp(1.5rem, 4vw, 3.5rem)",
      }}
      data-we-split
    >
      {/* DOM order is always copy-then-media for reading order/SEO;
          `flip` is visual only, applied via order at ≥lg in page CSS. */}
      <div style={{ order: flip ? 2 : 1 }}>{children}</div>
      <div style={{ order: flip ? 1 : 2 }}>{media}</div>
      <style>{`
        @media (max-width: 1023px) {
          [data-we-split] { grid-template-columns: minmax(0,1fr) !important; }
          [data-we-split] > div { order: initial !important; }
        }
      `}</style>
    </div>
  );
}
