"use client";

/**
 * The Powder Pass popup's page-side trigger (#6). Page-scoped by
 * design — it stands OUTSIDE the global manager's priority race
 * (mounted only on the ski hub + resort pages by PowderPassGate,
 * which renders nothing while the powderPassEnabled flag is off) —
 * but it honours every shared rule: the session claim, the 7-day
 * frequency cap, the dialog check, and the popup_* events. Trial-
 * Prompt's welcome modal or the ladder prompt open on a ski page
 * suppresses it like any other surface.
 */

import { useEffect, useRef, useState } from "react";
import { trackAnalyticsEvent } from "../AnalyticsTracker";
import { readSessionIdentity } from "@/lib/premium-entitlement";
import {
  POPUP_EVENT_DETAIL,
  arbitrate,
  browserLocalStorage,
  browserSessionStorage,
  claimSession,
  markShown,
  readFreqRecord,
  readSessionClaim,
} from "@/lib/popups/manager";
import { signalPopupClaimed } from "@/lib/popups/signals";
import { PowderPassPopup } from "./popups";

export default function PowderPassTrigger({
  option,
}: {
  option: { price: string; per: string; trialLabel: string; cta: string };
}) {
  const [show, setShow] = useState(false);
  const firedRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (firedRef.current) return;
      firedRef.current = true;
      const session = browserSessionStorage();
      const local = browserLocalStorage();
      // Subscribers don't need a second membership pitch; VIP includes
      // Powder Pass outright. Unknown identity → stay silent (the
      // offer can't be verified for this visitor).
      const identity = await readSessionIdentity().catch(() => null);
      if (!identity || identity.state === "premium" || identity.state === "unknown") return;
      const modalOpen =
        document.querySelector('[role="dialog"], [aria-modal="true"]') !== null;
      const decision = arbitrate({
        candidates: ["powder_pass"],
        sessionClaim: readSessionClaim(session),
        freq: readFreqRecord(local),
        now: Date.now(),
        modalOpen,
        pathname: window.location.pathname,
      });
      if (!decision.show) return;
      claimSession(session, "powder_pass", (pid) => signalPopupClaimed(pid));
      markShown(local, "powder_pass", Date.now());
      trackAnalyticsEvent("popup_shown", POPUP_EVENT_DETAIL.powder_pass);
      setShow(true);
    }, 20_000);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;
  return (
    <PowderPassPopup
      option={option}
      onAction={() => trackAnalyticsEvent("popup_clicked", POPUP_EVENT_DETAIL.powder_pass)}
      onClose={() => {
        trackAnalyticsEvent("popup_dismissed", POPUP_EVENT_DETAIL.powder_pass);
        setShow(false);
      }}
    />
  );
}
