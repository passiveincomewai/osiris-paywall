"use client";

// ── Past-due banner ───────────────────────────────────────────────────
// Self-fetching client banner (the SetNamePrompt pattern): mounted on
// the dashboard and the account/billing pages, it asks
// /api/billing/past-due for the signed-in user's state and renders only
// when their subscription is past_due. The CTA is the open invoice's
// Stripe-hosted page — the same pay/update link the recovery email
// carries (lib/billing/dunning.ts) — or, when no invoice resolved, the
// billing page.
//
// Dismissal is PER INVOICE: the dismissed banner's token (invoice id,
// or "none" for the generic form) is stored in localStorage; a later
// failed invoice has a different token and shows the banner again. The
// visibility rule is the pure shouldShowPastDueBanner.

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";
import {
  PAST_DUE_BANNER_STORAGE_KEY,
  pastDueBannerToken,
  shouldShowPastDueBanner,
} from "@/lib/billing/past-due-banner";

interface BannerState {
  status: string;
  invoiceId: string | null;
  hostedInvoiceUrl: string | null;
  amountLabel: string | null;
}

interface PastDueResponse {
  pastDue: boolean;
  invoiceId?: string | null;
  hostedInvoiceUrl?: string | null;
  amountLabel?: string | null;
}

export default function PastDueBanner({
  containerClassName = "",
}: {
  /** Optional wrapper (width/padding) for mounts outside a container. */
  containerClassName?: string;
}) {
  const [state, setState] = useState<BannerState | null>(null);
  const [dismissedToken, setDismissedToken] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let live = true;
    try {
      setDismissedToken(window.localStorage.getItem(PAST_DUE_BANNER_STORAGE_KEY));
    } catch {
      /* storage unavailable — treat as never dismissed */
    }
    (async () => {
      try {
        const r = await fetch("/api/billing/past-due", { cache: "no-store" });
        if (!r.ok) return; // signed out — nothing to show
        const d = (await r.json()) as PastDueResponse;
        if (live && d.pastDue) {
          setState({
            status: "past_due",
            invoiceId: d.invoiceId ?? null,
            hostedInvoiceUrl: d.hostedInvoiceUrl ?? null,
            amountLabel: d.amountLabel ?? null,
          });
        }
      } catch {
        /* best-effort — the recovery email still reaches them */
      } finally {
        if (live) setLoaded(true);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  if (!loaded || !state) return null;
  if (
    !shouldShowPastDueBanner({
      status: state.status,
      invoiceId: state.invoiceId,
      dismissedToken,
    })
  ) {
    return null;
  }

  const dismiss = () => {
    const token = pastDueBannerToken(state.invoiceId);
    try {
      window.localStorage.setItem(PAST_DUE_BANNER_STORAGE_KEY, token);
    } catch {
      /* ignore — hiding for this mount still applies */
    }
    setDismissedToken(token);
  };

  const banner = (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/[0.08] px-4 py-3.5"
    >
      <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-amber-200">
          Your last payment didn&rsquo;t go through
          {state.amountLabel ? ` — ${state.amountLabel} is past due` : ""}
        </p>
        <p className="text-sm text-amber-100/70 mt-0.5">
          Paid features are locked until the payment is fixed. Update your
          payment method to restore full access.
        </p>
        {state.hostedInvoiceUrl ? (
          <a
            href={state.hostedInvoiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2.5 rounded-lg bg-[#D4AF37] px-3.5 py-1.5 text-sm font-bold text-black hover:bg-[#e8c55a] transition-colors"
          >
            Update payment &amp; pay now
          </a>
        ) : (
          <Link
            href="/settings/subscription"
            className="inline-block mt-2.5 rounded-lg bg-[#D4AF37] px-3.5 py-1.5 text-sm font-bold text-black hover:bg-[#e8c55a] transition-colors"
          >
            Review your billing
          </Link>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss payment reminder"
        className="shrink-0 rounded-md p-1 text-amber-200/60 hover:text-amber-100 hover:bg-white/5 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );

  return containerClassName ? (
    <div className={containerClassName}>{banner}</div>
  ) : (
    banner
  );
}
