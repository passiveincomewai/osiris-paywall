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
    // And the news sitemap built from flagged posts at that instant
    // carries only the Oct 29 event stories — the launch story has aged
    // out of the window, which is spec-correct, not a bug.
    const xml = buildNewsSitemap(getNewsPosts(POSTS), shipNow, NEWS_NAME);
    expect(xml).not.toContain(LAUNCH_SLUG);
    expect(xml).toContain(
      "<loc>https://worldeye.app/blog/halloween-aurora-g1-storm-watch</loc>",
    );
    expect(xml).toContain(
      "<loc>https://worldeye.app/blog/spacex-starlink-launch-vandenberg-october-30</loc>",
    );
    expect(xml).toContain(
      "<loc>https://worldeye.app/blog/colorado-ski-season-opens-keystone-arapahoe-basin</loc>",
    );
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

  it("is one of the flagged posts, and every flagged post has sources", () => {
    const flagged = POSTS.filter(isNewsPost);
    expect(flagged.map((p) => p.slug)).toEqual([
      "spacex-ussf-627-launch-moves-november-10",
      "typhoon-cempaka-becomes-samuel-brief-par-entry",
      "northern-taurid-fireballs-peak-november-11-12",
      "magnitude-6-4-earthquake-lata-solomon-islands-november-9",
      "spacex-ussf-627-launch-vandenberg-november-9",
      "copper-mountain-opening-day-november-8-2026",
      "magnitude-5-7-earthquake-shizuoka-japan-november-8",
      "starship-flight-15-plan-november-13-double-catch",
      "typhoon-cempaka-intensifies-november-8-2026",
      "spacex-ussf-432-launches-vandenberg-november-6",
      "semeru-eruption-pyroclastic-flow-november-7-2026",
      "loveland-opening-day-november-7-2026",
      "kilauea-episode-56-erupts-660-foot-fountains",
      "magnitude-6-1-earthquake-offshore-hasaki-japan",
      "mt-rose-opening-day-november-6-2026-tahoe-first",
      "iss-spacewalk-101-final-solar-array-november-5",
      "mccaysville-copperhill-record-flood-emergency-november-5",
      "noaa-g1-storm-watch-november-6-7-aurora",
      "mammoth-mountain-opens-early-november-5-2026",
      "mayon-ash-plume-november-4-strombolian-activity",
      "spacex-ussf-432-launch-moves-november-6",
      "kilauea-episode-56-precursory-lava-alert-watch",
      "cyclone-murasu-crosses-ongole-landfall-complete",
      "four-corners-record-flooding-arizona-emergency-november-3",
      "cyclone-murasu-severe-landfall-andhra-pradesh",
      "spacex-ussf-432-launch-november-3-vandenberg",
      "southern-taurid-fireballs-peak-november-4-5",
      "lake-louise-opening-day-november-1-2026",
      "mayon-alert-level-3-eruption-evacuation",
      "cyclone-murasu-forms-andhra-pradesh-landfall",
      "wolf-creek-opening-day-halloween-2026",
      "kilauea-episode-56-window-november-2-9",
      "falcon-9-700th-launch-starlink-15-18",
      "iss-spacewalk-100-seventh-solar-array",
      "super-typhoon-in-fa-northern-mariana-islands",
      "halloween-aurora-g1-storm-watch",
      "spacex-starlink-launch-vandenberg-october-30",
      "colorado-ski-season-opens-keystone-arapahoe-basin",
      LAUNCH_SLUG,
    ]);
    for (const p of flagged) {
      expect(p.sources?.length).toBeGreaterThan(0);
    }
  });

  it("the Nov 4 event stories are inside the 48-hour window on their publication day", () => {
    const pubDay = new Date("2026-11-04T15:00:00Z");
    const fresh = getFreshNewsPosts(POSTS, pubDay).map((p) => p.slug);
    expect(fresh).toContain("mammoth-mountain-opens-early-november-5-2026");
    expect(fresh).toContain("mayon-ash-plume-november-4-strombolian-activity");
    expect(fresh).toContain("spacex-ussf-432-launch-moves-november-6");
    expect(fresh).not.toContain(LAUNCH_SLUG);
  });

  it("the Nov 10 event stories are inside the 48-hour window on their publication day", () => {
    const pubDay = new Date("2026-11-10T15:00:00Z");
    const fresh = getFreshNewsPosts(POSTS, pubDay).map((p) => p.slug);
    expect(fresh).toContain("spacex-ussf-627-launch-moves-november-10");
    expect(fresh).toContain("typhoon-cempaka-becomes-samuel-brief-par-entry");
    expect(fresh).toContain("northern-taurid-fireballs-peak-november-11-12");
    expect(fresh).not.toContain(LAUNCH_SLUG);
  });

  it("the Nov 9 event stories are inside the 48-hour window on their publication day", () => {
    const pubDay = new Date("2026-11-09T15:00:00Z");
    const fresh = getFreshNewsPosts(POSTS, pubDay).map((p) => p.slug);
    expect(fresh).toContain("magnitude-6-4-earthquake-lata-solomon-islands-november-9");
    expect(fresh).toContain("spacex-ussf-627-launch-vandenberg-november-9");
    expect(fresh).toContain("copper-mountain-opening-day-november-8-2026");
    expect(fresh).not.toContain(LAUNCH_SLUG);
  });

  it("the Nov 8 event stories are inside the 48-hour window on their publication day", () => {
    const pubDay = new Date("2026-11-08T15:00:00Z");
    const fresh = getFreshNewsPosts(POSTS, pubDay).map((p) => p.slug);
    expect(fresh).toContain("magnitude-5-7-earthquake-shizuoka-japan-november-8");
    expect(fresh).toContain("starship-flight-15-plan-november-13-double-catch");
    expect(fresh).toContain("typhoon-cempaka-intensifies-november-8-2026");
    expect(fresh).not.toContain(LAUNCH_SLUG);
  });

  it("the Nov 7 event stories are inside the 48-hour window on their publication day", () => {
    const pubDay = new Date("2026-11-07T15:00:00Z");
    const fresh = getFreshNewsPosts(POSTS, pubDay).map((p) => p.slug);
    expect(fresh).toContain("spacex-ussf-432-launches-vandenberg-november-6");
    expect(fresh).toContain("semeru-eruption-pyroclastic-flow-november-7-2026");
    expect(fresh).toContain("loveland-opening-day-november-7-2026");
    expect(fresh).not.toContain(LAUNCH_SLUG);
  });

  it("the Nov 6 event stories are inside the 48-hour window on their publication day", () => {
    const pubDay = new Date("2026-11-06T15:00:00Z");
    const fresh = getFreshNewsPosts(POSTS, pubDay).map((p) => p.slug);
    expect(fresh).toContain("kilauea-episode-56-erupts-660-foot-fountains");
    expect(fresh).toContain("magnitude-6-1-earthquake-offshore-hasaki-japan");
    expect(fresh).toContain("mt-rose-opening-day-november-6-2026-tahoe-first");
    expect(fresh).not.toContain(LAUNCH_SLUG);
  });

  it("the Nov 5 event stories are inside the 48-hour window on their publication day", () => {
    const pubDay = new Date("2026-11-05T15:00:00Z");
    const fresh = getFreshNewsPosts(POSTS, pubDay).map((p) => p.slug);
    expect(fresh).toContain("iss-spacewalk-101-final-solar-array-november-5");
    expect(fresh).toContain("mccaysville-copperhill-record-flood-emergency-november-5");
    expect(fresh).toContain("noaa-g1-storm-watch-november-6-7-aurora");
    expect(fresh).not.toContain(LAUNCH_SLUG);
  });

  it("the Nov 3 event stories are inside the 48-hour window on their publication day", () => {
    const pubDay = new Date("2026-11-03T15:00:00Z");
    const fresh = getFreshNewsPosts(POSTS, pubDay).map((p) => p.slug);
    expect(fresh).toContain("kilauea-episode-56-precursory-lava-alert-watch");
    expect(fresh).toContain("cyclone-murasu-crosses-ongole-landfall-complete");
    expect(fresh).toContain(
      "four-corners-record-flooding-arizona-emergency-november-3",
    );
    expect(fresh).not.toContain(LAUNCH_SLUG);
  });

  it("the Nov 2 event stories are inside the 48-hour window on their publication day", () => {
    const pubDay = new Date("2026-11-02T15:00:00Z");
    const fresh = getFreshNewsPosts(POSTS, pubDay).map((p) => p.slug);
    expect(fresh).toContain("cyclone-murasu-severe-landfall-andhra-pradesh");
    expect(fresh).toContain("spacex-ussf-432-launch-november-3-vandenberg");
    expect(fresh).toContain("southern-taurid-fireballs-peak-november-4-5");
    expect(fresh).not.toContain(LAUNCH_SLUG);
  });

  it("the Nov 1 event stories are inside the 48-hour window on their publication day", () => {
    const pubDay = new Date("2026-11-01T15:00:00Z");
    const fresh = getFreshNewsPosts(POSTS, pubDay).map((p) => p.slug);
    expect(fresh).toContain("lake-louise-opening-day-november-1-2026");
    expect(fresh).toContain("mayon-alert-level-3-eruption-evacuation");
    expect(fresh).toContain("cyclone-murasu-forms-andhra-pradesh-landfall");
    expect(fresh).not.toContain(LAUNCH_SLUG);
  });

  it("the Oct 31 event stories are inside the 48-hour window on their publication day", () => {
    const pubDay = new Date("2026-10-31T15:00:00Z");
    const fresh = getFreshNewsPosts(POSTS, pubDay).map((p) => p.slug);
    expect(fresh).toContain("wolf-creek-opening-day-halloween-2026");
    expect(fresh).toContain("kilauea-episode-56-window-november-2-9");
    expect(fresh).toContain("falcon-9-700th-launch-starlink-15-18");
    expect(fresh).not.toContain(LAUNCH_SLUG);
  });

  it("the Oct 30 event stories are inside the 48-hour window on their publication day", () => {
    const pubDay = new Date("2026-10-30T15:00:00Z");
    const fresh = getFreshNewsPosts(POSTS, pubDay).map((p) => p.slug);
    expect(fresh).toContain("iss-spacewalk-100-seventh-solar-array");
    expect(fresh).toContain("super-typhoon-in-fa-northern-mariana-islands");
    expect(fresh).not.toContain(LAUNCH_SLUG);
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
