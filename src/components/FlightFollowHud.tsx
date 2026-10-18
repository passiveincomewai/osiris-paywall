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
import { Plane, X } from 'lucide-react';
import {
  FOLLOW_HONESTY_TAG,
  FOLLOW_MODES,
  FOLLOW_MODE_LABELS,
  type FollowHudData,
  type FollowMode,
} from '@/lib/flights/follow';

interface FlightFollowHudProps {
  /** Latest follow snapshot, written by the map render loop. */
  hudRef: React.RefObject<FollowHudData | null>;
  target: { icao24: string; callsign: string };
  mode: FollowMode;
  onModeChange: (mode: FollowMode) => void;
  /** Exit follow and restore the pre-follow camera. */
  onExit: () => void;
}

const modeBtnCls =
  'px-2 py-1 rounded border text-[9px] font-mono uppercase tracking-wider transition-colors';

export default function FlightFollowHud({ hudRef, target, mode, onModeChange, onExit }: FlightFollowHudProps) {
  const [snap, setSnap] = useState<FollowHudData | null>(null);

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
      <p className="mt-1.5 text-[8.5px] font-mono text-white/30">
        Drag the map to release the follow and keep the camera where it is.
      </p>
    </div>
  );
}
