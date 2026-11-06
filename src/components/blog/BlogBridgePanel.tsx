import Link from "next/link";

/**
 * Blog → product bridge panel (2026-11-05): posts were a dead end —
 * exactly one blog-landing session had ever reached /pricing. Every
 * post now ends with the same honest exit into the live product:
 * a real screenshot of the WorldEye camera map
 * (/blog/world-live-cameras.jpg — the existing cover asset of the
 * world-live-cameras post, an actual capture of the live map's
 * Chicago camera field), then the live globe and the camera index.
 * No pricing copy, no discount, no urgency. This replaces the old
 * text-only end-of-post CTA card (whose /pricing button was the
 * dead end being measured). Topic-specific paths stay with
 * WatchLiveModule above; this panel is the universal floor.
 */
export default function BlogBridgePanel() {
  return (
    <section className="mt-16 overflow-hidden rounded-3xl border border-[#D4AF37]/30 bg-white/[0.02]">
      <img
        src="/blog/world-live-cameras.jpg"
        alt="Screenshot of the WorldEye live camera map around Chicago, with live camera markers across the region"
        width={1200}
        height={630}
        loading="lazy"
        className="w-full h-auto"
      />
      <div className="bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent p-8 md:p-10 text-center">
        <h2 className="text-2xl font-bold">See it live on WorldEye</h2>
        <p className="text-white/55 mt-3 max-w-md mx-auto">
          This post is a snapshot — the planet keeps moving. The cameras,
          flights and events WorldEye tracks are streaming on the live
          globe right now.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-7 py-3.5 rounded-2xl bg-[#D4AF37] text-black font-bold hover:brightness-110 transition text-center"
          >
            Open the live globe
          </Link>
          <Link
            href="/live-webcams"
            className="px-7 py-3.5 rounded-2xl border border-white/15 font-semibold text-white/80 hover:bg-white/5 transition text-center"
          >
            Browse live cameras
          </Link>
        </div>
      </div>
    </section>
  );
}
