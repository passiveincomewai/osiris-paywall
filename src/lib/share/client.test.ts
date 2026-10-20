import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Client share helpers — the state logic ShareButton and
 * ShareLinkBlock render from:
 *  - the device token is created once and stable (one anonymous
 *    identity per device),
 *  - a signed-in visitor's account code always wins; a signed-out
 *    visitor reuses the cached anonymous code and only mints on
 *    first need (never at page render),
 *  - generic share titles stay truthful per kind.
 */

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  vi.stubGlobal("window", { localStorage: globalThis.localStorage, location: { origin: "https://worldeye.app" } });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function sessionFetch(signedIn: boolean, extra: Record<string, unknown> = {}) {
  return vi.fn(async (url: string) => {
    if (url === "/api/auth/session") {
      return { ok: true, json: async () => (signedIn ? { user: { id: "u1" } } : {}) };
    }
    if (url in extra) return extra[url];
    throw new Error(`unexpected fetch ${url}`);
  });
}

describe("device token", () => {
  it("is created once and stable across calls", async () => {
    const { getShareDeviceToken, SHARE_DEVICE_KEY } = await import("./client");
    const a = getShareDeviceToken();
    const b = getShareDeviceToken();
    expect(a).toBeTruthy();
    expect(a).toBe(b);
    expect(store.get(SHARE_DEVICE_KEY)).toBe(a);
  });
});

describe("ensureShareCode precedence", () => {
  it("signed out: returns the cached anonymous code without minting", async () => {
    const { ensureShareCode, SHARE_CODE_KEY } = await import("./client");
    store.set(SHARE_CODE_KEY, "wecachedcode1");
    const fetchMock = sessionFetch(false);
    vi.stubGlobal("fetch", fetchMock);
    await expect(ensureShareCode()).resolves.toBe("wecachedcode1");
    expect(fetchMock.mock.calls.some((c) => c[0] === "/api/share/identity")).toBe(false);
  });

  it("signed in: the account code wins and is cached", async () => {
    const { ensureShareCode, SHARE_CODE_KEY } = await import("./client");
    const fetchMock = sessionFetch(true, {
      "/api/share/code": { ok: true, json: async () => ({ code: "accountcode9" }) },
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(ensureShareCode()).resolves.toBe("accountcode9");
    expect(store.get(SHARE_CODE_KEY)).toBe("accountcode9");
  });

  it("signed out with nothing cached: mints an anonymous code for this device token", async () => {
    const { ensureShareCode, SHARE_CODE_KEY } = await import("./client");
    const fetchMock = sessionFetch(false, {
      "/api/share/identity": { ok: true, json: async () => ({ code: "weanoncode42" }) },
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(ensureShareCode()).resolves.toBe("weanoncode42");
    expect(store.get(SHARE_CODE_KEY)).toBe("weanoncode42");
    const mintCall = fetchMock.mock.calls.find((c) => c[0] === "/api/share/identity");
    expect(mintCall).toBeTruthy();
    const body = JSON.parse((mintCall as any)[1].body);
    expect(typeof body.deviceToken).toBe("string");
    expect(body.deviceToken.length).toBeGreaterThan(10);
  });
});

describe("entityShareTitle (links)", () => {
  it("falls back to truthful generic titles per kind", async () => {
    const { entityShareTitle } = await import("./links");
    expect(entityShareTitle("camera")).toBe("Live camera — live on WorldEye");
    expect(entityShareTitle("storm", "Hurricane Example")).toBe("Hurricane Example — live on WorldEye");
    expect(entityShareTitle("flight")).toBe("Live flight — live on WorldEye");
  });
});
