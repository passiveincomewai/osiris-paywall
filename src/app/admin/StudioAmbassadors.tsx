"use client";

// Admin: ambassador application queue. Approve flips the affiliate's
// isAmbassador flag server-side; reject closes the application.
// Data: GET /api/admin/studio/ambassadors, POST .../[id] { decision }.
import { useCallback, useEffect, useState } from "react";

interface AmbassadorRow {
  id: string;
  profileId: string;
  platform: string;
  handle: string;
  profileUrl: string;
  audience: number;
  pitch?: string | null;
  status: string;
  createdAt: string;
  profile?: { referralCode?: string; customCode?: string | null } | null;
}

export default function StudioAmbassadors() {
  const [rows, setRows] = useState<AmbassadorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/studio/ambassadors", { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        const list = Array.isArray(j.applications) ? j.applications : Array.isArray(j.ambassadors) ? j.ambassadors : [];
        setRows(list as AmbassadorRow[]);
      } else setMsg(typeof j.error === "string" ? j.error : `Couldn't load applications (${res.status})`);
    } catch {
      setMsg("Network error loading applications.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, decision: "approve" | "reject") {
    setBusyId(id);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/studio/ambassadors/${encodeURIComponent(id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(typeof j.error === "string" ? j.error : `Failed (${res.status})`);
        return;
      }
      setRows((rs) => rs.filter((r) => r.id !== id));
      setMsg(decision === "approve" ? "Approved — ambassador flag is on for this affiliate." : "Application rejected.");
    } catch {
      setMsg("Network error — try again.");
    } finally {
      setBusyId(null);
    }
  }

  const pending = rows.filter((r) => r.status === "pending");

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-bold text-white">🌟 Ambassador applications</div>
        <div className="text-[11px] font-mono text-white/40">{pending.length} pending</div>
      </div>
      {msg && <div className="mb-3 text-xs font-mono text-cyan-300">{msg}</div>}
      {loading ? (
        <p className="text-sm text-white/40">Loading applications…</p>
      ) : pending.length === 0 ? (
        <p className="text-sm text-white/40">No pending applications. Affiliates apply from the Studio&apos;s Ambassador page.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.15em] text-white/35">
                <th className="py-2 pr-3 font-semibold">Creator</th>
                <th className="py-2 pr-3 font-semibold">Platform</th>
                <th className="py-2 pr-3 font-semibold text-right">Audience</th>
                <th className="py-2 pr-3 font-semibold">Pitch</th>
                <th className="py-2 pr-3 font-semibold">Applied</th>
                <th className="py-2 font-semibold text-right">Review</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((r) => (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="py-2.5 pr-3">
                    <a href={r.profileUrl} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline font-semibold">
                      @{r.handle}
                    </a>
                    <div className="text-[11px] text-white/40 font-mono">
                      affiliate: {r.profile?.customCode ?? r.profile?.referralCode ?? r.profileId.slice(0, 8)}
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 text-white/70 capitalize">{r.platform}</td>
                  <td className="py-2.5 pr-3 text-right text-white tabular-nums">{r.audience.toLocaleString("en-US")}</td>
                  <td className="py-2.5 pr-3 text-white/60 max-w-56">
                    <span className="line-clamp-3 text-xs">{r.pitch ?? "—"}</span>
                  </td>
                  <td className="py-2.5 pr-3 text-white/50">
                    {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </td>
                  <td className="py-2.5 text-right whitespace-nowrap">
                    <button
                      onClick={() => void decide(r.id, "approve")}
                      disabled={busyId === r.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-[#04121f] disabled:opacity-50 mr-2"
                      style={{ background: "linear-gradient(135deg,#6ee7b7,#34d399)" }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => void decide(r.id, "reject")}
                      disabled={busyId === r.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono border border-white/15 text-slate-300 hover:border-red-400/60 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[11px] text-white/30 mt-3">
        Verify the profile is real, owned by the applicant, and matches the self-reported audience before approving.
      </p>
    </div>
  );
}
