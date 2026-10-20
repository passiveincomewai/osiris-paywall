import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  FREE_CAMERA_CLICKS,
  getCameraClickCount,
  cameraClickAllowed,
  recordCameraClick,
} from "./cameraGate";

// cameraGate reads the bare `localStorage` global (per-device count). The
// suite runs in node, so install an in-memory stub on globalThis.
function installStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  const stub = {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      map.set(k, String(v));
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => map.clear(),
  };
  (globalThis as any).localStorage = stub;
  return map;
}

beforeEach(() => {
  installStorage();
});

afterEach(() => {
  delete (globalThis as any).localStorage;
});

describe("FREE_CAMERA_CLICKS", () => {
  it("is 5 — Jameson's 2026-10-19 order (was 15)", () => {
    expect(FREE_CAMERA_CLICKS).toBe(5);
  });
});

describe("counting (opens, not unique cameras)", () => {
  it("starts at 0 with opens allowed", () => {
    expect(getCameraClickCount()).toBe(0);
    expect(cameraClickAllowed()).toBe(true);
  });

  it("persists under the per-device storage key", () => {
    const map = installStorage();
    recordCameraClick();
    expect(map.get("worldeye.cameraClicks")).toBe("1");
  });

  it("allows exactly FREE_CAMERA_CLICKS opens, then blocks", () => {
    // The page.tsx sequence: check allowed -> record, per open.
    for (let open = 1; open <= FREE_CAMERA_CLICKS; open++) {
      expect(cameraClickAllowed()).toBe(true);
      expect(recordCameraClick()).toBe(open);
    }
    expect(getCameraClickCount()).toBe(FREE_CAMERA_CLICKS);
    expect(cameraClickAllowed()).toBe(false);
  });

  it("keeps counting past the limit if an open is recorded anyway", () => {
    for (let i = 0; i < FREE_CAMERA_CLICKS + 2; i++) recordCameraClick();
    expect(getCameraClickCount()).toBe(FREE_CAMERA_CLICKS + 2);
    expect(cameraClickAllowed()).toBe(false);
  });

  it("treats a corrupt or non-positive stored value as 0", () => {
    installStorage({ "worldeye.cameraClicks": "abc" });
    expect(getCameraClickCount()).toBe(0);
    expect(cameraClickAllowed()).toBe(true);

    installStorage({ "worldeye.cameraClicks": "-3" });
    expect(getCameraClickCount()).toBe(0);

    installStorage({ "worldeye.cameraClicks": "0" });
    expect(getCameraClickCount()).toBe(0);
  });

  it("degrades to 0 / allowed when storage is unavailable", () => {
    delete (globalThis as any).localStorage;
    expect(getCameraClickCount()).toBe(0);
    expect(cameraClickAllowed()).toBe(true);
    // recordCameraClick still reports the would-be total without throwing.
    expect(recordCameraClick()).toBe(1);
  });
});
