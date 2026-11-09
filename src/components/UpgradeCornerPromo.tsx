"use client";

/**
 * The upgrade corner promo — replaces TimedTrialPopup (removed in the
 * same ship) at its exact mounts (Dashboard "globe", CountryCamera-
 * Explorer "directory") with the same props and the SAME timing /
 * frequency discipline: the decision still comes from lib/camera-
 * ladder's timedPopupShouldShow (~75s explored or a few camera opens,
 * one per session, 3-day dismissal cooldown, never for premium, parent
 * suppresses it while other prompts or the camera viewer are up).
 * Jameson's spec (2026-11-09) supplies the new face and actions:
 *
 *  - desktop: a 400px card docked bottom-right (the old card's dock),
 *    sliding up with a fade; a strip of real camera captures with the
 *    "10 DAYS FREE" pill, headline, three selectable plan tiles, the
 *    gold start button, "Compare all plans" / "Not now";
 *  - mobile: a compact bottom banner (thumbnail, headline, two
 *    buttons), offset above the mobile bottom nav like the old card;
 *  - "Start {Plan} free" opens the upgrade popup on step 4 (checkout)
 *    for that plan, yearly; "Compare all plans" / "See plans" opens
 *    step 3; clicking anywhere else opens step 1 with that plan
 *    selected; ✕ / "Not now" dismisses (the ladder's 3-day stamp).
 *
 * Donation coordination (lib/upgrade-popup): showing stamps
 * we_promo_upgrade_shown_at; a timed show defers while a donation
 * prompt was shown <5 minutes ago, and while any dialog is open.
 * The snapshots strip uses the repo's real captures (/landing/*.jpg —
 * the old banner's own source family); no camera is ever named.
 */

