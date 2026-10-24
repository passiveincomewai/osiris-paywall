"use client";
// ── Live affiliate demo ──────────────────────────────────────────────────
// The REAL affiliate dashboard UI (the same DashboardClient affiliates
// use) running on the clearly-labelled sample dataset in
// lib/affiliate/demo-data. Read-only: the dashboard's actions explain
// themselves instead of saving, nothing persists, no sign-in is needed.
// Reused by /affiliates/demo and embeddable on partner surfaces.
import DashboardClient from "@/app/affiliates/dashboard/DashboardClient";
import {
  buildDemoMe, buildDemoDash, buildDemoInsights, buildDemoNotifications, buildDemoLinks,
} from "@/lib/affiliate/demo-data";

export default function AffiliateDemoSection() {
  const demo = {
    me: buildDemoMe(),
    dash: buildDemoDash(),
    insights: buildDemoInsights(),
    notifications: buildDemoNotifications(),
    links: buildDemoLinks(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 -top-3 z-10 flex justify-center">
        <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-[0.25em] text-pink-100 border border-pink-400/60 bg-pink-500/20 backdrop-blur">
          LIVE DEMO — SAMPLE FIGURES
        </span>
      </div>
      <div className="rounded-3xl border border-white/10 overflow-hidden">
        <DashboardClient demo={demo} />
      </div>
    </div>
  );
}
