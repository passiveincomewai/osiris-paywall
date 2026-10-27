"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { SavedCam } from "@/components/recording/RecordableTile";

const card = "rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-4 min-w-0";

export default function MyCamerasPage() {
  const [cams, setCams] = useState<SavedCam[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [group, setGroup] = useState("");
  const [filter, setFilter] = useState("All");

  const load = async () => {
    const r = await fetch("/api/recording/cameras");
    if (r.ok) setCams((await r.json()).cameras);
  };
  useEffect(() => { load(); }, []);

  const save = async (id: string) => {
    const r = await fetch(`/api/recording/cameras/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() || undefined, group: group.trim() || undefined }),
    });
    if (r.ok) { setEditing(null); load(); }
  };

  const remove = async (id: string, n: string) => {
    if (!confirm(`Remove "${n}" from your cameras?`)) return;
    const r = await fetch(`/api/recording/cameras/${id}`, { method: "DELETE" });
    if (r.ok) load();
  };

  if (!cams) return <div className="text-slate-400 font-mono text-sm">Loading cameras…</div>;

  const groups = ["All", ...Array.from(new Set(cams.map((c) => c.group)))];
  const shown = filter === "All" ? cams : cams.filter((c) => c.group === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase mb-1">Library</div>
          <h1 className="text-3xl font-bold text-white">My cameras</h1>
          <p className="text-sm text-slate-400 mt-1">{cams.length} saved · save more from any camera on the main globe</p>
        </div>
        <Link href="/" className="shrink-0 px-4 py-2 rounded-xl text-sm font-mono border border-white/20 text-slate-200 hover:bg-white/5">
          ＋ Find cameras on the globe
        </Link>
      </div>

      {cams.length === 0 ? (
        <div className={card + " text-center py-12"}>
          <div className="text-4xl mb-3">📡</div>
          <div className="text-white font-bold">No saved cameras yet</div>
          <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
            Open any camera on the main globe, tap <span className="text-cyan-300 font-mono">Save camera</span> in the
            viewer, and it will appear here — ready for the live wall and recording.
          </p>
        </div>
      ) : (
        <>
          <div className="flex gap-2 flex-wrap">
            {groups.map((g) => (
              <button key={g} onClick={() => setFilter(g)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono border ${filter === g ? "border-cyan-400/60 text-cyan-200 bg-cyan-400/10" : "border-white/10 text-slate-400"}`}>
                {g}
              </button>
            ))}
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 min-w-0">
            {shown.map((c) => (
              <div key={c.id} className={card}>
                {editing === c.id ? (
                  <div className="space-y-2 min-w-0">
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Camera name"
                      className="w-full min-w-0 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-cyan-400/60" />
                    <input value={group} onChange={(e) => setGroup(e.target.value)} placeholder="Group (e.g. Home, Office)"
                      className="w-full min-w-0 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-cyan-400/60" />
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => save(c.id)} className="px-4 py-2 rounded-xl text-sm font-mono font-bold text-[#04121f]"
                        style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)" }}>Save</button>
                      <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl text-sm font-mono border border-white/15 text-slate-300">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-white font-bold truncate">{c.name}</div>
                        <div className="text-[11px] font-mono text-cyan-300/80 mt-0.5">{c.group}</div>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-mono border ${c.cameraData?.stream_url ? "border-emerald-400/40 text-emerald-300" : "border-slate-500/40 text-slate-400"}`}>
                        {c.cameraData?.stream_url ? "STREAM" : "INFO"}
                      </span>
                    </div>
                    <div className="mt-3 flex gap-2 flex-wrap">
                      <button
                        onClick={() => { setEditing(c.id); setName(c.name); setGroup(c.group); }}
                        className="px-3 py-1.5 rounded-lg text-xs font-mono border border-white/15 text-slate-300 hover:border-cyan-400/60">
                        Edit
                      </button>
                      <button
                        onClick={() => remove(c.id, c.name)}
                        className="px-3 py-1.5 rounded-lg text-xs font-mono border border-white/15 text-slate-300 hover:border-red-400/60 hover:text-red-300">
                        Remove
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
