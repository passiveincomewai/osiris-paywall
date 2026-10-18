'use client';

// Cinematic Director — a lightweight camera-scene system for the globe.
// Scenes are keyframe lists played with the plain MapLibre camera API
// (src/lib/cinematic); presets are factories over the REAL current state
// (view centre, loaded camera catalogue), and extra presets from other
// systems (aircraft follow, space missions) register through the
// extraPresets prop when those systems exist — nothing here fakes them.
// Recording reuses the Studio exporter's captureStream + MediaRecorder
// pattern against the map canvas; where the browser can't, the honest
// reason is shown instead of a button that would do nothing.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Map as MlMap } from 'maplibre-gl';
import { ChevronDown, ChevronUp, Clapperboard, Play, Plus, Square, Trash2, X } from 'lucide-react';
import {
  makeScene,
  totalSceneDurationMs,
  type CameraKeyframe,
  type CinematicScene,
} from '@/lib/cinematic/scenes';
import { BUILT_IN_PRESETS, type CinematicPreset } from '@/lib/cinematic/presets';
import { ScenePlayer, type CameraDriver } from '@/lib/cinematic/player';
import { deleteScene, loadSavedScenes, saveSavedScenes, upsertScene } from '@/lib/cinematic/storage';
import { downloadBlob, globeRecordingSupport, startGlobeRecorder, type GlobeRecorder } from '@/lib/cinematic/recorder';

interface CinematicDirectorProps {
  mapRef: React.RefObject<MlMap | null>;
  /** The loaded camera catalogue (Camera Tour preset flies between these). */
  cameras?: any[];
  /** Presets owned by other systems (follow camera, launches) when they exist. */
  extraPresets?: CinematicPreset[];
}

const SPEEDS = [0.5, 1, 1.5, 2];
const r2 = (n: number) => Math.round(n * 100) / 100;

const btnCls =
  'px-2 py-1.5 rounded border border-white/15 text-[10px] font-mono uppercase tracking-wider text-white/70 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-white/70';
const iconBtnCls =
  'w-6 h-6 rounded flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30';
const inputCls =
  'rounded border border-white/10 bg-white/[0.04] px-1.5 py-1 text-[10px] font-mono text-white focus:outline-none focus:border-cyan-400/50';

