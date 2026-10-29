import { POSTS } from "../(en)/blog/posts";
import { buildNewsSitemap } from "@/lib/blog-feed";
import { fetchEventNewsEntries } from "@/lib/events/news";
import { getNewsPosts, NEWS_NAME } from "@/lib/news";

// Google News sitemap: WorldEye News stories — blog posts flagged
// `news: true` (src/lib/news) — published in the last 48 hours
// (Google's rule for news sitemaps), plus the same 48-hour window of
// breaking events — significant earthquakes, active storms and
// reported tornadoes (lib/events/news) — so a fresh event page is
// discoverable while it is still news. Evergreen blog posts are NOT
// listed: the news flag is the eligibility line. Registered in
// public/robots.txt so crawlers and Publisher Center can find it.
// Event entries are best-effort: a down source never breaks the
// sitemap.
export const revalidate = 600;

export async function GET() {
  const now = new Date();
  const blogXml = buildNewsSitemap(getNewsPosts(POSTS), now, NEWS_NAME);
  const eventEntries = await fetchEventNewsEntries(now).catch(() => [] as string[]);
  const xml =
    eventEntries.length === 0
      ? blogXml
      : blogXml.replace(
          "</urlset>",
          `${eventEntries.join("\n")}\n</urlset>`,
        );
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=600",
    },
  });
}
