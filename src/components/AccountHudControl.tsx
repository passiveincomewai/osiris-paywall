"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import HeaderProfileMenu from "./HeaderProfileMenu";
import {
  readSessionIdentity,
  shouldRecheckEntitlement,
  type SessionIdentityState,
} from "@/lib/premium-entitlement";

/**
 * The header's account slot — one control for every identity state.
 *
 * Before this, page.tsx rendered HeaderProfileMenu only when the
 * viewer was premium and an Upgrade pill otherwise, so a signed-in
 * FREE user saw chrome identical to an anonymous visitor's and
 * concluded (reasonably) that sign-in hadn't worked. Now identity —
 * not entitlement — drives the slot:
 *
 *   anonymous / loading / unknown → the gold Upgrade pill (as before)
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

  const pill = (
    <Link
      href="/pricing"
      aria-label="Upgrade to PRO"
      className={
        variant === "desktop"
          ? "pointer-events-auto inline-block hover:brightness-110 transition drop-shadow-[0_0_12px_rgba(56,150,255,0.45)]"
          : "inline-block hover:brightness-110 transition"
      }
    >
      <img
        src="/upgrade-to-pro.png"
        alt="Upgrade to PRO"
        width={1072}
        height={262}
        draggable={false}
        className={variant === "desktop" ? "h-8 w-auto" : "h-7 w-auto"}
      />
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
  // anonymous, unknown, or still loading: the pill, exactly as before.
  return pill;
}
