// ── Rank ladder: XP thresholds → commission rates ─────────────────────────
// Admin-overridable via AffiliateSettings (see settings.ts); these are the
// shipped defaults from the program spec.

export interface RankDef {
  key: string;
  name: string;
  minXp: number;
  commissionPct: number; // direct (L1) commission percent
  discountPct: number;   // audience discount % off first payment via this rank's code
  color: string;   // accent hex
  glow: string;    // glow rgba
  badge: string;   // legacy emoji — kept for API compatibility; the UI renders
                   // vector RankArt (components/affiliate/graphics) keyed by rank
  tagline: string;
}

export const RANKS: RankDef[] = [
  { key: "explorer",  name: "Explorer",  minXp: 0,     commissionPct: 15, discountPct: 5, color: "#38bdf8", glow: "rgba(56,189,248,.45)",  badge: "🧭", tagline: "Every network starts with a single signal." },
  { key: "scout",     name: "Scout",     minXp: 1000,  commissionPct: 18, discountPct: 10, color: "#22d3ee", glow: "rgba(34,211,238,.45)",  badge: "🔭", tagline: "Your reach is expanding across the grid." },
  { key: "analyst",   name: "Analyst",   minXp: 3000,  commissionPct: 21, discountPct: 15, color: "#818cf8", glow: "rgba(129,140,248,.5)",  badge: "📡", tagline: "You read the network like an intelligence feed." },
  { key: "commander", name: "Commander", minXp: 7500,  commissionPct: 24, discountPct: 20, color: "#c084fc", glow: "rgba(192,132,252,.5)",  badge: "🎖️", tagline: "A growing force follows your signal." },
  { key: "elite",     name: "Elite",     minXp: 15000, commissionPct: 27, discountPct: 25, color: "#f472b6", glow: "rgba(244,114,182,.5)",  badge: "💠", tagline: "Top-tier operator. The grid knows your name." },
  { key: "visionary", name: "Visionary", minXp: 30000, commissionPct: 30, discountPct: 30, color: "#fbbf24", glow: "rgba(251,191,36,.55)",  badge: "👁️", tagline: "Maximum clearance. Maximum commission." },
];

export function rankFor(xp: number, ranks: RankDef[] = RANKS): RankDef {
  let cur = ranks[0];
  for (const r of ranks) if (xp >= r.minXp) cur = r;
  return cur;
}

export function nextRank(xp: number, ranks: RankDef[] = RANKS): RankDef | null {
  for (const r of ranks) if (xp < r.minXp) return r;
  return null;
}

export function rankProgress(xp: number, ranks: RankDef[] = RANKS): { pct: number; xpInto: number; xpNeeded: number } {
  const cur = rankFor(xp, ranks);
  const nxt = nextRank(xp, ranks);
  if (!nxt) return { pct: 100, xpInto: xp - cur.minXp, xpNeeded: 0 };
  const span = nxt.minXp - cur.minXp;
  return { pct: Math.min(100, ((xp - cur.minXp) / span) * 100), xpInto: xp - cur.minXp, xpNeeded: nxt.minXp - xp };
}

// ── Tiered audience discount codes ────────────────────────────────────────
// Every affiliate gets a personal Stripe promotion code whose % off the
// buyer's FIRST payment follows their rank (discountPct above). Approved
// creators (25k+ followers program) get a floor of CREATOR_DISCOUNT_PCT
// regardless of rank. Effective percent = max(rank, creator floor).

export const CREATOR_DISCOUNT_PCT = 20;

/**
 * Pure resolver: the discount percent an affiliate's code should carry.
 * `ranks` defaults to the shipped ladder; admin-overridden ladders pass
 * through with a fallback to the shipped percent for the resolved rank key
 * (settings rows saved before discountPct existed won't carry the field).
 */
export function discountPercentFor(
  input: { xp: number; creatorApproved: boolean },
  ranks: RankDef[] = RANKS,
): number {
  const rank = rankFor(input.xp, ranks);
  const rankPct =
    typeof rank.discountPct === "number"
      ? rank.discountPct
      : (RANKS.find((r) => r.key === rank.key)?.discountPct ?? 0);
  return input.creatorApproved ? Math.max(rankPct, CREATOR_DISCOUNT_PCT) : rankPct;
}

/** Stripe-safe code slug: uppercase [A-Z0-9] only, everything else stripped. */
export function sanitizeCodeSlug(slug: string): string {
  return slug.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Build the public code string `{SLUG}{PCT}` (e.g. JAMESON20) from an
 * affiliate's referral slug (customCode ?? referralCode) and percent.
 * Falls back to the brand slug if sanitization leaves nothing.
 */
export function buildDiscountCode(slug: string, pct: number): string {
  const clean = sanitizeCodeSlug(slug) || "WORLDEYE";
  return `${clean}${pct}`;
}
