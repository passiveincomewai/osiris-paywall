import { describe, it, expect } from "vitest";
import { VISITOR_ID_KEY, getVisitorId, isVisitorId, newVisitorId, type VisitorIdStore } from "./visitor-id";

function memoryStore(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const store: VisitorIdStore = {
    get: (k) => data.get(k) ?? null,
    set: (k, v) => {
      data.set(k, v);
    },
  };
  return { store, data };
}

describe("newVisitorId", () => {
  it("mints canonical UUIDs, unique per call", () => {
    const a = newVisitorId();
    const b = newVisitorId();
    expect(isVisitorId(a)).toBe(true);
    expect(isVisitorId(b)).toBe(true);
    expect(a).not.toBe(b);
  });
});

describe("isVisitorId", () => {
  it("accepts canonical UUIDs and rejects everything else", () => {
    expect(isVisitorId("123e4567-e89b-42d3-a456-426614174000")).toBe(true);
    expect(isVisitorId("123E4567-E89B-42D3-A456-426614174000")).toBe(true);
    // The per-visit sessionId shape must never pass as a visitor ID.
    expect(isVisitorId("k3j9x2abc123")).toBe(false);
    expect(isVisitorId("nosession")).toBe(false);
    expect(isVisitorId("")).toBe(false);
    expect(isVisitorId(null)).toBe(false);
    expect(isVisitorId(undefined)).toBe(false);
    expect(isVisitorId(42)).toBe(false);
  });
});

describe("getVisitorId", () => {
  it("returns the persisted ID when one is stored and well-formed", () => {
    const existing = "123e4567-e89b-42d3-a456-426614174000";
    const { store, data } = memoryStore({ [VISITOR_ID_KEY]: existing });
    expect(getVisitorId(store)).toBe(existing);
    expect(data.get(VISITOR_ID_KEY)).toBe(existing); // untouched
  });

  it("mints and persists an ID on first visit", () => {
    const { store, data } = memoryStore();
    const id = getVisitorId(store);
    expect(isVisitorId(id)).toBe(true);
    expect(data.get(VISITOR_ID_KEY)).toBe(id);
    // And the next call reuses it — that persistence is the whole point.
    expect(getVisitorId(store)).toBe(id);
  });

  it("replaces a corrupt stored value instead of trusting it", () => {
    const { store, data } = memoryStore({ [VISITOR_ID_KEY]: "not-a-uuid" });
    const id = getVisitorId(store);
    expect(isVisitorId(id)).toBe(true);
    expect(data.get(VISITOR_ID_KEY)).toBe(id);
  });

  it("degrades to an ephemeral ID when storage reads throw (private mode)", () => {
    const store: VisitorIdStore = {
      get: () => {
        throw new Error("blocked");
      },
      set: () => {
        throw new Error("blocked");
      },
    };
    const id = getVisitorId(store);
    expect(isVisitorId(id)).toBe(true); // still well-formed, just unpersisted
  });

  it("still returns the minted ID when persisting fails", () => {
    const store: VisitorIdStore = {
      get: () => null,
      set: () => {
        throw new Error("quota");
      },
    };
    expect(isVisitorId(getVisitorId(store))).toBe(true);
  });
});
