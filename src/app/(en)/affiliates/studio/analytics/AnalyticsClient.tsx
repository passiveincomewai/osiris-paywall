"use client";
// Studio analytics: what WorldEye can actually measure — creations,
// renders, credits, XP, campaign history, and referral outcomes. Social
// platform performance is NOT tracked (see the honesty note below).
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CopyButton, EmptyState, SectionTitle, StatCard, fmtCents } from "@/components/affiliate/ui";

interface CampaignHistoryRow {
  campaignId?: string;
  id?: string;
  name?: string;
  campaignName?: string;
  status?: string;
  reviewStatus?: string;
  completedAt?: string | null;
  joinedAt?: string;
  postUrl?: string | null;
  xpReward?: number;
  creditReward?: number;
  [key: string]: unknown;
}

interface StudioAnalytics {
  creations: { total: number; byKind: Record<string, number> };
  renders: number;
  credits: { earned: number; spent: number; balance: number };
  studioXp: number;
  campaigns: CampaignHistoryRow[];
  referrals: { clicks: number; signups: number; payingReferrals: number; commissionsCents: number };
}

const card = "rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-4 md:p-5";
const btnPrimary =
  "inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-mono text-sm font-bold text-[#04121f] transition-all";
const btnStyle = { background: "linear-gradient(135deg,#38bdf8,#0096FF)", boxShadow: "0 0 20px rgba(0,150,255,.45)" };

async function api(path: string, init?: RequestInit) {
  const r = await fetch(path, init);
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, j: j as Record<string, unknown> };
}

