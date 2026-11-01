'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsDown, ChevronsUp, Loader2, LocateFixed, Minus } from 'lucide-react';
import type { Map as MlMap } from 'maplibre-gl';
import { createMapCameraControls, TILT_MAX_PITCH, type CameraMove } from '@/lib/map-camera-controls';
import { type BasemapMode } from '@/lib/basemap-mode';

interface MapControlsProps {
  mapRef: React.RefObject<MlMap | null>;
  onInteract?: () => void;
  /** Day/auto/night basemap choice (free for everyone; the page persists it). */
  basemapMode?: BasemapMode;
  onBasemapModeChange?: (mode: BasemapMode) => void;
  /** Satellite basemap switch — its own toggle, independent of the
   *  day/night switch, and free for everyone (owner's order 2026-10-26). */
  satelliteOn?: boolean;
  onSatelliteToggle?: () => void;
  /** "Use my location" (Item 22) — present only when the page wires a
   *  handler. The tap is the ONLY thing that can start a geolocation
   *  prompt: this component never asks for a position on its own, and
   *  the position itself never reaches it — the page passes back only
   *  the busy flag and, on failure, one calm line of note text. */
  onLocateMe?: () => void;
  locating?: boolean;
  locateNote?: string | null;
}

/** Compact zoom on phones; desktop also gets the held-pan pad.
 *  Desktop layout (owner's order, 2026-10-31): the locate + zoom
 *  cluster moves to the BOTTOM LEFT, enlarged; the pan pad stays on
 *  the right in its own box. Mobile keeps the single bottom-right
 *  column, unchanged. */
