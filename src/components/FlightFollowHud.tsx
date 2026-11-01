'use client';

// Flight Follow HUD — the control cluster shown while the globe camera
// rides with an aircraft (Phase 3.1). It reads the follow snapshot the
// map's render loop writes into hudRef on its own light interval, so the
// 500 ms telemetry refresh never re-renders the (very large) map
// component — only this small panel.
//
// Honesty contract: the permanent tag says this is a TELEMETRY view and
// not an onboard camera, the fix line names the position interpolated
// between real fixes or extrapolated from the last one, and the FIX AGE
// field shows how old the newest underlying fix is. Nothing here may
// imply a live video feed from the aircraft — there isn't one.

import { useEffect, useState } from 'react';
import { Lock, Plane, X } from 'lucide-react';
import TrialPicker from './TrialPicker';
import {
  COCKPIT_IMAGERY_TAG,
  FOLLOW_HONESTY_TAG,
  FOLLOW_MODES,
  FOLLOW_MODE_LABELS,
  type FollowHudData,
  type FollowMode,
} from '@/lib/flights/follow';
import {
  FLIGHT_PATH_FLOWN_LABEL,
  FLIGHT_PATH_LOCK_LABEL,
  FLIGHT_PATH_ROUTE_LABEL,
  FLIGHT_PATH_ROUTE_UNAVAILABLE,
  type FlightPathHudData,
} from '@/lib/flights/path';

interface FlightFollowHudProps {
  /** Latest follow snapshot, written by the map render loop. */
  hudRef: React.RefObject<FollowHudData | null>;
  target: { icao24: string; callsign: string };
  mode: FollowMode;
  onModeChange: (mode: FollowMode) => void;
  /** Exit follow and restore the pre-follow camera. */
  onExit: () => void;
  /** Premium path snapshot (planned route + session trail), updated by
   *  the map at poll cadence. Null hides the section entirely. */
  path?: FlightPathHudData | null;
}

const modeBtnCls =
  'px-2 py-1 rounded border text-[9px] font-mono uppercase tracking-wider transition-colors';

