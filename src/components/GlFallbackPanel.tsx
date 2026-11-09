/**
 * Fallback panel shown INSTEAD of the globe when the visitor's browser
 * cannot create any WebGL context the map engine can use (see
 * lib/webgl-probe). It replaces the pre-2026-11-09 behaviour — MapLibre
 * throwing its raw "WebGL2 is required…" library message into the error
 * boundary, rendered truncated over a black globe — with plain
 * language, the concrete things that fix it, and the parts of WorldEye
 * that work without the globe (camera browsing by country/city is
 * server-rendered and never needed the map).
 *
 * Rendered by OsirisMap in place of the map; the rest of the Dashboard
 * around it stays fully usable.
 */
export default function GlFallbackPanel() {
  return (
    <div
      data-testid="gl-fallback-panel"
      className="absolute inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-[#04060c] px-4 py-8"
    >
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-white/[0.04] px-6 py-6 shadow-2xl">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300/90">
          3D globe unavailable
        </div>
        <h2 className="mt-2 text-lg font-semibold text-white">
          Your browser couldn&apos;t start the globe
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/70">
          WorldEye&apos;s globe is drawn with WebGL, a browser graphics feature.
          This browser or device didn&apos;t provide it, so the globe can&apos;t
          run here — nothing is broken on the site itself.
        </p>

        <div className="mt-4 text-sm font-medium text-white">Things that usually fix it:</div>
        <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm leading-relaxed text-white/70">
          <li>Update your browser to the latest version.</li>
          <li>
            Turn on <span className="text-white">hardware acceleration</span> in your
            browser&apos;s settings.
          </li>
          <li>
            If you&apos;re in a private or incognito window, try a regular window —
            some browsers block graphics features there.
          </li>
        </ul>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 w-full rounded-lg border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.12]"
        >
          Try again
        </button>

        <div className="mt-6 border-t border-white/10 pt-4">
          <div className="text-sm font-medium text-white">
            You can still explore the cameras — no globe needed:
          </div>
          <div className="mt-2.5 flex flex-col gap-2">
            <a
              href="/cameras"
              className="rounded-lg border border-white/10 bg-black/40 px-4 py-2 text-sm text-white/85 transition hover:bg-black/60 hover:text-white"
            >
              Browse all live cameras →
            </a>
            <a
              href="/cameras/countries"
              className="rounded-lg border border-white/10 bg-black/40 px-4 py-2 text-sm text-white/85 transition hover:bg-black/60 hover:text-white"
            >
              Cameras by country →
            </a>
            <a
              href="/city-webcams"
              className="rounded-lg border border-white/10 bg-black/40 px-4 py-2 text-sm text-white/85 transition hover:bg-black/60 hover:text-white"
            >
              City webcams →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
