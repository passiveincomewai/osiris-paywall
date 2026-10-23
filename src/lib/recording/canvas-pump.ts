/**
 * The canvas pump: turn a playing <video> into a MediaStream by drawing
 * it onto a canvas at a capped cadence and size, then capturing the
 * canvas — literally the mechanism the snapshot path has always used
 * (canvas + captureStream(0) + drawImage + requestFrame), applied to a
 * live video element.
 *
 * This is what replaced direct `video.captureStream()` + full-native-
 * resolution encoding, the combination that froze the recording wall:
 * hls.js transmuxing already lives on the main thread in these players,
 * and a software VP9 encode of a 1080p/4K frame on top of it starved
 * the UI for the whole recording. The pump's canvas is at most
 * 1280×720 and is painted 10 times a second, so the encoder's work is
 * bounded and the page stays usable while recording runs.
 *
 * The honest consequence, stated in the UI copy as well: stream
 * recordings are 10 fps frame samples at up to 720p — the same sampled
 * shape snapshot recordings have always had — not a bit-perfect copy
 * of the source stream.
 *
 * Failure mode: a canvas painted from a video the browser treats as
 * origin-unclean (a non-CORS direct-file stream) refuses captureStream
 * with a SecurityError. The pump throws that to its caller, which
 * falls back to the element's own captureStream — the recording still
 * happens, at the old cost, rather than not at all.
 */
import Hls from "hls.js";
import { RECORDING_PUMP_FPS, fitWithin } from "./capture-geometry";
import { streamIsHls } from "./multi";

type CanvasCaptureEl = HTMLCanvasElement & { captureStream(fps: number): MediaStream };
type VideoCaptureEl = HTMLVideoElement & {
  captureStream?: () => MediaStream;
  mozCaptureStream?: () => MediaStream;
};

export interface CanvasPump {
  stream: MediaStream;
  /** Stop painting and release the canvas stream's tracks. */
  stop: () => void;
}

/**
 * Start pumping `video` into a canvas stream. Throws when canvas
 * capture is unavailable or refused (tainted canvas) — callers fall
 * back to capturing the element directly.
 */
export function startCanvasPump(
  video: HTMLVideoElement,
  opts?: { fps?: number; maxWidth?: number; maxHeight?: number },
): CanvasPump {
  const fps = opts?.fps ?? RECORDING_PUMP_FPS;
  const canvas = document.createElement("canvas") as CanvasCaptureEl;
  if (typeof canvas.captureStream !== "function") {
    throw new Error("Canvas capture is not supported in this browser");
  }
  const size = fitWithin(video.videoWidth, video.videoHeight, opts?.maxWidth, opts?.maxHeight);
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas capture is not supported in this browser");

  // Paint once synchronously so a refused (tainted) canvas fails here,
  // before any stream exists — captureStream itself is the operation
  // the browser refuses on an origin-unclean canvas.
  if (video.readyState >= 2) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const stream = canvas.captureStream(0);
  const track = stream.getVideoTracks()[0] as
    | (MediaStreamTrack & { requestFrame?: () => void })
    | undefined;

  let stopped = false;
  const draw = () => {
    if (stopped) return;
    if (video.readyState >= 2 && !video.ended) {
      // The element may only report its real dimensions after data
      // arrives; adopt them (capped) whenever they differ from the
      // canvas's current size.
      if (video.videoWidth > 0) {
        const s = fitWithin(video.videoWidth, video.videoHeight, opts?.maxWidth, opts?.maxHeight);
        if (s.width !== canvas.width || s.height !== canvas.height) {
          canvas.width = s.width;
          canvas.height = s.height;
        }
      }
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        track?.requestFrame?.();
      } catch {
        /* a transient draw failure holds the last painted frame */
      }
    }
  };
  draw();
  const timer = setInterval(draw, Math.round(1000 / fps));

  return {
    stream,
    stop: () => {
      stopped = true;
      clearInterval(timer);
      for (const t of stream.getTracks()) {
        try { t.stop(); } catch { /* already ended */ }
      }
    },
  };
}

/* ------------------------------------------------------------------ */
/* Opening a stream for recording — the one opener every stream       */
/* recording uses (capture sessions and the multi-record tiles alike). */
/* ------------------------------------------------------------------ */

