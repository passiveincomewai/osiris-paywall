/**
 * Persistent capture sessions — lifecycle tests against fake machinery.
 *
 * The manager's whole point is that no component owns a capture, so these
 * tests drive it with zero subscribers (the "viewer is closed" case) and
 * prove the session still accrues, persists progressively, stops on
 * command from anywhere, auto-stops at 24 hours, and that one session's
 * end never touches another.
 */
import { describe, expect, it, vi } from "vitest";
import {
  CAPTURE_SEGMENT_MS,
  CAPTURE_SESSION_MAX_MS,
  captureSessionExpired,
  clipSessionId,
  createCaptureSessionManager,
  type CaptureSessionDeps,
  type ClipRegistryEntry,
  type FrameFetchResult,
  type RecorderLike,
} from "./sessions";
import { TIMELAPSE_MAX_FRAMES, TIMELAPSE_POLL_MS, type TimelapseSessionMeta } from "@/lib/timelapse";

/* ------------------------------ fakes ------------------------------ */

class FakeRecorder implements RecorderLike {
  mimeType = "video/webm";
  state = "inactive";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  startedWith: number | null = null;
  start(timesliceMs: number) {
    this.startedWith = timesliceMs;
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    // MediaRecorder fires a final data chunk before onstop.
    this.ondataavailable?.({ data: new Blob(["f".repeat(600)]) });
    this.onstop?.();
  }
  emit(text: string) {
    this.ondataavailable?.({ data: new Blob([text]) });
  }
}

interface Harness {
  deps: CaptureSessionDeps;
  now: () => number;
  advance: (ms: number) => void;
  fireIntervals: () => void;
  frames: Map<string, Blob>;
  metas: Map<string, TimelapseSessionMeta>;
  segments: Map<string, Blob>;
  savedClips: { blob: Blob; meta: unknown }[];
  recorders: FakeRecorder[];
  registry: ClipRegistryEntry[];
  setFrameScript: (fn: (cameraId: string, call: number) => FrameFetchResult | Promise<FrameFetchResult>) => void;
  frameCalls: () => number;
}

function makeHarness(): Harness {
  let now = 1_000_000;
  const timers = new Map<number, { fn: () => void; ms: number }>();
  let timerSeq = 0;
  const frames = new Map<string, Blob>();
  const metas = new Map<string, TimelapseSessionMeta>();
  const segments = new Map<string, Blob>();
  const savedClips: { blob: Blob; meta: unknown }[] = [];
  const recorders: FakeRecorder[] = [];
  let registry: ClipRegistryEntry[] = [];
  type FrameScript = (
    cameraId: string,
    call: number,
  ) => FrameFetchResult | Promise<FrameFetchResult>;
  let scriptCounter = 0;
  let frameScript: FrameScript = () => ({
    ok: true,
    blob: new Blob([`frame-${++scriptCounter}`]),
    frameAt: `t${scriptCounter}`,
  });
  let frameCallCount = 0;

  const deps: CaptureSessionDeps = {
    now: () => now,
    setInterval: (fn, ms) => {
      const id = ++timerSeq;
      timers.set(id, { fn, ms });
      return id;
    },
    clearInterval: (h) => { timers.delete(h as number); },
    fetchFrame: async (cameraId) => {
      frameCallCount += 1;
      return frameScript(cameraId, frameCallCount);
    },
    tlGet: async (id) => metas.get(id) ?? null,
    tlPutSession: async (m) => { metas.set(m.id, m); },
    tlPutFrame: async (sessionId, seq, blob) => {
      frames.set(`${sessionId}:${String(seq).padStart(5, "0")}`, blob);
    },
    openVideoStream: async () => ({ stream: { fake: "video" }, teardown: vi.fn() }),
    openStillsStream: async () => ({ stream: { fake: "stills" }, teardown: vi.fn() }),
    makeRecorder: () => {
      const r = new FakeRecorder();
      recorders.push(r);
      return r;
    },
    putSegment: async (sessionId, seq, blob) => {
      segments.set(`${sessionId}:${String(seq).padStart(6, "0")}`, blob);
    },
    getSegments: async (sessionId) =>
      [...segments.entries()]
        .filter(([k]) => k.startsWith(`${sessionId}:`))
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([, v]) => v),
    deleteSegments: async (sessionId) => {
      for (const k of [...segments.keys()]) if (k.startsWith(`${sessionId}:`)) segments.delete(k);
    },
    saveClip: async (blob, meta) => {
      savedClips.push({ blob, meta });
      return "clip-1";
    },
    registryRead: () => [...registry],
    registryWrite: (entries) => { registry = [...entries]; },
  };

  return {
    deps,
    now: () => now,
    advance: (ms) => { now += ms; },
    fireIntervals: () => { for (const t of [...timers.values()]) t.fn(); },
    frames,
    metas,
    segments,
    savedClips,
    recorders,
    get registry() { return registry; },
    setFrameScript: (fn) => { frameScript = fn as typeof frameScript; },
    frameCalls: () => frameCallCount,
  };
}

