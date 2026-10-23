/**
 * Render a sequence of still frames to a WebM blob — the renderer the
 * timelapse viewer's "export video" has always used (canvas +
 * captureStream(0) + one requestFrame per picture, paced in real time
 * at the playback speed), shared now with the capture-session layer:
 * when a snapshot (timelapse) recording stops, its new frames are
 * rendered through here and registered as a library clip, so a
 * snapshot recording lands in the same clips list as a live one
 * instead of existing only inside the viewer's timelapse panel.
 *
 * The output is honestly what the input is: the captured frames, in
 * order, at `fps` — steppy timelapse motion, never interpolated or
 * presented as smooth video.
 */
import { fitWithin } from "./capture-geometry";
import { pickRecorderMime } from "./save-clip";

type CanvasCaptureEl = HTMLCanvasElement & { captureStream(fps: number): MediaStream };

export interface RenderFramesOptions {
  /** Playback frames per second the rendered clip runs at. */
  fps: number;
  /** 0..1 progress, for callers with a progress UI (the viewer export). */
  onProgress?: (fraction: number) => void;
  /** Polled between frames; returning true stops the render early. */
  isCancelled?: () => boolean;
  /** Encoder bitrate; the viewer export's long-standing 4 Mbps by default. */
  videoBitsPerSecond?: number;
  /** Cap the render's dimensions (the session layer passes the
   *  recording cap, 1280×720; the viewer export passes nothing and
   *  renders at the frames' native size, as it always has). */
  maxWidth?: number;
  maxHeight?: number;
}

/**
 * Render `frames` to a WebM blob at `opts.fps`. Resolves with the blob
 * (possibly a truncated one when cancelled — the caller decides what a
 * cancel means; the viewer export discards it, as it always has).
 * Throws when the browser cannot render (no 2d context, no canvas
 * capture, no MediaRecorder).
 */
export async function renderFramesToWebm(
  frames: Blob[],
  opts: RenderFramesOptions,
): Promise<Blob> {
  if (frames.length === 0) throw new Error("No frames to render");
  const first = await createImageBitmap(frames[0]);
  try {
    const canvas = document.createElement("canvas") as CanvasCaptureEl;
    const size =
      opts.maxWidth || opts.maxHeight
        ? fitWithin(first.width, first.height, opts.maxWidth, opts.maxHeight)
        : { width: first.width, height: first.height };
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    if (typeof canvas.captureStream !== "function") {
      throw new Error("Canvas capture is not supported in this browser");
    }
    const stream = canvas.captureStream(0);
    const track = stream.getVideoTracks()[0] as
      | (MediaStreamTrack & { requestFrame?: () => void })
      | undefined;
    const mime = pickRecorderMime();
    const rec = new MediaRecorder(
      stream,
      mime
        ? { mimeType: mime, videoBitsPerSecond: opts.videoBitsPerSecond ?? 4_000_000 }
        : undefined,
    );
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    const stopped = new Promise<void>((resolve) => {
      rec.onstop = () => resolve();
    });
    rec.start(250);
    const frameMs = 1000 / Math.max(1, opts.fps);
    for (let i = 0; i < frames.length; i++) {
      if (opts.isCancelled?.()) break;
      const bmp = i === 0 ? first : await createImageBitmap(frames[i]);
      try {
        ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      } finally {
        if (i !== 0) bmp.close();
      }
      track?.requestFrame?.();
      opts.onProgress?.((i + 1) / frames.length);
      await new Promise((r) => setTimeout(r, frameMs));
    }
    rec.stop();
    await stopped;
    return new Blob(chunks, { type: mime || "video/webm" });
  } finally {
    first.close();
  }
}
