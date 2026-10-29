"use client";

/**
 * RavenScope mode for /sensing — an OPTIONAL extra (never the default tab;
 * WiFi Link is): the full RSSI sensing experience for a laptop/desktop
 * visitor who runs the free RavenScope program on their own computer.
 * This page connects from the visitor's browser directly to that local
 * program (http://127.0.0.1:8731, its /api/state probe and /api/stream
 * SSE). Nothing passes through WorldEye's servers. The absent state leads
 * with the no-download modes so nobody reads this tab as "the tool isn't
 * working"; the setup steps stay below, clearly optional.
 *
 * When a RavenScope answers, this renders its full dashboard — the same
 * information architecture as RavenScope's own built-in dashboard, fed
 * entirely by fields its feed actually emits (engine Snapshot + the
 * /api/history log):
 *   - room state with dwell, motion-energy bar, and the live energy
 *     trace (primed from /api/history samples, then streamed),
 *   - an illuminator scope: per-access-point dots sized by their motion
 *     energy, plus the coarse left/center/right sector energies,
 *   - the illuminator list: per-link RSSI (in the feed's unit), motion
 *     energy, coherence and reliability,
 *   - the activity timeline: state transitions and anomaly flags, seeded
 *     from the local log and extended live over SSE,
 *   - the occupancy profile: average motion energy by hour of day over
 *     the last 7 days, from RavenScope's log,
 *   - capability chips that state plainly what RSSI can and cannot do.
 *
 * Honesty (matches RavenScope's own): signal strength carries presence
 * and movement disturbance only. Breathing, heart rate, people counting,
 * sleep and pose need the radio's raw channel data (CSI) and are shown
 * as NOT available from this feed — never implied, never estimated.
 *
 * Setup reality (stated plainly in the UI): stock RavenScope sends no
 * CORS header, so browsers block web pages from reading it. The fix is
 * the one-file WorldEye connector (public/sensing/ravenscope-web.py),
 * which runs the identical RavenScope program with that single header
 * added. The instructions below include it rather than pretending the
 * stock command alone is enough for a web page.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  RAVENSCOPE_BASE,
  fetchRavenHistory,
  parseRavenEvent,
  parseRavenSnapshot,
  probeRavenScope,
  type RavenSnapshot,
} from "@/lib/sensing/ravenscope";
import TraceChart, { type TracePoint } from "./TraceChart";

type Phase = "probing" | "live" | "absent";

interface LogEntry {
  id: number;
  kind: string;
  text: string;
  time: string;
}

const STATE_STYLES: Record<string, string> = {
  EMPTY: "text-slate-300 border-slate-500/40 bg-slate-500/10",
  STILL: "text-sky-300 border-sky-400/40 bg-sky-400/10",
  MOTION: "text-amber-300 border-amber-400/40 bg-amber-400/10",
  ACTIVE: "text-rose-300 border-rose-400/40 bg-rose-400/10",
};

const STATE_PLAIN: Record<string, string> = {
  EMPTY: "EMPTY — no presence sensed",
  STILL: "STILL — presence, no movement",
  MOTION: "MOTION — movement in the room",
  ACTIVE: "ACTIVE — strong, continuous movement",
};

/** RavenScope's own state thresholds (state.py StateConfig defaults). */
const TRACE_THRESHOLDS = [
  { value: 0.1, label: "still" },
  { value: 0.28, label: "motion" },
  { value: 0.62, label: "active" },
];

const SECTOR_NAMES = ["left", "center", "right"] as const;

