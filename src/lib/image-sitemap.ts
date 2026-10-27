import { POSTS } from "@/app/blog/posts";

/**
 * Image sitemap data + builder (SEO item 6, 2026-10-26).
 *
 * Served by src/app/image-sitemap.xml/route.ts and registered in
 * public/robots.txt next to the main and news sitemaps.
 *
 * Discipline: only SELF-HOSTED, crawlable images that a page actually
 * presents — its Open Graph / hero image and the editorial art rendered
 * on it. The live camera walls are client-rendered video feeds whose
 * stills live on third-party CDNs, so they are deliberately absent:
 * an image sitemap entry must be a URL that returns 200 from
 * worldeye.app itself. image-sitemap.test.ts pins that every image
 * path below exists under public/ and every page URL is in the main
 * sitemap.
 */

const BASE = "https://worldeye.app";

export interface ImageEntry {
  /** Page the images appear on (path only, e.g. "/" or "/blog/x"). */
  page: string;
  images: Array<{
    /** Image path under public/ (e.g. "/og-image.png"). */
    path: string;
    title?: string;
  }>;
}

/** The site's default social/hero image (app/layout.tsx openGraph). */
const OG_IMAGE = {
  path: "/og-image.png",
  title: "WorldEye — live cameras, flights and satellites on a 3D globe",
};

export const IMAGE_SITEMAP_ENTRIES: ImageEntry[] = [
  {
    // The homepage presents the cinematic hero poster, the SEO shell's
    // section art (components/HomeSeoShell), the landing tracker art
    // (components/landing) and the Sky panel launcher on the globe.
    page: "/",
    images: [
      OG_IMAGE,
      {
        path: "/worldeye-cinematic-poster.jpg",
        title: "WorldEye live 3D globe — cinematic hero still",
      },
      {
        path: "/landing/osint-satellite.jpg",
        title:
          "Satellite imagery of the San Francisco Bay Area from Esri World Imagery, the source WorldEye's satellite view uses",
      },
      {
        path: "/landing/osint-maritime.jpg",
        title:
          "WorldEye globe over Europe, the Mediterranean and North Africa with the maritime layer on",
      },
      {
        path: "/landing/osint-search.jpg",
        title: "WorldEye search open on the globe — basic search is free for every visitor",
      },
      {
        path: "/landing/track-flights.jpg",
        title: "Live flight tracking on the WorldEye globe",
      },
      {
        path: "/landing/track-satellites.jpg",
        title: "Live satellite tracking on the WorldEye globe",
      },
      {
        path: "/landing/hazard-weather.jpg",
        title: "Live weather and hazards on the WorldEye globe",
      },
      {
        path: "/images/sky/launcher.webp",
        title: "Today in the Sky — WorldEye's live space and sky panel",
      },
    ],
  },
  {
    // The comparison page renders this capture of the live map
    // (src/app/compare/worldeye-vs-osiris/page.tsx).
    page: "/compare/worldeye-vs-osiris",
    images: [
      {
        path: "/seo/worldeye-live-map.webp",
        title: "The WorldEye live map — cameras, flights and satellites on one globe",
      },
    ],
  },
  // Every blog post: its hero image is the post's own `image` when set,
  // otherwise the site OG image (the same default the post page's
  // metadata uses).
  ...POSTS.map((p) => ({
    page: `/blog/${p.slug}`,
    images: [
      p.image
        ? { path: p.image, title: p.title }
        : { path: OG_IMAGE.path, title: p.title },
    ],
  })),
];

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Render the entries as a Google image sitemap document. */
export function buildImageSitemap(entries: ImageEntry[] = IMAGE_SITEMAP_ENTRIES): string {
  const urls = entries.map((e) => {
    const imgs = e.images
      .map((img) => {
        const title = img.title
          ? `\n        <image:title>${xmlEscape(img.title)}</image:title>`
          : "";
        return `      <image:image>\n        <image:loc>${BASE}${xmlEscape(img.path)}</image:loc>${title}\n      </image:image>`;
      })
      .join("\n");
    return `  <url>\n    <loc>${BASE}${xmlEscape(e.page)}</loc>\n${imgs}\n  </url>`;
  });
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
    urls.join("\n") +
    `\n</urlset>\n`
  );
}
