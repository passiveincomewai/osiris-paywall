'use client';

// Space Missions — the launch board for the globe's SPACE layer.
//
// Everything shown here derives from /api/launches (Launch Library 2,
// proxied server-side): upcoming + recent launches, pads, countdowns, and
// outcomes exactly as LL2 reports them. Fields LL2 does not publish are
// rendered "—", never filled in.
//
// The replay is a RECONSTRUCTION: a parametric profile computed from the
// pad and the target-orbit class (src/lib/launches/profile.ts). While it
// runs, a permanent banner says so, and nothing in it is presented as the
// vehicle's real position — including for a launch in progress right now.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Map as MlMap } from 'maplibre-gl';
import { ChevronLeft, Pause, Play, Rocket, Satellite, Square, X } from 'lucide-react';
import ExportTease from './ExportTease';
import {
  LAUNCH_SOURCE_LABEL, launchStatusKind,
  type LaunchRecord, type LaunchStatusKind,
} from '@/lib/launches/types';
import { countdownTo, nextLaunch } from '@/lib/launches/countdown';
import { launchPadKey } from '@/lib/launches/normalize';
import {
  buildAscentProfile, isReplayFinished, positionAt, profilePath, replayClockLabel,
  replayEligible, replayEndS, replaySelectionStale,
  REPLAY_BANNER, REPLAY_LEAD_IN_S, REPLAY_NOTE, type AscentProfile,
} from '@/lib/launches/profile';

interface SpaceMissionsPanelProps {
  mapRef: React.RefObject<MlMap | null>;
  setGeo: (source: string, features: any[]) => void;
  upcoming: LaunchRecord[];
  previous: LaunchRecord[];
  stale: boolean;
  loadError: boolean;
  selectedPadKey: string | null;
  selectedLaunchId: string | null;
  onSelectPad: (key: string | null) => void;
  onSelectLaunch: (id: string | null) => void;
  /** How many other bottom-centre chips are up, so this stack sits above them. */
  chipOffsetCount: number;
}

const KIND_COLOR: Record<LaunchStatusKind, string> = {
  go: '#69F0AE',
  tbd: '#FFC107',
  success: '#40C4FF',
  failure: '#FF5252',
  other: '#B388FF',
};

const SPEEDS = [1, 5, 10, 30, 60];

const btnCls =
  'px-2 py-1.5 rounded border border-white/15 text-[10px] font-mono uppercase tracking-wider text-white/70 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-35 disabled:hover:bg-transparent';
const rowCls =
  'w-full text-left rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] px-2 py-1.5 transition-colors';

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatusChip({ launch }: { launch: LaunchRecord }) {
  const kind = launchStatusKind(launch);
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-[8px] font-mono font-bold tracking-[0.12em]"
      style={{ color: KIND_COLOR[kind], border: `1px solid ${KIND_COLOR[kind]}55`, background: `${KIND_COLOR[kind]}14` }}
    >
      {(launch.statusName ?? 'UNKNOWN').toUpperCase()}
    </span>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[8px] font-mono tracking-[0.15em] text-white/35">{label}</div>
      <div className="text-[11px] font-mono text-white/90 truncate" title={typeof value === 'string' ? value : undefined}>{value ?? '—'}</div>
    </div>
  );
}

interface ReplayState {
  launch: LaunchRecord;
  profile: AscentProfile;
  tS: number;
  playing: boolean;
  speed: number;
  cameraFree: boolean;
}

