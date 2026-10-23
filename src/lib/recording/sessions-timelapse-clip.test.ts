/**
 * Timelapse finalize → library clip, plus poll-loop resilience.
 *
 * The bug these lock down: a snapshot (timelapse) recording used to
 * end as frames in a store nothing lists — the clips library, the
 * dashboard and the overviews all read clip metadata, so a stopped
 * snapshot recording vanished from every list while a live camera's
 * clip appeared. On stop, the session now renders the run's NEW
 * frames (past a persisted watermark) and registers them as a clip.
 *
 * The resilience cases: a frame check that fails (a timed-out fetch
 * rejects — the browser fetch carries a hard timeout so a hung poll
 * can no longer latch the loop) must count as a miss and let the next
 * poll through; a 429 must back the polling off instead of hammering.
 */
import { describe, expect, it, vi } from "vitest";
import {
  FRAME_RATE_LIMIT_BACKOFF_MS,
  createCaptureSessionManager,
  type CaptureSessionDeps,
  type FrameFetchResult,
} from "./sessions";
import { TIMELAPSE_DEFAULT_SPEED, type TimelapseSessionMeta } from "@/lib/timelapse";

interface Harness {
  deps: CaptureSessionDeps;
  advance: (ms: number) => void;
  fireIntervals: () => void;
  metas: Map<string, TimelapseSessionMeta>;
  savedClips: { blob: Blob; meta: { durationSec: number; savedCameraId: string } }[];
  renderedBatches: Blob[][];
  setFrameScript: (fn: (call: number) => FrameFetchResult | Promise<FrameFetchResult>) => void;
  frameCalls: () => number;
}

function makeHarness(): Harness {
  let now = 1_000_000;
  const timers = new Map<number, { fn: () => void; ms: number }>();
  let timerSeq = 0;
  const frames = new Map<string, Blob>();
  const metas = new Map<string, TimelapseSessionMeta>();
  const savedClips: Harness["savedClips"] = [];
  const renderedBatches: Blob[][] = [];
  let frameCallCount = 0;
  let script: (call: number) => FrameFetchResult | Promise<FrameFetchResult> = (call) => ({
    ok: true,
    blob: new Blob([`frame-bytes-${call}`]),
    frameAt: `t${call}`,
  });

  const deps: CaptureSessionDeps = {
    now: () => now,
    setInterval: (fn, ms) => {
      const id = ++timerSeq;
      timers.set(id, { fn, ms });
      return id;
    },
    clearInterval: (h) => { timers.delete(h as number); },
    fetchFrame: async () => {
      frameCallCount += 1;
      return script(frameCallCount);
    },
    tlGet: async (id) => metas.get(id) ?? null,
    tlPutSession: async (m) => { metas.set(m.id, m); },
    tlPutFrame: async (sessionId, seq, blob) => {
      frames.set(`${sessionId}:${seq}`, blob);
    },
    openVideoStream: async () => { throw new Error("unused"); },
    openStillsStream: async () => { throw new Error("unused"); },
    makeRecorder: () => { throw new Error("unused"); },
    putSegment: async () => {},
    getSegments: async () => [],
    deleteSegments: async () => {},
    saveClip: async (blob, meta) => {
      savedClips.push({ blob, meta });
      return "clip-1";
    },
    registryRead: () => [],
    registryWrite: () => {},
    tlGetFrames: async (sessionId, frameCount) => {
      const out: Blob[] = [];
      for (let seq = 0; seq < frameCount; seq++) {
        const b = frames.get(`${sessionId}:${seq}`);
        if (b) out.push(b);
      }
      return out;
    },
    renderFramesClip: async (batch) => {
      renderedBatches.push(batch);
      return new Blob(["x".repeat(4096)], { type: "video/webm" });
    },
  };

  return {
    deps,
    advance: (ms) => { now += ms; },
    fireIntervals: () => { for (const t of [...timers.values()]) t.fn(); },
    metas,
    savedClips,
    renderedBatches,
    setFrameScript: (fn) => { script = fn; },
    frameCalls: () => frameCallCount,
  };
}

const flush = async () => {
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
};

