"use client";
// Shared affiliate UI primitives — WorldEye command-center aesthetic:
// dark navy glass cards, electric-blue/cyan accents, subtle glows.
import { useState } from "react";
import { Check } from "lucide-react";
import { RankArt, EyeMark } from "./graphics";

export function StatCard({ label, value, sub, accent = "#0096FF" }: {
  label: string; value: string; sub?: string; accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-4 md:p-5 relative overflow-hidden"
      style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,.06)` }}>
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: accent }} />
      <div className="text-[11px] font-mono tracking-[0.18em] text-slate-400 uppercase">{label}</div>
      <div className="mt-1 text-2xl md:text-3xl font-bold text-white font-mono" style={{ textShadow: `0 0 18px ${accent}55` }}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export function RankBadge({ name, badge, color, glow, size = "md" }: {
  // `badge` is the legacy emoji from the rank record — still accepted so
  // existing callers/API payloads keep working, but the tile now renders
  // the vector RankArt for the rank instead of the emoji.
  name: string; badge?: string; color: string; glow: string; size?: "sm" | "md" | "lg";
}) {
  const dims = size === "lg" ? "w-20 h-20" : size === "sm" ? "w-10 h-10" : "w-14 h-14";
  const art = size === "lg" ? 54 : size === "sm" ? 27 : 38;
  return (
    <div className="flex items-center gap-3">
      <div className={`${dims} rounded-2xl flex items-center justify-center border`}
        style={{ borderColor: color + "66", background: `radial-gradient(circle at 35% 30%, ${color}33, rgba(5,8,16,.9))`, boxShadow: `0 0 24px ${glow}` }}>
        <RankArt rank={name} color={color} size={art} />
      </div>
      <div>
        <div className="text-[10px] font-mono tracking-[0.2em] text-slate-400 uppercase">Rank</div>
        <div className="text-lg font-bold" style={{ color }}>{name}</div>
      </div>
    </div>
  );
}

export function XpBar({ pct, color, height = 10 }: { pct: number; color: string; height?: number }) {
  return (
    <div className="w-full rounded-full bg-white/10 overflow-hidden" style={{ height }}>
      <div
        className="h-full rounded-full transition-all duration-1000"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: `linear-gradient(90deg, ${color}88, ${color})`, boxShadow: `0 0 12px ${color}` }}
      />
    </div>
  );
}

export function SectionTitle({ kicker, title, right }: { kicker?: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4">
      <div>
        {kicker && <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase mb-1">{kicker}</div>}
        <h2 className="text-xl md:text-2xl font-bold text-white">{title}</h2>
      </div>
      {right}
    </div>
  );
}

export function CopyButton({ text, label = "Copy link" }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); } catch { /* clipboard unavailable */ }
        setOk(true); setTimeout(() => setOk(false), 1800);
      }}
      className="px-4 py-2 rounded-xl font-mono text-sm font-bold text-[#04121f] transition-all inline-flex items-center justify-center gap-1.5"
      style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)", boxShadow: "0 0 20px rgba(0,150,255,.45)" }}
    >
      {ok ? (<><Check className="w-4 h-4" strokeWidth={3} /> Copied</>) : label}
    </button>
  );
}

export function EmptyState({ title, body, cta }: { title: string; body: string; cta?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
      <div className="flex justify-center mb-3 opacity-70">
        <EyeMark color="#5b7a9e" size={34} />
      </div>
      <div className="text-white font-bold mb-1">{title}</div>
      <div className="text-sm text-slate-400 mb-4">{body}</div>
      {cta}
    </div>
  );
}

export function Pill({ children, color = "#38bdf8" }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border"
      style={{ color, borderColor: color + "55", background: color + "14" }}>
      {children}
    </span>
  );
}

export function fmtCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
