import Link from "next/link";
import { US_MAP_STATES, US_MAP_VIEWBOX } from "@/lib/us-state-map";

/**
 * The clickable United States map on the United States pages: every
 * state is a real link to its state page (/us-traffic-cameras/[state]),
 * drawn from the site's own Census boundary polygons (lib/us-state-map)
 * rather than a stock artwork file. Server-rendered, so every state
 * link is in the page HTML. Fill depth follows the state's camera
 * count on a log scale — Florida's 4,935 feeds read darker than Rhode
 * Island's 1 without the small states vanishing — and the exact count
 * rides in each link's accessible name and <title> tooltip.
 *
 * The searchable state list (UsStateBrowser) always sits beside this
 * map: small states are labelled with leader lines here, and the list
 * remains the fully accessible route to every state page.
 */
export interface UsMapStateCount {
  slug: string;
  count: number;
}

export default function UsStateMap({
  counts,
}: {
  counts: readonly UsMapStateCount[];
}) {
  const bySlug = new Map(counts.map((c) => [c.slug, c.count]));
  const max = Math.max(1, ...counts.map((c) => c.count));
  const logMax = Math.log10(max + 1);

  return (
    <figure className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:p-6">
      <svg
        viewBox={`0 0 ${US_MAP_VIEWBOX.width} ${US_MAP_VIEWBOX.height}`}
        role="group"
        aria-label="Map of the United States — every state links to its camera page"
        className="w-full h-auto"
      >
        {US_MAP_STATES.map((s) => {
          const count = bySlug.get(s.slug);
          if (count === undefined) return null;
          const depth = Math.log10(count + 1) / logMax; // 0..1
          const fillOpacity = 0.05 + depth * 0.38;
          const label = `${s.name} — ${count.toLocaleString("en-US")} cameras`;
          const offset =
            Math.abs(s.labelX - s.anchorX) > 1 ||
            Math.abs(s.labelY - s.anchorY) > 1;
          return (
            <g key={s.slug}>
              {offset && (
                <line
                  x1={s.anchorX}
                  y1={s.anchorY}
                  x2={s.labelX}
                  y2={s.labelY}
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth={0.7}
                  aria-hidden="true"
                />
              )}
              <Link
                href={`/us-traffic-cameras/${s.slug}`}
                aria-label={label}
                className="group outline-none"
              >
                <title>{label}</title>
                {s.isMarker ? (
                  <rect
                    x={s.anchorX - 4.5}
                    y={s.anchorY - 4.5}
                    width={9}
                    height={9}
                    transform={`rotate(45 ${s.anchorX} ${s.anchorY})`}
                    fill="#D4AF37"
                    fillOpacity={0.55 + depth * 0.45}
                    stroke="rgba(255,255,255,0.55)"
                    strokeWidth={0.8}
                    className="transition group-hover:fill-[#D4AF37] group-focus-visible:fill-[#D4AF37]"
                  />
                ) : (
                  <path
                    d={s.path}
                    fill="#D4AF37"
                    fillOpacity={fillOpacity}
                    stroke="rgba(255,255,255,0.28)"
                    strokeWidth={0.8}
                    strokeLinejoin="round"
                    className="transition group-hover:fill-opacity-[0.55] group-focus-visible:fill-opacity-[0.55]"
                  />
                )}
              </Link>
              <text
                x={s.labelX}
                y={s.labelY}
                textAnchor="middle"
                dominantBaseline="central"
                aria-hidden="true"
                className="pointer-events-none fill-white/75"
                fontSize={s.isMarker || offset ? 10.5 : 11.5}
                fontWeight={600}
                style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
              >
                {s.usps}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-3 text-xs text-white/40 leading-relaxed">
        Every state is a button: pick one to open its live camera page. Darker
        gold means more cameras — the exact count is in each state&apos;s name
        and in the list below. Alaska and Hawaii are inset at adjusted scales;
        the District of Columbia is the gold diamond beside Maryland.
      </figcaption>
    </figure>
  );
}
