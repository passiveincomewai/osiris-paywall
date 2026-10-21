import { describe, expect, it } from "vitest";
import type { BlogPost } from "@/app/blog/posts";
import { POSTS } from "@/app/blog/posts";
import {
  buildNewsSitemap,
  buildRssFeed,
  escapeXml,
  isNewsFresh,
  postToHtml,
} from "./blog-feed";

function makePost(overrides: Partial<BlogPost>): BlogPost {
  return {
    slug: "test-post",
    title: "Test Post",
    seoTitle: "Test Post | WorldEye Blog",
    date: "2026-10-20",
    excerpt: "A test excerpt.",
    seoDescription: "A test description.",
    tags: ["guide"],
    sections: [{ heading: "Intro", body: ["Body text."] }],
    ...overrides,
  };
}

describe("escapeXml", () => {
  it("escapes the five XML entities", () => {
    expect(escapeXml(`a & b <c> "d" 'e'`)).toBe(
      "a &amp; b &lt;c&gt; &quot;d&quot; &apos;e&apos;",
    );
  });
});

describe("buildRssFeed", () => {
  it("includes every post exactly once, newest first", () => {
    const xml = buildRssFeed(POSTS, new Date("2026-10-20T12:00:00Z"));
    const slugs = [...xml.matchAll(/<guid isPermaLink="true">https:\/\/worldeye\.app\/blog\/([^<]+)<\/guid>/g)].map(
      (m) => m[1],
    );
    expect(slugs.length).toBe(POSTS.length);
    expect(new Set(slugs).size).toBe(POSTS.length);
    const dateOf = new Map(POSTS.map((p) => [p.slug, p.date]));
    const seq = slugs.map((s) => dateOf.get(s)!);
    const sorted = [...seq].sort((a, b) => (a < b ? 1 : -1));
    expect(seq).toEqual(sorted);
  });

  it("declares itself with an atom self-link and carries full content", () => {
    const xml = buildRssFeed(POSTS, new Date("2026-10-20T12:00:00Z"));
    expect(xml).toContain('<atom:link href="https://worldeye.app/blog/feed.xml" rel="self"');
    expect(xml).toContain("<content:encoded><![CDATA[");
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  });

  it("escapes special characters in titles", () => {
    const xml = buildRssFeed(
      [makePost({ title: "Fish & Chips <Live>" })],
      new Date("2026-10-20T12:00:00Z"),
    );
    expect(xml).toContain("<title>Fish &amp; Chips &lt;Live&gt;</title>");
    expect(xml).not.toContain("<title>Fish & Chips");
  });
});

describe("postToHtml", () => {
  it("renders sections and absolutizes internal markdown links", () => {
    const html = postToHtml(
      makePost({
        sections: [
          { heading: "H", body: ["See the [live map](/cameras) now."] },
        ],
      }),
    );
    expect(html).toContain("<h2>H</h2>");
    expect(html).toContain('<a href="https://worldeye.app/cameras">live map</a>');
  });
});

describe("news sitemap freshness", () => {
  const now = new Date("2026-10-20T12:00:00Z");

  it("includes a post published yesterday and excludes one from 3 days ago", () => {
    expect(isNewsFresh(makePost({ date: "2026-10-19" }), now)).toBe(true);
    expect(isNewsFresh(makePost({ date: "2026-10-17" }), now)).toBe(false);
  });

  it("excludes future-dated posts", () => {
    expect(isNewsFresh(makePost({ date: "2026-10-21" }), now)).toBe(false);
  });

  it("emits only fresh posts with the news namespace and publication block", () => {
    const xml = buildNewsSitemap(
      [
        makePost({ slug: "fresh", date: "2026-10-20", title: "Fresh & New" }),
        makePost({ slug: "stale", date: "2026-10-10" }),
      ],
      now,
    );
    expect(xml).toContain('xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"');
    expect(xml).toContain("https://worldeye.app/blog/fresh");
    expect(xml).not.toContain("stale");
    expect(xml).toContain("<news:name>WorldEye Blog</news:name>");
    expect(xml).toContain("<news:title>Fresh &amp; New</news:title>");
    expect(xml).toContain("<news:publication_date>2026-10-20T00:00:00+00:00</news:publication_date>");
  });

  it("produces a valid empty urlset when nothing is fresh", () => {
    const xml = buildNewsSitemap([makePost({ date: "2026-01-01" })], now);
    expect(xml).toContain("<urlset");
    expect(xml).not.toContain("<url>");
  });
});
