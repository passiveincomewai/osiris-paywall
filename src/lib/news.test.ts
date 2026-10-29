import { describe, expect, it } from "vitest";
import type { BlogPost } from "@/app/(en)/blog/posts";
import { POSTS, getPost } from "@/app/(en)/blog/posts";
import { buildNewsSitemap } from "./blog-feed";
import {
  buildNewsArticleLd,
  buildNewsRssFeed,
  getFreshNewsPosts,
  getNewsPosts,
  isNewsPost,
  NEWS_AUTHOR,
  NEWS_NAME,
  SWG_BASIC_INIT,
  SWG_BASIC_SRC,
  SWG_PRODUCT_ID,
} from "./news";

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

const LAUNCH_SLUG = "ski-season-opening-dates-2026-27";

describe("the launch story (real data, real dates)", () => {
  const launch = getPost(LAUNCH_SLUG);

  it("is the current ski-opening blog post, flagged as news", () => {
    expect(launch).toBeDefined();
    expect(launch!.news).toBe(true);
    // The real publication date — pinned so it can never be silently
    // re-dated to force the story into the 48-hour news window.
    expect(launch!.date).toBe("2026-10-20");
  });

  it("carries cited sources with real URLs", () => {
    expect(launch!.sources?.length).toBeGreaterThan(0);
    for (const s of launch!.sources!) {
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.url).toMatch(/^https:\/\//);
    }
  });

  it("is OUTSIDE the 48-hour news window at ship time (2026-10-29)", () => {
    const shipNow = new Date("2026-10-29T01:15:00Z");
    expect(getFreshNewsPosts(POSTS, shipNow).map((p) => p.slug)).not.toContain(
      LAUNCH_SLUG,
    );
    // And the sitemap built from flagged posts is empty of blog
    // entries at ship time — spec-correct, not a bug.
    const xml = buildNewsSitemap(getNewsPosts(POSTS), shipNow, NEWS_NAME);
    expect(xml).not.toContain(LAUNCH_SLUG);
    expect(xml).not.toContain("<url>");
  });

  it("was inside the window during its real first 48 hours", () => {
    const then = new Date("2026-10-21T12:00:00Z");
    expect(getFreshNewsPosts(POSTS, then).map((p) => p.slug)).toContain(
      LAUNCH_SLUG,
    );
    const xml = buildNewsSitemap(getNewsPosts(POSTS), then, NEWS_NAME);
    expect(xml).toContain(`<loc>https://worldeye.app/blog/${LAUNCH_SLUG}</loc>`);
    expect(xml).toContain(`<news:name>${NEWS_NAME}</news:name>`);
    expect(xml).toContain(
      "<news:publication_date>2026-10-20T00:00:00+00:00</news:publication_date>",
    );
  });

  it("is the only flagged post, and every flagged post has sources", () => {
    const flagged = POSTS.filter(isNewsPost);
    expect(flagged.map((p) => p.slug)).toEqual([LAUNCH_SLUG]);
    for (const p of flagged) {
      expect(p.sources?.length).toBeGreaterThan(0);
    }
  });
});

describe("the 48-hour window (boundary fixtures)", () => {
  const fresh = makePost({ slug: "fresh", date: "2026-10-27", news: true });

  it("includes a post at exactly 48 hours old", () => {
    const now = new Date("2026-10-29T00:00:00Z");
    expect(getFreshNewsPosts([fresh], now).map((p) => p.slug)).toEqual([
      "fresh",
    ]);
  });

  it("excludes the same post one millisecond past 48 hours", () => {
    const now = new Date("2026-10-29T00:00:00.001Z");
    expect(getFreshNewsPosts([fresh], now)).toEqual([]);
  });

  it("excludes future-dated posts", () => {
    const future = makePost({ slug: "future", date: "2026-10-30", news: true });
    const now = new Date("2026-10-29T00:00:00Z");
    expect(getFreshNewsPosts([future], now)).toEqual([]);
  });

  it("never includes unflagged posts, however fresh", () => {
    const evergreen = makePost({ slug: "evergreen", date: "2026-10-28" });
    const now = new Date("2026-10-28T12:00:00Z");
    expect(getFreshNewsPosts([evergreen], now)).toEqual([]);
    const xml = buildNewsSitemap(getNewsPosts([evergreen]), now, NEWS_NAME);
    expect(xml).not.toContain("evergreen");
  });
});

