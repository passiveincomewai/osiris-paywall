"use client";

// Admin: creator free-Pro application review queue. Server page passes the
// pending applications; Approve/Reject POST to /api/admin/creators/[id]
// (approve grants 12 months of comp Pro server-side).
import { useState } from "react";

export interface CreatorApplicationRow {
  id: string;
  email: string | null;
  platform: string;
  handle: string;
  profileUrl: string;
  followers: number;
  createdAt: string; // ISO
}

export default function CreatorApplications({ initial }: { initial: CreatorApplicationRow[] }) {
  const [rows, setRows] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  async function decide(id: string, decision: "approve" | "reject") {
    setBusyId(id);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/creators/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(j.error ?? `Failed (${res.status})`);
        return;
      }
      setRows((rs) => rs.filter((r) => r.id !== id));
      if (decision === "approve") {
        setMsg(j.grant?.granted
          ? "Approved — comp Pro granted for 12 months."
          : "Approved. (No comp granted — the user already has a paid subscription, which always wins.)");
      } else {
        setMsg("Application rejected.");
      }
    } catch {
      setMsg("Network error — try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-bold text-white">🎬 Creator applications — free Pro</div>
        <div className="text-[11px] font-mono text-white/40">{rows.length} pending</div>
      </div>
      {msg && <div className="mb-3 text-xs font-mono text-cyan-300">{msg}</div>}
      {rows.length === 0 ? (
        <p className="text-sm text-white/40">No pending applications. Creators apply from the “Free Pro for creators” section on /affiliates.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.15em] text-white/35">
                <th className="py-2 pr-3 font-semibold">Creator</th>
                <th className="py-2 pr-3 font-semibold">Platform</th>
                <th className="py-2 pr-3 font-semibold text-right">Followers</th>
                <th className="py-2 pr-3 font-semibold">Applied</th>
                <th className="py-2 font-semibold text-right">Review</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="py-2.5 pr-3">
                    <a href={r.profileUrl} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline font-semibold">
                      @{r.handle}
                    </a>
                    <div className="text-[11px] text-white/40">{r.email ?? "—"}</div>
                  </td>
                  <td className="py-2.5 pr-3 text-white/70 capitalize">{r.platform}</td>
                  <td className="py-2.5 pr-3 text-right text-white tabular-nums">{r.followers.toLocaleString("en-US")}</td>
                  <td className="py-2.5 pr-3 text-white/50">
                    {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </td>
                  <td className="py-2.5 text-right whitespace-nowrap">
                    <button
                      onClick={() => decide(r.id, "approve")}
                      disabled={busyId === r.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-[#04121f] disabled:opacity-50 mr-2"
                      style={{ background: "linear-gradient(135deg,#6ee7b7,#34d399)" }}>
                      Approve + grant Pro
                    </button>
                    <button
                      onClick={() => decide(r.id, "reject")}
                      disabled={busyId === r.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono border border-white/15 text-slate-300 hover:border-red-400/60 disabled:opacity-50">
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
        Verify the profile is real, owned by the applicant, and genuinely at 25k+ followers before approving — the count above is self-reported.
      </p>
    </div>
  );
}