export default function FlightFollowHud({ hudRef, target, mode, onModeChange, onExit, path }: FlightFollowHudProps) {
  const [snap, setSnap] = useState<FollowHudData | null>(null);
  /** The locked path section expands the trial picker in place rather
   *  than navigating away from the follow to /pricing. */
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const read = () => setSnap(hudRef.current);
    read();
    const iv = setInterval(read, 500);
    return () => clearInterval(iv);
  }, [hudRef]);

  const callsign = snap?.callsign || target.callsign;
  const fixAge = snap?.fix ? `${Math.floor(snap.fix.newestFixAgeS)}s` : '—';

  return (
    <div
      className="pointer-events-auto w-[320px] max-w-[88vw] rounded-xl border border-cyan-300/25 bg-black/70 backdrop-blur-md shadow-xl p-3"
      data-flight-follow-hud
    >
      <div className="flex items-center gap-2">
        <Plane className="w-3.5 h-3.5 text-cyan-300 flex-shrink-0" />
        <span className="flex-1 min-w-0 text-[11px] font-mono font-bold tracking-[0.14em] text-white truncate">
          FOLLOWING {callsign}
        </span>
        <span className="text-[9px] font-mono text-white/35 uppercase">{target.icao24}</span>
        <button
          type="button"
          onClick={onExit}
          aria-label="Exit follow and restore view"
          title="Exit follow — restore the view you had before"
          className="w-6 h-6 rounded flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="mt-1.5 text-[8.5px] font-mono leading-relaxed tracking-[0.08em] text-amber-200/75">
        {FOLLOW_HONESTY_TAG}
        {snap?.fix ? ` · ${snap.fix.label}` : ''}
      </p>

      {mode === 'forward' && (
        <p className="mt-1 text-[8.5px] font-mono leading-relaxed tracking-[0.08em] text-cyan-200/70">
          {COCKPIT_IMAGERY_TAG}
        </p>
      )}

      {snap?.missing ? (
        <p className="mt-1.5 text-[9px] font-mono tracking-[0.08em] text-amber-300">
          SIGNAL LOST — HOLDING LAST KNOWN POSITION
        </p>
      ) : !snap ? (
        <p className="mt-1.5 text-[9px] font-mono tracking-[0.08em] text-white/40">
          ACQUIRING TELEMETRY…
        </p>
      ) : null}

      <div className="mt-2 grid grid-cols-4 gap-1.5 text-center">
        {[
          { label: 'ALT', value: snap?.alt != null ? `${Math.round(snap.alt).toLocaleString()} m` : '—' },
          { label: 'SPD', value: snap?.speedKnots != null ? `${Math.round(snap.speedKnots)} kt` : '—' },
          { label: 'HDG', value: snap ? `${Math.round(snap.headingDeg)}°` : '—' },
          { label: 'FIX AGE', value: fixAge },
        ].map((f) => (
          <div key={f.label} className="rounded-md border border-white/10 bg-white/[0.03] px-1 py-1">
            <div className="text-[8px] font-mono tracking-[0.16em] text-white/35">{f.label}</div>
            <div className="text-[10.5px] font-mono text-white/90 tabular-nums truncate">{f.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <div className="flex gap-1" role="group" aria-label="Follow camera mode">
          {FOLLOW_MODES.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => onModeChange(m)}
              className={`${modeBtnCls} ${
                mode === m
                  ? 'border-cyan-300/60 bg-cyan-300/15 text-cyan-100'
                  : 'border-white/15 text-white/55 hover:bg-white/10 hover:text-white'
              }`}
            >
              {FOLLOW_MODE_LABELS[m]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onExit}
          className="ml-auto px-2 py-1 rounded border border-white/20 text-[9px] font-mono uppercase tracking-wider text-white/75 hover:bg-white/10 hover:text-white transition-colors"
        >
          Exit — restore view
        </button>
      </div>

      {path && path.access !== 'pro' && (
        <div className="mt-2 rounded-md border border-amber-300/30 bg-amber-300/[0.06] px-2 py-1.5">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-amber-200/90 flex-shrink-0" />
            <span className="text-[9px] font-mono font-bold tracking-[0.14em] text-amber-100">
              {FLIGHT_PATH_LOCK_LABEL}
            </span>
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              aria-expanded={pickerOpen}
              className="ml-auto px-2 py-0.5 rounded border border-amber-300/50 text-[8.5px] font-mono uppercase tracking-wider text-amber-100 hover:bg-amber-300/15 transition-colors"
            >
              Start free trial
            </button>
          </div>
          <p className="mt-1 text-[8.5px] font-mono leading-relaxed text-white/45">
            See the whole flight path for the aircraft you follow — the scheduled
            route and the track it has actually flown.
          </p>
          {pickerOpen && (
            <div className="mt-2 border-t border-amber-300/20 pt-2">
              <TrialPicker variant="compact" onClose={() => setPickerOpen(false)} />
            </div>
          )}
        </div>
      )}

      {path && path.access === 'pro' && (
        <div className="mt-2 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5" data-flight-path-panel>
          <div className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block w-4 flex-shrink-0 border-t-2 border-dashed border-[#FFB300]"
            />
            <span className="text-[8.5px] font-mono font-bold tracking-[0.14em] text-amber-100">
              {FLIGHT_PATH_ROUTE_LABEL}
            </span>
            {path.routeStatus === 'found' && path.originCode && path.destinationCode ? (
              <span className="ml-auto text-[9px] font-mono text-white/80 tabular-nums">
                {path.originCode} → {path.destinationCode}
                {path.progressPct != null ? ` · ${path.progressPct}%` : ''}
              </span>
            ) : (
              <span className="ml-auto text-[8.5px] font-mono text-white/40">
                {path.routeStatus === 'loading' || path.routeStatus === 'idle'
                  ? 'RESOLVING…'
                  : 'UNAVAILABLE'}
              </span>
            )}
          </div>
          {path.routeStatus === 'found' && path.progressPct != null && (
            <div className="mt-1 h-[3px] rounded bg-white/10 overflow-hidden">
              <div className="h-full bg-[#FFB300]" style={{ width: `${path.progressPct}%` }} />
            </div>
          )}
          {path.routeStatus === 'unavailable' && (
            <p className="mt-1 text-[8.5px] font-mono leading-relaxed tracking-[0.06em] text-amber-200/80">
              {FLIGHT_PATH_ROUTE_UNAVAILABLE}
            </p>
          )}
          <div className="mt-1.5 flex items-center gap-1.5">
            <span aria-hidden className="inline-block w-4 flex-shrink-0 border-t-2 border-[#00E5FF]" />
            <span className="text-[8.5px] font-mono font-bold tracking-[0.14em] text-cyan-100">
              {FLIGHT_PATH_FLOWN_LABEL}
            </span>
            <span className="ml-auto text-[8.5px] font-mono text-white/40 tabular-nums">
              {path.trailPoints > 0
                ? `${path.trailPoints} FIX${path.trailPoints === 1 ? '' : 'ES'} SINCE FOLLOW STARTED`
                : 'NO FIXES RECORDED YET'}
            </span>
          </div>
        </div>
      )}
      <p className="mt-1.5 text-[8.5px] font-mono text-white/30">
        Drag the map to release the follow and keep the camera where it is.
      </p>
    </div>
  );
}
