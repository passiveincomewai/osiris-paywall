"use client";
/**
 * Global capture indicator: while any persistent capture session runs
 * (lib/recording/sessions), this pill rides along at the corner of the
 * app — camera name, elapsed time, and a Stop that works from anywhere.
 * It sits below the camera viewer itself (which has its own controls)
 * and above ordinary page content. When a session ends — stopped, or
 * on its own at the 24-hour limit, or recovered after an interruption
 * — a one-line note says what happened to the recording.
 */
import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Square, X } from "lucide-react";
import { formatElapsed } from "@/lib/timelapse";
import {
  CAPTURE_PERSISTENCE_COPY,
  captureSessions,
  useCaptureSessions,
  useLastCompletedCapture,
  type CaptureSessionView,
  type CompletedCapture,
} from "@/lib/recording/sessions";

const kindLabel = (s: CaptureSessionView) => (s.kind === "timelapse" ? "TIMELAPSE" : "REC");

function SessionRow({
  s, nowMs, onStop, detailed,
}: {
  s: CaptureSessionView;
  nowMs: number;
  onStop: (id: string) => void;
  detailed?: boolean;
}) {
  const saving = s.phase === "saving";
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="w-2 h-2 shrink-0 rounded-full bg-red-500 animate-pulse" />
      <span className="min-w-0 flex-1 truncate text-[11px] font-mono text-white" title={s.cameraName}>
        {s.cameraName}
      </span>
      <span className="shrink-0 text-[10px] font-mono text-slate-400">{kindLabel(s)}</span>
      <span className="shrink-0 text-[11px] font-mono text-slate-200 tabular-nums">
        {s.phase === "starting" ? "…" : formatElapsed(nowMs - s.startedAt)}
      </span>
      {detailed && s.kind === "timelapse" && (
        <span className="shrink-0 text-[10px] font-mono text-slate-400">
          {s.frameCount} FR
        </span>
      )}
      <button
        onClick={() => onStop(s.id)}
        disabled={saving}
        className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/85 hover:bg-red-500 text-white text-[10px] font-mono font-bold disabled:opacity-60"
        aria-label={`Stop recording ${s.cameraName}`}>
        <Square className="w-2.5 h-2.5" /> {saving ? "SAVING" : "STOP"}
      </button>
    </div>
  );
}

export function CaptureIndicatorView({
  sessions, completed, open, nowMs, onToggle, onStop, onDismissCompleted,
}: {
  sessions: CaptureSessionView[];
  completed: CompletedCapture | null;
  open: boolean;
  nowMs: number;
  onToggle: () => void;
  onStop: (id: string) => void;
  onDismissCompleted: () => void;
}) {
  if (sessions.length === 0 && !completed) return null;
  const multi = sessions.length > 1;
  return (
    <div className="fixed bottom-3 left-3 z-[400] flex flex-col gap-2 max-w-[calc(100vw-1.5rem)]">
      {completed && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-emerald-400/40 bg-black/85 backdrop-blur px-3 py-2 shadow-lg">
          <span className="mt-0.5 w-2 h-2 shrink-0 rounded-full bg-emerald-400" />
          <span className="min-w-0 text-[11px] font-mono text-emerald-100 leading-snug">
            <span className="font-bold">{completed.cameraName}</span> — {completed.detail}
          </span>
          <button
            onClick={onDismissCompleted}
            className="shrink-0 text-slate-400 hover:text-white"
            aria-label="Dismiss recording note">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {sessions.length > 0 && (
        <div
          className="rounded-xl border border-white/15 bg-black/85 backdrop-blur px-3 py-2 shadow-lg"
          title={CAPTURE_PERSISTENCE_COPY}>
          {!multi ? (
            <SessionRow s={sessions[0]} nowMs={nowMs} onStop={onStop} detailed />
          ) : (
            <>
              <button
                onClick={onToggle}
                className="flex w-full items-center gap-2 text-left"
                aria-expanded={open}
                aria-label={`${sessions.length} recordings in progress`}>
                <span className="w-2 h-2 shrink-0 rounded-full bg-red-500 animate-pulse" />
                <span className="flex-1 text-[11px] font-mono font-bold text-white">
                  {sessions.length} RECORDING
                </span>
                <span className="text-[11px] font-mono text-slate-200 tabular-nums">
                  {formatElapsed(nowMs - Math.min(...sessions.map((s) => s.startedAt)))}
                </span>
                {open ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-300" />
                )}
              </button>
              {open && (
                <div className="mt-2 flex flex-col gap-2 border-t border-white/10 pt-2">
                  {sessions.map((s) => (
                    <SessionRow key={s.id} s={s} nowMs={nowMs} onStop={onStop} detailed />
                  ))}
                  <p className="text-[9px] font-mono text-slate-500 leading-snug">
                    {CAPTURE_PERSISTENCE_COPY}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function CaptureIndicator() {
  const sessions = useCaptureSessions();
  const completed = useLastCompletedCapture();
  const [open, setOpen] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  /* A previous visit may have died mid-recording; its segments are
     still on this device — assemble them into the clips library once. */
  useEffect(() => {
    void captureSessions.recoverInterruptedClips();
  }, []);

  useEffect(() => {
    if (sessions.length === 0) return;
    const iv = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [sessions.length]);

  return (
    <CaptureIndicatorView
      sessions={sessions}
      completed={completed}
      open={open}
      nowMs={nowMs}
      onToggle={() => setOpen((o) => !o)}
      onStop={(id) => { void captureSessions.stopSession(id); }}
      onDismissCompleted={() => captureSessions.dismissCompleted()}
    />
  );
}