export interface DetachedVideoStream {
  stream: MediaStream;
  teardown: () => void;
}

/**
 * Load a camera stream in a detached <video> the recording owns and
 * return the stream to record. Layered, in order:
 *
 *  1. HLS with hls.js when it is supported (desktop MSE; iOS 17+
 *     ManagedMediaSource): the element is fed from a same-origin
 *     blob, so its picture is canvas-readable as-is. The transmux
 *     worker stays ON — a recording pipeline must not share the UI
 *     thread the way the old `enableWorker: false` players did.
 *  2. Native playback (iOS Safari HLS, direct files): first with
 *     CORS approval requested — the only way a natively played
 *     stream stays readable by the canvas — and, when a host without
 *     CORS headers refuses that load outright, again plainly, the
 *     way the viewer plays it.
 *
 *  Capture is the canvas pump first: it is the only route on
 *  browsers with no element captureStream (iOS Safari — the absence
 *  behind "This browser blocked stream capture"), and everywhere
 *  else it is what bounds the encode. The element's own
 *  captureStream is the fallback for a canvas that refuses (an
 *  origin-unclean feed the CORS retry could not clean). When no
 *  route exists the opener throws, before any recording starts.
 *
 *  Which streams are HLS is decided by the declared type first
 *  (streamIsHls): extensionless playlist URLs are the ones that used
 *  to be loaded as media files and fail.
 */
export async function openDetachedVideoStream(source: {
  streamUrl: string;
  streamType?: string | null;
}): Promise<DetachedVideoStream> {
  const streamUrl = source.streamUrl;
  const isHls = streamIsHls(streamUrl, source.streamType);
  const video = document.createElement("video") as VideoCaptureEl;
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  let hls: Hls | null = null;
  let pump: CanvasPump | null = null;
  const teardown = () => {
    try { pump?.stop(); } catch { /* already gone */ }
    try { hls?.destroy(); } catch { /* already gone */ }
    try {
      video.pause();
      video.removeAttribute("src");
      video.load();
    } catch { /* already gone */ }
  };

  const attach = async (cors: boolean): Promise<void> => {
    const waitReady = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Stream took too long to start")), 15000);
      const ok = () => { clearTimeout(timer); resolve(); };
      const bad = () => { clearTimeout(timer); reject(new Error("Stream failed to load")); };
      if (video.readyState >= 2) { ok(); return; }
      video.addEventListener("loadeddata", ok, { once: true });
      video.addEventListener("error", bad, { once: true });
      hls?.on(Hls.Events.ERROR, (_e, d) => { if (d.fatal) bad(); });
    });
    if (isHls && Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, maxBufferLength: 20 });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
    } else if (isHls) {
      if (!video.canPlayType("application/vnd.apple.mpegurl")) {
        throw new Error("HLS is not supported in this browser");
      }
      if (cors) video.crossOrigin = "anonymous";
      video.src = streamUrl;
    } else {
      if (cors) video.crossOrigin = "anonymous";
      video.src = streamUrl;
    }
    await waitReady;
  };

  if (isHls && Hls.isSupported()) {
    await attach(false).catch((e: unknown) => {
      teardown();
      throw e;
    });
  } else {
    try {
      await attach(true);
    } catch {
      // No Hls instance exists on this path (attach only builds one
      // when hls.js is supported, and that case never reaches here) —
      // just reset the element and retry without the CORS attribute.
      hls = null;
      video.removeAttribute("crossorigin");
      try {
        video.pause();
        video.removeAttribute("src");
        video.load();
      } catch { /* already gone */ }
      await attach(false).catch((e: unknown) => {
        teardown();
        throw e;
      });
    }
  }
  video.play().catch(() => {});

  let stream: MediaStream | null = null;
  try {
    pump = startCanvasPump(video);
    stream = pump.stream;
  } catch {
    pump = null;
  }
  if (!stream) {
    try {
      const capture = video.captureStream ?? video.mozCaptureStream;
      stream = capture ? capture.call(video) : null;
    } catch {
      stream = null;
    }
  }
  if (!stream) {
    teardown();
    throw new Error("This browser blocked stream capture");
  }
  if (!stream.getVideoTracks().length) {
    teardown();
    throw new Error("No video track to record");
  }
  return { stream, teardown };
}
