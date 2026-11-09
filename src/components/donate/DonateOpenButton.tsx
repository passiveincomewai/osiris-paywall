"use client";

/**
 * Support WorldEye — a button that opens the donation popup via the
 * global open event. Explicit user intent: opens immediately, with no
 * suppression checks (paid users and supporters may still donate when
 * they choose to click).
 */
import type { ReactNode } from "react";
import type { DonateFrequency } from "@/lib/donate/config";
import { openDonate } from "./donate-client";

export default function DonateOpenButton({
  source,
  amount,
  frequency,
  checkout,
  className,
  children,
  ariaLabel,
}: {
  source: string;
  amount?: number;
  frequency?: DonateFrequency;
  checkout?: boolean;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={className}
      onClick={() => openDonate({ source, amount, frequency, checkout })}
    >
      {children}
    </button>
  );
}
