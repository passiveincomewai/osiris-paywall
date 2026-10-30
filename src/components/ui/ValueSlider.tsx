"use client";

/**
 * ValueSlider — the shared, unmistakably-a-slider range control.
 *
 * Replaces bare `accent-*` range inputs, whose only visible affordance
 * was the global stylesheet's 14px gold dot on an invisible track —
 * users (Jameson, 2026-10-29) could not tell it was a slider at all.
 *
 * What makes it read as a slider:
 *  - a visible 8px track with the travelled portion filled in the
 *    accent colour up to the thumb;
 *  - a 30px thumb with a thick accent ring, centre dot and glow —
 *    clearly grabbable, grows on hover/drag, visible focus ring;
 *  - a value bubble riding directly above the thumb, updating live;
 *  - min/max end labels plus a ‹ slide › hint under the track;
 *  - a 44px-tall hit area so it is easy to grab on a phone.
 *
 * Behaviour is exactly the wrapped <input type="range">: same
 * min/max/step/value/onChange semantics, keyboard support included.
 * Styling lives in globals.css under `.we-slider` (gold + cyan themes).
 */
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CSSProperties } from "react";

export interface ValueSliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  ariaLabel: string;
  /** Formats the value shown in the bubble above the thumb. */
  formatValue?: (value: number) => string;
  /** End labels under the track; default to the raw min/max numbers. */
  minLabel?: string;
  maxLabel?: string;
  accent?: "gold" | "cyan";
  className?: string;
}

export default function ValueSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  ariaLabel,
  formatValue = (v) => String(v),
  minLabel,
  maxLabel,
  accent = "gold",
  className = "",
}: ValueSliderProps) {
  const span = max - min;
  const pct = span > 0 ? Math.min(100, Math.max(0, ((value - min) / span) * 100)) : 0;
  // Thumb is 30px wide: its centre sits 15px in from the track end at
  // 0%/100%, so the bubble shifts by (50 - pct) * 0.3px to stay centred.
  const bubbleLeft = `calc(${pct}% + ${(50 - pct) * 0.3}px)`;

  return (
    <div className={className}>
      {/* Value bubble riding above the thumb */}
      <div className="relative h-6" aria-hidden="true">
        <span
          className={`absolute bottom-0 -translate-x-1/2 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold shadow-lg ${
            accent === "cyan"
              ? "bg-cyan-400 text-black shadow-cyan-400/25"
              : "bg-[#D4AF37] text-black shadow-[#D4AF37]/25"
          }`}
          style={{ left: bubbleLeft }}
        >
          {formatValue(value)}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={ariaLabel}
        className={`we-slider we-slider--${accent}`}
        style={{ "--we-fill": `${pct}%` } as CSSProperties}
      />

      {/* End labels + drag hint */}
      <div className="mt-0.5 flex items-center justify-between text-[11px] font-medium tabular-nums text-white/40">
        <span>{minLabel ?? min}</span>
        <span className="flex items-center gap-0.5 tracking-wide text-white/30" aria-hidden="true">
          <ChevronLeft className="h-3 w-3" />
          slide
          <ChevronRight className="h-3 w-3" />
        </span>
        <span>{maxLabel ?? max}</span>
      </div>
    </div>
  );
}
