"use client";

/**
 * Support WorldEye — the inline card placement (spec §6a): the same
 * popup-styled card embedded in content pages (gods-eye-view, blog
 * posts, /live-webcams, cameras-by-country, /about, research access).
 * Clicking an amount opens the popup on step 1 with it preselected;
 * Donate opens it with the selected amount ($10 by default).
 */
import { useState } from "react";
import { Heart } from "lucide-react";
import { getDonateCopy } from "@/i18n/dictionaries";
import { useLocale } from "@/i18n/LocaleProvider";
import {
  DONATE_DEFAULT_AMOUNT,
  DONATE_PRESET_AMOUNTS,
} from "@/lib/donate/config";
import { HeartTile } from "./DonateForm";
import { openDonate } from "./donate-client";

export default function DonateInlineCard({
  source,
  className = "",
}: {
  source: string;
  className?: string;
}) {
  const copy = getDonateCopy(useLocale());
  const [amount, setAmount] = useState<number>(DONATE_DEFAULT_AMOUNT);

  return (
    <section
      aria-label={copy.supportPageTitle}
      className={`rounded-[26px] border border-cyan-300/[0.28] bg-[linear-gradient(180deg,#14171C,#0B0C10)] p-6 shadow-[0_0_40px_rgba(34,211,238,0.10)] max-sm:p-5 ${className}`}
    >
      <div className="flex items-start gap-4">
        <HeartTile size={46} />
        <div className="min-w-0">
          <h2 className="text-xl font-bold leading-snug text-white">
            {copy.cardHeadline}{" "}
            <span className="bg-gradient-to-r from-[#8BEAFA] to-[#22D3EE] bg-clip-text text-transparent">
              {copy.headlineB}
            </span>
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
            {copy.cardBody}
          </p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {DONATE_PRESET_AMOUNTS.map((preset) => {
          const active = amount === preset;
          return (
            <button
              key={preset}
              type="button"
              aria-pressed={active}
              onClick={() => setAmount(preset)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "border border-cyan-300 bg-cyan-300/10 text-cyan-200"
                  : "border border-white/10 bg-white/[0.04] text-zinc-200 hover:border-white/25"
              }`}
            >
              ${preset}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => openDonate({ source, amount })}
          className="ml-auto flex items-center gap-2 rounded-full bg-[linear-gradient(90deg,#8BEAFA,#22D3EE)] px-6 py-2.5 text-sm font-bold text-[#06202B] transition hover:brightness-105 max-sm:ml-0"
        >
          <Heart size={14} className="fill-[#06202B]" />
          {copy.toastDonate}
        </button>
      </div>
    </section>
  );
}
