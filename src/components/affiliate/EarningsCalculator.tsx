"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";

/** Interactive earnings estimator: referrals × plan → recurring commission. */
export default function EarningsCalculator() {
  const [refs, setRefs] = useState(10);
  const [plan, setPlan] = useState<"monthly" | "annual">("annual");

  // Base Explorer rank: 15% recurring. Higher ranks earn up to 30%.
  const perRefMonthly = plan === "monthly" ? 13.99 * 0.15 : (74.99 * 0.15) / 12;
  const monthly = refs * perRefMonthly;
  const yearly = monthly * 12;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-6 md:p-8 relative overflow-hidden">
      <div className="absolute right-0 top-0 w-[280px] h-[140px] rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ background: "radial-gradient(ellipse,#22d3ee,transparent)" }} />
      <div className="relative">
        <p className="flex items-center gap-2 text-xs font-mono tracking-[0.25em] text-cyan-300 uppercase mb-5">
          <Calculator className="w-4 h-4" /> Earnings estimator
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-300">Paying referrals</span>
                <span className="font-mono font-bold text-white text-lg">{refs}</span>
              </div>
              <input
                type="range"
                min={1}
                max={100}
                value={refs}
                onChange={(e) => setRefs(Number(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>
            <div>
              <div className="text-sm text-slate-300 mb-2">Their plan</div>
              <div className="grid grid-cols-2 gap-2">
                {(["monthly", "annual"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlan(p)}
                    className={`py-2.5 rounded-xl text-sm font-bold capitalize transition border ${
                      plan === p
                        ? "bg-cyan-400/15 border-cyan-300/40 text-cyan-200"
                        : "bg-white/[0.03] border-white/10 text-slate-400 hover:bg-white/[0.06]"
                    }`}
                  >
                    {p} · {p === "monthly" ? "$13.99/mo" : "$74.99/yr"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center rounded-2xl border border-white/10 bg-black/30 p-6">
            <div className="text-[10px] font-mono tracking-[0.2em] text-slate-500 uppercase">Est. recurring earnings</div>
            <div className="mt-1 text-4xl md:text-5xl font-black font-mono text-transparent bg-clip-text"
              style={{ backgroundImage: "linear-gradient(135deg,#38bdf8,#22d3ee)" }}>
              ${monthly.toFixed(2)}<span className="text-lg text-slate-400">/mo</span>
            </div>
            <div className="mt-2 text-sm text-slate-400 font-mono">
              ≈ ${yearly.toFixed(2)}/year at the 15% Explorer rate
            </div>
            <p className="mt-3 text-xs text-slate-500 leading-relaxed">
              Climb to Visionary (30%) and this doubles — before network overrides. Real earnings depend on real paid subscriptions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
