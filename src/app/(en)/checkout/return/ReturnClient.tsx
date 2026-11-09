"use client";

/**
 * The landing for the upgrade popup's redirect-required completions.
 *
 * Most popup checkouts finish inside the modal (the session is created
 * with redirect_on_completion "if_required" — see /api/checkout's
 * ui_context "upgrade_popup" branch). A payment method that needs a
 * redirect (3-D Secure and friends) leaves Stripe for this page
 * instead. Its only job is to hand the buyer to the SAME completion
 * targets the standard flow uses: members to the app with
 * ?checkout=success, guests to /welcome?session_id= to claim the
 * account the webhook created. Nothing is granted here — the webhook
 * owns access, exactly as everywhere else.
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { readSessionIdentity } from "@/lib/premium-entitlement";

export default function CheckoutReturnClient() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!sessionId) {
        window.location.replace("/");
        return;
      }
      const identity = await readSessionIdentity().catch(() => null);
      if (cancelled) return;
      if (identity && identity.state !== "anonymous" && identity.state !== "unknown") {
        window.location.replace("/?checkout=success");
      } else if (identity && identity.state === "anonymous") {
        window.location.replace(`/welcome?session_id=${encodeURIComponent(sessionId)}`);
      } else {
        // Identity unreadable — /welcome verifies the session itself
        // and routes members onward, so it is the safe common target.
        window.location.replace(`/welcome?session_id=${encodeURIComponent(sessionId)}`);
      }
    })();
    const t = setTimeout(() => {
      if (!cancelled) setStuck(true);
    }, 6000);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [sessionId]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050508] px-4 text-zinc-100">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
        <p className="text-sm text-white/70">Confirming your checkout…</p>
        {stuck && (
          <p className="max-w-sm text-xs leading-relaxed text-white/40">
            Taking longer than usual. Your payment is handled by Stripe and your plan
            activates as soon as it confirms —{" "}
            <a href="/" className="underline underline-offset-2 hover:text-white">
              return to the globe
            </a>{" "}
            and it will be waiting.
          </p>
        )}
      </div>
    </main>
  );
}
