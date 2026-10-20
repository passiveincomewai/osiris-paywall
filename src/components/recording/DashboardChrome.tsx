"use client";
/**
 * The recording dashboard's presentational pieces: the sign-in gate, the
 * VIP upsell a Pro user sees, and the ready room's cards. Kept separate
 * from the page (which owns the fetches and the session subscription)
 * so the gate and the upsell are render-testable without a browser.
 */
import Link from "next/link";
import {
  formatBytes,
  formatClock,
  sessionDetailLine,
  sessionKindLabel,
  sessionPhaseLabel,
  type DashboardClip,
  type RosterEntry,
} from "@/lib/recording/dashboard";
import { multiCamKindLabel, type MultiCamSource } from "@/lib/recording/multi";
import type { CaptureSessionView } from "@/lib/recording/sessions";

export function DashboardSignInPrompt() {
  return (
    <div className="text-center py-20">
      <div className="text-4xl mb-4">🔒</div>
      <h1 className="text-2xl font-bold text-white">Sign in to open the recording dashboard</h1>
      <p className="mt-3 text-sm text-slate-400 max-w-md mx-auto">
        The recording dashboard is a VIP Pro feature — your live sessions, clip library and camera
        roster in one room.
      </p>
      <Link
        href="/api/auth/signin?callbackUrl=/recording/dashboard"
        className="inline-block mt-6 px-8 py-3 rounded-2xl font-mono font-bold text-[#04121f]"
        style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)" }}>
        Sign in
      </Link>
    </div>
  );
}

/**
 * What a Pro subscriber sees instead of the room. Switching plans is an
 * in-house flow (/settings/subscription swaps the price on the existing
 * subscription), so the call to action goes there — a fresh checkout
 * (TrialPicker) would start a second subscription.
 */