export default function MapControls({ mapRef, onInteract, basemapMode = 'auto', onBasemapModeChange, satelliteOn = false, onSatelliteToggle, onLocateMe, locating = false, locateNote = null }: MapControlsProps) {
  const controller = useRef<ReturnType<typeof createMapCameraControls> | null>(null);
  const interact = useRef(onInteract);
  const [limits, setLimits] = useState({ min: false, max: false });
  /** Live pitch for the tilt group: the current angle and the ceiling it
   *  clamps to (the map's own maxPitch, itself capped by TILT_MAX_PITCH). */
  const [pitchView, setPitchView] = useState({ pitch: 0, ceiling: TILT_MAX_PITCH });
  useEffect(() => { interact.current = onInteract; }, [onInteract]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const controls = createMapCameraControls(map, () => interact.current?.(),
      () => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    controller.current = controls;
    const updateLimits = () => setLimits({ min: map.getZoom() <= map.getMinZoom() + 0.001, max: map.getZoom() >= map.getMaxZoom() - 0.001 });
    const updatePitch = () => setPitchView(prev => {
      const next = { pitch: Math.round(map.getPitch()), ceiling: Math.min(TILT_MAX_PITCH, map.getMaxPitch()) };
      return prev.pitch === next.pitch && prev.ceiling === next.ceiling ? prev : next;
    });
    const onHidden = () => { if (document.hidden) controls.release(); };
    updateLimits();
    updatePitch();
    map.on('zoomend', updateLimits);
    map.on('pitch', updatePitch);
    window.addEventListener('blur', controls.release);
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      controls.dispose();
      controller.current = null;
      map.off('zoomend', updateLimits);
      map.off('pitch', updatePitch);
      window.removeEventListener('blur', controls.release);
      document.removeEventListener('visibilitychange', onHidden);
    };
  }, [mapRef]);

  const step = useCallback((move: CameraMove) => controller.current?.step(move), []);
  const press = useCallback((move: CameraMove) => controller.current?.press(move), []);
  const release = useCallback(() => controller.current?.release(), []);
  return (
    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.4 }}
      className="absolute right-2 bottom-[112px] md:left-2 md:bottom-12 z-[240] pointer-events-auto md:pointer-events-none" data-map-controls>
      <div className="flex flex-col items-end gap-[6px] md:flex-row md:items-end md:justify-between">
      {/* The two sliding switches (Day/Night + Satellite view) render
          here ONLY below the md breakpoint: on desktop they moved into
          the globe header (Item 8, 2026-10-29), where no sidebar or
          right-rail panel can cover them. Mobile keeps them here,
          unchanged. */}
      <div className="flex flex-col items-end gap-[6px] md:hidden">
      {onBasemapModeChange && (
        <BasemapSwitch mode={basemapMode} onChange={onBasemapModeChange} />
      )}
      {onSatelliteToggle && (
        <SatelliteSwitch on={satelliteOn} onToggle={onSatelliteToggle} />
      )}
      </div>
      {/* Locate + zoom cluster. Mobile: the rest of the right-hand
          column, exactly as before. Desktop: the row's first item, so
          it lands at the bottom left, left-aligned. */}
      <div className="flex flex-col items-end gap-[6px] md:items-start md:pointer-events-auto">
      {onLocateMe && (
        <>
          <button type="button" onClick={onLocateMe} disabled={locating} aria-busy={locating}
            aria-label="Use my location"
            title="Use my location — fly the globe to where you are"
            className="w-11 h-11 rounded-xl border border-[var(--border-secondary)] bg-black/60 backdrop-blur-md shadow-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-opacity opacity-85 hover:opacity-100 focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--gold-primary)] disabled:opacity-60 touch-none select-none">
            {locating
              ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" strokeWidth={1.5} />
              : <LocateFixed className="w-4 h-4 md:w-5 md:h-5" strokeWidth={1.5} />}
          </button>
          {locateNote && (
            <p role="status"
              className="max-w-[190px] rounded-lg border border-[var(--border-secondary)] bg-black/60 backdrop-blur-md shadow-lg px-2.5 py-1.5 text-right md:text-left text-[11px] leading-snug text-[var(--text-secondary)]">
              {locateNote}
            </p>
          )}
        </>
      )}
      <div role="group" aria-label="Map zoom controls"
        className="flex items-center gap-[3px] p-[3px] rounded-xl border border-[var(--border-secondary)] bg-black/60 backdrop-blur-md shadow-lg transition-opacity opacity-85 hover:opacity-100 focus-within:opacity-100">
        <ZoomArtwork limits={limits} press={press} release={release} step={step} />
      </div>
      {/* Tilt — desktop only, like the pan pad. Pitch used to have NO
          button at all: on a computer the only paths were right-drag /
          Ctrl-drag, where mobile has the two-finger gesture, so the
          angle of the view was effectively undiscoverable. Steps and
          hold run through the same camera controller as zoom and pan,
          clamped in lib/map-camera-controls. */}
      <div className="desktop-only">
        <div role="group" aria-label="Map tilt controls"
          className="flex items-center gap-[3px] p-[3px] rounded-xl border border-[var(--border-secondary)] bg-black/60 backdrop-blur-md shadow-lg transition-opacity opacity-85 hover:opacity-100 focus-within:opacity-100">
          <Btn label="Tilt view up" move={{ kind: 'tilt', dir: 1 }} icon={ChevronsUp} disabled={pitchView.pitch >= pitchView.ceiling} press={press} release={release} step={step} />
          <span aria-hidden="true" className="w-8 text-center font-mono text-[10px] tabular-nums text-[var(--text-secondary)]">{pitchView.pitch}°</span>
          <Btn label="Tilt view down" move={{ kind: 'tilt', dir: -1 }} icon={ChevronsDown} disabled={pitchView.pitch <= 0} press={press} release={release} step={step} />
          <Btn label="Level view — reset tilt" move={{ kind: 'tilt', dir: 0 }} icon={Minus} disabled={pitchView.pitch <= 0} press={press} release={release} step={step} />
        </div>
      </div>
      </div>
      {/* The pan pad, in its own box on the right — the side the
          combined camera-controls box used to occupy. Desktop only,
          as before. */}
      <div className="desktop-only md:pointer-events-auto">
        <div role="group" aria-label="Map pan controls"
          className="flex items-center gap-[3px] p-[3px] rounded-xl border border-[var(--border-secondary)] bg-black/60 backdrop-blur-md shadow-lg transition-opacity opacity-85 hover:opacity-100 focus-within:opacity-100">
          <div className="grid grid-cols-3 grid-rows-3 gap-[3px]">
            <Btn cell="col-start-2 row-start-1" label="Pan north" move={{ kind: 'pan', dx: 0, dy: -1 }} icon={ChevronUp} press={press} release={release} step={step} />
            <Btn cell="col-start-1 row-start-2" label="Pan west" move={{ kind: 'pan', dx: -1, dy: 0 }} icon={ChevronLeft} press={press} release={release} step={step} />
            <Btn cell="col-start-3 row-start-2" label="Pan east" move={{ kind: 'pan', dx: 1, dy: 0 }} icon={ChevronRight} press={press} release={release} step={step} />
            <Btn cell="col-start-2 row-start-3" label="Pan south" move={{ kind: 'pan', dx: 0, dy: 1 }} icon={ChevronDown} press={press} release={release} step={step} />
          </div>
        </div>
      </div>
      </div>
    </motion.div>
  );
}

