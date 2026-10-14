"use client";

import dynamic from "next/dynamic";
import IoGate from "./IoGate";

const HazardsDemo = dynamic(() => import("./HazardsDemo"), {
  ssr: false,
  loading: () => (
    <div className="aspect-video rounded-2xl border border-white/5 bg-white/[0.03] animate-pulse motion-reduce:animate-none" aria-hidden />
  ),
});

/**
 * Mount point for the Section 3 stage + live panel. Until the section
 * approaches the viewport the shell shows just the section header and
 * calls to action (the crawler/no-JS state); the island then fills the
 * section's visual slot.
 */
export default function HazardsDemoMount() {
  return (
    <IoGate fallback={null} rootMargin="900px">
      <HazardsDemo />
    </IoGate>
  );
}
