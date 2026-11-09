"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import HeaderProfileMenu from "./HeaderProfileMenu";
import { trackAnalyticsEvent } from "@/components/AnalyticsTracker";
import {
  readSessionIdentity,
  shouldRecheckEntitlement,
  type SessionIdentityState,
} from "@/lib/premium-entitlement";
import { useLocale } from "@/i18n/LocaleProvider";
import { getChromeCopy } from "@/i18n/dictionaries";
import { openUpgradePopup } from "@/lib/upgrade-popup";

/**
 * The header's account slot — one control for every identity state.
 *
 * Before this, page.tsx rendered HeaderProfileMenu only when the
 * viewer was premium and an Upgrade pill otherwise, so a signed-in
 * FREE user saw chrome identical to an anonymous visitor's and
 * concluded (reasonably) that sign-in hadn't worked. Now identity —
 * not entitlement — drives the slot:
 *
 *   anonymous / loading / unknown → Sign in button AND the gold Upgrade pill
 *   free                          → Upgrade pill AND the account menu
 *   premium                       → the account menu (as before)
 *
 * Identity comes from lib/premium-entitlement's readSessionIdentity,
 * re-checked on focus / visibility (throttled like the entitlement
 * healing) so a magic-link sign-in completed in another tab shows up
 * without a manual reload.
 */
export default function AccountHudControl({
  variant = "desktop",
}: {
  variant?: "desktop" | "mobile";
}) {
  const [state, setState] = useState<SessionIdentityState>("unknown");
  const lastCheckAt = useRef(0);
  const signInLabel = getChromeCopy(useLocale()).signIn;

  useEffect(() => {
    let live = true;
    const check = async () => {
      lastCheckAt.current = Date.now();
      const id = await readSessionIdentity();
      if (live) setState(id.state);
    };
    void check();
    const onWake = () => {
      if (document.visibilityState === "hidden") return;
      if (!shouldRecheckEntitlement(lastCheckAt.current, Date.now())) return;
      void check();
    };
    window.addEventListener("focus", onWake);
    document.addEventListener("visibilitychange", onWake);
    return () => {
      live = false;
      window.removeEventListener("focus", onWake);
      document.removeEventListener("visibilitychange", onWake);
    };
  }, []);

  // The Upgrade pill opens the upgrade popup in place (2026-11-09) —
  // it no longer navigates to /pricing. The popup host re-checks
  // identity before opening, so a premium viewer can never be shown
  // it even if this pill renders during a stale-identity moment.
  const pill = (
    <button
      type="button"
      aria-label="Upgrade to PRO"
      onClick={() => {
        trackAnalyticsEvent("header_upgrade_click");
        openUpgradePopup({ step: 1, trigger: "upgrade_button" });
      }}
      className={
        variant === "desktop"
          ? "upgrade-pill-glow pointer-events-auto inline-block"
          : "upgrade-pill-glow inline-block"
      }
    >
      <img
        src="/upgrade-to-pro.png"
        alt="Upgrade to PRO"
        width={1072}
        height={262}
        draggable={false}
        className={variant === "desktop" ? "h-12 w-auto" : "h-9 w-auto"}
      />
    </button>
  );

  // Logged-out only: rendered solely in the anonymous branch below, so a
  // signed-in viewer (free or premium) never sees it. Ghost/outline
  // treatment keeps it clearly secondary to the gold pill; the mobile
  // variant is compact so Sign in + the enlarged pill still fit the
  // phone header beside the logo.
  const signIn = (
    <Link
      href="/signin"
      className={
        variant === "desktop"
          ? "pointer-events-auto inline-flex items-center rounded-full border border-white/25 px-4 py-2 font-sans text-sm font-medium normal-case tracking-normal text-white/85 transition hover:border-white/50 hover:bg-white/10 hover:text-white"
          : "inline-flex items-center rounded-full border border-white/25 px-2.5 py-1 font-sans text-xs font-medium normal-case tracking-normal text-white/85 transition hover:border-white/50 hover:bg-white/10 hover:text-white"
      }
    >
      {signInLabel}
    </Link>
  );

  if (state === "premium") return <HeaderProfileMenu />;
  if (state === "free") {
    return (
      <>
        {pill}
        <HeaderProfileMenu />
      </>
    );
  }
  // anonymous, unknown, or still loading: Sign in beside the pill — the
  // same not-signed-in states the pill already showed for.
  return (
    <>
      {signIn}
      {pill}
    </>
  );
}
