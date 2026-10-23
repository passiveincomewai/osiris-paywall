"use client";

/**
 * Teaser A/B test (Conversion Wave 2, F9) — treatment-arm signup card.
 *
 * Mounted by src/app/page.tsx next to OnboardingRoot. Renders NOTHING
 * unless every gate below passes, so control visitors, signed-in
 * visitors, crawlers and the flag-off homepage are byte-for-byte
 * today's experience, and first paint is never shifted (the card can
 * only appear from an effect, after hydration):
 *
 *   1. Config flag on (lib/teaser/config — NEXT_PUBLIC_TEASER_TEST).
 *   2. Visitor is anonymous (probes /api/auth/session, the endpoint
 *      lib/premium-entitlement already uses; failure = not anonymous).
 *   3. Sticky arm resolves to "treatment" (lib/teaser/assignment).
 *   4. Card not previously dismissed (dismissal is permanent).
 *   5. Globe is ready AND the onboarding welcome has resolved
 *      (dismissed/done) — the welcome owns first-visit attention and
 *      the two prompts never stack. Desktop-only exception: after 90s
 *      with the globe ready it may show anyway (opposite corner from
 *      the welcome). Mobile waits indefinitely: both are bottom
 *      sheets there and WOULD stack.
 *
 * Instrumentation (existing plumbing only — trackAnalyticsEvent ->
 * PageView rows): the session is arm-tagged once per session for BOTH
 * arms (teaser_arm:<arm>); the card fires teaser_shown /
 * teaser_dismissed / teaser_signup_click with the arm as detail.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { getTeaserConfig, TEASER_EVENTS } from "@/lib/teaser/config";
import {
  resolveTeaserArm,
  isTeaserDismissed,
  recordTeaserDismissal,
  maybeResetTeaser,
  isAnonymousSession,
  type TeaserArm,
} from "@/lib/teaser/assignment";
import { loadState } from "@/lib/onboarding/storage";
import { trackAnalyticsEvent } from "@/components/AnalyticsTracker";

const TEASER_STYLE = `
@keyframes teaser-in { from { opacity: 0; transform: translateY(14px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
.teaser-anim-in { animation: teaser-in 0.38s cubic-bezier(0.22, 1, 0.36, 1) both; }
@media (prefers-reduced-motion: reduce) { .teaser-anim-in { animation: none; } }
`;

const GOLD_GLOW =
  "0 12px 44px rgba(0,0,0,0.65), 0 0 24px rgba(212,175,55,0.18), inset 0 0 24px rgba(212,175,55,0.05)";

const SESSION_TAG_KEY = "we_teaser_tagged";
const WELCOME_POLL_MS = 1500;
const DESKTOP_YIELD_DEADLINE_MS = 90_000;

/** Fire the session's arm tag once per session (both arms, identical). */
function tagArmOncePerSession(arm: TeaserArm): void {
  let already = false;
  try {
    already = sessionStorage.getItem(SESSION_TAG_KEY) === arm;
    if (!already) sessionStorage.setItem(SESSION_TAG_KEY, arm);
  } catch {
    /* sessionStorage unavailable — still tag; duplicates are harmless
       (reports count DISTINCT sessionIds). */
  }
  if (!already) trackAnalyticsEvent(TEASER_EVENTS.arm, arm);
}

function welcomeResolved(): boolean {
  try {
    const w = loadState().welcome;
    return w === "dismissed" || w === "done";
  } catch {
    return true; // onboarding state unreadable — don't block on it
  }
}

export default function TeaserSignupCard({
  globeReady,
  isMobile = false,
}: {
  globeReady: boolean;
  isMobile?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const globeReadyRef = useRef(globeReady);
  globeReadyRef.current = globeReady;
  const isMobileRef = useRef(isMobile);
  isMobileRef.current = isMobile;
  const shownRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    (async () => {
      maybeResetTeaser();
      const config = getTeaserConfig();
      if (!config.enabled) return;

      // Anonymous only: one fresh session read, same endpoint the
      // entitlement checks use. Any failure fails closed (no card).
      let anonymous = false;
      try {
        const r = await fetch("/api/auth/session", { cache: "no-store" });
        if (r.ok) anonymous = isAnonymousSession(await r.json().catch(() => null));
      } catch {
        /* anonymous stays false */
      }
      if (cancelled || !anonymous) return;

      const resolution = resolveTeaserArm(config);
      if (!resolution) return;
      tagArmOncePerSession(resolution.arm);
      if (resolution.arm !== "treatment") return;
      if (isTeaserDismissed()) return;

      // Wait for the live globe + the onboarding welcome to resolve.
      const startedAt = Date.now();
      const tick = () => {
        if (cancelled) return;
        if (globeReadyRef.current) {
          if (welcomeResolved()) {
            setVisible(true);
            return;
          }
          if (!isMobileRef.current && Date.now() - startedAt > DESKTOP_YIELD_DEADLINE_MS) {
            setVisible(true);
            return;
          }
        }
        timer = window.setTimeout(tick, WELCOME_POLL_MS);
      };
      tick();
    })();

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (visible && !shownRef.current) {
      shownRef.current = true;
      trackAnalyticsEvent(TEASER_EVENTS.shown, "treatment");
    }
  }, [visible]);

  if (!visible) return null;

  const dismiss = () => {
    recordTeaserDismissal();
    trackAnalyticsEvent(TEASER_EVENTS.dismissed, "treatment");
    setVisible(false);
  };

  return (
    <div
      className="teaser-anim-in"
      style={
        isMobile
          ? {
              position: "fixed",
              left: 12,
              right: 12,
              bottom: "calc(64px + env(safe-area-inset-bottom, 0px))",
              zIndex: 940,
            }
          : { position: "fixed", right: 24, bottom: 92, width: 330, zIndex: 940 }
      }
      role="dialog"
      aria-label="Create a free WorldEye account"
    >
      <style>{TEASER_STYLE}</style>
      <div className="glass-panel rounded-2xl p-5 relative" style={{ boxShadow: GOLD_GLOW }}>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
        >
          <X size={14} />
        </button>
        <div className="flex items-center gap-3 mb-2.5 pr-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/worldeye-eye.png" alt="" aria-hidden="true" width={600} height={432} className="h-9 w-auto" />
          <h2 className="text-[15px] font-semibold text-white leading-tight">
            Save the cameras you find
          </h2>
        </div>
        <p className="text-[12.5px] leading-relaxed text-white/70">
          You&apos;re watching the live globe — 74,229 cameras, flights, satellites
          and weather, all free to explore. Create a free account to save your
          favorite cameras and pick up right where you left off.
        </p>
        <div className="flex flex-col gap-2 mt-4">
          <Link
            href="/signup"
            onClick={() => trackAnalyticsEvent(TEASER_EVENTS.signupClick, "treatment")}
            className="block rounded-full bg-[#D4AF37] px-4 py-2 text-center text-[12px] font-bold tracking-[0.08em] text-black transition hover:brightness-110"
          >
            Create free account
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="block rounded-full px-4 py-2 text-center text-[12px] font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Explore first
          </button>
        </div>
        <p className="text-[10px] text-white/40 mt-3 text-center">No card required.</p>
      </div>
    </div>
  );
}
