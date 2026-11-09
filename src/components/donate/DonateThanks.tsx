"use client";

/**
 * Support WorldEye — step 3 (thank-you), shared by the popup and the
 * /support/thanks page (redirect-based payment methods land there).
 * Copy per spec; the receipt row echoes the completed donation.
 */
import { useState } from "react";
import Link from "next/link";
import { Check, Heart, Share2 } from "lucide-react";
import type { DonateCopy } from "@/i18n/dictionaries";
import type { DonateFrequency } from "@/lib/donate/config";
import { HeartTile } from "./DonateForm";

export default function DonateThanks({
  copy,
  amount,
  frequency,
  onClose,
}: {
  copy: DonateCopy;
  amount: number;
  frequency: DonateFrequency;
  /** Popup: close in place. Page: omitted — Back to the globe links home. */
  onClose?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const amountLabel =
    frequency === "monthly" ? `$${amount}${copy.perMonthSuffix}` : `$${amount}`;

  const share = async () => {
    const url = "https://worldeye.app/";
    try {
      if (navigator.share) {
        await navigator.share({ title: "WorldEye", url });
        return;
      }
      throw new Error("no share");
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        /* clipboard unavailable */
      }
    }
  };

  const backClasses =
    "flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(90deg,#8BEAFA,#22D3EE)] py-3 text-sm font-bold text-[#06202B] transition hover:brightness-105";

  return (
    <div className="text-center">
      <div className="mx-auto w-fit">
        <HeartTile size={68} />
      </div>
      <h2 className="mt-5 text-[26px] font-bold leading-tight text-white">
        {copy.thanksTitleA}{" "}
        <span className="bg-gradient-to-r from-[#8BEAFA] to-[#22D3EE] bg-clip-text text-transparent">
          {copy.thanksTitleB}
        </span>
      </h2>
      <p className="mx-auto mt-3 max-w-[420px] text-sm leading-relaxed text-zinc-400">
        {copy.thanksBody}
      </p>
      <div className="mx-auto mt-5 flex max-w-[420px] items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
        <span className="text-sm text-zinc-300">
          {frequency === "monthly" ? copy.receiptMonthly : copy.receiptOnce}
        </span>
        <span className="text-base font-bold text-white">{amountLabel}</span>
      </div>
      <div className="mx-auto mt-5 flex max-w-[420px] gap-2.5 max-sm:flex-col">
        {onClose ? (
          <button type="button" onClick={onClose} className={backClasses}>
            <Heart size={15} className="fill-[#06202B]" />
            {copy.backToGlobe}
          </button>
        ) : (
          <Link href="/" className={backClasses}>
            <Heart size={15} className="fill-[#06202B]" />
            {copy.backToGlobe}
          </Link>
        )}
        <button
          type="button"
          onClick={share}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
        >
          {copied ? <Check size={15} /> : <Share2 size={15} />}
          {copied ? copy.linkCopied : copy.share}
        </button>
      </div>
    </div>
  );
}
