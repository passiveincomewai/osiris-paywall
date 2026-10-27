import { buildImageSitemap } from "@/lib/image-sitemap";

// Image sitemap (SEO item 6, 2026-10-26): the self-hosted, crawlable
// images the site's pages actually present — OG/hero images and
// editorial art — in Google's image sitemap format. The data and its
// discipline live in lib/image-sitemap.ts (pinned by its test: every
// image exists under public/, every page is in the main sitemap).
// Registered in public/robots.txt next to sitemap.xml and
// news-sitemap.xml. Content is static between deploys, so cache it
// like the news sitemap.
export const revalidate = 3600;

export function GET() {
  return new Response(buildImageSitemap(), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
