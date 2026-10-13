import { describe, it, expect } from "vitest";
import {
  assignGroup,
  loadState,
  saveState,
  defaultState,
  conversionEligible,
  maybeResetOnboarding,
  CONVERSION_GAP_MS,
  type KeyValueStore,
  type CookieJar,
  type OnbState,
} from "./storage";

function fakeStore(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  const store: KeyValueStore = {
    get: (k) => (map.has(k) ? map.get(k)! : null),
    set: (k, v) => {
      map.set(k, v);
    },
  };
  return { store, map };
}

function fakeCookies() {
  const jar = new Map<string, string>();
  const cookies: CookieJar = {
    set: (n, v) => {
      jar.set(n, v);
    },
  };
  return { cookies, jar };
}

describe("assignGroup", () => {
  it("assigns 'a' when rng < 0.5 and 'b' otherwise", () => {
    const { store } = fakeStore();
    const { cookies } = fakeCookies();
    expect(assignGroup(() => 0.1, store, cookies, "")).toBe("a");
    const s2 = fakeStore();
    expect(assignGroup(() => 0.9, s2.store, cookies, "")).toBe("b");
  });

  it("persists to localStorage and cookie, then sticks", () => {
    const { store, map } = fakeStore();
    const { cookies, jar } = fakeCookies();
    const g1 = assignGroup(() => 0.9, store, cookies, "");
    expect(g1).toBe("b");
    expect(map.get("we_onb_group")).toBe("b");
    expect(jar.get("we_onb_group")).toBe("b");
    // A later call with the opposite rng keeps the stored group.
    expect(assignGroup(() => 0.0, store, cookies, "")).toBe("b");
  });

  it("honors the ?onb_group= QA override and persists it", () => {
    const { store, map } = fakeStore({ we_onb_group: "b" });
    const { cookies } = fakeCookies();
    expect(assignGroup(() => 0.9, store, cookies, "?onb_group=a")).toBe("a");
    expect(map.get("we_onb_group")).toBe("a");
  });
});

describe("state persistence", () => {
  it("returns defaults when nothing stored", () => {
    const { store } = fakeStore();
    const s = loadState(store);
    expect(s.welcome).toBe("pending");
    expect(s.features).toEqual([]);
    expect(s.convShows).toBe(0);
  });

  it("round-trips through save/load and mirrors welcome to a cookie", () => {
    const { store } = fakeStore();
    const { cookies, jar } = fakeCookies();
    const s = defaultState(123);
    s.welcome = "done";
    s.features = ["camera", "layer"];
    saveState(s, store, cookies);
    const back = loadState(store);
    expect(back.welcome).toBe("done");
    expect(back.features).toEqual(["camera", "layer"]);
    expect(jar.get("we_onb_welcome")).toBe("done");
  });

  it("survives corrupt stored JSON", () => {
    const { store } = fakeStore({ we_onb_state: "{not json" });
    expect(loadState(store).welcome).toBe("pending");
  });
});

describe("maybeResetOnboarding", () => {
  it("clears state only when asked", () => {
    const { store, map } = fakeStore({ we_onb_state: "{}" });
    expect(maybeResetOnboarding(store, "?x=1")).toBe(false);
    expect(maybeResetOnboarding(store, "?onb_reset=1")).toBe(true);
    expect(map.get("we_onb_state")).toBe("");
  });
});

describe("conversionEligible", () => {
  const base = (over: Partial<OnbState> = {}): OnbState => ({ ...defaultState(0), ...over });

  it("requires tour completion or >=3 distinct free features", () => {
    expect(conversionEligible(base(), 0)).toBe(false);
    expect(conversionEligible(base(), 2)).toBe(false);
    expect(conversionEligible(base(), 3)).toBe(true);
    expect(conversionEligible(base({ welcome: "done" }), 0)).toBe(true);
  });

  it("respects the 7-day gap and the 2-show cap", () => {
    const now = 10 * CONVERSION_GAP_MS;
    expect(conversionEligible(base({ welcome: "done", convShows: 1, convLast: now - 1000 }), 0, now)).toBe(false);
    expect(conversionEligible(base({ welcome: "done", convShows: 1, convLast: now - CONVERSION_GAP_MS - 1 }), 0, now)).toBe(true);
    expect(conversionEligible(base({ welcome: "done", convShows: 2, convLast: 0 }), 5, now)).toBe(false);
  });

  it("never shows once muted", () => {
    expect(conversionEligible(base({ welcome: "done", convMuted: true }), 9)).toBe(false);
  });
});
