// Tests for the localStorage recents list behind the "pick up where you
// left off" rail: only real opens are recorded, newest first, deduped,
// capped, and any malformed stored payload degrades to an empty list.
import { describe, it, expect } from "vitest";
import {
  RECENT_CAMERAS_KEY,
  RECENT_CAMERAS_MAX,
  parseRecentCameras,
  recordRecentCamera,
  readRecentCameras,
  rememberRecentCamera,
  type RecentCamera,
  type RecentCamerasStore,
} from "./recent-cameras";

function memStore(initial: Record<string, string> = {}): RecentCamerasStore & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    get: (k) => (k in data ? data[k] : null),
    set: (k, v) => {
      data[k] = v;
    },
  };
}

const cam = (id: string, at: number): RecentCamera => ({ id, name: `Cam ${id}`, at });

describe("recordRecentCamera", () => {
  it("puts the newest open first and dedupes by id (re-open moves to head)", () => {
    const list = [cam("a", 300), cam("b", 200), cam("c", 100)];
    const next = recordRecentCamera(list, { id: "b", name: "Cam b renamed" }, 400);
    expect(next.map((r) => r.id)).toEqual(["b", "a", "c"]);
    expect(next[0]).toEqual({ id: "b", name: "Cam b renamed", at: 400 });
  });

  it("caps the stored list", () => {
    let list: RecentCamera[] = [];
    for (let i = 0; i < RECENT_CAMERAS_MAX + 5; i++) {
      list = recordRecentCamera(list, { id: `c${i}`, name: `Cam ${i}` }, i);
    }
    expect(list).toHaveLength(RECENT_CAMERAS_MAX);
    expect(list[0].id).toBe(`c${RECENT_CAMERAS_MAX + 4}`);
  });
});

describe("parseRecentCameras", () => {
  it("round-trips a well-formed payload", () => {
    const raw = JSON.stringify([cam("a", 2), cam("b", 1)]);
    expect(parseRecentCameras(raw)).toEqual([cam("a", 2), cam("b", 1)]);
  });

  it("degrades malformed payloads to an empty (or cleaned) list", () => {
    expect(parseRecentCameras(null)).toEqual([]);
    expect(parseRecentCameras("not json")).toEqual([]);
    expect(parseRecentCameras("{}")).toEqual([]);
    expect(parseRecentCameras(JSON.stringify([{ id: 1 }, { nope: true }, cam("ok", 5)]))).toEqual([cam("ok", 5)]);
    // duplicates in storage collapse to the first occurrence
    expect(parseRecentCameras(JSON.stringify([cam("a", 2), cam("a", 1)]))).toEqual([cam("a", 2)]);
  });
});

describe("rememberRecentCamera / readRecentCameras", () => {
  it("persists opens through the store and reads them back newest-first", () => {
    const store = memStore();
    rememberRecentCamera({ id: "a", name: "Cam a" }, store, 100);
    rememberRecentCamera({ id: "b", name: "Cam b" }, store, 200);
    rememberRecentCamera({ id: "a", name: "Cam a" }, store, 300);
    const read = readRecentCameras(store);
    expect(read.map((r) => r.id)).toEqual(["a", "b"]);
    expect(read[0].at).toBe(300);
    expect(store.data[RECENT_CAMERAS_KEY]).toBe(JSON.stringify(read));
  });

  it("ignores an open with no id and never throws on a throwing store", () => {
    const store = memStore();
    rememberRecentCamera({ id: "", name: "Nope" }, store, 1);
    expect(readRecentCameras(store)).toEqual([]);
    const hostile: RecentCamerasStore = {
      get: () => {
        throw new Error("blocked");
      },
      set: () => {
        throw new Error("blocked");
      },
    };
    expect(() => rememberRecentCamera({ id: "x", name: "X" }, hostile, 1)).not.toThrow();
    expect(readRecentCameras(hostile)).toEqual([]);
  });
});
