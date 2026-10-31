"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface GiftPreview {
  found: boolean;
  status?: string;
  planDisplayName?: string;
  displayPrice?: string | null;
  recipientEmail?: string;
  periodEnd?: string | null;
  signedIn?: boolean;
  emailMatches?: boolean;
}

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * The redemption flow, driven by GET /api/gift/redeem's preview and
 * POST /api/gift/redeem's decision (the server owns every refusal —
 * this component only explains states in plain language):
 *   no code → explain the link comes from the gift email;
 *   unknown code / unpaid / redeemed / expired → say so, stop;
 *   paid + signed out → send them to sign in or create an account
 *     under the recipient email, with a callback back here;
 *   paid + wrong account → name the address the gift belongs to;
 *   paid + right account → one click, then the success panel.
 */
export default function RedeemClient() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code") ?? "";
  const [preview, setPreview] = useState<GiftPreview | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redeemed, setRedeemed] = useState(false);

  useEffect(() => {
    if (!code) return;
    let alive = true;
    fetch(`/api/gift/redeem?code=${encodeURIComponent(code)}`)
      .then((res) => res.json())
      .then((data: GiftPreview) => {
        if (alive) setPreview(data);
      })
      .catch(() => {
        if (alive) setLoadFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [code]);

  async function redeem() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/gift/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Redemption failed. Please try again.");
      setRedeemed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  const panel = "mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6";
  const muted = "text-base text-white/65 leading-relaxed";

  if (!code) {
    return (
      <div className={panel}>
        <p className={muted}>
          This page needs the link from your gift email — it carries the code
          that identifies your gift. Open that email and tap{" "}
          <strong className="text-white">Redeem your gift</strong>.
        </p>
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className={panel}>
        <p className={muted}>
          We couldn&apos;t load your gift just now. Check your connection and
          refresh the page — your gift is saved and this link keeps working.
        </p>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className={panel}>
        <p className={muted}>Loading your gift…</p>
      </div>
    );
  }

  if (!preview.found) {
    return (
      <div className={panel}>
        <p className={muted}>
          That gift code doesn&apos;t match any gift. Make sure you opened the
          full link from the gift email — if it still doesn&apos;t work, ask
          the sender to check their receipt.
        </p>
      </div>
    );
  }

  if (preview.status === "pending") {
    return (
      <div className={panel}>
        <p className={muted}>
          This gift&apos;s purchase hasn&apos;t finished processing yet. Give
          it a few minutes and open this link again.
        </p>
      </div>
    );
  }

  if (preview.status === "redeemed") {
    return (
      <div className={panel}>
        <p className={muted}>
          This gift has already been redeemed. If that was you, your plan is
          on your account — head to the globe and enjoy.
        </p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-xl bg-[#D4AF37] px-6 py-3 text-sm font-black text-black transition hover:bg-[#e5c558]"
        >
          Open WorldEye
        </Link>
      </div>
    );
  }

  if (preview.status === "expired") {
    return (
      <div className={panel}>
        <p className={muted}>
          This gift&apos;s paid term has ended, so it can no longer be
          redeemed.
        </p>
      </div>
    );
  }

  const through = formatDate(preview.periodEnd);

  if (redeemed) {
    return (
      <div className={panel}>
        <p className={muted}>
          Done — <strong className="text-white">WorldEye {preview.planDisplayName}</strong>{" "}
          is now on your account
          {through ? (
            <>
              {" "}through <strong className="text-white">{through}</strong>
            </>
          ) : null}
          . Nothing will be charged when the term ends.
        </p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-xl bg-[#D4AF37] px-6 py-3 text-sm font-black text-black transition hover:bg-[#e5c558]"
        >
          Open WorldEye
        </Link>
      </div>
    );
  }

  const callback = encodeURIComponent(`/gift/redeem?code=${code}`);

  return (
    <div className={panel}>
      <p className={muted}>
        You&apos;ve been gifted{" "}
        <strong className="text-white">WorldEye {preview.planDisplayName}</strong>
        {through ? (
          <>
            {" "}— one prepaid term running through{" "}
            <strong className="text-white">{through}</strong>
          </>
        ) : null}
        , sent to <strong className="text-white">{preview.recipientEmail}</strong>.
      </p>

      {!preview.signedIn ? (
        <>
          <p className={`mt-4 ${muted}`}>
            To claim it, sign in with that email address — or create a free
            account with it first, then come back to this page.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={`/signin?callbackUrl=${callback}`}
              className="rounded-xl bg-[#D4AF37] px-6 py-3 text-sm font-black text-black transition hover:bg-[#e5c558]"
            >
              Sign in
            </Link>
            <Link
              href={`/signup?callbackUrl=${callback}`}
              className="rounded-xl border border-white/15 px-6 py-3 text-sm font-bold text-white/80 transition hover:border-white/35"
            >
              Create account
            </Link>
          </div>
        </>
      ) : !preview.emailMatches ? (
        <p className={`mt-4 ${muted}`}>
          You&apos;re signed in with a different email address. Sign out and
          sign back in as{" "}
          <strong className="text-white">{preview.recipientEmail}</strong> to
          claim this gift.
        </p>
      ) : (
        <>
          {error && (
            <p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={redeem}
            disabled={busy}
            className="mt-5 rounded-xl bg-[#D4AF37] px-6 py-3 text-sm font-black text-black transition hover:bg-[#e5c558] disabled:cursor-wait disabled:opacity-60"
          >
            {busy ? "Redeeming…" : `Redeem ${preview.planDisplayName}`}
          </button>
          <p className="mt-3 text-xs text-white/45">
            Redeeming puts the rest of this prepaid term on your account —
            it runs through the date above. Gifts don&apos;t auto-renew.
          </p>
        </>
      )}
    </div>
  );
}
