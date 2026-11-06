/**
 * "Capture this moment" — a branded share card for the camera on screen.
 *
 * The card is composed on a canvas in the visitor's browser from two
 * honest inputs only:
 *   - the camera's real record (its name and place, exactly as the
 *     catalogue carries them — never relabelled, never embellished), and
 *   - the frame the visitor is looking at, WHEN the browser is allowed
 *     to read it. A still camera's frame comes through WorldEye's own
 *     frame proxy (same origin, so its pixels are readable); a live
 *     HLS stream's frame is taken from the <video> playing it, which
 *     works only when the feed's host sends CORS headers — many do
 *     not, and then the canvas is "tainted" and the browser refuses
 *     to export it. That refusal is detected (the PNG export throws)
 *     and the card falls back to a designed panel carrying the
 *     camera's real name, place and the capture time. No substitute
 *     picture is ever drawn: a card without a frame shows no image
 *     of the place at all.
 *
 * The timestamp on the card is the moment of capture, formatted for
 * America/Denver and labelled "Captured …" — it is not the camera's
 * local time and is never presented as such.
 */

import { buildCameraShareUrl, cameraShareId, cameraShareTitle, type ShareableCamera } from './camera-share';
import { LIVE_CAMERA_COUNT_LABEL } from './site-stats';

export const SNAPSHOT_CARD_WIDTH = 1200;
export const SNAPSHOT_CARD_HEIGHT = 675;

/** The locked headline figure, imported so the card can never drift from it. */
export const SNAPSHOT_CARD_TAGLINE = `${LIVE_CAMERA_COUNT_LABEL} live cameras`;
export const SNAPSHOT_CARD_SITE = 'worldeye.app';

export interface SnapshotCardMeta {
  /** The camera's real name, or a plain fallback when the record has none. */
  name: string;
  /** "City, Country" from the record; empty when it carries neither. */
  place: string;
  /** Denver-formatted capture moment, e.g. "Nov 6, 2026 · 1:07 AM MST". */
  capturedLabel: string;
  /** Download filename for the composed PNG. */
  fileName: string;
  /** Share-sheet title: the same words the viewer's SHARE button uses. */
  shareTitle: string;
  /** The camera's canonical deep link (null when the record has no id). */
  shareUrl: string | null;
}

const denverCaptureFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Denver',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
});

/** Denver capture label: "Nov 6, 2026 · 1:07 AM MST". */
export function formatCaptureTime(at: Date): string {
  const parts = denverCaptureFormat.formatToParts(at);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${get('month')} ${get('day')}, ${get('year')} · ${get('hour')}:${get('minute')} ${get('dayPeriod')} ${get('timeZoneName')}`;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'camera';
}

/** Everything the card says, derived from the real record + capture moment. */
export function snapshotCardMeta(
  camera: ShareableCamera | null | undefined,
  capturedAt: Date,
  base?: string,
): SnapshotCardMeta {
  const name = camera?.name?.trim() ? camera.name.trim() : 'Live camera';
  const place = [camera?.city, camera?.country].map(p => p?.trim()).filter(Boolean).join(', ');
  const stamp = capturedAt.toISOString().replace(/[:.]/g, '').slice(0, 15);
  return {
    name,
    place,
    capturedLabel: formatCaptureTime(capturedAt),
    fileName: `worldeye-${slugify(name)}-${stamp}.png`,
    shareTitle: cameraShareTitle(camera),
    shareUrl: buildCameraShareUrl(camera, base),
  };
}

/** Source crop rect that makes (srcW×srcH) cover (dstW×dstH) — centre crop. */
export function coverCrop(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): { sx: number; sy: number; sw: number; sh: number } {
  const scale = Math.max(dstW / srcW, dstH / srcH);
  const sw = dstW / scale;
  const sh = dstH / scale;
  return { sx: (srcW - sw) / 2, sy: (srcH - sh) / 2, sw, sh };
}

/** Shorten with an ellipsis to at most maxChars (for canvas text fitting). */
export function ellipsize(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 1))}…`;
}

/* ── Canvas composition (browser only) ─────────────────────────────── */

type FrameSource = CanvasImageSource & { width: number; height: number };

