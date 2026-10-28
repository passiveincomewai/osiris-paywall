'use client';

// Cockpit View overlay — the presentation layer for aircraft follow's
// FORWARD mode (Phase 3.1 follow, lib/flights/follow). While the camera
// rides at the aircraft looking along its heading, this overlay draws
// the canopy frame and the glass instruments: a heading tape, altitude
// and speed tapes. Every value comes from the SAME FollowHudData
// snapshot the follow HUD reads — the followed aircraft's blended fix,
// written by the map's render loop. No new fetches, no second position
// pipeline.
//
// Honesty contract (inherited from the follow brief, and the reason
// the tag lives in THIS overlay and not only in the HUD): this is a
// telemetry viewpoint, not an onboard camera — FOLLOW_HONESTY_TAG and
// the fix interpolation/age line stay on screen for the whole session.
// ADS-B carries no pitch or roll, so there is deliberately NO attitude
// instrument of any kind here: the centre marker is fixed to the
// screen, and the tapes show only what the feed actually reports —
// heading, altitude (metres, the popup's units) and speed (knots).
//
// The overlay is pointer-events-none end to end: the follow contract
// (drag releases, HUD buttons and Exit stay reachable) is untouched —
// the HUD renders above this layer and keeps every control.

import { useEffect, useState } from 'react';
import { FOLLOW_HONESTY_TAG, type FollowHudData } from '@/lib/flights/follow';

interface FlightCockpitOverlayProps {
  /** Latest follow snapshot, written by the map render loop. */
  hudRef: React.RefObject<FollowHudData | null>;
  target: { icao24: string; callsign: string };
}

// ── Tape maths (pure, unit-tested) ────────────────────────────────────

export interface HeadingTick {
  /** Absolute degree this tick marks, 0–359. */
  deg: number;
  /** Signed offset from the current heading, degrees. */
  offsetDeg: number;
  /** Cardinal / 30° label, or null for a minor 5° tick. */
  label: string | null;
  major: boolean;
}

const CARDINALS: Record<number, string> = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };

/** Ticks for a heading tape centred on `headingDeg`, ±60° in 5° steps.
 *  Labels follow the aviation convention: cardinals as letters, other
 *  30° marks as their tens (030 → '03', 240 → '24'). */
export function headingTapeTicks(headingDeg: number): HeadingTick[] {
  const ticks: HeadingTick[] = [];
  for (let offset = -60; offset <= 60; offset += 5) {
    const deg = ((Math.round(headingDeg) + offset) % 360 + 360) % 360;
    const major = deg % 30 === 0;
    ticks.push({
      deg,
      offsetDeg: offset,
      label: major ? (CARDINALS[deg] ?? String(deg / 10).padStart(2, '0')) : null,
      major,
    });
  }
  return ticks;
}

export interface TapeWindow {
  /** The step-rounded value at the tape's centre when frac is 0. */
  base: number;
  /** (value − base) / step, in [−0.5, 0.5] — the sub-step shift. */
  frac: number;
  /** Row values, ascending, base at index halfSpanSteps. */
  rows: number[];
}

/** The visible window of a vertical tape: rows every `step` around the
 *  value, ±halfSpanSteps rows, plus the fractional shift that slides
 *  the column so the exact value sits at the centre line. */
export function tapeWindow(value: number, step: number, halfSpanSteps: number): TapeWindow {
  const base = Math.round(value / step) * step;
  const rows: number[] = [];
  for (let k = -halfSpanSteps; k <= halfSpanSteps; k++) rows.push(base + k * step);
  return { base, frac: (value - base) / step, rows };
}

// ── Vertical tape (ALT / SPD) ─────────────────────────────────────────

const TAPE_ROW_H = 28;

