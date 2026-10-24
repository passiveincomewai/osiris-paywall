"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { X, Crown, Mail, UserRound } from "lucide-react";
import TrialPicker from "./TrialPicker";
import InviteFriendsSection from "./InviteFriendsSection";
import NewsletterForm from "./NewsletterForm";
import { trackAnalyticsEvent } from "./AnalyticsTracker";
import { FREE_CAMERA_CLICKS } from "@/lib/cameraGate";
import {
  ACCOUNT_LADDER_TOTAL,
  ACCOUNT_UNLOCK_OPENS,
  EMAIL_LADDER_TOTAL,
  EMAIL_UNLOCK_OPENS,
  type LadderPrompt,
} from "@/lib/camera-ladder";

/**
 * The camera-limit popup — Wave 2 (BRIEF F4) made it rung-aware.
 *
 * With no `rung` prop this is the original straight-to-Pro wall,
 * unchanged (invite-bonus exhaustion in page.tsx lands here, as does
 * any legacy caller). With a rung from lib/camera-ladder it shows the
 * NEXT step of the ladder instead — never a skip:
 *
 *  - "email": the middle tier. The owner's headline ("Create a free
 *    account to get 10 more free opens") over an email field: dropping
 *    an address (the existing newsletter subscribe, double opt-in)
 *    unlocks +5 opens instantly via onEmailUnlocked; the account path
 *    sits right under it for the other +5.
 *  - "account": the email step is done; completing the free account
 *    grants the last +5 (15 total).
 *  - "pro": the free-account allowance is used up — only now the trial
 *    picker leads, exactly as the legacy wall renders it.
 *
 * The picker runs in embedded mode in the Pro view: picking a plan
 * swaps this popup in place to the embedded Stripe checkout (the popup
 * widens, the pitch steps aside so the form leads) instead of
 * navigating away mid-intent. Closing from either view unmounts the
 * picker, which destroys any mounted checkout session with it.
 */
