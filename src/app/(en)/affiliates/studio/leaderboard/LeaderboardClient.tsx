"use client";
// Monthly Studio leaderboard: creations saved, XP earned, and campaigns
// completed this month — Studio activity only.
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/affiliate/ui";

interface LeaderboardEntry {
  rank: number;
  profileId: string;
  name: string;
  creations: number;
  xpEarned: number;
  campaignsCompleted: number;
}

const card = "rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-4 md:p-5";

async function api(path: string, init?: RequestInit) {
  const r = await fetch(path, init);
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, j: j as Record<string, unknown> };
}

export default function LeaderboardClient() {
  const [month, setMonth] = useState("");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [me, setMe] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { ok, j } = await api("/api/affiliate/studio/leaderboard");
      if (!ok) setError(typeof j.error === "string" ? j.error : "Couldn't load the leaderboard.");
      else {
        setMonth(typeof j.month === "string" ? j.month : "");
        setEntries(Array.isArray(j.entries) ? (j.entries as LeaderboardEntry[]) : []);
        setMe((j.me as LeaderboardEntry | null) ?? null);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-slate-400 font-mono text-sm">Loading the leaderboard…</div>;

  const monthLabel = month
    ? new Date(`${month}-02T00:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : "This month";

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase mb-1">Marketing Studio</div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Studio Leaderboard</h1>
        <p className="text-sm text-slate-400 mt-1">{monthLabel} — ranked by Studio activity.</p>
      </div>

      {error ? (
        <EmptyState title="Leaderboard unavailable" body={error} />
      ) : entries.length === 0 ? (
        <EmptyState
          title="No Studio activity yet this month"
          body="Save a creation, earn XP, or complete a campaign and you'll be on this board."
        />
      ) : (
        <section className={card + " overflow-x-auto"}>
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.15em] text-slate-400">
                <th className="py-2 pr-3 font-semibold">Rank</th>
                <th className="py-2 pr-3 font-semibold">Creator</th>
                <th className="py-2 pr-3 font-semibold text-right">Creations</th>
                <th className="py-2 pr-3 font-semibold text-right">XP earned</th>
                <th className="py-2 font-semibold text-right">Campaigns completed</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const mine = me !== null && e.profileId === me.profileId;
                return (
                  <tr
                    key={e.profileId}
                    className={`border-t border-white/5 ${mine ? "bg-cyan-400/10 text-white" : "text-slate-300"}`}
                  >
                    <td className="py-2.5 pr-3 font-mono font-bold">{e.rank}</td>
                    <td className="py-2.5 pr-3 font-semibold">
                      {e.name}
                      {mine && <span className="ml-2 text-[11px] font-mono text-cyan-300">YOU</span>}
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{e.creations}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{e.xpEarned.toLocaleString()}</td>
                    <td className="py-2.5 text-right tabular-nums">{e.campaignsCompleted}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {me && !entries.some((e) => e.profileId === me.profileId) && (
            <p className="mt-3 text-sm text-slate-300">
              Your month so far: rank #{me.rank} · {me.creations} creations · {me.xpEarned.toLocaleString()} XP ·{" "}
              {me.campaignsCompleted} campaigns completed.
            </p>
          )}
        </section>
      )}

      <p className="text-xs text-slate-500 max-w-2xl">
        Creators who opted out of leaderboards aren&apos;t shown. Rankings use Studio activity only — creations
        saved, XP earned, and campaigns completed this month.
      </p>
    </div>
  );
}
