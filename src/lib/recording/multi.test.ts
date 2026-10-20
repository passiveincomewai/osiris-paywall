import { describe, expect, it } from "vitest";
import {
  MAX_MULTI_CAMERAS,
  MULTI_STILL_POLL_MS,
  addToSelection,
  assembleClipMeta,
  camLocationLabel,
  classifyMultiCam,
  initialTileSession,
  multiGateView,
  removeFromSelection,
  staggerDelayMs,
  summarizeBoard,
  tileReducer,
  type TileSession,
} from "./multi";

describe("selection cap", () => {
  it("allows exactly 20 and refuses the 21st with the cap reason", () => {
    let sel: string[] = [];
    for (let i = 0; i < MAX_MULTI_CAMERAS; i++) {
      const r = addToSelection(sel, `cam-${i}`);
      expect(r.ok).toBe(true);
      sel = r.selection;
    }
    expect(sel).toHaveLength(20);
    const refused = addToSelection(sel, "cam-20");
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.reason).toBe("cap");
    expect(refused.selection).toHaveLength(20);
    expect(refused.selection).not.toContain("cam-20");
  });

  it("refuses duplicates without changing the selection", () => {
    const r = addToSelection(["a", "b"], "a");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("duplicate");
    expect(r.selection).toEqual(["a", "b"]);
  });

  it("removal frees a slot under the cap", () => {
    const full = Array.from({ length: 20 }, (_, i) => `cam-${i}`);
    const trimmed = removeFromSelection(full, "cam-7");
    expect(trimmed).toHaveLength(19);
    const r = addToSelection(trimmed, "cam-new");
    expect(r.ok).toBe(true);
    expect(r.selection).toContain("cam-new");
  });

  it("stagger keeps 20 tiles inside the poll cycle", () => {
    expect(staggerDelayMs(0)).toBe(0);
    expect(staggerDelayMs(19)).toBeLessThan(MULTI_STILL_POLL_MS);
    expect(staggerDelayMs(25)).toBe(staggerDelayMs(5));
  });
});

describe("camera classification", () => {
  it("routes HLS and file streams to the video mechanism", () => {
    expect(classifyMultiCam({ stream_url: "https://x/feed.m3u8", stream_type: "hls" })).toEqual({
      kind: "video",
      streamUrl: "https://x/feed.m3u8",
    });
    expect(classifyMultiCam({ stream_url: "https://x/v.mp4", stream_type: "video" }).kind).toBe("video");
    // Extension alone is enough, as on the Live wall.
    expect(classifyMultiCam({ stream_url: "https://x/feed.m3u8?tok=1" }).kind).toBe("video");
  });

  it("routes snapshot cameras to stills, preferring the frame route when it can serve them", () => {
    const s = classifyMultiCam({
      id: "cam-1",
      stream_type: "jpg",
      feed_url: "https://dot.example/cam.jpg",
    });
    expect(s).toEqual({ kind: "stills", frameId: "cam-1", stillUrl: "https://dot.example/cam.jpg" });
  });

  it("falls back to the feed itself when there is no catalogue id", () => {
    const s = classifyMultiCam({ stream_type: "jpg", feed_url: "https://dot.example/cam.jpg" });
    expect(s).toEqual({ kind: "stills", frameId: null, stillUrl: "https://dot.example/cam.jpg" });
  });

  it("marks YouTube and empty cameras honestly unsupported", () => {
    const yt = classifyMultiCam({ external_url: "https://youtube.com/watch?v=1", stream_type: "video" });
    expect(yt.kind).toBe("unsupported");
    if (yt.kind === "unsupported") expect(yt.reason).toMatch(/YouTube/);
    expect(classifyMultiCam({}).kind).toBe("unsupported");
    expect(classifyMultiCam(null).kind).toBe("unsupported");
    expect(classifyMultiCam({ stream_type: "jpg" }).kind).toBe("unsupported");
  });

  it("labels locations from group, else coordinates", () => {
    expect(camLocationLabel({ group: "Ski trips", cameraData: {} })).toBe("Ski trips");
    expect(camLocationLabel({ group: "Ungrouped", cameraData: { lat: 41.123, lng: -111.9 } })).toBe("41.12, -111.90");
    expect(camLocationLabel({ group: "Ungrouped", cameraData: {} })).toBeNull();
  });
});

