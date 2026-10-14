import type { ReactNode } from "react";
import Reveal from "./Reveal";

/**
 * Shared section header for the landing shell: eyebrow, H2 headline, one
 * subheading line. Copy discipline lives here — a section gets exactly
 * these three text elements above its visuals.
 */
export default function SectionHeader({
  eyebrow,
  eyebrowClass = "text-[#0096FF]",
  title,
  sub,
}: {
  eyebrow: string;
  eyebrowClass?: string;
  title: ReactNode;
  sub?: string;
}) {
  return (
    <Reveal>
      <p className={`text-[11px] font-bold tracking-[0.25em] uppercase ${eyebrowClass}`}>
        {eyebrow}
      </p>
      <h2 className="text-3xl md:text-4xl font-bold leading-tight mt-3">{title}</h2>
      {sub && (
        <p className="text-base md:text-lg text-white/60 leading-relaxed mt-3 max-w-2xl">
          {sub}
        </p>
      )}
    </Reveal>
  );
}
