// Team Access pricing — PURE module (no db, no env, no I/O).
//
// A paying subscriber adds extra seats to their existing Stripe
// subscription as a graduated-tier line item: seat #1 costs the first
// band's unit price, seat #6 the second band's, and so on. Pricing is
// GRADUATED, never retroactive — buying more seats never re-prices the
// seats already bought. All amounts are integer cents.

export type Cycle = "weekly" | "monthly" | "annual";

export interface TierBand {
  /** Last seat number (1-based) charged at this band's price; null = open-ended. */
  upTo: number | null;
  /** Price per seat per cycle, in cents. */
  unitCents: number;
}

/** Default graduated tiers: unit $ per seat per cycle, by band. */
export const DEFAULT_TIERS: Record<Cycle, TierBand[]> = {
  weekly: [
    { upTo: 5, unitCents: 699 },
    { upTo: 10, unitCents: 649 },
    { upTo: 20, unitCents: 599 },
    { upTo: 35, unitCents: 549 },
    { upTo: null, unitCents: 499 },
  ],
  monthly: [
    { upTo: 5, unitCents: 1199 },
    { upTo: 10, unitCents: 1099 },
    { upTo: 20, unitCents: 999 },
    { upTo: 35, unitCents: 899 },
    { upTo: null, unitCents: 799 },
  ],
  annual: [
    { upTo: 5, unitCents: 5999 },
    { upTo: 10, unitCents: 5499 },
    { upTo: 20, unitCents: 4999 },
    { upTo: 35, unitCents: 4499 },
    { upTo: null, unitCents: 3999 },
  ],
};

/** Base subscription price per cycle, in cents (the owner's own plan). */
export const BASE_CENTS: Record<Cycle, number> = {
  weekly: 799,
  monthly: 1399,
  annual: 7499,
};

export const CYCLES: readonly Cycle[] = ["weekly", "monthly", "annual"];

/** Clamp a seat count to a non-negative integer. */
function clampSeats(seats: number): number {
  if (!Number.isFinite(seats)) return 0;
  return Math.max(0, Math.floor(seats));
}

export interface SeatBandBreakdown {
  /** First seat number (1-based) in this band slice. */
  from: number;
  /** Last seat number (1-based) in this band slice. */
  to: number;
  count: number;
  unitCents: number;
  subtotalCents: number;
}

/**
 * Per-band breakdown of a graduated seat purchase. Only bands that
 * actually contribute seats are included.
 */
export function seatBreakdown(
  tiers: TierBand[],
  seats: number,
): SeatBandBreakdown[] {
  const total = clampSeats(seats);
  const out: SeatBandBreakdown[] = [];
  let prevUpTo = 0;
  let remaining = total;
  for (const band of tiers) {
    if (remaining <= 0) break;
    const capacity =
      band.upTo === null ? remaining : Math.max(0, band.upTo - prevUpTo);
    const count = Math.min(remaining, capacity);
    if (count > 0) {
      out.push({
        from: prevUpTo + 1,
        to: prevUpTo + count,
        count,
        unitCents: band.unitCents,
        subtotalCents: count * band.unitCents,
      });
      remaining -= count;
    }
    if (band.upTo !== null) prevUpTo = band.upTo;
  }
  return out;
}

/** Graduated cost in cents of `seats` seats under the given tier table. */
export function seatCostCents(tiers: TierBand[], seats: number): number {
  return seatBreakdown(tiers, seats).reduce(
    (sum, b) => sum + b.subtotalCents,
    0,
  );
}

/** Base subscription + graduated seat cost, in cents. */
export function totalCents(
  baseCents: number,
  tiers: TierBand[],
  seats: number,
): number {
  return baseCents + seatCostCents(tiers, seats);
}

/** Average price paid per seat, in cents (rounded). 0 seats → 0. */
export function averageSeatCents(tiers: TierBand[], seats: number): number {
  const n = clampSeats(seats);
  if (n === 0) return 0;
  return Math.round(seatCostCents(tiers, n) / n);
}

/**
 * What graduated seats save versus buying each seat as its own
 * individual subscription on the same cycle (seats × base − seat cost).
 */
export function savingsVsIndividualCents(
  baseCents: number,
  tiers: TierBand[],
  seats: number,
): number {
  const n = clampSeats(seats);
  return n * baseCents - seatCostCents(tiers, n);
}

/** The band a given 1-based seat number falls into, or null if beyond all bands. */
function bandForSeat(tiers: TierBand[], seatNumber: number): TierBand | null {
  for (const band of tiers) {
    if (band.upTo === null || seatNumber <= band.upTo) return band;
  }
  return null;
}

/**
 * Unit price of the next seat (seat number currentSeats + 1). The last
 * band is open-ended, so there is always a next-seat price when the
 * table ends in a null band; null only for a table whose bands all end.
 */
export function nextSeatUnitCents(
  tiers: TierBand[],
  currentSeats: number,
): number | null {
  const band = bandForSeat(tiers, clampSeats(currentSeats) + 1);
  return band ? band.unitCents : null;
}

export interface NextTierDrop {
  /** Additional seats to buy before the cheaper band's price applies. */
  seatsUntil: number;
  /** Unit price of that cheaper band, in cents. */
  unitCents: number;
}

/**
 * The next band cheaper than the one the next seat falls into, and how
 * many more seats must be bought before that cheaper price applies.
 * Null when the next seat is already in the last (cheapest) band.
 */
export function nextTierDrop(
  tiers: TierBand[],
  currentSeats: number,
): NextTierDrop | null {
  const current = clampSeats(currentSeats);
  for (let i = 0; i < tiers.length; i++) {
    const band = tiers[i];
    const isCurrentBand = band.upTo === null || current + 1 <= band.upTo;
    if (!isCurrentBand) continue;
    // Find the next strictly cheaper band after this one.
    let bandStart = (band.upTo ?? current) + 1;
    for (let j = i + 1; j < tiers.length; j++) {
      if (tiers[j].unitCents < band.unitCents) {
        return { seatsUntil: bandStart - current, unitCents: tiers[j].unitCents };
      }
      const nextUpTo = tiers[j].upTo;
      if (nextUpTo !== null) bandStart = nextUpTo + 1;
    }
    return null;
  }
  return null;
}

/**
 * Structural validation of a tier table: a non-empty array of bands with
 * positive integer unit cents, strictly ascending `upTo` values, and
 * exactly one null `upTo` — on the last band (the open-ended band).
 */
export function validateTierTable(tiers: unknown): tiers is TierBand[] {
  if (!Array.isArray(tiers) || tiers.length === 0) return false;
  let prevUpTo = 0;
  for (let i = 0; i < tiers.length; i++) {
    const band = tiers[i] as Partial<TierBand> | null;
    if (band === null || typeof band !== "object") return false;
    if (
      typeof band.unitCents !== "number" ||
      !Number.isFinite(band.unitCents) ||
      band.unitCents <= 0
    ) {
      return false;
    }
    const isLast = i === tiers.length - 1;
    if (isLast) {
      if (band.upTo !== null) return false;
    } else {
      if (
        typeof band.upTo !== "number" ||
        !Number.isInteger(band.upTo) ||
        band.upTo <= prevUpTo
      ) {
        return false;
      }
      prevUpTo = band.upTo;
    }
  }
  return true;
}
