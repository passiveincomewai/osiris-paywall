"use client";

/**
 * Support WorldEye — global provider (mounted once in RootShell).
 *
 * Owns: the popup instance, the explicit-open event (any Support
 * button/link/card dispatches it — user intent always opens), the
 * timed-prompt request event (gated by EVERY suppression rule in
 * lib/donate/config: paid subscribers, supporters, 14-day dismissal,
 * any open dialog, the 5-minute upgrade mutual-exclusion contract),
 * and the live-globe corner toast (pathname "/" only, 20-minute
 * dwell, 7-day cap).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { getDonateCopy, type DonateCopy } from "@/i18n/dictionaries";
import type { LocaleCode } from "@/i18n/config";
import { readSessionIdentity, type SessionIdentity } from "@/lib/premium-entitlement";
import {
  DONATE_DEFAULT_AMOUNT,
  DONATE_OPEN_EVENT,
  DONATE_TOAST_AMOUNTS,
  decideDonateToast,
  decideTimedDonatePrompt,
  type DonateOpenDetail,
} from "@/lib/donate/config";
import DonatePopup, { type DonateRequest } from "./DonatePopup";
import { HeartTile } from "./DonateForm";
import {
  DONATE_TIMED_REQUEST_EVENT,
  POPUP_SESSION_CLAIM_KEY,
  isDonateSupporterStamped,
  markDonateDismissed,
  markDonateShown,
  markDonateToastShown,
  readStamp,
  readUpgradeShownAt,
  trackDonate,
} from "./donate-client";
import {
  DONATE_DISMISSED_KEY,
  DONATE_TOAST_SHOWN_KEY,
} from "@/lib/donate/config";

function localeFromDocument(): LocaleCode {
  try {
    const lang = document.documentElement.lang?.slice(0, 2);
    return lang === "es" ? "es" : "en";
  } catch {
    return "en";
  }
}

export default function DonateProvider() {
  const pathname = usePathname();
  const [copy, setCopy] = useState<DonateCopy>(() => getDonateCopy("en"));
  const [request, setRequest] = useState<DonateRequest | null>(null);
  const [toast, setToast] = useState<{ amount: number } | null>(null);
  const identityRef = useRef<SessionIdentity | null>(null);
  const supporterRef = useRef(false);
  const toastAttemptedRef = useRef(false);

  useEffect(() => {
    setCopy(getDonateCopy(localeFromDocument()));
  }, []);

  const loadIdentity = useCallback(async (): Promise<SessionIdentity> => {
    if (identityRef.current) return identityRef.current;
    const identity = await readSessionIdentity().catch(
      () => ({ state: "unknown", planTier: "free" }) as SessionIdentity,
    );
    identityRef.current = identity;
    if (identity.user?.supporter) supporterRef.current = true;
    return identity;
  }, []);

  const openPopup = useCallback((req: DonateRequest) => {
    markDonateShown();
    trackDonate("donate_prompt_shown", req.source);
    setToast(null);
    setRequest(req);
  }, []);

  // Explicit opens — no gating, ever.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<DonateOpenDetail>).detail;
      if (!detail) return;
      openPopup({
        amount: detail.amount ?? DONATE_DEFAULT_AMOUNT,
        frequency: detail.frequency ?? "once",
        source: detail.source || "inline_card",
        checkout: detail.checkout,
      });
    };
    window.addEventListener(DONATE_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(DONATE_OPEN_EVENT, onOpen);
  }, [openPopup ]);

  // Timed prompts — the full suppression gate.
  useEffect(() => {
    const onTimed = async (e: Event) => {
      const source =
        (e as CustomEvent<{ source?: string }>).detail?.source ?? "gods_eye_view";
      if (request) return;
      // Another popup system already claimed this session.
      try {
        const claim = window.sessionStorage.getItem(POPUP_SESSION_CLAIM_KEY);
        if (claim && claim !== "donate") return;
      } catch {
        /* ignore */
      }
      const identity = await loadIdentity();
      const now = Date.now();
      const decision = decideTimedDonatePrompt({
        now,
        identityState: identity.state,
        accountSupporter: supporterRef.current,
        supporterStamp: isDonateSupporterStamped(now) ? now : null,
        dismissedAt: readStamp(DONATE_DISMISSED_KEY),
        upgradeShownAt: readUpgradeShownAt(),
        anyDialogOpen: !!document.querySelector('[role="dialog"]'),
        upgradePromoVisible: false,
        pathname: window.location.pathname,
      });
      if (!decision.show) return;
      openPopup({
        amount: DONATE_DEFAULT_AMOUNT,
        frequency: "once",
        source,
      });
    };
    window.addEventListener(DONATE_TIMED_REQUEST_EVENT, onTimed);
    return () => window.removeEventListener(DONATE_TIMED_REQUEST_EVENT, onTimed);
  }, [loadIdentity, openPopup, request]);

  // Globe corner toast: "/" only, 20-minute dwell, 7-day cap.
  useEffect(() => {
    if (pathname !== "/" || toastAttemptedRef.current) return;
    const startedAt = Date.now();
    const timer = window.setTimeout(async () => {
      toastAttemptedRef.current = true;
      if (request) return;
      const identity = await loadIdentity();
      const now = Date.now();
      const decision = decideDonateToast({
        now,
        identityState: identity.state,
        accountSupporter: supporterRef.current,
        supporterStamp: isDonateSupporterStamped(now) ? now : null,
        dismissedAt: readStamp(DONATE_DISMISSED_KEY),
        upgradeShownAt: readUpgradeShownAt(),
        anyDialogOpen: !!document.querySelector('[role="dialog"]'),
        upgradePromoVisible: false,
        pathname: "/",
        dwellMs: now - startedAt,
        toastShownAt: readStamp(DONATE_TOAST_SHOWN_KEY),
      });
      if (!decision.show) return;
      markDonateToastShown();
      markDonateShown();
      trackDonate("donate_prompt_shown", "globe_toast");
      setToast({ amount: DONATE_DEFAULT_AMOUNT });
    }, 20 * 60 * 1000);
    return () => window.clearTimeout(timer);
  }, [pathname, loadIdentity, request]);

  return (
    <>
      {request && (
        <DonatePopup
          copy={copy}
          request={request}
          onClose={() => setRequest(null)}
          onCompleted={() => {
            supporterRef.current = true;
          }}
        />
      )}
      {toast && !request && (
        <div className="fixed bottom-4 right-4 z-[190] w-[min(430px,calc(100vw-2rem))] rounded-[24px] border border-cyan-300/25 bg-[linear-gradient(180deg,#14171C,#0B0C10)] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.55),0_0_40px_rgba(34,211,238,0.12)] motion-safe:animate-[donate-pop_180ms_ease-out]">
          <div className="flex items-start gap-3.5">
            <HeartTile size={46} />
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-bold leading-snug text-white">
                {copy.toastHeadline}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">
                {copy.toastBody}
              </p>
            </div>
            <button
              type="button"
              aria-label={copy.close}
              onClick={() => {
                markDonateDismissed();
                trackDonate("donate_dismissed", "x");
                setToast(null);
              }}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-zinc-300 transition hover:bg-white/[0.1]"
            >
              <X size={14} />
            </button>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="flex gap-2">
              {DONATE_TOAST_AMOUNTS.map((chip) => {
                const active = toast.amount === chip;
                return (
                  <button
                    key={chip}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setToast({ amount: chip })}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? "border border-cyan-300 bg-cyan-300/10 text-cyan-200"
                        : "border border-white/10 bg-white/[0.04] text-zinc-200 hover:border-white/25"
                    }`}
                  >
                    ${chip}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() =>
                openPopup({
                  amount: toast.amount,
                  frequency: "once",
                  source: "globe_toast",
                })
              }
              className="ml-auto rounded-full bg-[linear-gradient(90deg,#8BEAFA,#22D3EE)] px-6 py-2.5 text-sm font-bold text-[#06202B] transition hover:brightness-105"
            >
              {copy.toastDonate}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
