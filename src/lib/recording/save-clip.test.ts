/**
 * The save leg, tested at the seam: metadata POST + IndexedDB writes
 * are faked, and the assertions are about ORDER and COUNT — the blob
 * must be written exactly once, under the server's id, after the
 * metadata lands (the double-write was the quota bug behind "failed
 * to save clip" for live cameras) — and about the plain-words error
 * mapping that replaced the bare fallback.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clipSaveErrorMessage, pickRecorderMime, saveRecordedClip } from "./save-clip";
import type { ClipMetaBody } from "./multi";

const puts: { id: string; size: number }[] = [];
let putError: unknown = null;

vi.mock("@/lib/recording/idb", () => ({
  idbPutClip: async (id: string, blob: Blob) => {
    if (putError) throw putError;
    puts.push({ id, size: blob.size });
  },
  idbDeleteClip: async () => {},
}));

const meta: ClipMetaBody = {
  cameraName: "I-70 MP 074.65 EB at CO 215 in Parachute",
  savedCameraId: "saved-1",
  durationSec: 42,
  sizeBytes: 1234,
  startedAt: new Date(1_000_000).toISOString(),
  mimeType: "video/webm",
};

function stubFetch(ok: boolean, body: unknown, status = ok ? 200 : 500) {
  return vi.fn(async () => ({
    ok,
    status,
    json: async () => body,
  }));
}

beforeEach(() => {
  puts.length = 0;
  putError = null;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("saveRecordedClip", () => {
  it("posts metadata first, then writes the blob exactly once, under the server id", async () => {
    const fetchFn = stubFetch(true, { clip: { id: "clip-9" } });
    vi.stubGlobal("fetch", fetchFn);
    const blob = new Blob(["x".repeat(2048)], { type: "video/webm" });
    const id = await saveRecordedClip(blob, meta);
    expect(id).toBe("clip-9");
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(puts).toEqual([{ id: "clip-9", size: 2048 }]);
  });

  it("keeps the blob on the device under a temporary id when the metadata POST fails", async () => {
    vi.stubGlobal("fetch", stubFetch(false, { error: "pro_required" }, 403));
    const blob = new Blob(["x".repeat(2048)], { type: "video/webm" });
    await expect(saveRecordedClip(blob, meta)).rejects.toThrow("pro_required");
    expect(puts).toHaveLength(1);
    expect(puts[0].id).not.toBe("clip-9");
    expect(puts[0].size).toBe(2048);
  });

  it("propagates a quota failure from the single write, with nothing else written", async () => {
    vi.stubGlobal("fetch", stubFetch(true, { clip: { id: "clip-9" } }));
    putError = new DOMException("quota", "QuotaExceededError");
    const blob = new Blob(["x".repeat(2048)], { type: "video/webm" });
    await expect(saveRecordedClip(blob, meta)).rejects.toThrow("quota");
    expect(puts).toHaveLength(0);
  });
});

describe("clipSaveErrorMessage", () => {
  it("explains a quota rejection in plain words", () => {
    expect(clipSaveErrorMessage(new DOMException("x", "QuotaExceededError"))).toMatch(
      /storage is full/,
    );
  });

  it("passes a real error's message through", () => {
    expect(clipSaveErrorMessage(new Error("metadata save failed"))).toBe("metadata save failed");
  });

  it("passes a non-quota DOMException's message through (it is an Error)", () => {
    expect(clipSaveErrorMessage(new DOMException("disk gone", "UnknownError"))).toBe("disk gone");
  });

  it("falls back for non-Error throwables (the old silent case)", () => {
    expect(clipSaveErrorMessage("nope")).toBe("Failed to save clip");
    expect(clipSaveErrorMessage(undefined)).toBe("Failed to save clip");
  });
});

describe("pickRecorderMime", () => {
  it("prefers VP8 over VP9 (software-encode cost), then plain WebM, then default", () => {
    vi.stubGlobal("window", {
      MediaRecorder: {
        isTypeSupported: (m: string) => m.includes("vp9") || m === "video/webm",
      },
    });
    // VP8 unsupported here, VP9 supported: VP9 wins over the bare default.
    expect(pickRecorderMime()).toBe("video/webm;codecs=vp9");
    vi.stubGlobal("window", {
      MediaRecorder: { isTypeSupported: () => true },
    });
    expect(pickRecorderMime()).toBe("video/webm;codecs=vp8");
    vi.stubGlobal("window", { MediaRecorder: { isTypeSupported: () => false } });
    expect(pickRecorderMime()).toBe("");
  });
});