export default function SpaceMissionsPanel({
  mapRef, setGeo, upcoming, previous, stale, loadError,
  selectedPadKey, selectedLaunchId, onSelectPad, onSelectLaunch, chipOffsetCount,
}: SpaceMissionsPanelProps) {
  const [panelOpen, setPanelOpen] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [replay, setReplay] = useState<ReplayState | null>(null);
  const replayRef = useRef<ReplayState | null>(null);
  replayRef.current = replay;

  // One ticking clock drives every countdown on the board.
  useEffect(() => {
    const iv = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  const selectedLaunch = useMemo(
    () => [...upcoming, ...previous].find((l) => l.id === selectedLaunchId) ?? null,
    [upcoming, previous, selectedLaunchId],
  );
  const next = useMemo(() => nextLaunch(upcoming, nowMs), [upcoming, nowMs]);

  const pads = useMemo(() => {
    const map = new Map<string, { key: string; name: string; location: string | null; lat: number; lon: number; upcoming: LaunchRecord[]; previous: LaunchRecord[] }>();
    for (const l of [...upcoming, ...previous]) {
      const key = launchPadKey(l);
      if (!key || l.padLat === null || l.padLon === null) continue;
      let p = map.get(key);
      if (!p) {
        p = { key, name: l.padName ?? 'Launch pad', location: l.padLocation, lat: l.padLat, lon: l.padLon, upcoming: [], previous: [] };
        map.set(key, p);
      }
      (upcoming.includes(l) ? p.upcoming : p.previous).push(l);
    }
    return map;
  }, [upcoming, previous]);
  const selectedPad = selectedPadKey ? pads.get(selectedPadKey) ?? null : null;

  // ── Replay engine ────────────────────────────────────────────────────
  const emitFrame = useCallback((r: ReplayState) => {
    const pos = positionAt(r.profile, r.tS);
    const flown: Array<[number, number]> = [[r.profile.padLon, r.profile.padLat]];
    for (let t = 2; t < r.tS; t += 2) {
      const p = positionAt(r.profile, t);
      flown.push([p.lon, p.lat]);
    }
    if (r.tS > 0) flown.push([pos.lon, pos.lat]);
    setGeo('launch-replay', [
      { type: 'Feature', geometry: { type: 'LineString', coordinates: profilePath(r.profile) }, properties: { kind: 'path' } },
      { type: 'Feature', geometry: { type: 'LineString', coordinates: flown }, properties: { kind: 'flown' } },
      {
        type: 'Feature', geometry: { type: 'Point', coordinates: [pos.lon, pos.lat] },
        properties: { kind: 'rocket', label: r.tS > 0 ? `${Math.round(pos.altitudeKm)} km` : 'PAD', altKm: pos.altitudeKm },
      },
    ]);
    const map = mapRef.current;
    if (map && !r.cameraFree) {
      if (r.tS <= 0) {
        // Countdown: the camera is parked on the pad by whoever entered
        // this phase (start / scrub / refollow fly there) — a per-frame
        // jumpTo here would cancel that flight every frame.
      } else {
        const frac = Math.min(1, pos.altitudeKm / Math.max(1, r.profile.orbit.altitudeKm));
        map.jumpTo({
          center: [pos.lon, pos.lat],
          zoom: 11.5 - frac * 6,
          pitch: 60,
          bearing: r.profile.azimuthDeg,
        });
      }
    }
  }, [mapRef, setGeo]);

  const stopReplay = useCallback(() => {
    replayRef.current = null;
    setReplay(null);
    setGeo('launch-replay', []);
  }, [setGeo]);

  const startReplay = useCallback((launch: LaunchRecord) => {
    const profile = buildAscentProfile(launch);
    if (!profile) return;
    const r: ReplayState = { launch, profile, tS: -REPLAY_LEAD_IN_S, playing: true, speed: 10, cameraFree: false };
    replayRef.current = r;
    setReplay(r);
    emitFrame(r);
    mapRef.current?.flyTo({ center: [profile.padLon, profile.padLat], zoom: 12.5, pitch: 55, bearing: profile.azimuthDeg, duration: 1800 });
  }, [emitFrame, mapRef]);

  // Playback clock: rAF advances the profile time; the frame (GeoJSON +
  // camera) is re-emitted each tick. UI state mirrors at the same rate —
  // the panel subtree is small, and the transport readout stays honest.
  useEffect(() => {
    if (!replay?.playing) return;
    let raf = 0;
    let last = performance.now();
    const step = (t: number) => {
      const r = replayRef.current;
      if (!r || !r.playing) return;
      const dt = Math.min(0.25, (t - last) / 1000);
      last = t;
      const tS = Math.min(replayEndS(r.profile), r.tS + dt * r.speed);
      if (isReplayFinished(r.profile, tS)) {
        // Natural end: the session ends here — it does NOT park in a
        // finished state. State, transport, banner and the drawn
        // reconstruction clear together, so the honesty banner is up
        // exactly while a reconstruction is on screen, never after.
        stopReplay();
        return;
      }
      const nextR = { ...r, tS, playing: true };
      replayRef.current = nextR;
      setReplay(nextR);
      emitFrame(nextR);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [replay?.playing, replay?.launch.id, emitFrame, stopReplay]);

  // Selection moved on — another launch picked, Back to the board, or a
  // different pad opened (board rows or a map pad click; both arrive as
  // props): the replay belongs to the old selection, so it ends with
  // it. Without this the reconstruction, its transport and the honesty
  // banner outlived the selection indefinitely.
  useEffect(() => {
    if (!replay) return;
    if (replaySelectionStale(replay.launch.id, launchPadKey(replay.launch), selectedLaunchId, selectedPadKey)) {
      stopReplay();
    }
  }, [replay, selectedLaunchId, selectedPadKey, stopReplay]);

  // Grabbing the map releases the replay camera (follow contract) —
  // playback continues, the banner stays, the user can re-follow.
  useEffect(() => {
    if (!replay) return;
    const canvas = mapRef.current?.getCanvas();
    if (!canvas) return;
    const onGrab = () => {
      const r = replayRef.current;
      if (r && !r.cameraFree) {
        const nextR = { ...r, cameraFree: true };
        replayRef.current = nextR;
        setReplay(nextR);
      }
    };
    canvas.addEventListener('pointerdown', onGrab);
    canvas.addEventListener('wheel', onGrab, { passive: true });
    return () => {
      canvas.removeEventListener('pointerdown', onGrab);
      canvas.removeEventListener('wheel', onGrab);
    };
  }, [!!replay, mapRef]);

  // Unmount (layer off) clears the replay drawing.
  useEffect(() => () => { setGeo('launch-replay', []); }, [setGeo]);

  const flyToPad = useCallback((lat: number, lon: number) => {
    mapRef.current?.flyTo({ center: [lon, lat], zoom: 11.5, pitch: 45, duration: 2200 });
  }, [mapRef]);

  const viewSatellites = useCallback(() => {
    (window as unknown as { __weEnableSatellites?: () => void }).__weEnableSatellites?.();
    mapRef.current?.flyTo({ zoom: 2.6, duration: 1800 });
  }, [mapRef]);

  // ── Countdown chip + replay banner (bottom-centre stack) ────────────
  const chipBottom = 6 + chipOffsetCount * 4.5;
  const nextCd = next ? countdownTo(next.net, next.netPrecision, nowMs) : null;
  const chipText = loadError
    ? 'LAUNCH DATA UNAVAILABLE — LL2 DID NOT ANSWER'
    : next
      ? `NEXT — ${(next.missionName ?? next.name).toUpperCase().slice(0, 42)} · ${nextCd!.label}${nextCd!.approximate ? ' (NET APPROX)' : ''}${next.padName ? ` · ${next.padName.toUpperCase()}` : ''}${stale ? ' · DATA STALE' : ''}`
      : upcoming.length
        ? 'NO COUNTDOWN AVAILABLE IN FEED'
        : 'LOADING LAUNCH BOARD…';

  return (
    <>
      {/* Board / detail panel */}
      {panelOpen && (
        <div className="absolute left-2 bottom-24 z-[230] w-[324px] max-w-[88vw] max-h-[48vh] overflow-y-auto styled-scrollbar rounded-xl border border-[var(--border-secondary)] bg-black/70 backdrop-blur-md shadow-xl p-3" data-space-missions-panel>
          <div className="flex items-center justify-between mb-1">
            <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-[0.18em] text-[var(--text-primary)]">
              <Rocket className="w-3.5 h-3.5" style={{ color: '#B388FF' }} /> SPACE MISSIONS
            </span>
            <button type="button" onClick={() => { stopReplay(); setPanelOpen(false); }} aria-label="Close space missions panel" className="w-6 h-6 rounded flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <ExportTease surface="satellite" />

          {/* ── Replay transport (rides above whichever view is open) ── */}
          {replay && (
            <div className="mb-2 rounded-lg border border-amber-300/40 bg-amber-300/[0.07] px-2 py-2">
              <div className="text-[9px] font-mono font-bold tracking-[0.14em] text-amber-200">{REPLAY_BANNER}</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[13px] font-mono font-bold text-white tabular-nums">{replayClockLabel(replay.tS)}</span>
                <span className="flex-1 min-w-0 text-[9px] font-mono text-white/50 truncate">
                  {(replay.launch.missionName ?? replay.launch.name)} · {replay.profile.orbit.label} profile · az {Math.round(replay.profile.azimuthDeg)}°
                  {replay.tS > 0 && <> · alt {Math.round(positionAt(replay.profile, replay.tS).altitudeKm)} km</>}
                </span>
              </div>
              <input
                type="range"
                min={-REPLAY_LEAD_IN_S}
                max={replay.profile.orbit.durationS}
                step={0.5}
                value={replay.tS}
                aria-label="Replay timeline"
                onChange={(e) => {
                  const r = replayRef.current;
                  if (!r) return;
                  const nextR = { ...r, tS: Number(e.target.value) };
                  replayRef.current = nextR;
                  setReplay(nextR);
                  emitFrame(nextR);
                  if (nextR.tS <= 0 && !nextR.cameraFree) {
                    mapRef.current?.flyTo({ center: [nextR.profile.padLon, nextR.profile.padLat], zoom: 12.5, pitch: 55, bearing: nextR.profile.azimuthDeg, duration: 900 });
                  }
                }}
                className="w-full mt-1 accent-amber-300"
              />
              <div className="mt-1 flex items-center gap-1.5">
                <button
                  type="button"
                  className={btnCls}
                  onClick={() => {
                    const r = replayRef.current;
                    if (!r) return;
                    const restarting = !r.playing && isReplayFinished(r.profile, r.tS);
                    const nextR = { ...r, playing: !r.playing, tS: restarting ? -REPLAY_LEAD_IN_S : r.tS };
                    replayRef.current = nextR;
                    setReplay(nextR);
                    emitFrame(nextR);
                    if (restarting && !nextR.cameraFree) {
                      mapRef.current?.flyTo({ center: [nextR.profile.padLon, nextR.profile.padLat], zoom: 12.5, pitch: 55, bearing: nextR.profile.azimuthDeg, duration: 1200 });
                    }
                  }}
                >
                  {replay.playing ? <Pause className="w-3 h-3 inline" /> : <Play className="w-3 h-3 inline" />} {replay.playing ? 'Pause' : 'Play'}
                </button>
                <label className="flex items-center gap-1 text-[9px] font-mono text-white/45">
                  SPEED
                  <select
                    value={replay.speed}
                    onChange={(e) => {
                      const r = replayRef.current;
                      if (!r) return;
                      const nextR = { ...r, speed: Number(e.target.value) };
                      replayRef.current = nextR;
                      setReplay(nextR);
                    }}
                    className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-1 text-[10px] font-mono text-white focus:outline-none"
                    aria-label="Replay speed"
                  >
                    {SPEEDS.map((s) => <option key={s} value={s} className="bg-neutral-900">{s}×</option>)}
                  </select>
                </label>
                {replay.cameraFree && (
                  <button type="button" className={btnCls} onClick={() => {
                    const r = replayRef.current;
                    if (!r) return;
                    const nextR = { ...r, cameraFree: false };
                    replayRef.current = nextR;
                    setReplay(nextR);
                    if (nextR.tS <= 0) {
                      mapRef.current?.flyTo({ center: [nextR.profile.padLon, nextR.profile.padLat], zoom: 12.5, pitch: 55, bearing: nextR.profile.azimuthDeg, duration: 900 });
                    } else {
                      emitFrame(nextR);
                    }
                  }}>Follow</button>
                )}
                <button type="button" className={`${btnCls} ml-auto flex items-center gap-1`} onClick={stopReplay}>
                  <Square className="w-3 h-3" /> Stop
                </button>
              </div>
              <p className="mt-1.5 text-[8.5px] leading-relaxed text-amber-100/50">{REPLAY_NOTE}</p>
            </div>
          )}

          {/* ── Views ── */}
          {selectedLaunch ? (
            <div>
              <button type="button" className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-white/40 hover:text-white mb-1.5" onClick={() => onSelectLaunch(null)}>
                <ChevronLeft className="w-3 h-3" /> Back
              </button>
              <div className="flex items-start gap-2">
                <span className="flex-1 min-w-0 text-[12px] font-mono font-bold text-white leading-snug">{selectedLaunch.missionName ?? selectedLaunch.name}</span>
                <StatusChip launch={selectedLaunch} />
              </div>
              {selectedLaunch.missionName && selectedLaunch.name !== selectedLaunch.missionName && (
                <div className="text-[9px] font-mono text-white/40 mt-0.5">{selectedLaunch.name}</div>
              )}
              {Date.parse(selectedLaunch.net ?? '') > nowMs - 3600_000 && (
                <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-center">
                  <span className="text-[16px] font-mono font-bold tabular-nums" style={{ color: '#B388FF' }}>
                    {countdownTo(selectedLaunch.net, selectedLaunch.netPrecision, nowMs).label}
                  </span>
                  {countdownTo(selectedLaunch.net, selectedLaunch.netPrecision, nowMs).approximate && (
                    <span className="block text-[8px] font-mono text-white/35">NET KNOWN ONLY APPROXIMATELY — COUNTDOWN IS TO THE PUBLISHED DATE</span>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-2.5">
                <Field label="ROCKET" value={selectedLaunch.rocketName} />
                <Field label="PROVIDER" value={selectedLaunch.providerName} />
                <Field label="PAD" value={selectedLaunch.padName} />
                <Field label="LOCATION" value={selectedLaunch.padLocation} />
                <Field label="NET" value={selectedLaunch.net ? `${fmtDate(selectedLaunch.net)} local` : null} />
                <Field label="TARGET ORBIT" value={selectedLaunch.orbitName} />
                <Field label="PROBABILITY" value={selectedLaunch.probability !== null ? `${selectedLaunch.probability}%` : null} />
                <Field label="PROGRAM" value={selectedLaunch.programs.length ? selectedLaunch.programs.join(', ') : null} />
              </div>
              {selectedLaunch.windowStart && selectedLaunch.windowEnd && (
                <div className="mt-2 text-[9px] font-mono text-white/40">
                  WINDOW {fmtDate(selectedLaunch.windowStart)} → {fmtDate(selectedLaunch.windowEnd)}
                </div>
              )}
              {selectedLaunch.failReason && (
                <p className="mt-2 text-[10px] leading-relaxed text-red-200/80">FAILURE — {selectedLaunch.failReason}</p>
              )}
              {selectedLaunch.holdReason && (
                <p className="mt-2 text-[10px] leading-relaxed text-amber-200/80">HOLD — {selectedLaunch.holdReason}</p>
              )}
              {selectedLaunch.missionDescription && (
                <p className="mt-2 text-[10px] leading-relaxed text-white/60">{selectedLaunch.missionDescription}</p>
              )}
              <div className="mt-3 flex flex-col gap-1.5">
                {replayEligible(selectedLaunch) && (
                  <button type="button" className={`${btnCls} w-full flex items-center justify-center gap-1.5`} style={{ borderColor: 'rgba(255,179,0,0.4)', color: '#FFD54F' }} onClick={() => startReplay(selectedLaunch)}>
                    <Play className="w-3 h-3" /> Replay launch — reconstructed estimate
                  </button>
                )}
                {selectedLaunch.padLat !== null && selectedLaunch.padLon !== null && (
                  <button type="button" className={`${btnCls} w-full`} onClick={() => flyToPad(selectedLaunch.padLat!, selectedLaunch.padLon!)}>
                    Fly to pad
                  </button>
                )}
                <button type="button" className={`${btnCls} w-full flex items-center justify-center gap-1.5`} onClick={viewSatellites}>
                  <Satellite className="w-3 h-3" /> View satellites
                </button>
                {selectedLaunch.videoUrl && (
                  <a href={selectedLaunch.videoUrl} target="_blank" rel="noreferrer" className={`${btnCls} w-full text-center block`}>
                    {selectedLaunch.webcastLive ? 'Watch live webcast' : 'Watch webcast'} ↗
                  </a>
                )}
              </div>
              <p className="mt-2 text-[8px] font-mono text-white/30 leading-relaxed">
                “View satellites” opens the live satellite layer — it does not identify this mission’s payload, which is catalogued days after launch.
              </p>
            </div>
          ) : selectedPad ? (
            <div>
              <button type="button" className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-white/40 hover:text-white mb-1.5" onClick={() => onSelectPad(null)}>
                <ChevronLeft className="w-3 h-3" /> All launches
              </button>
              <div className="text-[12px] font-mono font-bold text-white leading-snug">{selectedPad.name}</div>
              <div className="text-[9px] font-mono text-white/40">{selectedPad.location ?? ''}</div>
              {selectedPad.upcoming.length > 0 && (
                <>
                  <div className="mt-2.5 text-[9px] font-mono tracking-[0.18em] text-white/35 uppercase">Upcoming from here</div>
                  <div className="mt-1 flex flex-col gap-1">
                    {selectedPad.upcoming.map((l) => (
                      <button key={l.id} type="button" className={rowCls} onClick={() => onSelectLaunch(l.id)}>
                        <span className="flex items-center gap-2">
                          <span className="flex-1 min-w-0 text-[10px] font-mono text-white/85 truncate">{l.missionName ?? l.name}</span>
                          <StatusChip launch={l} />
                        </span>
                        <span className="block text-[9px] font-mono text-white/40 mt-0.5">
                          {fmtDate(l.net)} · {countdownTo(l.net, l.netPrecision, nowMs).label}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {selectedPad.previous.length > 0 && (
                <>
                  <div className="mt-2.5 text-[9px] font-mono tracking-[0.18em] text-white/35 uppercase">Recent from here</div>
                  <div className="mt-1 flex flex-col gap-1">
                    {selectedPad.previous.map((l) => (
                      <button key={l.id} type="button" className={rowCls} onClick={() => onSelectLaunch(l.id)}>
                        <span className="flex items-center gap-2">
                          <span className="flex-1 min-w-0 text-[10px] font-mono text-white/85 truncate">{l.missionName ?? l.name}</span>
                          <StatusChip launch={l} />
                        </span>
                        <span className="block text-[9px] font-mono text-white/40 mt-0.5">{fmtDate(l.net)}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div>
              {loadError ? (
                <p className="text-[10px] leading-relaxed text-amber-200/80">
                  Launch data is unavailable right now — Launch Library 2 did not answer and no cached copy exists yet. The board will fill in on the next successful fetch.
                </p>
              ) : (
                <>
                  <div className="text-[9px] font-mono tracking-[0.18em] text-white/35 uppercase">Upcoming</div>
                  <div className="mt-1 flex flex-col gap-1">
                    {upcoming.slice(0, 10).map((l) => (
                      <button key={l.id} type="button" className={rowCls} onClick={() => onSelectLaunch(l.id)}>
                        <span className="flex items-center gap-2">
                          <span className="flex-1 min-w-0 text-[10px] font-mono text-white/85 truncate">{l.missionName ?? l.name}</span>
                          <StatusChip launch={l} />
                        </span>
                        <span className="block text-[9px] font-mono text-white/40 mt-0.5">
                          {countdownTo(l.net, l.netPrecision, nowMs).label} · {fmtDate(l.net)}{l.padName ? ` · ${l.padName}` : ''}
                        </span>
                      </button>
                    ))}
                    {!upcoming.length && <p className="text-[10px] text-white/40">Loading…</p>}
                  </div>
                  {previous.length > 0 && (
                    <>
                      <div className="mt-3 text-[9px] font-mono tracking-[0.18em] text-white/35 uppercase">Recent launches</div>
                      <div className="mt-1 flex flex-col gap-1">
                        {previous.slice(0, 8).map((l) => (
                          <button key={l.id} type="button" className={rowCls} onClick={() => onSelectLaunch(l.id)}>
                            <span className="flex items-center gap-2">
                              <span className="flex-1 min-w-0 text-[10px] font-mono text-white/85 truncate">{l.missionName ?? l.name}</span>
                              <StatusChip launch={l} />
                            </span>
                            <span className="block text-[9px] font-mono text-white/40 mt-0.5">{fmtDate(l.net)}{l.padName ? ` · ${l.padName}` : ''}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          <div className="mt-3 pt-2 border-t border-white/10 text-[8px] font-mono text-white/30 leading-relaxed">
            DATA — {LAUNCH_SOURCE_LABEL.toUpperCase()} · THESPACEDVS.COM
            {stale && <span className="text-amber-200/70"> · SHOWING LAST-GOOD DATA (UPSTREAM REFRESH FAILED)</span>}
          </div>
        </div>
      )}
      {!panelOpen && (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="absolute left-2 bottom-24 z-[230] flex items-center gap-2 px-2.5 py-2 rounded-xl border border-[var(--border-secondary)] bg-black/60 backdrop-blur-md shadow-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
          aria-label="Open space missions panel"
        >
          <Rocket className="w-4 h-4" style={{ color: '#B388FF' }} />
          <span className="text-[9px] font-mono tracking-[0.18em]">MISSIONS</span>
        </button>
      )}

      {/* Countdown chip */}
      <div className="absolute left-1/2 z-[120] -translate-x-1/2 px-3 pointer-events-none" style={{ bottom: `${chipBottom}rem` }}>
        <div className="rounded-lg border border-white/10 bg-black/70 backdrop-blur-md px-3 py-2 shadow-xl">
          <p className="text-[11px] font-mono leading-relaxed text-white/60 whitespace-nowrap max-w-[92vw] overflow-hidden text-ellipsis">
            <span className="text-white/90 uppercase tracking-wider">Space Missions</span>
            {' — '}
            <span className="text-white/80">{chipText}</span>
          </p>
        </div>
      </div>

      {/* Replay honesty banner — up for the ENTIRE replay, transport state included */}
      {replay && (
        <div className="absolute left-1/2 z-[250] -translate-x-1/2 px-3 pointer-events-none" style={{ bottom: `${chipBottom + 4.5}rem` }}>
          <div className="rounded-lg border border-amber-300/50 bg-black/80 backdrop-blur-md px-3 py-2 shadow-xl">
            <p className="text-[11px] font-mono font-bold leading-relaxed whitespace-nowrap max-w-[92vw] overflow-hidden text-ellipsis">
              <span className="text-amber-200 tracking-wider">⚠ {REPLAY_BANNER}</span>
              <span className="text-white/60 font-normal"> — {replayClockLabel(replay.tS)} · {(replay.launch.missionName ?? replay.launch.name).toUpperCase().slice(0, 40)}</span>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
