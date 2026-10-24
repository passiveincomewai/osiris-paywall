import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { catalogueIdOf, isShareSlug } from "@/lib/clip-share/core";
import WatchBeacon from "@/components/watch/WatchBeacon";

export const runtime = "nodejs";
// Views and revocation state change — never cache the page shell.
export const dynamic = "force-dynamic";

type Share = NonNullable<Awaited<ReturnType<typeof loadShare>>>;

async function loadShare(slug: string) {
  if (!isShareSlug(slug)) return null;
  const share = await db.clipShare
    .findUnique({
      where: { slug },
      include: { user: { select: { name: true } } },
    })
    .catch(() => null);
  if (!share) return null;
  // ClipMeta carries only the scalar savedCameraId (no relation), so
  // the source camera's catalogue snapshot resolves in a second hop.
  const clip = await db.clipMeta
    .findUnique({ where: { id: share.clipId }, select: { savedCameraId: true } })
    .catch(() => null);
  let cameraData: unknown = null;
  if (clip?.savedCameraId) {
    const saved = await db.savedCamera
      .findUnique({ where: { id: clip.savedCameraId }, select: { cameraData: true } })
      .catch(() => null);
    cameraData = saved?.cameraData ?? null;
  }
  return { ...share, cameraData };
}

function fmtDur(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const share = await loadShare(slug);
  if (!share || share.revokedAt) {
    return { title: "Shared clip — WorldEye", robots: { index: false } };
  }
  // Unlisted shares (account settings item 19): reachable by link,
  // but no indexing and no social-card metadata — the page itself
  // still plays for anyone holding the link.
  if (share.visibility === "unlisted") {
    return { title: "Shared clip — WorldEye", robots: { index: false, follow: false } };
  }
  const description = `Watch "${share.title}" — a live-camera recording shared from WorldEye's globe of 74,229 live cameras.`;
  return {
    title: `${share.title} — WorldEye`,
    description,
    alternates: { canonical: `/watch/${slug}` },
    openGraph: {
      title: share.title,
      description,
      url: `/watch/${slug}`,
      type: "video.other",
      ...(share.posterUrl ? { images: [{ url: share.posterUrl }] } : {}),
      videos: [
        {
          url: share.blobUrl,
          secureUrl: share.blobUrl,
          type: share.mimeType.split(";")[0],
          width: 1280,
          height: 720,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: share.title,
      description,
      ...(share.posterUrl ? { images: [share.posterUrl] } : {}),
    },
  };
}

function GonePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#050810" }}>
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/[0.04] p-10 text-center">
        <div className="text-4xl mb-3">🎬</div>
        <h1 className="text-white font-bold text-xl">This shared clip is no longer available</h1>
        <p className="text-sm text-slate-400 mt-2">
          The link may have been revoked by its owner. The live cameras, though, are still live.
        </p>
        <Link
          href="/"
          className="inline-block mt-6 px-5 py-2.5 rounded-xl bg-cyan-500/90 text-white text-sm font-semibold hover:bg-cyan-400"
        >
          Open the live globe
        </Link>
      </div>
    </div>
  );
}

export default async function WatchPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const share: Share | null = await loadShare(slug);
  if (!share) notFound();
  if (share.revokedAt) return <GonePage />;

  const sharerName = share.user?.name?.trim() || "a WorldEye member";
  const catalogueId = catalogueIdOf(share.cameraData);
  // CTAs ride the established /ref mechanism when the sharer has a code:
  // the click is recorded and the attribution cookie drops there too.
  const refBase = share.refCode ? `/ref/${encodeURIComponent(share.refCode)}` : null;
  const cameraHref = catalogueId
    ? refBase
      ? `${refBase}?camera=${encodeURIComponent(catalogueId)}`
      : `/?camera=${encodeURIComponent(catalogueId)}`
    : null;
  const globeHref = refBase ?? "/";

  return (
    <div className="min-h-screen" style={{ background: "#050810" }}>
      <WatchBeacon slug={slug} />
      <header className="border-b border-white/10 bg-[#050810]/85 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/worldeye-eye.png" alt="WorldEye" width={600} height={432} className="h-8 w-auto" />
            <span className="font-wordmark text-white tracking-wide">
              World<span className="text-[#0096FF]">Eye</span>
            </span>
          </Link>
          <Link
            href={globeHref}
            className="text-sm font-mono text-slate-300 hover:text-white border border-white/15 hover:border-cyan-400/60 rounded-lg px-3 py-2"
          >
            ← Live globe
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-5">
        <div className="rounded-2xl border border-white/10 bg-black/60 overflow-hidden">
          <video
            src={share.blobUrl}
            poster={share.posterUrl ?? undefined}
            controls
            playsInline
            preload="metadata"
            className="w-full max-h-[70vh] bg-black"
          />
        </div>

        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">{share.title}</h1>
          <p className="text-sm text-slate-400 mt-2">
            Recorded with <span className="text-slate-200 font-semibold">WorldEye</span> · shared by {sharerName} ·{" "}
            {fmtDur(share.durationSec)} ·{" "}
            {new Date(share.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            {" · "}
            {share.views.toLocaleString()} {share.views === 1 ? "view" : "views"}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {cameraHref && (
            <Link
              href={cameraHref}
              className="px-5 py-3 rounded-xl bg-cyan-500/90 text-white text-sm font-semibold hover:bg-cyan-400"
            >
              ● Watch this camera live
            </Link>
          )}
          <Link
            href={globeHref}
            className="px-5 py-3 rounded-xl border border-white/20 text-slate-100 text-sm font-semibold hover:bg-white/5"
          >
            Explore 74,229 live cameras
          </Link>
          <Link
            href="/recording"
            className="px-5 py-3 rounded-xl border border-white/20 text-slate-100 text-sm font-semibold hover:bg-white/5"
          >
            Record your own clips
          </Link>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
          WorldEye is a live 3D globe of public cameras, flights, satellites, weather and more. Clips like this one
          are recorded by members with the Recording Studio and shared straight from the app — the video stays hosted
          here, on worldeye.app.
        </p>
      </main>
    </div>
  );
}
