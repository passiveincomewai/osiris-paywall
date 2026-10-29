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
  parseRavenEvent,
  parseRavenSnapshot,
  probeRavenScope,
  type RavenSnapshot,
} from "@/lib/sensing/ravenscope";

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

export default function RavenScopeSensing() {
  const [phase, setPhase] = useState<Phase>("probing");
  const [snap, setSnap] = useState<RavenSnapshot | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const esRef = useRef<EventSource | null>(null);
  const logIdRef = useRef(0);

  const pushLog = useCallback((kind: string, text: string) => {
    const time = new Date().toLocaleTimeString();
    setLog((old) => [{ id: ++logIdRef.current, kind, text, time }, ...old].slice(0, 10));
  }, []);

  const connect = useCallback(async () => {
    setPhase("probing");
    const first = await probeRavenScope();
    if (!first) {
      setPhase("absent");
      return;
    }
    setSnap(first);
    setPhase("live");
    esRef.current?.close();
    const es = new EventSource(`${RAVENSCOPE_BASE}/api/stream`);
    esRef.current = es;
    es.addEventListener("state", (ev) => {
      const parsed = parseRavenSnapshot(JSON.parse((ev as MessageEvent).data));
      if (parsed) setSnap(parsed);
    });
    es.addEventListener("event", (ev) => {
      const parsed = parseRavenEvent(JSON.parse((ev as MessageEvent).data));
      if (!parsed) return;
      pushLog(
        parsed.kind,
        parsed.kind === "transition" ? `State change: ${parsed.detail}` : `Anomaly flagged (${parsed.detail})`,
      );
    });
    es.onerror = () => {
      // SSE dropped (program stopped, machine slept…). Fall back to the
      // setup panel with a reconnect path rather than freezing on stale
      // values.
      es.close();
      setPhase("absent");
    };
  }, [pushLog]);

  useEffect(() => {
    void connect();
    return () => esRef.current?.close();
  }, [connect]);

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

  return (
    <div>
      <p className="max-w-3xl text-sm leading-relaxed text-white/60">
        Connected to RavenScope on this computer ({snap.backendDesc || "RSSI sensing"}). It reads
        the signal strength of the WiFi networks this computer can hear and senses presence and
        motion in its room. The data flows from the program to this browser tab on this machine —
        WorldEye&apos;s servers are not involved.
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div
          data-testid="sensing-state"
          className={`flex flex-col justify-center rounded-2xl border p-6 ${STATE_STYLES[snap.state]}`}
        >
          <p className="text-xs font-semibold tracking-[0.2em] uppercase opacity-70">Room state — RavenScope</p>
          <p className="mt-1 text-4xl font-bold">{snap.state}</p>
          <p className="mt-1 text-sm opacity-80">
            {snap.calibrating
              ? `Calibrating — RavenScope is learning the quiet room (${Math.ceil(snap.calibRemaining)}s)`
              : `${STATE_PLAIN[snap.state]} · in this state for ${Math.floor(snap.dwell)}s`}
          </p>
        </div>

        <div className="grid gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold tracking-[0.2em] text-white/50 uppercase">Motion energy</p>
            <p className="mt-1 text-3xl font-bold text-white" data-testid="sensing-energy">
              {snap.energy.toFixed(2)}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-cyan-400 transition-all duration-300"
                style={{ width: `${Math.round(snap.energy * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-white/50">Anomaly z-score: {snap.z.toFixed(1)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold tracking-[0.2em] text-white/50 uppercase">Strongest motion</p>
            <div className="mt-3 flex gap-1.5" data-testid="sensing-sector">
              {(["left", "center", "right"] as const).map((name, i) => (
                <div
                  key={name}
                  className={`flex-1 rounded-lg border px-2 py-2 text-center text-xs font-semibold capitalize ${
                    snap.sector === name && !snap.calibrating
                      ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-200"
                      : "border-white/10 bg-white/5 text-white/40"
                  }`}
                >
                  {name}
                  <span className="block text-[10px] font-normal opacity-70">
                    {(snap.sectors[i] ?? 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-white/50">Coarse sector by access-point group, as RavenScope reports it.</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs font-semibold tracking-[0.2em] text-white/50 uppercase">
            WiFi links heard ({snap.nReliable}/{snap.nLinks} reliable)
          </p>
          {snap.links.length === 0 ? (
            <p className="mt-2 text-sm text-white/50">No links reported yet.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {snap.links.map((l, i) => (
                <li key={i} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate text-white/80">{l.ssid}</span>
                  <span className="shrink-0 text-xs text-white/40">
                    {l.rssi.toFixed(0)} dBm · energy {l.energy.toFixed(2)} · {l.reliable ? "reliable" : "noisy"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs font-semibold tracking-[0.2em] text-white/50 uppercase">Event log</p>
          {log.length === 0 ? (
            <p className="mt-2 text-sm text-white/50">State changes and anomaly flags from RavenScope will appear here.</p>
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
  );
}
