"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import IoGate from "./IoGate";

const TrackingDemo = dynamic(() => import("./TrackingDemo"), {
  ssr: false,
  loading: () => (
    <div className="aspect-video rounded-2xl border border-white/5 bg-white/[0.03] animate-pulse motion-reduce:animate-none" aria-hidden />
  ),
});

/**
 * Mount point for the Section 2 demo stage. The fallback (a still frame
 * from the product's intro film) is server-rendered; the recorded-globe
 * stage replaces it only when the section approaches the viewport.
 */
export default function TrackingDemoMount({ fallback }: { fallback: ReactNode }) {
  return (
    <IoGate fallback={fallback} rootMargin="900px">
      <TrackingDemo />
    </IoGate>
  );
}
