/**
 * Brand entity structured data (schema.org JSON-LD) — the site's canonical
 * Organization + WebSite + WebApplication graph, rendered by the root layout
 * on every page.
 *
 * Entity rules (keep these true when editing):
 * - The Organization below is the ONE canonical brand entity. Other pages
 *   that mention WorldEye (AboutPage.about / isPartOf, blog author/publisher
 *   blocks, the camera Dataset's creator) should reference it by @id
 *   (ORGANIZATION_ID / WEBSITE_ID) instead of re-describing it, so search
 *   engines resolve a single entity for the brand.
 * - sameAs lists ONLY profiles verified as the brand's own. Today that is
 *   Instagram (@worldeye.app), which the site itself links. Do not add X,
 *   YouTube, TikTok, etc. until a real brand profile exists AND is linked
 *   from the site — a guessed sameAs attaches the entity to someone else's
 *   property. (The YouTube/X/GitHub URLs elsewhere in this repo are camera
 *   sources, test fixtures, or the upstream OSIRIS author — not WorldEye
 *   brand profiles.)
 * - There is deliberately NO WebSite potentialAction / SearchAction. Site
 *   search is an in-app tool backed by /api/geosearch (a JSON API); there is
 *   no public search-results URL for a SearchAction target to point at, and
 *   declaring one for a URL that doesn't perform a user-facing search is
 *   worse than omitting it. Revisit only if a real /search?q= page ships.
 * - foundingDate is the owner-designated launch, October 2026.
 */

export const ORGANIZATION_ID = "https://worldeye.app/#organization";
export const WEBSITE_ID = "https://worldeye.app/#website";

/** Factual one-paragraph description of the Organization entity. */
export const ORGANIZATION_DESCRIPTION =
  "Live 3D intelligence globe tracking flights, satellites, ships, weather and 74,229 public cameras worldwide. Free with no signup; Pro unlocks the AI analyst and the OSINT toolkit.";

export function buildEntityJsonLd(siteUrl: string, siteDescription: string) {
  const organizationId = `${siteUrl}/#organization`;
  const websiteId = `${siteUrl}/#website`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: "WorldEye",
        url: siteUrl,
        description: ORGANIZATION_DESCRIPTION,
        foundingDate: "2026-10",
        logo: {
          "@type": "ImageObject",
          url: `${siteUrl}/worldeye-logo.png`,
          width: 600,
          height: 570,
        },
        image: `${siteUrl}/og-image.png`,
        sameAs: ["https://www.instagram.com/worldeye.app"],
        contactPoint: {
          "@type": "ContactPoint",
          email: "contact@worldeye.app",
          contactType: "customer support",
        },
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: "WorldEye",
        url: siteUrl,
        description: siteDescription,
        inLanguage: "en",
        publisher: { "@id": organizationId },
      },
      {
        "@type": "WebApplication",
        name: "WorldEye — Live 3D Intelligence Globe & OSINT Tools",
        alternateName: ["WorldEye"],
        url: siteUrl,
        description: siteDescription,
        applicationCategory: "SecurityApplication",
        operatingSystem: "Web",
        browserRequirements: "Requires a modern web browser",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
        },
        featureList: [
          "Nmap port scanning from the browser — no install required",
          "DNS record lookup (A, AAAA, MX, NS, TXT, CNAME)",
          "WHOIS domain registration lookup",
          "SSL/TLS certificate transparency search",
          "BGP routing & ASN lookup",
          "IP geolocation & threat intelligence",
          "Real-time flight tracking via ADS-B",
          "Satellite tracking (including ISS)",
          "Worldwide CCTV camera monitoring",
          "Earthquake monitoring (USGS live feed)",
          "Wildfire detection (NASA FIRMS satellite data)",
          "Nuclear facility mapping (curated reference list, not a live feed)",
          "Severe weather alerts & tracking",
          "Cyber threat & CVE intelligence",
          "Space weather & solar storm monitoring",
          "GPS jamming detection",
          "Defense & commodity market tracking",
          "SIGINT news aggregation feed",
          "Interactive 3D globe with day/night cycle",
          "Region intelligence dossier reports",
        ],
        screenshot: `${siteUrl}/og-image.png`,
        author: { "@id": organizationId },
      },
    ],
  };
}