/**
 * The day / auto / night switch — the owner's three-state artwork
 * (public/images/basemap-switch/, cropped from his strip: moon state,
 * half-sun/half-moon state, sun state). The three state images stack
 * and crossfade, so the knob appears to slide as the position changes;
 * three invisible radio zones across the pill select the position
 * directly. Semantics live in lib/basemap-mode: day = light basemap +
 * white background behind the globe, auto = the live solar terminator
 * blend on the dark basemap, night = the dark basemap.
 */
const BASEMAP_SWITCH_STATES: Array<{
  mode: BasemapMode;
  img: string;
  label: string;
  title: string;
}> = [
  { mode: 'night', img: '/images/basemap-switch/switch-night.png', label: 'Night mode', title: 'Night mode — dark basemap' },
  { mode: 'auto', img: '/images/basemap-switch/switch-auto.png', label: 'Auto — live day/night terminator', title: 'Auto — the globe as it is now, with the live day/night terminator' },
  { mode: 'day', img: '/images/basemap-switch/switch-day.png', label: 'Day mode', title: 'Day mode — light basemap, white background' },
];

export function BasemapSwitch({ mode, onChange }: { mode: BasemapMode; onChange: (mode: BasemapMode) => void }) {
  return (
    <div role="radiogroup" aria-label="Globe day, auto and night modes"
      className="relative h-10 md:h-8 aspect-[398/207] shrink-0 opacity-90 hover:opacity-100 transition-opacity drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] focus-within:outline focus-within:outline-1 focus-within:outline-[var(--gold-primary)] rounded-full">
      {BASEMAP_SWITCH_STATES.map(s => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={s.mode} src={s.img} alt="" draggable={false} aria-hidden="true"
          className="absolute inset-0 h-full w-full pointer-events-none select-none transition-opacity duration-300"
          style={{ opacity: mode === s.mode ? 1 : 0 }} />
      ))}
      <div className="absolute inset-0 flex">
        {BASEMAP_SWITCH_STATES.map(s => (
          <button key={s.mode} type="button" role="radio" aria-checked={mode === s.mode}
            aria-label={s.label} title={s.title}
            onClick={() => onChange(s.mode)}
            className="h-full flex-1 cursor-pointer focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--gold-primary)] rounded-full" />
        ))}
      </div>
    </div>
  );
}

/**
 * The satellite switch — the owner's artwork family, cropped and keyed
 * exactly like the day/auto/night switch (public/images/basemap-switch/):
 * knob right over the sunlit Earth = ON, knob left over the night Earth
 * = OFF, and the split knob-centre crop is the transition frame, shown
 * briefly mid-toggle so the knob reads as sliding. One toggle button;
 * satellite stays a separate control from the day/night switch, and it
 * is unlocked for everyone (lib/basemap-mode).
 */
const SATELLITE_SWITCH_FRAMES = [
  { frame: 'off', img: '/images/basemap-switch/sat-off.png' },
  { frame: 'mid', img: '/images/basemap-switch/sat-mid.png' },
  { frame: 'on', img: '/images/basemap-switch/sat-on.png' },
] as const;

type SatelliteFrame = 'on' | 'mid' | 'off';

