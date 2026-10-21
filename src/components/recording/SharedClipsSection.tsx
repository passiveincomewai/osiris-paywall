"use client";
import { useCallback, useEffect, useState } from "react";

type Share = {
  id: string;
  title: string;
  url: string;
  views: number;
  revoked: boolean;
  createdAt: string;
  cameraName: string;
  durationSec: number;
};

function fmtDur(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * "Your shared clips" — management for the public watch pages this
 * user has created: live links with view counts, title editing, and
 * revoke (which deletes the hosted video, killing the link).
 */
export default function SharedClipsSection({ version }: { version: number }) {
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "unavailable" }
    | { kind: "ready"; shares: Share[] }
    | { kind: "error" }
  >({ kind: "loading" });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/share/clips").catch(() => null);
    if (!r || !r.ok) return setState({ kind: "error" });
    const j = await r.json().catch(() => ({}));
    if (!j.configured) return setState({ kind: "unavailable" });
    setState({ kind: "ready", shares: (j.shares ?? []) as Share[] });
  }, []);

  useEffect(() => {
    load();
  }, [load, version]);

  const copy = async (s: Share) => {
    try {
      await navigator.clipboard.writeText(s.url);
      setCopiedId(s.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Input-free row: clipboard refusal just leaves the link visible.
    }
  };

  const revoke = async (s: Share) => {
    if (!confirm(`Revoke this share? The watch link stops working and the hosted video is deleted.\n\n"${s.title}"`)) return;
    const r = await fetch(`/api/share/clips/${s.id}`, { method: "DELETE" }).catch(() => null);
    if (r && r.ok) load();
  };

  const saveTitle = async (s: Share) => {
    const t = editTitle.trim();
    if (!t) return setEditingId(null);
    const r = await fetch(`/api/share/clips/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: t }),
    }).catch(() => null);
    setEditingId(null);
    if (r && r.ok) load();
  };

  if (state.kind === "loading" || state.kind === "error") return null;

  if (state.kind === "unavailable") {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase mb-1">Sharing</div>
        <h2 className="text-lg font-bold text-white">Shared clips</h2>
        <p className="text-sm text-slate-400 mt-1">
          In-app sharing isn't available yet — hosted video sharing is still being set up. For now, clips can be
          downloaded from this library and shared from your device.
        </p>
      </section>
    );
  }

  const { shares } = state;
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
      <div>
        <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase mb-1">Sharing</div>
        <h2 className="text-lg font-bold text-white">Your shared clips</h2>
        <p className="text-sm text-slate-400 mt-1">
          Public watch pages hosted on worldeye.app. Visits through these links carry your referral code.
        </p>
      </div>

      {shares.length === 0 ? (
        <p className="text-sm text-slate-500">
          Nothing shared yet — hit <span className="text-slate-300 font-mono">Share</span> on any clip below to get
          its watch link.
        </p>
      ) : (
        <div className="space-y-3">
          {shares.map((s) => (
            <div key={s.id} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {editingId === s.id ? (
                    <div className="flex gap-2">
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        maxLength={140}
                        autoFocus
                        className="min-w-0 flex-1 rounded-lg bg-white/5 border border-white/15 px-2 py-1 text-sm text-white outline-none focus:border-cyan-400/60"
                      />
                      <button onClick={() => saveTitle(s)} className="text-xs font-mono text-cyan-300 hover:text-cyan-200">
                        Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-xs font-mono text-slate-400 hover:text-white">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="text-white font-semibold truncate">{s.title}</div>
                  )}
                  <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                    {s.cameraName} · {fmtDur(s.durationSec)} ·{" "}
                    {new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                </div>
                <span
                  className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-mono border ${
                    s.revoked
                      ? "bg-red-400/10 border-red-400/30 text-red-300"
                      : "bg-emerald-400/10 border-emerald-400/30 text-emerald-300"
                  }`}
                >
                  {s.revoked ? "REVOKED" : `${s.views.toLocaleString()} views`}
                </span>
              </div>
              {!s.revoked && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-cyan-300 hover:underline truncate max-w-full"
                  >
                    {s.url}
                  </a>
                </div>
              )}
              <div className="mt-2 flex gap-2">
                {!s.revoked && (
                  <>
                    <button
                      onClick={() => copy(s)}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono border border-white/15 text-slate-200 hover:border-cyan-400/60"
                    >
                      {copiedId === s.id ? "Copied ✓" : "Copy link"}
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(s.id);
                        setEditTitle(s.title);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono border border-white/15 text-slate-200 hover:border-cyan-400/60"
                    >
                      Edit title
                    </button>
                    <button
                      onClick={() => revoke(s)}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono border border-white/15 text-slate-400 hover:border-red-400/60 hover:text-red-300"
                    >
                      Revoke
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
