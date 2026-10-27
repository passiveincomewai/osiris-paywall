import { POSTS } from "../posts";
import { buildRssFeed } from "@/lib/blog-feed";

// RSS 2.0 feed for the WorldEye blog. Declared in the blog pages' metadata
// (rel=alternate) and consumed by Google Publisher Center as the blog's
// full-text section feed.
export const revalidate = 3600;

export function GET() {
  return new Response(buildRssFeed(POSTS, new Date()), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
