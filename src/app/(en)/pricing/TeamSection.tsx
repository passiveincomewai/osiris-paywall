"use client";

/**
 * Team Access section on /pricing — additive block after the individual
 * plans. Feeds the shared SeatCalculator from GET /api/team/pricing
 * (public config) with a weekly/monthly/annual toggle.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Users } from "lucide-react";
import SeatCalculator from "@/components/team/SeatCalculator";
import {
  BASE_CENTS,
  DEFAULT_TIERS,
  type Cycle,
  type TierBand,
} from "@/lib/team/pricing";

const TEAM_FEATURES = [
  "Invite up to 50 additional members",
  "Automatic volume discounts",
  "Shared monitoring workspaces",
  "Separate secure logins",
  "Team roles and permissions",
  "One consolidated subscription",
  "Flexible weekly, monthly, or annual billing",
];

const CYCLE_TOGGLE: { key: Cycle; label: string }[] = [
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "annual", label: "Annual" },
];

interface TeamPricingConfig {
  maxSeats: number;
  tiers: Record<Cycle, TierBand[]>;
  baseCents: Record<Cycle, number>;
  inviteExpiryDays: number;
}

export default function TeamSection() {
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [config, setConfig] = useState<TeamPricingConfig | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/team/pricing", { cache: "no-store" });
        if (res.ok) setConfig((await res.json()) as TeamPricingConfig);
      } catch { /* built-in defaults below keep the calculator honest */ }
      try {
        const p = await fetch("/api/user/profile", { cache: "no-store" });
        setSignedIn(p.ok);
      } catch { /* treat as signed out */ }
    })();
  }, []);

  const tiers = config?.tiers?.[cycle] ?? DEFAULT_TIERS[cycle];
  const baseCents = config?.baseCents?.[cycle] ?? BASE_CENTS[cycle];
  const createHref = signedIn ? "/settings/team" : "/signup?callbackUrl=/settings/team";

  return (
    <section className="mt-14 max-w-3xl mx-auto" aria-label="Team Access pricing">
      <div className="text-center max-w-2xl mx-auto">
        <p className="flex items-center justify-center gap-2 text-[11px] font-bold tracking-[0.25em] text-[#D4AF37] mb-3">
          <Users className="w-4 h-4" /> TEAM ACCESS
        </p>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          WORLDWIDE MONITORING. BETTER TOGETHER.
        </h2>
        <p className="text-white/55 mt-3 text-sm md:text-base leading-relaxed">
          Give your entire team access to WorldEye&apos;s global monitoring platform. Share cameras, organize dashboards, and collaborate from anywhere.
        </p>
      </div>

      <ul className="mt-6 grid gap-2 sm:grid-cols-2 max-w-xl mx-auto">
        {TEAM_FEATURES.map((f) => (
          <li key={f} className="flex items-center gap-2.5 text-sm text-white/85">
            <span className="w-5 h-5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center shrink-0">
              <Check className="w-3 h-3 text-[#D4AF37]" />
            </span>
            {f}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex justify-center">
        <div className="inline-flex p-1.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur max-w-full">
          {CYCLE_TOGGLE.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setCycle(key)}
              className={`px-4 md:px-6 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
                cycle === key ? "bg-[#D4AF37] text-black" : "text-white/55 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div id="team-pricing" className="mt-5 max-w-xl mx-auto scroll-mt-24">
        <SeatCalculator
          cycle={cycle}
          tiers={tiers}
          baseCents={baseCents}
          maxSeats={config?.maxSeats ?? 50}
          initialSeats={5}
          ctaLabel="Create Your Team"
          onCta={() => {
            window.location.href = createHref;
          }}
        />
      </div>

      <p className="mt-4 text-center">
        <a
          href="#team-pricing"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("team-pricing")?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
          className="text-sm font-semibold text-[#00E5FF] hover:underline"
        >
          View Team Pricing
        </a>
        <span className="text-white/30 mx-2">·</span>
        <Link href={createHref} className="text-sm font-semibold text-white/70 hover:text-white transition">
          Create Your Team →
        </Link>
      </p>
    </section>
  );
}
