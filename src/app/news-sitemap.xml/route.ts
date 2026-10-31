import { POSTS } from "../(en)/blog/posts";
import { buildNewsSitemap } from "@/lib/blog-feed";
import { getNewsPosts, NEWS_NAME } from "@/lib/news";

// Google News sitemap: WorldEye News stories ONLY — blog posts flagged
// `news: true` (src/lib/news) — published in the last 48 hours
// (Google's rule for news sitemaps; the window is applied inside
// buildNewsSitemap). The publication name is the registered
// "WorldEye News" (NEWS_NAME). Auto-generated tracker/event pages are
// NOT news stories and never belong in this sitemap (site audit
// 2026-10-29, row R1): the sitemap is fed from the news-flagged post
// collection only. Registered in public/robots.txt so crawlers and
// Publisher Center can find it.
export const revalidate = 600;

export async function GET() {
  const xml = buildNewsSitemap(getNewsPosts(POSTS), new Date(), NEWS_NAME);
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=600",
    },
  });
}
