"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { planTierOf } from "@/lib/plan-tier";
import {
  Settings, CreditCard, LogOut, Map as MapIcon, LayoutGrid,
  Tag, Users, Copy, Check, ChevronRight, Gift, BellRing, Video, HelpCircle, Crown,
  BarChart3, Link2,
} from "lucide-react";

type SessionUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  subscriptionStatus?: string;
  planTier?: string;
};

type InviteStatus = {
  joined: boolean;
  invites: number;
  goal: number;
  referralCode?: string;
  referralLink?: string;
};

function initials(name?: string | null, email?: string | null): string {
  const src = (name || email || "?").trim();
  return src.charAt(0).toUpperCase();
}

/**
 * Header account menu, restyled 2026-10-26 to the owner's neon design:
 * a deep-navy panel with a cyan glow border, grouped cards, gold upgrade
 * and invite accents, and a red sign-out card. All data is the signed-in
 * USER's own (session + invite-status API) — nothing is hardcoded.
 *
 * Sizing is deliberately compact (small text, tight rows, no wasted
 * gaps) so the whole menu fits a phone screen with NO internal
 * scrolling; the max-h below is a safety net for very short viewports
 * only. Name/email come from the session, the plan badge from
 * lib/plan-tier, and every row keeps its original destination/action.
 */
