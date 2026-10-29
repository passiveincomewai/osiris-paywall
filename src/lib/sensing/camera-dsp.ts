/**
 * Camera motion-sensing DSP for the WorldEye /sensing page.
 *
 * This is a TypeScript port of the sensing pipeline from RavenScope
 * (https://github.com/tmanish/raven-scope, commit 9919537350ea86f921b7e0e9dd398a54c5590d51),
 * MIT License, Copyright (c) 2026 RavenScope contributors. The pipeline
 * structure, thresholds and state machine are RavenScope's; the input signal
 * is adapted as described below. See REPORT attribution in the page footer.
 *
 * RavenScope's pipeline (per WiFi link, from its dsp.py / fusion.py /
 * state.py):
 *
 *   raw RSSI -> Hampel despike -> EMA baseline / detrend
 *            -> windowed RMS of the residual ("motion energy")
 *            -> calibration noise-floor squash into ~0..1
 *            -> multi-link fusion (max of reliable links) + coarse sector
 *            -> hysteretic, debounced room state machine
 *               (EMPTY / STILL / MOTION / ACTIVE)
 *            -> adaptive z-score anomaly detector (debounce + cooldown)
 *
 * Adaptation for a camera (documented differences, everything else is a
 * line-for-line port):
 *   - The per-link input is the mean absolute difference (MAD) between
 *     consecutive grayscale frames, normalised to 0..1, instead of RSSI in
 *     dBm. A still scene sits near 0; movement raises it continuously while
 *     the movement lasts, which is the property the rest of the pipeline
 *     relies on.
 *   - The "links" are the three vertical thirds of the frame (left /
 *     centre / right), which play the role of RavenScope's per-AP links
 *     for fusion and for the coarse sector estimate.
 *   - The noise-floor minimum is 0.004 (normalised MAD units) where
 *     RavenScope uses 0.3 (dBm RMS units); the calibration procedure —
 *     median while calibrating, 75th percentile on finalise — is unchanged.
 *   - The link "reliable" noise ceiling is 0.35 in MAD units where
 *     RavenScope uses 8.0 in dBm units.
 *   - Sample rate is ~4 fps here vs RavenScope's 2.5 Hz default; the
 *     baseline EMA alpha is scaled (0.0125 vs 0.02) to keep the same
 *     ~20 s baseline time constant. Counts (windows, debounce, cooldown)
 *     are kept in samples, as in the original.
 *   - Baseline adaptation after calibration: RSSI motion perturbs the
 *     signal symmetrically around its still-room mean, so RavenScope's
 *     plain EMA baseline works there. Frame difference is a rectified
 *     level signal — motion raises its mean — so a plain EMA would chase
 *     the motion level and the energy would never decay when motion
 *     stops. Here the baseline therefore holds at the calibrated
 *     still-scene level after calibration: it re-learns downward at the
 *     full rate and upward at 1/25 rate (slow lighting drift), instead of
 *     tracking the signal symmetrically.
 *
 * Honest scope: this measures MOTION in the camera's view. A person sitting
 * perfectly still produces no frame differences and reads as a still scene.
 * There is no person detection, no counting and no vital-sign measurement
 * in this pipeline.
 */

export type RoomStateCode = "EMPTY" | "STILL" | "MOTION" | "ACTIVE";

/** Display labels for the camera adaptation. Internal codes stay RavenScope's. */
export const STATE_LABELS: Record<RoomStateCode, string> = {
  EMPTY: "NO MOTION",
  STILL: "STILL SCENE",
  MOTION: "MOVEMENT",
  ACTIVE: "ACTIVE",
};

export const SECTOR_NAMES = ["left", "center", "right"] as const;
export type SectorName = (typeof SECTOR_NAMES)[number];

