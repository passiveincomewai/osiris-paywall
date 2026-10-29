"use client";

/**
 * Live camera motion sensor for the /sensing page.
 *
 * Frames are processed entirely on this device: the camera feed is drawn to
 * a small offscreen canvas (96x72), reduced to per-third frame differences,
 * and fed through the RavenScope-ported DSP in @/lib/sensing/camera-dsp.
 * No frame, image or video is uploaded, recorded or stored anywhere — the
 * only thing that leaves this component is nothing at all; the readouts
 * below are computed and displayed locally.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CameraSensingEngine,
  STATE_LABELS,
  type SensingSnapshot,
} from "@/lib/sensing/camera-dsp";

const FRAME_W = 96;
const FRAME_H = 72;
const TICK_MS = 250; // ~4 fps sampling, as documented in camera-dsp.ts

type Phase = "idle" | "starting" | "running" | "denied" | "unsupported" | "stopped";

interface LogEntry {
  id: number;
  kind: "transition" | "anomaly";
  text: string;
  time: string;
}

const STATE_STYLES: Record<string, string> = {
  EMPTY: "text-slate-300 border-slate-500/40 bg-slate-500/10",
  STILL: "text-sky-300 border-sky-400/40 bg-sky-400/10",
  MOTION: "text-amber-300 border-amber-400/40 bg-amber-400/10",
  ACTIVE: "text-rose-300 border-rose-400/40 bg-rose-400/10",
};

function prettyTransition(detail: string): string {
  return detail
    .split("->")
    .map((code) => STATE_LABELS[code as keyof typeof STATE_LABELS] ?? code)
    .join(" → ");
}

export default function CameraSensing() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [snap, setSnap] = useState<SensingSnapshot | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [anomalyAt, setAnomalyAt] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const engineRef = useRef<CameraSensingEngine | null>(null);
  const prevGrayRef = useRef<Uint8Array | null>(null);
  const seenEventsRef = useRef(0);
  const logIdRef = useRef(0);

  const stopTracks = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopTracks, [stopTracks]);

  const tick = useCallback(() => {
    const video = videoRef.current;
    const engine = engineRef.current;
    if (!video || !engine || video.readyState < 2 || video.videoWidth === 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = FRAME_W;
    canvas.height = FRAME_H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, FRAME_W, FRAME_H);
    const data = ctx.getImageData(0, 0, FRAME_W, FRAME_H).data;

    const gray = new Uint8Array(FRAME_W * FRAME_H);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      gray[p] = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
    }

    const prev = prevGrayRef.current;
    prevGrayRef.current = gray;
    if (!prev) return; // first frame has nothing to diff against

    const third = FRAME_W / 3;
    const sums = [0, 0, 0];
    const counts = [0, 0, 0];
    for (let y = 0; y < FRAME_H; y++) {
      for (let x = 0; x < FRAME_W; x++) {
        const idx = y * FRAME_W + x;
        const seg = Math.min(2, Math.floor(x / third));
        sums[seg] += Math.abs(gray[idx] - prev[idx]);
        counts[seg] += 1;
      }
    }
    const mad = sums.map((s, i) => s / counts[i] / 255) as [number, number, number];

    const now = performance.now() / 1000;
    const next = engine.pushFrame(mad, now);
    setSnap(next);

    const fresh = engine.events.slice(seenEventsRef.current);
    if (fresh.length) {
      seenEventsRef.current = engine.events.length;
      const time = new Date().toLocaleTimeString();
      setLog((old) =>
        [
          ...fresh.map((e) => ({
            id: ++logIdRef.current,
            kind: e.kind,
            text: e.kind === "transition" ? prettyTransition(e.detail) : `Anomaly flagged (${e.detail})`,
            time,
          })),
          ...old,
        ].slice(0, 10),
      );
      if (fresh.some((e) => e.kind === "anomaly")) setAnomalyAt(Date.now());
    }
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPhase("unsupported");
      return;
    }
    setPhase("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      engineRef.current = new CameraSensingEngine(8, performance.now() / 1000);
      prevGrayRef.current = null;
      seenEventsRef.current = 0;
      setLog([]);
      setSnap(null);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setPhase("running");
      timerRef.current = setInterval(tick, TICK_MS);
    } catch {
      setPhase("denied");
    }
  }, [tick]);

  const stop = useCallback(() => {
    stopTracks();
    setPhase("stopped");
  }, [stopTracks]);

  const anomalyRecent = Date.now() - anomalyAt < 6000 && anomalyAt > 0;

  return (
    <div className="mt-8">
      {(phase === "idle" || phase === "stopped") && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-white">Start sensing</h2>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-white/70">
            <li>Tap <span className="text-white">Start sensing</span> below and allow camera access.</li>
            <li>Prop this device up facing the room you want to watch.</li>
            <li>Keep the scene still for the 8-second calibration, then walk in and out — the state readout reacts live.</li>
          </ol>
          <p className="mt-3 text-sm text-white/60">
            Your camera is processed on this device only. Nothing is uploaded, recorded or stored.
          </p>
          <button
            onClick={start}
            className="mt-5 rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Start sensing
          </button>
        </div>
      )}

      {phase === "starting" && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
          Waiting for camera permission…
        </div>
      )}

      {phase === "denied" && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-6">
          <h2 className="text-lg font-semibold text-amber-200">Camera access was not allowed</h2>
          <p className="mt-2 text-sm leading-relaxed text-amber-100/80">
            This demo senses motion with your camera, so it cannot run without camera permission.
            Nothing was uploaded or stored. To try again, allow camera access for this site in your
            browser settings, then tap Start sensing.
          </p>
          <button
            onClick={start}
            className="mt-4 rounded-full bg-amber-300 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
          >
            Try again
          </button>
        </div>
      )}

      {phase === "unsupported" && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
          This browser does not expose a camera API, so the on-device sensor cannot run here.
        </div>
      )}

      {/* The live UI stays mounted (hidden until running) so the video
          element — and the stream attached to it — never remounts. */}
      <div className={phase === "running" ? "" : "hidden"}>
        <div>
          <div className="grid gap-4 sm:grid-cols-[240px_1fr]">
            <div className="overflow-hidden rounded-2xl border border-white/10">
              {/* The preview never leaves the device; it is shown so the
                  operator can aim the camera at the room. */}
              <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
            </div>
            <div
              data-testid="sensing-state"
              className={`flex flex-col justify-center rounded-2xl border p-6 ${STATE_STYLES[snap?.state ?? "EMPTY"]}`}
            >
              <p className="text-xs font-semibold tracking-[0.2em] uppercase opacity-70">Room state</p>
              <p className="mt-1 text-4xl font-bold">{snap ? snap.stateLabel : "CALIBRATING"}</p>
              <p className="mt-1 text-sm opacity-80">
                {snap?.calibrating
                  ? `Calibrating — keep the scene still (${Math.ceil(snap.calibRemaining)}s)`
                  : `In this state for ${snap ? Math.floor(snap.dwell) : 0}s`}
              </p>
            </div>
          </div>

          {anomalyRecent && (
            <div className="mt-4 rounded-2xl border border-rose-400/40 bg-rose-400/10 p-4 text-sm font-medium text-rose-200">
              Anomaly flagged — motion energy spiked far above its recent pattern (z-score detector).
            </div>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs font-semibold tracking-[0.2em] text-white/50 uppercase">Motion energy</p>
              <p className="mt-1 text-3xl font-bold text-white" data-testid="sensing-energy">
                {snap ? snap.energy.toFixed(2) : "—"}
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-cyan-400 transition-all duration-300"
                  style={{ width: `${Math.round((snap?.energy ?? 0) * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-white/50">0 = still scene · 1 = constant strong motion</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs font-semibold tracking-[0.2em] text-white/50 uppercase">Where in frame</p>
              <div className="mt-3 flex gap-1.5" data-testid="sensing-sector">
                {(["left", "center", "right"] as const).map((name, i) => (
                  <div
                    key={name}
                    className={`flex-1 rounded-lg border px-2 py-2 text-center text-xs font-semibold capitalize ${
                      snap && snap.sector === name && !snap.calibrating
                        ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-200"
                        : "border-white/10 bg-white/5 text-white/40"
                    }`}
                  >
                    {name}
                    <span className="block text-[10px] font-normal opacity-70">
                      {snap ? snap.sectors[i].toFixed(2) : "—"}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-white/50">
                Coarse cue from the frame thirds — strongest motion wins.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs font-semibold tracking-[0.2em] text-white/50 uppercase">Signal</p>
              <p className="mt-1 text-sm leading-relaxed text-white/70">
                Anomaly z-score: <span className="text-white">{snap ? snap.z.toFixed(1) : "—"}</span>
                <br />
                Camera link: <span className="text-white">{snap && snap.nReliable > 0 ? "reliable" : "settling"}</span>
                <br />
                Source: <span className="text-white">this device&apos;s camera</span>
              </p>
              <button
                onClick={stop}
                className="mt-3 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10"
              >
                Stop sensing
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold tracking-[0.2em] text-white/50 uppercase">Event log</p>
            {log.length === 0 ? (
              <p className="mt-2 text-sm text-white/50">State changes and anomaly flags will appear here.</p>
            ) : (
              <ul className="mt-2 space-y-1.5" data-testid="sensing-log">
                {log.map((e) => (
                  <li key={e.id} className="flex items-baseline justify-between gap-4 text-sm">
                    <span className={e.kind === "anomaly" ? "text-rose-300" : "text-white/80"}>{e.text}</span>
                    <span className="shrink-0 text-xs text-white/40">{e.time}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