describe("timelapse stop registers a library clip", () => {
  it("renders the run's frames and saves a clip whose duration is frames/fps", async () => {
    const h = makeHarness();
    const mgr = createCaptureSessionManager(h.deps);
    await mgr.startTimelapse({ cameraId: "cam-1", cameraName: "Cam 1" });
    await flush();
    h.fireIntervals(); // second poll
    await flush();
    h.fireIntervals(); // third poll
    await flush();
    const view = mgr.listSessions()[0];
    expect(view.frameCount).toBe(3);
    expect(view.lastFrameAt).not.toBeNull();

    await mgr.stopSession(view.id);
    expect(h.renderedBatches).toHaveLength(1);
    expect(h.renderedBatches[0]).toHaveLength(3);
    expect(h.savedClips).toHaveLength(1);
    expect(h.savedClips[0].meta.savedCameraId).toBe("cam-1");
    expect(h.savedClips[0].meta.durationSec).toBe(Math.max(1, Math.round(3 / TIMELAPSE_DEFAULT_SPEED)));
    expect(h.savedClips[0].blob.size).toBe(4096);
    // Watermark advanced: these frames are never rendered into a clip again.
    expect(h.metas.get(view.id)?.clippedUpTo).toBe(3);
    expect(mgr.getCompleted()?.detail).toMatch(/clips library/);
  });

  it("a resumed capture's next stop renders only the new frames", async () => {
    const h = makeHarness();
    const mgr = createCaptureSessionManager(h.deps);
    const first = await mgr.startTimelapse({ cameraId: "cam-2", cameraName: "Cam 2" });
    await flush();
    await mgr.stopSession(first.id);
    expect(h.savedClips).toHaveLength(1);

    const second = await mgr.startTimelapse({ cameraId: "cam-2", cameraName: "Cam 2" });
    await flush();
    h.fireIntervals();
    await flush();
    expect(mgr.getSession(second.id)?.frameCount).toBe(3); // 1 stored + 2 new this run
    await mgr.stopSession(second.id);
    expect(h.renderedBatches).toHaveLength(2);
    expect(h.renderedBatches[1]).toHaveLength(2); // only the new ones
    expect(h.savedClips).toHaveLength(2);
    expect(h.metas.get(second.id)?.clippedUpTo).toBe(3);
  });

  it("keeps the frames and says so when the clip render fails", async () => {
    const h = makeHarness();
    h.deps.renderFramesClip = async () => { throw new Error("no canvas"); };
    const mgr = createCaptureSessionManager(h.deps);
    const view = await mgr.startTimelapse({ cameraId: "cam-3", cameraName: "Cam 3" });
    await flush();
    await mgr.stopSession(view.id);
    expect(h.savedClips).toHaveLength(0);
    expect(h.metas.get(view.id)?.clippedUpTo ?? 0).toBe(0); // watermark unmoved — retryable
    expect(mgr.getCompleted()?.detail).toMatch(/frame saved on this device — the library clip could not be saved/);
  });
});

describe("timelapse poll resilience", () => {
  it("a rejected (timed-out) frame fetch counts as a miss and the loop goes on", async () => {
    const h = makeHarness();
    let call = 0;
    h.setFrameScript(() => {
      call += 1;
      if (call === 1) return Promise.reject(new Error("AbortError: timed out"));
      return { ok: true, blob: new Blob([`f${call}`]), frameAt: `t${call}` };
    });
    const mgr = createCaptureSessionManager(h.deps);
    const view = await mgr.startTimelapse({ cameraId: "cam-4", cameraName: "Cam 4" });
    await flush();
    expect(mgr.getSession(view.id)?.misses).toBe(1);
    expect(mgr.getSession(view.id)?.frameCount).toBe(0);
    h.fireIntervals();
    await flush();
    expect(mgr.getSession(view.id)?.frameCount).toBe(1);
    expect(mgr.getSession(view.id)?.misses).toBe(0);
  });

  it("backs off after a 429 instead of polling through the rate limit", async () => {
    const h = makeHarness();
    h.setFrameScript(() => ({ ok: false, status: 429 }));
    const mgr = createCaptureSessionManager(h.deps);
    const view = await mgr.startTimelapse({ cameraId: "cam-5", cameraName: "Cam 5" });
    await flush();
    expect(h.frameCalls()).toBe(1);
    expect(mgr.getSession(view.id)?.notice).toMatch(/rate-limited/);
    h.fireIntervals(); // poll fires during the backoff — must be skipped
    await flush();
    expect(h.frameCalls()).toBe(1);
    h.advance(FRAME_RATE_LIMIT_BACKOFF_MS + 1);
    h.fireIntervals();
    await flush();
    expect(h.frameCalls()).toBe(2);
  });

  it("unchanged frames are deduped, never double-kept", async () => {
    const h = makeHarness();
    h.setFrameScript(() => ({ ok: true, blob: new Blob(["same-bytes"]), frameAt: "t-fixed" }));
    const mgr = createCaptureSessionManager(h.deps);
    const view = await mgr.startTimelapse({ cameraId: "cam-6", cameraName: "Cam 6" });
    await flush();
    h.fireIntervals();
    await flush();
    h.fireIntervals();
    await flush();
    expect(mgr.getSession(view.id)?.frameCount).toBe(1);
  });
});

describe("startClip passes the classified source (with its stream type) to the opener", () => {
  it("openVideoStream receives streamType so HLS detection survives extensionless URLs", async () => {
    const h = makeHarness();
    const seen: unknown[] = [];
    h.deps.openVideoStream = async (source) => {
      seen.push(source);
      return { stream: { fake: true }, teardown: vi.fn() };
    };
    h.deps.makeRecorder = () => ({
      mimeType: "video/webm",
      state: "inactive",
      ondataavailable: null,
      onstop: null,
      onerror: null,
      start: vi.fn(),
      stop: vi.fn(),
    });
    const mgr = createCaptureSessionManager(h.deps);
    await mgr.startClip({
      savedCameraId: "saved-1",
      cameraName: "Live",
      source: { kind: "video", streamUrl: "https://cdn.example/live/abc123", streamType: "hls" },
    });
    expect(seen).toEqual([
      { kind: "video", streamUrl: "https://cdn.example/live/abc123", streamType: "hls" },
    ]);
  });
});