export default function CinematicDirector({ mapRef, cameras = [], extraPresets = [] }: CinematicDirectorProps) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<CinematicScene[]>(() => loadSavedScenes());
  const [draft, setDraft] = useState<CameraKeyframe[]>([]);
  const [draftName, setDraftName] = useState('');
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState<{ name: string; index: number; total: number } | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [exportMsg, setExportMsg] = useState('');

  const playerRef = useRef<ScenePlayer | null>(null);
  if (!playerRef.current) playerRef.current = new ScenePlayer();
  const recorderRef = useRef<GlobeRecorder | null>(null);

  useEffect(() => { saveSavedScenes(saved); }, [saved]);

  const stopPlayback = useCallback(() => {
    playerRef.current?.stop();
    mapRef.current?.stop();
    setPlaying(null);
  }, [mapRef]);

  // Grabbing the map mid-scene hands control straight back — the same
  // interrupt contract the follow modes use.
  useEffect(() => {
    if (!playing) return;
    const canvas = mapRef.current?.getCanvas();
    if (!canvas) return;
    const interrupt = () => stopPlayback();
    canvas.addEventListener('pointerdown', interrupt);
    canvas.addEventListener('wheel', interrupt, { passive: true });
    return () => {
      canvas.removeEventListener('pointerdown', interrupt);
      canvas.removeEventListener('wheel', interrupt);
    };
  }, [playing, mapRef, stopPlayback]);

  useEffect(() => {
    if (!recording) return;
    const t0 = Date.now();
    const iv = setInterval(() => setRecordSecs(Math.floor((Date.now() - t0) / 1000)), 500);
    return () => clearInterval(iv);
  }, [recording]);

  // If the director unmounts mid-recording, stop the recorder so the
  // stream tracks and repaint driver don't outlive the panel.
  useEffect(() => () => { void recorderRef.current?.stop().catch(() => {}); }, []);

  const playScene = useCallback((scene: CinematicScene) => {
    const map = mapRef.current;
    if (!map || !scene.keyframes.length) return;
    stopPlayback();
    const driver: CameraDriver = {
      flyTo: (o) => {
        map.flyTo({ center: o.center, zoom: o.zoom, pitch: o.pitch, bearing: o.bearing, duration: o.durationMs, essential: true });
      },
      stop: () => map.stop(),
      onMoveEnd: (cb) => {
        map.on('moveend', cb);
        return () => { map.off('moveend', cb); };
      },
    };
    const reduceMotion = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setPlaying({ name: scene.name, index: 0, total: scene.keyframes.length });
    void playerRef.current?.play(driver, scene, {
      speed,
      reduceMotion,
      onProgress: (index, total) => setPlaying({ name: scene.name, index, total }),
      onDone: () => setPlaying(null),
    });
  }, [mapRef, speed, stopPlayback]);

  const ctx = useMemo(() => {
    const c = mapRef.current?.getCenter();
    return {
      currentCenter: (c ? [c.lng, c.lat] : [0, 20]) as [number, number],
      cameras,
    };
    // Recomputed when the panel opens / the catalogue changes; the map
    // centre is read at press time through playPreset below as well.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameras, open]);

  const playPreset = (preset: CinematicPreset) => {
    const c = mapRef.current?.getCenter();
    const scene = preset.build({
      currentCenter: c ? [c.lng, c.lat] : ctx.currentCenter,
      cameras,
    });
    if (scene) playScene(scene);
  };

  const addKeyframe = () => {
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter();
    setDraft((d) => [...d, {
      center: [r2(c.lng), r2(c.lat)],
      zoom: r2(map.getZoom()),
      pitch: Math.round(map.getPitch()),
      bearing: Math.round(map.getBearing()),
      durationMs: 5000,
      holdMs: 1000,
      label: `View ${d.length + 1}`,
    }]);
  };

  const updateKeyframe = (i: number, patch: Partial<CameraKeyframe>) =>
    setDraft((d) => d.map((k, j) => (j === i ? { ...k, ...patch } : k)));
  const moveKeyframe = (i: number, dir: -1 | 1) =>
    setDraft((d) => {
      const j = i + dir;
      if (j < 0 || j >= d.length) return d;
      const next = [...d];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const removeKeyframe = (i: number) => setDraft((d) => d.filter((_, j) => j !== i));

  const saveDraft = () => {
    if (!draft.length) return;
    const scene = makeScene(draftName, draft);
    setSaved((s) => upsertScene(s, scene));
    setDraftName('');
  };

  const support = useMemo(
    () => (open ? globeRecordingSupport(mapRef.current?.getCanvas() ?? null) : null),
    [open, mapRef],
  );

  const startRecording = () => {
    const map = mapRef.current;
    if (!map) return;
    setExportMsg('');
    try {
      recorderRef.current = startGlobeRecorder(map.getCanvas(), {
        repaint: () => map.triggerRepaint(),
        onError: () => setExportMsg('Recording failed in this browser — the recorder reported an error.'),
      });
      setRecordSecs(0);
      setRecording(true);
    } catch {
      setExportMsg("This browser can't record the globe canvas. Try a recent Chrome, Edge or Firefox.");
    }
  };

  const stopRecording = async () => {
    const rec = recorderRef.current;
    recorderRef.current = null;
    setRecording(false);
    if (!rec) return;
    const blob = await rec.stop();
    if (blob.size > 0) {
      downloadBlob(blob, `worldeye-globe-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`);
    } else {
      setExportMsg('The recording came back empty — nothing was captured.');
    }
  };

  const presets = [...BUILT_IN_PRESETS, ...extraPresets];

  return (
    <div className="absolute right-2 bottom-[172px] md:bottom-[104px] z-[240] flex flex-col items-end gap-2 pointer-events-none" data-cinematic-director>
      {open && (
        <div className="pointer-events-auto w-[302px] max-w-[86vw] max-h-[54vh] overflow-y-auto styled-scrollbar rounded-xl border border-[var(--border-secondary)] bg-black/70 backdrop-blur-md shadow-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono font-bold tracking-[0.18em] text-[var(--text-primary)]">CINEMATIC DIRECTOR</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close cinematic director" className={iconBtnCls}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Presets */}
          <div className="text-[9px] font-mono tracking-[0.18em] text-white/35 uppercase mb-1">Presets</div>
          <div className="flex flex-col gap-1">
            {presets.map((preset) => {
              const scene = preset.build(ctx);
              return (
                <div key={preset.id}>
                  <button
                    type="button"
                    disabled={!scene}
                    onClick={() => playPreset(preset)}
                    className={`${btnCls} w-full flex items-center gap-2 text-left`}
                    title={scene ? preset.description : preset.unavailableNote ?? preset.description}
                  >
                    <Play className="w-3 h-3 flex-shrink-0" />
                    <span className="flex-1">{preset.label}</span>
                    {scene && <span className="text-white/35 normal-case">{Math.round(totalSceneDurationMs(scene, speed) / 1000)}s</span>}
                  </button>
                  {!scene && preset.unavailableNote && (
                    <p className="mt-0.5 text-[9px] text-white/35 leading-snug">{preset.unavailableNote}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Scene builder */}
          <div className="mt-3 text-[9px] font-mono tracking-[0.18em] text-white/35 uppercase mb-1">Build a scene</div>
          <button type="button" onClick={addKeyframe} className={`${btnCls} w-full flex items-center justify-center gap-1.5`}>
            <Plus className="w-3 h-3" /> Add keyframe — current view
          </button>
          {draft.length > 0 && (
            <div className="mt-2 flex flex-col gap-1">
              {draft.map((k, i) => (
                <div key={i} className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5">
                  <div className="flex items-center gap-1">
                    <span className="flex-1 text-[10px] font-mono text-white/80 truncate">
                      {i + 1}. {k.label ?? 'View'} · z{k.zoom} · {k.center[1].toFixed(1)}, {k.center[0].toFixed(1)}
                    </span>
                    <button type="button" aria-label="Move keyframe up" disabled={i === 0} onClick={() => moveKeyframe(i, -1)} className={iconBtnCls}><ChevronUp className="w-3 h-3" /></button>
                    <button type="button" aria-label="Move keyframe down" disabled={i === draft.length - 1} onClick={() => moveKeyframe(i, 1)} className={iconBtnCls}><ChevronDown className="w-3 h-3" /></button>
                    <button type="button" aria-label="Delete keyframe" onClick={() => removeKeyframe(i)} className={iconBtnCls}><Trash2 className="w-3 h-3" /></button>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[9px] font-mono text-white/40">
                    <label className="flex items-center gap-1">
                      FLY
                      <input type="number" min={0} max={120} step={0.5} value={k.durationMs / 1000}
                        onChange={(e) => updateKeyframe(i, { durationMs: Math.round(Number(e.target.value || 0) * 1000) })}
                        className={`${inputCls} w-14`} aria-label="Fly duration (seconds)" />
                      s
                    </label>
                    <label className="flex items-center gap-1">
                      HOLD
                      <input type="number" min={0} max={60} step={0.5} value={k.holdMs / 1000}
                        onChange={(e) => updateKeyframe(i, { holdMs: Math.round(Number(e.target.value || 0) * 1000) })}
                        className={`${inputCls} w-14`} aria-label="Hold duration (seconds)" />
                      s
                    </label>
                  </div>
                </div>
              ))}
              <div className="mt-1 flex items-center gap-1.5">
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="Scene name"
                  className={`${inputCls} flex-1`}
                  aria-label="Scene name"
                />
                <button type="button" onClick={saveDraft} className={btnCls}>Save</button>
                <button type="button" onClick={() => playScene(makeScene(draftName || 'Draft scene', draft))} className={`${btnCls} flex items-center gap-1`}>
                  <Play className="w-3 h-3" /> Play
                </button>
              </div>
            </div>
          )}

          {/* Saved scenes */}
          {saved.length > 0 && (
            <>
              <div className="mt-3 text-[9px] font-mono tracking-[0.18em] text-white/35 uppercase mb-1">My scenes</div>
              <div className="flex flex-col gap-1">
                {saved.map((scene) => (
                  <div key={scene.id} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5">
                    <span className="flex-1 min-w-0">
                      <span className="block text-[10px] font-mono text-white/85 truncate">{scene.name}</span>
                      <span className="block text-[9px] font-mono text-white/35">
                        {scene.keyframes.length} keyframes · {Math.round(totalSceneDurationMs(scene, speed) / 1000)}s
                      </span>
                    </span>
                    <button type="button" onClick={() => playScene(scene)} className={btnCls} aria-label={`Play ${scene.name}`}>
                      <Play className="w-3 h-3" />
                    </button>
                    <button type="button" onClick={() => { setDraft(scene.keyframes); setDraftName(scene.name); }} className={btnCls}>
                      Edit
                    </button>
                    <button type="button" onClick={() => setSaved((s) => deleteScene(s, scene.id))} className={iconBtnCls} aria-label={`Delete ${scene.name}`}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Playback transport */}
          {playing && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/[0.06] px-2 py-1.5">
              <span className="flex-1 min-w-0 text-[10px] font-mono text-cyan-100/90 truncate">
                ▶ {playing.name} — keyframe {playing.index + 1}/{playing.total}
              </span>
              <label className="flex items-center gap-1 text-[9px] font-mono text-white/45">
                SPEED
                <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className={inputCls} aria-label="Playback speed">
                  {SPEEDS.map((s) => <option key={s} value={s} className="bg-neutral-900">{s}×</option>)}
                </select>
              </label>
              <button type="button" onClick={stopPlayback} className={`${btnCls} flex items-center gap-1`}>
                <Square className="w-3 h-3" /> Stop
              </button>
            </div>
          )}
          {!playing && (
            <div className="mt-3 flex items-center gap-2">
              <label className="flex items-center gap-1 text-[9px] font-mono text-white/45">
                SPEED
                <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className={inputCls} aria-label="Playback speed">
                  {SPEEDS.map((s) => <option key={s} value={s} className="bg-neutral-900">{s}×</option>)}
                </select>
              </label>
              <span className="text-[9px] font-mono text-white/30">Applies to the next play.</span>
            </div>
          )}

          {/* Export */}
          <div className="mt-3 text-[9px] font-mono tracking-[0.18em] text-white/35 uppercase mb-1">Export</div>
          {support && !support.supported ? (
            <p className="text-[10px] leading-relaxed text-amber-200/80">{support.reason}</p>
          ) : (
            <>
              {!recording ? (
                <button type="button" onClick={startRecording} className={`${btnCls} w-full flex items-center justify-center gap-2`}>
                  <span className="w-2 h-2 rounded-full bg-red-500" /> Record globe — WebM
                </button>
              ) : (
                <button type="button" onClick={() => void stopRecording()} className="w-full flex items-center justify-center gap-2 px-2 py-1.5 rounded border border-red-400/40 bg-red-500/10 text-[10px] font-mono uppercase tracking-wider text-red-200 hover:bg-red-500/20 transition-colors">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Recording {recordSecs}s — stop &amp; download
                </button>
              )}
              <p className="mt-1 text-[9px] leading-relaxed text-white/35">
                Records the globe canvas only (no audio), at the live canvas size. Play a scene while recording to capture the flight.
              </p>
            </>
          )}
          {exportMsg && <p className="mt-1 text-[10px] text-amber-200/80">{exportMsg}</p>}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-pressed={open}
        aria-label="Cinematic Director"
        title="Cinematic Director — camera scenes & globe recording"
        className="pointer-events-auto flex items-center gap-2 px-2.5 py-2 rounded-xl border border-[var(--border-secondary)] bg-black/60 backdrop-blur-md shadow-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all opacity-85 hover:opacity-100"
      >
        <Clapperboard className="w-4 h-4" style={open || playing || recording ? { color: 'var(--gold-primary)' } : undefined} />
        <span className="text-[9px] font-mono tracking-[0.18em] hidden md:inline">
          {recording ? `REC ${recordSecs}s` : playing ? 'PLAYING' : 'DIRECTOR'}
        </span>
      </button>
    </div>
  );
}
