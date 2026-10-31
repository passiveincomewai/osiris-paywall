"use client";

/**
 * The popup system's faces. Every component here is presentational:
 * PopupManager decides IF and WHEN one appears (lib/popups/manager
 * owns arbitration, frequency, and eligibility), tracks
 * shown/clicked/dismissed, and hands each face its data + callbacks.
 *
 * Copy discipline: every claim is verified against the code it names —
 * ladder numbers from lib/camera-ladder, trial terms from
 * TRIAL_PLAN_OPTIONS, the discount from the standing WELCOME50 code,
 * Powder Pass terms from lib/billing/trials + lib/ski/access.
 */

import { useState } from "react";
import Link from "next/link";
import {
  BellRing,
  Camera,
  Check,
  Crown,
  Flame,
  Hourglass,
  MailCheck,
  MailWarning,
  Megaphone,
  Share2,
  Sparkles,
  UserRound,
} from "lucide-react";
import NewsletterForm from "../NewsletterForm";
import { PopupMedallion, PopupModal, PopupToast, POPUP_CTA_CLASS, POPUP_GOLD_CTA_CLASS } from "./PopupShell";
import { TrialPickerDialog } from "@/components/TrialPicker";
import { TRIAL_PLAN_OPTIONS, startPlanCheckout } from "@/lib/billing/trial-checkout";

// ── happening_now ───────────────────────────────────────────────────

export function HappeningNowToast({
  story,
  onOpen,
  onClose,
}: {
  story: { title: string; url: string };
  onOpen: () => void;
  onClose: () => void;
}) {
  return (
    <PopupToast label="Happening now" onClose={onClose}>
      <div className="flex items-start gap-3 pr-6">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/15 border border-red-400/30">
          <Flame className="w-5 h-5 text-red-300" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-red-300">
            Happening now
          </p>
          <p className="mt-1 text-sm font-semibold leading-snug text-white">
            {story.title}
          </p>
          <Link
            href={story.url}
            onClick={onOpen}
            className="mt-1.5 inline-block text-xs font-semibold text-[#D4AF37] hover:underline"
          >
            Read the story — and watch it live →
          </Link>
        </div>
      </div>
    </PopupToast>
  );
}

// ── welcome_back ────────────────────────────────────────────────────

export function WelcomeBackPopup({
  lastCamera,
  onAction,
  onClose,
}: {
  /** From lib/camera-share's readLastCamera — genuinely the visitor's
   *  last opened camera, or null (then the copy stays generic). */
  lastCamera: { name: string | null; url: string } | null;
  onAction: () => void;
  onClose: () => void;
}) {
  return (
    <PopupModal label="Welcome back" onClose={onClose}>
      <PopupMedallion>
        <Sparkles className="w-6 h-6 text-[#D4AF37]" />
      </PopupMedallion>
      <h2 className="text-lg font-bold tracking-tight">Welcome back</h2>
      <p className="text-sm text-white/55 mt-2 mb-5">
        The planet kept moving while you were away — volcanoes, auroras, harbors
        and runways, all still live.
        {lastCamera?.name ? (
          <>
            {" "}
            Your last camera was <span className="text-white/80">{lastCamera.name}</span>.
          </>
        ) : null}
      </p>
      <Link href="/signup" onClick={onAction} className={POPUP_CTA_CLASS}>
        Create a free account
      </Link>
      {lastCamera ? (
        <Link
          href={lastCamera.url}
          onClick={onAction}
          className="mt-2 block w-full rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:border-[#D4AF37]/50 hover:text-white"
        >
          Reopen {lastCamera.name ?? "your last camera"}
        </Link>
      ) : null}
      <p className="mt-3 text-[11px] leading-relaxed text-white/35">
        A free account saves your cameras, so the views you love are one tap away.
      </p>
    </PopupModal>
  );
}

// ── pricing_save ────────────────────────────────────────────────────

