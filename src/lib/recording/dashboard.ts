/**
 * Recording dashboard (VIP Pro) — the pure assembly behind the studio's
 * control-room view. Everything the page shows is computed here from
 * three honest sources, so the page and the tests read the same figures:
 *
 *  - ACTIVE SESSIONS come from the persistent capture-session layer
 *    (lib/recording/sessions): recordings started from a camera viewer
 *    (timelapse) or the Live wall (clips), which live at module level
 *    and can be read from any route. Multi-record wall sessions are NOT
 *    in that store — each tile owns its recorder inside the multi page —
 *    so the dashboard says so rather than implying a complete list.
 *  - LIBRARY figures come from the clip-metadata API (the account's
 *    ClipMeta rows) plus the IndexedDB clip store's real byte count
 *    (idbUsageBytes) for what is actually on this device.
 *  - The CAMERA ROSTER joins saved cameras to their clips by
 *    savedCameraId — the only link ClipMeta carries.
 *
 * Framing, stated on the page as well: all recordings live on this
 * device, in this browser. Nothing here is cloud storage.
 */
import type { CaptureSessionView } from "./sessions";
import type { PlanTier } from "./tier";

/* ------------------------------------------------------------------ */
/* The gate: the dashboard is a VIP feature inside a Pro studio.       */
/* ------------------------------------------------------------------ */

export type DashboardGateView = "loading" | "signin" | "locked" | "upsell" | "ready";

export function dashboardGateView(state: {
  statusLoaded: boolean;
  signedIn: boolean;
  tier: PlanTier;
}): DashboardGateView {
  if (!state.statusLoaded) return "loading";
  if (!state.signedIn) return "signin";
  if (state.tier === "vip") return "ready";
  // Pro sees the room as a locked VIP upsell; free gets the studio lock.
  return state.tier === "pro" ? "upsell" : "locked";
}

/* ------------------------------------------------------------------ */
/* Library.                                                            */
/* ------------------------------------------------------------------ */

/** The slice of a ClipMeta row the dashboard reads (API JSON shape). */
export interface DashboardClip {
  id: string;
  cameraName: string;
  savedCameraId: string | null;
  startedAt: string;
  durationSec: number;
  sizeBytes: number;
  mimeType: string;
}

export interface LibraryStats {
  /** Clips in the account library (metadata rows). */
  count: number;
  /** Total recorded seconds across the library. */
  totalSecs: number;
  /** Bytes the metadata attributes to the library's clips. */
  metaBytes: number;
  /** Bytes of video actually sitting in this browser's clip store. */
  deviceBytes: number;
  /** The newest clips, in the order the API returned them. */
  newest: DashboardClip[];
}

export function assembleLibrary(input: {
  totals: { count: number; durationSec: number; sizeBytes: number };
  clips: readonly DashboardClip[];
  deviceBytes: number;
  newestCount?: number;
}): LibraryStats {
  return {
    count: input.totals.count,
    totalSecs: input.totals.durationSec,
    metaBytes: input.totals.sizeBytes,
    deviceBytes: input.deviceBytes,
    newest: input.clips.slice(0, input.newestCount ?? 6),
  };
}

/* ------------------------------------------------------------------ */
/* Camera roster — saved cameras joined to their recording history.    */
/* ------------------------------------------------------------------ */

export interface RosterCamera {
  id: string;
  name: string;
  group: string;
}

export interface RosterEntry {
  id: string;
  name: string;
  group: string;
  clipCount: number;
  totalSecs: number;
  /** ISO start of this camera's most recent clip, or null if never. */
  lastRecordedAt: string | null;
  /** Duration of that most recent clip. */
  lastDurationSec: number | null;
}

export function assembleRoster(
  cameras: readonly RosterCamera[],
  clips: readonly DashboardClip[],
): RosterEntry[] {
  const byCamera = new Map<string, DashboardClip[]>();
  for (const c of clips) {
    if (!c.savedCameraId) continue;
    const list = byCamera.get(c.savedCameraId) ?? [];
    list.push(c);
    byCamera.set(c.savedCameraId, list);
  }
  return cameras.map((cam) => {
    const mine = byCamera.get(cam.id) ?? [];
    let last: DashboardClip | null = null;
    let totalSecs = 0;
    for (const c of mine) {
      totalSecs += c.durationSec;
      if (!last || c.startedAt > last.startedAt) last = c;
    }
    return {
      id: cam.id,
      name: cam.name,
      group: cam.group,
      clipCount: mine.length,
      totalSecs,
      lastRecordedAt: last?.startedAt ?? null,
      lastDurationSec: last?.durationSec ?? null,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Active sessions — display lines for the session layer's views.      */
/* ------------------------------------------------------------------ */

export function sessionKindLabel(view: CaptureSessionView): string {
  return view.kind === "timelapse" ? "TIMELAPSE" : "CLIP";
}

export function sessionPhaseLabel(view: CaptureSessionView): string {
  switch (view.phase) {
    case "starting":
      return "STARTING";
    case "saving":
      return "SAVING";
    default:
      return "RECORDING";
  }
}

/** What the session has safely banked so far, in plain words. */
export function sessionDetailLine(view: CaptureSessionView, nowMs: number = Date.now()): string {
  if (view.kind === "timelapse") {
    const frames = `${view.frameCount} frame${view.frameCount === 1 ? "" : "s"} kept`;
    if (view.misses > 0) {
      return `${frames} · ${view.misses} missed check${view.misses === 1 ? "" : "s"}`;
    }
    // A capture whose camera has published nothing new in a while must
    // say so, not sit there looking identical to a healthy recording:
    // at DOT cadences a new picture lands every few minutes at most,
    // so ten minutes without one is worth naming.
    const last = view.lastFrameAt ?? null;
    if (last && nowMs - last >= 10 * 60_000) {
      return `${frames} · no new frame for ${Math.floor((nowMs - last) / 60_000)}m — this camera's picture hasn't changed`;
    }
    return frames;
  }
  return `${view.segmentCount} segment${view.segmentCount === 1 ? "" : "s"} · ${formatBytes(view.bytes)} saved so far`;
}

/* ------------------------------------------------------------------ */
/* Formatting (the dashboard's own; mm:ss under an hour, h:mm:ss over) */
/* ------------------------------------------------------------------ */

export function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  // Roll into GB before the MB figure grows a fourth digit: a quota of
  // ~1 GB used to render as "~1000.0 MB", precision nobody can use.
  if (b < 1000 * 1024 ** 2) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

export function formatClock(totalSecs: number): string {
  const s = Math.max(0, Math.floor(totalSecs));
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return s >= 3600 ? `${Math.floor(s / 3600)}:${mm}:${ss}` : `${mm}:${ss}`;
}
