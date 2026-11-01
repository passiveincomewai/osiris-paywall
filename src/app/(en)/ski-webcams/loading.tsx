import SiteFooter from "@/components/SiteFooter";

/**
 * Instant loading state for the ski webcams hub.
 *
 * The hub page is fully dynamic (it awaits searchParams, then loads the
 * per-country camera chunks and the modelled-snowfall strip before it can
 * render), and its render regularly takes well over ten seconds. Without
 * a loading boundary the App Router holds the previous page on screen
 * until the hub's whole payload arrives, so in-app links to the hub —
 * the footer's Ski Webcams link above all — looked completely dead when
 * tapped. This skeleton is committed by the router the moment the link
 * is tapped; the real page streams in behind it. It mirrors the hub's
 * own PageShell frame so the swap does not jump.
 */
export default function SkiWebcamsLoading() {
  return (
    <main className="docs-root min-h-screen bg-[#05070d] text-white">
      <div className="max-w-4xl mx-auto px-6 py-10 md:py-16">
        <p className="font-mono text-[11px] font-medium tracking-[0.25em] text-[#0096FF]">
          LIVE CAMERA NETWORK
        </p>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mt-3">
          Ski Webcams — Live Mountain Cameras
        </h1>
        <p className="text-white/50 mt-4" role="status">
          Loading live resort cameras…
        </p>
        <div className="mt-10 space-y-4" aria-hidden="true">
          <div className="h-24 rounded-2xl border border-white/10 bg-white/[0.03] animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="h-40 rounded-2xl border border-white/10 bg-white/[0.03] animate-pulse" />
            <div className="h-40 rounded-2xl border border-white/10 bg-white/[0.03] animate-pulse" />
            <div className="h-40 rounded-2xl border border-white/10 bg-white/[0.03] animate-pulse" />
            <div className="h-40 rounded-2xl border border-white/10 bg-white/[0.03] animate-pulse" />
          </div>
          <div className="h-24 rounded-2xl border border-white/10 bg-white/[0.03] animate-pulse" />
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
