"use client";
// Affiliate command deck: earnings from verified subscription sales only.
import { useEffect, useState } from "react";
import {
  StatCard, RankBadge, XpBar, SectionTitle, CopyButton, EmptyState, Pill, fmtCents,
} from "@/components/affiliate/ui";
import { AreaChart } from "@/components/affiliate/charts";

interface Me {
  profile: { referralCode: string; customCode: string | null; status: string; xp: number; payoutEmail: string | null; payoutMethod: string | null };
  rank: { name: string; badge: string; color: string; glow: string; commissionPct: number; tagline: string };
  nextRank: { name: string; minXp: number; commissionPct: number } | null;
  progress: { pct: number; xpInto: number; xpNeeded: number };
  referralLink: string;
}
interface Dash {
  rank: Me["rank"];
  totals: {
    lifetimeCents: number; availableCents: number; pendingCents: number;
    estimatedMonthlyCents: number; activePayingReferrals: number; directReferrals: number;
    convertedReferrals: number; indirectReferrals: number; clicks: number; conversionPct: number;
  };
  series: { date: string; cents: number; clicks: number }[];
  commissions: { id: string; level: number; amountCents: number; currency: string; status: string; availableAt: string; createdAt: string }[];
  payouts: { id: string; amountCents: number; status: string; method: string; requestedAt: string; decidedAt: string | null; note: string | null }[];
  xpEvents: { activity: string; xp: number; createdAt: string }[];
  settings: { holdingPeriodDays: number; minPayoutCents: number };
}

const card = "rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-4 md:p-5";
const input = "w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono outline-none focus:border-cyan-400/60";
const btnPrimary = "px-4 py-2 rounded-xl font-mono text-sm font-bold text-[#04121f] transition-all";
const btnStyle = { background: "linear-gradient(135deg,#38bdf8,#0096FF)", boxShadow: "0 0 20px rgba(0,150,255,.45)" };

async function api(path: string, init?: RequestInit) {
  const r = await fetch(path, init);
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, j };
}

