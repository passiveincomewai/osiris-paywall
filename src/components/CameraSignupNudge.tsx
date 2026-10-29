"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { X, Crown, Mail, MailWarning, UserRound } from "lucide-react";
import TrialPicker from "./TrialPicker";
import InviteFriendsSection from "./InviteFriendsSection";
import NewsletterForm from "./NewsletterForm";
import { trackAnalyticsEvent } from "./AnalyticsTracker";
import { FREE_CAMERA_CLICKS } from "@/lib/cameraGate";
import {
  ACCOUNT_LADDER_TOTAL,
  EMAIL_LADDER_TOTAL,
  EMAIL_UNLOCK_OPENS,
  VERIFY_UNLOCK_OPENS,
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
 *  - "email": the middle tier. An email field over the ladder's
 *    promise: dropping an address (the existing newsletter subscribe —
 *    instant validation, no confirmation email since 2026-10-28)
 *    unlocks +5 opens instantly via onEmailUnlocked; the account path
 *    sits right under it.
 *  - "account": the email step is done; the free account is the ask
 *    (with a verified email it's worth the full 10-open allowance on
 *    any device — the +5 over the base is the verify grant now, see
 *    the next rung).
 *  - "verify": the signed-in-but-unverified rung (2026-10-29). The
 *    PRIMARY path is verifying the account email in Settings for +5
 *    (10 total) — Pro is only a secondary text link here, never the
 *    lead. This is the rung Jameson ordered for the cap cohort.
 *  - "pro": the verified free-account allowance is used up — only now
 *    the trial picker leads, exactly as the legacy wall renders it.
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
          Create a free account to get {EMAIL_UNLOCK_OPENS} more free opens
        </h2>
        <p className="text-sm text-white/55 mt-2 mb-5">
          You&apos;ve opened your {FREE_CAMERA_CLICKS} free cameras on this device. Drop your
          email and {EMAIL_UNLOCK_OPENS} more unlock right away — no password needed. A free
          account with a verified email gets {ACCOUNT_LADDER_TOTAL} free opens on any device.
        </p>
        <div className="text-left">
          <NewsletterForm source="ladder-email-unlock" compact onSuccess={onEmailUnlocked} />
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-white/35">
          Your opens unlock the moment you submit — and you&apos;re on the list right
          away. No confirmation email; we check the address as you enter it.
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
          Create your free account
        </h2>
        <p className="text-sm text-white/55 mt-2 mb-6">
          You&apos;ve opened your {opensUsed ?? EMAIL_LADDER_TOTAL} free cameras on this
          device. A free account with a verified email gets {ACCOUNT_LADDER_TOTAL} free
          opens on any device — and your saved cameras follow you everywhere.
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

  if (rung === "verify") {
    return shell(
      "Verify your email for more free opens",
      <>
        <div className="mx-auto w-12 h-12 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 flex items-center justify-center mb-4">
          <MailWarning className="w-6 h-6 text-[#D4AF37]" />
        </div>
        <h2 className="text-lg font-bold tracking-tight">
          Verify your email to get {VERIFY_UNLOCK_OPENS} more free opens
        </h2>
        <p className="text-sm text-white/55 mt-2 mb-6">
          You&apos;ve opened your {opensUsed ?? FREE_CAMERA_CLICKS} free cameras on this
          device. Signed-in accounts get {FREE_CAMERA_CLICKS} free opens until their email
          is verified — verify yours and {VERIFY_UNLOCK_OPENS} more unlock,{" "}
          {ACCOUNT_LADDER_TOTAL} in all. It takes one click from the email we sent when
          you signed up, or send a fresh link in Settings.
        </p>
        <Link
          href="/settings"
          className="block w-full rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] px-5 py-2.5 text-sm font-bold text-black transition hover:brightness-110"
        >
          Verify in Settings
        </Link>
        <p className="mt-3 text-xs text-white/35">
          Want unlimited instead?{" "}
          <Link href="/pricing" className="underline hover:text-white/60 transition">
            See Pro
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
