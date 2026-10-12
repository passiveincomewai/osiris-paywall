"use client";
import { useEffect, useState } from "react";
import RecordableTile, { type SavedCam } from "@/components/recording/RecordableTile";
import UpgradeScreen from "@/components/recording/UpgradeScreen";

const LAYOUTS = [1, 2, 4, 9] as const;

export default function LivePage() {
  const [cams, setCams] = useState<SavedCam[] | null>(null);
  const [pro, setPro] = useState<boolean | null>(null);
  const [layout, setLayout] = useState<number>(() => {
    try { return Number(localStorage.getItem("we_rec_layout")) || 4; } catch { return 4; }
  });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      const s = await fetch("/api/recording/status");
      if (s.ok) {
        const j = await s.json();
        setPro(j.pro);
        if (j.pro) {
          const r = await fetch("/api/recording/cameras");
          if (r.ok) setCams((await r.json()).cameras);
        } else setCams([]);
      }
    })();
  }, [refreshKey]);

  const pickLayout = (n: number) => {
    setLayout(n);
    try { localStorage.setItem("we_rec_layout", String(n)); } catch {}
  };

  if (pro === null) return <div className="text-slate-400 font-mono text-sm">Loading…</div>;
  if (!pro) return <UpgradeScreen priceLine="Recording unlocks with WorldEye Pro · Monthly $9.99 · Annual $59.99" />;

  const shown = (cams ?? []).slice(0, layout);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase mb-1">Monitoring</div>
          <h1 className="text-3xl font-bold text-white">Live wall</h1>
          <p className="text-sm text-slate-400 mt-1">
            {cams?.length ?? 0} saved · showing {shown.length} · hit <span className="text-red-300 font-mono">● REC</span> on any tile to capture a clip
          </p>
        </div>
        <div className="flex gap-1.5 items-center">
          <span className="text-[11px] font-mono text-slate-500 mr-1">GRID</span>
          {LAYOUTS.map((n) => (
            <button key={n} onClick={() => pickLayout(n)}
              className={`w-9 h-9 rounded-lg text-xs font-mono border ${layout === n ? "border-cyan-400/60 text-cyan-200 bg-cyan-400/10" : "border-white/10 text-slate-400"}`}>
              {n}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-10 text-center">
          <div className="text-4xl mb-3">📡</div>
          <div className="text-white font-bold">Your wall is empty</div>
          <p className="text-sm text-slate-400 mt-2">Save cameras from the main globe to watch them here.</p>
        </div>
      ) : (
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns:
              layout === 1 ? "1fr" : layout === 2 ? "repeat(2,minmax(0,1fr))" : "repeat(auto-fill,minmax(min(100%,340px),1fr))",
          }}>
          {shown.map((c) => (
            <RecordableTile key={c.id} cam={c} pro={pro}
              onClipSaved={() => setRefreshKey((k) => k + 1)}
              onNeedPro={() => {}} />
          ))}
        </div>
      )}
      <p className="text-[11px] text-slate-500 leading-relaxed">
        Recording captures the live stream in your browser and saves the clip to this device.
        YouTube embeds and snapshot-only feeds show a preview but can't be recorded.
      </p>
    </div>
  );
}
