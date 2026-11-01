import { headers } from "next/headers";
import { notFound } from "next/navigation";
import PublicCameraPlayer from "@/components/embed/PublicCameraPlayer";
import { resolveEmbedCollection } from "@/lib/collections/shared";
import { publicCollectionUrl } from "@/lib/embed/snippet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/* A cold instance may first have to build the camera catalogue in-process. */
export const maxDuration = 60;

export const metadata = {
  title: "Camera collection — WorldEye",
  robots: { index: false, follow: false },
};

/**
 * The collection embed door: /embed/collection/<slug> renders ONLY
 * the collection's cameras that the rights registry clears for
 * embedding (the same feedEligibility verdict as the single-camera
 * embed and the Enterprise feed), each in the standard
 * PublicCameraPlayer with its forced Powered by WorldEye mark and
 * agency attribution. Cameras the registry excludes never appear
 * here and their data never reaches this page; the header says
 * plainly when the embed is showing a subset of the collection.
 * Framing is open on /embed/* by the existing next.config rule.
 */
export default async function CollectionEmbedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "worldeye.app";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = `${proto}://${host}`;
  const col = await resolveEmbedCollection(slug, origin);
  if (!col) notFound();

  const fullUrl = `${origin}${publicCollectionUrl(slug)}`;
  const subset = col.cameras.length < col.totalCameras;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 border-b border-white/10">
        <a
          href={fullUrl}
          target="_top"
          rel="noreferrer"
          className="text-sm font-bold hover:underline truncate"
        >
          {col.title}
        </a>
        <a
          href="https://worldeye.app"
          target="_top"
          rel="noreferrer"
          className="text-[10px] font-mono tracking-[0.18em] text-white/70 hover:text-white shrink-0"
        >
          POWERED BY <span className="text-[#D4AF37] font-bold">WORLDEYE</span>
        </a>
      </header>
      {subset && col.cameras.length > 0 && (
        <p className="px-4 py-2 text-[11px] text-white/50 border-b border-white/5">
          Showing {col.cameras.length} of {col.totalCameras} cameras — only cameras whose
          source allows embedding appear in embeds.{" "}
          <a href={fullUrl} target="_top" rel="noreferrer" className="underline underline-offset-2 hover:text-white">
            See the full collection
          </a>
        </p>
      )}
      {col.cameras.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="text-3xl">📡</div>
          <p className="text-sm text-white/70 max-w-sm leading-relaxed">
            None of this collection&apos;s cameras can be embedded — their sources
            don&apos;t clear them for redistribution. You can still watch the full
            collection on WorldEye.
          </p>
          <a
            href={fullUrl}
            target="_top"
            rel="noreferrer"
            className="text-sm font-mono text-[#D4AF37] hover:underline"
          >
            Open the full collection →
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 p-1">
          {col.cameras.map((cam) => (
            <div key={cam.id} className="relative aspect-video">
              <PublicCameraPlayer cam={cam} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
