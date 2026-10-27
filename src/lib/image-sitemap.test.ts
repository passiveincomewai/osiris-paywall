import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { buildImageSitemap, IMAGE_SITEMAP_ENTRIES } from "./image-sitemap";

/**
 * Image sitemap pins (SEO item 6): the file may only list images that
 * really exist under public/ (so every <image:loc> returns 200) on
 * pages that really exist (every <loc> is in the main sitemap).
 */
describe("image sitemap", () => {
  it("every listed image exists under public/", () => {
    for (const entry of IMAGE_SITEMAP_ENTRIES) {
      for (const img of entry.images) {
        expect(img.path.startsWith("/"), img.path).toBe(true);
        expect(
          existsSync(path.join(process.cwd(), "public", img.path)),
          `${img.path} (for ${entry.page})`,
        ).toBe(true);
      }
    }
  });

  it("every listed page is in the main sitemap", async () => {
    const mainUrls = new Set((await sitemap()).map((e) => e.url));
    for (const entry of IMAGE_SITEMAP_ENTRIES) {
      expect(
        mainUrls.has(`https://worldeye.app${entry.page}`),
        entry.page,
      ).toBe(true);
    }
  });

  it("renders a well-formed image sitemap document", () => {
    const xml = buildImageSitemap();
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"');
    expect(xml).toContain("<loc>https://worldeye.app/</loc>");
    expect(xml).toContain(
      "<image:loc>https://worldeye.app/og-image.png</image:loc>",
    );
    // One <url> per entry, one <image:image> per image.
    expect(xml.match(/<url>/g)).toHaveLength(IMAGE_SITEMAP_ENTRIES.length);
    const imageCount = IMAGE_SITEMAP_ENTRIES.reduce(
      (n, e) => n + e.images.length,
      0,
    );
    expect(xml.match(/<image:image>/g)).toHaveLength(imageCount);
    expect(xml.trimEnd().endsWith("</urlset>")).toBe(true);
  });
});
