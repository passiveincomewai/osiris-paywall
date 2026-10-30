import { describe, expect, it } from "vitest";
import {
  denverClock,
  frameSignature,
  isExpiredNight,
  isJpeg,
  shouldStoreFrame,
  stakeNightKey,
  type StakeFrame,
} from "./stake-capture";

// Oct 30 2026 is MDT (UTC-6) in America/Denver.
describe("stakeNightKey", () => {
  it("keys an evening capture to that Denver date", () => {
    // 2026-10-30 23:30 UTC = 17:30 MDT
    expect(stakeNightKey(new Date("2026-10-30T23:30:00Z"))).toBe("2026-10-30");
  });
  it("keys the small hours to the night that started the day before", () => {
    // 2026-10-31 08:00 UTC = 02:00 MDT
    expect(stakeNightKey(new Date("2026-10-31T08:00:00Z"))).toBe("2026-10-30");
  });
  it("is closed mid-day", () => {
    // 2026-10-30 18:00 UTC = 12:00 MDT
    expect(stakeNightKey(new Date("2026-10-30T18:00:00Z"))).toBeNull();
  });
  it("opens at 16:00 Denver sharp", () => {
    // 2026-10-30 22:00 UTC = 16:00 MDT
    expect(stakeNightKey(new Date("2026-10-30T22:00:00Z"))).toBe("2026-10-30");
  });
});

describe("frameSignature + isJpeg", () => {
  it("is stable for identical bytes and changes with content", () => {
    const a = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
    const b = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 4]);
    expect(frameSignature(a)).toBe(frameSignature(a));
    expect(frameSignature(a)).not.toBe(frameSignature(b));
    expect(frameSignature(a)).toHaveLength(16);
  });
  it("recognises the JPEG SOI marker only", () => {
    expect(isJpeg(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
    expect(isJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(false); // PNG
    expect(isJpeg(new Uint8Array([0xff, 0xd8]))).toBe(false); // too short
  });
});

describe("shouldStoreFrame", () => {
  const frame = (sig: string): StakeFrame => ({
    t: "2026-10-31T02:00:00.000Z",
    url: "https://blob.example/x.jpg",
    sig,
  });
  it("stores the first frame of a night", () => {
    expect(shouldStoreFrame([], "aaa")).toBe(true);
  });
  it("skips a frame identical to the latest stored one", () => {
    expect(shouldStoreFrame([frame("aaa")], "aaa")).toBe(false);
    expect(shouldStoreFrame([frame("aaa")], "bbb")).toBe(true);
  });
  it("stops at the per-night cap", () => {
    const full = Array.from({ length: 20 }, (_, i) => frame(`s${i}`));
    expect(shouldStoreFrame(full, "new")).toBe(false);
  });
});

describe("isExpiredNight", () => {
  const now = new Date("2026-10-30T18:00:00Z"); // Denver date 2026-10-30
  it("expires nights older than the 2-day retention", () => {
    expect(isExpiredNight("2026-10-27", now)).toBe(true);
  });
  it("keeps last night and the night before", () => {
    expect(isExpiredNight("2026-10-29", now)).toBe(false);
    expect(isExpiredNight("2026-10-28", now)).toBe(false);
  });
});

describe("denverClock", () => {
  it("formats Denver wall time", () => {
    // 2026-10-31 02:05 UTC = 2026-10-30 20:05 MDT
    expect(denverClock(new Date("2026-10-31T02:05:00Z"))).toBe("20:05");
  });
});