/** Let queued microtasks (poll grabs, segment persists) settle. */
const flush = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};

/* ------------------------------ tests ------------------------------ */

describe("24h cap (pure)", () => {
  it("expires exactly at 24 hours of wall clock, not before", () => {
    expect(captureSessionExpired(1000, 1000 + CAPTURE_SESSION_MAX_MS - 1)).toBe(false);
    expect(captureSessionExpired(1000, 1000 + CAPTURE_SESSION_MAX_MS)).toBe(true);
  });
});

describe("timelapse sessions", () => {
  it("keeps capturing with no component subscribed — the viewer-closed case", async () => {
    const h = makeHarness();
    let n = 0;
    h.setFrameScript(() => ({ ok: true, blob: new Blob([`f${++n}`]), frameAt: `t${n}` }));
    const m = createCaptureSessionManager(h.deps);
    // Deliberately never call m.subscribe: nobody is "mounted".
    const view = await m.startTimelapse({ cameraId: "cam-1", cameraName: "Cam One" });
    await flush();
    expect(view.kind).toBe("timelapse");
    // First grab happened at start; poll ticks keep accruing frames.
    h.fireIntervals();
    await flush();
    h.fireIntervals();
    await flush();
    const live = m.getSession(view.id);
    expect(live?.phase).toBe("recording");
    expect(live!.frameCount).toBeGreaterThanOrEqual(3);
    // Frames are in the device store, not just counted.
    expect(h.frames.size).toBe(live!.frameCount);
    expect(h.metas.get(view.id)?.frameCount).toBe(live!.frameCount);
    await m.stopSession(view.id);
    expect(m.getSession(view.id)).toBeNull();
    expect(m.getCompleted()?.reason).toBe("user");
    expect(m.getCompleted()?.detail).toContain("saved on this device");
  });

  it("dedupes unchanged frames and stops honestly when the source ends (422)", async () => {
    const h = makeHarness();
    let call = 0;
    h.setFrameScript(() => {
      call += 1;
      if (call <= 2) return { ok: true, blob: new Blob(["same"]), frameAt: "t1" };
      return { ok: false, status: 422 };
    });
    const m = createCaptureSessionManager(h.deps);
    const view = await m.startTimelapse({ cameraId: "cam-2", cameraName: "Cam Two" });
    await flush();
    h.fireIntervals();
    await flush();
    // Same frame twice -> kept once.
    expect(m.getSession(view.id)?.frameCount).toBe(1);
    h.fireIntervals();
    await flush();
    expect(m.getSession(view.id)).toBeNull();
    expect(m.getCompleted()?.reason).toBe("source-ended");
    // The kept frame survives in the store for playback.
    expect(h.frames.size).toBe(1);
  });

  it("stops at the frame cap", async () => {
    const h = makeHarness();
    let n = 0;
    h.setFrameScript(() => ({ ok: true, blob: new Blob([`x${++n}`]), frameAt: `u${n}` }));
    const m = createCaptureSessionManager(h.deps);
    const view = await m.startTimelapse({ cameraId: "cam-3", cameraName: "Cam Three" });
    for (let i = 0; i < TIMELAPSE_MAX_FRAMES + 2; i++) {
      h.fireIntervals();
      await flush();
      if (!m.getSession(view.id)) break;
    }
    expect(m.getSession(view.id)).toBeNull();
    expect(m.getCompleted()?.reason).toBe("frames-cap");
    expect(h.metas.get(view.id)?.frameCount).toBe(TIMELAPSE_MAX_FRAMES);
  });

  it("resumes a stored session's ledger instead of re-storing frames", async () => {
    const h = makeHarness();
    h.metas.set("tl:cam-4", {
      id: "tl:cam-4", cameraId: "cam-4", cameraName: "Cam Four",
      startedAt: 500, pollMs: TIMELAPSE_POLL_MS, frameCount: 2,
      lastFrameAt: "t2", lastSignature: "sig2",
    });
    h.setFrameScript(() => ({ ok: true, blob: new Blob(["new"]), frameAt: "t2" }));
    const m = createCaptureSessionManager(h.deps);
    const view = await m.startTimelapse({ cameraId: "cam-4", cameraName: "Cam Four" });
    await flush();
    // The stored last frame is a duplicate; count stays at 2.
    expect(m.getSession(view.id)?.frameCount).toBe(2);
    expect(h.frames.size).toBe(0);
    await m.stopSession(view.id);
  });
});

