"use client";
// Affiliate command deck: earnings from verified subscription sales only.
import { useEffect, useState } from "react";
import {
  StatCard, RankBadge, XpBar, SectionTitle, CopyButton, EmptyState, Pill, fmtCents,
} from "@/components/affiliate/ui";
import { RankArt } from "@/components/affiliate/graphics";
import BadgesStrip from "./BadgesStrip";
import {
  InsightsSection, NotificationsPanel, TrackingLinksPanel, DirectorCard, HelpPanel,
  type InsightsData,
} from "./SuitePanels";

export interface Me {
  profile: { referralCode: string; customCode: string | null; status: string; xp: number; payoutEmail: string | null; payoutMethod: string | null; venmoHandle?: string | null; payoutThresholdCents?: number | null; directorEnabled?: boolean };
  rank: { name: string; badge: string; color: string; glow: string; commissionPct: number; discountPct?: number; tagline: string };
  nextRank: { name: string; minXp: number; commissionPct: number; discountPct?: number } | null;
  discount: { code: string; pct: number; synced: boolean; status: string } | null;
  progress: { pct: number; xpInto: number; xpNeeded: number };
  referralLink: string;
  ranks?: { key: string; name: string; minXp: number }[];
  creatorApplication: {
    platform: string; handle: string; followers: number; status: string;
    createdAt: string; reviewedAt: string | null;
  } | null;
}
export interface Dash {
  rank: Me["rank"];
  totals: {
    lifetimeCents: number; availableCents: number; pendingCents: number; paidOutCents: number;
    estimatedMonthlyCents: number; activePayingReferrals: number; directReferrals: number;
    convertedReferrals: number; indirectReferrals: number; clicks: number; conversionPct: number;
  };
  series: { date: string; cents: number; clicks: number }[];
  commissions: { id: string; level: number; amountCents: number; currency: string; status: string; availableAt: string; createdAt: string; plan?: string | null }[];
  payouts: { id: string; amountCents: number; status: string; method: string; requestedAt: string; decidedAt: string | null; note: string | null }[];
  xpEvents: { activity: string; xp: number; createdAt: string }[];
  settings: { holdingPeriodDays: number; minPayoutCents: number; payoutThresholdCents?: number | null; effectiveMinPayoutCents?: number };
}

