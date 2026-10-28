import { describe, expect, it } from "vitest";
import { withoutFutureLastmod } from "./lastmod";

const NOW = new Date("2026-10-28T12:00:00.000Z");

describe("withoutFutureLastmod", () => {
  it("keeps a past lastmod untouched", () => {
    const e = { url: "https://worldeye.app/x", lastModified: new Date("2026-10-02") };
    expect(withoutFutureLastmod(e, NOW)).toBe(e);
  });

  it("keeps a lastmod exactly at now", () => {
    const e = { url: "https://worldeye.app/x", lastModified: new Date(NOW) };
    expect(withoutFutureLastmod(e, NOW)).toBe(e);
  });

  it("drops a future lastmod instead of clamping it", () => {
    const e = {
      url: "https://worldeye.app/x",
      lastModified: new Date("2026-12-11"),
      priority: 0.6,
    };
    const out = withoutFutureLastmod(e, NOW);
    expect(out.lastModified).toBeUndefined();
    expect("lastModified" in out).toBe(false);
    // The rest of the entry survives byte-identical.
    expect(out.url).toBe(e.url);
    expect(out.priority).toBe(0.6);
    // The input entry is not mutated.
    expect(e.lastModified).toEqual(new Date("2026-12-11"));
  });

  it("drops a future lastmod given as an ISO string", () => {
    const e = { url: "https://worldeye.app/x", lastModified: "2026-10-29T00:00:00.000Z" };
    expect(withoutFutureLastmod(e, NOW).lastModified).toBeUndefined();
  });

  it("leaves an undated entry alone", () => {
    const e: { url: string; lastModified?: Date } = { url: "https://worldeye.app/x" };
    expect(withoutFutureLastmod(e, NOW)).toBe(e);
  });
});
