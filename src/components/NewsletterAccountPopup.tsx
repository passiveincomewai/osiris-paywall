"use client";

/**
 * The post-newsletter-signup account popup — a conversion TEST surface
 * (Jameson's order, 2026-10-29), additional to the sign-in page, which
 * is untouched. Mounted once globally (RootShell); it listens for the
 * subscribe-success event components/NewsletterForm dispatches from
 * every newsletter surface (footer, capture cards, the ladder email
 * step) and offers the new subscriber a free account via the site's
 * real Google OAuth flow — the same signIn("google") the signup page
 * uses, never a link to /signin.
 *
 * The rules (lib/newsletter/popup): fires only off a completed
 * subscribe, at most once per browser session, dismiss permanent for
 * that session, never for signed-in users, and only after the form's
 * own "You're subscribed" state has had a moment to land. Events
 * popup_shown / popup_google_clicked / popup_dismissed carry the
 * surface as their detail token; the Google click also sets the
 * we_acq_src attribution cookie src/auth.ts reads at account creation.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { MailCheck, X } from "lucide-react";
import { GoogleIcon } from "./auth/ProviderIcons";
import { trackAnalyticsEvent } from "./AnalyticsTracker";
import { markPendingWelcome } from "@/lib/billing/trial-prompt";
import { FREE_CAMERA_CLICKS } from "@/lib/cameraGate";
import { ACCOUNT_LADDER_TOTAL } from "@/lib/camera-ladder";
import {
  NEWSLETTER_SUBSCRIBED_EVENT,
  POPUP_DELAY_MS,
  POPUP_DISMISSED_EVENT,
  POPUP_GOOGLE_CLICKED_EVENT,
  POPUP_SHOWN_EVENT,
  browserSessionStorage,
  buildAcquisitionCookie,
  markPopupSeen,
  popupDetailFor,
  readPopupSeen,
  shouldOfferPopup,
} from "@/lib/newsletter/popup";

export default function NewsletterAccountPopup({
  googleEnabled,
}: {
  /** Mirrors the signup page's gate: no Google provider, no button. */
  googleEnabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const detailRef = useRef("site");
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastFocusRef = useRef<Element | null>(null);
  const timerRef = useRef<number | null>(null);
  const dismissedRef = useRef(false);

  useEffect(() => {
    if (!googleEnabled) return;
    const onSubscribed = (e: Event) => {
      detailRef.current = popupDetailFor(
        (e as CustomEvent<{ source?: string }>).detail?.source,
      );
      if (readPopupSeen(browserSessionStorage())) return;
      // Never for signed-in users — the session check the affiliate
      // surfaces use. Fail-closed: an unreadable session means no
      // popup, keeping popup_shown an honest impression count.
      fetch("/api/auth/session", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((session) => {
          const signedIn = Boolean(
            (session as { user?: unknown } | null)?.user,
          );
          if (
            !shouldOfferPopup({
              seen: readPopupSeen(browserSessionStorage()),
              signedIn,
            })
          ) {
            return;
          }
          if (timerRef.current) window.clearTimeout(timerRef.current);
          timerRef.current = window.setTimeout(() => {
            markPopupSeen(browserSessionStorage());
            lastFocusRef.current = document.activeElement;
            dismissedRef.current = false;
            setOpen(true);
            trackAnalyticsEvent(POPUP_SHOWN_EVENT, detailRef.current);
          }, POPUP_DELAY_MS);
        })
        .catch(() => {
          /* no popup on a failed session check */
        });
    };
    window.addEventListener(NEWSLETTER_SUBSCRIBED_EVENT, onSubscribed);
    return () => {
      window.removeEventListener(NEWSLETTER_SUBSCRIBED_EVENT, onSubscribed);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [googleEnabled]);

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    trackAnalyticsEvent(POPUP_DISMISSED_EVENT, detailRef.current);
    setOpen(false);
  }, []);

  // Focus handling while open: land on the Google button, keep Tab
  // cycling inside the dialog, Escape dismisses, and hand focus back
  // to whatever had it when the popup closes.
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    dialog
      ?.querySelector<HTMLElement>("[data-popup-google]")
      ?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
        return;
      }
      if (e.key !== "Tab" || !dialog) return;
      const focusables = dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const prev = lastFocusRef.current as HTMLElement | null;
      prev?.focus?.({ preventScroll: true });
    };
  }, [open, dismiss]);

  if (!open) return null;

  const continueWithGoogle = () => {
    trackAnalyticsEvent(POPUP_GOOGLE_CLICKED_EVENT, detailRef.current);
    // Attribution the OAuth callback picks up (lib/newsletter/popup):
    // set BEFORE signIn navigates away, like the we_utm cookie.
    try {
      document.cookie = buildAcquisitionCookie();
    } catch {
      /* attribution is best-effort; the click still counts */
    }
    // Same welcome flag the signup form sets, so the arrival greeting
    // treats popup signups exactly like signup-page signups.
    markPendingWelcome();
    const path = window.location.pathname;
    void signIn("google", {
      callbackUrl: path.startsWith("/") && !path.startsWith("//") ? path : "/",
    });
  };

  return (
    <div
      className="fixed inset-0 z-[1250] flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
      aria-label="Create your free WorldEye account"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0a0e17] p-7 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={dismiss}
          aria-label="Close"
          className="float-right -mt-2 -mr-2 p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="mx-auto w-12 h-12 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 flex items-center justify-center mb-4">
          <MailCheck className="w-6 h-6 text-[#D4AF37]" />
        </div>
        <h2 className="text-lg font-bold tracking-tight">You&rsquo;re subscribed.</h2>
        <p className="text-sm text-white/55 mt-2 mb-6">
          That&rsquo;s the newsletter sorted. A free WorldEye account saves your
          cameras and follows you across devices — and with a verified email
          you get {ACCOUNT_LADDER_TOTAL} free camera opens on any device,
          against the {FREE_CAMERA_CLICKS} this device gets on its own.
        </p>
        <button
          type="button"
          data-popup-google
          onClick={continueWithGoogle}
          className="flex items-center justify-center gap-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/85 hover:bg-white/[0.07] hover:border-white/20 transition active:scale-[0.99]"
        >
          <GoogleIcon className="w-5 h-5" />
          Continue with Google
        </button>
        <p className="mt-3 text-xs text-white/35">
          Free to browse. No credit card required.
        </p>
        <button
          onClick={dismiss}
          className="mt-3 text-xs text-white/35 hover:text-white/60 transition"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
