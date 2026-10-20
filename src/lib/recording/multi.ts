/**
 * Multi-camera recording — the pure logic behind the Recording Studio's
 * "record up to 20 cameras" view (a WorldEye Pro feature).
 *
 * It scales the studio's two proven single-camera mechanisms, unchanged:
 *  - stream cameras (HLS / MP4): a <video> element's captureStream() into
 *    a MediaRecorder — the RecordableTile mechanism on the Live wall;
 *  - snapshot cameras ("jpg"): stills fetched one at a time (the frame
 *    route, or the feed itself), deduped with the timelapse ledger, drawn
 *    onto a canvas whose captureStream() a MediaRecorder records — the
 *    TimelapseControl mechanism.
 *
 * Everything here is record-keeping only: which cameras are selected
 * (hard cap), what kind each camera is, where each tile's recording
 * session stands, and the metadata a finished clip is registered with.
 * The browser machinery lives in components/recording/MultiRecordTile.
 *
 * Honest limits, stated in the UI as well: recording runs in this
 * browser, on this device, only while the tab stays open. It is not
 * cloud recording, not 24/7, and nothing here schedules a capture.
 */
import { timelapseStillFetchable } from "@/lib/timelapse";

/** The premium promise, enforced: at most this many cameras at once. */
export const MAX_MULTI_CAMERAS = 20;

/**
 * How often each snapshot tile checks for the camera's next published
 * frame in multi view. One watcher polling one camera every few seconds
 * is what the frame route is budgeted for (90 requests/minute per
 * visitor); twenty tiles at this cadence stay inside that budget, and
 * snapshot cameras rarely publish faster than this anyway. Tiles are
 * staggered by index so the checks don't land in one burst.
 */
export const MULTI_STILL_POLL_MS = 15_000;

/** Per-tile stagger inside the poll cycle, by grid position. */
export function staggerDelayMs(index: number): number {
  return (Math.max(0, index) % MAX_MULTI_CAMERAS) * 750;
}

/* ------------------------------------------------------------------ */
/* What kind of camera is this, for recording?                         */
/* ------------------------------------------------------------------ */

export type MultiCamSource =
  | { kind: "video"; streamUrl: string }
  | { kind: "stills"; frameId: string | null; stillUrl: string | null }
  | { kind: "unsupported"; reason: string };

type CamData = Record<string, unknown> | null | undefined;

const str = (v: unknown): string => (typeof v === "string" ? v : "");

/**
 * Route a saved camera's stored data to a capture mechanism, mirroring
 * the rules RecordableTile (streams) and TimelapseControl (snapshots)
 * already apply. Anything else is honestly unsupported, with the reason
 * the tile should show.
 */
export function classifyMultiCam(data: CamData): MultiCamSource {
  const d = data ?? {};
  const streamUrl = str(d.stream_url);
  const feedUrl = str(d.feed_url);
  const externalUrl = str(d.external_url);
  const streamType = str(d.stream_type);
  const isYouTube =
    /youtube\.com|youtu\.be/.test(externalUrl) || /youtube\.com|youtu\.be/.test(streamUrl);
  if (isYouTube) {
    return { kind: "unsupported", reason: "YouTube embeds can't be recorded (platform restriction)" };
  }
  const isStream =
    streamType === "hls" || streamType === "video" || streamType === "mp4" ||
    /\.m3u8($|\?)/.test(streamUrl);
  if (isStream) {
    return streamUrl
      ? { kind: "video", streamUrl }
      : { kind: "unsupported", reason: "No playable stream" };
  }
  if (streamType === "jpg" || (!streamUrl && !!feedUrl)) {
    const frameIdRaw = d.id;
    const frameId =
      typeof frameIdRaw === "string" && frameIdRaw.trim()
        ? frameIdRaw
        : typeof frameIdRaw === "number"
          ? String(frameIdRaw)
          : null;
    const stillUrl = feedUrl || streamUrl || null;
    // The frame route can only serve a catalogue camera whose still it
    // can fetch; without an id the tile falls back to the feed itself.
    const frameFetchable = !!frameId && timelapseStillFetchable(d);
    if (!frameFetchable && !stillUrl) {
      return { kind: "unsupported", reason: "Snapshot feed has no still to capture" };
    }
    return { kind: "stills", frameId: frameFetchable ? frameId : null, stillUrl };
  }
  if (streamUrl) {
    return { kind: "unsupported", reason: "This stream type can't be recorded in the browser" };
  }
  return { kind: "unsupported", reason: "No playable stream" };
}

/** Short badge for picker rows and tiles. */
export function multiCamKindLabel(source: MultiCamSource): string {
  return source.kind === "video" ? "STREAM" : source.kind === "stills" ? "SNAPSHOT" : "PREVIEW ONLY";
}

