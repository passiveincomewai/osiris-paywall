"use client";
// Detailed affiliate list for Affiliate Command: program summary header,
// search + status filter + sort, and a table whose rows open the
// per-affiliate detail page. All numbers come from
// GET /api/admin/affiliates (real aggregates only).
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { StatCard, Pill, EmptyState, fmtCents } from "@/components/affiliate/ui";

interface Row {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  referralCode: string;
  customCode: string | null;
  status: string;
  xp: number;
  rankName: string;
  isAmbassador: boolean;
  hasFreePro: boolean;
  clicks: number;
  signups: number;
  conversions: number;
  earnedCents: number;
  owedCents: number;
  createdAt: string;
}

interface ListData {
  total: number;
  capped: boolean;
  summary: {
    totalAffiliates: number;
    activeAffiliates: number;
    newThisMonth: number;
    totalEarnedCents: number;
    pendingCommissionsCents: number;
  };
  affiliates: Row[];
}

const input = "w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-cyan-400/60";
const select = "px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-cyan-400/60 [&>option]:bg-slate-900";
const btn = "px-3 py-2 rounded-lg text-xs font-mono font-bold border transition-colors border-cyan-400/50 text-cyan-300";

function statusColor(status: string): string {
  return status === "active" ? "#34d399" : status === "pending" ? "#fbbf24" : "#f87171";
}

export default function AffiliateList() {
  const [data, setData] = useState<ListData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("joined");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q, sort, take: "100" });
      if (status) params.set("status", status);
      const r = await fetch(`/api/admin/affiliates?${params}`);
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setData(j as ListData);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  }, [q, status, sort]);

  useEffect(() => { void load(); }, [load]);

  const s = data?.summary;
  return (
    <div>
      {s && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-5">
          <StatCard label="Total affiliates" value={String(s.totalAffiliates)} sub={`${s.activeAffiliates} active`} />
          <StatCard label="New this month" value={String(s.newThisMonth)} sub="profiles created" accent="#38bdf8" />
          <StatCard label="Total earned" value={fmtCents(s.totalEarnedCents)} sub="by affiliates, all time" accent="#34d399" />
          <StatCard label="Pending commissions" value={fmtCents(s.pendingCommissionsCents)} sub="holding + available" accent="#fbbf24" />
          <StatCard label="Showing" value={String(data?.affiliates.length ?? 0)} sub={`of ${data?.total ?? 0} matching`} accent="#c084fc" />
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <input className={input} placeholder="Search name, email, referral code…" value={q}
            onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void load()} />
        </div>
        <select className={select} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status filter">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
          <option value="removed">Removed</option>
          <option value="banned">Banned</option>
        </select>
        <select className={select} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
          <option value="joined">Sort: recently joined</option>
          <option value="earnings">Sort: total earned</option>
          <option value="signups">Sort: signups</option>
          <option value="xp">Sort: XP</option>
        </select>
        <button onClick={() => void load()} className={btn}>Search</button>
      </div>

      {loading && <div className="text-slate-400 font-mono text-sm">Loading…</div>}
      {!loading && error && <EmptyState title="Couldn't load" body={error} />}
      {!loading && !error && data && (
        <>
          {data.capped && (
            <div className="text-xs text-amber-300/80 font-mono mb-2">
              Sorting window capped — aggregates computed over the most recent profiles. Narrow the search for an exact ranking.
            </div>
          )}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-4 md:p-5 overflow-x-auto">
            <table className="w-full text-sm min-w-[880px]">
              <thead><tr className="text-left text-[11px] font-mono text-slate-400 uppercase">
                <th className="pb-2">Affiliate</th><th className="pb-2">Rank</th><th className="pb-2 text-right">Clicks</th>
                <th className="pb-2 text-right">Signups</th><th className="pb-2 text-right">Paid</th>
                <th className="pb-2 text-right">Earned</th><th className="pb-2 text-right">Owed</th>
                <th className="pb-2">Status</th><th className="pb-2 text-right">Joined</th>
              </tr></thead>
              <tbody>
                {data.affiliates.map((a) => (
                  <tr key={a.id} className="border-t border-white/5 text-slate-300 hover:bg-white/[0.03] transition-colors">
                    <td className="py-2 pr-3">
                      <Link href={`/admin/affiliates/${a.id}`} className="block group">
                        <span className="flex items-center gap-2.5">
                          {a.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={a.image} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                          ) : (
                            <span className="w-7 h-7 rounded-full bg-cyan-400/15 border border-cyan-400/30 text-cyan-200 text-xs font-bold flex items-center justify-center shrink-0">
                              {(a.name || a.email || "?").slice(0, 1).toUpperCase()}
                            </span>
                          )}
                          <span className="min-w-0">
                            <span className="block text-white font-semibold truncate group-hover:underline">{a.name || a.email}</span>
                            <span className="block text-[11px] text-slate-500 font-mono truncate">{a.email} · /{a.customCode ?? a.referralCode}</span>
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="py-2 pr-3"><Pill color="#818cf8">{a.rankName}</Pill></td>
                    <td className="py-2 pr-3 text-right font-mono">{a.clicks.toLocaleString()}</td>
                    <td className="py-2 pr-3 text-right font-mono">{a.signups.toLocaleString()}</td>
                    <td className="py-2 pr-3 text-right font-mono">{a.conversions.toLocaleString()}</td>
                    <td className="py-2 pr-3 text-right font-mono text-white">{fmtCents(a.earnedCents)}</td>
                    <td className="py-2 pr-3 text-right font-mono">{fmtCents(a.owedCents)}</td>
                    <td className="py-2 pr-3">
                      <span className="flex gap-1 flex-wrap">
                        <Pill color={statusColor(a.status)}>{a.status}</Pill>
                        {a.isAmbassador && <Pill color="#fbbf24">Ambassador</Pill>}
                        {a.hasFreePro && <Pill color="#34d399">Free Pro</Pill>}
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono text-xs text-slate-500">
                      {new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                  </tr>
                ))}
                {data.affiliates.length === 0 && (
                  <tr><td colSpan={9} className="py-6 text-slate-500 text-sm">No affiliates match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Click an affiliate to open their detail page — full stats, ledgers, and admin controls. “Owed” = commissions in holding, available, or in an open payout request.</p>
        </>
      )}
    </div>
  );
}
