/**
 * Can this browser record a playing camera at all?
 *
 * A MediaRecorder is always required. For its input, either of two
 * capture primitives suffices:
 *  - `captureStream` on the media element (the direct route), or
 *  - `captureStream` on a canvas (the pump route: the playing video is
 *    drawn onto a canvas, and the canvas is what gets recorded).
 *
 * The canvas route matters because the direct one is the gap on iOS
 * Safari: it has no `HTMLVideoElement.captureStream` at all (which is
 * where "This browser blocked stream capture" came from), while canvas
 * capture and MediaRecorder are both present there. Where neither
 * primitive exists, recording UI must say so plainly instead of
 * offering a button that cannot work.
 *
 * Kept as a pure function over a window-shaped value so the logic that
 * runs is the logic under test.
 */
export interface CaptureWindowShape {
  MediaRecorder?: unknown;
  HTMLVideoElement?: { prototype: object } | undefined;
  HTMLCanvasElement?: { prototype: object } | undefined;
}

export function liveCaptureSupported(w: CaptureWindowShape | null | undefined): boolean {
  if (!w) return false;
  const hasRecorder = typeof w.MediaRecorder === "function";
  if (!hasRecorder) return false;
  const videoProto = w.HTMLVideoElement?.prototype as Record<string, unknown> | undefined;
  const hasElementCapture =
    !!videoProto &&
    (typeof videoProto.captureStream === "function" ||
      typeof videoProto.mozCaptureStream === "function");
  const canvasProto = w.HTMLCanvasElement?.prototype as Record<string, unknown> | undefined;
  const hasCanvasCapture = !!canvasProto && typeof canvasProto.captureStream === "function";
  return hasElementCapture || hasCanvasCapture;
}
