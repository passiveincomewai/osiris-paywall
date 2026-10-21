/**
 * Can this browser record a playing <video> at all?
 *
 * Two primitives must both exist: `captureStream` on the media element
 * (to take the picture off the <video>) and `MediaRecorder` (to encode
 * it). Chrome, Edge and Firefox have both; Safari is the usual gap —
 * both arrived late there, and some versions have one without the
 * other. Where either is missing, recording UI must say so plainly
 * instead of offering a button that cannot work.
 *
 * Kept as a pure function over a window-shaped value so the logic that
 * runs is the logic under test.
 */
export interface CaptureWindowShape {
  MediaRecorder?: unknown;
  HTMLVideoElement?: { prototype: object } | undefined;
}

export function liveCaptureSupported(w: CaptureWindowShape | null | undefined): boolean {
  if (!w) return false;
  const proto = w.HTMLVideoElement?.prototype as Record<string, unknown> | undefined;
  const hasCaptureStream =
    !!proto &&
    (typeof proto.captureStream === "function" || typeof proto.mozCaptureStream === "function");
  const hasRecorder = typeof w.MediaRecorder === "function";
  return hasCaptureStream && hasRecorder;
}
