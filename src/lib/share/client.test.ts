import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Client share helpers — the state logic ShareButton and
 * ShareLinkBlock render from:
 *  - the device token is minted once and stable (one anonymous
 *    identity per device),
 *  - a signed-in visitor's account code wins over the device's
 *    anonymous code,
 *  - the share outcomes mirror the established camera-share outcomes
 *    (a dismissed share sheet is NOT a copy).
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
  it("returns the cached anonymous code without any fetch", async () => {
    const { ensureShareCode, SHARE_CODE_KEY } = await import("./client");
    store.set(SHARE_CODE_KEY, "wecachedcode1");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(ensureShareCode()).resolves.toBe("wecachedcode1");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("prefers the signed-in account code over minting an anonymous one", async () => {
    const { ensureShareCode, SHARE_CODE_KEY } = await import("./client");
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "/api/share/code") return { ok: true, json: async () => ({ code: "accountcode9" }) };
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(ensureShareCode()).resolves.toBe("accountcode9");
    expect(store.get(SHARE_CODE_KEY)).toBe("accountcode9");
  });

  it("mints an anonymous code when signed out", async () => {
    const { ensureShareCode, SHARE_CODE_KEY } = await import("./client");
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "/api/share/code") return { ok: true, json: async () => ({ code: null }) };
      if (url === "/api/share/identity") return { ok: true, json: async () => ({ code: "weanoncode42" }) };
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(ensureShareCode()).resolves.toBe("weanoncode42");
    expect(store.get(SHARE_CODE_KEY)).toBe("weanoncode42");
    const mintCall = fetchMock.mock.calls.find((c) => c[0] === "/api/share/identity");
    expect(mintCall).toBeTruthy();
    const body = JSON.parse((mintCall![1] as any).body);
    expect(typeof body.deviceToken).toBe("string");
    expect(body.deviceToken.length).toBeGreaterThan(10);
  });
});

describe("entityShareTitle", () => {
  it("falls back to truthful generic titles per kind", async () => {
    const { entityShareTitle } = await import("./client");
    expect(entityShareTitle({ kind: "camera", id: "x" })).toBe("Live camera on WorldEye");
    expect(entityShareTitle({ kind: "storm", id: "al052026" }, "Hurricane Example")).toBe("Hurricane Example — live on WorldEye");
    expect(entityShareTitle({ kind: "flight", id: "abc123" })).toBe("Live flight on WorldEye");
  });
});