import { useEffect, useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";
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
import {
  UPGRADE_PLANS,
  UPGRADE_TIERS,
  browserLocal,
  browserSession,
  donateDeferActive,
  markUpgradeShown,
  openUpgradePopup,
  readSelection,
  writeSelection,
  type UpgradeSelection,
  type UpgradeTier,
} from "@/lib/upgrade-popup";
import { rotatedCaptures } from "./upgrade/UpgradeSteps";

const RECHECK_MS = 5_000;

export default function UpgradeCornerPromo({
  surface,
  suppressed = false,
  onVisibilityChange,
}: {
  /** Analytics detail token: where the promo lives ("globe" / "directory"). */
  surface: string;
  /** Another prompt or the camera viewer is up — stay hidden, keep waiting. */
  suppressed?: boolean;
  /** Lets the parent keep its own prompts from stacking on this one. */
  onVisibilityChange?: (visible: boolean) => void;
}) {
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [selection, setSelection] = useState<UpgradeSelection>({ plan: "pro", interval: "annual" });
  const mountedAt = useRef<number>(Date.now());
  const firedRef = useRef(false);

  useEffect(() => {
    onVisibilityChange?.(visible);
  }, [visible, onVisibilityChange]);

  useEffect(() => {
    if (!visible) return;
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  useEffect(() => {
    if (visible) return;
    let cancelled = false;
    let premium = false;
    let identityRead = false;

    const evaluate = () => {
      if (cancelled || firedRef.current) return;
      const now = Date.now();
      // Donation contract: a timed show defers while a donation prompt
      // is fresh (<5 min). Nothing is consumed — the next tick retries.
      if (donateDeferActive(now, browserLocal(), browserSession())) return;
      // Never appear under a modal (the manager's dialog-defer rule).
      if (document.querySelector('[role="dialog"], [aria-modal="true"]')) return;
      const session = browserSessionStorage();
      const should = timedPopupShouldShow({
        now,
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
        setSelection(readSelection(browserSession()));
        markUpgradeShown(now, browserLocal(), browserSession());
        trackAnalyticsEvent("upgrade_corner_shown", surface);
        setVisible(true);
      }
    };

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

  const reducedMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const dismiss = () => {
    markTimedDismissed(browserLadderStorage());
    trackAnalyticsEvent("upgrade_corner_dismissed", surface);
    setVisible(false);
  };

  const choose = (plan: UpgradeTier) => {
    const next = { plan, interval: selection.interval };
    setSelection(next);
    writeSelection(browserSession(), next);
    trackAnalyticsEvent("upgrade_corner_clicked", "plan");
  };

  const openStep = (step: 1 | 3 | 4, target: "plan" | "checkout" | "compare") => {
    trackAnalyticsEvent("upgrade_corner_clicked", target);
    openUpgradePopup({
      step,
      plan: selection.plan,
      interval: step === 4 ? "annual" : selection.interval,
      trigger: "corner",
    });
    setVisible(false);
  };

  const facts = UPGRADE_PLANS[selection.plan];
  const strip = rotatedCaptures(selection.plan === "lite" ? 1 : selection.plan === "ultra" ? 2 : 0, 4);
  const motionCls = reducedMotion
    ? ""
    : `transition-all duration-[250ms] ${entered ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`;

  return (
    <>
      {/* ── Desktop card ─────────────────────────────────────────── */}
      <section
        aria-label="Unlock the full globe — 10 days free"
        onClick={() => openStep(1, "plan")}
        className={`fixed bottom-6 right-6 z-[350] hidden w-[400px] max-w-[calc(100%-2rem)] cursor-pointer overflow-hidden rounded-[22px] border border-white/12 bg-[#101216]/97 shadow-2xl shadow-black/70 backdrop-blur sm:block ${motionCls}`}
      >
        {/* Snapshot strip */}
        <div className="relative h-[74px]">
          <div className="absolute inset-0 flex">
            {strip.map((src, i) => (
              <img
                key={`${src}-${i}`}
                src={src}
                alt=""
                draggable={false}
                loading="lazy"
                className="h-full flex-1 object-cover brightness-[0.8]"
              />
            ))}
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-[#101216]/85" />
          <span className="absolute bottom-2 left-3 rounded-full bg-[#34D399] px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.16em] text-black">
            10 DAYS FREE
          </span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={(e) => {
              e.stopPropagation();
              dismiss();
            }}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white/85 backdrop-blur-sm transition hover:bg-black/80 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pb-4.5 pt-3.5">
          <h3 className="text-[19px] font-extrabold leading-snug tracking-tight text-white">
            Unlock the full globe. <span className="text-[#F6D77A]">Free for 10 days.</span>
          </h3>
          <p className="mt-1 text-[13px] leading-relaxed text-white/55">
            Every camera, the AI analyst, OSINT tools and intel feeds. $0 today, cancel in 1
            click.
          </p>

          {/* Plan tiles */}
          <div className="mt-3.5 grid grid-cols-3 gap-2">
            {UPGRADE_TIERS.map((tier) => {
              const f = UPGRADE_PLANS[tier];
              const selected = selection.plan === tier;
              return (
                <button
                  key={tier}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    choose(tier);
                  }}
                  aria-pressed={selected}
                  className="rounded-xl border px-2 py-2.5 text-center transition"
                  style={{
                    borderColor: selected ? f.color : "rgba(255,255,255,0.12)",
                    background: selected ? `${f.color}14` : "rgba(255,255,255,0.03)",
                    boxShadow: selected ? `0 0 0 1px ${f.color}66` : undefined,
                  }}
                >
                  <span className="block text-[13px] font-bold" style={{ color: f.color }}>
                    {f.name}
                    {f.popular ? " ★" : ""}
                  </span>
                  <span className="block text-[15px] font-extrabold text-white">
                    {f.yearlyEquivalent}
                    <span className="text-[11px] font-semibold text-white/45">/mo</span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-center text-[11.5px] text-white/40">
            Billed yearly · monthly plans also available
          </p>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openStep(4, "checkout");
            }}
            className="mt-3 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#F6D77A] to-[#E4B93F] px-5 text-[15px] font-bold text-black shadow-[0_10px_36px_rgba(228,185,63,0.35)] transition hover:brightness-110 active:scale-[0.99]"
          >
            Start {facts.name} free
            <ArrowRight className="h-4.5 w-4.5" />
          </button>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openStep(3, "compare");
              }}
              className="text-[13px] font-semibold text-white/75 transition hover:text-white"
            >
              Compare all plans
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                dismiss();
              }}
              className="text-[13px] text-white/40 transition hover:text-white"
            >
              Not now
            </button>
          </div>
        </div>
      </section>

      {/* ── Mobile banner ────────────────────────────────────────── */}
      <section
        aria-label="Unlock the full globe — 10 days free"
        onClick={() => openStep(1, "plan")}
        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
        className={`fixed bottom-[4.5rem] left-2.5 right-2.5 z-[350] cursor-pointer rounded-[20px] border border-white/12 bg-[#101216]/97 p-3.5 shadow-2xl shadow-black/70 backdrop-blur sm:hidden ${motionCls}`}
      >
        <div className="flex items-start gap-3">
          <img
            src="/landing/camera-viewer.jpg"
            alt=""
            draggable={false}
            loading="lazy"
            className="h-14 w-14 shrink-0 rounded-xl object-cover"
          />
          <div className="min-w-0 flex-1 pr-6">
            <h3 className="text-[15px] font-extrabold leading-snug text-white">
              Unlock the full globe. <span className="text-[#F6D77A]">10 days free.</span>
            </h3>
            <p className="mt-0.5 text-[12px] text-white/50">Plans from $3.75/mo · $0 today</p>
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={(e) => {
              e.stopPropagation();
              dismiss();
            }}
            className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openStep(4, "checkout");
            }}
            className="flex min-h-[46px] flex-1 items-center justify-center rounded-xl bg-gradient-to-b from-[#F6D77A] to-[#E4B93F] px-4 text-sm font-bold text-black transition hover:brightness-110 active:scale-[0.99]"
          >
            Start free trial
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openStep(3, "compare");
            }}
            className="flex min-h-[46px] items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-4 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
          >
            See plans
          </button>
        </div>
      </section>
    </>
  );
}
