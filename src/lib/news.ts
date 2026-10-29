// WorldEye News — the eligibility layer over the blog system.
//
// A blog post flagged `news: true` in src/app/(en)/blog/posts.ts is a
// WorldEye News story. Flagged posts keep their canonical blog URL and
// their real publication dates; this module supplies everything the
// news surfaces add on top: the publication identity, the one real
// author, NewsArticle JSON-LD, the /news index data and the news RSS
// feed. The Google News sitemap itself lives in src/lib/blog-feed.ts
// (buildNewsSitemap) and is fed only flagged posts by its route.
//
// Nothing here invents people or dates: the author below is the site's
// actual publisher, and every date comes from the post itself.

import type { BlogPost } from "@/app/(en)/blog/posts";
import {
  BASE,
  escapeXml,
  isNewsFresh,
  postToHtml,
  toRfc822,
  toRfc822DateTime,
} from "@/lib/blog-feed";

export const NEWS_NAME = "WorldEye News";
export const NEWS_DESCRIPTION =
  "Original reporting from WorldEye: the public camera network, weather events, satellite and geospatial technology, transportation and the tools that watch the world in real time.";
export const NEWS_URL = `${BASE}/news`;
export const NEWS_FEED_URL = `${BASE}/news/feed.xml`;

/**
 * Google News "Subscribe with Google" (SWG Basic). The product ID is
 * the verified Publisher Center publication "WorldEye News"
 * (CAow877NDA) with open access. The snippet ships on news-flagged
 * ARTICLE pages only (rendered by components/SwgBasic from the blog
 * article template, gated on the same `news` flag as the NewsArticle
 * JSON-LD) — Google's integration is per-article, and unflagged posts
 * and non-article pages must not load it. The init body below is
 * Google's snippet verbatim; do not alter the type, product ID or
 * client options.
 */
export const SWG_BASIC_SRC = "https://news.google.com/swg/js/v1/swg-basic.js";
export const SWG_PRODUCT_ID = "CAow877NDA:openaccess";
export const SWG_BASIC_INIT = `(self.SWG_BASIC = self.SWG_BASIC || []).push( basicSubscriptions => {
    basicSubscriptions.init({
      type: "NewsArticle",
      isPartOfType: ["Product"],
      isPartOfProductId: "${SWG_PRODUCT_ID}",
      clientOptions: { theme: "light", lang: "en" },
    });
  });`;

export type NewsAuthor = {
  slug: string;
  name: string;
  role: string;
  url: string;
  bio: string;
};

/**
 * The only byline WorldEye News carries: the site's founder and
 * publisher. Do not add further authors here unless a real person
 * joins the publication — invented staff would be fabrication.
 */
export const NEWS_AUTHOR: NewsAuthor = {
  slug: "jameson-lythgoe",
  name: "Jameson Lythgoe",
  role: "Founder & Publisher",
  url: `${BASE}/news/authors/jameson-lythgoe`,
  bio: "Jameson Lythgoe is the founder and publisher of WorldEye, the live public-camera globe at worldeye.app. He writes and publishes WorldEye News, the site's original reporting on its public camera network, weather events and geospatial technology. Stories under his byline are reported from WorldEye's own network data and the cited primary sources listed on each story.",
};

export function isNewsPost(post: BlogPost): boolean {
  return post.news === true;
}

/** All news-flagged posts, newest first (slug breaks date ties). */
export function getNewsPosts(posts: BlogPost[]): BlogPost[] {
  return posts.filter(isNewsPost).sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.slug < b.slug ? -1 : 1;
  });
}

/**
 * Flagged posts inside the Google News 48-hour window, judged on each
 * post's REAL publication date (src/lib/blog-feed.ts isNewsFresh).
 * A post older than 48 hours is correctly absent — never re-date a
 * post to force it into the window.
 */
export function getFreshNewsPosts(posts: BlogPost[], now: Date): BlogPost[] {
  return getNewsPosts(posts).filter((p) => isNewsFresh(p, now));
}

/** NewsArticle JSON-LD for a flagged post, on its canonical blog URL. */
export function buildNewsArticleLd(post: BlogPost) {
  const url = `${BASE}/blog/${post.slug}`;
  return {
    "@type": "NewsArticle",
    headline: post.title,
    description: post.seoDescription,
    datePublished: post.date,
    dateModified: post.updated ?? post.date,
    image: `${BASE}${post.image ?? "/og-image.png"}`,
    author: {
      "@type": "Person",
      name: NEWS_AUTHOR.name,
      url: NEWS_AUTHOR.url,
    },
    publisher: {
      "@type": "Organization",
      name: "WorldEye",
      url: BASE,
      logo: {
        "@type": "ImageObject",
        url: `${BASE}/worldeye-logo.png`,
        width: 600,
        height: 570,
      },
    },
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    isPartOf: {
      "@type": "CollectionPage",
      name: NEWS_NAME,
      url: NEWS_URL,
    },
    keywords: post.tags.join(", "),
  };
}

function cdata(text: string): string {
  return `<![CDATA[${text.replace(/]]>/g, "]]&gt;")}]]>`;
}

/**
 * RSS 2.0 for the news section. Items are the flagged posts, newest
 * first, each linking to its canonical blog URL. Unlike the news
 * sitemap there is no 48-hour window here — a feed carries the
 * section's stories, not just its freshest two days.
 */
export function buildNewsRssFeed(posts: BlogPost[], now: Date): string {
  const items = getNewsPosts(posts).map((post) => {
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
      `      <dc:creator>${escapeXml(NEWS_AUTHOR.name)}</dc:creator>`,
      `      <description>${escapeXml(post.excerpt)}</description>`,
      categories,
      `      <content:encoded>${cdata(postToHtml(post))}</content:encoded>`,
      "    </item>",
    ].join("\n");
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    "  <channel>",
    `    <title>${NEWS_NAME}</title>`,
    `    <link>${NEWS_URL}</link>`,
    `    <description>${escapeXml(NEWS_DESCRIPTION)}</description>`,
    "    <language>en</language>",
    `    <lastBuildDate>${toRfc822DateTime(now)}</lastBuildDate>`,
    `    <atom:link href="${NEWS_FEED_URL}" rel="self" type="application/rss+xml" />`,
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}