export default function AnalyticsClient() {
  const [data, setData] = useState<StudioAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [bioCode, setBioCode] = useState<string | null>(null);
  const [showcase, setShowcase] = useState(false);
  const [showcaseBusy, setShowcaseBusy] = useState(false);
  const [showcaseMsg, setShowcaseMsg] = useState("");

  const load = useCallback(async () => {
    const { ok, j } = await api("/api/affiliate/studio/analytics");
    if (!ok) setError(typeof j.error === "string" ? j.error : "Couldn't load your analytics.");
    else setData(j as unknown as StudioAnalytics);
    setLoading(false);
    // Bio page state: the canonical code comes from /api/affiliate/me;
    // the showcase flag itself from the showcase route.
    const me = await api("/api/affiliate/me");
    if (me.ok) {
      const profile = me.j.profile as { referralCode?: string; customCode?: string | null } | undefined;
      if (profile) setBioCode(profile.customCode ?? profile.referralCode ?? null);
    }
    const sc = await api("/api/affiliate/studio/showcase");
    if (sc.ok) {
      setShowcase(sc.j.showcaseEnabled === true);
      if (typeof sc.j.code === "string" && sc.j.code) setBioCode(sc.j.code as string);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleShowcase = async (enabled: boolean) => {
    setShowcaseBusy(true);
    setShowcaseMsg("");
    const { ok, j } = await api("/api/affiliate/studio/showcase", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    if (ok) {
      setShowcase(j.showcaseEnabled === true);
      setShowcaseMsg(enabled ? "Showcase on — featured creations now appear on your bio page." : "Showcase off.");
    } else {
      setShowcaseMsg(typeof j.error === "string" ? j.error : "Couldn't update the showcase setting.");
    }
    setShowcaseBusy(false);
  };

  if (loading) return <div className="text-slate-400 font-mono text-sm">Loading your analytics…</div>;
  if (error || !data) return <EmptyState title="Analytics unavailable" body={error || "Couldn't load your analytics."} />;

  const byKind = Object.entries(data.creations.byKind ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase mb-1">Marketing Studio</div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Studio Analytics</h1>
        <p className="text-sm text-slate-400 mt-1">Everything WorldEye can measure about your Studio activity and referrals.</p>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Creations saved" value={String(data.creations.total)} />
        <StatCard label="Renders & downloads" value={String(data.renders)} />
        <StatCard label="Studio XP" value={data.studioXp.toLocaleString()} />
        <StatCard label="Credit balance" value={String(data.credits.balance)} accent="#22d3ee" />
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        <section className={card}>
          <SectionTitle kicker="Output" title="Creations by kind" />
          {byKind.length === 0 ? (
            <p className="text-sm text-slate-400">No creations yet — your saved designs and captions will break down here.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {byKind.map(([kind, count]) => (
                <li key={kind} className="flex justify-between border-b border-white/5 pb-1.5 last:border-0">
                  <span className="font-mono text-slate-300">{kind}</span>
                  <span className="font-mono font-bold text-white">{count}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
              <div className="text-[10px] font-mono tracking-[0.18em] text-slate-400 uppercase">Credits earned</div>
              <div className="text-xl font-bold font-mono text-emerald-300 mt-0.5">{data.credits.earned}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
              <div className="text-[10px] font-mono tracking-[0.18em] text-slate-400 uppercase">Credits spent</div>
              <div className="text-xl font-bold font-mono text-white mt-0.5">{data.credits.spent}</div>
            </div>
          </div>
        </section>

        <section className={card}>
          <SectionTitle kicker="Referrals" title="What your links did" />
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
              <div className="text-[10px] font-mono tracking-[0.18em] text-slate-400 uppercase">Clicks</div>
              <div className="text-xl font-bold font-mono text-white mt-0.5">{data.referrals.clicks.toLocaleString()}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
              <div className="text-[10px] font-mono tracking-[0.18em] text-slate-400 uppercase">Signups</div>
              <div className="text-xl font-bold font-mono text-white mt-0.5">{data.referrals.signups.toLocaleString()}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
              <div className="text-[10px] font-mono tracking-[0.18em] text-slate-400 uppercase">Paying referrals</div>
              <div className="text-xl font-bold font-mono text-white mt-0.5">{data.referrals.payingReferrals.toLocaleString()}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
              <div className="text-[10px] font-mono tracking-[0.18em] text-slate-400 uppercase">Commissions</div>
              <div className="text-xl font-bold font-mono text-emerald-300 mt-0.5">{fmtCents(data.referrals.commissionsCents)}</div>
            </div>
          </div>
        </section>
      </div>

      <section className={card}>
        <SectionTitle kicker="Campaigns" title="Campaign history" />
        {data.campaigns.length === 0 ? (
          <p className="text-sm text-slate-400">
            You haven&apos;t joined a campaign yet.{" "}
            <Link href="/affiliates/studio/campaigns" className="text-cyan-300 hover:underline">
              See active campaigns →
            </Link>
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.campaigns.map((row, i) => (
              <li key={row.campaignId ?? row.id ?? i} className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2 last:border-0">
                <span className="text-slate-200 font-semibold">{row.name ?? row.campaignName ?? "Campaign"}</span>
                <span className="font-mono text-xs text-slate-400">
                  {row.completedAt
                    ? `Completed ${new Date(row.completedAt).toLocaleDateString()}`
                    : row.joinedAt
                      ? `Joined ${new Date(row.joinedAt).toLocaleDateString()}`
                      : (row.status ?? row.reviewStatus ?? "")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={card}>
        <SectionTitle kicker="Public page" title="Your public bio page" />
        {bioCode ? (
          <>
            <div className="flex flex-col sm:flex-row gap-2">
              <code className="flex-1 truncate rounded-lg bg-black/40 border border-white/10 px-3 py-2.5 font-mono text-sm text-cyan-300">
                /bio/{bioCode}
              </code>
              <CopyButton text={`/bio/${bioCode}`} label="Copy bio link" />
              <Link href={`/bio/${bioCode}`} className="inline-flex items-center justify-center px-4 py-2 rounded-xl font-mono text-sm border border-white/15 text-slate-200 hover:border-cyan-400/60">
                View page
              </Link>
            </div>
            <label className="mt-4 flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showcase}
                disabled={showcaseBusy}
                onChange={(e) => void toggleShowcase(e.target.checked)}
                className="mt-1 h-4 w-4 accent-cyan-400"
              />
              <span className="text-sm text-slate-300">
                <span className="font-semibold text-white">Showcase my creations</span> — when on, your latest
                Studio creations appear as a “Featured creations” grid on the bio page. Your email, earnings, and XP
                are never shown there.
              </span>
            </label>
            {showcaseMsg && <p className="mt-2 text-sm text-slate-400">{showcaseMsg}</p>}
          </>
        ) : (
          <p className="text-sm text-slate-400">Your bio link appears once your affiliate profile loads.</p>
        )}
      </section>

      <div className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] p-4 md:p-5 text-sm text-amber-100/90 leading-relaxed">
        <span className="font-mono font-bold text-amber-300">Honest measurement: </span>
        Post performance — views, likes, and comments on social platforms — isn&apos;t tracked by WorldEye. Use the
        UTM links in your captions and kits to connect posts to the clicks and signups you see here.
      </div>

      <Link href="/affiliates/studio/creations" className={btnPrimary} style={btnStyle}>
        Review my creations
      </Link>
    </div>
  );
}
