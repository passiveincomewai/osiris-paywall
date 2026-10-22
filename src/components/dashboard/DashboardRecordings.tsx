"use client";

/**
 * /dashboard — Recordings island.
 *
 * A window onto the existing recording system, not a new one: clip
 * metadata from /api/recording/clips, entitlement + counts from
 * /api/recording/status, device storage from the studio's own
 * StorageMeter. The video files themselves live in this browser
 * (IndexedDB) — the page says so, and playback/downloads happen in
 * the clip library. Recording more happens in the studio: the
 * multi-record wall records many cameras at once (Pro up to 20,
 * VIP Pro up to 40).
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { Clapperboard, LayoutGrid, Loader2, MonitorPlay } from "lucide-react";
import StorageMeter from "@/components/recording/StorageMeter";
import { formatBytes, formatClock } from "@/lib/recording/dashboard";

interface ClipRow {
  id: string;
  cameraName: string;
  startedAt: string;
  durationSec: number;
  sizeBytes: number;
}
interface ClipsPayload {
  clips: ClipRow[];
  totals: { count: number; durationSec: number; sizeBytes: number };
}
interface StatusPayload {
  pro: boolean;
  tier: string;
  cameras: number;
  clips: number;
  clipSeconds: number;
  clipBytes: number;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DashboardRecordings() {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [payload, setPayload] = useState<ClipsPayload | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [sr, cr] = await Promise.all([
          fetch("/api/recording/status", { cache: "no-store" }),
          fetch("/api/recording/clips", { cache: "no-store" }),
        ]);
        if (!sr.ok || !cr.ok) throw new Error("load");
        setStatus((await sr.json()) as StatusPayload);
        setPayload((await cr.json()) as ClipsPayload);
      } catch {
        setLoadError(true);
      }
    })();
  }, []);

  const recent = payload?.clips.slice(0, 6) ?? [];

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h2 className="text-xl font-bold text-white">Recordings</h2>
        <Link href="/recording" className="text-xs font-mono text-cyan-300 hover:underline shrink-0">
          Recording studio →
        </Link>
      </div>
      <p className="text-sm text-slate-400 mb-5 max-w-2xl">
        Your clips, recorded in this browser — the files live on this device, not in the cloud.
        Watch and download them in the clip library; record more from the studio.
      </p>

      {loadError ? (
        <p className="text-sm text-red-300">Couldn&apos;t load your recordings. Refresh to try again.</p>
      ) : !status || !payload ? (
        <div className="flex items-center gap-2 text-slate-500 font-mono text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading your recordings…
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-2xl font-black text-white">{payload.totals.count}</div>
              <div className="text-[11px] font-mono tracking-wider text-slate-500 uppercase mt-0.5">Clips recorded</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-2xl font-black text-white">{formatClock(payload.totals.durationSec)}</div>
              <div className="text-[11px] font-mono tracking-wider text-slate-500 uppercase mt-0.5">Total footage</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-2xl font-black text-white">{formatBytes(payload.totals.sizeBytes)}</div>
              <div className="text-[11px] font-mono tracking-wider text-slate-500 uppercase mt-0.5">On this device</div>
            </div>
          </div>

          {!status.pro && (
            <div className="rounded-2xl border border-[#D4AF37]/25 bg-white/[0.03] p-5">
              <h3 className="font-bold mb-1.5">Recording is a WorldEye Pro feature</h3>
              <p className="text-sm text-white/55 leading-relaxed">
                Saving cameras is free — pressing record takes Pro (monthly $13.99) or VIP Pro
                (annual $74.99). Pro records up to 20 cameras at once on the multi-record wall;
                VIP Pro up to 40, plus the recording dashboard.
              </p>
              <Link href="/pricing" className="inline-block mt-3 text-sm font-semibold text-[#D4AF37] hover:underline">
                See plans & pricing →
              </Link>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <Link
              href="/recording/multi"
              className="rounded-2xl border border-red-400/30 bg-red-400/[0.06] p-5 hover:bg-red-400/[0.1] transition group"
            >
              <div className="flex items-center gap-2 text-white font-bold">
                <LayoutGrid className="w-5 h-5 text-red-300" /> Record multiple cameras at once
              </div>
              <p className="text-sm text-slate-400 mt-1.5">
                The multi-record wall: pick cameras — your tracked ones are already there — and
                record them all together.
              </p>
              <span className="text-xs font-mono text-red-200 group-hover:underline mt-2 inline-block">
                Open the record wall →
              </span>
            </Link>
            <Link
              href="/recording/clips"
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:bg-white/[0.06] transition group"
            >
              <div className="flex items-center gap-2 text-white font-bold">
                <Clapperboard className="w-5 h-5 text-cyan-300" /> Clip library
              </div>
              <p className="text-sm text-slate-400 mt-1.5">
                Watch, download and manage every clip stored on this device.
              </p>
              <span className="text-xs font-mono text-cyan-300 group-hover:underline mt-2 inline-block">
                Open the library →
              </span>
            </Link>
          </div>

          {recent.length > 0 && (
            <div>
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="text-base font-bold text-white">Recent clips</h3>
                <Link href="/recording/dashboard" className="text-xs font-mono text-cyan-300 hover:underline inline-flex items-center gap-1">
                  <MonitorPlay className="w-3.5 h-3.5" /> Recording dashboard (VIP Pro) →
                </Link>
              </div>
              <ul className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
                {recent.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{c.cameraName}</div>
                      <div className="text-xs text-white/40">{fmtDate(c.startedAt)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-mono text-white/80">{formatClock(c.durationSec)}</div>
                      <div className="text-xs text-white/40">{formatBytes(c.sizeBytes)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {payload.totals.count === 0 && status.pro && (
            <p className="text-sm text-slate-400">
              No clips yet — hit <span className="text-red-300 font-mono">● REC</span> on any live
              camera, or start the record wall above, and your captures will land here.
            </p>
          )}

          <StorageMeter />
        </div>
      )}
    </div>
  );
}
