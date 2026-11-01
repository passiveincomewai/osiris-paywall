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
import { X, Sparkles, Video, Bot, Satellite, Car, ShieldCheck } from "lucide-react";
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
      style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
      className="fixed bottom-[4.5rem] right-4 z-[350] w-[calc(100%-2rem)] max-w-xs overflow-hidden rounded-2xl border border-[#D4AF37]/30 bg-[#0a0a12]/95 shadow-2xl shadow-black/60 backdrop-blur md:bottom-6"
    >
      {/* Graphic header — a real capture of the live globe (banner crop
          of features-globe.jpg, the /features hero capture), fading
          into the card so the offer reads as part of the product. */}
      <div className="relative h-20">
        <img
          src="/landing/timed-trial-globe.jpg"
          alt=""
          width={832}
          height={270}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-[#0a0a12]" />
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-white/10"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white/80 backdrop-blur-sm">
            <X className="h-4 w-4" />
          </span>
        </button>
      </div>

      <div className="px-4 pb-4 pt-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-[#D4AF37]" />
          <h3 className="text-base font-bold tracking-tight text-white">
            Try <span className="text-[#D4AF37]">Pro</span> — free
          </h3>
        </div>

        <ul className="mt-2.5 space-y-1.5">
          <li className="flex items-center gap-2.5 text-xs text-white/75">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#D4AF37]/30 bg-[#D4AF37]/15">
              <Video className="h-3.5 w-3.5 text-[#D4AF37]" />
            </span>
            Unlimited live cameras
          </li>
          <li className="flex items-center gap-2.5 text-xs text-white/75">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#D4AF37]/30 bg-[#D4AF37]/15">
              <Bot className="h-3.5 w-3.5 text-[#D4AF37]" />
            </span>
            AI analyst
          </li>
          <li className="flex items-center gap-2.5 text-xs text-white/75">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#D4AF37]/30 bg-[#D4AF37]/15">
              <Satellite className="h-3.5 w-3.5 text-[#D4AF37]" />
            </span>
            Satellite view
          </li>
          <li className="flex items-center gap-2.5 text-xs text-white/75">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#D4AF37]/30 bg-[#D4AF37]/15">
              <Car className="h-3.5 w-3.5 text-[#D4AF37]" />
            </span>
            Live traffic
          </li>
        </ul>

        <p className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-white/50">
          <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-[#D4AF37]/80" />
          <span>
            Start a free trial — cancel in one click from Settings, and there&apos;s no
            charge if you cancel before the trial ends.
          </span>
        </p>

        <div className="mt-3 flex items-center gap-2">
          <Link
            href="/pricing"
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] px-4 text-sm font-bold text-black shadow-[0_8px_32px_rgba(212,175,55,0.35)] transition hover:brightness-110 active:scale-[0.99]"
          >
            Start free trial
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="flex min-h-[44px] items-center justify-center rounded-xl px-3 text-sm text-white/50 transition hover:bg-white/5 hover:text-white"
          >
            Not now
          </button>
        </div>
      </div>
    </section>
  );
}
