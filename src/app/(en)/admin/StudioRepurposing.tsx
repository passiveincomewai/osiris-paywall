"use client";

// Admin — Repurposing Machine usage + failed-render monitor (spec §15).
// Read-only; failed renders auto-refunded by design, listed here so a
// pattern of failures is visible to support.

import { useEffect, useState } from "react";

interface Data {
  projects: number;
  variations: number;
  readyVariations: number;
  postedVariations: number;
  scheduledPosts: number;
  rendersDone: number;
  rendersFailed: number;
  recentFailures: { id: string; error: string | null; creditCost: number; createdAt: string }[];
}

export default function StudioRepurposing() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/admin/studio/repurpose");
        const j = (await r.json()) as Data & { error?: string };
        if (!r.ok) throw new Error(j.error || "load failed");
        setData(j);
      } catch (e) {
        setError(e instanceof Error ? e.message : "load failed");
      }
    })();
  }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h3 className="font-bold text-white">Repurposing Machine (§15)</h3>
      {error && <p className="text-sm text-red-300 mt-1">{error}</p>}
      {!data && !error && <p className="text-sm text-slate-400 mt-1">Loading…</p>}
      {data && (
        <>
          <div className="flex flex-wrap gap-2 mt-3 text-[12.5px] font-mono text-slate-300">
            <span className="rounded-lg bg-black/30 border border-white/10 px-2.5 py-1.5">{data.projects} projects</span>
            <span className="rounded-lg bg-black/30 border border-white/10 px-2.5 py-1.5">{data.variations} variations ({data.readyVariations} ready · {data.postedVariations} posted)</span>
            <span className="rounded-lg bg-black/30 border border-white/10 px-2.5 py-1.5">{data.scheduledPosts} scheduled posts</span>
            <span className="rounded-lg bg-black/30 border border-white/10 px-2.5 py-1.5">renders: {data.rendersDone} done · {data.rendersFailed} failed (auto-refunded)</span>
          </div>
          {data.recentFailures.length > 0 && (
            <ul className="mt-3 space-y-1 text-[12.5px] text-slate-400">
              {data.recentFailures.map((f) => (
                <li key={f.id} className="font-mono">
                  {new Date(f.createdAt).toLocaleString()} — {f.error ?? "unknown error"} ({f.creditCost}cr refunded)
                </li>
              ))}
            </ul>
          )}
          <p className="text-[12px] text-slate-500 mt-3">
            Daily Drop assets double as Machine library sources (Machine → Start from the Content Library). Caption
            presets live in code (CAPTION_PRESETS) — changing them is a code change, not a config toggle.
          </p>
        </>
      )}
    </div>
  );
}
