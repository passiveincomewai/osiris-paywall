/**
 * Regression test for the 2026-10-20 site-wide crash (Deploy 10).
 *
 * useCaptureSessions fed React's useSyncExternalStore a getSnapshot that
 * allocated a fresh array on every call (listSessions()). React compares
 * snapshots by reference, so every render looked like a store change and
 * re-rendered until React threw error #185 ("Maximum update depth
 * exceeded") — in the root layout, on every page. The manager's cached
 * snapshot accessor (getSessionsSnapshot) is the contract fix; these
 * tests pin the property whose absence caused the outage: reference
 * stability between changes, and a new reference exactly when the store
 * notifies.
 */
import { describe, expect, it, vi } from "vitest";
import {
  createCaptureSessionManager,
  type CaptureSessionDeps,
} from "./sessions";

function stubDeps(): CaptureSessionDeps {
  return {
    now: () => 1_000_000,
    setInterval: () => 0,
    clearInterval: () => {},
    fetchFrame: async () => ({ ok: false, blob: null, frameAt: "" }),
    tlGet: async () => null,
    tlPutSession: async () => {},
    tlPutFrame: async () => {},
    openVideoStream: async () => { throw new Error("unused"); },
    openStillsStream: async () => { throw new Error("unused"); },
    makeRecorder: () => { throw new Error("unused"); },
    putSegment: async () => {},
    getSegments: async () => [],
    deleteSegments: async () => {},
    saveClip: async () => "clip",
    registryRead: () => [],
    registryWrite: () => {},
  } as unknown as CaptureSessionDeps;
}

describe("getSessionsSnapshot — useSyncExternalStore contract", () => {
  it("returns the identical reference across calls while nothing changed", () => {
    const m = createCaptureSessionManager(stubDeps());
    const a = m.getSessionsSnapshot();
    const b = m.getSessionsSnapshot();
    const c = m.getSessionsSnapshot();
    expect(Object.is(a, b)).toBe(true);
    expect(Object.is(b, c)).toBe(true);
    expect(a).toEqual([]);
  });

  it("produces a new reference when the store notifies, then is stable again", () => {
    const m = createCaptureSessionManager(stubDeps());
    const before = m.getSessionsSnapshot();
    // dismissCompleted() runs the manager's notify path unconditionally.
    m.dismissCompleted();
    const after = m.getSessionsSnapshot();
    expect(Object.is(before, after)).toBe(false);
    expect(Object.is(after, m.getSessionsSnapshot())).toBe(true);
  });

  it("notifies subscribers on change (subscribe contract intact)", () => {
    const m = createCaptureSessionManager(stubDeps());
    const listener = vi.fn();
    const unsub = m.subscribe(listener);
    m.dismissCompleted();
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
    m.dismissCompleted();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("listSessions stays an imperative read (fresh contents, not the snapshot)", () => {
    const m = createCaptureSessionManager(stubDeps());
    expect(m.listSessions()).toEqual(m.getSessionsSnapshot());
    expect(m.listSessions()).toEqual([]);
  });
});
