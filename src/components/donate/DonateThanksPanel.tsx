"use client";

/**
 * Support WorldEye — /support/thanks client panel. The server page
 * verifies the Stripe session before rendering this; on mount the
 * panel stamps the 12-month supporter flag and fires
 * donate_completed exactly once per session id (redirect-based
 * payment methods land here without the popup's onComplete).
 */
import { useEffect, useRef } from "react";
import { getDonateCopy } from "@/i18n/dictionaries";
import { useLocale } from "@/i18n/LocaleProvider";
import { donateAmountDetail, type DonateFrequency } from "@/lib/donate/config";
import DonateThanks from "./DonateThanks";
import { markDonateSupporter, trackDonate } from "./donate-client";

export default function DonateThanksPanel({
  sessionId,
  amount,
  frequency,
}: {
  sessionId: string;
  amount: number;
  frequency: DonateFrequency;
}) {
  const copy = getDonateCopy(useLocale());
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    markDonateSupporter();
    try {
      const key = `we_donate_thanks_fired:${sessionId}`;
      if (!window.sessionStorage.getItem(key)) {
        window.sessionStorage.setItem(key, "1");
        trackDonate("donate_completed", donateAmountDetail(amount, frequency));
      }
    } catch {
      trackDonate("donate_completed", donateAmountDetail(amount, frequency));
    }
  }, [sessionId, amount, frequency]);

  return (
    <div className="rounded-[26px] border border-cyan-300/[0.38] bg-[linear-gradient(180deg,#14171C,#0B0C10)] px-6 py-8 shadow-[0_0_60px_rgba(34,211,238,0.15)]">
      <DonateThanks copy={copy} amount={amount} frequency={frequency} />
    </div>
  );
}
