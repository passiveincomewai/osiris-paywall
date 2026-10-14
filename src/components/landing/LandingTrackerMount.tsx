"use client";

import dynamic from "next/dynamic";
import IoGate from "./IoGate";

const LandingTracker = dynamic(() => import("./LandingTracker"), { ssr: false });

/**
 * Mount point for the landing analytics island. The gate watches the
 * whole shell: the tracker loads as the shell approaches the viewport,
 * which is also the earliest moment any landing event can occur.
 */
export default function LandingTrackerMount() {
  return (
    <IoGate fallback={null} rootMargin="1200px">
      <LandingTracker />
    </IoGate>
  );
}