/** Where a camera is, for tile captions: its group, else its coordinates. */
export function camLocationLabel(
  cam: { group?: string; cameraData?: CamData },
): string | null {
  if (cam.group && cam.group !== "Ungrouped") return cam.group;
  const lat = cam.cameraData?.lat;
  const lng = cam.cameraData?.lng;
  if (typeof lat === "number" && typeof lng === "number") {
    return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Selection — the 20-camera cap lives here, not in the UI.            */
/* ------------------------------------------------------------------ */

export type AddToSelection =
  | { ok: true; selection: string[] }
  | { ok: false; reason: "cap" | "duplicate"; selection: string[] };

export function addToSelection(selection: readonly string[], id: string): AddToSelection {
  if (selection.includes(id)) return { ok: false, reason: "duplicate", selection: [...selection] };
  if (selection.length >= MAX_MULTI_CAMERAS) {
    return { ok: false, reason: "cap", selection: [...selection] };
  }
  return { ok: true, selection: [...selection, id] };
}

export function removeFromSelection(selection: readonly string[], id: string): string[] {
  return selection.filter((s) => s !== id);
}

/** The refusal the UI shows when the cap bites. */
export const CAP_MESSAGE = `That's the ${MAX_MULTI_CAMERAS}-camera limit — remove one to add another.`;

/* ------------------------------------------------------------------ */
/* Per-tile recording sessions. Each tile owns its session object; a    */
/* failure in one is structurally incapable of touching another's.      */
/* ------------------------------------------------------------------ */

export type TilePhase = "preview" | "recording" | "saving" | "error";

export interface TileSession {
  phase: TilePhase;
  /** When the current (or last) recording started, epoch ms. */
  startedAt: number | null;
  /** Why the tile is in the error phase, in plain words. */
  error: string | null;
  /** Duration of the most recently saved clip, seconds. */
  lastClipSecs: number | null;
}

export const initialTileSession: TileSession = {
  phase: "preview",
  startedAt: null,
  error: null,
  lastClipSecs: null,
};

export type TileEvent =
  | { type: "start"; at: number }
  | { type: "stop" }
  | { type: "saved"; secs: number }
  | { type: "fail"; reason: string }
  | { type: "reset" };

export function tileReducer(session: TileSession, event: TileEvent): TileSession {
  switch (event.type) {
    case "start":
      // A (re)start is only meaningful from a resting phase.
      if (session.phase === "recording" || session.phase === "saving") return session;
      return { phase: "recording", startedAt: event.at, error: null, lastClipSecs: session.lastClipSecs };
    case "stop":
      if (session.phase !== "recording") return session;
      return { ...session, phase: "saving" };
    case "saved":
      if (session.phase !== "saving") return session;
      return { phase: "preview", startedAt: null, error: null, lastClipSecs: event.secs };
    case "fail":
      return { phase: "error", startedAt: null, error: event.reason, lastClipSecs: session.lastClipSecs };
    case "reset":
      if (session.phase === "recording" || session.phase === "saving") return session;
      return { ...initialTileSession, lastClipSecs: session.lastClipSecs };
  }
}

export interface BoardSummary {
  recording: number;
  saving: number;
  errors: number;
  /** Earliest start among currently-recording tiles, for the session timer. */
  earliestStart: number | null;
}

export function summarizeBoard(board: Readonly<Record<string, TileSession>>): BoardSummary {
  let recording = 0;
  let saving = 0;
  let errors = 0;
  let earliestStart: number | null = null;
  for (const s of Object.values(board)) {
    if (s.phase === "recording") {
      recording++;
      if (s.startedAt !== null && (earliestStart === null || s.startedAt < earliestStart)) {
        earliestStart = s.startedAt;
      }
    } else if (s.phase === "saving") saving++;
    else if (s.phase === "error") errors++;
  }
  return { recording, saving, errors, earliestStart };
}

/* ------------------------------------------------------------------ */
/* Finished-clip metadata — exactly the body POST /api/recording/clips */
/* already accepts from the Live wall (no new fields needed).          */
/* ------------------------------------------------------------------ */

export interface ClipMetaBody {
  cameraName: string;
  savedCameraId: string;
  durationSec: number;
  sizeBytes: number;
  startedAt: string;
  mimeType: string;
}

export function assembleClipMeta(
  cam: { id: string; name: string },
  startedAtMs: number,
  endedAtMs: number,
  sizeBytes: number,
  mimeType: string,
): ClipMetaBody {
  return {
    cameraName: cam.name.slice(0, 120) || "Camera",
    savedCameraId: cam.id,
    durationSec: Math.max(1, Math.round((endedAtMs - startedAtMs) / 1000)),
    sizeBytes,
    startedAt: new Date(startedAtMs).toISOString(),
    mimeType: mimeType || "video/webm",
  };
}
