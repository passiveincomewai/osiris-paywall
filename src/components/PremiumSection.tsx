"use client";

/**
 * The Premium section that sits directly under the merged Search &
 * Route section in the globe's panel (owner's order, 2026-10-26):
 * every premium feature, from the one list (lib/billing/
 * premium-features — mirrored from /pricing's plan cards and pinned
 * by its tests), each row naming the tier that unlocks it.
 *
 * Free viewers get the existing upgrade embed (components/
 * ProUpgradeEmbed — the same one the Layers board uses, opening the
 * same CheckoutSheet) under the list. Premium viewers never see a
 * checkout embed for a tier they already own: their rows read
 * INCLUDED, and a Pro viewer gets a plain /pricing link for the VIP
 * Pro remainder instead — the pattern other surfaces follow with
 * isPremiumUser (the embed simply isn't rendered for them).
 */
import { Check, Crown, Lock } from "lucide-react";
import Link from "next/link";
import {
  PREMIUM_FEATURES,
  premiumFeatureNames,
} from "@/lib/billing/premium-features";
import { tierSatisfies, type PlanTier } from "@/lib/plan-tier";
import ProUpgradeEmbed from "./ProUpgradeEmbed";

export default function PremiumSection({ tier }: { tier: PlanTier }) {
  return (
    <section
      data-premium-section
      aria-label="Premium features"
      className="border-t border-[var(--border-secondary)] px-4 py-3.5"
    >
      <div className="flex items-center gap-1.5">
        <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />
        <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#D4AF37]">
          PREMIUM
        </span>
        {tier !== "free" && (
          <span className="ml-auto rounded-full border border-emerald-400/30 bg-emerald-400/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-emerald-300">
            {tier === "vip" ? "VIP Pro active" : "Pro active"}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-white/55">
        {tier === "vip"
          ? "Every premium feature is on for you."
          : tier === "pro"
            ? "Your Pro features are on. VIP Pro adds the rest."
            : "Everything a WorldEye pass unlocks."}
      </p>

      <ul className="mt-2.5 flex flex-col gap-1">
        {PREMIUM_FEATURES.map((f) => {
          const owned = tierSatisfies(tier, f.tier);
          return (
            <li
              key={f.name}
              className="flex items-start gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2"
            >
              {owned ? (
                <Check className="mt-0.5 w-3.5 h-3.5 flex-shrink-0 text-emerald-300" />
              ) : (
                <Lock className="mt-0.5 w-3.5 h-3.5 flex-shrink-0 text-[#D4AF37]/80" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-medium leading-snug text-[var(--text-heading)]">
                  {f.name}
                </span>
                <span className="mt-0.5 block text-[10.5px] leading-snug text-white/45">
                  {f.blurb}
                </span>
              </span>
              <span
                className={`flex-shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ${
                  owned
                    ? "border-emerald-400/30 bg-emerald-400/15 text-emerald-300"
                    : "border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37]"
                }`}
              >
                {owned ? "Included" : f.tier === "vip" ? "VIP Pro" : "Pro"}
              </span>
            </li>
          );
        })}
      </ul>

      {tier === "free" && (
        <div className="mt-3">
          <ProUpgradeEmbed premiumLabels={premiumFeatureNames("pro")} />
        </div>
      )}
      {tier === "pro" && (
        <Link
          href="/pricing"
          className="mt-3 block text-center text-[11px] font-medium text-[#D4AF37] hover:text-[#E8C766] transition-colors"
        >
          See VIP Pro — premium intel feeds, timelapse and 10 camera alerts
        </Link>
      )}
    </section>
  );
}
