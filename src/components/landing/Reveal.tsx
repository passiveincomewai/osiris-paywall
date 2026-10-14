"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/** The app's own easing curve (page.tsx's HUD_EASE) — one motion language. */
export const HUD_EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Scroll-triggered reveal for the landing sections below the globe.
 * Fades content up as it enters the viewport, once. Transform/opacity only,
 * so it never costs layout. Reduced-motion visitors get the content static.
 */
export default function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.7, ease: HUD_EASE, delay }}
    >
      {children}
    </motion.div>
  );
}
