import { describe, it, expect } from "vitest";
import { PUBLISH_PLATFORMS, preparePostText, publishSpec } from "./publish";
import { publishApiStatus, anyApiPublishingConfigured } from "./publish-api";

describe("preparePostText", () => {
  const tracked = "https://worldeye.app/ref/ABC?t=x&utm_content=v_1";
  it("caption-link platforms keep the tracked URL and add #ad + hashtags", () => {
    const out = preparePostText({
      hookText: "Watch this.",
      storedText: "Watch this.\n\nhttps://worldeye.app/ref/ABC?t=x&utm_content=v_1",
      trackedUrl: tracked,
      aspect: "9:16",
      spec: publishSpec("youtube"),
    });
    expect(out.caption).toContain("utm_content=v_1");
    expect(out.caption).toContain("#ad");
    expect(out.firstComment).toBeNull();
    expect(out.aspectMatches).toBe(true);
  });
  it("bio-link platforms strip the URL from the caption and point to the bio", () => {
    const out = preparePostText({
      hookText: "Watch this.",
      storedText: "Watch this.\n\nhttps://worldeye.app/ref/ABC?t=x&utm_content=v_1\n\n#ad",
      trackedUrl: tracked,
      aspect: "16:9",
      spec: publishSpec("tiktok"),
    });
    expect(out.caption).not.toContain("utm_content");
    expect(out.caption).toContain("Link in bio");
    expect(out.aspectMatches).toBe(false);
    expect(out.aspectNote).toContain("9:16");
  });
  it("every platform spec has a real open URL and a disclosure label", () => {
    for (const p of PUBLISH_PLATFORMS) {
      expect(p.openUrl.startsWith("https://")).toBe(true);
      expect(p.disclosureLabel.length).toBeGreaterThan(10);
    }
  });
});

describe("publishApiStatus", () => {
  it("reports nothing configured without env, and flips per-platform when set", () => {
    expect(anyApiPublishingConfigured({})).toBe(false);
    const partial = publishApiStatus({ YOUTUBE_CLIENT_ID: "x" });
    expect(partial.find((p) => p.id === "youtube")?.configured).toBe(false);
    const full = publishApiStatus({
      YOUTUBE_CLIENT_ID: "x",
      YOUTUBE_CLIENT_SECRET: "y",
      YOUTUBE_REDIRECT_URI: "https://worldeye.app/cb",
    });
    expect(full.find((p) => p.id === "youtube")?.configured).toBe(true);
    expect(full.find((p) => p.id === "meta")?.configured).toBe(false);
  });
});
