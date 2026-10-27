import Link from "next/link";
import type { RelatedSuggestion } from "@/lib/related-searches";

/**
 * RelatedSearches (INTENT-AND-CLUSTERS §6, chunk C9) — the
 * "searches this place's visitors run next" block on place pages.
 * Suggestions arrive fully built from lib/related-searches (data-
 * gated, de-duplicated against the page's other blocks); this
 * component only renders. Shape is deliberately a plain link list
 * with one-line factual subtexts — NOT the card grid the cluster
 * blocks use — so the page never reads as two ad blocks (§6.3).
 * Placement: after the grid + breakdown, before the FAQs. Renders
 * nothing below the lib's min-3 gate.
 */

const HEADING_FRAMES: Array<(place: string) => string> = [
  (p) => `Keep exploring ${p}`,
  (p) => `More ways to look at ${p}`,
  (p) => `Searches ${p} visitors run next`,
];

function headingFor(placeName: string): string {
  let sum = 0;
  for (let i = 0; i < placeName.length; i++) sum += placeName.charCodeAt(i);
  return HEADING_FRAMES[sum % HEADING_FRAMES.length](placeName);
}

export default function RelatedSearches({
  placeName,
  suggestions,
}: {
  placeName: string;
  suggestions: RelatedSuggestion[];
}) {
  if (suggestions.length < 3) return null;
  return (
    <section className="mt-12">
      <h2 className="text-xl md:text-2xl font-bold mb-2">
        {headingFor(placeName)}
      </h2>
      <p className="text-sm text-white/45 leading-relaxed max-w-3xl mb-4">
        Drawn from what this index actually holds for {placeName} — its
        camera kinds, its areas and its nearest neighbours.
      </p>
      <ul className="border-y border-white/[0.07] divide-y divide-white/[0.07] max-w-3xl">
        {suggestions.map((s) => (
          <li key={s.href} className="py-3.5">
            <Link
              href={s.href}
              className="font-medium text-white/85 hover:text-[#00E5FF] hover:underline transition"
            >
              {s.anchor}
            </Link>
            <span className="block text-sm text-white/40 mt-0.5">
              {s.subtext}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