describe("tile session state machine", () => {
  it("walks preview → recording → saving → preview with the clip's length", () => {
    let s = tileReducer(initialTileSession, { type: "start", at: 1000 });
    expect(s).toMatchObject({ phase: "recording", startedAt: 1000, error: null });
    s = tileReducer(s, { type: "stop" });
    expect(s.phase).toBe("saving");
    s = tileReducer(s, { type: "saved", secs: 42 });
    expect(s).toMatchObject({ phase: "preview", startedAt: null, lastClipSecs: 42 });
  });

  it("a failure lands in the error phase with its reason, from any phase", () => {
    const rec = tileReducer(initialTileSession, { type: "start", at: 5 });
    const failed = tileReducer(rec, { type: "fail", reason: "Stream failed to load" });
    expect(failed).toMatchObject({ phase: "error", error: "Stream failed to load", startedAt: null });
    const reset = tileReducer(failed, { type: "reset" });
    expect(reset).toMatchObject({ phase: "preview", error: null });
  });

  it("ignores out-of-order events instead of corrupting state", () => {
    expect(tileReducer(initialTileSession, { type: "stop" })).toBe(initialTileSession);
    expect(tileReducer(initialTileSession, { type: "saved", secs: 1 })).toBe(initialTileSession);
    const rec = tileReducer(initialTileSession, { type: "start", at: 1 });
    expect(tileReducer(rec, { type: "start", at: 2 })).toBe(rec);
    expect(tileReducer(rec, { type: "reset" })).toBe(rec);
  });

  it("one tile's failure cannot touch another tile's session", () => {
    const board: Record<string, TileSession> = {
      a: tileReducer(initialTileSession, { type: "start", at: 100 }),
      b: tileReducer(initialTileSession, { type: "start", at: 200 }),
    };
    const bBefore = board.b;
    const next: Record<string, TileSession> = {
      ...board,
      a: tileReducer(board.a, { type: "fail", reason: "codec refused" }),
    };
    expect(next.a.phase).toBe("error");
    expect(next.b).toBe(bBefore);
    expect(next.b).toMatchObject({ phase: "recording", startedAt: 200 });
    const sum = summarizeBoard(next);
    expect(sum).toEqual({ recording: 1, saving: 0, errors: 1, earliestStart: 200 });
  });

  it("summarizes an idle board as all zeroes", () => {
    expect(summarizeBoard({})).toEqual({ recording: 0, saving: 0, errors: 0, earliestStart: null });
    expect(summarizeBoard({ a: initialTileSession })).toEqual({
      recording: 0, saving: 0, errors: 0, earliestStart: null,
    });
  });
});

describe("page gate", () => {
  it("walks loading → signin / locked / ready on the studio's own signal", () => {
    expect(multiGateView({ statusLoaded: false, signedIn: false, pro: false })).toBe("loading");
    expect(multiGateView({ statusLoaded: true, signedIn: false, pro: false })).toBe("signin");
    expect(multiGateView({ statusLoaded: true, signedIn: true, pro: false })).toBe("locked");
    expect(multiGateView({ statusLoaded: true, signedIn: true, pro: true })).toBe("ready");
  });
});

describe("clip metadata assembly", () => {
  it("builds exactly the body the clips route accepts", () => {
    const meta = assembleClipMeta(
      { id: "saved-1", name: "Powder Mountain Rd" },
      Date.UTC(2026, 9, 20, 8, 0, 0),
      Date.UTC(2026, 9, 20, 8, 1, 30),
      1_234_567,
      "video/webm;codecs=vp9",
    );
    expect(meta).toEqual({
      cameraName: "Powder Mountain Rd",
      savedCameraId: "saved-1",
      durationSec: 90,
      sizeBytes: 1_234_567,
      startedAt: "2026-10-20T08:00:00.000Z",
      mimeType: "video/webm;codecs=vp9",
    });
  });

  it("never reports a zero-length clip and defaults the mime type", () => {
    const meta = assembleClipMeta({ id: "s", name: "X" }, 1000, 1100, 10, "");
    expect(meta.durationSec).toBe(1);
    expect(meta.mimeType).toBe("video/webm");
  });
});