function drawCard(
  ctx: CanvasRenderingContext2D,
  meta: SnapshotCardMeta,
  frame: FrameSource | null,
): void {
  const W = SNAPSHOT_CARD_WIDTH;
  const H = SNAPSHOT_CARD_HEIGHT;

  if (frame) {
    const { sx, sy, sw, sh } = coverCrop(frame.width, frame.height, W, H);
    ctx.drawImage(frame, sx, sy, sw, sh, 0, 0, W, H);
  } else {
    // Designed fallback panel — deliberately NOT a picture of anywhere:
    // a dark field, a faint grid, and a simple camera mark.
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#071410');
    grad.addColorStop(1, '#020604');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(216,198,144,0.07)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    // Camera mark: ring + lens dot, centred upper-middle.
    ctx.strokeStyle = 'rgba(216,198,144,0.55)';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(W / 2, 215, 74, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(216,198,144,0.55)';
    ctx.beginPath(); ctx.arc(W / 2, 215, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '600 30px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LIVE NOW ON WORLDEYE', W / 2, 355);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '24px system-ui, sans-serif';
    ctx.fillText('This feed’s picture can’t be captured in the browser —', W / 2, 400);
    ctx.fillText('watch it live through the link instead.', W / 2, 434);
    ctx.textAlign = 'left';
  }

  // Bottom information band.
  const band = ctx.createLinearGradient(0, H - 210, 0, H);
  band.addColorStop(0, 'rgba(0,0,0,0)');
  band.addColorStop(0.45, 'rgba(0,0,0,0.72)');
  band.addColorStop(1, 'rgba(0,0,0,0.92)');
  ctx.fillStyle = band;
  ctx.fillRect(0, H - 210, W, 210);

  // Live dot + wordmark, top-left.
  ctx.fillStyle = '#ef4444';
  ctx.beginPath(); ctx.arc(46, 48, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 30px system-ui, sans-serif';
  ctx.fillText('WORLDEYE', 68, 59);

  // Camera name + place/capture line, bottom-left.
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 44px system-ui, sans-serif';
  ctx.fillText(ellipsize(meta.name, 44), 40, H - 84);
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.font = '26px system-ui, sans-serif';
  const sub = [meta.place, `Captured ${meta.capturedLabel}`].filter(Boolean).join(' · ');
  ctx.fillText(ellipsize(sub, 62), 40, H - 40);

  // Tagline, bottom-right.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#d8c690';
  ctx.font = '600 25px system-ui, sans-serif';
  ctx.fillText(SNAPSHOT_CARD_TAGLINE, W - 40, H - 84);
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.font = '25px system-ui, sans-serif';
  ctx.fillText(SNAPSHOT_CARD_SITE, W - 40, H - 40);
  ctx.textAlign = 'left';
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('The card could not be rendered'))), 'image/png');
    } catch (err) {
      // A tainted canvas (non-CORS frame drawn in) throws SecurityError here.
      reject(err);
    }
  });
}

/**
 * Compose the share card. With a frame: the frame card. If exporting
 * the framed card is refused (tainted canvas) — or no frame was
 * available — the designed fallback card is composed instead, so the
 * visitor always gets a truthful card, never a fake picture.
 * Returns the PNG and whether it carries the real frame.
 */
export async function composeSnapshotCard(
  meta: SnapshotCardMeta,
  frame: FrameSource | null,
): Promise<{ blob: Blob; hasFrame: boolean }> {
  const render = async (withFrame: FrameSource | null) => {
    const canvas = document.createElement('canvas');
    canvas.width = SNAPSHOT_CARD_WIDTH;
    canvas.height = SNAPSHOT_CARD_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available');
    drawCard(ctx, meta, withFrame);
    return canvasToPng(canvas);
  };
  if (frame) {
    try {
      return { blob: await render(frame), hasFrame: true };
    } catch {
      /* tainted — fall through to the designed card */
    }
  }
  return { blob: await render(null), hasFrame: false };
}

/**
 * Grab the frame the visitor is looking at, when one is readable:
 *  - still (jpg) cameras: through WorldEye's own frame proxy by
 *    catalogue id — same origin, so the pixels are always readable;
 *  - live (hls) cameras: from the <video> element playing the stream —
 *    readable only when the feed host allows it (checked at export).
 * Anything else (iframe/mjpeg/mp4/external) has no readable frame and
 * returns null, which composes the fallback card.
 */
