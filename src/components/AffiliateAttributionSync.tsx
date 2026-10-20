"use client";

import { useEffect, useRef } from "react";
import { SHARE_DEVICE_KEY } from "@/lib/share/client";

/**
 * Fires /api/affiliate/sync-signup once per browser session when the visitor
 * is signed in. This links a referred user to their affiliate at signup time
 * (from the we_ref cookie), so attribution doesn't depend on the cookie
 * surviving until checkout. Server-side is idempotent — safe to re-fire.
 */
export default function AffiliateAttributionSync() {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (typeof window !== "undefined" && window.sessionStorage.getItem("we_aff_synced")) return;
    fired.current = true;

    (async () => {
      try {
        const s = await fetch("/api/auth/session", { cache: "no-store" });
        const session = await s.json().catch(() => null);
        if (!session?.user) return;
        await fetch("/api/affiliate/sync-signup", { method: "POST" }).catch(() => {});
        // Universal share: if this device holds an anonymous share
        // identity, claim it for the account that just signed in.
        // First-claim-wins is enforced server-side; this is a no-op
        // when the device has no identity or already claimed it.
        try {
          const deviceToken = window.localStorage.getItem(SHARE_DEVICE_KEY);
          if (deviceToken) {
            await fetch("/api/share/claim", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ deviceToken }),
            }).catch(() => {});
          }
        } catch {
          /* non-fatal */
        }
        window.sessionStorage.setItem("we_aff_synced", "1");
      } catch {
        /* non-fatal */
      }
    })();
  }, []);

  return null;
}
