"use client";
// Missions: daily / weekly / monthly challenges, verified server-side.
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { SectionTitle, XpBar, Pill, EmptyState } from "@/components/affiliate/ui";

interface Challenge {
  id: string; slug: string; kind: "daily" | "weekly" | "monthly";
  title: string; description: string; xpReward: number; metric: string;
  target: number; endsAt: string; progress: number; completedAt: string | null;
}

const card = "rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-4 md:p-5";
const kindColor = { daily: "#38bdf8", weekly: "#c084fc", monthly: "#fbbf24" } as const;

function countdown(endsAt: string): string {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const h = Math.floor(ms / 3600000), d = Math.floor(h / 24);
  return d > 0 ? `${d}d ${h % 24}h left` : `${h}h ${Math.floor((ms % 3600000) / 60000)}m left`;
}

export default function MissionsClient() {
  const [challenges, setChallenges] = useState<Challenge[] | null>(null);
  const [joined, setJoined] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const me = await fetch("/api/affiliate/me");
    if (me.status === 404) { setJoined(false); return; }
    const r = await fetch("/api/affiliate/challenges");
    if (r.ok) setChallenges((await r.json()).challenges);
  };
  useEffect(() => { load(); }, []);

  const complete = async (id: string) => {
    setBusy(id);
    const r = await fetch("/api/affiliate/challenges", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ challengeId: id }),
    });
    setBusy(null);
    if (r.ok) load();
  };

  if (!joined) {
    return <EmptyState title="Join the program first"
      body="Missions unlock once your free affiliate account is active."
      cta={<Link href="/affiliates/dashboard" className="px-4 py-2 rounded-xl font-mono text-sm font-bold text-[#04121f] inline-block"
        style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)" }}>Go to dashboard</Link>} />;
  }
  if (!challenges) return <div className="text-slate-400 font-mono text-sm">Loading missions…</div>;

  const groups: ("daily" | "weekly" | "monthly")[] = ["daily", "weekly", "monthly"];
  return (
    <div className="space-y-10">
      <div className="flex items-start gap-4">
        <img src="/affiliate-icons/missions.png" alt="Missions" width={256} height={256} className="w-14 h-14 md:w-16 md:h-16 object-contain shrink-0 mt-1"
          style={{ filter: "drop-shadow(0 0 16px rgba(251,191,36,.45))" }} />
        <div>
        <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase mb-2">Missions</div>
        <h1 className="text-3xl font-bold text-white mb-2">Earn XP. Climb ranks.</h1>
        <p className="text-slate-400 text-sm max-w-2xl">
          Complete missions to earn XP and unlock higher commission tiers. Every completion is verified
          server-side from real activity — fake clicks and duplicate actions can't farm XP, and XP has no cash value.
        </p>
        <button onClick={load} className="mt-3 px-3 py-1.5 rounded-lg text-xs font-mono border border-white/15 text-slate-300 hover:border-cyan-400/60">
          Refresh progress
        </button>
        </div>
      </div>

      {groups.map((g) => {
        const list = challenges.filter((c) => c.kind === g);
        if (!list.length) return null;
        return (
          <section key={g}>
            <SectionTitle kicker={`${g} operations`} title={g[0].toUpperCase() + g.slice(1) + " missions"} />
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {list.map((c) => {
                const done = !!c.completedAt;
                const pct = Math.min(100, (c.progress / c.target) * 100);
                return (
                  <div key={c.id} className={card + (done ? " border-emerald-400/30" : "")}
                    style={done ? { boxShadow: "0 0 24px rgba(52,211,153,.12)" } : undefined}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Pill color={kindColor[g]}>{g}</Pill>
                      <Pill color="#fbbf24">+{c.xpReward} XP</Pill>
                    </div>
                    <div className="text-white font-bold mb-1 flex items-center gap-2">
                      {done && (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-400/15 border border-emerald-400/40 shrink-0">
                          <Check className="w-3 h-3 text-emerald-300" strokeWidth={3.5} />
                        </span>
                      )}
                      {c.title}
                    </div>
                    <div className="text-xs text-slate-400 mb-3">{c.description}</div>
                    <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                      <span>{Math.min(c.progress, c.target).toLocaleString()} / {c.target.toLocaleString()}</span>
                      <span>{countdown(c.endsAt)}</span>
                    </div>
                    <XpBar pct={pct} color={done ? "#34d399" : kindColor[g]} height={8} />
                    {!done && c.metric === "tutorial" && (
                      <button onClick={() => complete(c.id)} disabled={busy === c.id}
                        className="mt-3 px-3 py-1.5 rounded-lg text-xs font-mono border border-cyan-400/50 text-cyan-300 hover:bg-cyan-400/10 disabled:opacity-50">
                        {busy === c.id ? "Verifying…" : "Mark complete"}
                      </button>
                    )}
                    {done && c.completedAt && (
                      <div className="mt-2 text-[11px] font-mono text-emerald-300">Completed {new Date(c.completedAt).toLocaleDateString()}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {challenges.length === 0 && (
        <EmptyState title="No active missions" body="New missions deploy regularly. Check back soon." />
      )}
    </div>
  );
}