export async function grabViewableFrame(
  camera: (ShareableCamera & { stream_type?: string | null; feed_url?: string | null }) | null | undefined,
  video: HTMLVideoElement | null,
): Promise<FrameSource | null> {
  const type = camera?.stream_type || 'jpg';
  if (type === 'hls') {
    if (!video || video.readyState < 2 || !video.videoWidth) return null;
    try {
      return await createImageBitmap(video);
    } catch {
      return null;
    }
  }
  if (type === 'jpg') {
    const id = cameraShareId(camera);
    if (!id) return null;
    try {
      const res = await fetch(`/api/cctv/frame?id=${encodeURIComponent(id)}`);
      if (!res.ok) return null;
      const blob = await res.blob();
      return await createImageBitmap(blob);
    } catch {
      return null;
    }
  }
  return null;
}

/* ── Card actions (browser only; the env is injectable for tests) ──── */

export interface SnapshotShareEnv {
  canShareFiles?: (file: File) => boolean;
  share?: (data: { title: string; text: string; url?: string; files?: File[] }) => Promise<void>;
  clipboardWrite?: (text: string) => Promise<void>;
  legacyCopy?: (text: string) => boolean;
  download?: (blob: Blob, fileName: string) => void;
}

export type SnapshotShareOutcome = 'shared-file' | 'shared-link' | 'copied' | 'dismissed' | 'unavailable';

function defaultSnapshotShareEnv(): SnapshotShareEnv {
  if (typeof navigator === 'undefined') return {};
  const env: SnapshotShareEnv = {};
  if (typeof navigator.canShare === 'function') {
    env.canShareFiles = file => {
      try { return navigator.canShare({ files: [file] }); } catch { return false; }
    };
  }
  if (typeof navigator.share === 'function') {
    env.share = data => navigator.share(data);
  }
  if (typeof navigator.clipboard?.writeText === 'function') {
    env.clipboardWrite = text => navigator.clipboard.writeText(text);
  }
  if (typeof document !== 'undefined') {
    env.legacyCopy = text => {
      try {
        const input = document.createElement('input');
        input.value = text;
        document.body.appendChild(input);
        input.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(input);
        return ok;
      } catch {
        return false;
      }
    };
    env.download = (blob, fileName) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    };
  }
  return env;
}

/**
 * Share the composed card: the PNG file itself where the platform
 * accepts files (iOS Safari does — this is the iPhone path), else the
 * camera's deep link through the share sheet, else the clipboard. A
 * dismissed sheet is reported, never followed by a silent copy.
 */
export async function shareSnapshotCard(
  blob: Blob,
  meta: SnapshotCardMeta,
  env: SnapshotShareEnv = defaultSnapshotShareEnv(),
): Promise<SnapshotShareOutcome> {
  const text = meta.shareUrl ? `${meta.shareTitle} — watch it live: ${meta.shareUrl}` : meta.shareTitle;
  if (env.share) {
    const file = new File([blob], meta.fileName, { type: 'image/png' });
    if (env.canShareFiles?.(file)) {
      try {
        await env.share({ title: meta.shareTitle, text, files: [file] });
        return 'shared-file';
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return 'dismissed';
        /* a real file-share failure falls through to the link sheet */
      }
    }
    if (meta.shareUrl) {
      try {
        await env.share({ title: meta.shareTitle, text, url: meta.shareUrl });
        return 'shared-link';
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return 'dismissed';
      }
    }
  }
  if (meta.shareUrl) {
    if (env.clipboardWrite) {
      try {
        await env.clipboardWrite(meta.shareUrl);
        return 'copied';
      } catch { /* fall through */ }
    }
    if (env.legacyCopy) {
      try {
        if (env.legacyCopy(meta.shareUrl)) return 'copied';
      } catch { /* nothing left */ }
    }
  }
  return 'unavailable';
}

/** Copy just the deep link (the card panel's COPY LINK action). */
export async function copySnapshotLink(
  meta: SnapshotCardMeta,
  env: SnapshotShareEnv = defaultSnapshotShareEnv(),
): Promise<boolean> {
  if (!meta.shareUrl) return false;
  if (env.clipboardWrite) {
    try {
      await env.clipboardWrite(meta.shareUrl);
      return true;
    } catch { /* fall through */ }
  }
  if (env.legacyCopy) {
    try {
      return env.legacyCopy(meta.shareUrl);
    } catch { /* nothing left */ }
  }
  return false;
}

/** Download the PNG (the card panel's DOWNLOAD action). */
export function downloadSnapshotCard(
  blob: Blob,
  meta: SnapshotCardMeta,
  env: SnapshotShareEnv = defaultSnapshotShareEnv(),
): void {
  env.download?.(blob, meta.fileName);
}