export default function CameraSignupNudge({
  onClose,
  rung,
  opensUsed,
  onEmailUnlocked,
}: {
  onClose: () => void;
  rung?: LadderPrompt;
  /** This device's real open count, for truthful copy on the pro rung. */
  opensUsed?: number;
  /** Fired when the email step succeeds — the +5 unlock applies at once. */
  onEmailUnlocked?: () => void;
}) {
  const [inCheckout, setInCheckout] = useState(false);

  useEffect(() => {
    if (rung) trackAnalyticsEvent("ladder_prompt_shown", rung);
  }, [rung]);

  const shell = (label: string, children: ReactNode) => (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div
        className={`w-full rounded-3xl border border-white/10 bg-[#0a0e17] p-7 text-center shadow-2xl max-h-[92dvh] overflow-y-auto transition-[max-width] duration-200 ${inCheckout ? "max-w-lg" : "max-w-sm"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="float-right -mt-2 -mr-2 p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition"
        >
          <X className="w-4 h-4" />
        </button>
        {children}
      </div>
    </div>
  );

  if (rung === "email") {
    return shell(
      "Get more free camera opens",
      <>
        <div className="mx-auto w-12 h-12 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 flex items-center justify-center mb-4">
          <Mail className="w-6 h-6 text-[#D4AF37]" />
        </div>
        <h2 className="text-lg font-bold tracking-tight">
          Create a free account to get {EMAIL_UNLOCK_OPENS + ACCOUNT_UNLOCK_OPENS} more free opens
        </h2>
        <p className="text-sm text-white/55 mt-2 mb-5">
          You&apos;ve opened your {FREE_CAMERA_CLICKS} free cameras on this device. Drop your
          email and {EMAIL_UNLOCK_OPENS} more unlock right away — no password needed. Finish
          creating your free account and that&apos;s {ACCOUNT_UNLOCK_OPENS} more after that.
        </p>
        <div className="text-left">
          <NewsletterForm source="ladder-email-unlock" compact onSuccess={onEmailUnlocked} />
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-white/35">
          Your opens unlock the moment you submit. We&apos;ll email a confirmation link for
          the list itself — you&apos;re only subscribed once you click it.
        </p>
        <div className="mt-5 border-t border-white/10 pt-4">
          <Link
            href="/signup"
            className="block w-full rounded-xl bg-[#0096FF] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0aa5ff]"
          >
            Create free account
          </Link>
          <p className="mt-3 text-xs text-white/35">
            Already have an account?{" "}
            <Link href="/signin" className="underline hover:text-white/60 transition">
              Sign in
            </Link>
          </p>
        </div>
        <button
          onClick={onClose}
          className="mt-3 text-xs text-white/35 hover:text-white/60 transition"
        >
          Maybe later
        </button>
      </>,
    );
  }

  if (rung === "account") {
    return shell(
      "Create your free account",
      <>
        <div className="mx-auto w-12 h-12 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 flex items-center justify-center mb-4">
          <UserRound className="w-6 h-6 text-[#D4AF37]" />
        </div>
        <h2 className="text-lg font-bold tracking-tight">
          Create your free account to get {ACCOUNT_UNLOCK_OPENS} more free opens
        </h2>
        <p className="text-sm text-white/55 mt-2 mb-6">
          You&apos;ve opened your {opensUsed ?? EMAIL_LADDER_TOTAL} free cameras on this
          device. A free account unlocks {ACCOUNT_UNLOCK_OPENS} more — {ACCOUNT_LADDER_TOTAL}{" "}
          in all — and your saved cameras follow you to any device.
        </p>
        <Link
          href="/signup"
          className="block w-full rounded-xl bg-[#0096FF] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0aa5ff]"
        >
          Create free account — it&apos;s free
        </Link>
        <p className="mt-3 text-xs text-white/35">
          Already have an account?{" "}
          <Link href="/signin" className="underline hover:text-white/60 transition">
            Sign in
          </Link>
        </p>
        <button
          onClick={onClose}
          className="mt-3 text-xs text-white/35 hover:text-white/60 transition"
        >
          Maybe later
        </button>
      </>,
    );
  }

  // "pro" rung — and the legacy no-rung render, which keeps the
  // original copy (the base count) exactly as before.
  const usedCount = rung === "pro" ? opensUsed ?? ACCOUNT_LADDER_TOTAL : FREE_CAMERA_CLICKS;
  return shell(
    "Upgrade to Pro",
    <>
      {!inCheckout && (
        <>
          <div className="mx-auto w-12 h-12 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 flex items-center justify-center mb-4">
            <Crown className="w-6 h-6 text-[#D4AF37]" />
          </div>
          <h2 className="text-lg font-bold tracking-tight">Unlock unlimited cameras</h2>
          <p className="text-sm text-white/55 mt-2 mb-6">
            You&apos;ve opened your {usedCount} free cameras on this device. Upgrade to Pro for unlimited live camera access — plus the AI analyst, satellite view, live traffic, advanced search filters and premium intel feeds.
          </p>
        </>
      )}
      {inCheckout && (
        <h2 className="text-lg font-bold tracking-tight mb-4">Unlock unlimited cameras</h2>
      )}
      <div className="text-left">
        <TrialPicker mode="embedded" onCheckoutViewChange={setInCheckout} />
      </div>
      {/* The free way out of the wall, under the plans: invite a
          friend, earn bonus checks when they join. Hidden while the
          checkout owns the popup — the form leads then. */}
      {!inCheckout && <InviteFriendsSection />}
      <p className="mt-3 text-xs text-white/35">
        <Link href="/pricing" className="underline hover:text-white/60 transition">Compare Free vs Pro first</Link>
      </p>
      <button
        onClick={onClose}
        className="mt-3 text-xs text-white/35 hover:text-white/60 transition"
      >
        Maybe later
      </button>
    </>,
  );
}
