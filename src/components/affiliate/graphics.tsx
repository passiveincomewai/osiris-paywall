// ── Affiliate vector graphics ─────────────────────────────────────────────
// Hand-crafted SVG artwork for the affiliate panel, replacing the emoji
// placeholders the UI used to render. One design system throughout:
//   · 48×48 grid, round caps/joins, 2.3-unit stroke in the rank's color
//   · the WorldEye eye + orbit motif, opening up rank by rank
//   · cyan family for the early ranks, gold for Visionary (per-rank colors
//     still come from lib/affiliate/ranks.ts — this file only draws)
// Legible from 24px (leaderboard rows) to 96px (dashboard rank card).
// No raster images, no emoji.

interface ArtProps {
  color: string;
  size?: number;
  className?: string;
}

const EYE = "M5 24C11 13.5 17.5 9 24 9s13 4.5 19 15c-6 10.5-12.5 15-19 15S11 34.5 5 24Z";

/** Four-point sparkle path centered on (cx, cy) with radius s. */
function sparkle(cx: number, cy: number, s: number): string {
  const k = Number((s * 0.18).toFixed(2));
  return (
    `M${cx} ${cy - s}C${cx + k} ${cy - k} ${cx + k} ${cy - k} ${cx + s} ${cy}` +
    `C${cx + k} ${cy + k} ${cx + k} ${cy + k} ${cx} ${cy + s}` +
    `C${cx - k} ${cy + k} ${cx - k} ${cy + k} ${cx - s} ${cy}` +
    `C${cx - k} ${cy - k} ${cx - k} ${cy - k} ${cx} ${cy - s}Z`
  );
}

function Orbit({ color, rotate, opacity = 0.55 }: { color: string; rotate: number; opacity?: number }) {
  return (
    <>
      <ellipse cx="24" cy="24" rx="21" ry="8.5" transform={`rotate(${rotate} 24 24)`}
        fill="none" stroke={color} strokeWidth="1.6" opacity={opacity} />
      <circle cx={rotate < 0 ? 6.4 : 41.6} cy="30.6" r="2.1" fill={color} stroke="none" />
    </>
  );
}

function EyeCore({ color, irisR = 7 }: { color: string; irisR?: number }) {
  return (
    <>
      <path d={EYE} fill="none" stroke={color} strokeWidth="2.3" />
      <circle cx="24" cy="24" r={irisR} fill="none" stroke={color} strokeWidth="2.1" />
      <circle cx="24" cy="24" r="2.8" fill={color} stroke="none" />
    </>
  );
}

/** The plain WorldEye eye mark — empty states, perk chips, generic use. */
export function EyeMark({ color, size = 32, className }: ArtProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true"
      fill="none" strokeLinecap="round" strokeLinejoin="round">
      <Orbit color={color} rotate={-16} />
      <EyeCore color={color} />
    </svg>
  );
}

const RANK_ART: Record<string, (color: string) => React.ReactNode> = {
  // Explorer — the eye opens: eye + a single orbit, one satellite.
  explorer: (color) => (
    <>
      <Orbit color={color} rotate={-16} />
      <EyeCore color={color} />
    </>
  ),
  // Scout — crosshair ticks around the iris: watching, ranging, reporting.
  scout: (color) => (
    <>
      <Orbit color={color} rotate={-16} opacity={0.45} />
      <EyeCore color={color} />
      <path d="M24 12.5v3.4M24 32.1v3.4M12.5 24h3.4M32.1 24h3.4" stroke={color} strokeWidth="2.3" fill="none" />
    </>
  ),
  // Analyst — a dashed data ring + signal arc segment around the eye.
  analyst: (color) => (
    <>
      <circle cx="24" cy="24" r="15.5" fill="none" stroke={color} strokeWidth="1.7"
        strokeDasharray="3.5 4.2" opacity={0.75} />
      <path d="M26.7 9.1A15.5 15.5 0 0 1 39.3 21.7" fill="none" stroke={color} strokeWidth="2.4" />
      <circle cx="8.5" cy="24" r="1.7" fill={color} stroke="none" />
      <EyeCore color={color} />
    </>
  ),
  // Commander — twin orbits crossing + a command star riding the top.
  commander: (color) => (
    <>
      <Orbit color={color} rotate={-16} opacity={0.5} />
      <Orbit color={color} rotate={16} opacity={0.5} />
      <EyeCore color={color} />
      <path d={sparkle(24, 5.2, 3.4)} fill={color} stroke="none" />
    </>
  ),
  // Elite — the eye set in a faceted diamond frame, one cut-glass sparkle.
  elite: (color) => (
    <>
      <path d="M24 3.5L44.5 24L24 44.5L3.5 24Z" fill="none" stroke={color} strokeWidth="1.9" opacity={0.85} />
      <path d="M24 3.5L33 24L24 44.5L15 24Z" fill="none" stroke={color} strokeWidth="1.2" opacity={0.4} />
      <EyeCore color={color} irisR={6.4} />
      <path d={sparkle(38.5, 9.5, 2.7)} fill={color} stroke="none" />
    </>
  ),
  // Visionary — full radiance: rays, twin orbits, twin stars, the open eye.
  visionary: (color) => (
    <>
      <path d="M35.5 24h3M32.1 32.1l2.2 2.2M24 35.5v3M15.9 32.1l-2.2 2.2M12.5 24h-3M15.9 15.9l-2.2-2.2M24 12.5v-3M32.1 15.9l2.2-2.2"
        stroke={color} strokeWidth="2.1" fill="none" />
      <Orbit color={color} rotate={-16} opacity={0.6} />
      <Orbit color={color} rotate={16} opacity={0.6} />
      <EyeCore color={color} />
      <path d={sparkle(8, 7.5, 3)} fill={color} stroke="none" />
      <path d={sparkle(40, 7.5, 3)} fill={color} stroke="none" />
    </>
  ),
};

/**
 * Vector badge for an affiliate rank. `rank` accepts the rank key or the
 * display name (case-insensitive); unknown ranks get the plain eye mark.
 */
export function RankArt({ rank, color, size = 40, className }: ArtProps & { rank: string }) {
  const draw = RANK_ART[rank.trim().toLowerCase()] ?? null;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true"
      fill="none" strokeLinecap="round" strokeLinejoin="round">
      {draw ? draw(color) : (
        <>
          <Orbit color={color} rotate={-16} />
          <EyeCore color={color} />
        </>
      )}
    </svg>
  );
}

/** Medal mark for the Studio badges strip — medallion + ribbon tails. */
export function MedalMark({ color, size = 16, className }: ArtProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true"
      fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.5 27.5L14 42l6-3.2L24 44l4-5.2L34 42l-3.5-14.5" opacity={0.85} />
      <circle cx="24" cy="19" r="11" />
      <circle cx="24" cy="19" r="5.2" opacity={0.7} />
    </svg>
  );
}

/** Podium medallion for leaderboard places 1–3, numbered in the metal color. */
export function PodiumMedal({ place, color, size = 30, className }: ArtProps & { place: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true"
      fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 32.5L13.5 44l6.5-2.8L24 45l4-3.8L34.5 44L31.5 32.5" opacity={0.8} />
      <circle cx="24" cy="21" r="13.5" />
      <circle cx="24" cy="21" r="10" opacity={0.45} strokeWidth="1.4" />
      <text x="24" y="26.5" textAnchor="middle" fontSize="14" fontWeight="800"
        fill={color} stroke="none" fontFamily="ui-monospace, monospace">{place}</text>
    </svg>
  );
}