describe("clip sessions", () => {
  const videoSource = { kind: "video", streamUrl: "https://x.test/a.m3u8" } as const;

  it("persists segments progressively and assembles the clip on stop", async () => {
    const h = makeHarness();
    const m = createCaptureSessionManager(h.deps);
    const view = await m.startClip({ savedCameraId: "saved-1", cameraName: "Saved One", source: videoSource });
    await flush();
    expect(view.id).toBe(clipSessionId("saved-1"));
    expect(h.recorders[0].startedWith).toBe(CAPTURE_SEGMENT_MS);
    // The crash-recovery registry knows about this session from the start.
    expect(h.registry.map((e) => e.id)).toContain(view.id);

    h.recorders[0].emit("a".repeat(600));
    h.recorders[0].emit("b".repeat(600));
    await flush();
    // Segments are already on the device BEFORE any stop — nothing is
    // held only in memory.
    expect(h.segments.size).toBe(2);
    expect(m.getSession(view.id)?.segmentCount).toBe(2);

    await m.stopSession(view.id);
    expect(m.getSession(view.id)).toBeNull();
    expect(h.savedClips).toHaveLength(1);
    const text = await h.savedClips[0].blob.text();
    expect(text).toBe("a".repeat(600) + "b".repeat(600) + "f".repeat(600));
    expect((h.savedClips[0].meta as { cameraName: string }).cameraName).toBe("Saved One");
    // Segments + registry are cleaned up after assembly.
    expect(h.segments.size).toBe(0);
    expect(h.registry).toHaveLength(0);
    expect(m.getCompleted()?.reason).toBe("user");
  });

  it("auto-stops and finalizes at 24 hours (injected clock)", async () => {
    const h = makeHarness();
    const m = createCaptureSessionManager(h.deps);
    const view = await m.startClip({ savedCameraId: "saved-2", cameraName: "Saved Two", source: videoSource });
    await flush();
    h.recorders[0].emit("p".repeat(600));
    await flush();
    h.advance(CAPTURE_SESSION_MAX_MS - 1000);
    h.fireIntervals();
    await flush();
    expect(m.getSession(view.id)).not.toBeNull(); // not yet
    h.advance(1000);
    h.fireIntervals();
    await flush();
    expect(m.getSession(view.id)).toBeNull();
    expect(m.getCompleted()?.reason).toBe("max-duration");
    expect(h.savedClips).toHaveLength(1);
  });

  it("a crash keeps everything to the last segment — recovery assembles it", async () => {
    const h = makeHarness();
    const m1 = createCaptureSessionManager(h.deps);
    const view = await m1.startClip({ savedCameraId: "saved-3", cameraName: "Saved Three", source: videoSource });
    await flush();
    h.recorders[0].emit("1".repeat(600));
    h.recorders[0].emit("2".repeat(600));
    await flush();
    expect(h.segments.size).toBe(2);
    // "Crash": the manager is abandoned with the recorder never stopped.

    const m2 = createCaptureSessionManager(h.deps);
    await m2.recoverInterruptedClips();
    expect(h.savedClips).toHaveLength(1);
    expect(await h.savedClips[0].blob.text()).toBe("1".repeat(600) + "2".repeat(600));
    expect(m2.getCompleted()?.reason).toBe("recovered");
    expect(h.segments.size).toBe(0);
    expect(h.registry).toHaveLength(0);
    expect(view.id).toBe(clipSessionId("saved-3"));
  });

  it("sessions are isolated: stopping one never touches another", async () => {
    const h = makeHarness();
    let n = 0;
    h.setFrameScript(() => ({ ok: true, blob: new Blob([`iso${++n}`]), frameAt: `i${n}` }));
    const m = createCaptureSessionManager(h.deps);
    const tl = await m.startTimelapse({ cameraId: "cam-9", cameraName: "Cam Nine" });
    const clip = await m.startClip({ savedCameraId: "saved-9", cameraName: "Saved Nine", source: videoSource });
    await flush();
    h.recorders[0].emit("k".repeat(1100));
    await flush();
    await m.stopSession(tl.id);
    expect(m.getSession(tl.id)).toBeNull();
    const still = m.getSession(clip.id);
    expect(still?.phase).toBe("recording");
    expect(h.segments.size).toBe(1);
    // The surviving session still finalizes correctly on its own stop.
    await m.stopSession(clip.id);
    expect(h.savedClips).toHaveLength(1);
    expect(await h.savedClips[0].blob.text()).toContain("k".repeat(100));
  });

  it("refuses a second clip for the same camera instead of double-recording", async () => {
    const h = makeHarness();
    const m = createCaptureSessionManager(h.deps);
    const a = await m.startClip({ savedCameraId: "saved-5", cameraName: "Five", source: videoSource });
    const b = await m.startClip({ savedCameraId: "saved-5", cameraName: "Five", source: videoSource });
    expect(b.id).toBe(a.id);
    expect(h.recorders).toHaveLength(1);
    await m.stopSession(a.id);
  });
});
