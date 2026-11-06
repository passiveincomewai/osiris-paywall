import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft, ArrowRight, Camera, Layers } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import {
  listGalleryCollections,
  type GalleryCollection,
} from "@/lib/collections/gallery";

/**
 * Public collections gallery — signed-out accessible.
 *
 * Every shareable collection is a public page by design (there is no
 * private collection in the system; management is owner-scoped, the
 * share page is public). This index makes those public pages
 * discoverable. Order is stated on the page: most cameras first,
 * then most recently updated — real schema fields, no editorial
 * picks. Individual collection pages stay out of the sitemap (the
 * shipped UGC discipline); this curated index is in it.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DESCRIPTION =
  "Browse themed collections of live cameras curated by WorldEye explorers — ski cams, city views, harbours, wildlife and more, each watchable on a single page.";

export const metadata: Metadata = {
  title: "Camera Collections | WorldEye",
  description: DESCRIPTION,
  alternates: { canonical: "/collections" },
  openGraph: {
    title: "Camera Collections | WorldEye",
    description: DESCRIPTION,
    url: "/collections",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Camera Collections | WorldEye", description: DESCRIPTION },
};

async function originFromHeaders(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "worldeye.app";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

function CollectionCard({ col }: { col: GalleryCollection }) {
  return (
    <Link
      href={`/collections/${col.slug}`}
      className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-[#D4AF37]/40 hover:bg-white/[0.05]"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-black/40">
        {col.coverSnapshotUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={col.coverSnapshotUrl}
            alt={col.coverName ?? col.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/35">
            <Camera className="h-7 w-7" />
            <span className="text-xs font-mono">Preview unavailable</span>
          </div>
        )}
        <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-mono text-white/85">
          {col.cameraCount} {col.cameraCount === 1 ? "camera" : "cameras"}
        </span>
      </div>
      <div className="p-5">
        <h2 className="text-lg font-bold leading-snug text-white group-hover:text-[#D4AF37] transition">
          {col.title}
        </h2>
        <p className="mt-1 text-xs font-mono text-white/45">
          {col.ownerName ? `Collected by ${col.ownerName}` : "Collected by a WorldEye explorer"}
        </p>
        {col.description && (
          <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-white/60">
            {col.description}
          </p>
        )}
      </div>
    </Link>
  );
}

export default async function CollectionsGalleryPage() {
  const origin = await originFromHeaders();
  const collections = await listGalleryCollections(origin);

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
            <Layers className="w-3.5 h-3.5" /> CAMERA COLLECTIONS
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Camera collections</h1>
          <p className="text-white/65 mt-4 text-base md:text-lg leading-relaxed">
            Themed sets of live cameras, collected by WorldEye explorers and shared
            publicly. Open one to watch every camera in it on a single page.
          </p>
          <p className="text-white/40 mt-3 text-sm">
            Shown largest first, then most recently updated.
          </p>
        </div>

        {collections === null ? (
          <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <p className="text-white/70">Collections are unavailable right now — please check back shortly.</p>
          </div>
        ) : collections.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <Camera className="mx-auto h-8 w-8 text-[#D4AF37]" />
            <p className="mt-4 text-lg font-semibold text-white">No collections yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/55">
              Nobody has shared a collection yet. Sign in, save cameras from the globe,
              and group them into the first one from your dashboard.
            </p>
            <Link
              href="/dashboard#collections"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#D4AF37] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#e5c65c]"
            >
              Start a collection <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((col) => (
              <CollectionCard key={col.slug} col={col} />
            ))}
          </div>
        )}

        {collections !== null && collections.length > 0 && (
          <section className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-base font-bold text-white">Make your own collection</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/55">
              Sign in, save cameras from the globe, and group them into a themed
              collection from your dashboard — it gets its own public page you can
              share or embed.
            </p>
            <Link
              href="/dashboard#collections"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#D4AF37] hover:text-[#e5c65c] transition"
            >
              Go to your collections <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        )}
      </div>
      <SiteFooter />
    </main>
  );
}
