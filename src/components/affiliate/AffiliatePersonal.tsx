"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Check, Gift, ArrowRight } from "lucide-react";

type Status = {
  joined: boolean;
  invites: number;
  goal: number;
  referralCode?: string;
  referralLink?: string;
};

/**
 * Rendered at the top of /affiliates for signed-in visitors: their personal
 * referral link, invite progress (n/3) and a shortcut to the dashboard.
 * Renders nothing for anonymous visitors (the generic hero covers them).
 */
export default function AffiliatePersonal() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        const ok = !!s?.user;
        setSignedIn(ok);
        if (ok) {
          fetch("/api/affiliate/invite-status", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => d && setStatus(d))
            .catch(() => {});
        }
      })
      .catch(() => setSignedIn(false));
  }, []);

  async function join() {
    setJoining(true);
    try {
      const res = await fetch("/api/affiliate/join", { method: "POST" });
      if (res.ok) {
        const st = await fetch("/api/affiliate/invite-status", { cache: "no-store" }).then((r) => r.json());
        setStatus(st);
      }
    } finally {
      setJoining(false);
    }
  }

  async function copy() {
    if (!status?.referralLink) return;
    try {
      await navigator.clipboard.writeText(status.referralLink);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = status.referralLink;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!signedIn) return null;

  const pct = status && status.goal > 0 ? Math.min(100, (status.invites / status.goal) * 100) : 0;

  return (
    <section className="rounded-3xl border border-[#D4AF37]/25 bg-gradient-to-b from-[#D4AF37]/[0.07] to-white/[0.02] p-6 md:p-8 relative overflow-hidden">
      <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[420px] h-[160px] rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(ellipse,#D4AF37,transparent)" }} />
      <div className="relative flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex-1">
          <p className="text-xs font-mono tracking-[0.25em] text-[#D4AF37] uppercase mb-2">Your affiliate hub</p>
          <div className="flex items-center gap-2 mb-2">
            <Gift className="w-4 h-4 text-[#D4AF37]" />
            <span className="font-bold text-white">
              Invite a friend — {status ? `${Math.min(status.invites, status.goal)}/${status.goal}` : "…"}
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden max-w-xs mb-4">
            <div className="h-full rounded-full bg-gradient-to-r from-[#e8c55a] to-[#D4AF37] transition-all" style={{ width: `${pct}%` }} />
          </div>
          {status?.joined && status.referralLink ? (
            <button
              onClick={copy}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 transition max-w-full"
            >
              <span className="font-mono text-sm text-cyan-200 truncate">{status.referralLink}</span>
              {copied ? <Check className="w-4 h-4 text-green-400 shrink-0" /> : <Copy className="w-4 h-4 text-white/50 shrink-0" />}
            </button>
          ) : (
            <button
              onClick={join}
              disabled={joining || !status}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition disabled:opacity-60"
            >
              {joining ? "Activating…" : "Activate my invite link — free"}
            </button>
          )}
        </div>
        <Link
          href="/affiliates/dashboard"
          className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-2xl border border-cyan-300/30 text-cyan-200 text-sm font-bold hover:bg-cyan-300/10 transition"
        >
          Open dashboard <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
