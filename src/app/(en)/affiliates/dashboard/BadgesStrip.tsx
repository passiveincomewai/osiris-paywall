"use client";
// Dashboard badges strip: earned Studio badges as chips, plus progress
// hints for the locked ones. The badges API serves any signed-in affiliate
// (same gate as the rest of the dashboard); a 401/404 — signed out or not
// an affiliate — renders nothing at all.
import { useEffect, useState } from "react";
import { MedalMark } from "@/components/affiliate/graphics";

interface BadgeRow {
  key: string;
  label: string;
  blurb: string;
  xp: number;
  earned: boolean;
  earnedAt: string | null;
}

export default function BadgesStrip() {
  const [badges, setBadges] = useState<BadgeRow[] | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/affiliate/studio/badges", { cache: "no-store" });
        if (r.status === 401 || r.status === 403) {
          setHidden(true);
          return;
        }
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          setHidden(true);
          return;
        }
        setBadges(Array.isArray(j.badges) ? (j.badges as BadgeRow[]) : []);
      } catch {
        setHidden(true);
      }
    })();
  }, []);

  if (hidden || badges === null || badges.length === 0) return null;

  const earned = badges.filter((b) => b.earned);
  const locked = badges.filter((b) => !b.earned);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-bold text-white flex items-center gap-2">
          <MedalMark color="#22d3ee" size={19} />
          Studio badges
        </div>
        <div className="text-[11px] font-mono text-white/40">
          {earned.length} of {badges.length} earned
        </div>
      </div>
      {earned.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {earned.map((b) => (
            <span
              key={b.key}
              title={b.earnedAt ? `Earned ${new Date(b.earnedAt).toLocaleDateString()}` : b.blurb}
              className="px-3 py-1.5 rounded-full text-xs font-mono font-bold border border-cyan-400/50 text-cyan-200 bg-cyan-400/10 inline-flex items-center gap-1.5"
            >
              <MedalMark color="#22d3ee" size={14} />
              {b.label}
              {b.xp > 0 && <span className="text-cyan-400/80"> · +{b.xp} XP</span>}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">No badges yet — they unlock as you create, post, and complete campaigns in the Studio.</p>
      )}
      {locked.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {locked.slice(0, 4).map((b) => (
            <div key={b.key} className="flex items-baseline justify-between gap-3 text-xs">
              <span className="text-slate-400 min-w-0 break-words">
                <span className="font-mono font-semibold text-slate-300">{b.label}</span> — {b.blurb}
              </span>
              {b.xp > 0 && <span className="font-mono text-slate-500 shrink-0">+{b.xp} XP</span>}
            </div>
          ))}
          {locked.length > 4 && (
            <div className="text-[11px] font-mono text-slate-500">+ {locked.length - 4} more badges to chase in the Studio.</div>
          )}
        </div>
      )}
    </div>
  );
}
