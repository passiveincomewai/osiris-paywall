// Pins for the GSC 404 fixes (SEO actions #7/#8, 2026-10-26).
//
// Two junk-URL sources from the Search Console "Not found (404)" bucket:
//
// 1. Concatenated URLs (/pricingPricing, /faqFAQ, /aboutAbout,
//    /changelogChangelog, /adminAdmin): React keys built as href + label.
//    Keys are serialized into the RSC flight payload of every server-
//    rendered page, so "/pricing" + "Pricing" sat in the page source as
//    a URL-like string, and Googlebot extracted and crawled it. The
//    rendered <a href> was always correct — only the key was junk. Keys
//    must never concatenate an href with text; use the label/title
//    alone (unique within each list).
//
// 2. Bare paths /week, /month, /year, /docs returned 404. They are
//    covered by permanent redirects in next.config.ts (the repo's
//    redirect mechanism): billing periods → /pricing, /docs → /faq
//    (no help-centre or API-docs route exists; the FAQ is the help
//    surface).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const config = read("next.config.ts");

describe("GSC 404 redirects (next.config.ts)", () => {
  it.each([
    ["/week", "/pricing"],
    ["/month", "/pricing"],
    ["/year", "/pricing"],
    ["/docs", "/faq"],
  ])("permanently redirects %s → %s", (source, destination) => {
    expect(config).toContain(
      `{ source: '${source}', destination: '${destination}', permanent: true }`,
    );
  });
});

describe("React keys never concatenate href + label/title", () => {
  const files: Record<string, string> = {
    footer: "src/components/SiteFooter.tsx",
    useCases: "src/app/use-cases/page.tsx",
    vip: "src/app/vip/page.tsx",
    studioHome: "src/app/affiliates/studio/StudioHomeClient.tsx",
  };

  it.each(Object.entries(files))("%s has no href-concatenated key", (_name, path) => {
    const src = read(path);
    expect(src).not.toMatch(/key=\{[^}]*href \+ /);
    expect(src).not.toMatch(/key=\{href \+ /);
  });

  it("footer keys its link items by label alone", () => {
    expect(read(files.footer)).toContain("<li key={label}>");
  });
});
