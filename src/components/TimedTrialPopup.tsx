"use client";

/**
 * F4's timed conversion popup: after a visitor has actually explored
 * (~75 seconds on the surface, or a few camera opens — the rules live
 * in lib/camera-ladder and are unit-tested there), ONE card per session
 * offers the free trial. Dismissing retires it for a multi-day
 * cooldown; it never appears on pricing/checkout/settings (the
 * decision refuses those paths, and those pages never mount this), and
 * the parent suppresses it while any other prompt or the camera
 * viewer is open, so it never stacks.
 *
 * The card is docked, not modal — browsing the globe continues behind
 * it, and the trial itself starts on /pricing, where the plans and
 * the one-click-cancel terms live. It docks bottom-RIGHT: the email
 * capture card owns bottom-left, and the two soft asks must never
 * paint over each other.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X, Sparkles } from "lucide-react";
import { trackAnalyticsEvent } from "./AnalyticsTracker";
import { getCameraClickCount } from "@/lib/cameraGate";
import {
  browserLadderStorage,
  browserSessionStorage,
  markTimedDismissed,
  readLadderRecord,
  readSessionFlag,
  timedPopupShouldShow,
  writeSessionFlag,
  TIMED_POPUP_SESSION_KEY,
} from "@/lib/camera-ladder";
import { readSessionIdentity } from "@/lib/premium-entitlement";

const RECHECK_MS = 5_000;

export default function TimedTrialPopup({
  surface,
  suppressed = false,
  onVisibilityChange,
}: {
  /** Analytics detail token: where the popup lives ("globe" / "directory"). */
  surface: string;
  /** Another prompt or the camera viewer is up — stay hidden, keep waiting. */
  suppressed?: boolean;
  /** Lets the parent keep its own prompts from stacking on this one. */
  onVisibilityChange?: (visible: boolean) => void;
}) {
  const [visible, setVisible] = useState(false);
  const mountedAt = useRef<number>(Date.now());
  const firedRef = useRef(false);

  useEffect(() => {
    onVisibilityChange?.(visible);
  }, [visible, onVisibilityChange]);

  useEffect(() => {
    if (visible) return;
    let cancelled = false;
    let premium = false;
    let identityRead = false;

    const evaluate = () => {
      if (cancelled || firedRef.current) return;
      const session = browserSessionStorage();
      const should = timedPopupShouldShow({
        now: Date.now(),
        mountedAt: mountedAt.current,
        opens: getCameraClickCount(),
        shownThisSession: readSessionFlag(session, TIMED_POPUP_SESSION_KEY),
        otherPromptOpen: suppressed,
        record: readLadderRecord(browserLadderStorage()),
        pathname: window.location.pathname,
        premium,
      });
      if (should) {
        firedRef.current = true;
        writeSessionFlag(session, TIMED_POPUP_SESSION_KEY);
        trackAnalyticsEvent("timed_trial_popup_shown", surface);
        setVisible(true);
      }
    };

    // Premium is the only identity fact the decision needs; read it
    // once, lazily — an "unknown" read counts as not-premium here, and
    // the globe's own entitlement healing owns the stricter question.
    void readSessionIdentity().then((id) => {
      identityRead = true;
      premium = id.state === "premium";
      evaluate();
    });
    const t = setInterval(() => {
      if (identityRead) evaluate();
    }, RECHECK_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [suppressed, surface, visible]);

  if (!visible) return null;

  const dismiss = () => {
    markTimedDismissed(browserLadderStorage());
    trackAnalyticsEvent("timed_trial_popup_dismissed", surface);
    setVisible(false);
  };

  return (
    <section
      aria-label="Try WorldEye Pro free"
      className="fixed bottom-[4.5rem] right-4 z-[350] w-[calc(100%-2rem)] max-w-xs rounded-2xl border border-white/15 bg-[#0a0a12]/95 p-4 shadow-2xl shadow-black/50 backdrop-blur md:bottom-6"
    >
      <div className="relative">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute right-0 top-0 rounded-full p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 pr-8">
          <Sparkles className="h-4 w-4 text-[#D4AF37]" />
          <h3 className="text-sm font-bold tracking-tight text-white">Try Pro — free</h3>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-white/55">
          Unlimited live cameras, the AI analyst, satellite view and live traffic. Start a
          free trial — cancel in one click from Settings, and there&apos;s no charge if you
          cancel before the trial ends.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <Link
            href="/pricing"
            className="rounded-xl bg-[#0096FF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0aa5ff]"
          >
            Start free trial
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="text-xs text-white/35 transition hover:text-white/60"
          >
            Not now
          </button>
        </div>
      </div>
    </section>
  );
}