export default function DashboardClient() {
  const [me, setMe] = useState<Me | null>(null);
  const [dash, setDash] = useState<Dash | null>(null);
  const [range, setRange] = useState("30");
  const [notJoined, setNotJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [qr, setQr] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [customCode, setCustomCode] = useState("");
  const [payoutEmail, setPayoutEmail] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("manual");
  const [msg, setMsg] = useState("");

  const loadMe = async () => {
    const { ok, status, j } = await api("/api/affiliate/me");
    if (!ok && status === 404 && j.join) { setNotJoined(true); setLoading(false); return null; }
    if (!ok) { setLoading(false); return null; }
    setMe(j as Me);
    setPayoutEmail((j as Me).profile.payoutEmail ?? "");
    setPayoutMethod((j as Me).profile.payoutMethod ?? "manual");
    return j as Me;
  };
  const loadDash = async (rg = range) => {
    const { ok, j } = await api(`/api/affiliate/dashboard?range=${rg}`);
    if (ok) setDash(j as Dash);
  };

  useEffect(() => {
    (async () => {
      const m = await loadMe();
      if (m) await loadDash();
      setLoading(false);
    })();
  }, []);

  const changeRange = async (rg: string) => { setRange(rg); setLoading(true); await loadDash(rg); setLoading(false); };

  const join = async () => {
    setMsg("Activating…");
    const { ok, j } = await api("/api/affiliate/join", { method: "POST" });
    if (ok) { setNotJoined(false); setMsg(""); await loadMe(); await loadDash(); }
    else setMsg(j.error ?? "Couldn't activate. Try again.");
  };

  const toggleQr = async () => {
    if (showQr) { setShowQr(false); return; }
    const code = me!.profile.customCode ?? me!.profile.referralCode;
    const { ok, j } = await api(`/api/affiliate/qr?code=${code}`);
    if (ok) { setQr(j.qr); setShowQr(true); }
  };

  const saveCustomCode = async () => {
    const { ok, j } = await api("/api/affiliate/custom-code", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: customCode }),
    });
    if (ok) { setMsg(`Referral code updated to /ref/${j.customCode}`); await loadMe(); }
    else setMsg(j.error ?? "Couldn't update code.");
  };

  const requestPayout = async () => {
    if (!confirm(`Request payout of ${fmtCents(dash!.totals.availableCents)}?`)) return;
    const { ok, j } = await api("/api/affiliate/payouts", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ payoutEmail, payoutMethod }),
    });
    if (ok) { setMsg(`Payout requested: ${fmtCents(j.payout.amountCents)}. An admin will review it.`); await loadDash(); }
    else setMsg(j.error ?? "Payout request failed.");
  };

  if (loading && !me) return <div className="text-slate-400 font-mono text-sm">Establishing uplink…</div>;

  if (notJoined) {
    return (
      <div className="max-w-2xl mx-auto text-center py-10">
        <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase mb-3">WorldEye Affiliates</div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Activate your free<br />affiliate command deck</h1>
        <div className="grid sm:grid-cols-3 gap-3 my-8 text-left">
          {[
            ["FREE FOREVER", "No fees, no purchase required. Open to anyone eligible."],
            ["15–30% RECURRING", "Earn on every billing cycle of referrals — not just the first payment."],
            ["3-LEVEL NETWORK", "Plus 5% / 2% overrides when your recruits drive real subscriptions."],
          ].map(([t, b]) => (
            <div key={t} className={card}>
              <div className="font-mono font-bold text-cyan-300 text-sm mb-1">{t}</div>
              <div className="text-xs text-slate-400">{b}</div>
            </div>
          ))}
        </div>
        <button onClick={join} className={btnPrimary} style={btnStyle}>Become an Affiliate — Free</button>
        {msg && <div className="mt-3 text-sm text-slate-400">{msg}</div>}
        <div className="mt-6 text-xs text-slate-500 max-w-md mx-auto">
          Commissions are paid only on legitimate paid subscriptions — never for recruitment alone, and income is never guaranteed.
        </div>
      </div>
    );
  }

  if (!me || !dash) return <EmptyState title="Couldn't load dashboard" body="Refresh the page to try again." />;

  const t = dash.totals;
  const link = me.referralLink;
  const enc = encodeURIComponent(link);
  const shareText = encodeURIComponent("Watch the planet live — 36,000+ cameras, flights, satellites. Free to explore:");
  const shares = [
    ["X", `https://twitter.com/intent/tweet?text=${shareText}&url=${enc}`],
    ["Facebook", `https://www.facebook.com/sharer/sharer.php?u=${enc}`],
    ["Telegram", `https://t.me/share/url?url=${enc}&text=${shareText}`],
    ["WhatsApp", `https://wa.me/?text=${shareText}%20${enc}`],
    ["Email", `mailto:?subject=${encodeURIComponent("WorldEye — see the planet live")}&body=${shareText}%20${enc}`],
  ];

  return (
    <div className="space-y-6">
      {me.profile.status !== "active" && (
        <div className={card + " border-amber-400/40"}>
          <div className="text-amber-300 font-bold">Account status: {me.profile.status}</div>
          <div className="text-sm text-slate-400">Your affiliate account is under review. Commissions are paused until it's reactivated.</div>
        </div>
      )}
      {msg && <div className={card + " text-sm text-cyan-200"}>{msg}</div>}

      {/* Referral link bar */}
      <div className={card}>
        <SectionTitle kicker="Your weapon" title="Referral link" />
        <div className="flex flex-col md:flex-row gap-2">
          <input className={input} readOnly value={link} onFocus={(e) => e.target.select()} />
          <div className="flex gap-2">
            <CopyButton text={link} />
            <button onClick={toggleQr} className="px-4 py-2 rounded-xl font-mono text-sm border border-white/15 text-slate-200 hover:border-cyan-400/60">QR</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {shares.map(([n, u]) => (
            <a key={n} href={u} target="_blank" rel="noopener" className="px-3 py-1.5 rounded-lg text-xs font-mono border border-white/10 text-slate-300 hover:text-white hover:border-cyan-400/50">{n}</a>
          ))}
        </div>
        {showQr && qr && (
          <div className="mt-4 flex items-center gap-4">
            <img src={qr} alt="Referral QR" className="w-36 h-36 rounded-xl bg-white p-2" />
            <a href={qr} download="worldeye-qr.png" className="text-sm text-cyan-300 hover:text-cyan-200 font-mono">Download QR</a>
          </div>
        )}
        <div className="mt-4 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <span className="text-xs text-slate-400 font-mono">Custom code:</span>
          <input className={input + " !w-48"} placeholder={me.profile.customCode ?? me.profile.referralCode}
            value={customCode} onChange={(e) => setCustomCode(e.target.value)} />
          <button onClick={saveCustomCode} className="px-3 py-2 rounded-xl text-xs font-mono border border-white/15 text-slate-200 hover:border-cyan-400/60">Claim</button>
        </div>
      </div>

      {/* Rank */}
      <div className={card}>
        <div className="flex flex-col md:flex-row md:items-center gap-5 justify-between">
          <RankBadge name={me.rank.name} badge={me.rank.badge} color={me.rank.color} glow={me.rank.glow} size="lg" />
          <div className="flex-1 max-w-md">
            <div className="text-xs text-slate-400 mb-1 italic">"{me.rank.tagline}"</div>
            {me.nextRank ? (
              <>
                <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                  <span>{me.profile.xp.toLocaleString()} XP</span>
                  <span>{me.progress.xpNeeded.toLocaleString()} XP to {me.nextRank.name}</span>
                </div>
                <XpBar pct={me.progress.pct} color={me.rank.color} height={12} />
              </>
            ) : (
              <Pill color="#fbbf24">MAX RANK — {me.rank.commissionPct}% commission</Pill>
            )}
          </div>
          <div className="text-center">
            <div className="text-[10px] font-mono tracking-[0.2em] text-slate-400 uppercase">Direct rate</div>
            <div className="text-3xl font-bold font-mono" style={{ color: me.rank.color }}>{me.rank.commissionPct}%</div>
            <div className="text-[10px] text-slate-500">recurring</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Lifetime earnings" value={fmtCents(t.lifetimeCents)} />
        <StatCard label="Available balance" value={fmtCents(t.availableCents)} sub="ready to withdraw" accent="#34d399" />
        <StatCard label="Pending" value={fmtCents(t.pendingCents)} sub={`${dash.settings.holdingPeriodDays}-day hold`} accent="#fbbf24" />
        <StatCard label="Est. monthly recurring" value={fmtCents(t.estimatedMonthlyCents)} sub="based on last 90 days" accent="#22d3ee" />
        <StatCard label="Active paying referrals" value={String(t.activePayingReferrals)} />
        <StatCard label="Direct referrals" value={String(t.directReferrals)} sub={`${t.convertedReferrals} converted`} />
        <StatCard label="Link clicks" value={t.clicks.toLocaleString()} sub={`${t.conversionPct}% conversion`} />
        <StatCard label="Network affiliates" value={String(t.indirectReferrals)} sub="recruited by you" accent="#c084fc" />
      </div>

      {/* Chart */}
      <div className={card}>
        <div className="flex items-center gap-3 mb-4">
          <img src="/affiliate-icons/earnings.png" alt="Earnings" className="w-11 h-11 object-contain shrink-0"
            style={{ filter: "drop-shadow(0 0 14px rgba(56,189,248,.45))" }} />
          <div className="flex-1">
            <SectionTitle kicker="Performance" title="Earnings"
          right={<div className="flex gap-1">{["7", "30", "90", "all"].map((r) => (
            <button key={r} onClick={() => changeRange(r)}
              className={`px-3 py-1 rounded-lg text-xs font-mono border ${range === r ? "border-cyan-400/60 text-cyan-200 bg-cyan-400/10" : "border-white/10 text-slate-400"}`}>
              {r === "all" ? "ALL" : `${r}D`}
            </button>
          ))}</div>} />
          </div>
        </div>
        {dash.series.some((s) => s.cents > 0) ? (
          <AreaChart data={dash.series} />
        ) : (
          <EmptyState title="No earnings yet" body="Your earnings chart will light up when referred subscriptions start billing. Share your link to get the first signal." />
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Commissions */}
        <div className={card}>
          <SectionTitle kicker="Ledger" title="Commissions" />
          {dash.commissions.length === 0 && <div className="text-sm text-slate-500">No commissions yet — they appear here after verified subscription payments.</div>}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {dash.commissions.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 py-2 border-b border-white/5 text-sm">
                <div className="flex items-center gap-2">
                  <Pill color={c.level === 1 ? "#38bdf8" : c.level === 2 ? "#c084fc" : "#fbbf24"}>L{c.level}</Pill>
                  <span className="text-slate-400 text-xs font-mono">{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Pill color={c.status === "reversed" ? "#f87171" : c.status === "paid" ? "#34d399" : c.status === "available" ? "#34d399" : "#38bdf8"}>{c.status}</Pill>
                  <span className="font-mono font-bold text-white">{fmtCents(c.amountCents)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-slate-500 mt-3">Commissions post only after Stripe confirms payment. Refunds and chargebacks reverse them automatically.</div>
        </div>

        {/* Payouts */}
        <div className={card}>
          <SectionTitle kicker="Treasury" title="Payouts" />
          <div className="text-sm text-slate-400 mb-3">
            Available: <span className="font-mono font-bold text-emerald-300">{fmtCents(t.availableCents)}</span>
            <span className="text-slate-500"> · minimum {fmtCents(dash.settings.minPayoutCents)}</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input className={input} placeholder="Payout email (PayPal)" value={payoutEmail} onChange={(e) => setPayoutEmail(e.target.value)} />
            <select className={input + " sm:!w-40"} value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value)}>
              <option value="manual">Manual</option>
              <option value="paypal">PayPal</option>
              <option value="stripe_connect">Stripe Connect</option>
            </select>
            <button onClick={requestPayout} className={btnPrimary + " whitespace-nowrap"} style={btnStyle}
              disabled={t.availableCents < dash.settings.minPayoutCents}>Request payout</button>
          </div>
          {dash.payouts.length === 0 && <div className="text-sm text-slate-500">No payout requests yet.</div>}
          <div className="space-y-2">
            {dash.payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm py-2 border-b border-white/5">
                <span className="font-mono text-white">{fmtCents(p.amountCents)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-mono">{new Date(p.requestedAt).toLocaleDateString()}</span>
                  <Pill color={p.status === "paid" ? "#34d399" : p.status === "rejected" ? "#f87171" : "#fbbf24"}>{p.status}</Pill>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* XP feed */}
      <div className={card}>
        <SectionTitle kicker="Progression" title="XP activity" right={<span className="font-mono text-cyan-300 font-bold">{me.profile.xp.toLocaleString()} XP</span>} />
        {dash.xpEvents.length === 0 && <div className="text-sm text-slate-500">No XP events yet.</div>}
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {dash.xpEvents.map((e, i) => (
            <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-white/5">
              <span className="text-slate-300 font-mono text-xs">{prettyActivity(e.activity)}</span>
              <span className="font-mono font-bold text-cyan-300">+{e.xp} XP</span>
            </div>
          ))}
        </div>
        <div className="text-[11px] text-slate-500 mt-3">XP unlocks ranks and has no cash value. Anti-abuse: repeat or fake actions can't award twice.</div>
      </div>
    </div>
  );
}

function prettyActivity(a: string): string {
  if (a.startsWith("challenge:")) return `Mission completed — ${a.slice(10)}`;
  const map: Record<string, string> = {
    join: "Joined the affiliate program",
    onboarding_complete: "Completed onboarding",
    account_verified: "Verified account",
    first_verified_visit: "First verified referral visit",
    first_paying_referral: "First paying referral",
    paying_referral: "Paying referral",
    bonus_5_paying: "Milestone: 5 paying referrals",
    bonus_10_paying: "Milestone: 10 paying referrals",
    admin_award: "Admin XP award",
    admin_revoke: "Admin XP adjustment",
  };
  return map[a] ?? a.replace(/_/g, " ");
}