export function PricingSavePopup({
  onUse,
  onClose,
}: {
  onUse: () => void;
  onClose: () => void;
}) {
  return (
    <PopupModal label="A standing welcome offer" onClose={onClose}>
      <PopupMedallion>
        <Crown className="w-6 h-6 text-[#D4AF37]" />
      </PopupMedallion>
      <h2 className="text-lg font-bold tracking-tight">Before you go — WELCOME50</h2>
      <p className="text-sm text-white/55 mt-2 mb-5">
        Our standing welcome code takes <span className="text-white/85 font-semibold">50% off
        your first payment</span> on any plan. Enter it at checkout:
      </p>
      <p className="mx-auto mb-5 w-fit rounded-lg border border-dashed border-[#D4AF37]/50 bg-[#D4AF37]/10 px-4 py-2 font-mono text-base font-bold tracking-[0.25em] text-[#D4AF37]">
        WELCOME50
      </p>
      <button type="button" onClick={onUse} className={POPUP_GOLD_CTA_CLASS}>
        See the plans
      </button>
      <p className="mt-3 text-[11px] leading-relaxed text-white/35">
        One use per customer, on the first payment. Trials still start free.
      </p>
    </PopupModal>
  );
}

// ── engaged_watcher ─────────────────────────────────────────────────

export function EngagedWatcherPopup({
  variant,
  onAction,
  onClose,
}: {
  /** anonymous: the free-account ask. verify: signed-in but unverified —
   *  the ladder's own verify rung, pointed at Settings. */
  variant: "anonymous" | "verify";
  onAction: () => void;
  onClose: () => void;
}) {
  if (variant === "verify") {
    return (
      <PopupModal label="Unlock more camera opens" onClose={onClose}>
        <PopupMedallion>
          <MailWarning className="w-6 h-6 text-[#D4AF37]" />
        </PopupMedallion>
        <h2 className="text-lg font-bold tracking-tight">Verify your email, unlock 5 more</h2>
        <p className="text-sm text-white/55 mt-2 mb-5">
          You&apos;re signed in — one step is left. Verify your email in Settings and
          5 more camera opens unlock, for 10 in total on any device.
        </p>
        <Link href="/settings" onClick={onAction} className={POPUP_CTA_CLASS}>
          Verify in Settings
        </Link>
      </PopupModal>
    );
  }
  return (
    <PopupModal label="Create a free account" onClose={onClose}>
      <PopupMedallion>
        <UserRound className="w-6 h-6 text-[#D4AF37]" />
      </PopupMedallion>
      <h2 className="text-lg font-bold tracking-tight">Enjoying the view?</h2>
      <p className="text-sm text-white/55 mt-2 mb-5">
        Create a free account to save the cameras you love — and verify your
        email to unlock 5 more camera opens, 10 in total on any device.
      </p>
      <Link href="/signup" onClick={onAction} className={POPUP_CTA_CLASS}>
        Create free account
      </Link>
    </PopupModal>
  );
}

// ── your_camera ─────────────────────────────────────────────────────

export function YourCameraPopup({
  cameraName,
  onAction,
  onClose,
}: {
  cameraName: string | null;
  onAction: () => void;
  onClose: () => void;
}) {
  return (
    <PopupModal label="Save your favorite camera" onClose={onClose}>
      <PopupMedallion>
        <Camera className="w-6 h-6 text-[#D4AF37]" />
      </PopupMedallion>
      <h2 className="text-lg font-bold tracking-tight">
        {cameraName ? <>You keep coming back to {cameraName}</> : <>You keep coming back to this camera</>}
      </h2>
      <p className="text-sm text-white/55 mt-2 mb-5">
        Save it to a free account and it&apos;s always one tap away in your
        saved cameras — on any device.
      </p>
      <Link href="/signup" onClick={onAction} className={POPUP_CTA_CLASS}>
        Create free account
      </Link>
    </PopupModal>
  );
}

// ── end_of_article ──────────────────────────────────────────────────

export function EndOfArticlePopup({
  alreadySubscribed,
  signedIn,
  onSubscribed,
  onAction,
  onClose,
}: {
  alreadySubscribed: boolean;
  signedIn: boolean;
  onSubscribed: () => void;
  onAction: () => void;
  onClose: () => void;
}) {
  return (
    <PopupModal label="More WorldEye" onClose={onClose}>
      <PopupMedallion>
        <MailCheck className="w-6 h-6 text-[#D4AF37]" />
      </PopupMedallion>
      <h2 className="text-lg font-bold tracking-tight">Don&apos;t miss the next one</h2>
      {!alreadySubscribed && (
        <>
          <p className="text-sm text-white/55 mt-2 mb-4">
            One email when the sky does something big — eruptions, aurora
            storms, launches. No noise in between.
          </p>
          <div className="text-left">
            <NewsletterForm source="popup-end-of-article" compact onSuccess={onSubscribed} />
          </div>
        </>
      )}
      {!signedIn && (
        <div className={alreadySubscribed ? "" : "mt-5 border-t border-white/10 pt-4"}>
          {alreadySubscribed && (
            <p className="text-sm text-white/55 mt-2 mb-4">
              You&apos;re on the list. A free account is the other half: save
              your cameras and unlock more opens.
            </p>
          )}
          <Link href="/signup" onClick={onAction} className={POPUP_CTA_CLASS}>
            Create free account
          </Link>
        </div>
      )}
    </PopupModal>
  );
}

