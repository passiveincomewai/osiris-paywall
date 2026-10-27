import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getStudioGate } from "@/lib/studio/access";
import { buildStudioContext } from "@/lib/studio/context";
import type { VideoMeta } from "@/lib/studio/video-seed";
import StudioUpgradeScreen from "@/app/(en)/affiliates/studio/StudioUpgradeScreen";
import VideoStudioClient from "./VideoStudioClient";

export const metadata = { title: "Video Studio — Marketing Studio" };

/**
 * Video Studio personalize page.
 *
 * Gate flow mirrors the rest of the Studio: signed-out → sign-in;
 * signed-in non-affiliate → join note; affiliate whose membership gate
 * fails (getStudioGate outcome !== "ok") → the upgrade screen. Rendering
 * itself happens entirely in the affiliate's browser (VideoStudioClient).
 */
export default async function VideoStudioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(`/affiliates/studio/video/${slug}`)}`);
  }

  const { profile, outcome } = await getStudioGate(session.user.id);

  if (!profile) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-3">
        <h1 className="text-xl font-bold text-white">Join the affiliate program first</h1>
        <p className="text-sm text-slate-400">
          The Video Studio personalizes official WorldEye videos with your referral link, QR code
          and discount code — which means you need an affiliate profile before you can use it.
        </p>
        <Link
          href="/affiliates"
          className="inline-flex px-5 py-2.5 rounded-xl font-mono text-sm font-bold text-[#04121f]"
          style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)" }}
        >
          Join the affiliate program
        </Link>
      </div>
    );
  }

  if (outcome !== "ok") {
    return <StudioUpgradeScreen />;
  }

  const template = await db.marketingTemplate.findFirst({
    where: {
      slug,
      kind: "video",
      active: true,
      OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }],
    },
  });
  if (!template) notFound();

  // Video rows store { videoMeta } in the layers Json column (see
  // src/lib/studio/video-seed.ts) — branch on kind before reading it.
  const layers = (template.layers ?? {}) as { videoMeta?: Partial<VideoMeta> };
  const meta = layers.videoMeta ?? {};
  const durationSec = typeof meta.durationSec === "number" ? meta.durationSec : 0;
  const defaultHook = typeof meta.hook === "string" ? meta.hook : "";
  const cta = typeof meta.cta === "string" ? meta.cta : "Try WorldEye.";

  const ctx = await buildStudioContext(profile);

  // The profile's discountCode / discountPct fields land with a
  // concurrent schema change, so they may be absent at runtime.
  // buildStudioContext reads them defensively and applies the honesty
  // rule: its couponCode/discountPct are non-null only when the code AND
  // pct exist and Stripe has confirmed the promotion code (it actually
  // redeems at checkout). Anything else → no discount line, ever.
  const discount =
    ctx.couponCode && ctx.discountPct ? { code: ctx.couponCode, pct: ctx.discountPct } : null;

  return (
    <VideoStudioClient
      slug={template.slug}
      title={template.title}
      assetUrl={template.assetUrl ?? ""}
      posterUrl={template.previewUrl ?? undefined}
      width={template.width}
      height={template.height}
      durationSec={durationSec}
      defaultHook={defaultHook}
      cta={cta}
      link={ctx.link}
      code={ctx.code}
      discount={discount}
    />
  );
}
