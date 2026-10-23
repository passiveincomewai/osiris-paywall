import { describe, it, expect } from "vitest";
import {
  resolveTeaserArm,
  isTeaserDismissed,
  recordTeaserDismissal,
  maybeResetTeaser,
  isAnonymousSession,
  ARM_KEY,
  DISMISSED_KEY,
  type KeyValueStore,
  type CookieJar,
} from "./assignment";
import type { TeaserConfig } from "./config";

const ON: TeaserConfig = { enabled: true, enrollPct: 100 };
const OFF: TeaserConfig = { enabled: false, enrollPct: 0 };

function fakeStore(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  const store: KeyValueStore = {
    get: (k) => (map.has(k) ? (map.get(k) as string) : null),
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

/** RNG that returns the queued draws in order, then repeats the last. */
function rngSeq(...draws: number[]) {
  let i = 0;
  return () => draws[Math.min(i++, draws.length - 1)];
}

describe("resolveTeaserArm", () => {
  it("returns null and writes nothing when the flag is off", () => {
    const { store, map } = fakeStore();
    const { cookies, jar } = fakeCookies();
    expect(resolveTeaserArm(OFF, rngSeq(0.1), store, cookies, "")).toBeNull();
    expect(map.size).toBe(0);
    expect(jar.size).toBe(0);
  });

  it("assigns treatment on a low arm draw and persists store + cookie", () => {
    const { store, map } = fakeStore();
    const { cookies, jar } = fakeCookies();
    // enrollPct 100: first draw is the enrollment draw (0.9*100 < 100 ok),
    // second draw 0.3 < 0.5 -> treatment.
    const res = resolveTeaserArm(ON, rngSeq(0.9, 0.3), store, cookies, "");
    expect(res).toEqual({ arm: "treatment", fresh: true });
    expect(map.get(ARM_KEY)).toBe("treatment");
    expect(jar.get(ARM_KEY)).toBe("treatment");
  });

  it("assigns control on a high arm draw", () => {
    const { store } = fakeStore();
    const { cookies } = fakeCookies();
    const res = resolveTeaserArm(ON, rngSeq(0.1, 0.7), store, cookies, "");
    expect(res).toEqual({ arm: "control", fresh: true });
  });

  it("is sticky: an existing arm wins over any later draw", () => {
    const { store } = fakeStore({ [ARM_KEY]: "control" });
    const { cookies } = fakeCookies();
    // Draws would assign treatment if re-rolled; they must not be used.
    const res = resolveTeaserArm(ON, rngSeq(0.0, 0.0), store, cookies, "");
    expect(res).toEqual({ arm: "control", fresh: false });
  });

  it("excludes visitors outside the enrollment percentage — permanently", () => {
    const { store, map } = fakeStore();
    const { cookies } = fakeCookies();
    const pct50: TeaserConfig = { enabled: true, enrollPct: 50 };
    // Enrollment draw 0.6 -> 60 >= 50: not enrolled.
    expect(resolveTeaserArm(pct50, rngSeq(0.6), store, cookies, "")).toBeNull();
    expect(map.get(ARM_KEY)).toBe("off");
    // A later visit with winning draws is still out (marker persisted).
    expect(resolveTeaserArm(pct50, rngSeq(0.0, 0.0), store, cookies, "")).toBeNull();
  });

  it("enrolls visitors inside the percentage", () => {
    const { store } = fakeStore();
    const { cookies } = fakeCookies();
    const pct50: TeaserConfig = { enabled: true, enrollPct: 50 };
    const res = resolveTeaserArm(pct50, rngSeq(0.4, 0.2), store, cookies, "");
    expect(res).toEqual({ arm: "treatment", fresh: true });
  });

  it("QA force overrides + persists, and reports fresh only on change", () => {
    const { store, map } = fakeStore({ [ARM_KEY]: "treatment" });
    const { cookies } = fakeCookies();
    const res = resolveTeaserArm(ON, rngSeq(0.5), store, cookies, "?teaser_arm=control");
    expect(res).toEqual({ arm: "control", fresh: true });
    expect(map.get(ARM_KEY)).toBe("control");
    const again = resolveTeaserArm(ON, rngSeq(0.5), store, cookies, "?teaser_arm=control");
    expect(again).toEqual({ arm: "control", fresh: false });
  });

  it("fails closed (null) when storage throws", () => {
    const broken: KeyValueStore = {
      get: () => {
        throw new Error("denied");
      },
      set: () => {
        throw new Error("denied");
      },
    };
    const { cookies } = fakeCookies();
    expect(resolveTeaserArm(ON, rngSeq(0.1, 0.1), broken, cookies, "")).toBeNull();
  });
});

describe("dismissal memory", () => {
  it("round-trips: not dismissed -> record -> dismissed", () => {
    const { store, map } = fakeStore();
    expect(isTeaserDismissed(store)).toBe(false);
    recordTeaserDismissal(store, 1234567890);
    expect(map.get(DISMISSED_KEY)).toBe("1234567890");
    expect(isTeaserDismissed(store)).toBe(true);
  });

  it("treats unreadable storage as dismissed (never nag blind)", () => {
    const broken: KeyValueStore = {
      get: () => {
        throw new Error("denied");
      },
      set: () => {},
    };
    expect(isTeaserDismissed(broken)).toBe(true);
  });
});

describe("maybeResetTeaser", () => {
  it("clears arm + dismissal on ?teaser_reset=1 only", () => {
    const { store, map } = fakeStore({ [ARM_KEY]: "treatment", [DISMISSED_KEY]: "42" });
    expect(maybeResetTeaser(store, "?foo=1")).toBe(false);
    expect(map.get(ARM_KEY)).toBe("treatment");
    expect(maybeResetTeaser(store, "?teaser_reset=1")).toBe(true);
    expect(map.get(ARM_KEY)).toBe("");
    expect(map.get(DISMISSED_KEY)).toBe("");
    // After a reset the visitor can be assigned afresh.
    const { cookies } = fakeCookies();
    expect(resolveTeaserArm(ON, rngSeq(0.1, 0.1), store, cookies, "")).toEqual({
      arm: "treatment",
      fresh: true,
    });
  });
});

describe("isAnonymousSession", () => {
  it("treats signed-out shapes as anonymous (v5 null, v4 empty object)", () => {
    expect(isAnonymousSession(null)).toBe(true);
    expect(isAnonymousSession(undefined)).toBe(true);
    expect(isAnonymousSession({})).toBe(true);
    expect(isAnonymousSession({ user: null })).toBe(true);
    expect(isAnonymousSession({ expires: "2099-01-01" })).toBe(true);
  });

  it("treats a session with a user as signed in", () => {
    expect(isAnonymousSession({ user: { id: "u1", email: "a@b.c" } })).toBe(false);
  });

  it("fails closed on malformed payloads", () => {
    expect(isAnonymousSession("garbage")).toBe(false);
    expect(isAnonymousSession(42)).toBe(false);
    expect(isAnonymousSession(true)).toBe(false);
  });
});
