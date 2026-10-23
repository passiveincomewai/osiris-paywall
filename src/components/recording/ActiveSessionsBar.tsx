"use client";
/**
 * "Recording now" — the capture sessions that are running but are NOT
 * owned by the page you're standing on.
 *
 * Recordings live in the capture-session layer (lib/recording/
 * sessions), which outlives any one page: a timelapse started from the
 * globe, a clip started from My Cameras. The walls, though, render
 * tiles from their own selection state — so a camera could be
 * recording (the global pill said "6 RECORDING") while the wall showed
 * "1/40 selected" and no sign of the other five. This bar closes that
 * gap on every studio surface: every running session is present,
 * named, timed, health-checked (frames kept / misses / segments —
 * the session layer's own figures), and stoppable from here.
 */
import { useEffect, useState } from "react";
import { Square } from "lucide-react";
import {
  captureSessions,
  useCaptureSessions,
  type CaptureSessionView,
} from "@/lib/recording/sessions";
import { sessionDetailLine, sessionKindLabel } from "@/lib/recording/dashboard";
import { formatElapsed } from "@/lib/timelapse";

export function ActiveSessionsBarView({
  sessions,
  nowMs,
  title,
  onStop,
}: {
  sessions: CaptureSessionView[];
  nowMs: number;
  title: string;
  onStop: (id: string) => void;
}) {
  if (sessions.length === 0) return null;
  return (
    <section
      aria-label={title}
      className="rounded-2xl border border-red-400/25 bg-red-950/20 p-4 space-y-2 min-w-0"
    >
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
        <h2 className="text-[11px] font-mono tracking-[0.2em] text-red-200 uppercase">
          {title} · {sessions.length}
        </h2>
      </div>
      <ul className="space-y-1.5">
        {sessions.map((s) => {
          const saving = s.phase === "saving";
          return (
            <li
              key={s.id}
              className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-black/30 px-3 py-2 min-w-0"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-white" title={s.cameraName}>
                  {s.cameraName}
                </span>
                <span className="block truncate text-[11px] font-mono text-slate-400">
                  {sessionKindLabel(s)} · {sessionDetailLine(s, nowMs)}
                  {s.notice ? ` · ${s.notice}` : ""}
                </span>
              </span>
              <span className="shrink-0 text-[11px] font-mono text-slate-300 tabular-nums">
                {s.phase === "starting" ? "…" : formatElapsed(nowMs - s.startedAt)}
              </span>
              <button
                onClick={() => onStop(s.id)}
                disabled={saving}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/85 hover:bg-red-500 text-white text-[11px] font-mono font-bold disabled:opacity-60"
                aria-label={`Stop recording ${s.cameraName}`}
              >
                <Square className="w-3 h-3" /> {saving ? "SAVING" : "STOP"}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function ActiveSessionsBar({
  title = "Recording now",
  excludeClipCameraIds = [],
}: {
  title?: string;
  /** Saved-camera ids whose clip sessions the page already shows on
   *  its own tiles (the Live wall) — those are not duplicated here.
   *  Timelapse sessions are never excluded: no tile renders them. */
  excludeClipCameraIds?: string[];
}) {
  const sessions = useCaptureSessions();
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);
  const shown = sessions.filter(
    (s) => !(s.kind === "clip" && excludeClipCameraIds.includes(s.cameraId)),
  );
  return (
    <ActiveSessionsBarView
      sessions={shown}
      nowMs={nowMs}
      title={title}
      onStop={(id) => void captureSessions.stopSession(id)}
    />
  );
}
