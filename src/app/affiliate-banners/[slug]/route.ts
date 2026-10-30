// GET /affiliate-banners/<slug>[.svg] — public hosted banner artwork.
//
// Serves the self-contained SVG designs from src/lib/affiliate/banners.ts
// (the single source of truth shared with the resources-page gallery and
// the Marketing Studio embed tooling). The artwork contains no referral
// data; affiliate attribution lives in the link that wraps the image.
import { bannerBySlug } from "@/lib/affiliate/banners";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const slug = raw.replace(/\.svg$/i, "");
  const design = bannerBySlug(slug);
  if (!design) {
    return new Response("Unknown banner", { status: 404, headers: { "Content-Type": "text/plain" } });
  }
  return new Response(design.svg(), {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
    },
  });
}