// ── trial_waiting ───────────────────────────────────────────────────

export function TrialWaitingPopup({
  onAction,
  onClose,
}: {
  onAction: () => void;
  onClose: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const monthly =
    TRIAL_PLAN_OPTIONS.find((o) => o.plan === "monthly") ?? TRIAL_PLAN_OPTIONS[0];
  // Engaging swaps this face for the ONE central plan picker (the
  // Phase D contract every other upgrade surface uses), pre-opened on
  // the plan this face names — monthly Pro. Choosing a plan swaps the
  // dialog in place to the embedded checkout; closing the dialog ends
  // the popup (onClose is the manager's dismiss), exactly as engaging
  // dismisses the TrialPrompt surface into its picker.
  if (pickerOpen) {
    return (
      <TrialPickerDialog open onClose={onClose} defaultPlan="monthly" />
    );
  }
  return (
    <PopupModal label="Your free trial is waiting" onClose={onClose}>
      <PopupMedallion>
        <Crown className="w-6 h-6 text-[#D4AF37]" />
      </PopupMedallion>
      <h2 className="text-lg font-bold tracking-tight">Your Pro trial is still waiting</h2>
      <p className="text-sm text-white/55 mt-2 mb-5">
        You&apos;ve never started one: {monthly.trialLabel.toLowerCase()} of WorldEye
        Pro ({monthly.price}
        {monthly.per} after), every premium layer unlocked. It starts when
        you say so — cancel anytime.
      </p>
      <button
        type="button"
        className={POPUP_GOLD_CTA_CLASS}
        onClick={() => {
          onAction();
          setPickerOpen(true);
        }}
      >
        {monthly.cta}
      </button>
      <p className="mt-3 text-[11px] leading-relaxed text-white/35">
        Secured by Stripe · Cancel anytime · 7-day money-back guarantee on your first charge
      </p>
    </PopupModal>
  );
}

// ── share_view ──────────────────────────────────────────────────────

export function ShareViewPopup({
  cameraName,
  onShare,
  onClose,
}: {
  cameraName: string | null;
  /** Performs the share/copy; resolves to what happened for the label. */
  onShare: () => Promise<"shared" | "copied" | "failed">;
  onClose: () => void;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <PopupModal label="Share this view" onClose={onClose}>
      <PopupMedallion>
        <Share2 className="w-6 h-6 text-[#D4AF37]" />
      </PopupMedallion>
      <h2 className="text-lg font-bold tracking-tight">Send this view to a friend</h2>
      <p className="text-sm text-white/55 mt-2 mb-5">
        {cameraName ? (
          <>
            <span className="text-white/80">{cameraName}</span> is live right now —
            share the exact camera, free for anyone to open.
          </>
        ) : (
          <>This camera is live right now — share the exact view, free for anyone to open.</>
        )}
      </p>
      <button
        type="button"
        className={POPUP_CTA_CLASS}
        onClick={async () => {
          const r = await onShare();
          if (r === "copied") setState("copied");
          else if (r === "failed") setState("failed");
          else onClose();
        }}
      >
        {state === "copied" ? (
          <span className="inline-flex items-center gap-2">
            <Check className="w-4 h-4" /> Link copied
          </span>
        ) : (
          "Share this camera"
        )}
      </button>
      {state === "failed" && (
        <p className="mt-3 text-[11px] text-red-300">
          Sharing didn&apos;t work in this browser — the camera link is in the address bar.
        </p>
      )}
    </PopupModal>
  );
}

// ── powder_pass (page-scoped; rendered only behind the server flag gate) ──

export function PowderPassPopup({
  option,
  onAction,
  onClose,
}: {
  option: { price: string; per: string; trialLabel: string; cta: string };
  onAction: () => void;
  onClose: () => void;
}) {
  return (
    <PopupModal label="Powder Pass" onClose={onClose}>
      <PopupMedallion>
        <BellRing className="w-6 h-6 text-[#D4AF37]" />
      </PopupMedallion>
      <h2 className="text-lg font-bold tracking-tight">Powder Pass</h2>
      <p className="text-sm text-white/55 mt-2 mb-5">
        WorldEye&apos;s ski-only membership: resort pages, live slope and
        access-road cameras, the drive-up route tool and resort compare —{" "}
        {option.price}
        {option.per}, {option.trialLabel.toLowerCase()} to start. VIP Pro
        annual already includes it.
      </p>
      <button
        type="button"
        className={POPUP_GOLD_CTA_CLASS}
        onClick={() => {
          onAction();
          startPlanCheckout("ski");
        }}
      >
        {option.cta}
      </button>
    </PopupModal>
  );
}

// ── tool_completion (dormant — see lib/popups/signals registry audit) ──

export function ToolCompletionPopup({
  benefit,
  onAction,
  onClose,
}: {
  benefit: string;
  onAction: () => void;
  onClose: () => void;
}) {
  return (
    <PopupModal label="Save your results" onClose={onClose}>
      <PopupMedallion>
        <Sparkles className="w-6 h-6 text-[#D4AF37]" />
      </PopupMedallion>
      <h2 className="text-lg font-bold tracking-tight">Keep this result</h2>
      <p className="text-sm text-white/55 mt-2 mb-5">{benefit}</p>
      <Link href="/signup" onClick={onAction} className={POPUP_CTA_CLASS}>
        Create free account
      </Link>
    </PopupModal>
  );
}
// ── P4 faces: append to src/components/popups/popups.tsx ────────────
// New lucide imports needed in the import block: Hourglass, Megaphone.

// ── trial_ending (#12) ──────────────────────────────────────────────

export function TrialEndingPopup({
  planName,
  daysLeft,
  cameraOpens,
  savedCameras,
  onAction,
  onClose,
}: {
  /** Display name from the checkout plan summaries, or null (then the
   *  copy says "your trial" without naming a plan). */
  planName: string | null;
  daysLeft: number;
  /** The user's own camera_open PageViews since the trial began. */
  cameraOpens: number;
  /** The user's own saved-camera count. */
  savedCameras: number;
  onAction: () => void;
  onClose: () => void;
}) {
  const plan = planName ?? "Pro";
  const hasUsage = cameraOpens + savedCameras > 0;
  return (
    <PopupModal label="Your free trial is ending" onClose={onClose}>
      <PopupMedallion>
        <Hourglass className="w-6 h-6 text-[#D4AF37]" />
      </PopupMedallion>
      <h2 className="text-lg font-bold tracking-tight">
        Your {plan} trial ends in {daysLeft} day{daysLeft === 1 ? "" : "s"}
      </h2>
      <p className="text-sm text-white/55 mt-2 mb-5">
        {hasUsage ? (
          <>
            Your trial so far: {cameraOpens} camera open
            {cameraOpens === 1 ? "" : "s"} · {savedCameras} camera
            {savedCameras === 1 ? "" : "s"} saved.{" "}
          </>
        ) : null}
        When the trial ends, {plan} continues at its normal price and
        everything carries over — your saved cameras, layers and limits.
      </p>
      <Link href="/pricing" onClick={onAction} className={POPUP_GOLD_CTA_CLASS}>
        Keep {plan}
      </Link>
      <p className="mt-3 text-[11px] leading-relaxed text-white/35">
        Your plan continues automatically when the trial ends · Cancel anytime in Settings
      </p>
    </PopupModal>
  );
}

// ── affiliate_invite (#13) ──────────────────────────────────────────

export function AffiliateInvitePopup({
  onAction,
  onClose,
}: {
  onAction: () => void;
  onClose: () => void;
}) {
  return (
    <PopupModal label="Affiliate program invite" onClose={onClose}>
      <PopupMedallion>
        <Megaphone className="w-6 h-6 text-[#D4AF37]" />
      </PopupMedallion>
      <h2 className="text-lg font-bold tracking-tight">
        Join the free affiliate program
      </h2>
      <p className="text-sm text-white/55 mt-2 mb-5">
        You use WorldEye a lot, so here&apos;s an invite most members never
        see. The program is free to join: share your link or personal
        discount code and earn 15–30% recurring commission — by rank — on
        the subscriptions you refer.
      </p>
      <Link href="/affiliates" onClick={onAction} className={POPUP_CTA_CLASS}>
        See how it works
      </Link>
      <p className="mt-3 text-[11px] leading-relaxed text-white/35">
        Free to join · Your audience gets a discount code too · Full terms on the program page
      </p>
    </PopupModal>
  );
}
