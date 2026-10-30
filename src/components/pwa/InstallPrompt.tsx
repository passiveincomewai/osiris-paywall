"use client";

/**
 * "Add to Home Screen" install bar for the WorldEye PWA (F17).
 *
 * Mounted once in the root layout. Mobile-first, dismissible, and never
 * blocking: it renders a slim fixed bar at the bottom of the viewport and
 * hides itself when the app is installed/standalone, during the dismissal
 * cooldown, and on account/billing/admin surfaces.
 *
 * Platform behavior:
 * - Android/Chromium: the bar appears only after the browser fires
 *   `beforeinstallprompt`; the button triggers that native prompt.
 * - iOS Safari: no programmatic prompt exists, so the button opens a
 *   small instruction sheet (Share → Add to Home Screen → Add).
 * - Desktop (owner order 2026-10-29): no install pitch at all — the
 *   same bar teaches bookmarking instead (Ctrl+D / Cmd+D by OS, plus
 *   pinning the tab), under the same dismissal cooldown, and reports
 *   through distinct `bookmark_prompt_*` analytics events so bookmark
 *   shows are never counted as install shows.
 *
 * Outcomes are reported through the existing analytics path
 * (`trackAnalyticsEvent` → /api/analytics/track).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { trackAnalyticsEvent } from "@/components/AnalyticsTracker";
import {
  PWA_DISMISS_STORAGE_KEY,
  detectDesktopOs,
  detectInstallPlatform,
  parseDismissedAt,
  shouldShowBookmarkPrompt,
  shouldShowInstallPrompt,
  type DesktopOs,
  type InstallPlatform,
} from "@/lib/pwa/install";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const INSTALLED_STORAGE_KEY = "we_pwa_installed";

/** Surfaces where an install bar would be in the way (billing, account, admin). */
const HIDDEN_PATH_PREFIXES = ["/settings", "/admin", "/checkout", "/billing"];

