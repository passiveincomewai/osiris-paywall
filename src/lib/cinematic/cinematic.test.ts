import { describe, expect, it } from 'vitest';
import {
  makeScene,
  normalizeKeyframe,
  normalizeScene,
  totalSceneDurationMs,
  type CinematicScene,
} from './scenes';
import { cameraTourScene, cityFlyoverScene, globalOverviewScene } from './presets';
import { ScenePlayer, type CameraDriver } from './player';
import { deleteScene, loadSavedScenes, saveSavedScenes, upsertScene, type KeyValueStorage } from './storage';
import { globeRecordingSupport } from './recorder';

describe('scene model', () => {
  it('normalises keyframes with clamps and drops unusable ones', () => {
    const kf = normalizeKeyframe({ center: [10, 20], zoom: 99, pitch: -5, bearing: 370, durationMs: 1000, holdMs: 500 });
    expect(kf).toMatchObject({ center: [10, 20], zoom: 22, pitch: 0, bearing: 370 });
    expect(normalizeKeyframe({ center: [999, 20] })).toBeNull();
    expect(normalizeKeyframe({ center: 'x' })).toBeNull();
    expect(normalizeKeyframe(null)).toBeNull();
  });

  it('normalises scenes and rejects ones with no usable keyframes', () => {
    const scene = normalizeScene({
      id: 'a', name: ' Test ',
      keyframes: [{ center: [0, 0], zoom: 3 }, { center: 'bad' }],
      createdAt: 5,
    });
    expect(scene?.name).toBe('Test');
    expect(scene?.keyframes).toHaveLength(1);
    expect(normalizeScene({ keyframes: [{ center: 'bad' }] })).toBeNull();
    expect(normalizeScene({})).toBeNull();
  });

  it('computes total duration honouring speed', () => {
    const scene = makeScene('S', [
      { center: [0, 0], zoom: 2, pitch: 0, bearing: 0, durationMs: 4000, holdMs: 1000 },
      { center: [1, 1], zoom: 3, pitch: 0, bearing: 0, durationMs: 2000, holdMs: 0 },
    ]);
    expect(totalSceneDurationMs(scene)).toBe(7000);
    expect(totalSceneDurationMs(scene, 2)).toBe(3500);
  });
});

describe('presets', () => {
  it('global overview is a six-leg orbit at globe zoom', () => {
    const s = globalOverviewScene();
    expect(s.keyframes).toHaveLength(6);
    expect(s.keyframes.every((k) => k.zoom < 3)).toBe(true);
  });

  it('city flyover descends in three keyframes toward the given centre', () => {
    const s = cityFlyoverScene([-111.89, 40.76]);
    expect(s.keyframes).toHaveLength(3);
    expect(s.keyframes[0].center).toEqual([-111.89, 40.76]);
    expect(s.keyframes[2].zoom).toBeGreaterThan(s.keyframes[0].zoom);
    expect(s.keyframes[2].pitch).toBeGreaterThan(0);
  });

  it('camera tour needs real cameras and samples evenly across the catalogue', () => {
    expect(cameraTourScene([])).toBeNull();
    expect(cameraTourScene([{ lat: 'x', lng: 0 }])).toBeNull();
    const cams = Array.from({ length: 60 }, (_, i) => ({ lat: i * 0.1, lng: i * -0.1, name: `Cam ${i}` }));
    const s = cameraTourScene(cams)!;
    expect(s.keyframes).toHaveLength(6);
    expect(s.keyframes[0].center[0]).toBeCloseTo(0);
    expect(s.keyframes[0].center[1]).toBeCloseTo(0);
    // Even sampling: stops come from across the list, not the first six.
    expect(s.keyframes[5].center[1]).toBeGreaterThan(4);
    const few = cameraTourScene(cams.slice(0, 3))!;
    expect(few.keyframes).toHaveLength(3);
  });
});