function VerticalTape({
  side,
  label,
  value,
  unit,
  step,
  format,
}: {
  side: 'left' | 'right';
  label: string;
  value: number | null;
  unit: string;
  step: number;
  format: (v: number) => string;
}) {
  const win = value != null && Number.isFinite(value) ? tapeWindow(value, step, 2) : null;
  return (
    <div
      className={`absolute top-1/2 -translate-y-1/2 ${side === 'right' ? 'right-2.5 items-end' : 'left-2.5 items-start'} flex flex-col`}
    >
      <div
        className="relative w-[74px] overflow-hidden rounded-md border border-white/12 bg-black/50 backdrop-blur-sm"
        style={{
          height: TAPE_ROW_H * 4,
          maskImage: 'linear-gradient(to bottom, transparent, black 26%, black 74%, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 26%, black 74%, transparent)',
        }}
      >
        {win && (
          <div
            className="absolute left-0 right-0 flex flex-col-reverse"
            style={{ top: `calc(50% - ${TAPE_ROW_H / 2 + 2 * TAPE_ROW_H}px + ${win.frac * TAPE_ROW_H}px)` }}
          >
            {win.rows.map((v) => (
              <div
                key={v}
                className={`flex items-center px-1.5 font-mono text-[10px] tabular-nums text-white/55 ${
                  side === 'right' ? 'flex-row' : 'flex-row-reverse'
                }`}
                style={{ height: TAPE_ROW_H }}
              >
                <span className={`h-px flex-1 ${side === 'right' ? 'mr-1.5' : 'ml-1.5'} bg-white/25`} />
                {format(v)}
              </div>
            ))}
          </div>
        )}
        <div className="absolute left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2 px-1">
          <div className="rounded border border-amber-200/50 bg-black/80 px-1 py-0.5 text-center">
            <span className="font-mono text-[13px] font-bold tabular-nums text-white">
              {value != null && Number.isFinite(value) ? format(Math.round(value)) : '—'}
            </span>
            <span className="ml-0.5 font-mono text-[8px] tracking-wider text-white/50">{unit}</span>
          </div>
        </div>
      </div>
      <div className="mt-1 px-0.5 font-mono text-[8px] tracking-[0.22em] text-white/45">
        {label} · {unit}
      </div>
    </div>
  );
}

// ── Overlay ───────────────────────────────────────────────────────────

const HDG_PX_PER_DEG = 2.4;

