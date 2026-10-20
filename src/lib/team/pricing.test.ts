// Team Access pricing tests. Expected values are pinned in cents and
// cross-checked against an independent per-seat graduated computation
// written from first principles (walk seat by seat, find its band, add
// its unit price) — deliberately NOT the band-chunk math the module uses.
import { describe, it, expect } from "vitest";
import {
  BASE_CENTS,
  CYCLES,
  DEFAULT_TIERS,
  averageSeatCents,
  nextSeatUnitCents,
  nextTierDrop,
  savingsVsIndividualCents,
  seatBreakdown,
  seatCostCents,
  totalCents,
  validateTierTable,
  type Cycle,
  type TierBand,
} from "./pricing";

/** Independent graduated cost: price every seat individually. */
function independentSeatCost(tiers: TierBand[], seats: number): number {
  let sum = 0;
  for (let seat = 1; seat <= seats; seat++) {
    const band = tiers.find((b) => b.upTo === null || seat <= b.upTo);
    if (!band) throw new Error(`no band for seat ${seat}`);
    sum += band.unitCents;
  }
  return sum;
}

describe("default tables", () => {
  it("pins BASE_CENTS", () => {
    expect(BASE_CENTS).toEqual({ weekly: 799, monthly: 1399, annual: 7499 });
  });

  it("pins DEFAULT_TIERS bands and unit cents", () => {
    const shape = (cycle: Cycle) =>
      DEFAULT_TIERS[cycle].map((b) => [b.upTo, b.unitCents]);
    expect(shape("weekly")).toEqual([
      [5, 699],
      [10, 649],
      [20, 599],
      [35, 549],
      [null, 499],
    ]);
    expect(shape("monthly")).toEqual([
      [5, 1199],
      [10, 1099],
      [20, 999],
      [35, 899],
      [null, 799],
    ]);
    expect(shape("annual")).toEqual([
      [5, 5999],
      [10, 5499],
      [20, 4999],
      [35, 4499],
      [null, 3999],
    ]);
  });
});

describe("pinned totals (base + graduated seats)", () => {
  const monthly = DEFAULT_TIERS.monthly;
  const monthlyBase = BASE_CENTS.monthly;

  it.each([
    [1, 2598],
    [5, 7394],
    [10, 12889],
    [20, 22879],
    [25, 27374],
    [50, 48349],
  ])("monthly %i seats → total %i cents", (seats, expected) => {
    expect(totalCents(monthlyBase, monthly, seats)).toBe(expected);
    // And the pinned total must agree with the independent computation.
    expect(monthlyBase + independentSeatCost(monthly, seats)).toBe(expected);
  });

  it("monthly 12 seats: seatCost 13488, total 14887", () => {
    expect(seatCostCents(monthly, 12)).toBe(13488);
    expect(totalCents(monthlyBase, monthly, 12)).toBe(14887);
    expect(independentSeatCost(monthly, 12)).toBe(13488);
  });

  it("weekly 50 seats → total 29249", () => {
    expect(totalCents(BASE_CENTS.weekly, DEFAULT_TIERS.weekly, 50)).toBe(29249);
    expect(
      BASE_CENTS.weekly + independentSeatCost(DEFAULT_TIERS.weekly, 50),
    ).toBe(29249);
  });

  it("annual 50 seats → total 242449", () => {
    expect(totalCents(BASE_CENTS.annual, DEFAULT_TIERS.annual, 50)).toBe(
      242449,
    );
    expect(
      BASE_CENTS.annual + independentSeatCost(DEFAULT_TIERS.annual, 50),
    ).toBe(242449);
  });
});

