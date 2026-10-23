"use client";
import { useEffect, useState } from "react";
import { idbUsageBytes } from "@/lib/recording/idb";
import { formatBytes } from "@/lib/recording/dashboard";

/** Device-local clip storage meter (IndexedDB + browser quota estimate). */
export default function StorageMeter() {
  const [used, setUsed] = useState<number | null>(null);
  const [quota, setQuota] = useState<number | null>(null);
  useEffect(() => {
    (async () => {
      setUsed(await idbUsageBytes());
      try {
        const est = await navigator.storage?.estimate?.();
        if (est?.quota) setQuota(est.quota);
      } catch {}
    })();
  }, []);
  const pct = used != null && quota ? Math.min(100, (used / quota) * 100) : null;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-mono tracking-[0.2em] text-slate-500 uppercase">Device clip storage</div>
        <div className="text-xs font-mono text-slate-400">
          {used == null ? "…" : formatBytes(used)}{quota ? ` of ~${formatBytes(quota)}` : ""}
        </div>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all"
          style={{ width: `${pct ?? 0}%`, background: "linear-gradient(90deg,#38bdf8,#c084fc)" }} />
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Clips live in this browser's local storage. Clearing site data deletes them — download important clips.
      </p>
    </div>
  );
}
