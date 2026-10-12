// Video Studio pure-helper tests: cover-fit math, word wrap, canvas
// sizing caps, end-card layout, and recorder mime/extension picks.
import { describe, it, expect } from "vitest";
import {
  HOOK_SECONDS,
  END_CARD_SECONDS,
  MIME_CANDIDATES,
  coverFit,
  canvasSizeFor,
  wrapText,
  hookFontPx,
  hookMaxChars,
  endCardLayout,
  pickMimeType,
  extensionForMime,
  displayLink,
} from "./video-render";

describe("constants", () => {
  it("hook shows for 5s and the end card for 3s", () => {
    expect(HOOK_SECONDS).toBe(5);
    expect(END_CARD_SECONDS).toBe(3);
  });
});

describe("coverFit", () => {
  it("exact fit is identity", () => {
    expect(coverFit(720, 1280, 720, 1280)).toEqual({ dx: 0, dy: 0, dw: 720, dh: 1280 });
  });
  it("wider source is center-cropped horizontally", () => {
    // 1920x1080 into 720x1280: scale by height (1280/1080), width overflows.
    const f = coverFit(1920, 1080, 720, 1280);
    expect(f.dh).toBeCloseTo(1280);
    expect(f.dw).toBeCloseTo((1920 * 1280) / 1080);
    expect(f.dx).toBeCloseTo((720 - f.dw) / 2);
    expect(f.dy).toBeCloseTo(0);
    expect(f.dx).toBeLessThan(0);
  });
  it("taller source is center-cropped vertically", () => {
    const f = coverFit(720, 1280, 1280, 720);
    expect(f.dw).toBeCloseTo(1280);
    expect(f.dh).toBeCloseTo((1280 * 1280) / 720);
    expect(f.dy).toBeLessThan(0);
    expect(f.dx).toBeCloseTo(0);
  });
  it("always covers the destination", () => {
    for (const [sw, sh, dw, dh] of [
      [1080, 1920, 720, 1280],
      [1920, 1080, 1280, 720],
      [100, 100, 720, 1280],
      [4000, 100, 300, 300],
    ] as const) {
      const f = coverFit(sw, sh, dw, dh);
      expect(f.dw).toBeGreaterThanOrEqual(dw - 1e-9);
      expect(f.dh).toBeGreaterThanOrEqual(dh - 1e-9);
    }
  });
  it("degenerate inputs do not produce NaN", () => {
    const f = coverFit(0, 0, 720, 1280);
    expect(Number.isFinite(f.dw)).toBe(true);
    expect(Number.isFinite(f.dh)).toBe(true);
  });
});

describe("canvasSizeFor", () => {
  it("caps vertical 1080x1920 at 720x1280", () => {
    expect(canvasSizeFor(1080, 1920)).toEqual({ width: 720, height: 1280 });
  });
  it("caps landscape 1920x1080 at 1280x720", () => {
    expect(canvasSizeFor(1920, 1080)).toEqual({ width: 1280, height: 720 });
  });
  it("leaves small inputs untouched", () => {
    expect(canvasSizeFor(640, 360)).toEqual({ width: 640, height: 360 });
    expect(canvasSizeFor(360, 640)).toEqual({ width: 360, height: 640 });
  });
  it("returns even dimensions", () => {
    const s = canvasSizeFor(1081, 1921);
    expect(s.width % 2).toBe(0);
    expect(s.height % 2).toBe(0);
  });
});

describe("wrapText", () => {
  it("wraps greedily on word boundaries", () => {
    expect(wrapText("one two three four", 9)).toEqual(["one two", "three", "four"]);
  });
  it("never exceeds the limit", () => {
    const lines = wrapText("I just discovered a website that lets you explore cameras around the world.", 20);
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(20);
  });
  it("hard-splits words longer than the limit", () => {
    expect(wrapText("abcdefghij", 4)).toEqual(["abcd", "efgh", "ij"]);
  });
  it("collapses whitespace and trims", () => {
    expect(wrapText("  hello   \n world  ", 20)).toEqual(["hello world"]);
  });
  it("empty input yields no lines", () => {
    expect(wrapText("", 10)).toEqual([]);
    expect(wrapText("   ", 10)).toEqual([]);
  });
});

describe("hook sizing", () => {
  it("font is ~5.5% of canvas width", () => {
    expect(hookFontPx(720)).toBe(40); // 720 * 0.055 = 39.6 → 40
    expect(hookFontPx(1280)).toBe(70);
  });
  it("max chars keeps lines inside the 6% margins", () => {
    const chars = hookMaxChars(720);
    // line width estimate = chars * fontPx * 0.58 must fit 88% of canvas
    expect(chars * hookFontPx(720) * 0.58).toBeLessThanOrEqual(720 * 0.88);
    expect(chars).toBeGreaterThanOrEqual(8);
  });
});

describe("endCardLayout", () => {
  it("lays out a vertical end card inside the canvas", () => {
    const l = endCardLayout(720, 1280);
    expect(l.bg).toBe("#050810");
    expect(l.logo.size).toBe(Math.round(720 * 0.22));
    expect(l.logo.x + l.logo.size / 2).toBeCloseTo(360); // centered
    expect(l.qr.size).toBe(Math.round(720 * 0.28));
    expect(l.qr.x).toBeGreaterThanOrEqual(0);
    expect(l.qr.x + l.qr.size).toBeLessThanOrEqual(720);
    expect(l.qr.y + l.qr.size).toBeLessThanOrEqual(1280);
    expect(l.headline.y).toBeGreaterThan(l.logo.y + l.logo.size);
    expect(l.link.y).toBeGreaterThan(l.headline.y);
    expect(l.discount.y).toBeGreaterThan(l.link.y);
  });
  it("works for landscape too", () => {
    const l = endCardLayout(1280, 720);
    expect(l.qr.x + l.qr.size).toBeLessThanOrEqual(1280);
    expect(l.qr.y).toBeLessThan(720);
    expect(l.headline.fontPx).toBeGreaterThan(0);
  });
});

describe("pickMimeType / extensionForMime", () => {
  it("prefers mp4 when supported", () => {
    expect(pickMimeType(() => true)).toBe("video/mp4");
  });
  it("falls back in candidate order", () => {
    expect(pickMimeType((t) => t.includes("vp8"))).toBe("video/webm;codecs=vp8,opus");
    expect(pickMimeType((t) => t === "video/webm")).toBe("video/webm");
  });
  it("returns null when nothing is supported", () => {
    expect(pickMimeType(() => false)).toBeNull();
  });
  it("treats a throwing probe as unsupported", () => {
    expect(
      pickMimeType((t) => {
        if (t === MIME_CANDIDATES[0]) throw new Error("nope");
        return t === "video/webm";
      }),
    ).toBe("video/webm");
  });
  it("extension follows the mime", () => {
    expect(extensionForMime("video/mp4")).toBe("mp4");
    expect(extensionForMime("video/mp4;codecs=avc1")).toBe("mp4");
    expect(extensionForMime("video/webm;codecs=vp9,opus")).toBe("webm");
    expect(extensionForMime(null)).toBe("webm");
    expect(extensionForMime(undefined)).toBe("webm");
  });
});

describe("displayLink", () => {
  it("strips the scheme and trailing slash", () => {
    expect(displayLink("https://worldeye.app/ref/abc")).toBe("worldeye.app/ref/abc");
    expect(displayLink("http://worldeye.app/ref/abc/")).toBe("worldeye.app/ref/abc");
  });
});
