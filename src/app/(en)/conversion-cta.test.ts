// Conversion-pass integration pins (Deploy 11): the pages the audit
// found dead-ending without any trial ask now render TrialCtaSection
// exactly once, at the end of content, each with its own utm_source.
// Pages that already ended with a real pricing CTA (compare, best-*,
// alternatives, features, the tracker Pro strips) are pinned as NOT
// carrying it — one ask per page, never stacked.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = (rel: string) => readFileSync(join(process.cwd(), "src", rel), "utf8");

const WITH_CTA: Record<string, string> = {
  "app/(en)/cameras/page.tsx": "cameras",
  "app/(en)/cameras/countries/page.tsx": "cameras-countries",
  "app/(en)/cameras/countries/[country]/page.tsx": "cameras-country",
  "app/(en)/city-webcams/[city]/page.tsx": "city-webcams",
  "components/pages/LiveWebcamsPage.tsx": "live-webcams",
  "app/(en)/live-traffic-cameras/page.tsx": "live-traffic-cameras",
  "app/(en)/live-plane-spotting/page.tsx": "live-plane-spotting",
};

const ALREADY_HAD_CTA = [
  "app/(en)/compare/page.tsx",
  "app/(en)/compare/[slug]/page.tsx",
  "app/(en)/features/page.tsx",
  "app/(en)/live-flight-tracker/page.tsx",
  "app/(en)/satellite-tracker/page.tsx",
  "app/(en)/best-live-webcam-sites/page.tsx",
  "app/(en)/alternatives/windy/page.tsx",
];

describe("conversion CTA — pages that were missing one", () => {
  for (const [file, utmSource] of Object.entries(WITH_CTA)) {
    it(`${file} renders TrialCtaSection once with utm_source=${utmSource}`, () => {
      const source = src(file);
      expect(source).toContain('from "@/components/TrialCtaSection"');
      const renders = source.match(/<TrialCtaSection/g) ?? [];
      expect(renders).toHaveLength(1);
      expect(source).toContain(`<TrialCtaSection utmSource="${utmSource}" />`);
    });
  }
});

describe("conversion CTA — pages that already had one stay single-ask", () => {
  for (const file of ALREADY_HAD_CTA) {
    it(`${file} does not stack TrialCtaSection on its existing CTA`, () => {
      expect(src(file)).not.toContain("TrialCtaSection");
    });
  }
});
