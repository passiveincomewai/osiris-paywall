import { POSTS } from "./blog/posts";
import { buildNewsSitemap } from "@/lib/blog-feed";

// Google News sitemap: lists only posts published in the last 48 hours
// (Google's rule for news sitemaps). Registered in robots.ts so crawlers
// and Publisher Center can find it. When nothing is fresh it correctly
// renders an empty urlset — new posts flow in automatically on publish.
export const revalidate = 3600;

export function GET() {
  return new Response(buildNewsSitemap(POSTS, new Date()), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
