import { POSTS } from "../../blog/posts";
import { buildNewsRssFeed } from "@/lib/news";

// RSS 2.0 feed for WorldEye News: the news-flagged blog posts, each
// item linking to its canonical blog URL. Declared in the news
// pages' metadata (rel=alternate). Thin wrapper over the pure
// builder in lib/news so the feed shape is unit-tested.
export const revalidate = 3600;

export function GET() {
  return new Response(buildNewsRssFeed(POSTS, new Date()), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
