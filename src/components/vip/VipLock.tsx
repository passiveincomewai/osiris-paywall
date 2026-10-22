"use client";
/**
 * The VIP lock state for the /vip surfaces — same treatment as the
 * camera-alerts settings page: what the feature is, why it's locked,
 * and the TrialPicker to fix it. `hasPaidHistory` distinguishes a
 * lapsed VIP (features paused, data kept) from a never-VIP visitor.
 */
import { Crown } from "lucide-react";
import TrialPicker from "@/components/TrialPicker";

export function VipBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-300/10 px-2.5 py-1 text-[10px] font-mono font-bold tracking-[0.2em] text-amber-200 uppercase">
      <Crown className="w-3.5 h-3.5" /> VIP Pro
    </span>
  );
}

export default function VipLock({
  title,
  lapsedCopy,
  freshCopy,
  lapsed = false,
}: {
  title: string;
  lapsedCopy: string;
  freshCopy: string;
  lapsed?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-amber-300/25 bg-amber-300/5 p-6">
      <div className="mb-3">
        <VipBadge />
      </div>
      <h2 className="font-bold text-white mb-1.5">{title}</h2>
      <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
        {lapsed ? lapsedCopy : freshCopy}
      </p>
      <div className="mt-5">
        <TrialPicker />
      </div>
    </div>
  );
}
