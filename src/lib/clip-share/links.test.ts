import { describe, it, expect } from "vitest";
import { watchUrl, watchPath, platformShareLinks } from "./links";

describe("watchUrl", () => {
  it("builds on the canonical app base", () => {
    expect(watchPath("abc123")).toBe("/watch/abc123");
    expect(watchUrl("abc123", { NEXT_PUBLIC_APP_URL: "https://worldeye.app/" })).toBe(
      "https://worldeye.app/watch/abc123",
    );
  });
});

describe("platformShareLinks", () => {
  const url = "https://worldeye.app/watch/abc123";
  const links = platformShareLinks(url, 'Storm over "the bay" & more');

  it("every intent points at the watch URL, encoded", () => {
    const enc = encodeURIComponent(url);
    expect(links.x).toContain(`url=${enc}`);
    expect(links.facebook).toContain(`u=${enc}`);
    expect(links.whatsapp).toContain(enc);
    expect(links.telegram).toContain(`url=${enc}`);
    expect(links.reddit).toContain(`url=${enc}`);
    expect(links.email.startsWith("mailto:?subject=")).toBe(true);
    expect(links.email).toContain(enc);
  });

  it("encodes the title so quotes/ampersands can't break the intent", () => {
    expect(links.x).toContain(encodeURIComponent('Storm over "the bay" & more'));
    expect(links.x).not.toContain('"the bay"');
  });
});
