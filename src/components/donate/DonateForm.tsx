"use client";

/**
 * Support WorldEye — step 1 (choose amount), shared verbatim by the
 * donation popup and the /support page ("same component" per spec).
 *
 * Layout per the owner's reference mockups (2026-11-09): satellite-
 * carpet header image with the heart badge + eyebrow + tagline,
 * gradient headline, One-time/Monthly toggle, four preset tiles
 * (radio group, $10 preselected with the SUGGESTED tag), an
 * other-amount field, the cyan gradient Donate button, the green-check
 * fine print, and the gold plans upsell box.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, X } from "lucide-react";
import type { DonateCopy } from "@/i18n/dictionaries";
import { LIVE_CAMERA_COUNT_LABEL } from "@/lib/site-stats";
import {
  DONATE_DEFAULT_AMOUNT,
  DONATE_PRESET_AMOUNTS,
  donateAmountDetail,
  validateDonateAmount,
  type DonateFrequency,
} from "@/lib/donate/config";
import { trackDonate } from "./donate-client";

export interface DonateSelection {
  amount: number;
  frequency: DonateFrequency;
}

export function HeartTile({ size = 44 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-xl border border-rose-300/40 bg-rose-500/15 shadow-[0_0_18px_rgba(251,113,133,0.35)]"
      style={{ width: size, height: size }}
    >
      <Heart
        style={{ width: size * 0.52, height: size * 0.52 }}
        className="fill-[#FB7185] text-[#FB7185]"
      />
    </span>
  );
}

export default function DonateForm({
  copy,
  initialAmount = DONATE_DEFAULT_AMOUNT,
  initialFrequency = "once",
  onDonate,
  onMaybeLater,
  onClose,
  autoFocusTiles = false,
}: {
  copy: DonateCopy;
  initialAmount?: number;
  initialFrequency?: DonateFrequency;
  onDonate: (selection: DonateSelection) => void;
  /** Rendered only inside the popup (the /support page has no dismiss). */
  onMaybeLater?: () => void;
  /** ✕ in the header (popup only). */
  onClose?: () => void;
  autoFocusTiles?: boolean;
}) {
  const [frequency, setFrequency] = useState<DonateFrequency>(initialFrequency);
  const [selected, setSelected] = useState<number | null>(
    (DONATE_PRESET_AMOUNTS as readonly number[]).includes(initialAmount)
      ? initialAmount
      : null,
  );
  const [custom, setCustom] = useState<string>(
    (DONATE_PRESET_AMOUNTS as readonly number[]).includes(initialAmount)
      ? ""
      : String(initialAmount),
  );
  const interacted = useRef(false);
  const lastTracked = useRef<string>("");
  const tilesRef = useRef<(HTMLButtonElement | null)[]>([]);

  const customValid = custom.trim() === "" ? null : validateDonateAmount(custom.trim());
  const amount: number | null =
    custom.trim() !== ""
      ? customValid?.ok
        ? customValid.amount
        : null
      : selected;

  // donate_amount_selected — only after a real user interaction, once
  // per distinct (amount, frequency).
  useEffect(() => {
    if (!interacted.current || amount === null) return;
    const detail = donateAmountDetail(amount, frequency);
    if (lastTracked.current === detail) return;
    lastTracked.current = detail;
    trackDonate("donate_amount_selected", detail);
  }, [amount, frequency]);

  useEffect(() => {
    if (!autoFocusTiles) return;
    const idx = Math.max(
      0,
      DONATE_PRESET_AMOUNTS.findIndex((a) => a === (selected ?? DONATE_DEFAULT_AMOUNT)),
    );
    tilesRef.current[idx]?.focus({ preventScroll: true });
    // Focus the preselected tile once, on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onTileKeyDown = (e: React.KeyboardEvent, idx: number) => {
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      next = (idx + 1) % DONATE_PRESET_AMOUNTS.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      next = (idx + DONATE_PRESET_AMOUNTS.length - 1) % DONATE_PRESET_AMOUNTS.length;
    }
    if (next === null) return;
    e.preventDefault();
    interacted.current = true;
    setCustom("");
    setSelected(DONATE_PRESET_AMOUNTS[next]);
    tilesRef.current[next]?.focus();
  };

  const ctaLabel = (frequency === "once"
    ? copy.donateCtaOnce
    : copy.donateCtaMonthly
  ).replace("{amount}", amount !== null ? `$${amount}` : "$0");
  const body = copy.body.replace("{count}", LIVE_CAMERA_COUNT_LABEL);

  return (
    <div>
      {/* Header — satellite-carpet globe (repo asset, the same family
          as the pricing hero treatment). */}
      <div className="relative h-[148px] overflow-hidden rounded-t-[26px] max-sm:rounded-t-[26px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/landing/globe-carpet.jpg"
          alt=""
          className="h-full w-full object-cover object-center"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-[#14171C]" />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.close}
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-black/55 text-zinc-200 backdrop-blur transition hover:bg-black/75"
          >
            <X size={16} />
          </button>
        )}
        <div className="absolute bottom-4 left-6 flex items-center gap-3 max-sm:left-5">
          <HeartTile />
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
              {copy.eyebrow}
            </p>
            <p className="mt-0.5 text-[15px] font-semibold text-white">
              {copy.tagline}
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6 pt-5 max-sm:px-5">
        <h2 className="text-[26px] font-bold leading-tight text-white">
          {copy.headlineA}{" "}
          <span className="bg-gradient-to-r from-[#8BEAFA] to-[#22D3EE] bg-clip-text text-transparent">
            {copy.headlineB}
          </span>
        </h2>
        <p className="mt-2.5 text-sm leading-relaxed text-zinc-400">{body}</p>

        {/* Frequency toggle */}
        <div
          className="mt-5 flex rounded-full border border-white/10 bg-white/[0.04] p-1"
          role="group"
          aria-label={`${copy.oneTime} / ${copy.monthly}`}
        >
          {(["once", "monthly"] as DonateFrequency[]).map((f) => {
            const active = frequency === f;
            return (
              <button
                key={f}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  interacted.current = true;
                  setFrequency(f);
                }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2 text-sm transition ${
                  active
                    ? "bg-[#E9EEF3] font-semibold text-[#0B0C10]"
                    : "text-zinc-300 hover:text-white"
                }`}
              >
                {f === "once" ? copy.oneTime : copy.monthly}
                {f === "monthly" && (
                  <span className="rounded-full border border-emerald-300/40 bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    {copy.mostImpact}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Preset tiles — radio group with arrow-key navigation */}
        <div
          className="mt-4 grid grid-cols-2 gap-2.5 pt-2 sm:grid-cols-4"
          role="radiogroup"
          aria-label={copy.otherAmount}
        >
          {DONATE_PRESET_AMOUNTS.map((preset, idx) => {
            const isSel = selected === preset && custom.trim() === "";
            return (
              <button
                key={preset}
                ref={(el) => {
                  tilesRef.current[idx] = el;
                }}
                type="button"
                role="radio"
                aria-checked={isSel}
                tabIndex={isSel || (selected === null && preset === DONATE_DEFAULT_AMOUNT) ? 0 : -1}
                onClick={() => {
                  interacted.current = true;
                  setCustom("");
                  setSelected(preset);
                }}
                onKeyDown={(e) => onTileKeyDown(e, idx)}
                className={`relative rounded-2xl border px-3 py-3 text-left transition ${
                  isSel
                    ? "border-cyan-300 bg-cyan-300/10 shadow-[0_0_16px_rgba(34,211,238,0.25)]"
                    : "border-white/10 bg-white/[0.03] hover:border-white/25"
                }`}
              >
                {preset === DONATE_DEFAULT_AMOUNT && (
                  <span className="absolute -top-2 left-3 rounded bg-cyan-300 px-1.5 py-px text-[9px] font-bold tracking-wide text-[#062A33]">
                    {copy.suggested}
                  </span>
                )}
                <span className="block text-lg font-bold text-white">
                  ${preset}
                  {frequency === "monthly" && (
                    <span className="text-xs font-medium text-zinc-400">
                      {copy.perMonthSuffix}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-xs text-zinc-400">
                  {copy.presetLabels[String(preset) as keyof typeof copy.presetLabels]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Other amount */}
        <div
          className={`mt-3 flex items-center gap-2 rounded-2xl border bg-white/[0.03] px-4 transition focus-within:border-cyan-300/60 ${
            custom.trim() !== "" && customValid && !customValid.ok
              ? "border-rose-400/60"
              : "border-white/10"
          }`}
        >
          <span className="text-sm text-zinc-400">$</span>
          <input
            value={custom}
            onChange={(e) => {
              interacted.current = true;
              // Whole dollars only: digits, nothing else.
              setCustom(e.target.value.replace(/[^0-9]/g, "").slice(0, 4));
            }}
            placeholder={copy.otherAmountPlaceholder}
            inputMode="numeric"
            aria-label={copy.otherAmount}
            aria-invalid={custom.trim() !== "" && !!customValid && !customValid.ok}
            className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-zinc-500"
          />
          <span className="whitespace-nowrap text-[11px] text-zinc-500">
            {frequency === "monthly" ? copy.minHintMonthly : copy.minHintOnce}
          </span>
        </div>

        {/* Main CTA */}
        <button
          type="button"
          disabled={amount === null}
          onClick={() => amount !== null && onDonate({ amount, frequency })}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(90deg,#8BEAFA,#22D3EE)] py-3.5 text-[15px] font-bold text-[#06202B] shadow-[0_8px_28px_rgba(34,211,238,0.35)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          <Heart size={16} className="fill-[#06202B]" />
          {ctaLabel}
        </button>

        {/* Fine print */}
        <ul className="mt-3.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-400">
          {[copy.fineSecure, frequency === "once" ? copy.fineOnce : copy.fineMonthly, copy.fineNoAds].map(
            (line) => (
              <li key={line} className="flex items-center gap-1.5">
                <span aria-hidden className="font-bold text-emerald-400">
                  ✓
                </span>
                {line}
              </li>
            ),
          )}
        </ul>

        {/* Gold upsell box */}
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-300/40 bg-amber-300/[0.06] px-4 py-3">
          <p className="text-[13px] leading-snug text-zinc-300">
            {copy.upsellA}{" "}
            <strong className="font-semibold text-amber-200">{copy.upsellB}</strong>{" "}
            {copy.upsellC}
          </p>
          <Link
            href="/pricing"
            onClick={() => trackDonate("donate_upsell_clicked", "see_plans")}
            className="whitespace-nowrap text-sm font-semibold text-amber-300 hover:text-amber-200"
          >
            {copy.seePlans} →
          </Link>
        </div>

        {onMaybeLater && (
          <button
            type="button"
            onClick={onMaybeLater}
            className="mx-auto mt-4 block text-sm text-zinc-500 underline-offset-4 transition hover:text-zinc-300 hover:underline"
          >
            {copy.maybeLater}
          </button>
        )}
      </div>
    </div>
  );
}