export default function HeaderProfileMenu() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [invite, setInvite] = useState<InviteStatus | null>(null);
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => s?.user && setUser(s.user))
      .catch(() => {});
  }, []);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  // Load invite status lazily when the menu opens.
  useEffect(() => {
    if (!open || invite) return;
    fetch("/api/affiliate/invite-status", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setInvite(d))
      .catch(() => {});
  }, [open, invite]);

  async function joinAffiliates() {
    setJoining(true);
    try {
      const res = await fetch("/api/affiliate/join", { method: "POST" });
      if (res.ok) {
        const st = await fetch("/api/affiliate/invite-status", { cache: "no-store" }).then((r) => r.json());
        setInvite(st);
      }
    } finally {
      setJoining(false);
    }
  }

  async function copyLink() {
    if (!invite?.referralLink) return;
    try {
      await navigator.clipboard.writeText(invite.referralLink);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = invite.referralLink;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const pct = invite && invite.goal > 0 ? Math.min(100, (invite.invites / invite.goal) * 100) : 0;

  // Truthful plan badge (lib/plan-tier contract): the tier claim is the
  // effective tier; legacy sessions whose claim is a stale "free" while
  // their own subscription is active are still at least Pro. This badge
  // used to be a hardcoded "PRO" — including for free accounts, the
  // moment this menu started rendering for them.
  const claimedTier = planTierOf({ user });
  const badgeTier =
    user?.subscriptionStatus === "active" && claimedTier === "free" ? "pro" : claimedTier;
  const badgeLabel = badgeTier === "vip" ? "VIP PRO" : badgeTier === "pro" ? "PRO" : "FREE";
  const isFree = badgeTier === "free";

  const card = "rounded-2xl border border-cyan-200/[0.14] bg-white/[0.03] overflow-hidden";
  const rowCls =
    "flex items-center gap-2.5 px-3 py-[7px] text-[13px] text-white/90 hover:bg-white/5 transition";
  const rowIcon = "w-[18px] h-[18px] text-cyan-300/80 shrink-0";
  const rowChevron = <ChevronRight className="w-4 h-4 text-cyan-200/35 ml-auto shrink-0" />;

  return (
    <div ref={ref} className="relative pointer-events-auto">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        className="flex items-center hover:brightness-110 transition"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/profile-icon.png" alt="" className="h-8 w-auto" />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] w-[min(20.5rem,calc(100vw-1rem))] max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain rounded-[1.4rem] border border-cyan-300/35 bg-gradient-to-b from-[#071a2e] to-[#030b16] shadow-[0_0_44px_rgba(0,150,255,0.30)] z-[1300] p-2.5 space-y-2.5">
          {/* User card — the signed-in user's own name, email and plan. */}
          <div className={`${card} flex items-center gap-3 px-3 py-2.5`}>
            <div className="w-11 h-11 rounded-full ring-2 ring-cyan-300/70 bg-gradient-to-b from-slate-300 to-slate-500 text-[#0b1c2c] text-lg font-black flex items-center justify-center overflow-hidden shrink-0">
              {user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt="" className="w-full h-full object-cover" />
              ) : (
                initials(user?.name, user?.email)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-bold truncate">{user?.name || "WorldEye member"}</span>
                <span className={`text-[9px] font-black tracking-[0.12em] px-1.5 py-0.5 rounded shrink-0 ${isFree ? "bg-white/15 text-white/75" : "bg-[#D4AF37] text-black"}`}>{badgeLabel}</span>
              </div>
              <div className="text-xs text-white/50 truncate">{user?.email}</div>
            </div>
          </div>

          {/* Free-plan upgrade card — first thing a free account sees. */}
          {isFree && (
            <Link
              href="/pricing"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-2xl border border-[#D4AF37]/55 bg-gradient-to-b from-[#D4AF37]/[0.14] to-[#D4AF37]/[0.04] px-3 py-2.5 hover:from-[#D4AF37]/[0.20] transition"
            >
              <span className="w-10 h-10 rounded-full border border-[#D4AF37]/70 bg-black/40 flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5 text-[#e8c55a]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-bold text-[#f0d47a]">You&apos;re on the Free plan</span>
                <span className="block mt-0.5 text-[11px] leading-snug text-white/60">
                  Upgrade for the OSINT toolkit, the OI assistant, satellite view, traffic layers and camera recording.
                </span>
              </span>
              <ChevronRight className="w-4 h-4 text-[#e8c55a] shrink-0" />
            </Link>
          )}

          {/* Invite tracker — the user's own referral count and link. */}
          <div className={`${card} px-3 py-2.5`}>
            <Link
              href="/affiliates"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2"
            >
              <Gift className="w-[18px] h-[18px] text-cyan-300 shrink-0" />
              <span className="text-[13px] font-bold text-white/90 flex-1">Invite a friend</span>
              <span className="text-xs font-mono text-white/55">
                {invite ? `${Math.min(invite.invites, invite.goal)}/${invite.goal}` : "–/–"}
              </span>
              <ChevronRight className="w-4 h-4 text-cyan-200/35 shrink-0" />
            </Link>
            <div className="h-[7px] rounded-full bg-white/10 overflow-hidden my-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#e8c55a] to-[#D4AF37] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            {invite?.joined && invite.referralLink ? (
              <button
                onClick={copyLink}
                className="w-full flex items-center gap-2 px-2.5 py-[7px] rounded-lg bg-black/40 border border-white/[0.13] hover:bg-black/60 transition text-left"
              >
                <Link2 className="w-3.5 h-3.5 text-white/45 shrink-0" />
                <span className="flex-1 text-[11px] font-mono text-white/65 truncate">{invite.referralLink}</span>
                {copied ? <Check className="w-4 h-4 text-green-400 shrink-0" /> : <Copy className="w-4 h-4 text-white/55 shrink-0" />}
              </button>
            ) : (
              <button
                onClick={joinAffiliates}
                disabled={joining}
                className="w-full py-[7px] rounded-lg bg-black/40 border border-white/[0.13] text-xs font-semibold text-white/80 hover:bg-black/60 transition disabled:opacity-60"
              >
                {joining ? "Activating…" : "Get my invite link"}
              </button>
            )}
            <Link
              href="/affiliates"
              onClick={() => setOpen(false)}
              className="mt-2 flex items-center gap-2 text-[12.5px] text-cyan-300 hover:text-cyan-200 transition"
            >
              <BarChart3 className="w-4 h-4 shrink-0" /> Track invites &amp; earnings
              <ChevronRight className="w-4 h-4 text-cyan-200/35 ml-auto shrink-0" />
            </Link>
          </div>

          {/* Navigation card */}
          <div className={`${card} py-1 divide-y divide-white/[0.05]`}>
            {([
              { href: "/", icon: MapIcon, label: "Live map" },
              { href: "/dashboard", icon: LayoutGrid, label: "Dashboard" },
              { href: "/dashboard#alerts", icon: BellRing, label: "Camera alerts" },
              { href: "/dashboard#recordings", icon: Video, label: "Recordings" },
              { href: "/vip", icon: Crown, label: "VIP Pro hub", gold: true },
              { href: "/affiliates", icon: Users, label: "Affiliates" },
              { href: "/pricing", icon: Tag, label: "Plans & pricing" },
            ] as { href: string; icon: typeof MapIcon; label: string; gold?: boolean }[]).map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className={rowCls}>
                <l.icon className={l.gold ? "w-[18px] h-[18px] text-[#D4AF37] shrink-0" : rowIcon} /> {l.label}
                {rowChevron}
              </Link>
            ))}
          </div>

          {/* Account card */}
          <div className={`${card} py-1 divide-y divide-white/[0.05]`}>
            <Link href="/settings" onClick={() => setOpen(false)} className={rowCls}>
              <Settings className={rowIcon} /> Account settings {rowChevron}
            </Link>
            <Link href="/settings/subscription" onClick={() => setOpen(false)} className={rowCls}>
              <CreditCard className={rowIcon} /> Manage subscription {rowChevron}
            </Link>
            <Link href="/faq" onClick={() => setOpen(false)} className={rowCls}>
              <HelpCircle className={rowIcon} /> Help &amp; FAQ {rowChevron}
            </Link>
          </div>

          {/* Sign out card */}
          <div className={card}>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full flex items-center gap-2.5 px-3 py-[8px] text-[13px] font-semibold text-red-400 hover:bg-red-400/10 transition"
            >
              <LogOut className="w-[18px] h-[18px] shrink-0" /> Sign out
              <ChevronRight className="w-4 h-4 text-red-400/50 ml-auto shrink-0" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
