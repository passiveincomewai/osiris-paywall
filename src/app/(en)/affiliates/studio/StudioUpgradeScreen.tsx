import Link from "next/link";
import { LayoutGrid, Hexagon, Play, Diamond, type LucideIcon } from "lucide-react";
import TrialPicker from "@/components/TrialPicker";

/**
 * Membership gate screen for the Marketing Studio (Phase 2, Rule 1).
 * Shown instead of Studio content when the signed-in affiliate does not
 * have an active WorldEye membership (or their affiliate account is not
 * active). Server component — no client hooks.
 */
export default function StudioUpgradeScreen() {
  const features: [LucideIcon, string, string][] = [
    [LayoutGrid, "Template library", "Ready-made posts, stories, carousels, banners, and more."],
    [Hexagon, "Personalized renders", "Every design rendered with your referral link and QR code."],
    [Play, "Video studio", "Build short-form video creatives for your channels."],
    [Diamond, "Monthly generation credits", "A fresh allowance of Studio generations every month."],
  ];
  return (
    <div className="text-center py-10">
      <div className="inline-block px-3 py-1 rounded-full border border-cyan-400/40 text-cyan-300 text-[11px] font-mono tracking-[0.25em] mb-5">
        MEMBERSHIP FEATURE
      </div>
      <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
        Marketing Studio is a{" "}
        <span
          className="text-transparent bg-clip-text"
          style={{ backgroundImage: "linear-gradient(135deg,#38bdf8,#0096FF 45%,#c084fc)" }}
        >
          membership feature
        </span>
      </h1>
      <p className="mt-5 max-w-2xl mx-auto text-slate-300 leading-relaxed">
        The Studio — the template library, personalized renders with your referral link + QR,
        the video studio, and monthly generation credits — requires an active WorldEye
        membership on top of your affiliate account.
      </p>
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto text-left">
        {features.map(([Icon, t, d]) => (
          <div key={t} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <Icon className="w-7 h-7 text-cyan-300" strokeWidth={1.7} />
            <div className="mt-2 text-white font-bold text-sm">{t}</div>
            <div className="mt-1 text-xs text-slate-400">{d}</div>
          </div>
        ))}
      </div>
      <p className="mt-8 text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
        Already a Pro member, an approved creator, or a Visionary affiliate? You already
        qualify — this screen clears as soon as your membership is active.
      </p>
      <div className="mt-8 max-w-md mx-auto text-left">
        <TrialPicker />
      </div>
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/pricing"
          className="inline-block px-8 py-3.5 rounded-2xl font-mono font-bold border border-white/15 text-slate-200 hover:border-cyan-400/60 transition-colors"
        >
          Compare membership plans
        </Link>
        <Link
          href="/affiliates/dashboard"
          className="inline-block px-8 py-3.5 rounded-2xl font-mono font-bold border border-white/15 text-slate-200 hover:border-cyan-400/60 transition-colors"
        >
          Back to affiliate dashboard
        </Link>
      </div>
    </div>
  );
}
