"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  readSessionIdentity,
  shouldRecheckEntitlement,
  type SessionIdentityState,
} from "@/lib/premium-entitlement";

/**
 * The footer's Sign in / Sign up buttons — shown ONLY to signed-out
 * visitors.
 *
 * SiteFooter is a server component rendered by dozens of pages that
 * don't thread a server session into it, so identity comes from the
 * same client-side read the header's account slot uses
 * (lib/premium-entitlement's readSessionIdentity, over
 * /api/auth/session), re-checked on focus / visibilitychange with the
 * same throttle, so a sign-in completed in another tab updates the
 * footer without a reload.
 *
 * State semantics mirror AccountHudControl:
 *   free / premium  → signed in: render nothing (no empty shell)
 *   anonymous       → the two buttons, exactly as before
 *   unknown/loading → the two buttons — a failed read never claims a
 *                     sign-in, so signed-out chrome is the fallback,
 *                     same as the header showing the Upgrade pill
 *                     while identity is unresolved.
 */
export default function FooterAuthButtons() {
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

  if (state === "free" || state === "premium") return null;

  return (
    <div className="flex flex-wrap items-center gap-2 shrink-0">
      <Link
        href="/signin"
        className="inline-flex items-center px-3.5 py-2 rounded-lg border border-white/10 text-xs text-white/60 hover:text-white hover:border-white/25 transition"
      >
        Sign in
      </Link>
      <Link
        href="/signup"
        className="inline-flex items-center px-3.5 py-2 rounded-lg bg-[#0096FF] hover:bg-[#0aa5ff] text-xs text-white font-semibold transition"
      >
        Sign up
      </Link>
    </div>
  );
}
