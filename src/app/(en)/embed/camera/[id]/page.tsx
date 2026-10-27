import { headers } from "next/headers";
import { notFound } from "next/navigation";
import PublicCameraPlayer from "@/components/embed/PublicCameraPlayer";
import { publicEmbedCamera } from "@/lib/embed/public";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/* A cold instance may first have to build the camera catalogue in-process. */
export const maxDuration = 60;

export const metadata = {
  title: "Live camera — WorldEye",
  robots: { index: false, follow: false },
};

/**
 * The public embed door: /embed/camera/<id> renders ONE camera whose
 * source the rights registry clears for redistribution (the same
 * verdict as the Enterprise feed — see lib/embed/public). A camera
 * that isn't cleared, isn't playable, or doesn't exist renders
 * nothing here: no stream URL ever reaches the page for it. Framing
 * is open on /embed/* by the next.config rule that already scopes it
 * to this route family.
 */
export default async function PublicEmbedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "worldeye.app";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const cam = await publicEmbedCamera(id, `${proto}://${host}`);
  if (!cam) {
    // Unknown id vs not-cleared is deliberately indistinguishable:
    // either way there is nothing to embed.
    notFound();
  }
  return (
    <div className="fixed inset-0 bg-black">
      <PublicCameraPlayer cam={cam} />
    </div>
  );
}
