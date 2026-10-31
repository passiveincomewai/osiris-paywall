"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Link2, Share2 } from "lucide-react";
import {
  claimThisDeviceShareIdentity,
  ensureShareCode,
  readCachedShareCode,
  replaceThisDeviceShareIdentity,
  shareUrl,
} from "@/lib/share/client";
import { buildPersonalShareUrl } from "@/lib/share/links";

/**
 * "Your share link" — for EVERYONE, signed in or not.
 *
 * Signed in: the link carries their affiliate code (the same link
 * the account surfaces have always shown). Signed out: the link
 * carries this device's anonymous code — created on demand, never
 * at first render — and the block explains the one honest caveat:
 * the code belongs to this device until an account claims it, and
 * signups through it count for the claimer from the moment it is
 * connected. A signed-in visitor whose device holds an unclaimed
 * anonymous link gets the connect action right here.
 */
export default function ShareLinkBlock({ compact = false }: { compact?: boolean }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [accountCode, setAccountCode] = useState<string | null>(null);
  const [deviceCode, setDeviceCode] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimNote, setClaimNote] = useState<string | null>(null);
  const [claimBlocked, setClaimBlocked] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const s = await fetch("/api/auth/session", { cache: "no-store" });
      const session = await s.json().catch(() => null);
      const isIn = !!session?.user;
      setSignedIn(isIn);
      if (isIn) {
        const r = await fetch("/api/share/code", { cache: "no-store" });
        const data = await r.json().catch(() => null);
        setAccountCode(typeof data?.code === "string" && data.code ? data.code : null);
      } else {
        setAccountCode(null);
      }
    } catch {
      setSignedIn(false);
    }
    setDeviceCode(readCachedShareCode());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const code = accountCode ?? deviceCode;
  const link = code ? buildPersonalShareUrl(code) : null;
  // The connect action matters only when this device has an anon
  // link that is not already the account's own code.
  const canClaim = signedIn && deviceCode && deviceCode !== accountCode;

  async function createLink() {
    setCreating(true);
    try {
      const minted = await ensureShareCode();
      if (minted) setDeviceCode(minted);
    } finally {
      setCreating(false);
    }
  }

  async function claim() {
    setClaiming(true);
    setClaimNote(null);
    setClaimBlocked(false);
    try {
      const res = await claimThisDeviceShareIdentity();
      if (res?.status === "claimed" || res?.status === "already-claimed") {
        setClaimNote("Connected — this link is now permanently yours.");
        await refresh();
      } else if (res?.status === "claimed-by-other") {
        // First-claim-wins is permanent: this device's link belongs
        // to a different account and can never be moved. Say so
        // plainly and offer the one remedy that exists (a fresh
        // link for this device) instead of a dead-end retry.
        setClaimBlocked(true);
        setClaimNote("This device's link is already connected to another account, so it can't be moved to yours.");
      } else {
        setClaimNote("Couldn't connect the link right now — try again in a moment.");
      }
    } finally {
      setClaiming(false);
    }
  }

  async function replaceAndClaim() {
    setReplacing(true);
    try {
      const fresh = await replaceThisDeviceShareIdentity();
      if (!fresh) {
        setClaimNote("Couldn't create a new link right now — try again in a moment.");
        return;
      }
      const res = await claimThisDeviceShareIdentity();
      if (res?.status === "claimed" || res?.status === "already-claimed") {
        setClaimBlocked(false);
        setClaimNote("Connected — your new link is now permanently yours.");
      } else {
        setClaimNote("Your new link is ready — tap Connect to finish connecting it to your account.");
      }
      await refresh();
    } finally {
      setReplacing(false);
    }
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function nativeShare() {
    if (!link) return;
    await shareUrl(link, "WorldEye — live global map", "Watch the world live on WorldEye");
  }

  if (signedIn === null) return null;

  return (
    <section
      aria-label="Your share link"
      className={
        compact
          ? "rounded-xl border border-white/10 bg-white/[0.03] p-3"
          : "rounded-3xl border border-[#D4AF37]/25 bg-gradient-to-b from-[#D4AF37]/[0.07] to-white/[0.02] p-6 md:p-8"
      }
    >
      <div className="flex items-center gap-2 mb-2">
        <Link2 className="w-4 h-4 text-[#D4AF37]" />
        <h3 className={`font-bold text-white ${compact ? "text-sm" : "text-lg"}`}>Your share link</h3>
      </div>

      {link ? (
        <>
          <div className="flex items-center gap-2">
            <span className="flex-1 min-w-0 text-[11px] font-mono text-white/60 truncate rounded-md bg-black/30 border border-white/10 px-2.5 py-2">
              {link}
            </span>
            <button
              type="button"
              onClick={copy}
              className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-2 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono tracking-wider text-white/80 hover:bg-white/10 transition-all"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? "COPIED" : "COPY"}
            </button>
            <button
              type="button"
              onClick={nativeShare}
              aria-label="Share your link"
              className="shrink-0 inline-flex items-center px-2.5 py-2 rounded-md bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="mt-2.5 text-[11px] leading-relaxed text-white/45">
            {accountCode
              ? "Anyone who visits or signs up through this link counts toward your invites."
              : signedIn
                ? "This link is tied to this device for now — connect it below and signups through it count for you once it's connected."
                : "This link is tied to this device for now. Create a free account and connect it — signups through it count for you once it's connected."}
          </p>
          {canClaim && (
            <div className="mt-3">
              <button
                type="button"
                onClick={claim}
                disabled={claiming}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[11px] font-semibold text-[#D4AF37] hover:bg-[#D4AF37]/25 transition-all disabled:opacity-50"
              >
                {claiming ? "CONNECTING…" : "Connect this device's link to my account"}
              </button>
            </div>
          )}
          {claimNote && <p className="mt-2 text-[11px] text-white/55">{claimNote}</p>}
          {claimBlocked && canClaim && (
            <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-[11px] leading-relaxed text-white/55">
                You can start fresh instead: get a new link for this device and connect it to
                this account. The old link keeps counting for the other account.
              </p>
              <button
                type="button"
                onClick={replaceAndClaim}
                disabled={replacing || claiming}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-white/5 border border-white/15 text-[11px] font-semibold text-white/85 hover:bg-white/10 transition-all disabled:opacity-50"
              >
                {replacing ? "CREATING…" : "Get a new link for this device"}
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="text-[11px] leading-relaxed text-white/45 mb-3">
            Get a personal link like the affiliate link — share cameras, storms, fires, flights and
            more, and signups through your link count as your invites.
          </p>
          <button
            type="button"
            onClick={createLink}
            disabled={creating}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[11px] font-semibold text-[#D4AF37] hover:bg-[#D4AF37]/25 transition-all disabled:opacity-50"
          >
            <Link2 className="w-3.5 h-3.5" />
            {creating ? "CREATING…" : "Create my share link"}
          </button>
        </>
      )}
    </section>
  );
}
