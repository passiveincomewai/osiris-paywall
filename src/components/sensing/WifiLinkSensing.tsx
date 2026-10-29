"use client";

/**
 * WiFi Link mode for /sensing.
 *
 * The page times fetch probes to /api/sensing-ping (~3 Hz). Each round
 * trip crosses this device's own WiFi link as its first hop, so the
 * timing series carries that link's jitter; the series runs through the
 * RavenScope ping-backend pipeline ported in @/lib/sensing/camera-dsp
 * (RttSensingEngine). Only timings are measured — no payload data about
 * the visitor is collected or stored; the probes are 204 responses.
 *
 * Honest scope (also stated on the page): this senses disturbance of
 * THIS device's link — carrying the device, moving close to it, or
 * movement between it and the router. A device left untouched on a
 * stable link reads LINK QUIET.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  RttSensingEngine,
  WIFI_LINK_LABELS,
  type SensingSnapshot,
} from "@/lib/sensing/camera-dsp";

const PROBE_MS = 333;

type Phase = "running" | "stopped";

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
    .map((code) => WIFI_LINK_LABELS[code as keyof typeof WIFI_LINK_LABELS] ?? code)
    .join(" → ");
}

export default function WifiLinkSensing() {
  const [phase, setPhase] = useState<Phase>("running");
  const [snap, setSnap] = useState<SensingSnapshot | null>(null);
  const [rtt, setRtt] = useState<number | null>(null);
  const [failures, setFailures] = useState(0);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [anomalyAt, setAnomalyAt] = useState(0);

  const engineRef = useRef<RttSensingEngine | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedRef = useRef(false);
  const seenEventsRef = useRef(0);
  const logIdRef = useRef(0);
  const probeCountRef = useRef(0);

  const probe = useCallback(async () => {
    if (stoppedRef.current) return;
    const started = performance.now();
    try {
      const res = await fetch(`/api/sensing-ping?n=${++probeCountRef.current}`, { cache: "no-store" });
      if (!res.ok && res.status !== 204) throw new Error(String(res.status));
      const ms = performance.now() - started;
      setFailures(0);
      setRtt(Math.round(ms * 10) / 10);
      const engine = engineRef.current;
      if (engine) {
        const next = engine.pushRtt(ms, performance.now() / 1000);
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
      }
    } catch {
      setFailures((f) => f + 1);
    }
    if (!stoppedRef.current) {
      const elapsed = performance.now() - started;
      timerRef.current = setTimeout(probe, Math.max(0, PROBE_MS - elapsed));
    }
  }, []);

  const start = useCallback(() => {
    stoppedRef.current = false;
    engineRef.current = new RttSensingEngine(8, performance.now() / 1000);
    seenEventsRef.current = 0;
    setLog([]);
    setSnap(null);
    setPhase("running");
    void probe();
  }, [probe]);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    setPhase("stopped");
  }, []);

  useEffect(() => {
    start();
    return () => {
      stoppedRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const anomalyRecent = anomalyAt > 0 && Date.now() - anomalyAt < 6000;

  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div
          data-testid="sensing-state"
          className={`flex flex-col justify-center rounded-2xl border p-6 ${STATE_STYLES[snap?.state ?? "EMPTY"]}`}
        >
          <p className="text-xs font-semibold tracking-[0.2em] uppercase opacity-70">WiFi link state</p>
          <p className="mt-1 text-4xl font-bold">{snap ? snap.stateLabel : "CALIBRATING"}</p>
          <p className="mt-1 text-sm opacity-80">
            {snap?.calibrating
              ? `Calibrating — leave this device still (${Math.ceil(snap.calibRemaining)}s)`
              : phase === "stopped"
                ? "Paused"
                : `In this state for ${snap ? Math.floor(snap.dwell) : 0}s`}
          </p>
          {failures >= 3 && (
            <p className="mt-2 text-sm text-amber-300">
              Probes are failing — check this device&apos;s connection. No readings are being invented in the meantime.
            </p>
          )}
        </div>

        <div className="grid gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold tracking-[0.2em] text-white/50 uppercase">Round-trip time</p>
            <p className="mt-1 text-3xl font-bold text-white" data-testid="sensing-rtt">
              {rtt !== null ? `${rtt.toFixed(0)} ms` : "—"}
            </p>
            <p className="mt-1 text-xs text-white/50">This device → WorldEye → back, per probe</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold tracking-[0.2em] text-white/50 uppercase">Jitter energy</p>
            <p className="mt-1 text-3xl font-bold text-white" data-testid="sensing-energy">
              {snap ? snap.energy.toFixed(2) : "—"}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-cyan-400 transition-all duration-300"
                style={{ width: `${Math.round((snap?.energy ?? 0) * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-white/50">
              Anomaly z-score: {snap ? snap.z.toFixed(1) : "—"}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-5 max-w-3xl text-sm leading-relaxed text-white/60">
        This mode times tiny requests from this device to WorldEye and back, about three per
        second. The first hop of every trip is your own WiFi link, so its wobble is in the
        timings. Leave the device sitting still and the link reads quiet; pick it up, walk with
        it, or move between it and your router and the disturbance shows. It senses{" "}
        <span className="text-white/85">this device&apos;s link only</span> — not the whole room.
      </p>

      {anomalyRecent && (
        <div className="mt-4 rounded-2xl border border-rose-400/40 bg-rose-400/10 p-4 text-sm font-medium text-rose-200">
          Anomaly flagged — link jitter spiked far above its recent pattern (z-score detector).
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        {phase === "running" ? (
          <button
            onClick={stop}
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10"
          >
            Pause sensing
          </button>
        ) : (
          <button
            onClick={start}
            className="rounded-full bg-cyan-400 px-5 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Resume sensing
          </button>
        )}
        <p className="text-xs text-white/40">Probes are empty 204 responses — nothing about you is sent or stored.</p>
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
  );
}
