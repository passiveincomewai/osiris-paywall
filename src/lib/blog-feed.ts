// RSS 2.0 feed + Google News sitemap builders for the WorldEye blog.
//
// Both are pure functions of the post list and a clock reading, so they can
// be unit-tested without Next request machinery. The route handlers in
// src/app/blog/feed.xml/route.ts and src/app/news-sitemap.xml/route.ts are
// thin wrappers around these builders.
//
// News sitemap rule (Google): only articles published in the last 48 hours
// belong in a news sitemap. Older posts stay in the regular sitemap + RSS.

import type { BlogPost } from "@/app/(en)/blog/posts";

export const BASE = "https://worldeye.app";
export const BLOG_NAME = "WorldEye Blog";
export const BLOG_DESCRIPTION =
  "Guides and explainers from the WorldEye team: OSINT basics, live flight tracking, the public camera network, and how to read the world in real time.";

const NEWS_WINDOW_MS = 48 * 60 * 60 * 1000;

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// CDATA payloads must not contain the terminator; split it defensively.
function cdata(text: string): string {
  return `<![CDATA[${text.replace(/]]>/g, "]]&gt;")}]]>`;
}

// ISO date (YYYY-MM-DD) -> RFC 822 (RSS) at UTC midnight.
export function toRfc822(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1)).toUTCString();
}

export function toRfc822DateTime(date: Date): string {
  return date.toUTCString();
}

// ISO date -> ISO 8601 datetime at UTC midnight (news sitemap format).
export function toIsoDateTime(isoDate: string): string {
  return `${isoDate}T00:00:00+00:00`;
}

// Post body sections -> simple article HTML for <content:encoded>.
// Converts the blog's [text](/path) markdown links to absolute anchors.
export function postToHtml(post: BlogPost): string {
  const renderInline = (text: string): string =>
    escapeXml(text).replace(
      /\[([^\]]+)\]\((\/[^)\s]+)\)/g,
      (_m, label: string, path: string) =>
        `<a href="${BASE}${path}">${label}</a>`,
    );

  const parts: string[] = [];
  for (const section of post.sections) {
    if (section.heading) parts.push(`<h2>${escapeXml(section.heading)}</h2>`);
    for (const para of section.body) parts.push(`<p>${renderInline(para)}</p>`);
  }
  if (post.faqs && post.faqs.length > 0) {
    parts.push("<h2>Frequently asked questions</h2>");
    for (const f of post.faqs) {
      parts.push(`<h3>${escapeXml(f.q)}</h3>`);
      parts.push(`<p>${renderInline(f.a)}</p>`);
    }
  }
  return parts.join("\n");
}

// Publication instant used for the news-sitemap window: the post's date at
// UTC midnight. An `updated` date does NOT extend the news window — Google
// News keys on the original publication date.
function publishedAt(post: BlogPost): number {
  const [y, m, d] = post.date.split("-").map(Number);
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1);
}

export function isNewsFresh(post: BlogPost, now: Date): boolean {
  const t = publishedAt(post);
  const nowMs = now.getTime();
  return t <= nowMs && nowMs - t <= NEWS_WINDOW_MS;
}

function byDateDesc(a: BlogPost, b: BlogPost): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.slug < b.slug ? -1 : 1;
}

export function buildRssFeed(posts: BlogPost[], now: Date): string {
  const items = [...posts].sort(byDateDesc).map((post) => {
    const url = `${BASE}/blog/${post.slug}`;
    const categories = post.tags
      .map((t) => `      <category>${escapeXml(t)}</category>`)
      .join("\n");
    return [
      "    <item>",
      `      <title>${escapeXml(post.title)}</title>`,
      `      <link>${url}</link>`,
      `      <guid isPermaLink="true">${url}</guid>`,
      `      <pubDate>${toRfc822(post.date)}</pubDate>`,
      `      <description>${escapeXml(post.excerpt)}</description>`,
      categories,
      `      <content:encoded>${cdata(postToHtml(post))}</content:encoded>`,
      "    </item>",
    ].join("\n");
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">',
    "  <channel>",
    `    <title>${BLOG_NAME}</title>`,
    `    <link>${BASE}/blog</link>`,
    `    <description>${escapeXml(BLOG_DESCRIPTION)}</description>`,
    "    <language>en</language>",
    `    <lastBuildDate>${toRfc822DateTime(now)}</lastBuildDate>`,
    `    <atom:link href="${BASE}/blog/feed.xml" rel="self" type="application/rss+xml" />`,
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}

export function buildNewsSitemap(
  posts: BlogPost[],
  now: Date,
  publicationName: string = BLOG_NAME,
): string {
  const fresh = posts.filter((p) => isNewsFresh(p, now)).sort(byDateDesc);
  const urls = fresh.map((post) =>
    [
      "  <url>",
      `    <loc>${BASE}/blog/${post.slug}</loc>`,
      "    <news:news>",
      "      <news:publication>",
      `        <news:name>${publicationName}</news:name>`,
      "        <news:language>en</news:language>",
      "      </news:publication>",
      `      <news:publication_date>${toIsoDateTime(post.date)}</news:publication_date>`,
      `      <news:title>${escapeXml(post.title)}</news:title>`,
      "    </news:news>",
      "  </url>",
    ].join("\n"),
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}