export function VipUpsell() {
  const perks = [
    ["▦", "Record up to 40 cameras at once", "The multi-camera wall, doubled from Pro's 20."],
    ["▤", "Recording dashboard", "Live sessions, library totals and your camera roster in one room — this page."],
    ["◷", "Everything in Pro", "Multi-record, timelapse, the Live wall and your clips library carry over."],
  ];
  return (
    <div className="text-center py-10">
      <div className="inline-block px-3 py-1 rounded-full border border-amber-400/40 text-amber-300 text-[11px] font-mono tracking-[0.25em] mb-5">
        VIP PRO FEATURE
      </div>
      <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
        YOUR RECORDING<br />
        <span className="text-transparent bg-clip-text"
          style={{ backgroundImage: "linear-gradient(135deg,#fbbf24,#D4AF37 45%,#c084fc)" }}>
          CONTROL ROOM
        </span>
      </h1>
      <p className="mt-5 max-w-2xl mx-auto text-slate-300 leading-relaxed">
        The dashboard is part of VIP Pro — the annual plan. Every recording session running right
        now, your whole clip library, and every saved camera's history, at a glance.
      </p>
      <div className="mt-8 grid md:grid-cols-3 gap-3 max-w-3xl mx-auto text-left">
        {perks.map(([icon, t, d]) => (
          <div key={t} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="text-2xl">{icon}</div>
            <div className="mt-2 text-white font-bold text-sm">{t}</div>
            <div className="mt-1 text-xs text-slate-400">{d}</div>
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/settings/subscription"
          className="px-6 py-3 rounded-2xl font-mono font-bold text-[#1a1206]"
          style={{ background: "linear-gradient(135deg,#fbbf24,#D4AF37)" }}>
          Switch to VIP Pro
        </Link>
        <Link
          href="/recording/multi"
          className="px-6 py-3 rounded-2xl font-mono font-bold border border-white/20 text-slate-200 hover:bg-white/5">
          ▦ Back to Multi-record
        </Link>
      </div>
      <p className="mt-6 text-xs text-slate-500 max-w-xl mx-auto leading-relaxed">
        Switching keeps your subscription, your trial dates and your library — only the plan
        changes, on the subscription page.
      </p>
    </div>
  );
}

export function DashboardStat({ label, value, sub, accent }: {
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-5">
      <div className="text-[10px] font-mono tracking-[0.2em] text-slate-500 uppercase">{label}</div>
      <div className="mt-1 text-3xl font-black font-mono" style={{ color: accent }}>{value}</div>
      <div className="mt-1 text-xs text-slate-400">{sub}</div>
    </div>
  );
}

/** One running capture session, with its live elapsed clock and Stop. */
export function SessionCard({ session, elapsedSec, onStop }: {
  session: CaptureSessionView;
  elapsedSec: number;
  onStop: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-white font-bold truncate">{session.cameraName}</div>
          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
            {sessionDetailLine(session)}
          </div>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <span className="px-2 py-0.5 rounded-full bg-violet-400/10 border border-violet-400/30 text-violet-200 text-[10px] font-mono">
            {sessionKindLabel(session)}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
            session.phase === "recording"
              ? "bg-red-500/15 border border-red-400/40 text-red-300 animate-pulse"
              : "bg-cyan-400/10 border border-cyan-400/30 text-cyan-200"
          }`}>
            ● {sessionPhaseLabel(session)} · {formatClock(elapsedSec)}
          </span>
        </div>
      </div>
      {session.notice && (
        <div className="mt-2 text-[11px] font-mono text-amber-200 bg-amber-400/10 border border-amber-400/20 rounded-lg px-2 py-1">
          {session.notice}
        </div>
      )}
      <div className="mt-3 flex justify-end">
        <button
          onClick={() => onStop(session.id)}
          disabled={session.phase === "saving"}
          className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold border border-red-400/40 text-red-200 hover:bg-red-500/10 disabled:opacity-40">
          ■ Stop &amp; save
        </button>
      </div>
    </div>
  );
}

/** One of the newest clips; the thumbnail is the clip's own first frame. */
export function NewestClipCard({ clip: c, thumbUrl, onDevice }: {
  clip: DashboardClip;
  thumbUrl: string | null;
  onDevice: boolean;
}) {
  return (
    <Link
      href="/recording/clips"
      className="block rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden hover:border-cyan-400/50 transition-colors">
      <div className="aspect-video bg-black/60 flex items-center justify-center">
        {thumbUrl ? (
          <video src={thumbUrl} preload="metadata" muted playsInline className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl text-slate-600">🎬</span>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm text-white font-bold truncate">{c.cameraName}</div>
            <div className="text-[11px] font-mono text-slate-500">
              {new Date(c.startedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </div>
          </div>
          <span className="shrink-0 px-2 py-0.5 rounded-full bg-cyan-400/10 border border-cyan-400/30 text-cyan-200 text-[11px] font-mono">
            {formatClock(c.durationSec)}
          </span>
        </div>
        <div className="text-[11px] font-mono text-slate-500 mt-1">
          {formatBytes(c.sizeBytes)}
          {!onDevice && <span className="text-amber-300/90"> · not on this device</span>}
        </div>
      </div>
    </Link>
  );
}

/** One saved camera with its recording history. */
export function RosterRow({ entry, source }: {
  entry: RosterEntry;
  source: MultiCamSource;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-bold text-white truncate">{entry.name}</div>
        <div className="text-[10px] font-mono text-slate-500 truncate">{entry.group}</div>
      </div>
      <div className="shrink-0 flex items-center gap-3">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
          source.kind === "unsupported"
            ? "border-slate-500/40 text-slate-400"
            : "border-emerald-400/40 text-emerald-300"
        }`}>
          {multiCamKindLabel(source)}
        </span>
        <div className="text-right">
          <div className="text-xs font-mono text-slate-300">
            {entry.clipCount} clip{entry.clipCount === 1 ? "" : "s"}
            {entry.clipCount > 0 && <> · {formatClock(entry.totalSecs)}</>}
          </div>
          <div className="text-[10px] font-mono text-slate-500">
            {entry.lastRecordedAt
              ? `last ${new Date(entry.lastRecordedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · ${formatClock(entry.lastDurationSec ?? 0)}`
              : "never recorded"}
          </div>
        </div>
      </div>
    </div>
  );
}
