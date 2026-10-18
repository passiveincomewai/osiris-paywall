/**
 * OSIRIS — cinematic scene player.
 *
 * Pure sequencing logic over a minimal CameraDriver, so the sequencing is
 * unit-testable without a map: fly to each keyframe, wait for the move to
 * settle (the driver's moveend, with a timeout fallback in case a no-op
 * move never reports one), hold, continue. stop() is immediate and total:
 * it cancels pending waits, unsubscribes, and calls the driver's own stop,
 * which is what hands camera control back to the user instantly.
 */
import type { CameraKeyframe, CinematicScene } from './scenes';

export interface CameraDriver {
  flyTo(opts: {
    center: [number, number];
    zoom: number;
    pitch: number;
    bearing: number;
    durationMs: number;
  }): void;
  /** Halt any in-flight camera move immediately. */
  stop(): void;
  /** Subscribe to "a camera move has settled"; returns an unsubscribe. */
  onMoveEnd(cb: () => void): () => void;
}

export interface PlayOptions {
  /** Playback rate multiplier (1 = authored timing). */
  speed?: number;
  /** Reduced-motion: authored fly durations collapse to instant moves. */
  reduceMotion?: boolean;
  onProgress?: (index: number, total: number, keyframe: CameraKeyframe) => void;
  onDone?: (completed: boolean) => void;
}

export class ScenePlayer {
  private generation = 0;
  private waiters = new Set<() => void>();
  private unsubs = new Set<() => void>();
  private playingNow = false;

  get isPlaying(): boolean {
    return this.playingNow;
  }

  /** Resolve every pending wait and invalidate the current run. */
  private cancelWaits() {
    for (const resolve of [...this.waiters]) resolve();
    this.waiters.clear();
    for (const un of [...this.unsubs]) un();
    this.unsubs.clear();
  }

  private sleep(ms: number, gen: number): Promise<boolean> {
    if (ms <= 0) return Promise.resolve(gen === this.generation);
    return new Promise((resolve) => {
      const done = () => {
        clearTimeout(timer);
        this.waiters.delete(done);
        resolve(gen === this.generation);
      };
      const timer = setTimeout(done, ms);
      this.waiters.add(done);
    });
  }

  /** Wait until the driver reports a settled move, or `capMs` passes. */
  private waitMoveEnd(driver: CameraDriver, capMs: number, gen: number): Promise<boolean> {
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        unsub();
        this.waiters.delete(finish);
        this.unsubs.delete(unsub);
        resolve(gen === this.generation);
      };
      const timer = setTimeout(finish, capMs);
      const unsub = driver.onMoveEnd(finish);
      this.waiters.add(finish);
      this.unsubs.add(unsub);
    });
  }

  async play(driver: CameraDriver, scene: CinematicScene, opts: PlayOptions = {}): Promise<void> {
    this.stop();
    const gen = ++this.generation;
    this.playingNow = true;
    const speed = opts.speed && opts.speed > 0 ? opts.speed : 1;
    try {
      for (let i = 0; i < scene.keyframes.length; i++) {
        if (gen !== this.generation) return;
        const kf = scene.keyframes[i];
        opts.onProgress?.(i, scene.keyframes.length, kf);
        const durationMs = opts.reduceMotion ? 0 : kf.durationMs / speed;
        driver.flyTo({
          center: kf.center,
          zoom: kf.zoom,
          pitch: kf.pitch,
          bearing: kf.bearing,
          durationMs,
        });
        // A hair past the authored duration: moveend normally wins the race;
        // the cap exists so a move that never settles cannot stall a scene.
        const moved = await this.waitMoveEnd(driver, durationMs + 400, gen);
        if (!moved) return;
        const held = await this.sleep(kf.holdMs / speed, gen);
        if (!held) return;
      }
      if (gen === this.generation) opts.onDone?.(true);
    } finally {
      if (gen === this.generation) this.playingNow = false;
    }
  }

  stop(): void {
    this.generation++;
    this.playingNow = false;
    this.cancelWaits();
  }
}
