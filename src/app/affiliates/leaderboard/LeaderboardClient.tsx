"use client";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, RankBadge, fmtCents } from "@/components/affiliate/ui";

type Row = {
  id: string;
  name: string;
  image: string | null;
  rank: string;
  rankColor: string;
  badge: string;
  xp: number;
  payingReferrals?: number;
  revenueCents?: number;
  clicks?: number;
};

type BoardKey = "month" | "revenue" | "xp" | "alltime" | "growth";

const TABS: { key: BoardKey; label: string; field: string; hint: string; metric: (r: Row) => string }[] = [
  { key: "month", label: "This Month", field: "payingThisMonth", hint: "Most paying referrals this month",
    metric: (r) => `${r.payingReferrals ?? 0} paying` },
  { key: "revenue", label: "Top Revenue", field: "topRevenue", hint: "Highest qualifying subscription revenue",
    metric: (r) => fmtCents(r.revenueCents ?? 0) },
  { key: "xp", label: "Top XP", field: "topXp", hint: "Most XP earned",
    metric: (r) => `${(r.xp ?? 0).toLocaleString()} XP` },
  { key: "alltime", label: "All Time", field: "allTime", hint: "All-time revenue leaders",
    metric: (r) => fmtCents(r.revenueCents ?? 0) },
  { key: "growth", label: "Rising", field: "growth", hint: "Fastest-growing networks by verified clicks",
    metric: (r) => `${(r.clicks ?? 0).toLocaleString()} clicks` },
];

const MEDALS = [
  { ring: "#fbbf24", glow: "0 0 22px rgba(251,191,36,.55)", text: "#fbbf24", medal: "🥇" },
  { ring: "#cbd5e1", glow: "0 0 18px rgba(203,213,225,.4)", text: "#cbd5e1", medal: "🥈" },
  { ring: "#d97706", glow: "0 0 18px rgba(217,119,6,.4)", text: "#d97706", medal: "🥉" },
];

function BoardRow({ row, pos, metric }: { row: Row; pos: number; metric: (r: Row) => string }) {
  const m = MEDALS[pos];
  const initial = (row.name || "?").trim().charAt(0).toUpperCase();
  return (
    <div
      className="flex items-center gap-3 md:gap-4 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md px-3 md:px-5 py-3"
      style={m ? { borderColor: m.ring + "55", boxShadow: m.glow } : undefined}
    >
      <div className="w-10 shrink-0 text-center">
        {m ? (
          <span className="text-2xl">{m.medal}</span>
        ) : (
          <span className="font-mono font-bold text-slate-400">#{pos + 1}</span>
        )}
      </div>
      {row.image ? (
        <img src={row.image} alt={row.name} className="w-10 h-10 rounded-full object-cover border border-white/15 shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center font-bold text-white border border-white/15"
          style={{ background: "radial-gradient(circle at 35% 30%, #1e3a5f, #0a1220)" }}>
          {initial}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-white font-semibold truncate">{row.name}</div>
        <div className="mt-1 scale-90 origin-left">
          <RankBadge name={row.rank} badge={row.badge} color={row.rankColor} glow={row.rankColor} size="sm" />
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-mono font-bold text-cyan-300 text-sm md:text-base">
          {metric(row)}
        </div>
      </div>
    </div>
  );
}

export default function LeaderboardClient() {
  const [tab, setTab] = useState<BoardKey>("month");
  const [data, setData] = useState<Record<string, Row[]> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [optOut, setOptOut] = useState<boolean | null>(null); // null = not an affiliate / unknown

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/affiliate/leaderboard", { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        setData(await r.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load leaderboard");
      }
    })();
    // If the viewer is a signed-in affiliate, offer the opt-out toggle.
    (async () => {
      try {
        const r = await fetch("/api/affiliate/me", { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        if (j?.profile) setOptOut(!!j.profile.leaderboardOptOut);
      } catch { /* not signed in — no toggle */ }
    })();
  }, []);

  const rows: Row[] = useMemo(() => {
    if (!data) return [];
    const field = TABS.find((t) => t.key === tab)!.field;
    const list = data[field];
    return Array.isArray(list) ? list : [];
  }, [data, tab]);

  const toggleOptOut = async () => {
    if (optOut === null) return;
    const next = !optOut;
    setOptOut(next); // optimistic
    try {
      const r = await fetch("/api/affiliate/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaderboardOptOut: next }),
      });
      if (!r.ok) setOptOut(!next);
    } catch {
      setOptOut(!next);
    }
  };

  const activeHint = TABS.find((t) => t.key === tab)!.hint;

  return (
    <div>
      {optOut !== null && (
        <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <div className="text-sm text-slate-300">
            <span className="font-semibold text-white">Your visibility:</span>{" "}
            {optOut ? "hidden from public boards" : "visible on public boards"}
          </div>
          <button
            onClick={toggleOptOut}
            className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${optOut ? "bg-slate-600" : "bg-cyan-500"}`}
            style={!optOut ? { boxShadow: "0 0 14px rgba(34,211,238,.6)" } : undefined}
            aria-label="Toggle leaderboard visibility"
          >
            <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${optOut ? "left-1" : "left-6"}`} />
          </button>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-mono font-bold whitespace-nowrap transition-all ${
              tab === t.key ? "text-[#04121f]" : "text-slate-300 border border-white/15 hover:bg-white/5"
            }`}
            style={tab === t.key
              ? { background: "linear-gradient(135deg,#38bdf8,#0096FF)", boxShadow: "0 0 20px rgba(0,150,255,.45)" }
              : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="text-[11px] font-mono tracking-[0.2em] text-slate-400 uppercase mb-3">{activeHint}</div>

      {error ? (
        <EmptyState title="Couldn't load the leaderboard" body={error} />
      ) : !data ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-white/[0.04] border border-white/10 animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No rankings yet"
          body="The board fills up as affiliates bring in verified subscription sales. Be the first name on it."
        />
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <BoardRow key={r.id} row={r} pos={i} metric={TABS.find((t) => t.key === tab)!.metric} />
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-slate-500 font-mono">
        Rankings update from verified sales only — pending, refunded, or reversed commissions never count.
        Opted-out affiliates are hidden from public boards.
      </p>
    </div>
  );
}