describe("seatCostCents boundaries × all cycles", () => {
  const boundarySeats = [0, 1, 5, 6, 10, 11, 20, 21, 35, 36, 49, 50];

  for (const cycle of CYCLES) {
    it(`${cycle}: matches independent computation at every boundary`, () => {
      for (const seats of boundarySeats) {
        expect(seatCostCents(DEFAULT_TIERS[cycle], seats)).toBe(
          independentSeatCost(DEFAULT_TIERS[cycle], seats),
        );
      }
    });

    it(`${cycle}: totals strictly increase with seats`, () => {
      let prev = -Infinity;
      for (const seats of boundarySeats) {
        const total = totalCents(
          BASE_CENTS[cycle],
          DEFAULT_TIERS[cycle],
          seats,
        );
        expect(total).toBeGreaterThan(prev);
        prev = total;
      }
    });
  }

  it("0 seats costs 0 on every cycle", () => {
    for (const cycle of CYCLES) {
      expect(seatCostCents(DEFAULT_TIERS[cycle], 0)).toBe(0);
    }
  });

  it("clamps negative and fractional seat counts", () => {
    const monthly = DEFAULT_TIERS.monthly;
    expect(seatCostCents(monthly, -3)).toBe(0);
    expect(seatCostCents(monthly, 5.9)).toBe(seatCostCents(monthly, 5));
  });

  it("is graduated, never retroactive: seat 6 costs only band 2's unit on top of 5 seats", () => {
    const monthly = DEFAULT_TIERS.monthly;
    expect(seatCostCents(monthly, 6) - seatCostCents(monthly, 5)).toBe(1099);
    // The first 5 seats keep their band-1 price even at 50 seats.
    expect(seatBreakdown(monthly, 50)[0]).toMatchObject({
      count: 5,
      unitCents: 1199,
      subtotalCents: 5995,
    });
  });
});

describe("seatBreakdown", () => {
  it("monthly 12 seats splits 5 / 5 / 2 across the first three bands", () => {
    expect(seatBreakdown(DEFAULT_TIERS.monthly, 12)).toEqual([
      { from: 1, to: 5, count: 5, unitCents: 1199, subtotalCents: 5995 },
      { from: 6, to: 10, count: 5, unitCents: 1099, subtotalCents: 5495 },
      { from: 11, to: 12, count: 2, unitCents: 999, subtotalCents: 1998 },
    ]);
  });

  it("empty for 0 seats and sums to seatCostCents", () => {
    expect(seatBreakdown(DEFAULT_TIERS.monthly, 0)).toEqual([]);
    for (const cycle of CYCLES) {
      for (const seats of [1, 7, 20, 33, 50]) {
        const parts = seatBreakdown(DEFAULT_TIERS[cycle], seats);
        expect(parts.reduce((s, b) => s + b.count, 0)).toBe(seats);
        expect(parts.reduce((s, b) => s + b.subtotalCents, 0)).toBe(
          seatCostCents(DEFAULT_TIERS[cycle], seats),
        );
      }
    }
  });
});

describe("averageSeatCents", () => {
  it("0 seats → 0", () => {
    expect(averageSeatCents(DEFAULT_TIERS.monthly, 0)).toBe(0);
  });

  it("monthly 10 seats → 1149 (11490 / 10 exactly)", () => {
    expect(independentSeatCost(DEFAULT_TIERS.monthly, 10)).toBe(11490);
    expect(averageSeatCents(DEFAULT_TIERS.monthly, 10)).toBe(1149);
  });

  it("monthly 3 seats → 1199 (all in band 1)", () => {
    expect(averageSeatCents(DEFAULT_TIERS.monthly, 3)).toBe(1199);
  });
});

describe("savingsVsIndividualCents", () => {
  it("monthly 10 seats: seats × base − graduated cost, from first principles", () => {
    const graduated = independentSeatCost(DEFAULT_TIERS.monthly, 10);
    const expected = 10 * BASE_CENTS.monthly - graduated;
    expect(graduated).toBe(5 * 1199 + 5 * 1099); // 5995 + 5495 = 11490
    expect(expected).toBe(2500); // 13990 − 11490
    expect(
      savingsVsIndividualCents(BASE_CENTS.monthly, DEFAULT_TIERS.monthly, 10),
    ).toBe(expected);
  });

  it("0 seats → 0 savings; 1 seat saves base − band-1 unit", () => {
    expect(
      savingsVsIndividualCents(BASE_CENTS.monthly, DEFAULT_TIERS.monthly, 0),
    ).toBe(0);
    expect(
      savingsVsIndividualCents(BASE_CENTS.monthly, DEFAULT_TIERS.monthly, 1),
    ).toBe(1399 - 1199);
  });

  it("savings grow with seats on every cycle", () => {
    for (const cycle of CYCLES) {
      const s10 = savingsVsIndividualCents(
        BASE_CENTS[cycle],
        DEFAULT_TIERS[cycle],
        10,
      );
      const s50 = savingsVsIndividualCents(
        BASE_CENTS[cycle],
        DEFAULT_TIERS[cycle],
        50,
      );
      expect(s50).toBeGreaterThan(s10);
      expect(s10).toBeGreaterThan(0);
    }
  });
});