/** A driver that settles instantly (moveend on a microtask) and records calls. */
function fakeDriver(settle: 'instant' | 'never' = 'instant') {
  const calls: any[] = [];
  let stops = 0;
  const driver: CameraDriver = {
    flyTo: (opts) => {
      calls.push(opts);
      if (settle === 'instant') queueMicrotask(() => listeners.forEach((cb) => cb()));
    },
    stop: () => { stops++; },
    onMoveEnd: (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
  const listeners = new Set<() => void>();
  return { driver, calls, stops: () => stops };
}

const tinyScene = (name = 'Tiny'): CinematicScene => ({
  id: 't', name, createdAt: 0,
  keyframes: [
    { center: [0, 0], zoom: 2, pitch: 0, bearing: 0, durationMs: 30, holdMs: 10 },
    { center: [10, 10], zoom: 4, pitch: 20, bearing: 40, durationMs: 30, holdMs: 0 },
  ],
});

describe('ScenePlayer', () => {
  it('flies every keyframe in order and reports progress + completion', async () => {
    const { driver, calls } = fakeDriver();
    const player = new ScenePlayer();
    const progress: number[] = [];
    let done: boolean | null = null;
    await player.play(driver, tinyScene(), {
      onProgress: (i) => progress.push(i),
      onDone: (c) => { done = c; },
    });
    expect(calls).toHaveLength(2);
    expect(calls[1]).toMatchObject({ center: [10, 10], zoom: 4, pitch: 20, bearing: 40 });
    expect(progress).toEqual([0, 1]);
    expect(done).toBe(true);
    expect(player.isPlaying).toBe(false);
  });

  it('stop() mid-scene prevents any further flyTo', async () => {
    const { driver, calls } = fakeDriver('never'); // moves never settle: waits ride the cap
    const player = new ScenePlayer();
    const scene = tinyScene();
    scene.keyframes[0].durationMs = 60_000; // cap is duration+400 — stop must beat it
    const playing = player.play(driver, scene);
    await new Promise((r) => setTimeout(r, 20));
    player.stop();
    await playing;
    expect(calls).toHaveLength(1);
    expect(player.isPlaying).toBe(false);
  });

  it('falls back to the timeout cap when moveend never fires', async () => {
    const { driver, calls } = fakeDriver('never');
    const player = new ScenePlayer();
    const scene = tinyScene();
    scene.keyframes.forEach((k) => { k.durationMs = 5; k.holdMs = 0; });
    await player.play(driver, scene);
    expect(calls).toHaveLength(2); // both keyframes reached via the cap, not stuck
  });

  it('reduced motion collapses fly durations to 0', async () => {
    const { driver, calls } = fakeDriver();
    const player = new ScenePlayer();
    await player.play(driver, tinyScene(), { reduceMotion: true });
    expect(calls.every((c) => c.durationMs === 0)).toBe(true);
  });
});

describe('globe recording support (honest unsupported paths)', () => {
  it('reports unsupported with a reason instead of offering a dead control', () => {
    // The node test env has no MediaRecorder: the FIRST honest gate.
    const noRecorder = globeRecordingSupport(null);
    expect(noRecorder.supported).toBe(false);
    if (!noRecorder.supported) expect(noRecorder.reason).toContain('MediaRecorder');

    // With a MediaRecorder present but no capturable canvas: the second gate.
    const g = globalThis as any;
    const prev = g.MediaRecorder;
    g.MediaRecorder = class { static isTypeSupported = () => true; };
    try {
      const noCanvas = globeRecordingSupport(null);
      expect(noCanvas.supported).toBe(false);
      if (!noCanvas.supported) expect(noCanvas.reason).toContain('captureStream');
      const bareCanvas = globeRecordingSupport({} as any);
      expect(bareCanvas.supported).toBe(false);
    } finally {
      if (prev === undefined) delete g.MediaRecorder; else g.MediaRecorder = prev;
    }
  });
});

describe('scene storage', () => {
  function memStorage(): KeyValueStorage & { map: Map<string, string> } {
    const map = new Map<string, string>();
    return {
      map,
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => { map.set(k, v); },
    };
  }

  it('round-trips scenes through storage', () => {
    const storage = memStorage();
    const scene = makeScene('Round trip', [
      { center: [1, 2], zoom: 5, pitch: 10, bearing: 20, durationMs: 3000, holdMs: 500, label: 'A' },
    ]);
    saveSavedScenes([scene], storage);
    const loaded = loadSavedScenes(storage);
    expect(loaded).toHaveLength(1);
    expect(loaded[0]).toMatchObject({ name: 'Round trip' });
    expect(loaded[0].keyframes[0]).toMatchObject({ center: [1, 2], label: 'A' });
  });

  it('tolerates corrupt storage and unusable entries', () => {
    const storage = memStorage();
    storage.map.set('we_cinematic_scenes_v1', '{not json');
    expect(loadSavedScenes(storage)).toEqual([]);
    storage.map.set('we_cinematic_scenes_v1', JSON.stringify([{ bad: true }, makeScene('Ok', [{ center: [0, 0], zoom: 1, pitch: 0, bearing: 0, durationMs: 1, holdMs: 0 }])]));
    const loaded = loadSavedScenes(storage);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe('Ok');
    expect(loadSavedScenes(null)).toEqual([]);
  });

  it('upsert replaces by id and delete removes', () => {
    const a = makeScene('A', [{ center: [0, 0], zoom: 1, pitch: 0, bearing: 0, durationMs: 1, holdMs: 0 }]);
    const b = { ...makeScene('B', a.keyframes), id: 'b-id' };
    let list = upsertScene([], a);
    list = upsertScene(list, b);
    expect(list.map((s) => s.id)).toEqual(['b-id', a.id]);
    list = upsertScene(list, { ...a, name: 'A2' });
    expect(list.find((s) => s.id === a.id)?.name).toBe('A2');
    expect(deleteScene(list, 'b-id').map((s) => s.id)).toEqual([a.id]);
  });
});
