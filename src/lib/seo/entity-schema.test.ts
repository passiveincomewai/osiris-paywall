import { describe, it, expect } from "vitest";
import {
  buildEntityJsonLd,
  ORGANIZATION_ID,
  ORGANIZATION_DESCRIPTION,
  WEBSITE_ID,
} from "./entity-schema";

const SITE_URL = "https://worldeye.app";
const SITE_DESCRIPTION = "Test description for the site.";

type Node = Record<string, any>;

function graph(): Node[] {
  return (buildEntityJsonLd(SITE_URL, SITE_DESCRIPTION) as Node)["@graph"];
}

function byType(type: string): Node {
  const node = graph().find((n) => n["@type"] === type);
  if (!node) throw new Error(`missing @type ${type}`);
  return node;
}

describe("buildEntityJsonLd", () => {
  it("produces JSON-serializable output with the three canonical nodes", () => {
    const ld = buildEntityJsonLd(SITE_URL, SITE_DESCRIPTION);
    // Round-trip: what the layout injects must parse back as valid JSON-LD.
    const parsed = JSON.parse(JSON.stringify(ld)) as Node;
    expect(parsed["@context"]).toBe("https://schema.org");
    const types = (parsed["@graph"] as Node[]).map((n) => n["@type"]);
    expect(types).toEqual(["Organization", "WebSite", "WebApplication"]);
  });

  it("Organization carries the canonical @id and required entity fields", () => {
    const org = byType("Organization");
    expect(org["@id"]).toBe(ORGANIZATION_ID);
    expect(org["@id"]).toBe(`${SITE_URL}/#organization`);
    expect(org.name).toBe("WorldEye");
    expect(org.url).toBe(SITE_URL);
    expect(org.description).toBe(ORGANIZATION_DESCRIPTION);
    // Owner-designated launch: October 2026.
    expect(org.foundingDate).toBe("2026-10");
    expect(org.image).toBe(`${SITE_URL}/og-image.png`);
  });

  it("Organization logo is the real public logo with its true dimensions", () => {
    const org = byType("Organization");
    // public/worldeye-logo.png is a 600x570 PNG; the blog publisher block
    // already declares the same ImageObject — keep them in agreement.
    expect(org.logo).toEqual({
      "@type": "ImageObject",
      url: `${SITE_URL}/worldeye-logo.png`,
      width: 600,
      height: 570,
    });
  });

  it("sameAs lists only the verified brand profile (Instagram)", () => {
    const org = byType("Organization");
    // @worldeye.app is the one profile the site itself links. No other
    // platform URL may appear here until a real brand profile exists —
    // this pins the "no invented profiles" rule.
    expect(org.sameAs).toEqual(["https://www.instagram.com/worldeye.app"]);
  });

  it("WebSite references the Organization and declares no SearchAction", () => {
    const site = byType("WebSite");
    expect(site["@id"]).toBe(WEBSITE_ID);
    expect(site.url).toBe(SITE_URL);
    expect(site.publisher).toEqual({ "@id": ORGANIZATION_ID });
    // Site search is an in-app tool (/api/geosearch JSON API); there is no
    // public search-results URL, so a SearchAction target would be invented.
    expect(site.potentialAction).toBeUndefined();
  });

  it("WebApplication is authored by the canonical Organization", () => {
    const app = byType("WebApplication");
    expect(app.author).toEqual({ "@id": ORGANIZATION_ID });
    expect(app.description).toBe(SITE_DESCRIPTION);
    expect(app.url).toBe(SITE_URL);
  });
});
