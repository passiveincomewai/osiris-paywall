import { describe, it, expect } from "vitest";
import { embedHtml, embedImagePath, embedImageUrl } from "./embed";

describe("embedImagePath / embedImageUrl", () => {
  it("builds the public endpoint path", () => {
    expect(embedImagePath("jane42", "banner-leaderboard-728x90")).toBe(
      "/api/affiliate/studio/embed/jane42/banner-leaderboard-728x90",
    );
  });

  it("URL-encodes both segments", () => {
    expect(embedImagePath("a b", "x/y")).toBe("/api/affiliate/studio/embed/a%20b/x%2Fy");
  });

  it("joins the base URL without a double slash", () => {
    expect(embedImageUrl("https://worldeye.app/", "jane42", "s")).toBe(
      "https://worldeye.app/api/affiliate/studio/embed/jane42/s",
    );
    expect(embedImageUrl("https://worldeye.app", "jane42", "s")).toBe(
      "https://worldeye.app/api/affiliate/studio/embed/jane42/s",
    );
  });
});

describe("embedHtml", () => {
  it("emits native dimensions, the referral link, and rel=sponsored", () => {
    const html = embedHtml({
      link: "https://worldeye.app/ref/jane42",
      imageUrl: "https://worldeye.app/api/affiliate/studio/embed/jane42/banner-leaderboard-728x90",
      width: 728,
      height: 90,
      alt: "WorldEye — Banner — Leaderboard 728×90",
    });
    expect(html).toBe(
      '<a href="https://worldeye.app/ref/jane42" target="_blank" rel="noopener sponsored">' +
        '<img src="https://worldeye.app/api/affiliate/studio/embed/jane42/banner-leaderboard-728x90" ' +
        'width="728" height="90" alt="WorldEye — Banner — Leaderboard 728×90" loading="lazy" style="border:0"></a>',
    );
  });

  it("escapes attribute-breaking characters in link and alt", () => {
    const html = embedHtml({
      link: 'https://example.com/?a=1&b="2"',
      imageUrl: "https://worldeye.app/api/x",
      width: 300,
      height: 250,
      alt: 'A "quoted" <title>',
    });
    expect(html).toContain('href="https://example.com/?a=1&amp;b=&quot;2&quot;"');
    expect(html).toContain('alt="A &quot;quoted&quot; &lt;title&gt;"');
    expect(html).not.toContain('b="2"');
  });
});