describe("getNewsPosts", () => {
  it("returns flagged posts newest first", () => {
    const older = makePost({ slug: "older", date: "2026-10-10", news: true });
    const newer = makePost({ slug: "newer", date: "2026-10-25", news: true });
    const plain = makePost({ slug: "plain", date: "2026-10-26" });
    expect(getNewsPosts([older, plain, newer]).map((p) => p.slug)).toEqual([
      "newer",
      "older",
    ]);
  });
});

describe("buildNewsArticleLd", () => {
  it("emits NewsArticle with the real-person byline on the blog URL", () => {
    const post = makePost({
      slug: "story",
      title: "A Story",
      date: "2026-10-20",
      updated: "2026-10-22",
      news: true,
    });
    const ld = buildNewsArticleLd(post) as any;
    expect(ld["@type"]).toBe("NewsArticle");
    expect(ld.headline).toBe("A Story");
    expect(ld.datePublished).toBe("2026-10-20");
    expect(ld.dateModified).toBe("2026-10-22");
    expect(ld.author).toEqual({
      "@type": "Person",
      name: "Jameson Lythgoe",
      url: "https://worldeye.app/news/authors/jameson-lythgoe",
    });
    expect(ld.publisher["@type"]).toBe("Organization");
    expect(ld.publisher.name).toBe("WorldEye");
    expect(ld.publisher.logo.url).toBe("https://worldeye.app/worldeye-logo.png");
    expect(ld.mainEntityOfPage["@id"]).toBe("https://worldeye.app/blog/story");
    expect(ld.url).toBe("https://worldeye.app/blog/story");
    expect(ld.isPartOf.url).toBe("https://worldeye.app/news");
    expect(ld.image).toBe("https://worldeye.app/og-image.png");
  });

  it("falls back to the publication date when a story was never updated", () => {
    const ld = buildNewsArticleLd(makePost({ date: "2026-10-20" })) as any;
    expect(ld.dateModified).toBe("2026-10-20");
  });
});

describe("the author record", () => {
  it("is exactly the site's real publisher", () => {
    expect(NEWS_AUTHOR.name).toBe("Jameson Lythgoe");
    expect(NEWS_AUTHOR.slug).toBe("jameson-lythgoe");
    expect(NEWS_AUTHOR.url).toBe(
      "https://worldeye.app/news/authors/jameson-lythgoe",
    );
  });
});

describe("Subscribe with Google (SWG Basic)", () => {
  // Google's snippet, supplied by the publisher for the verified
  // Publisher Center publication "WorldEye News" (CAow877NDA). Pin
  // every load-bearing value so the integration can never drift.
  it("points at Google's SWG Basic loader", () => {
    expect(SWG_BASIC_SRC).toBe("https://news.google.com/swg/js/v1/swg-basic.js");
  });

  it("carries the verified publication's open-access product ID", () => {
    expect(SWG_PRODUCT_ID).toBe("CAow877NDA:openaccess");
  });

  it("inits with the exact NewsArticle / Product config from the snippet", () => {
    expect(SWG_BASIC_INIT).toContain(
      "(self.SWG_BASIC = self.SWG_BASIC || []).push(",
    );
    expect(SWG_BASIC_INIT).toContain('type: "NewsArticle"');
    expect(SWG_BASIC_INIT).toContain('isPartOfType: ["Product"]');
    expect(SWG_BASIC_INIT).toContain(
      'isPartOfProductId: "CAow877NDA:openaccess"',
    );
    expect(SWG_BASIC_INIT).toContain(
      'clientOptions: { theme: "light", lang: "en" }',
    );
  });
});

describe("buildNewsRssFeed", () => {
  it("carries flagged posts only, linking to their blog URLs", () => {
    const story = makePost({ slug: "story", date: "2026-10-20", news: true });
    const plain = makePost({ slug: "plain", date: "2026-10-21" });
    const xml = buildNewsRssFeed([story, plain], new Date("2026-10-29T00:00:00Z"));
    expect(xml).toContain(`<title>${NEWS_NAME}</title>`);
    expect(xml).toContain(
      '<atom:link href="https://worldeye.app/news/feed.xml" rel="self"',
    );
    expect(xml).toContain(
      '<guid isPermaLink="true">https://worldeye.app/blog/story</guid>',
    );
    expect(xml).toContain("<dc:creator>Jameson Lythgoe</dc:creator>");
    expect(xml).not.toContain("blog/plain");
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  });

  it("includes the launch story regardless of the 48-hour window", () => {
    const xml = buildNewsRssFeed(POSTS, new Date("2026-10-29T01:15:00Z"));
    expect(xml).toContain(`https://worldeye.app/blog/${LAUNCH_SLUG}`);
  });
});
