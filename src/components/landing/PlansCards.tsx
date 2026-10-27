import Link from "next/link";
import { Check } from "lucide-react";
import { localizedPath, type LocaleCode } from "@/i18n/config";
import { enHome, type HomeCopy } from "@/i18n/dictionaries/en/home";

/**
 * Section 5 cards — Free vs Pro, built strictly from the code-verified
 * entitlement table (design plan): prices and trials from /pricing's
 * own constants; the camera gate from src/lib/cameraGate.ts (5 opens
 * per device for everyone non-Pro, Pro unlimited — the Free card says
 * so plainly and never claims unlimited); Pro rows from the app's
 * gating code. No capability appears here that the code doesn't
 * enforce.
 *
 * Copy comes from the home dictionary (plans block). NOTE — factual
 * corrections vs the pre-i18n hardcoded rows, flagged in the i18n
 * build REPORT: the trial line now matches src/lib/billing/trials.ts
 * (weekly 3 days, monthly & annual 10 days — the old line claimed
 * "10 days on weekly & monthly"), and "Satellite imagery view" is no
 * longer listed as a Pro row — the satellite view is free for everyone.
 */
export default function PlansCards({
  copy = enHome,
  locale = "en",
}: {
  copy?: HomeCopy;
  locale?: LocaleCode;
} = {}) {
  const plans = copy.plans;
  return (
    <div className="grid gap-5 md:grid-cols-2 max-w-4xl">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-7 flex flex-col">
        <h3 className="font-display text-2xl font-medium text-white">{plans.freeTitle}</h3>
        <p className="font-mono text-sm text-white/50 mt-1.5">{plans.freePriceLine}</p>
        <ul className="mt-5 space-y-2.5">
          {plans.freeRows.map((row) => (
            <li key={row} className="flex items-baseline gap-2.5 text-sm text-white/75">
              <Check className="w-4 h-4 text-[#0096FF] shrink-0 translate-y-0.5" aria-hidden />
              {row}
            </li>
          ))}
        </ul>
        <Link
          href="/signup"
          data-landing-event="cta_click:free"
          className="mt-7 inline-flex justify-center px-5 py-3 rounded-xl border border-white/15 text-white/85 hover:text-white hover:border-white/35 text-sm font-semibold transition"
        >
          {plans.freeCta}
        </Link>
      </div>

      <div className="relative rounded-2xl border border-[#D4AF37]/45 bg-white/[0.03] p-6 md:p-7 flex flex-col">
        <span className="absolute -top-3 left-6 text-[10px] font-bold tracking-widest text-[#06060C] bg-[#D4AF37] rounded px-2 py-0.5">
          {plans.popularBadge}
        </span>
        <h3 className="font-display text-2xl font-medium text-[#D4AF37]">{plans.proTitle}</h3>
        <p className="font-mono text-sm text-white/50 mt-1.5">
          {plans.proPriceLine}
        </p>
        <p className="text-xs text-white/40 mt-1">{plans.proTrialsLine}</p>
        <ul className="mt-5 space-y-2.5">
          {plans.proRows.map((row) => (
            <li key={row} className="flex items-baseline gap-2.5 text-sm text-white/75">
              <Check className="w-4 h-4 text-[#D4AF37] shrink-0 translate-y-0.5" aria-hidden />
              {row}
            </li>
          ))}
        </ul>
        <Link
          href={localizedPath("pricing", locale)}
          data-landing-event="cta_click:pro"
          className="mt-7 inline-flex justify-center px-5 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#e8c55a] text-[#06060C] text-sm font-bold transition"
        >
          {plans.proCta}
        </Link>
      </div>
    </div>
  );
}