export default function FlightCockpitOverlay({ hudRef, target }: FlightCockpitOverlayProps) {
  // Seeded from the ref so first paint already carries the fix (the
  // HUD snapshot is written by the render loop before this mounts).
  const [snap, setSnap] = useState<FollowHudData | null>(() => hudRef.current);

  useEffect(() => {
    const read = () => setSnap(hudRef.current);
    read();
    const iv = setInterval(read, 250);
    return () => clearInterval(iv);
  }, [hudRef]);

  const callsign = snap?.callsign || target.callsign;
  const heading = snap && Number.isFinite(snap.headingDeg) ? snap.headingDeg : null;
  const fixAge = snap?.fix ? `${Math.floor(snap.fix.newestFixAgeS)}s` : null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[235] overflow-hidden"
      data-flight-cockpit-overlay
      aria-label="Cockpit view overlay"
    >
      {/* Canopy frame: gradient veils + brow, pillars and coaming. */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="cockpit-top" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#04050A" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#04050A" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="cockpit-bottom" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#04050A" stopOpacity="0" />
            <stop offset="100%" stopColor="#04050A" stopOpacity="0.94" />
          </linearGradient>
          <linearGradient id="cockpit-left" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#04050A" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#04050A" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="cockpit-right" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor="#04050A" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#04050A" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="100" height="15" fill="url(#cockpit-top)" />
        <rect x="0" y="82" width="100" height="18" fill="url(#cockpit-bottom)" />
        <rect x="0" y="0" width="8" height="100" fill="url(#cockpit-left)" />
        <rect x="92" y="0" width="8" height="100" fill="url(#cockpit-right)" />
        <path d="M0,0 L100,0 L100,3 Q50,7 0,3 Z" fill="#04050A" opacity="0.55" />
        <path d="M0,100 L0,93.5 Q50,87 100,93.5 L100,100 Z" fill="#04050A" opacity="0.62" />
        <path d="M0,0 L5,0 L2,25 L0,29 Z" fill="#04050A" opacity="0.5" />
        <path d="M100,0 L95,0 L98,25 L100,29 Z" fill="#04050A" opacity="0.5" />
      </svg>
      <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 140px rgba(0,0,0,0.5)' }} />

      {/* Fixed centre marker — a screen reference only. It does not
          move with the aircraft and indicates no attitude. */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30" aria-hidden>
        <svg width="48" height="22" viewBox="0 0 48 22">
          <circle cx="24" cy="11" r="4.5" fill="none" stroke="#FFFFFF" strokeWidth="1.2" />
          <path d="M2,11 L15,11 M33,11 L46,11" stroke="#FFFFFF" strokeWidth="1.2" />
          <path d="M15,11 L15,15 M33,11 L33,15" stroke="#FFFFFF" strokeWidth="1.2" />
        </svg>
      </div>

      {/* Top stack: placard, heading tape, honesty. */}
      <div className="absolute left-1/2 top-0 flex w-full -translate-x-1/2 flex-col items-center px-3 pt-2">
        <div className="rounded-full border border-white/12 bg-black/50 px-2.5 py-0.5 font-mono text-[9px] tracking-[0.22em] text-emerald-100/85 backdrop-blur-sm">
          COCKPIT VIEW · {callsign}
        </div>

        <div
          className="relative mt-1.5 h-[38px] w-[300px] max-w-[74vw] overflow-hidden rounded-b-lg border border-t-0 border-white/12 bg-black/50 backdrop-blur-sm"
          style={{
            maskImage: 'linear-gradient(to right, transparent, black 18%, black 82%, transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 18%, black 82%, transparent)',
          }}
        >
          {heading != null &&
            headingTapeTicks(heading).map((t) => (
              <div
                key={t.deg}
                className="absolute top-0 flex w-10 flex-col items-center"
                style={{ left: `calc(50% + ${t.offsetDeg * HDG_PX_PER_DEG}px)`, transform: 'translateX(-50%)' }}
              >
                {t.label ? (
                  <span className="font-mono text-[9px] font-bold leading-[11px] text-white/85">{t.label}</span>
                ) : (
                  <span className="block h-[11px]" />
                )}
                <span className={`block w-px ${t.major ? 'h-[9px] bg-white/70' : 'h-[6px] bg-white/35'}`} />
              </div>
            ))}
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-amber-300/90" />
        </div>
        <div className="mt-0.5 rounded border border-amber-200/40 bg-black/70 px-1.5 py-px font-mono text-[10px] font-bold tabular-nums text-amber-100">
          HDG {heading != null ? `${String(Math.round(heading)).padStart(3, '0')}°` : '—'}
        </div>

        <p className="mt-1.5 max-w-[92vw] rounded bg-black/40 px-2 py-0.5 text-center font-mono text-[8.5px] leading-relaxed tracking-[0.08em] text-amber-200/80">
          {FOLLOW_HONESTY_TAG}
          {snap?.fix ? ` · ${snap.fix.label} · FIX ${fixAge}` : ''}
        </p>
        {snap?.missing ? (
          <p className="mt-1 font-mono text-[9px] tracking-[0.08em] text-amber-300">
            SIGNAL LOST — HOLDING LAST KNOWN POSITION
          </p>
        ) : !snap ? (
          <p className="mt-1 font-mono text-[9px] tracking-[0.08em] text-white/45">
            ACQUIRING TELEMETRY…
          </p>
        ) : null}
      </div>

      {/* Side tapes: SPD left, ALT right — feed-reported values only. */}
      <VerticalTape side="left" label="SPD" value={snap?.speedKnots ?? null} unit="KT" step={10} format={(v) => String(v)} />
      <VerticalTape
        side="right"
        label="ALT"
        value={snap?.alt ?? null}
        unit="M"
        step={100}
        format={(v) => v.toLocaleString('en-US')}
      />
    </div>
  );
}
