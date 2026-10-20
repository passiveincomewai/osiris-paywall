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
      <p className={`font-mono text-[11px] font-medium tracking-[0.3em] uppercase ${eyebrowClass}`}>
        {eyebrow}
      </p>
      <h2 className="font-display text-4xl md:text-5xl font-medium leading-[1.08] tracking-[-0.01em] mt-4">{title}</h2>
      {sub && (
        <p className="text-base md:text-lg text-white/60 leading-relaxed mt-4 max-w-2xl">
          {sub}
        </p>
      )}
    </Reveal>
  );
}