function fmtDwell(s: number): string {
  const t = Math.max(0, Math.round(s));
  if (t < 60) return `${t}s`;
  const m = Math.floor(t / 60);
  if (m < 60) return `${m}m ${t % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function prettyTransition(detail: string): string {
  return detail.split("->").join(" → ");
}

function toEntry(id: number, kind: string, detail: string, tsSeconds: number): LogEntry {
  return {
    id,
    kind,
    text:
      kind === "anomaly"
        ? `Anomaly flagged (${detail})`
        : `State change: ${prettyTransition(detail)}`,
    time: new Date((tsSeconds > 0 ? tsSeconds : Date.now() / 1000) * 1000).toLocaleTimeString(),
  };
}

/**
 * Illuminator scope — RavenScope's radar disc, reduced to what the feed
 * supports: one dot per heard access point, placed around the disc in
 * feed order, sized and brightened by that link's live motion energy.
 * It is a signal view, not a floor plan: dot position carries no
 * geography beyond what the sector chips state.
 */
function SectorScope({ snap }: { snap: RavenSnapshot }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const key = snap.links.map((l) => `${l.bssid}:${l.energy.toFixed(3)}`).join("|");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = canvas.clientWidth || 260;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(size * dpr)) {
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cx = size / 2;
    const cy = size / 2;
    const R = size / 2 - 8;
    ctx.clearRect(0, 0, size, size);

    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    for (let k = 1; k <= 3; k++) {
      ctx.beginPath();
      ctx.arc(cx, cy, (R * k) / 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - R, cy);
    ctx.lineTo(cx + R, cy);
    ctx.moveTo(cx, cy - R);
    ctx.lineTo(cx, cy + R);
    ctx.stroke();

    const links = snap.links;
    const n = Math.max(1, links.length);
    links.forEach((lk, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const rr = R * 0.78;
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      const e = Math.max(0, Math.min(1, lk.energy || 0));
      ctx.beginPath();
      ctx.arc(x, y, 3 + e * 9, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(34,211,238,${0.22 + 0.62 * e})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fillStyle = "#e0f7ff";
      ctx.fill();
    });

    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#6aa8ff";
    ctx.fill();
  }, [key, snap.links]);

  return (
    <canvas
      ref={canvasRef}
      className="mx-auto block aspect-square w-full max-w-[260px]"
      role="img"
      aria-label="Scope view: one dot per WiFi access point heard, sized by its motion energy"
    />
  );
}

export default function RavenScopeSensing() {
  const [phase, setPhase] = useState<Phase>("probing");
  const [snap, setSnap] = useState<RavenSnapshot | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [occupancy, setOccupancy] = useState<number[] | null>(null);
  const [rate, setRate] = useState<string>("");

  const esRef = useRef<EventSource | null>(null);
  const logIdRef = useRef(0);
  const traceRef = useRef<TracePoint[]>([]);
  const ticksRef = useRef<number[]>([]);
  const calibTotalRef = useRef(0);
  const seqRef = useRef(0);

  const noteTick = useCallback(() => {
    const now = performance.now();
    ticksRef.current = [...ticksRef.current.filter((t) => now - t < 4000), now];
  }, []);

  const connect = useCallback(async () => {
    const seq = ++seqRef.current;
    setPhase("probing");
    const first = await probeRavenScope();
    if (seqRef.current !== seq) return;
    if (!first) {
      setPhase("absent");
      return;
    }
    traceRef.current = [{ energy: first.energy, z: first.z }];
    ticksRef.current = [performance.now()];
    calibTotalRef.current = first.calibRemaining;
    setLog([]);
    setOccupancy(null);
    setRate("");
    setSnap(first);
    setPhase("live");

    // Prime the dashboard from RavenScope's local log: the trace starts
    // with the last minutes of real samples instead of an empty chart,
    // the timeline shows what already happened, and the occupancy strip
    // reflects the week. All of it is the program's own recorded data.
    const hist = await fetchRavenHistory();
    if (seqRef.current !== seq) return;
    if (hist) {
      if (hist.samples.length > 1) {
        traceRef.current = [
          ...hist.samples.slice(-600).map((s) => ({ energy: s.energy, z: s.z })),
          { energy: first.energy, z: first.z },
        ];
      }
      if (hist.events.length > 0) {
        setLog(hist.events.slice(0, 40).map((e) => toEntry(++logIdRef.current, e.kind, e.detail, e.ts)));
      }
      if (hist.occupancy.length === 24) setOccupancy(hist.occupancy);
    }

    esRef.current?.close();
    const es = new EventSource(`${RAVENSCOPE_BASE}/api/stream`);
    esRef.current = es;
    es.addEventListener("state", (ev) => {
      const parsed = parseRavenSnapshot(JSON.parse((ev as MessageEvent).data));
      if (!parsed) return;
      traceRef.current = [...traceRef.current.slice(-899), { energy: parsed.energy, z: parsed.z }];
      if (parsed.calibRemaining > calibTotalRef.current) calibTotalRef.current = parsed.calibRemaining;
      noteTick();
      setSnap(parsed);
    });
    es.addEventListener("event", (ev) => {
      const parsed = parseRavenEvent(JSON.parse((ev as MessageEvent).data));
      if (!parsed) return;
      const entry = toEntry(++logIdRef.current, parsed.kind, parsed.detail, parsed.ts);
      setLog((old) => [entry, ...old].slice(0, 40));
    });
    es.onerror = () => {
      // SSE dropped (program stopped, machine slept…). Fall back to the
      // setup panel with a reconnect path rather than freezing on stale
      // values.
      es.close();
      if (seqRef.current === seq) setPhase("absent");
    };
  }, [noteTick]);

  useEffect(() => {
    void connect();
    return () => {
      seqRef.current += 1;
      esRef.current?.close();
    };
  }, [connect]);

  // Snapshot arrival rate (RavenScope's dashboard shows the same figure).
  useEffect(() => {
    if (phase !== "live") return;
    const id = setInterval(() => {
      const now = performance.now();
      ticksRef.current = ticksRef.current.filter((t) => now - t < 4000);
      const n = ticksRef.current.length;
      if (n > 1) {
        const span = (now - ticksRef.current[0]) / 1000;
        if (span > 0) setRate((n / span).toFixed(1));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  if (phase !== "live" || !snap) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white">
          {phase === "probing" ? "Looking for RavenScope on this computer…" : "Optional extra — RavenScope on a computer"}
        </h2>
        {phase === "absent" && (
          <>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/70">
              You don&apos;t need this to sense. The WiFi Link and Camera modes work right here in
              the browser — on phones and laptops alike — with nothing to download or install, and
              WiFi Link starts on its own. RavenScope is an optional extra for desktop users who
              want router-level readings: a free program (Python 3, nothing to install) that runs
              on your own computer, reads your WiFi signal strength, and senses presence and motion
              in the room that computer is in.
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/70">
              No RavenScope answered on this computer. If you want to try the extra, two steps and
              this tab lights up with its real feed:
            </p>
            <ol className="mt-4 space-y-3 text-sm leading-relaxed text-white/80">
              <li>
                <span className="font-semibold text-white">1.</span> Clone RavenScope:{" "}
                <code className="rounded bg-black/40 px-2 py-0.5 font-mono text-[13px] text-cyan-200">
                  git clone https://github.com/tmanish/raven-scope
                </code>
              </li>
              <li>
                <span className="font-semibold text-white">2.</span> Save the{" "}
                <a
                  href="/sensing/ravenscope-web.py"
                  download
                  className="text-cyan-300 underline decoration-dotted underline-offset-2"
                >
                  WorldEye connector file
                </a>{" "}
                into that folder and run:{" "}
                <code className="rounded bg-black/40 px-2 py-0.5 font-mono text-[13px] text-cyan-200">
                  python3 ravenscope-web.py
                </code>
              </li>
            </ol>
            <p className="mt-4 max-w-3xl text-xs leading-relaxed text-white/50">
              Why the connector file? RavenScope by itself does not send the permission header web
              browsers require, so no web page is allowed to read it. The connector is one small
              file that runs the identical RavenScope program and adds only that header — read it
              before running if you like; it changes nothing about the sensing, and everything
              still stays on your computer. (Plain{" "}
              <code className="font-mono text-white/70">python3 -m ravenscope</code> runs the same
              sensing with RavenScope&apos;s own built-in dashboard instead of this page.)
            </p>
            <button
              onClick={() => void connect()}
              className="mt-5 rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Check again
            </button>
            <p className="mt-3 text-xs text-white/40">
              On a phone or tablet there is no local program to connect to — use the WiFi Link or
              Camera mode instead.
            </p>
          </>
        )}
        {phase === "probing" && (
          <p className="mt-2 text-sm text-white/60">
            Checking http://127.0.0.1:8731 — if RavenScope is already running with the connector,
            the live feed appears here with no clicks.
          </p>
        )}
      </div>
    );
  }

  const directionOk = (snap.nReliable || snap.nLinks) >= 2;
  const calibTotal = Math.max(calibTotalRef.current, snap.calibRemaining, 1);
  const calibPct = Math.max(0, Math.min(100, 100 * (1 - snap.calibRemaining / calibTotal)));
  const occMax = occupancy ? Math.max(0.01, ...occupancy) : 0;

  return (
    <div>
      <p className="max-w-3xl text-sm leading-relaxed text-white/60">
        Connected to RavenScope on this computer ({snap.backendDesc || "RSSI sensing"}). It reads
        the signal strength of the WiFi networks this computer can hear and senses presence and
        motion in its room. The data flows from the program to this browser tab on this machine —
        WorldEye&apos;s servers are not involved.
      </p>

      {/* status strip */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-white/50">
        <span className="inline-flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${snap.calibrating ? "bg-amber-400" : "bg-emerald-400 animate-pulse"}`}
            aria-hidden="true"
          />
          <span className="font-semibold tracking-widest text-white/80">
            {snap.calibrating ? "CALIBRATING" : "LIVE"}
          </span>
        </span>
        <span>{snap.backendDesc || snap.backend || "RavenScope"}</span>
        {rate && <span>{rate} Hz</span>}
        <span>
          {snap.nReliable}/{snap.nLinks} links reliable
        </span>
        <span>unit {snap.unit}</span>
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[1.55fr_1fr]">
        {/* LEFT column */}
        <div className="grid gap-4">
          <div
            data-testid="sensing-state"
            className={`rounded-2xl border p-6 ${STATE_STYLES[snap.state]}`}
          >
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase opacity-70">Room state — RavenScope</p>
              <p className="shrink-0 font-mono text-xs opacity-70">
                energy <span data-testid="sensing-energy">{snap.energy.toFixed(2)}</span> · z {snap.z.toFixed(1)}
              </p>
            </div>
            <p className="mt-1 text-4xl font-bold">{snap.state}</p>
            <p className="mt-1 text-sm opacity-80">
              {snap.calibrating
                ? `Calibrating — RavenScope is learning the quiet room (${Math.ceil(snap.calibRemaining)}s)`
                : `${STATE_PLAIN[snap.state]} · in this state for ${fmtDwell(snap.dwell)}`}
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-cyan-400 transition-all duration-300"
                style={{ width: `${Math.round(snap.energy * 100)}%` }}
              />
            </div>
            <div className="mt-4">
              <TraceChart
                dataRef={traceRef}
                thresholds={TRACE_THRESHOLDS}
                height={170}
                ariaLabel="Live trace of RavenScope motion energy, with still, motion and active thresholds and anomaly markers"
              />
            </div>
            {snap.calibrating && (
              <div className="mt-3">
                <p className="font-mono text-xs text-amber-300">
                  Calibrating — keep the room still ({Math.ceil(snap.calibRemaining)}s)
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-300"
                    style={{ width: `${calibPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold tracking-[0.2em] text-white/50 uppercase">
              WiFi links heard ({snap.nReliable}/{snap.nLinks} reliable)
            </p>
            {snap.links.length === 0 ? (
              <p className="mt-2 text-sm text-white/50">No links reported yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {snap.links.map((l, i) => (
                  <li key={l.bssid || i} className={l.reliable ? "" : "opacity-40"}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm text-white/85">
                        {l.ssid}
                        {l.bssid && <span className="ml-2 font-mono text-[10px] text-white/35">{l.bssid}</span>}
                      </span>
                      <span className="shrink-0 font-mono text-xs text-white/50">
                        {l.rssi.toFixed(0)} {snap.unit}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-cyan-400/80 transition-all duration-300"
                          style={{ width: `${Math.round(l.energy * 100)}%` }}
                        />
                      </div>
                      <span className="shrink-0 font-mono text-[11px] text-white/45">
                        energy {l.energy.toFixed(2)} · coherence {l.coherence.toFixed(2)} · {l.reliable ? "reliable" : "noisy"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-white/40">
              Each bar is that access point&apos;s motion energy — the wobble in its signal strength
              as bodies disturb it.
            </p>
          </div>

          {occupancy && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs font-semibold tracking-[0.2em] text-white/50 uppercase">
                Occupancy rhythm — last 7 days
              </p>
              <div
                className="mt-3 grid gap-[3px]"
                style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
                role="img"
                aria-label="Average motion energy by hour of day"
              >
                {occupancy.map((v, h) => {
                  const f = v / occMax;
                  return (
                    <div
                      key={h}
                      title={`${String(h).padStart(2, "0")}:00 — ${v.toFixed(2)}`}
                      className="aspect-square rounded-[3px]"
                      style={{
                        background:
                          v <= 0 ? "rgba(255,255,255,0.05)" : `rgba(34,211,238,${0.12 + 0.78 * f})`,
                      }}
                    />
                  );
                })}
              </div>
              <div className="mt-1.5 flex justify-between font-mono text-[10px] text-white/35">
                <span>00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>23:00</span>
              </div>
              <p className="mt-2 text-xs text-white/40">
                Average motion energy by hour of day, from RavenScope&apos;s log on this computer.
              </p>
            </div>
          )}
        </div>

        {/* RIGHT column */}
        <div className="grid gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold tracking-[0.2em] text-white/50 uppercase">
              Direction — strongest motion
            </p>
            <div className="mt-3">
              <SectorScope snap={snap} />
            </div>
            <div className="mt-3 flex gap-1.5" data-testid="sensing-sector">
              {SECTOR_NAMES.map((name, i) => (
                <div
                  key={name}
                  className={`flex-1 rounded-lg border px-2 py-2 text-center text-xs font-semibold capitalize ${
                    directionOk && snap.sector === name && snap.energy > 0.1 && !snap.calibrating
                      ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-200"
                      : "border-white/10 bg-white/5 text-white/40"
                  }`}
                >
                  {name}
                  <span className="block text-[10px] font-normal opacity-70">
                    {directionOk ? (snap.sectors[i] ?? 0).toFixed(2) : "—"}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-white/50">
              {directionOk
                ? `Coarse sector by access-point group, as RavenScope reports it (confidence ${snap.sectorConf.toFixed(2)}). The scope dots are the heard access points, sized by their motion energy — a signal view, not a floor plan.`
                : "Direction needs at least 2 reliable links — with fewer, RavenScope reports overall presence and motion only."}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold tracking-[0.2em] text-white/50 uppercase">Activity</p>
            {log.length === 0 ? (
              <p className="mt-2 text-sm text-white/50">State changes and anomaly flags from RavenScope will appear here.</p>
            ) : (
              <ul className="mt-2 max-h-[300px] space-y-1.5 overflow-y-auto pr-1" data-testid="sensing-log">
                {log.map((e) => (
                  <li key={e.id} className="flex items-baseline justify-between gap-4 text-sm">
                    <span className={e.kind === "anomaly" ? "text-rose-300" : "text-white/80"}>
                      <span className="mr-2 font-mono text-[10px] font-semibold tracking-wider uppercase opacity-70">
                        {e.kind === "anomaly" ? "Anomaly" : "State"}
                      </span>
                      {e.text}
                    </span>
                    <span className="shrink-0 text-xs text-white/40">{e.time}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold tracking-[0.2em] text-white/50 uppercase">
              What this feed can sense
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Presence", "Motion", "Activity level", "Direction (coarse)", "Anomaly flags"].map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/85"
                >
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-300" aria-hidden="true" />
                  {c}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs font-semibold tracking-[0.2em] text-white/40 uppercase">
              Not possible from signal strength
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {["Breathing", "Heart rate", "People counting", "Sleep", "Pose"].map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-white/[0.02] px-3 py-1.5 text-xs text-white/35"
                >
                  <span className="inline-block h-1.5 w-1.5 rounded-full border border-white/30" aria-hidden="true" />
                  {c}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-white/45">
              RavenScope reads WiFi signal strength (RSSI). That carries presence and movement
              disturbance; the greyed items need the radio&apos;s raw channel data (CSI — for
              example an ESP32 node), which this feed does not carry, so this dashboard never
              estimates them.
            </p>
            {snap.ruviewNote && <p className="mt-2 text-xs italic leading-relaxed text-white/40">{snap.ruviewNote}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
