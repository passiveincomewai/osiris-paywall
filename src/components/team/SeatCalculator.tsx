"use client";

/**
 * SeatCalculator — reusable Team Access seat pricing calculator.
 *
 * Pure math comes from @/lib/team/pricing (graduated tiers, never
 * retroactive). Fires team_pricing_viewed on mount and
 * seat_slider_adjusted when a slider change settles.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Users } from "lucide-react";
import {
  averageSeatCents,
  nextSeatUnitCents,
  nextTierDrop,
  savingsVsIndividualCents,
  seatBreakdown,
  seatCostCents,
  totalCents,
  type Cycle,
  type TierBand,
} from "@/lib/team/pricing";
import { trackAnalyticsEvent } from "@/components/AnalyticsTracker";

/** Format integer cents as $X.XX. */
export function fmtCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export const CYCLE_SUFFIX: Record<Cycle, string> = {
  weekly: "/week",
  monthly: "/month",
  annual: "/year",
};

export const CYCLE_LABEL: Record<Cycle, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  annual: "Annual",
};

export interface SeatCalculatorProps {
  cycle: Cycle;
  tiers: TierBand[];
  baseCents: number;
  maxSeats?: number;
  initialSeats?: number;
  ctaLabel: string;
  onCta?: (seats: number) => void;
  disabledReason?: string;
}

export default function SeatCalculator({
  cycle,
  tiers,
  baseCents,
  maxSeats = 50,
  initialSeats = 0,
  ctaLabel,
  onCta,
  disabledReason,
}: SeatCalculatorProps) {
  const clamp = (n: number) =>
    Number.isFinite(n) ? Math.min(maxSeats, Math.max(0, Math.floor(n))) : 0;
  const [seats, setSeats] = useState<number>(() => clamp(initialSeats));
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewedRef = useRef(false);

  // Re-seed when the parent loads a different starting point (e.g. the
  // billing tab learning the org's current purchased seats).
  useEffect(() => {
    setSeats(clamp(initialSeats));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSeats, maxSeats]);

  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    trackAnalyticsEvent("team_pricing_viewed");
  }, []);

  useEffect(
    () => () => {
      if (settleRef.current) clearTimeout(settleRef.current);
    },
    [],
  );

  function handleSeats(next: number) {
    const value = clamp(next);
    setSeats(value);
    if (settleRef.current) clearTimeout(settleRef.current);
    settleRef.current = setTimeout(() => {
      trackAnalyticsEvent("seat_slider_adjusted", String(value));
    }, 450);
  }

  const seatCost = seatCostCents(tiers, seats);
  const total = totalCents(baseCents, tiers, seats);
  const breakdown = useMemo(() => seatBreakdown(tiers, seats), [tiers, seats]);
  const avg = averageSeatCents(tiers, seats);
  const savings = savingsVsIndividualCents(baseCents, tiers, seats);
  const nextSeat = nextSeatUnitCents(tiers, seats);
  const drop = nextTierDrop(tiers, seats);
  const suffix = CYCLE_SUFFIX[cycle];

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5 md:p-6 w-full min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-4.5 h-4.5 text-[#D4AF37]" />
        <h3 className="text-base font-bold">Team seats</h3>
      </div>
      <p className="text-xs text-white/45 mb-5">
        Add seats to your {CYCLE_LABEL[cycle]} plan — one seat per additional team member.
      </p>

      {/* Slider + numeric readout */}
      <div className="flex items-center gap-3 sm:gap-4">
        <input
          type="range"
          min={0}
          max={maxSeats}
          step={1}
          value={seats}
          onChange={(e) => handleSeats(Number(e.target.value))}
          aria-label="Additional team seats"
          className="flex-1 min-w-0 accent-[#D4AF37] h-2 cursor-pointer"
        />
        <div className="flex items-center gap-2 shrink-0">
          <input
            type="number"
            min={0}
            max={maxSeats}
            value={seats}
            onChange={(e) => handleSeats(Number(e.target.value))}
            aria-label="Additional team seats (number)"
            className="w-16 rounded-xl bg-white/5 border border-white/10 px-2.5 py-2 text-sm text-center outline-none focus:border-[#00E5FF]/60"
          />
          <span className="text-xs text-white/40 whitespace-nowrap">/ {maxSeats}</span>
        </div>
      </div>

      <dl className="mt-5 space-y-2.5 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-white/55">Additional members</dt>
          <dd className="font-semibold">{seats}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-white/55">Total users (incl. you, the owner)</dt>
          <dd className="font-semibold">{seats + 1}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-white/55">Your base plan</dt>
          <dd className="font-semibold">
            {fmtCents(baseCents)}
            <span className="text-white/40 font-normal">{suffix}</span>
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-white/55 pt-0.5">Seat cost</dt>
          <dd className="font-semibold text-right">
            {fmtCents(seatCost)}
            <span className="text-white/40 font-normal">{suffix}</span>
            {breakdown.length > 0 && (
              <ul className="mt-1.5 space-y-1 text-xs font-normal text-white/50">
                {breakdown.map((b) => (
                  <li key={b.from} className="flex items-center justify-between gap-4">
                    <span>
                      Seats {b.from}–{b.to} × {fmtCents(b.unitCents)}
                    </span>
                    <span>{fmtCents(b.subtotalCents)}</span>
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
        {seats > 0 && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-white/55">Average per seat</dt>
            <dd className="font-semibold">
              {fmtCents(avg)}
              <span className="text-white/40 font-normal">{suffix}</span>
            </dd>
          </div>
        )}
      </dl>

      <div className="my-4 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />

      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] font-bold tracking-[0.2em] text-white/40">TOTAL</p>
          <p className="text-3xl font-bold tracking-tight">
            {fmtCents(total)}
            <span className="text-base text-white/45 font-normal">{suffix}</span>
          </p>
        </div>
        {savings > 0 && (
          <p className="text-xs font-semibold text-emerald-300 bg-emerald-400/10 border border-emerald-400/25 rounded-full px-3 py-1.5">
            Save {fmtCents(savings)}{suffix} vs individual subscriptions
          </p>
        )}
      </div>

      <div className="mt-4 space-y-1 text-xs text-white/45">
        {nextSeat !== null && seats < maxSeats && (
          <p>
            Next seat: <span className="text-white/75 font-semibold">{fmtCents(nextSeat)}{suffix}</span>
            {drop && (
              <>
                {" "}· next discount at {seats + drop.seatsUntil} seats ({fmtCents(drop.unitCents)} per seat)
              </>
            )}
          </p>
        )}
        <p className="text-[#D4AF37]/90 font-medium">
          Discounts automatically increase as your team grows.
        </p>
      </div>

      {onCta && (
        <button
          type="button"
          disabled={!!disabledReason}
          onClick={() => onCta(seats)}
          className="mt-5 w-full px-5 py-3 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {ctaLabel}
        </button>
      )}
      {disabledReason && (
        <p className="mt-2.5 text-xs text-white/45 text-center">{disabledReason}</p>
      )}
    </div>
  );
}
