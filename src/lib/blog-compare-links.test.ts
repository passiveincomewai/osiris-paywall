import { describe, expect, it } from "vitest";
import { BLOG_COMPARE_LINKS, compareLinksForPost } from "./blog-compare-links";
import { POSTS } from "@/app/blog/posts";
import { listBundledCompetitors } from "./competitors-data";

describe("blog compare links (indexation push)", () => {
  it("every mapped post slug is a real published post", () => {
    const slugs = new Set(POSTS.map((p) => p.slug));
    for (const slug of Object.keys(BLOG_COMPARE_LINKS)) {
      expect(slugs.has(slug), `unknown blog slug: ${slug}`).toBe(true);
    }
  });

  it("every link target is a real published comparison page", () => {
    const valid = new Set(listBundledCompetitors().map((c) => `/compare/${c.slug}`));
    valid.add("/compare/worldeye-vs-osiris");
    for (const links of Object.values(BLOG_COMPARE_LINKS)) {
      for (const l of links) {
        expect(valid.has(l.href), `unknown compare target: ${l.href}`).toBe(true);
      }
    }
  });

  it("keeps it editorial: one or two links per post, never more", () => {
    for (const links of Object.values(BLOG_COMPARE_LINKS)) {
      expect(links.length).toBeGreaterThanOrEqual(1);
      expect(links.length).toBeLessThanOrEqual(2);
    }
  });

  it("returns an empty array for unmapped posts", () => {
    expect(compareLinksForPost("no-such-post")).toEqual([]);
  });
});
