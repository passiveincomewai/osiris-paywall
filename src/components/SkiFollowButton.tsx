"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import CheckoutSheet from "@/components/CheckoutSheet";

/**
 * Follow / Following toggle for one resort, backed by /api/ski/follows.
 *
 * State comes from the API itself, so the button can never disagree
 * with the server gate:
 *   - 200 → signed-in Powder Pass member: show Follow/Following and
 *     toggle via POST/DELETE (both idempotent server-side).
 *   - 401 → anonymous: the button links to sign-in.
 *   - 403 → signed in without ski access: the button opens the same
 *     Powder Pass CheckoutSheet the PowderPassPromo CTA opens, so a
 *     non-member is sold the pass in place rather than hitting a wall.
 * While the first fetch is in flight it renders a disabled placeholder
 * button (also its server-rendered markup).
 */
export default function SkiFollowButton({
  resortSlug,
  resortName,
}: {
  resortSlug: string;
  resortName: string;
}) {
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "anon" }
    | { kind: "nonmember" }
    | { kind: "member"; following: boolean }
  >({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ski/follows")
      .then(async r => {
        if (cancelled) return;
        if (r.status === 401) return setState({ kind: "anon" });
        if (r.status === 403) return setState({ kind: "nonmember" });
        if (!r.ok) return setState({ kind: "anon" });
        const data = (await r.json()) as { follows?: string[] };
        if (!cancelled) {
          setState({
            kind: "member",
            following: Array.isArray(data.follows) && data.follows.includes(resortSlug),
          });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "anon" });
      });
    return () => {
      cancelled = true;
    };
  }, [resortSlug]);

  const toggle = useCallback(async () => {
    if (state.kind !== "member" || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/ski/follows", {
        method: state.following ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resortSlug }),
      });
      if (res.ok) {
        setState({ kind: "member", following: !state.following });
      } else if (res.status === 401) {
        setState({ kind: "anon" });
      } else if (res.status === 403) {
        setState({ kind: "nonmember" });
      }
    } catch {
      /* leave the state as-is — the next page load re-reads truth */
    } finally {
      setBusy(false);
    }
  }, [state, busy, resortSlug]);

  const base =
    "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition";

  if (state.kind === "member" && state.following) {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed="true"
        className={`${base} border border-[#D4AF37]/50 bg-[#D4AF37]/10 text-[#e8c55a] hover:bg-[#D4AF37]/[0.16] disabled:opacity-60`}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookmarkCheck className="w-4 h-4" />}
        Following {resortName}
      </button>
    );
  }

  if (state.kind === "member") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed="false"
        className={`${base} bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black hover:brightness-110 disabled:opacity-60`}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bookmark className="w-4 h-4" />}
        Follow {resortName}
      </button>
    );
  }

  if (state.kind === "nonmember") {
    return (
      <>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className={`${base} bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black hover:brightness-110`}
        >
          <Bookmark className="w-4 h-4" />
          Follow {resortName} — with Powder Pass
        </button>
        <CheckoutSheet
          plan={sheetOpen ? "ski" : null}
          onClose={() => setSheetOpen(false)}
        />
      </>
    );
  }

  if (state.kind === "anon") {
    return (
      <Link href="/signin" className={`${base} border border-white/15 text-white/85 hover:bg-white/5`}>
        <Bookmark className="w-4 h-4" />
        Sign in to follow {resortName}
      </Link>
    );
  }

  return (
    <button type="button" disabled className={`${base} border border-white/15 text-white/50`}>
      <Loader2 className="w-4 h-4 animate-spin" />
      Follow {resortName}
    </button>
  );
}