export interface DemoBundle {
  me: Me;
  dash: Dash;
  insights: InsightsData;
  notifications: { id: string; type: string; title: string; body: string; href: string | null; read: boolean; createdAt: string }[];
  links: { label: string; slug: string; url: string; clicks: number; signups: number }[];
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

const DEMO_MSG = "You're viewing the read-only demo — join free to get this dashboard with your own numbers.";

export default function DashboardClient({ demo }: { demo?: DemoBundle } = {}) {
  const isDemo = !!demo;
  const [me, setMe] = useState<Me | null>(demo?.me ?? null);
  const [dash, setDash] = useState<Dash | null>(demo?.dash ?? null);
  const range = "30"; // the dashboard payload's stat row is all-time; ranges live in InsightsSection
  const [notJoined, setNotJoined] = useState(false);
  const [loading, setLoading] = useState(!isDemo);
  const [qr, setQr] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [customCode, setCustomCode] = useState("");
  const [payoutEmail, setPayoutEmail] = useState(demo?.me.profile.payoutEmail ?? "");
  const [payoutMethod, setPayoutMethod] = useState(
    demo?.me.profile.payoutMethod === "paypal" ? "venmo" : (demo?.me.profile.payoutMethod ?? "venmo"),
  );
  const [venmoHandle, setVenmoHandle] = useState(demo?.me.profile.venmoHandle ?? "");
  const [threshold, setThreshold] = useState(
    demo?.me.profile.payoutThresholdCents ? String(demo.me.profile.payoutThresholdCents / 100) : "",
  );
  const [msg, setMsg] = useState("");

  const loadMe = async () => {
    if (isDemo) return demo!.me;
    const { ok, status, j } = await api("/api/affiliate/me");
    if (!ok && status === 404 && j.join) { setNotJoined(true); setLoading(false); return null; }
    if (!ok) { setLoading(false); return null; }
    setMe(j as Me);
    setPayoutEmail((j as Me).profile.payoutEmail ?? "");
    // A stored legacy "paypal" method stays on the record, but the live
    // flow pays via Venmo — preselect Venmo so they're prompted for a handle.
    setPayoutMethod((j as Me).profile.payoutMethod === "paypal" ? "venmo" : ((j as Me).profile.payoutMethod ?? "venmo"));
    setVenmoHandle((j as Me).profile.venmoHandle ?? "");
    const th = (j as Me).profile.payoutThresholdCents;
    setThreshold(th ? String(th / 100) : "");
    return j as Me;
  };
  const loadDash = async (rg = range) => {
    if (isDemo) return;
    const { ok, j } = await api(`/api/affiliate/dashboard?range=${rg}`);
    if (ok) setDash(j as Dash);
  };

  useEffect(() => {
    if (isDemo) return;
    (async () => {
      const m = await loadMe();
      if (m) await loadDash();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retry = async () => {
    setLoading(true);
    const m = await loadMe();
    if (m) await loadDash();
    setLoading(false);
  };

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
    if (isDemo) { setMsg(DEMO_MSG); return; }
    const { ok, j } = await api("/api/affiliate/custom-code", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: customCode }),
    });
    if (ok) { setMsg(`Referral code updated to /ref/${j.customCode}`); setCustomCode(""); await loadMe(); }
    else setMsg(j.error ?? "Couldn't update code.");
  };

  const requestPayout = async () => {
    if (isDemo) { setMsg(DEMO_MSG); return; }
    if (!confirm(`Request payout of ${fmtCents(dash!.totals.availableCents)}?`)) return;
    const { ok, j } = await api("/api/affiliate/payouts", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ payoutEmail, payoutMethod, venmoHandle: payoutMethod === "venmo" ? venmoHandle : undefined }),
    });
    if (ok) { setMsg(`Payout requested: ${fmtCents(j.payout.amountCents)}. We've emailed you a confirmation — an admin reviews requests within 48 hours.`); await loadDash(); }
    else setMsg(j.error ?? "Payout request failed.");
  };

  const saveThreshold = async () => {
    if (isDemo) { setMsg(DEMO_MSG); return; }
    const dollars = parseFloat(threshold);
    const payload = threshold.trim() === "" ? { payoutThresholdCents: null } : { payoutThresholdCents: Math.round(dollars * 100) };
    if (threshold.trim() !== "" && (!Number.isFinite(dollars) || dollars <= 0)) { setMsg("Enter a threshold amount in dollars, or leave it blank to use the program minimum."); return; }
    const { ok, j } = await api("/api/affiliate/me", {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
    });
    if (ok) { setMsg(payload.payoutThresholdCents === null ? "Personal payout threshold cleared — the program minimum applies." : `Personal payout threshold set to ${fmtCents(payload.payoutThresholdCents)}.`); await loadMe(); await loadDash(); }
    else setMsg(j.error ?? "Couldn't save the threshold.");
  };

  const toggleDirector = async (next: boolean) => {
    if (isDemo) { setMsg(DEMO_MSG); return; }
    const { ok, j } = await api("/api/affiliate/me", {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ directorEnabled: next }),
    });
    if (ok) { setMsg(next ? "Cinematic Director switched ON — the globe's Director tools now unlock for you." : "Cinematic Director switched off."); await loadMe(); }
    else setMsg(j.error ?? "Couldn't save the Director switch.");
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

  if (!me || !dash) return (
    <EmptyState
      title="Couldn't load dashboard"
      body="Something interrupted the uplink — your data is safe. Try again."
      cta={<button onClick={retry} className={btnPrimary} style={btnStyle}>Retry</button>}
    />
  );

  const t = dash.totals;
  const link = me.referralLink;
  const enc = encodeURIComponent(link);
  const shareText = encodeURIComponent(
    `Watch the planet live — 74,229 live cameras, flights, satellites. Free to explore${me.discount ? ` — and my code ${me.discount.code} takes ${me.discount.pct}% off your first Pro payment` : ""}:`,
  );
  const shareKit = `Watch the planet live — 74,229 live cameras, flights, satellites and storms, free to explore: ${link}${me.discount ? `\nUse my code ${me.discount.code} for ${me.discount.pct}% off your first WorldEye Pro payment.` : ""}`;
  const shares = [
    ["X", `https://twitter.com/intent/tweet?text=${shareText}&url=${enc}`],
    ["Facebook", `https://www.facebook.com/sharer/sharer.php?u=${enc}`],
    ["Telegram", `https://t.me/share/url?url=${enc}&text=${shareText}`],
    ["WhatsApp", `https://wa.me/?text=${shareText}%20${enc}`],
    ["Email", `mailto:?subject=${encodeURIComponent("WorldEye — see the planet live")}&body=${shareText}%20${enc}`],
  ];
  const effectiveMin = dash.settings.effectiveMinPayoutCents ?? dash.settings.minPayoutCents;

  return (
    <div className="space-y-6">
      {isDemo && (
        <div className="rounded-2xl border border-pink-400/50 bg-pink-400/[0.08] px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
          <div className="text-sm text-pink-100">
            <span className="font-mono font-bold tracking-widest">DEMO</span> — this is the real affiliate dashboard running on
            sample figures so you can explore every feature. The numbers are illustrative, not real earnings, and nothing here saves or sends anything.
          </div>
          <a href="/api/auth/signin?callbackUrl=/affiliates/dashboard"
            className="shrink-0 px-4 py-2 rounded-xl text-sm font-mono font-bold text-[#04121f]"
            style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)" }}>
            Get your own dashboard — free
          </a>
        </div>
      )}
      {me.profile.status !== "active" && (
        <div className={card + " border-amber-400/40"}>
          <div className="text-amber-300 font-bold">Account status: {me.profile.status}</div>
          <div className="text-sm text-slate-400">Your affiliate account is under review. Commissions are paused until it's reactivated.</div>
        </div>
      )}
      {msg && <div className={card + " text-sm text-cyan-200"}>{msg}</div>}

      {/* Referral link bar */}
      <div className={card}>
        <div className="flex items-center gap-3 mb-4">
          <img src="/affiliate-icons/s1-referral-tracking.png" alt="Referral tracking" width={276} height={250} className="w-11 h-11 object-contain shrink-0"
            style={{ filter: "drop-shadow(0 0 14px rgba(34,211,238,.45))" }} />
          <div className="flex-1"><SectionTitle kicker="Your weapon" title="Referral link" /></div>
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          <input className={input} readOnly value={link} onFocus={(e) => e.target.select()} />
          <div className="flex gap-2">
            <CopyButton text={link} />
            <button onClick={toggleQr} className="px-4 py-2 rounded-xl font-mono text-sm border border-white/15 text-slate-200 hover:border-cyan-400/60">QR</button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {shares.map(([n, u]) => (
            <a key={n} href={u} target="_blank" rel="noopener" className="px-3 py-1.5 rounded-lg text-xs font-mono border border-white/10 text-slate-300 hover:text-white hover:border-cyan-400/50">{n}</a>
          ))}
          <CopyButton text={shareKit} label="Copy share kit (link + code)" />
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
          <button onClick={saveCustomCode} disabled={!customCode.trim()}
            className="px-3 py-2 rounded-xl text-xs font-mono border border-white/15 text-slate-200 hover:border-cyan-400/60 disabled:opacity-50 disabled:cursor-not-allowed">Claim</button>
        </div>
      </div>

      {/* Notifications */}
      <NotificationsPanel demoItems={demo?.notifications} />

      {/* Tracking links + UTM builder */}
      <TrackingLinksPanel referralLink={link} demoLinks={demo?.links} />

      {/* Studio badges (renders nothing for non-members) */}
      {!isDemo && <BadgesStrip />}

      {/* Marketing Studio entry point */}
      <div className={card}>
        <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <div>
            <div className="text-[10px] font-mono tracking-[0.2em] text-slate-400 uppercase mb-1">Marketing Studio</div>
            <div className="text-sm text-slate-300">
              73 ready-made templates personalized with your real link, discount code and QR — image &amp; video creators for
              Reels, TikTok, Stories and carousels, a caption generator, campaign kits and a daily content drop — plus the
              Repurposing Machine, which turns one video you own into many platform-ready variations.
              Studio use needs an active WorldEye membership (any plan, trials included).
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <a href="/affiliates/studio"
              className="px-4 py-2 rounded-xl text-xs font-mono font-bold text-[#04121f] text-center"
              style={{ background: "linear-gradient(135deg,#22d3ee,#818cf8)" }}>
              Open the Studio →
            </a>
            <a href="/affiliates/studio/repurpose"
              className="px-4 py-2 rounded-xl text-xs font-mono font-bold border border-cyan-300/40 text-cyan-200 text-center hover:bg-cyan-400/10">
              Repurposing Machine →
            </a>
          </div>
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
        <div className="mt-4 rounded-xl border border-[#fbbf24]/30 bg-[#fbbf24]/[0.06] px-3 py-2 text-xs font-mono text-[#fcd34d] flex items-center gap-2">
          <RankArt rank="visionary" color="#fbbf24" size={19} className="shrink-0" />
          {me.rank.name === "Visionary"
            ? "Visionary perk active — WorldEye Pro is free on your account while you hold this rank."
            : `Visionary perk: reach Visionary${me.ranks?.find((r) => r.key === "visionary") ? ` (${me.ranks.find((r) => r.key === "visionary")!.minXp.toLocaleString()} XP)` : ""} and WorldEye Pro is free while you hold the rank.`}
        </div>
      </div>

      {/* Creator program */}
      <div className={card}>
        <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <div>
            <div className="text-[10px] font-mono tracking-[0.2em] text-slate-400 uppercase mb-1">Creator program</div>
            {me.creatorApplication ? (
              <div className="text-sm text-slate-300">
                Application for <span className="text-white font-bold">@{me.creatorApplication.handle}</span>
                {" "}({me.creatorApplication.platform}, {me.creatorApplication.followers.toLocaleString()} followers) —{" "}
                {me.creatorApplication.status === "pending" && <span className="text-amber-300 font-bold">under review</span>}
                {me.creatorApplication.status === "approved" && <span className="text-emerald-300 font-bold">approved — free Pro active</span>}
                {me.creatorApplication.status === "rejected" && <span className="text-red-300 font-bold">not approved — you can re-apply</span>}
              </div>
            ) : (
              <div className="text-sm text-slate-300">
                Have <span className="text-white font-bold">25,000+ followers</span>? Creators get WorldEye Pro free for 12 months.
              </div>
            )}
          </div>
          <a href="/affiliates#creators"
            className="shrink-0 px-4 py-2 rounded-xl text-xs font-mono border border-white/15 text-slate-200 hover:border-pink-400/60">
            {me.creatorApplication ? "View application" : "Apply for free Pro"}
          </a>
        </div>
      </div>

      {/* Discount code */}
      {me.discount && (
        <div className={card}>
          <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div className="min-w-0">
              <div className="text-[10px] font-mono tracking-[0.2em] text-slate-400 uppercase mb-1">Your discount code</div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-3xl md:text-4xl font-black font-mono tracking-wider text-white">{me.discount.code}</span>
                <CopyButton text={me.discount.code} />
              </div>
              <div className="text-sm text-slate-300 mt-2">
                Gives your audience <span className="text-white font-bold">{me.discount.pct}% off their first payment</span> — 
                {" "}share it anywhere. Sales made with your code count as your referrals, even without your link.
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {me.discount.synced
                  ? "Live at checkout now."
                  : "Activating — your code will start redeeming at checkout shortly."}
                {me.nextRank && typeof me.nextRank.discountPct === "number" && me.nextRank.discountPct > me.discount.pct && (
                  <> Reach <span className="text-slate-300 font-bold">{me.nextRank.name}</span> and your code rises to {me.nextRank.discountPct}% off.</>
                )}
              </div>
            </div>
            <div className="text-center shrink-0">
              <div className="text-[10px] font-mono tracking-[0.2em] text-slate-400 uppercase">Audience saves</div>
              <div className="text-3xl font-bold font-mono text-emerald-300">{me.discount.pct}%</div>
              <div className="text-[10px] text-slate-500">first payment</div>
            </div>
          </div>
        </div>
      )}

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

      {/* Insights: range stats, earnings + clicks chart (daily/weekly/
          monthly), funnel, retention, sources, creative, rank ladder */}
      <InsightsSection demoData={demo?.insights} />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Commissions */}
        <div className={card}>
          <div className="flex items-center gap-3 mb-4">
            <img src="/affiliate-icons/s1-commission-earnings.png" alt="Commission earnings" width={276} height={250} className="w-11 h-11 object-contain shrink-0"
              style={{ filter: "drop-shadow(0 0 14px rgba(251,191,36,.45))" }} />
            <div className="flex-1"><SectionTitle kicker="Ledger" title="Commissions" /></div>
          </div>
          {dash.commissions.length === 0 && <div className="text-sm text-slate-500">No commissions yet — they appear here after verified subscription payments.</div>}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {dash.commissions.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 py-2 border-b border-white/5 text-sm">
                <div className="flex items-center gap-2">
                  <Pill color={c.level === 1 ? "#38bdf8" : c.level === 2 ? "#c084fc" : "#fbbf24"}>L{c.level}</Pill>
                  <span className="text-slate-400 text-xs font-mono">{new Date(c.createdAt).toLocaleDateString()}</span>
                  {c.plan && <span className="text-slate-500 text-xs font-mono">{c.plan}</span>}
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
            <span className="text-slate-500"> · your threshold {fmtCents(effectiveMin)}</span>
            {dash.settings.payoutThresholdCents ? <span className="text-slate-500"> (personal, above the {fmtCents(dash.settings.minPayoutCents)} program minimum)</span> : <span className="text-slate-500"> (the program minimum)</span>}
            <span className="text-slate-500"> · paid out to date </span>
            <span className="font-mono text-slate-200">{fmtCents(t.paidOutCents)}</span>
          </div>
          {t.availableCents < effectiveMin && (
            <div className="text-xs text-amber-300/90 font-mono mb-3">
              Earn {fmtCents(effectiveMin - t.availableCents)} more in available commissions to request a payout.
            </div>
          )}
          {me?.profile.payoutMethod === "paypal" && (
            <div className="text-xs text-amber-300/90 border border-amber-400/30 bg-amber-400/5 rounded-xl px-3 py-2.5 mb-3">
              We now pay out via <b>Venmo</b> instead of PayPal. Add your Venmo handle below to request your next payout — you'll be emailed at every step.
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input className={input} placeholder="Payout email" value={payoutEmail} onChange={(e) => setPayoutEmail(e.target.value)} />
            <select className={input + " sm:!w-40"} value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value)}>
              <option value="venmo">Venmo</option>
              <option value="manual">Manual</option>
              <option value="stripe_connect">Stripe Connect</option>
            </select>
            <button onClick={requestPayout} className={btnPrimary + " whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"} style={btnStyle}
              disabled={t.availableCents < effectiveMin}>Request payout</button>
          </div>
          {payoutMethod === "venmo" && (
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <input className={input} placeholder="Venmo handle (e.g. @your-name)" value={venmoHandle} onChange={(e) => setVenmoHandle(e.target.value)} />
              <span className="text-xs text-slate-500 self-center">Payouts land in this Venmo account. You'll get an email when your request is received, approved, processing and paid.</span>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center mb-4 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
            <span className="text-xs text-slate-400 flex-1">
              <span className="text-slate-200 font-bold">Personal payout threshold.</span>{" "}
              Prefer fewer, larger payouts? Set your own minimum (never below {fmtCents(dash.settings.minPayoutCents)}). Blank = program minimum.
            </span>
            <div className="flex gap-2 items-center">
              <span className="text-slate-500 font-mono text-sm">$</span>
              <input className={input + " !w-24"} placeholder="25" inputMode="decimal" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
              <button onClick={saveThreshold} className="px-3 py-2 rounded-xl text-xs font-mono border border-white/15 text-slate-200 hover:border-cyan-400/60">Save</button>
            </div>
          </div>
          {dash.payouts.length === 0 && <div className="text-sm text-slate-500">No payout requests yet.</div>}
          <div className="space-y-2">
            {dash.payouts.map((p) => (
              <div key={p.id} className="py-2 border-b border-white/5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-mono text-white">{fmtCents(p.amountCents)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono">{new Date(p.requestedAt).toLocaleDateString()}</span>
                    <Pill color={p.status === "paid" ? "#34d399" : p.status === "rejected" ? "#f87171" : "#fbbf24"}>{p.status}</Pill>
                  </div>
                </div>
                {p.note && (
                  <div className="text-xs text-slate-500 mt-1">
                    {p.status === "rejected" ? "Reason: " : "Note: "}{p.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cinematic Director switch */}
      <DirectorCard enabled={!!me.profile.directorEnabled} onToggle={toggleDirector} demo={isDemo} />

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

      {/* Plain-language help */}
      <HelpPanel />
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
