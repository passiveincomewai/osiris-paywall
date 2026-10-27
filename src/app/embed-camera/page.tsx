import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft, Camera, ShieldCheck } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import EmbedSnippet from "@/components/embed/EmbedSnippet";
import {
  embedSourceSummaries,
  filterEmbedCameras,
  publicEmbedCameras,
} from "@/lib/embed/public";
import { publicEmbedUrl } from "@/lib/embed/snippet";

export const metadata: Metadata = {
  title: "Embed a Live Camera — Free for Blogs & Partners",
  description:
    "Put a live public camera on your own site with one iframe. Free, no account, no API key — choose from the cameras WorldEye's rights registry clears for redistribution, each with its agency attribution.",
  alternates: { canonical: "/embed-camera" },
  openGraph: {
    title: "Embed a Live Camera — Free for Blogs & Partners | WorldEye",
    description:
      "One iframe, one live camera, free. Only cameras cleared for redistribution by the source agency's terms — attribution included.",
    url: "/embed-camera",
    type: "website",
  },
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PAGE_SIZE = 24;

export default async function EmbedCameraPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; source?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q ?? "";
  const source = sp.source ?? "";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "worldeye.app";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = `${proto}://${host}`;

  const all = await publicEmbedCameras(origin);
  const sources = all ? embedSourceSummaries(all) : [];
  const filtered = all ? filterEmbedCameras(all, q, source) : [];
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (source) params.set("source", source);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/embed-camera?${qs}` : "/embed-camera";
  };

  return (
    <main className="docs-root min-h-screen bg-[#05070d] text-zinc-100">
      <div className="max-w-5xl mx-auto px-6 py-10 md:py-16">
        <div className="flex items-center justify-between mb-12">
          <Link href="/" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> Back to the map
          </Link>
          <span className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37]">WORLDEYE</span>
        </div>

        {/* Hero */}
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
            <Camera className="w-3.5 h-3.5" /> FREE CAMERA EMBEDS
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Put a live camera on <span className="text-[#D4AF37]">your site</span>
          </h1>
          <p className="text-white/55 mt-5 text-base md:text-lg leading-relaxed">
            Pick a camera below, copy one iframe, and the live feed runs on your
            page — a beach on a surf blog, a mountain pass on a resort site, a
            city square on a local news page. No account, no API key, no cost.
          </p>
          <p className="flex items-start gap-2 text-sm text-white/50 mt-4 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
            <span>
              Only cameras whose operating agency&apos;s terms clear them for
              redistribution are listed — the same rights registry that gates
              WorldEye&apos;s Enterprise feed. Every embed carries the
              agency&apos;s attribution and a Powered by WorldEye mark. Need
              multi-camera walls, custom collections or a data feed instead?{" "}
              <Link href="/enterprise" className="text-[#D4AF37] hover:underline">
                That&apos;s the Enterprise plan
              </Link>
              .
            </span>
          </p>
        </div>

        {/* Search */}
        <form method="get" className="mt-10 flex flex-col sm:flex-row gap-3">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search cameras — a city, a beach, a highway…"
            className="flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#D4AF37]/50"
          />
          <select
            name="source"
            defaultValue={source}
            className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80 outline-none focus:border-[#D4AF37]/50 cursor-pointer"
          >
            <option value="">All sources</option>
            {sources.map((s) => (
              <option key={s.source} value={s.source} className="bg-neutral-900">
                {s.upstream} ({s.count.toLocaleString("en-US")})
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-xl bg-[#D4AF37] px-6 py-3 text-sm font-bold text-black hover:brightness-110 transition cursor-pointer"
          >
            Search
          </button>
        </form>

        {/* Results */}
        {all === null ? (
          <p className="mt-12 text-white/50">
            The camera catalogue is warming up — refresh in a moment to browse
            the embeddable cameras.
          </p>
        ) : (
          <>
            <p className="mt-8 text-sm text-white/40">
              {filtered.length.toLocaleString("en-US")} embeddable cameras
              {q ? <> matching “{q}”</> : null}
              {source ? <> from {source}</> : null}
              {totalPages > 1 ? (
                <> · page {safePage} of {totalPages}</>
              ) : null}
            </p>
            {pageItems.length === 0 ? (
              <p className="mt-8 text-white/50">
                No embeddable cameras match that search. Try a broader place
                name, or clear the source filter — only rights-cleared cameras
                appear here, so some well-known feeds are intentionally absent.
              </p>
            ) : (
              <div className="mt-6 grid sm:grid-cols-2 gap-5">
                {pageItems.map((cam) => (
                  <article
                    key={cam.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
                  >
                    <div className="relative aspect-video overflow-hidden rounded-lg bg-black/60">
                      {cam.snapshotUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cam.snapshotUrl}
                          alt={cam.name}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-xs text-white/40">
                          Live stream — open the preview to watch
                        </span>
                      )}
                    </div>
                    <h2 className="font-semibold text-white/90 mt-3 truncate">{cam.name}</h2>
                    <p className="text-xs text-white/45 truncate">
                      {[cam.city, cam.country].filter(Boolean).join(", ")} · {cam.attribution}
                    </p>
                    <EmbedSnippet
                      cameraId={cam.id}
                      name={cam.name}
                      embedUrl={publicEmbedUrl(cam.id)}
                    />
                  </article>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Pagination">
                {safePage > 1 && (
                  <Link href={pageHref(safePage - 1)} className="px-4 py-2 rounded-xl border border-white/15 text-sm text-white/75 hover:border-white/35 transition">
                    ← Previous
                  </Link>
                )}
                {safePage < totalPages && (
                  <Link href={pageHref(safePage + 1)} className="px-4 py-2 rounded-xl border border-white/15 text-sm text-white/75 hover:border-white/35 transition">
                    Next →
                  </Link>
                )}
              </nav>
            )}
          </>
        )}

        {/* Terms in one breath */}
        <div className="mt-16 rounded-3xl border border-white/10 bg-white/[0.02] p-8 max-w-3xl">
          <h2 className="text-xl font-bold">The deal, in one breath</h2>
          <ul className="mt-4 space-y-2.5 text-sm text-white/55 leading-relaxed list-disc pl-5">
            <li>Free for blogs, news sites, resorts, clubs and community pages — commercial and non-commercial alike.</li>
            <li>One camera per embed. The agency attribution and the Powered by WorldEye mark stay on the player — embeds are never white-label.</li>
            <li>If an agency withdraws or changes its terms, its cameras leave the embeddable set and existing embeds of them stop — that&apos;s the registry doing its job.</li>
            <li>
              Want collections of cameras on one wall, a JSON data feed, or API
              keys? See the{" "}
              <Link href="/enterprise" className="text-[#D4AF37] hover:underline">Enterprise camera feed</Link>
              .
            </li>
          </ul>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
