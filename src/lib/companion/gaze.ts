"use client";
/**
 * WorldEye Companion — gaze & presence (Phase 4). Additive only.
 *
 * Face tracking uses the Shape Detection API (`window.FaceDetector`) on a
 * low-frequency sampler over a hidden, muted <video> element fed by
 * getUserMedia. Face detection runs ON-DEVICE in the browser; frames are
 * never uploaded, recorded, stored, or sent anywhere — they exist only
 * as pixels in this page while the sampler runs. The sampler's entire
 * output is a normalized gaze point (see GazeState) written into a ref
 * the avatar reads each frame.
 *
 * When face detection is unavailable (no FaceDetector — Safari/Firefox)
 * or the camera is denied, the widget falls back to POINTER gaze: the
 * avatar follows the user's pointer/touch position over the sheet. That
 * fallback is labeled `source: "pointer"` everywhere — it is not face
 * tracking and is never presented as such.
 */

export type GazeSource = "face" | "pointer" | "none";

export interface GazeState {
  /** -1..1 horizontal offset of the attended point from center (screen space). */
  x: number;
  /** -1..1 vertical offset of the attended point from center (screen space). */
  y: number;
  /** True while a face (or recent pointer) is being attended to. */
  present: boolean;
  source: GazeSource;
}

export const NEUTRAL_GAZE: GazeState = { x: 0, y: 0, present: false, source: "none" };

export interface GazePoint { x: number; y: number }

export function clampUnit(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(-1, Math.min(1, v));
}

/**
 * Normalize a face-center position within a camera frame to -1..1 offsets
 * from frame center. (0,0) = centered, (-1,-1) = top-left corner.
 */
export function normalizeFaceCenter(cx: number, cy: number, width: number, height: number): GazePoint {
  if (width <= 0 || height <= 0) return { x: 0, y: 0 };
  return {
    x: clampUnit((cx / width) * 2 - 1),
    y: clampUnit((cy / height) * 2 - 1),
  };
}

/**
 * Normalize a pointer position over a rect to -1..1 offsets from the
 * rect's center. Used for pointer gaze (avatar looks toward your finger /
 * cursor relative to the avatar's own box).
 */
export function pointerToGaze(
  px: number,
  py: number,
  rect: { left: number; top: number; width: number; height: number },
): GazePoint {
  if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
  return {
    x: clampUnit(((px - rect.left) / rect.width) * 2 - 1),
    y: clampUnit(((py - rect.top) / rect.height) * 2 - 1),
  };
}

/**
 * Smoothing + presence debounce for gaze samples.
 *
 * Samples (face or pointer) exponentially ease the current point toward
 * the latest one. Presence is time-debounced: a face seen within the
 * last `faceExitMs` counts as present, so detection dropouts shorter
 * than that window don't flicker the avatar's attentive state; pointer
 * presence similarly lingers for `pointerExitMs` after the last move.
 * When nothing is fresh, snapshot() reports present:false and eases the
 * point back to center. A fresh face sample takes precedence over
 * pointer gaze.
 */
export class GazeSmoother {
  private x = 0;
  private y = 0;
  private lastFaceAt = Number.NEGATIVE_INFINITY;
  private lastPointerAt = Number.NEGATIVE_INFINITY;
  private readonly alpha: number;
  private readonly faceExitMs: number;
  private readonly pointerExitMs: number;

  constructor(opts?: { alpha?: number; faceExitMs?: number; pointerExitMs?: number }) {
    this.alpha = opts?.alpha ?? 0.35;
    this.faceExitMs = opts?.faceExitMs ?? 1200;
    this.pointerExitMs = opts?.pointerExitMs ?? 2500;
  }

  /** Feed a detected face offset (already normalized), or null for "no face this tick". */
  faceSample(offset: GazePoint | null, now: number): void {
    if (!offset) return; // absence is handled by time-based expiry in snapshot()
    this.lastFaceAt = now;
    this.x += (offset.x - this.x) * this.alpha;
    this.y += (offset.y - this.y) * this.alpha;
  }

  /** Feed a pointer offset. Ignored while a face is freshly tracked (face wins). */
  pointerSample(offset: GazePoint, now: number): void {
    if (now - this.lastFaceAt < this.faceExitMs) return;
    this.lastPointerAt = now;
    this.x += (offset.x - this.x) * this.alpha;
    this.y += (offset.y - this.y) * this.alpha;
  }

