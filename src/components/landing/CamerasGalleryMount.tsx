"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import IoGate from "./IoGate";

function GallerySkeleton() {
  return (
    <div className="mt-10" aria-hidden>
      <div className="flex gap-2 pb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 w-24 rounded-full bg-white/[0.05] animate-pulse motion-reduce:animate-none" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className={`rounded-2xl border border-white/5 bg-white/[0.03] animate-pulse motion-reduce:animate-none aspect-video ${i === 0 ? "md:col-span-2" : ""}`}
          />
        ))}
      </div>
    </div>
  );
}

const CameraGallery = dynamic(() => import("./CameraGallery"), {
  ssr: false,
  loading: () => <GallerySkeleton />,
});

/**
 * Mount point for the Section 1 gallery island. The static category cards
 * (server-rendered, passed in as fallback) are what crawlers and no-JS
 * visitors get; the island replaces them only when the section approaches
 * the viewport, so its JS never enters the homepage's initial bundle.
 */
export default function CamerasGalleryMount({ fallback }: { fallback: ReactNode }) {
  return (
    <IoGate fallback={fallback} rootMargin="900px">
      <CameraGallery />
    </IoGate>
  );
}
