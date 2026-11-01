"use client";

// DemoVideoSlot — renders the demo video an admin placed in this page
// slot from the AI Demo Studio (Admin → Demo Studio → Add to Website).
// Fetches the placement client-side so host pages keep their rendering
// mode and pay nothing when the slot is empty: no placement ⇒ renders
// nothing at all. When placed, the player is a plain responsive
// <video> with a poster and preload="none" — it costs no bandwidth or
// main-thread time until a visitor presses play, and it never touches
// the globe or hero.

import { useEffect, useState } from "react";

interface PlacedVideo {
  title: string;
  description: string | null;
  videoUrl: string;
  posterUrl: string | null;
  orientation: string;
}

export default function DemoVideoSlot({ page, slot, heading }: { page: string; slot: string; heading?: string }) {
  const [video, setVideo] = useState<PlacedVideo | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/demo-studio/placement?page=${encodeURIComponent(page)}&slot=${encodeURIComponent(slot)}`)
      .then((r) => (r.ok ? r.json() : { video: null }))
      .then((d) => { if (live) setVideo(d.video ?? null); })
      .catch(() => {});
    return () => { live = false; };
  }, [page, slot]);

  if (!video) return null;

  return (
    <section aria-label={video.title} className="mx-auto w-full max-w-4xl px-4 py-10">
      {heading && <h2 className="mb-4 text-center text-xl font-semibold text-white">{heading}</h2>}
      <div className={`overflow-hidden rounded-2xl border border-white/10 bg-black ${video.orientation === "portrait" ? "mx-auto aspect-[9/16] max-w-sm" : video.orientation === "square" ? "mx-auto aspect-square max-w-xl" : "aspect-video"}`}>
        <video
          src={video.videoUrl}
          poster={video.posterUrl ?? undefined}
          controls
          preload="none"
          playsInline
          className="h-full w-full"
          aria-label={video.title}
        />
      </div>
      {video.description && <p className="mt-3 text-center text-sm text-white/60">{video.description}</p>}
    </section>
  );
}