export default function InstallPrompt() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [iosSheetOpen, setIosSheetOpen] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const platformRef = useRef<InstallPlatform>("other");
  const desktopOsRef = useRef<DesktopOs>("other");
  const shownTrackedRef = useRef(false);

  const evaluate = useCallback(() => {
    if (typeof window === "undefined") return;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;
    const installed =
      window.localStorage.getItem(INSTALLED_STORAGE_KEY) === "1";
    const dismissedAt = parseDismissedAt(
      window.localStorage.getItem(PWA_DISMISS_STORAGE_KEY),
    );
    const isDesktop = platformRef.current === "desktop";
    const show = isDesktop
      ? shouldShowBookmarkPrompt({
          standalone,
          installed,
          platform: platformRef.current,
          dismissedAt,
          now: Date.now(),
        })
      : shouldShowInstallPrompt({
          standalone,
          installed,
          platform: platformRef.current,
          hasNativePrompt: deferredPromptRef.current !== null,
          dismissedAt,
          now: Date.now(),
        });
    setVisible(show);
    if (show && !shownTrackedRef.current) {
      shownTrackedRef.current = true;
      if (isDesktop) {
        trackAnalyticsEvent("bookmark_prompt_shown", desktopOsRef.current);
      } else {
        trackAnalyticsEvent("pwa_install_shown", platformRef.current);
      }
    }
  }, []);

  useEffect(() => {
    platformRef.current = detectInstallPlatform(
      window.navigator.userAgent,
      window.navigator.maxTouchPoints ?? 0,
    );
    desktopOsRef.current = detectDesktopOs(window.navigator.userAgent);
    evaluate();

    const onBeforeInstallPrompt = (event: Event) => {
      // Defer the native prompt so OUR button controls when it appears.
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
      evaluate();
    };
    const onAppInstalled = () => {
      window.localStorage.setItem(INSTALLED_STORAGE_KEY, "1");
      deferredPromptRef.current = null;
      setVisible(false);
      setIosSheetOpen(false);
      trackAnalyticsEvent("pwa_installed", platformRef.current);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, [evaluate]);

  const dismiss = useCallback(() => {
    window.localStorage.setItem(PWA_DISMISS_STORAGE_KEY, String(Date.now()));
    setVisible(false);
    setIosSheetOpen(false);
    if (platformRef.current === "desktop") {
      trackAnalyticsEvent("bookmark_prompt_dismissed", desktopOsRef.current);
    } else {
      trackAnalyticsEvent("pwa_install_dismissed", platformRef.current);
    }
  }, []);

  const onInstallClick = useCallback(async () => {
    const deferred = deferredPromptRef.current;
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      deferredPromptRef.current = null;
      trackAnalyticsEvent(
        choice.outcome === "accepted"
          ? "pwa_install_accepted"
          : "pwa_install_prompt_dismissed",
        platformRef.current,
      );
      // The native prompt can only be used once; hide either way (accept
      // also fires `appinstalled`; dismissal starts the cooldown via the
      // same path as the X button so we don't nag).
      if (choice.outcome === "accepted") {
        setVisible(false);
      } else {
        dismiss();
      }
      return;
    }
    if (platformRef.current === "ios") {
      setIosSheetOpen(true);
    }
  }, [dismiss]);

  if (!visible) return null;
  if (
    pathname &&
    HIDDEN_PATH_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return null;
  }

  if (platformRef.current === "desktop") {
    const isMac = desktopOsRef.current === "mac";
    const kbdClass =
      "rounded border border-white/15 bg-white/10 px-1 py-px font-sans text-[10px] font-semibold whitespace-nowrap text-white";
    return (
      <div className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-96">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0B0B16]/95 p-3 shadow-2xl shadow-black/60 backdrop-blur">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon-192.png"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-[10px]"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">
              Keep WorldEye one click away
            </p>
            <p className="text-xs leading-relaxed text-white/60">
              Press{" "}
              {isMac ? (
                <>
                  <kbd className={kbdClass}>⌘</kbd> +{" "}
                  <kbd className={kbdClass}>D</kbd>
                </>
              ) : (
                <>
                  <kbd className={kbdClass}>Ctrl</kbd> +{" "}
                  <kbd className={kbdClass}>D</kbd>
                </>
              )}{" "}
              to bookmark this page — and pin the tab so the live globe is
              always open.
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss bookmark tip"
            className="shrink-0 rounded-full p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M2 2l10 10M12 2L2 12"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-96">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0B0B16]/95 p-3 shadow-2xl shadow-black/60 backdrop-blur">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon-192.png"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-[10px]"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              WorldEye, one tap away
            </p>
            <p className="truncate text-xs text-white/60">
              Install the app — no browser chrome, straight to the globe.
            </p>
          </div>
          <button
            type="button"
            onClick={onInstallClick}
            className="shrink-0 rounded-full bg-[#D4AF37] px-3.5 py-2 text-xs font-bold whitespace-nowrap text-black transition hover:bg-[#e5c55c]"
          >
            Add to Home Screen
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss install prompt"
            className="shrink-0 rounded-full p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M2 2l10 10M12 2L2 12"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {iosSheetOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Add WorldEye to your Home Screen"
          onClick={() => setIosSheetOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0B0B16] p-5 text-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-base font-semibold">
                Add WorldEye to your Home Screen
              </h2>
              <button
                type="button"
                onClick={() => setIosSheetOpen(false)}
                aria-label="Close instructions"
                className="rounded-full p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 2l10 10M12 2L2 12"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <ol className="mt-4 space-y-3 text-sm text-white/80">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold">
                  1
                </span>
                <span>
                  Tap the{" "}
                  <strong className="text-white">Share</strong> button in
                  Safari&apos;s toolbar
                  <svg
                    className="mx-1 inline-block align-[-2px]"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 3v12m0-12L8 7m4-4 4 4M5 12v8h14v-8"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  .
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold">
                  2
                </span>
                <span>
                  Scroll down and tap{" "}
                  <strong className="text-white">Add to Home Screen</strong>.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold">
                  3
                </span>
                <span>
                  Tap <strong className="text-white">Add</strong> — WorldEye
                  lands on your home screen like an app.
                </span>
              </li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
