import Link from "next/link";
import { Check } from "lucide-react";

/**
 * Section 5 cards — Free vs Pro, built strictly from the code-verified
 * entitlement table (design plan): prices and trials from /pricing's
 * own constants; the camera gate from src/lib/cameraGate.ts (5 opens
 * per device for everyone non-Pro, Pro unlimited — the Free card says
 * so plainly and never claims unlimited); Pro rows from the app's
 * gating code. No capability appears here that the code doesn't
 * enforce.
 */
const FREE_ROWS = [
  "Interactive 3D globe",
  "74,229 public cameras",
  "Flight & satellite tracking",
  "Basic search — fly to any place",
  "Transit, drones, launches & street level",
  "Weather, earthquakes & fires",
  "Cameras: 5 free opens per device",
];

const PRO_ROWS = [
  "Unlimited camera opens",
  "Satellite imagery view",
  "Live traffic layer",
  "Advanced search filters",
  "OSINT toolkit",
  "Premium intel layers & live feeds",
  "Camera Recording Studio",
  "Camera timelapse",
];

export default function PlansCards() {
  return (
    <div className="grid gap-5 md:grid-cols-2 max-w-4xl">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-7 flex flex-col">
        <h3 className="font-display text-2xl font-medium text-white">Free</h3>
        <p className="font-mono text-sm text-white/50 mt-1.5">$0 — no account needed</p>
        <ul className="mt-5 space-y-2.5">
          {FREE_ROWS.map((row) => (
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
          Get Started Free
        </Link>
      </div>

      <div className="relative rounded-2xl border border-[#D4AF37]/45 bg-white/[0.03] p-6 md:p-7 flex flex-col">
        <span className="absolute -top-3 left-6 text-[10px] font-bold tracking-widest text-[#06060C] bg-[#D4AF37] rounded px-2 py-0.5">
          MOST POPULAR
        </span>
        <h3 className="font-display text-2xl font-medium text-[#D4AF37]">Pro</h3>
        <p className="font-mono text-sm text-white/50 mt-1.5">
          Weekly $7.99 · Monthly $13.99 · Annual $74.99
        </p>
        <p className="text-xs text-white/40 mt-1">Free trials: 1 day on weekly &amp; monthly · 3 days on annual</p>
        <ul className="mt-5 space-y-2.5">
          {PRO_ROWS.map((row) => (
            <li key={row} className="flex items-baseline gap-2.5 text-sm text-white/75">
              <Check className="w-4 h-4 text-[#D4AF37] shrink-0 translate-y-0.5" aria-hidden />
              {row}
            </li>
          ))}
        </ul>
        <Link
          href="/pricing"
          data-landing-event="cta_click:pro"
          className="mt-7 inline-flex justify-center px-5 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#e8c55a] text-[#06060C] text-sm font-bold transition"
        >
          See Pro Plans
        </Link>
      </div>
    </div>
  );
}
