import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft, Camera, Code2 } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import CollectionGrid, { type GridCamera } from "@/components/collections/CollectionGrid";
import ShareButtons from "@/components/collections/ShareButtons";
import EmbedSnippet from "@/components/embed/EmbedSnippet";
import { resolvePublicCollection } from "@/lib/collections/shared";
import { collectionEmbedUrl, publicCollectionUrl } from "@/lib/embed/snippet";

/**
 * Public shareable collection page — signed-out accessible.
 *
 * Cameras render from the live catalogue (membership stores ids
 * only). The social preview (opengraph-image.tsx) uses stills ONLY
 * from rights-cleared cameras; this page itself shows every camera
 * in the collection. Indexing: indexable, deliberately kept out of
 * the sitemap (user-generated pages stay out of the curated sitemap).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function originFromHeaders(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "worldeye.app";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const origin = await originFromHeaders();
  const col = await resolvePublicCollection(slug, origin);
  if (!col) return { title: "Collection not found | WorldEye" };
  const count = col.cameras.length;
  const description =
    col.description ??
    `A WorldEye camera collection of ${count} live ${count === 1 ? "camera" : "cameras"} — watch them all in one place.`;
  const title = `${col.title} | WorldEye`;
  return {
    title,
    description,
    alternates: { canonical: publicCollectionUrl(slug) },
    openGraph: {
      title,
      description,
      url: publicCollectionUrl(slug),
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const origin = await originFromHeaders();
  const col = await resolvePublicCollection(slug, origin);
  if (!col) notFound();

  const gridCameras: GridCamera[] = col.cameras.map((c) => ({
    cameraId: c.cameraId,
    name: c.feed?.name ?? null,
    location: c.feed ? [c.feed.city, c.feed.country].filter(Boolean).join(", ") || null : null,
    snapshotUrl: c.feed?.snapshotUrl ?? null,
    missing: c.missing,
  }));
  const embeddable = col.cameras.filter((c) => c.embed !== null).length;
  const publicUrl = `${origin}${publicCollectionUrl(slug)}`;

  return (
    <main className="docs-root min-h-screen bg-[#05070d] text-zinc-100">
      <div className="max-w-6xl mx-auto px-6 py-10 md:py-14">
        <div className="flex items-center justify-between mb-10">
          <Link href="/" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> Back to the map
          </Link>
          <span className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37]">WORLDEYE</span>
        </div>

        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
            <Camera className="w-3.5 h-3.5" /> CAMERA COLLECTION
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{col.title}</h1>
          <p className="text-white/50 mt-3 text-sm font-mono">
            {col.ownerName ? `Collected by ${col.ownerName}` : "A WorldEye camera collection"} ·{" "}
            {col.cameras.length} {col.cameras.length === 1 ? "camera" : "cameras"}
          </p>
          {col.description && (
            <p className="text-white/65 mt-4 text-base md:text-lg leading-relaxed">{col.description}</p>
          )}
          <div className="mt-6">
            <ShareButtons url={publicUrl} title={col.title} />
          </div>
        </div>

        <div className="mt-10">
          <CollectionGrid cameras={gridCameras} />
        </div>

        {embeddable > 0 && (
          <section className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-white">
              <Code2 className="w-4 h-4 text-[#D4AF37]" /> Put this collection on your site
            </h2>
            <p className="text-sm text-white/55 mt-2 leading-relaxed">
              One iframe shows {embeddable} of the {col.cameras.length}{" "}
              {col.cameras.length === 1 ? "camera" : "cameras"} in this collection — for
              source-protection reasons the embed includes only the cameras whose source
              allows embedding. This web page always shows the full collection.
            </p>
            <EmbedSnippet
              cameraId={slug}
              name={col.title}
              embedUrl={`${origin}${collectionEmbedUrl(slug)}`}
              showPreview={false}
            />
          </section>
        )}

        <p className="text-xs text-white/40 mt-10 leading-relaxed">
          Stills refresh from each camera&apos;s public feed. A camera whose feed is
          unreachable shows as unavailable rather than with a substitute image. Camera
          sources are credited on each camera&apos;s own page.
        </p>
      </div>
      <SiteFooter />
    </main>
  );
}
