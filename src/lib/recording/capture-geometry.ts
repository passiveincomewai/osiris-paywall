/**
 * Capture geometry for stream recording — the pure math behind the
 * canvas pump (lib/recording/canvas-pump).
 *
 * Why a cap exists at all: recording used to encode the camera's native
 * frame (1080p, sometimes 4K) in software on the page's main thread,
 * which is what froze the recording wall the moment REC was pressed.
 * The pump samples the playing video onto a canvas at a fixed cadence
 * and a capped size instead — the same canvas-capture mechanism the
 * snapshot/timelapse path has always used — so the encoder's workload
 * is bounded no matter what resolution the camera serves.
 *
 * The numbers are the recording's honest shape and are stated wherever
 * the UI describes stream recording: at most 1280×720, 10 frames per
 * second. Snapshot cameras are unaffected (their frames arrive seconds
 * apart by nature).
 */

/** Widest frame a stream recording ever encodes. */
export const RECORDING_MAX_WIDTH = 1280;
/** Tallest frame a stream recording ever encodes. */
export const RECORDING_MAX_HEIGHT = 720;
/** Frames per second the pump samples a playing stream at. */
export const RECORDING_PUMP_FPS = 10;

export interface FrameSize {
  width: number;
  height: number;
}

/**
 * The size to draw a `width`×`height` source frame at so it fits inside
 * `maxWidth`×`maxHeight`, preserving aspect ratio and never upscaling.
 * Degenerate inputs (a video element that has not reported dimensions
 * yet) fall back to the cap box itself rather than a zero size, which
 * would produce an empty recording.
 */
export function fitWithin(
  width: number,
  height: number,
  maxWidth: number = RECORDING_MAX_WIDTH,
  maxHeight: number = RECORDING_MAX_HEIGHT,
): FrameSize {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { width: maxWidth, height: maxHeight };
  }
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  return {
    width: Math.max(2, Math.floor(width * scale)),
    height: Math.max(2, Math.floor(height * scale)),
  };
}
