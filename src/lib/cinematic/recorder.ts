/**
 * OSIRIS — globe canvas recording / export.
 *
 * The pattern is the one the Marketing Studio exporter already ships with
 * (src/app/affiliates/studio — canvas.captureStream + MediaRecorder +
 * pickMimeType, including its honest unsupported-browser message style).
 * Two globe-specific facts shape this module:
 *
 * - captureStream does NOT need preserveDrawingBuffer (that flag gates
 *   toDataURL readback, not stream capture) — the map is created without
 *   it and recording still works.
 * - MapLibre renders on demand. During a static scene the stream would
 *   starve, so while recording we drive the caller's repaint hook on an
 *   interval. The recording's resolution is the live canvas size — there
 *   is no separate render pass — and there is no audio track.
 */
import { pickMimeType } from '@/lib/studio/video-render';

export type GlobeRecordingSupport = { supported: true } | { supported: false; reason: string };

export function globeRecordingSupport(canvas?: HTMLCanvasElement | null): GlobeRecordingSupport {
  if (typeof MediaRecorder === 'undefined') {
    return {
      supported: false,
      reason: "This browser doesn't support MediaRecorder, so it can't record the globe. Try a recent Chrome, Edge or Firefox.",
    };
  }
  if (!canvas || typeof canvas.captureStream !== 'function') {
    return {
      supported: false,
      reason: "This browser can't capture the map canvas as a video stream (canvas captureStream is unavailable — Safari is the usual case). Try a recent Chrome, Edge or Firefox.",
    };
  }
  if (!pickMimeType((t) => MediaRecorder.isTypeSupported(t))) {
    return {
      supported: false,
      reason: 'This browser has no WebM video encoder available for MediaRecorder, so globe recording is unavailable here.',
    };
  }
  return { supported: true };
}

export interface GlobeRecorder {
  /** Stop recording and resolve with the WebM blob. */
  stop(): Promise<Blob>;
  readonly recording: boolean;
}

export function startGlobeRecorder(
  canvas: HTMLCanvasElement,
  opts: {
    /** Called on an interval while recording (drives MapLibre repaints). */
    repaint: () => void;
    onError?: (e: unknown) => void;
  },
): GlobeRecorder {
  const stream = canvas.captureStream(30);
  const mime = pickMimeType((t) => MediaRecorder.isTypeSupported(t));
  const recorder = new MediaRecorder(
    stream,
    mime ? { mimeType: mime, videoBitsPerSecond: 8_000_000 } : { videoBitsPerSecond: 8_000_000 },
  );
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };
  if (opts.onError) recorder.onerror = (e) => opts.onError?.(e);
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });
  recorder.start(250);
  const repaintTimer = setInterval(() => {
    try { opts.repaint(); } catch { /* a failed repaint must not kill the recording */ }
  }, 100);

  let stoppedOnce = false;
  return {
    get recording() {
      return recorder.state === 'recording';
    },
    async stop() {
      if (stoppedOnce) return new Blob(chunks, { type: mime ?? 'video/webm' });
      stoppedOnce = true;
      clearInterval(repaintTimer);
      if (recorder.state !== 'inactive') recorder.stop();
      await stopped;
      stream.getTracks().forEach((t) => t.stop());
      return new Blob(chunks, { type: mime ?? 'video/webm' });
    },
  };
}

/** Save a blob as a downloaded file (the Studio exporter's finish). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
