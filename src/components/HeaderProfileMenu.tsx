"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  User, Settings, CreditCard, LogOut, Map as MapIcon, LayoutDashboard,
  Tag, Users, Copy, Check, ChevronRight, Gift,
} from "lucide-react";

type SessionUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  subscriptionStatus?: string;
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

  return (
    <div ref={ref} className="relative pointer-events-auto">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        className="w-8 h-8 rounded-full bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-black flex items-center justify-center shadow-[0_0_12px_rgba(212,175,55,0.4)] hover:brightness-110 transition"
      >
        {initials(user?.name, user?.email)}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] w-72 rounded-2xl border border-white/10 bg-[#0a0e17]/95 backdrop-blur-xl shadow-2xl overflow-hidden z-[1300]">
          {/* User header */}
          <div className="px-4 pt-4 pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-black flex items-center justify-center">
                {initials(user?.name, user?.email)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold truncate">{user?.name || "WorldEye member"}</span>
                  <span className="text-[9px] font-black tracking-[0.12em] px-1.5 py-0.5 rounded bg-[#D4AF37] text-black">PRO</span>
                </div>
                <div className="text-xs text-white/45 truncate">{user?.email}</div>
              </div>
            </div>
          </div>

          {/* Invite tracker */}
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 text-xs font-bold text-white/80">
                <Gift className="w-3.5 h-3.5 text-[#D4AF37]" /> Invite a friend
              </span>
              <span className="text-xs font-mono text-white/50">
                {invite ? `${Math.min(invite.invites, invite.goal)}/${invite.goal}` : "–/–"}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#e8c55a] to-[#D4AF37] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            {invite?.joined && invite.referralLink ? (
              <button
                onClick={copyLink}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition text-left"
              >
                <span className="text-[11px] font-mono text-white/60 truncate">{invite.referralLink}</span>
                {copied ? <Check className="w-3.5 h-3.5 text-green-400 shrink-0" /> : <Copy className="w-3.5 h-3.5 text-white/50 shrink-0" />}
              </button>
            ) : (
              <button
                onClick={joinAffiliates}
                disabled={joining}
                className="w-full py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-white/75 hover:bg-white/10 transition disabled:opacity-60"
              >
                {joining ? "Activating…" : "Get my invite link"}
              </button>
            )}
            <Link
              href="/affiliates"
              onClick={() => setOpen(false)}
              className="mt-1.5 flex items-center justify-between text-[11px] text-[#00E5FF] hover:underline"
            >
              Track invites & earnings <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Navigation */}
          <div className="py-1.5 border-b border-white/10">
            {[
              { href: "/", icon: MapIcon, label: "Live map" },
              { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
              { href: "/affiliates", icon: Users, label: "Affiliates" },
              { href: "/pricing", icon: Tag, label: "Plans & pricing" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-white/75 hover:bg-white/5 hover:text-white transition"
              >
                <l.icon className="w-4 h-4 text-white/40" /> {l.label}
              </Link>
            ))}
          </div>

          {/* Account controls */}
          <div className="py-1.5">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-white/75 hover:bg-white/5 hover:text-white transition"
            >
              <Settings className="w-4 h-4 text-white/40" /> Account settings
            </Link>
            <Link
              href="/settings/subscription"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-white/75 hover:bg-white/5 hover:text-white transition"
            >
              <CreditCard className="w-4 h-4 text-white/40" />
              Manage subscription
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-white/75 hover:bg-white/5 hover:text-white transition"
            >
              <LogOut className="w-4 h-4 text-white/40" /> Sign out
            </button>
          </div>

          <div className="px-4 py-2 border-t border-white/10 flex items-center gap-1.5 text-[10px] text-white/30">
            <User className="w-3 h-3" /> Signed in as {user?.email ?? "…"}
          </div>
        </div>
      )}
    </div>
  );
}
