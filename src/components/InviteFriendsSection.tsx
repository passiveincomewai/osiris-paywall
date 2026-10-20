"use client";

/**
 * The invite-a-friend section of the camera-limit popup: "Invite a
 * friend — get 15 more camera checks." The honest mechanics, stated
 * on the section itself: the bonus lands when a friend JOINS WorldEye
 * through the link (their signup creates a referral attribution —
 * lib/camera-bonus pays the inviter then), never for merely sending
 * an invite, and it is one grant per friend who joins.
 *
 * The link is the affiliate program's own /ref/[code] link — the same
 * attribution machinery as everything else (30-day cookie, server-side
 * link at signup). A user without an affiliate profile provisions one
 * through the program's own join endpoint; nothing parallel is built.
 * Signed-out visitors get a sign-in prompt instead: the bonus attaches
 * to an account, so there is nothing to hand them yet.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, Share2, UserPlus } from "lucide-react";
import { INVITE_CAMERA_BONUS } from "@/lib/cameraGate";

export const INVITE_HEADING = `Invite a friend — get ${INVITE_CAMERA_BONUS} more camera checks`;
export const INVITE_CONDITION =
  "The bonus lands when a friend joins WorldEye with your link — not just for sending it.";

export function InviteBalanceLine({ balance }: { balance: number }) {
  if (balance <= 0) return null;
  return (
    <p className="text-[11px] font-semibold text-emerald-300">
      You have {balance} bonus camera {balance === 1 ? "check" : "checks"} banked.
    </p>
  );
}

export function InviteSignInPrompt() {
  return (
    <div>
      <p className="text-xs leading-snug text-white/50">
        The bonus attaches to your account, so you need to be signed in to get your link.
      </p>
      <Link
        href="/signin"
        className="mt-2.5 flex min-h-[44px] w-full items-center justify-center rounded-xl border border-[#D4AF37]/50 px-4 text-sm font-bold text-[#D4AF37] transition hover:bg-[#D4AF37]/10"
      >
        Sign in to get your invite link
      </Link>
    </div>
  );
}

export function InviteLinkBlock({
  link,
  balance,
}: {
  link: string;
  balance: number;
}) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the link text stays selectable below */
    }
  }, [link]);

  const share = useCallback(async () => {
    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await navigator.share({
          title: "WorldEye",
          text: "Watch the world live — flights, cameras and satellites on one globe.",
          url: link,
        });
        return;
      }
    } catch {
      /* user dismissed the share sheet, or share is unsupported */
    }
    void copy();
  }, [link, copy]);

  return (
    <div>
      <InviteBalanceLine balance={balance} />
      <p className="mt-1.5 break-all rounded-lg border border-white/10 bg-black/40 px-2.5 py-2 font-mono text-[11px] leading-snug text-white/70">
        {link}
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={share}
          className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#D4AF37] px-3 text-sm font-bold text-black transition hover:brightness-110 active:brightness-95"
        >
          <Share2 className="w-4 h-4" /> Share
        </button>
        <button
          type="button"
          onClick={copy}
          className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 px-3 text-sm font-semibold text-white/75 transition hover:bg-white/[0.06]"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}

type InviteState =
  | { kind: "loading" }
  | { kind: "signedOut" }
  | { kind: "ready"; link: string | null; balance: number };

export default function InviteFriendsSection() {
  const [state, setState] = useState<InviteState>({ kind: "loading" });
  const [provisioning, setProvisioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/cameras/invite");
      if (r.status === 401) {
        setState({ kind: "signedOut" });
        return;
      }
      const j = await r.json().catch(() => null);
      if (r.ok && j) {
        setState({ kind: "ready", link: j.link ?? null, balance: j.balance ?? 0 });
      }
    } catch {
      /* leave the current state — the section just stays quiet */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const provision = useCallback(async () => {
    setProvisioning(true);
    setError(null);
    try {
      // The affiliate program's own provisioning path — joining is
      // what creates the referral code the invite link needs.
      const r = await fetch("/api/affiliate/join", { method: "POST" });
      if (!r.ok) throw new Error("join failed");
      await load();
    } catch {
      setError("Couldn't create your link just now — try again in a moment.");
    } finally {
      setProvisioning(false);
    }
  }, [load]);

  return (
    <section
      data-invite-friends
      className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left"
    >
      <h3 className="flex items-center gap-2 text-[13px] font-bold tracking-tight text-white">
        <UserPlus className="w-4 h-4 shrink-0 text-[#D4AF37]" />
        {INVITE_HEADING}
      </h3>
      <p className="mt-1 text-[11px] leading-snug text-white/40">{INVITE_CONDITION}</p>

      <div className="mt-3">
        {state.kind === "loading" && (
          <p className="text-xs text-white/35">Loading your invite link…</p>
        )}
        {state.kind === "signedOut" && <InviteSignInPrompt />}
        {state.kind === "ready" && state.link && (
          <InviteLinkBlock link={state.link} balance={state.balance} />
        )}
        {state.kind === "ready" && !state.link && (
          <div>
            <InviteBalanceLine balance={state.balance} />
            <button
              type="button"
              onClick={provision}
              disabled={provisioning}
              className="mt-1.5 flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[#D4AF37] px-4 text-sm font-bold text-black transition hover:brightness-110 active:brightness-95 disabled:opacity-60"
            >
              {provisioning ? "Creating your link…" : "Get my invite link"}
            </button>
            {error && <p className="mt-2 text-[11px] leading-snug text-red-400">{error}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