  /** Current gaze state at time `now` (ms). Applies presence expiry + release easing. */
  snapshot(now: number): GazeState {
    const faceFresh = now - this.lastFaceAt <= this.faceExitMs;
    const pointerFresh = now - this.lastPointerAt <= this.pointerExitMs;
    if (!faceFresh && !pointerFresh) {
      this.x += (0 - this.x) * this.alpha;
      this.y += (0 - this.y) * this.alpha;
      if (Math.abs(this.x) < 0.001) this.x = 0;
      if (Math.abs(this.y) < 0.001) this.y = 0;
      return { x: this.x, y: this.y, present: false, source: "none" };
    }
    return { x: this.x, y: this.y, present: true, source: faceFresh ? "face" : "pointer" };
  }

  reset(): void {
    this.x = 0;
    this.y = 0;
    this.lastFaceAt = Number.NEGATIVE_INFINITY;
    this.lastPointerAt = Number.NEGATIVE_INFINITY;
  }
}

/* ---------------- FaceDetector sampler (browser glue) ---------------- */

interface DetectedFaceLike {
  boundingBox: { x: number; y: number; width: number; height: number };
}

interface FaceDetectorLike {
  detect(source: HTMLVideoElement): Promise<DetectedFaceLike[]>;
}

export function faceTrackingSupported(): boolean {
  return typeof window !== "undefined" &&
    "FaceDetector" in window &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia;
}

export type FaceStartResult =
  | { ok: true }
  | { ok: false; reason: "denied" | "unsupported" | "error"; message?: string };

/**
 * Low-frequency face sampler. Owns the camera stream and a hidden video
 * element; calls back with a normalized gaze point per detected face
 * (largest face wins) or null when no face is visible. Sampling pauses
 * while the tab is hidden. x is mirror-flipped: front cameras deliver an
 * unmirrored frame, and flipping makes the avatar turn the way a person
 * facing you would.
 */
export class FaceSampler {
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private detector: FaceDetectorLike | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private onSample: ((offset: GazePoint | null) => void) | null = null;
  private running = false;
  private readonly onVisibility = () => {
    if (!this.running) return;
    if (document.hidden) this.clearTimer();
    else this.startTimer();
  };

  private clearTimer() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  private startTimer() {
    this.clearTimer();
    this.timer = setInterval(() => { void this.tick(); }, 200); // ~5 fps
  }

  private async tick(): Promise<void> {
    const { detector, video, onSample } = this;
    if (!detector || !video || !onSample || video.readyState < 2) return;
    try {
      const faces = await detector.detect(video);
      if (!faces.length) { onSample(null); return; }
      let best = faces[0];
      for (const f of faces) {
        if (f.boundingBox.width * f.boundingBox.height > best.boundingBox.width * best.boundingBox.height) best = f;
      }
      const b = best.boundingBox;
      const raw = normalizeFaceCenter(b.x + b.width / 2, b.y + b.height / 2, video.videoWidth, video.videoHeight);
      onSample({ x: -raw.x, y: raw.y }); // mirror flip (see class doc)
    } catch {
      onSample(null); // transient detect failure = "no face this tick"
    }
  }

  async start(onSample: (offset: GazePoint | null) => void): Promise<FaceStartResult> {
    if (this.running) return { ok: true };
    if (!faceTrackingSupported()) return { ok: false, reason: "unsupported" };
    const DetectorCtor = (window as unknown as { FaceDetector?: new (opts?: { fastMode?: boolean }) => FaceDetectorLike }).FaceDetector;
    if (!DetectorCtor) return { ok: false, reason: "unsupported" }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
    } catch (e) {
      const name = (e as { name?: string })?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        return { ok: false, reason: "denied", message: "Camera access was denied" };
      }
      return { ok: false, reason: "error", message: e instanceof Error ? e.message : "Camera unavailable" };
    }

    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    try {
      await video.play();
      this.detector = new DetectorCtor({ fastMode: true });
    } catch (e) {
      stream.getTracks().forEach((t) => t.stop());
      return { ok: false, reason: "error", message: e instanceof Error ? e.message : "Face detection failed to start" };
    }

    this.stream = stream;
    this.video = video;
    this.onSample = onSample;
    this.running = true;
    document.addEventListener("visibilitychange", this.onVisibility);
    if (!document.hidden) this.startTimer();
    return { ok: true };
  }

  /** Stop sampling, release the camera, and drop all frame references. */
  stop(): void {
    this.running = false;
    this.clearTimer();
    document.removeEventListener("visibilitychange", this.onVisibility);
    if (this.stream) { this.stream.getTracks().forEach((t) => t.stop()); this.stream = null; }
    if (this.video) { try { this.video.pause(); } catch {} this.video.srcObject = null; this.video = null; }
    this.detector = null;
    this.onSample = null;
  }
}