export function SatelliteSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  const [frame, setFrame] = useState<SatelliteFrame>(on ? 'on' : 'off');
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; setFrame(on ? 'on' : 'off'); return; }
    setFrame('mid');
    const t = setTimeout(() => setFrame(on ? 'on' : 'off'), 170);
    return () => clearTimeout(t);
  }, [on]);
  return (
    <button type="button" onClick={onToggle} aria-pressed={on}
      aria-label={on ? 'Turn satellite view off' : 'Turn satellite view on'}
      title={on ? 'Satellite view on — back to the standard basemap' : 'Satellite view — real imagery basemap'}
      className="relative block h-10 md:h-8 aspect-[399/212] shrink-0 cursor-pointer opacity-90 hover:opacity-100 transition-opacity drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--gold-primary)] rounded-full">
      {SATELLITE_SWITCH_FRAMES.map(f => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={f.frame} src={f.img} alt="" draggable={false} aria-hidden="true"
          className="absolute inset-0 h-full w-full pointer-events-none select-none transition-opacity duration-150"
          style={{ opacity: frame === f.frame ? 1 : 0 }} />
      ))}
    </button>
  );
}

/**
 * The zoom control — the owner's vertical artwork (a + globe disc over
 * a − globe disc on a neon track), keyed to transparency at
 * public/images/map-zoom.png. Two click zones split the pill at its
 * middle: top = zoom in, bottom = zoom out. The zones reuse the exact
 * press-and-hold / keyboard-step behaviour the old +/− buttons had —
 * they drive the same map-camera-controls press/release/step handlers,
 * so the map's zoom behaviour is unchanged; only the visuals moved.
 * A zone at its zoom limit disables and dims, as the buttons did.
 */
function ZoomArtwork({ limits, press, release, step }: {
  limits: { min: boolean; max: boolean };
  press: (m: CameraMove) => void; release: () => void; step: (m: CameraMove) => void;
}) {
  return (
    <div className="relative h-[76px] md:h-[84px] aspect-[256/599] shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/map-zoom.png" alt="" draggable={false} aria-hidden="true"
        className="absolute inset-0 h-full w-full pointer-events-none select-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]" />
      <ZoomZone label="Zoom in" move={{ kind: 'zoom', dir: 1 }} disabled={limits.max} press={press} release={release} step={step} className="top-0" />
      <ZoomZone label="Zoom out" move={{ kind: 'zoom', dir: -1 }} disabled={limits.min} press={press} release={release} step={step} className="bottom-0" />
      {limits.max && <div aria-hidden="true" className="absolute top-0 inset-x-0 h-1/2 bg-black/50 pointer-events-none" />}
      {limits.min && <div aria-hidden="true" className="absolute bottom-0 inset-x-0 h-1/2 bg-black/50 pointer-events-none" />}
    </div>
  );
}

function ZoomZone({ label, move, disabled = false, press, release, step, className = '' }: {
  label: string; move: CameraMove; disabled?: boolean; className?: string;
  press: (m: CameraMove) => void; release: () => void; step: (m: CameraMove) => void;
}) {
  return (
    <button type="button" title={`${label} — hold to keep going`} aria-label={label} disabled={disabled}
      className={`absolute inset-x-0 h-1/2 ${className} cursor-pointer disabled:cursor-default focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--gold-primary)] touch-none select-none`}
      onPointerDown={e => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        press(move);
      }}
      onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}
      onClick={e => { if (e.detail === 0) step(move); }} />
  );
}

function Btn({ cell = '', label, icon: Icon, move, disabled = false, press, release, step }: {
  cell?: string; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  move: CameraMove; disabled?: boolean;
  press: (m: CameraMove) => void; release: () => void; step: (m: CameraMove) => void;
}) {
  return (
    <button type="button" title={`${label} — hold to keep going`} aria-label={label} disabled={disabled}
      className={`${cell} w-10 h-10 md:w-8 md:h-8 rounded-md flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-accent)] active:text-[var(--gold-light)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--gold-primary)] disabled:opacity-25 touch-none select-none`}
      onPointerDown={e => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        press(move);
      }}
      onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}
      onClick={e => { if (e.detail === 0) step(move); }}>
      <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
    </button>
  );
}