// ---------------------------------------------------------------------------
// helpers (dsp.py _median / _mean / _stdev)
// ---------------------------------------------------------------------------

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function mean(values: readonly number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function stdev(values: readonly number[], m?: number): number {
  const n = values.length;
  if (n < 2) return 0;
  const mu = m ?? mean(values);
  return Math.sqrt(values.reduce((a, v) => a + (v - mu) ** 2, 0) / (n - 1));
}

class Ring {
  buf: number[] = [];
  constructor(private max: number) {}
  push(x: number) {
    this.buf.push(x);
    if (this.buf.length > this.max) this.buf.shift();
  }
  get length() {
    return this.buf.length;
  }
}

// ---------------------------------------------------------------------------
// Hampel despike (dsp.py Hampel: window 7, k 3.0)
// ---------------------------------------------------------------------------

export class Hampel {
  private buf = new Ring(7);
  constructor(private k = 3.0) {}
  push(x: number): number {
    this.buf.push(x);
    if (this.buf.length < 3) return x;
    const med = median(this.buf.buf);
    const mad = median(this.buf.buf.map((v) => Math.abs(v - med))) * 1.4826 + 1e-9;
    return Math.abs(x - med) > this.k * mad ? med : x;
  }
}

// ---------------------------------------------------------------------------
// Per-link processor (dsp.py LinkProcessor)
// ---------------------------------------------------------------------------

const FLOOR_MIN = 0.004; // camera MAD units; RavenScope: 0.3 (dBm RMS units)
const FLOOR_RELIABLE_MAX = 0.35; // camera MAD units; RavenScope: 8.0 (dBm units)

export interface LinkProcessorOptions {
  baselineAlpha?: number;
  floorMin?: number;
  floorReliableMax?: number;
}

export interface LinkStats {
  lastValue: number;
  baseline: number;
  energy: number;
  rawEnergy: number;
  coherence: number;
  samples: number;
  reliable: boolean;
}

export class LinkProcessor {
  stats: LinkStats = {
    lastValue: 0,
    baseline: 0,
    energy: 0,
    rawEnergy: 0,
    coherence: 0,
    samples: 0,
    reliable: false,
  };
  private hampel = new Hampel();
  private detrended = new Ring(16); // motion_window = 16
  private noiseCal = new Ring(256);
  private noiseFloor = 0;
  private init = false;
  private floorMin: number;
  private floorReliableMax: number;
  // baseline_alpha 0.02 at 2.5 Hz -> 0.0125 at ~4 fps (same ~20 s constant)
  constructor(private baselineAlpha = 0.0125, opts: LinkProcessorOptions = {}) {
    this.floorMin = opts.floorMin ?? FLOOR_MIN;
    this.floorReliableMax = opts.floorReliableMax ?? FLOOR_RELIABLE_MAX;
  }

  push(value: number, calibrating: boolean): LinkStats {
    const s = this.stats;
    s.lastValue = value;
    s.samples += 1;

    const clean = this.hampel.push(value);
    if (!this.init) {
      s.baseline = clean;
      this.init = true;
    } else if (calibrating || clean <= s.baseline) {
      const a = this.baselineAlpha;
      s.baseline = (1 - a) * s.baseline + a * clean;
    } else {
      // Post-calibration upward move: hold the calibrated still-scene
      // level (see header note) — re-learn upward only very slowly.
      const a = this.baselineAlpha / 25;
      s.baseline = (1 - a) * s.baseline + a * clean;
    }

    const residual = clean - s.baseline;
    this.detrended.push(residual);

    const rms =
      this.detrended.length >= 4
        ? Math.sqrt(mean(this.detrended.buf.map((d) => d * d)))
        : Math.abs(residual);
    s.rawEnergy = rms;

    if (calibrating) {
      this.noiseCal.push(rms);
      this.noiseFloor = this.noiseCal.length ? median(this.noiseCal.buf) : rms;
    }

    const floor = Math.max(this.noiseFloor, this.floorMin);
    const excess = Math.max(0, rms - floor);
    s.energy = 1.0 - Math.exp(-excess / (1.5 * floor));
    s.coherence = floor > 0 ? Math.min(1.0, excess / (3.0 * floor)) : 0;
    s.reliable = s.samples > 8 && floor < this.floorReliableMax;
    return s;
  }

  finalizeCalibration(): void {
    if (this.noiseCal.length) {
      const vals = [...this.noiseCal.buf].sort((a, b) => a - b);
      const idx = Math.min(vals.length - 1, Math.floor(0.75 * vals.length));
      this.noiseFloor = Math.max(vals[idx], this.floorMin);
    }
  }
}

// ---------------------------------------------------------------------------
// Fusion + sector (fusion.py fuse_energy / sector_energies / dominant_sector)
// ---------------------------------------------------------------------------

export function fuseEnergy(links: LinkStats[]): { fused: number; nReliable: number } {
  const eligible = links.filter((s) => s.samples >= 5);
  if (!eligible.length) return { fused: 0, nReliable: 0 };
  const reliablePool = eligible.filter((s) => s.reliable);
  const pool = reliablePool.length ? reliablePool : eligible;
  return {
    fused: Math.max(...pool.map((s) => s.energy)),
    nReliable: links.filter((s) => s.reliable).length,
  };
}

export function dominantSector(sectorEnergies: number[]): { index: number; confidence: number } {
  if (!sectorEnergies.length) return { index: -1, confidence: 0 };
  let idx = 0;
  for (let i = 1; i < sectorEnergies.length; i++) {
    if (sectorEnergies[i] > sectorEnergies[idx]) idx = i;
  }
  const total = sectorEnergies.reduce((a, b) => a + b, 0) || 1.0;
  return { index: idx, confidence: sectorEnergies[idx] / total };
}

// ---------------------------------------------------------------------------
// Room state machine (state.py RoomState — thresholds unchanged)
// ---------------------------------------------------------------------------

const ORDER: Record<RoomStateCode, number> = { EMPTY: 0, STILL: 1, MOTION: 2, ACTIVE: 3 };

export interface StateConfig {
  stillEnter: number;
  motionEnter: number;
  activeEnter: number;
  hysteresis: number;
  debounce: number;
  emptyHold: number; // seconds of floor energy before declaring EMPTY
}

export const DEFAULT_STATE_CONFIG: StateConfig = {
  stillEnter: 0.1,
  motionEnter: 0.28,
  activeEnter: 0.62,
  hysteresis: 0.06,
  debounce: 3,
  emptyHold: 6.0,
};

export class RoomStateMachine {
  state: RoomStateCode = "EMPTY";
  since: number;
  private pending: RoomStateCode | null = null;
  private pendingCount = 0;
  private belowFloorSince: number | null = null;

  constructor(private cfg: StateConfig = DEFAULT_STATE_CONFIG, now = 0) {
    this.since = now;
  }

  private target(energy: number): RoomStateCode {
    const c = this.cfg;
    const cur = ORDER[this.state];
    const lvl = (e: number): RoomStateCode =>
      e >= c.activeEnter ? "ACTIVE" : e >= c.motionEnter ? "MOTION" : e >= c.stillEnter ? "STILL" : "EMPTY";
    const t = lvl(energy);
    if (ORDER[t] < cur) {
      // Hysteresis, with one documented deviation from state.py: upstream
      // keys the step-down test on the TARGET level's enter threshold,
      // which makes EMPTY unreachable from STILL (it would require
      // energy < 0.0 - hysteresis). The genuine program's own event log
      // confirms it never returns to EMPTY once occupied. We key the test
      // on the CURRENT level's enter threshold minus the same hysteresis
      // band — the standard reading — so all four states stay reachable.
      // Thresholds, band, debounce and the EMPTY hold are unchanged.
      const enterThreshold: Record<RoomStateCode, number> = {
        ACTIVE: c.activeEnter,
        MOTION: c.motionEnter,
        STILL: c.stillEnter,
        EMPTY: 0.0,
      };
      if (energy >= enterThreshold[this.state] - c.hysteresis) return this.state;
      return t;
    }
    return t;
  }

  /** Returns [state, transition | null], transition like "STILL->MOTION". */
  update(energy: number, now: number): [RoomStateCode, string | null] {
    let target = this.target(energy);

    if (target === "EMPTY" && this.state !== "EMPTY") {
      if (this.belowFloorSince === null) this.belowFloorSince = now;
      if (now - this.belowFloorSince < this.cfg.emptyHold) target = "STILL";
    } else {
      this.belowFloorSince = null;
    }

    if (target === this.state) {
      this.pending = null;
      this.pendingCount = 0;
      return [this.state, null];
    }
    if (target === this.pending) this.pendingCount += 1;
    else {
      this.pending = target;
      this.pendingCount = 1;
    }
    if (this.pendingCount >= this.cfg.debounce) {
      const prev = this.state;
      this.state = target;
      this.since = now;
      this.pending = null;
      this.pendingCount = 0;
      return [this.state, `${prev}->${this.state}`];
    }
    return [this.state, null];
  }

  dwell(now: number): number {
    return now - this.since;
  }
}

// ---------------------------------------------------------------------------
// Anomaly detector (dsp.py AnomalyZScore: window 240, k 4.0, debounce 3,
// cooldown 30 samples)
// ---------------------------------------------------------------------------

export class AnomalyZScore {
  private buf = new Ring(240);
  private hot = 0;
  private cool = 0;
  constructor(private k = 4.0, private debounce = 3, private cooldown = 30) {}

  /** Returns [zScore, isAnomaly]. */
  push(energy: number): [number, boolean] {
    if (this.cool > 0) this.cool -= 1;
    let z = 0;
    if (this.buf.length >= 20) {
      const m = mean(this.buf.buf);
      const sd = stdev(this.buf.buf, m);
      if (sd > 1e-6) z = (energy - m) / sd;
    }
    this.buf.push(energy);

    let isAnom = false;
    if (z >= this.k && this.cool === 0) {
      this.hot += 1;
      if (this.hot >= this.debounce) {
        isAnom = true;
        this.hot = 0;
        this.cool = this.cooldown;
      }
    } else {
      this.hot = Math.max(0, this.hot - 1);
    }
    return [z, isAnom];
  }
}

// ---------------------------------------------------------------------------
// Engine (engine.py SensingEngine._process, minus storage/SSE)
// ---------------------------------------------------------------------------

export interface SensingEvent {
  kind: "transition" | "anomaly";
  detail: string;
  at: number; // seconds, engine clock
}

export interface SensingSnapshot {
  energy: number;
  z: number;
  state: RoomStateCode;
  stateLabel: string;
  dwell: number;
  sector: SectorName | "";
  sectorConf: number;
  sectors: number[];
  nLinks: number;
  nReliable: number;
  calibrating: boolean;
  calibRemaining: number;
  anomaly: boolean; // true only on the tick the detector fires
}

/** Display labels for the WiFi Link mode (same four engine states). */
export const WIFI_LINK_LABELS: Record<RoomStateCode, string> = {
  EMPTY: "LINK QUIET",
  STILL: "LINK UNSETTLED",
  MOTION: "DISTURBANCE",
  ACTIVE: "ACTIVE DISTURBANCE",
};

/**
 * WiFi Link engine — RavenScope's ping backend (capture/ping.py), ported.
 *
 * RavenScope's universal fallback measures gateway ping RTT and encodes it
 * as a pseudo-signal, value = min(rtt_ms, 200) / 4, fed as a single link
 * through the identical DSP (Hampel -> EMA detrend -> windowed RMS ->
 * calibrated noise floor -> state machine -> z-score anomaly). We do the
 * same in the browser: the page times fetch probes to /api/sensing-ping
 * (~3 Hz) and feeds each round-trip time through this engine. The constant
 * -50 offset RavenScope adds is dropped — a constant shifts the baseline
 * but leaves every residual, and therefore every energy value, unchanged.
 *
 * Floor constants are RavenScope's own (0.3 / 8.0 in its dBm-scaled units,
 * which are exactly this value's units). Baseline alpha 0.017 keeps the
 * ~20 s time constant at the ~3 Hz probe rate.
 *
 * Honest scope: this observes THIS device's own link. Movement that
 * disturbs the path between this device and its router — carrying the
 * device, a person moving close to it, motion near the router — shows up
 * as jitter. A device sitting untouched on a stable link reads quiet. It
 * is not whole-room presence detection.
 */
export class RttSensingEngine {
  private proc = new LinkProcessor(0.017, { floorMin: 0.3, floorReliableMax: 8.0 });
  private room: RoomStateMachine;
  private anomaly = new AnomalyZScore();
  private calibDone = false;
  events: SensingEvent[] = [];

  constructor(private calibrateSeconds = 8, private tStart = 0) {
    this.room = new RoomStateMachine(DEFAULT_STATE_CONFIG, tStart);
  }

  /** Feed one probe round-trip time in milliseconds. */
  pushRtt(rttMs: number, now: number): SensingSnapshot {
    const elapsed = now - this.tStart;
    const calibrating = elapsed < this.calibrateSeconds;
    const value = Math.min(rttMs, 200) / 4; // RavenScope ping encoding
    const stats = this.proc.push(value, calibrating);

    if (!calibrating && !this.calibDone) {
      this.proc.finalizeCalibration();
      this.calibDone = true;
    }

    const fused = stats.samples >= 5 ? stats.energy : 0;
    const [z, isAnom] = this.anomaly.push(fused);
    const [state, transition] = this.room.update(fused, now);

    if (transition) this.events.push({ kind: "transition", detail: transition, at: now });
    if (isAnom) this.events.push({ kind: "anomaly", detail: `z=${z.toFixed(1)}`, at: now });
    if (this.events.length > 200) this.events.splice(0, this.events.length - 200);

    return {
      energy: Math.round(fused * 10000) / 10000,
      z: Math.round(z * 100) / 100,
      state,
      stateLabel: WIFI_LINK_LABELS[state],
      dwell: Math.round(this.room.dwell(now) * 10) / 10,
      sector: "",
      sectorConf: 0,
      sectors: [Math.round(stats.energy * 1000) / 1000],
      nLinks: 1,
      nReliable: stats.reliable ? 1 : 0,
      calibrating,
      calibRemaining: Math.max(0, this.calibrateSeconds - elapsed),
      anomaly: isAnom,
    };
  }
}

export class CameraSensingEngine {
  private procs: LinkProcessor[] = [];
  private room: RoomStateMachine;
  private anomaly = new AnomalyZScore();
  private calibDone = false;
  events: SensingEvent[] = [];

  /**
   * @param calibrateSeconds RavenScope default is 30 s; 8 s is used here as
   *   a documented adaptation for a phone demo (RavenScope's own evaluation
   *   runs used --calibrate 3). The calibration procedure is unchanged.
   */
  constructor(private calibrateSeconds = 8, private tStart = 0) {
    this.room = new RoomStateMachine(DEFAULT_STATE_CONFIG, tStart);
  }

  /**
   * Feed one processed frame.
   * @param sectorMad mean absolute frame difference (0..1) for the frame's
   *   [left, center, right] thirds.
   * @param now engine-clock seconds (monotonic).
   */
  pushFrame(sectorMad: [number, number, number], now: number): SensingSnapshot {
    const elapsed = now - this.tStart;
    const calibrating = elapsed < this.calibrateSeconds;

    if (this.procs.length === 0) {
      this.procs = sectorMad.map(() => new LinkProcessor());
    }
    const stats = this.procs.map((p, i) => p.push(sectorMad[i], calibrating));

    if (!calibrating && !this.calibDone) {
      this.procs.forEach((p) => p.finalizeCalibration());
      this.calibDone = true;
    }

    const { fused, nReliable } = fuseEnergy(stats);
    const sectorEnergies = stats.map((s) => s.energy);
    const dom = dominantSector(sectorEnergies);
    const [z, isAnom] = this.anomaly.push(fused);
    const [state, transition] = this.room.update(fused, now);

    if (transition) this.events.push({ kind: "transition", detail: transition, at: now });
    if (isAnom) this.events.push({ kind: "anomaly", detail: `z=${z.toFixed(1)}`, at: now });
    if (this.events.length > 200) this.events.splice(0, this.events.length - 200);

    return {
      energy: Math.round(fused * 10000) / 10000,
      z: Math.round(z * 100) / 100,
      state,
      stateLabel: STATE_LABELS[state],
      dwell: Math.round(this.room.dwell(now) * 10) / 10,
      sector: dom.index >= 0 ? SECTOR_NAMES[dom.index] : "",
      sectorConf: Math.round(dom.confidence * 100) / 100,
      sectors: sectorEnergies.map((x) => Math.round(x * 1000) / 1000),
      nLinks: stats.length,
      nReliable,
      calibrating,
      calibRemaining: Math.max(0, this.calibrateSeconds - elapsed),
      anomaly: isAnom,
    };
  }
}
