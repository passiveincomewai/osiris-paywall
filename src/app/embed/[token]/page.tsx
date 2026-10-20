import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { userHasLiveEnterprise } from "@/lib/enterprise/access";
import { collectionByTokenHash, collectionPayload, recordFeedHit } from "@/lib/enterprise/service";
import { hashSecret, looksLikeFeedToken } from "@/lib/enterprise/tokens";
import EmbedGrid from "@/components/enterprise/EmbedGrid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/* A cold instance may first have to build the camera catalogue in-process. */
export const maxDuration = 60;

export const metadata = {
  title: "Live cameras — WorldEye",
  robots: { index: false, follow: false },
};

/**
 * The embed door: /embed/<feed-token> renders one collection as a live
 * camera wall inside the customer's own site (the headers in
 * next.config.ts scope frameability to this route alone). The token is
 * the credential; a dead token, a disabled feed, or a lapsed Enterprise
 * subscription renders nothing.
 */
export default async function EmbedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!looksLikeFeedToken(token)) notFound();
  const collection = await collectionByTokenHash(hashSecret(token));
  if (!collection) notFound();
  if (!(await userHasLiveEnterprise(collection.userId))) {
    return (
      <div className="min-h-screen bg-[#05070d] text-white flex items-center justify-center p-6">
        <p className="text-sm text-white/50 text-center">
          This camera feed is unavailable — the subscription behind it is not active.
        </p>
      </div>
    );
  }
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "worldeye.app";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const result = await collectionPayload(collection.id, `${proto}://${host}`);
  if (!result.ok) {
    return (
      <div className="min-h-screen bg-[#05070d] text-white flex items-center justify-center p-6">
        <p className="text-sm text-white/50">Cameras are loading — refresh in a moment.</p>
      </div>
    );
  }
  await recordFeedHit(collection.id);
  return <EmbedGrid name={collection.name} cameras={result.payload.cameras} />;
}