describe("nextSeatUnitCents", () => {
  const monthly = DEFAULT_TIERS.monthly;

  it("monthly: at 4 seats the next seat is band 1's 1199; at 5 seats it drops to 1099", () => {
    expect(nextSeatUnitCents(monthly, 4)).toBe(1199);
    expect(nextSeatUnitCents(monthly, 5)).toBe(1099);
  });

  it("monthly: band edges and the open-ended last band", () => {
    expect(nextSeatUnitCents(monthly, 0)).toBe(1199);
    expect(nextSeatUnitCents(monthly, 19)).toBe(999);
    expect(nextSeatUnitCents(monthly, 20)).toBe(899);
    expect(nextSeatUnitCents(monthly, 34)).toBe(899);
    expect(nextSeatUnitCents(monthly, 35)).toBe(799);
    // Last band is open-ended: still 799 far beyond it.
    expect(nextSeatUnitCents(monthly, 50)).toBe(799);
    expect(nextSeatUnitCents(monthly, 500)).toBe(799);
  });

  it("returns null only when every band has ended", () => {
    const closed: TierBand[] = [{ upTo: 3, unitCents: 500 }];
    expect(nextSeatUnitCents(closed, 2)).toBe(500);
    expect(nextSeatUnitCents(closed, 3)).toBeNull();
  });
});

describe("nextTierDrop", () => {
  const monthly = DEFAULT_TIERS.monthly;

  it("monthly at 4 seats: 2 more seats until the 1099 band (starts at seat 6)", () => {
    expect(nextTierDrop(monthly, 4)).toEqual({
      seatsUntil: 2,
      unitCents: 1099,
    });
  });

  it("monthly at 5 seats: next seat is already band 2; drop to 999 starts at seat 11", () => {
    expect(nextTierDrop(monthly, 5)).toEqual({
      seatsUntil: 6,
      unitCents: 999,
    });
  });

  it("monthly at 0 seats: 6 seats until the first drop", () => {
    expect(nextTierDrop(monthly, 0)).toEqual({
      seatsUntil: 6,
      unitCents: 1099,
    });
  });

  it("null once the next seat is in the last band", () => {
    expect(nextTierDrop(monthly, 35)).toBeNull();
    expect(nextTierDrop(monthly, 49)).toBeNull();
    expect(nextTierDrop(monthly, 50)).toBeNull();
  });
});

describe("validateTierTable", () => {
  it("accepts every default cycle table", () => {
    for (const cycle of CYCLES) {
      expect(validateTierTable(DEFAULT_TIERS[cycle])).toBe(true);
    }
  });

  it("rejects non-arrays and empty arrays", () => {
    expect(validateTierTable(null)).toBe(false);
    expect(validateTierTable("nope")).toBe(false);
    expect(validateTierTable([])).toBe(false);
  });

  it("rejects a last band that is not open-ended", () => {
    expect(validateTierTable([{ upTo: 5, unitCents: 100 }])).toBe(false);
  });

  it("rejects a null upTo before the last band", () => {
    expect(
      validateTierTable([
        { upTo: null, unitCents: 100 },
        { upTo: null, unitCents: 90 },
      ]),
    ).toBe(false);
  });

  it("rejects non-ascending upTo values", () => {
    expect(
      validateTierTable([
        { upTo: 10, unitCents: 100 },
        { upTo: 5, unitCents: 90 },
        { upTo: null, unitCents: 80 },
      ]),
    ).toBe(false);
    expect(
      validateTierTable([
        { upTo: 5, unitCents: 100 },
        { upTo: 5, unitCents: 90 },
        { upTo: null, unitCents: 80 },
      ]),
    ).toBe(false);
  });

  it("rejects non-positive unit cents", () => {
    expect(
      validateTierTable([
        { upTo: 5, unitCents: 0 },
        { upTo: null, unitCents: 80 },
      ]),
    ).toBe(false);
    expect(validateTierTable([{ upTo: null, unitCents: -1 }])).toBe(false);
  });
});
