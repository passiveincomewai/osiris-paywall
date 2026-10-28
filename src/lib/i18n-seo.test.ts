/**
 * Tests for the localized metadata helper (src/lib/i18n-seo.ts).
 *
 * Pins the brief §5 contract against the Spanish foundation tranche:
 * self-referencing canonicals, reciprocal hreflang maps built only
 * from the manifest's published set, x-default → English, and English
 * canonicals byte-identical to the values the pages hardcode today.
 */

import { describe, expect, it } from "vitest";
import { hreflangMapFor, localizedMetadata, localizedUrl } from "./i18n-seo";

describe("localizedUrl", () => {
  it("keeps English URLs byte-identical to today's routes", () => {
    expect(localizedUrl("", "en")).toBe("https://worldeye.app/");
    expect(localizedUrl("pricing", "en")).toBe("https://worldeye.app/pricing");
    expect(localizedUrl("live-webcams", "en")).toBe(
      "https://worldeye.app/live-webcams"
    );
    expect(localizedUrl("faq", "en")).toBe("https://worldeye.app/faq");
  });

  it("prefixes published locales", () => {
    // The locale homepage is the bare /es — /es/ 308-redirects to it,
    // so canonicals, hreflang and the sitemap use the final form.
    expect(localizedUrl("", "es")).toBe("https://worldeye.app/es");
    expect(localizedUrl("pricing", "es")).toBe("https://worldeye.app/es/pricing");
    expect(localizedUrl("ship-tracker", "es")).toBe(
      "https://worldeye.app/es/ship-tracker"
    );
  });
});

describe("hreflangMapFor", () => {
  it("lists exactly the published locales plus x-default", () => {
    expect(hreflangMapFor("pricing")).toEqual({
      en: "https://worldeye.app/pricing",
      es: "https://worldeye.app/es/pricing",
      "x-default": "https://worldeye.app/pricing",
    });
    expect(hreflangMapFor("")).toEqual({
      en: "https://worldeye.app/",
      es: "https://worldeye.app/es",
      "x-default": "https://worldeye.app/",
    });
  });

  it("falls back to en + x-default for unpublished pages", () => {
    expect(hreflangMapFor("features")).toEqual({
      en: "https://worldeye.app/features",
      "x-default": "https://worldeye.app/features",
    });
  });
});

describe("localizedMetadata", () => {
  it("builds a self-referencing Spanish canonical with the full map", () => {
    const md = localizedMetadata({
      slug: "live-webcams",
      locale: "es",
      title: "Cámaras en vivo",
      description: "Descripción",
    });
    expect(md.alternates?.canonical).toBe("https://worldeye.app/es/live-webcams");
    expect(md.alternates?.languages).toEqual(hreflangMapFor("live-webcams"));
    expect(md.openGraph?.locale).toBe("es_ES");
    expect(md.openGraph?.alternateLocale).toEqual(["en_US"]);
    expect(md.openGraph?.url).toBe("https://worldeye.app/es/live-webcams");
  });

  it("keeps the English canonical byte-identical to today's value", () => {
    const md = localizedMetadata({
      slug: "pricing",
      locale: "en",
      title: "Pricing",
      description: "Desc",
    });
    expect(md.alternates?.canonical).toBe("https://worldeye.app/pricing");
    expect(md.openGraph?.locale).toBe("en_US");
    expect(md.openGraph?.alternateLocale).toEqual(["es_ES"]);
  });
});
