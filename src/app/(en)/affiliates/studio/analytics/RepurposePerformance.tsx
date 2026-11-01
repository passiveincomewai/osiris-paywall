"use client";

// Per-creative performance for Repurposing Machine variations
// (spec §11 A/F/G): WorldEye-measured clicks → signups → started a
// plan → paying → commission, joined through the creative's
// utm_content tag. Includes the deterministic Marketing Coach
// (threshold-gated insights), side-by-side comparison, campaign-tag
// rollups (A/B reading), and the Repurpose-Top-Performer action.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface Creative {
  creativeId: string;
  variationId: string;
  projectId: string;
  projectTitle: string;
  campaignTag: string | null;
  title: string;
  direction: string;
  aspect: string;
  status: string;
  postedPlatform: string | null;
  clicks: number;
  signups: number;
  startedPlan: number;
  paid: number;
  clickToPaidPct: number | null;
  commissionCents: number;
}

const GHOST =
  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/15 text-[12px] font-mono text-slate-300 hover:bg-white/5 disabled:opacity-50";

export default function RepurposePerformance() {
  const [creatives, setCreatives] = useState<Creative[] | null>(null);
  const [coach, setCoach] = useState<string[]>([]);
  const [dataNote, setDataNote] = useState<string | null>(null);
  const [compare, setCompare] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/affiliate/studio/repurpose/performance");
        const j = (await r.json()) as { creatives?: Creative[]; coach?: string[]; dataNote?: string | null; error?: string };
        if (!r.ok) throw new Error(j.error || "Couldn't load creative performance.");
        setCreatives(j.creatives ?? []);
        setCoach(j.coach ?? []);
        setDataNote(j.dataNote ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't load creative performance.");
      }
    })();
  }, []);

  const tags = useMemo(() => {
    const map = new Map<string, { clicks: number; signups: number; paid: number; count: number }>();
    for (const c of creatives ?? []) {
      if (!c.campaignTag) continue;
      const g = map.get(c.campaignTag) ?? { clicks: 0, signups: 0, paid: 0, count: 0 };
      g.clicks += c.clicks;
      g.signups += c.signups;
      g.paid += c.paid;
      g.count += 1;
      map.set(c.campaignTag, g);
    }
    return [...map.entries()];
  }, [creatives]);

  const compared = (creatives ?? []).filter((c) => compare.includes(c.creativeId));
  const top = useMemo(() => {
    const withData = (creatives ?? []).filter((c) => c.clicks >= 30 && c.paid > 0);
    return withData.sort((a, b) => (b.clickToPaidPct ?? 0) - (a.clickToPaidPct ?? 0))[0] ?? null;
  }, [creatives]);

  if (error) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="font-bold text-white">Repurposed creatives</h2>
        <p className="text-sm text-red-300 mt-1">{error}</p>
      </section>
    );
  }
  if (creatives === null) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="font-bold text-white">Repurposed creatives</h2>
        <p className="text-sm text-slate-400 mt-1">Loading per-creative performance…</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-bold text-white">Repurposed creatives — what each one earned</h2>
          <p className="text-[13px] text-slate-400">
            Every variation carries its own tracked creative ID. These numbers are WorldEye-measured end to end.
          </p>
        </div>
        {top && (
          <Link href={`/affiliates/studio/repurpose?project=${top.projectId}`} className={GHOST}>
            Repurpose the top performer →
          </Link>
        )}
      </div>

      {creatives.length === 0 ? (
        <p className="text-sm text-slate-400">
          No repurposed creatives yet. <Link href="/affiliates/studio/repurpose" className="text-sky-300">Open the Repurposing Machine</Link>{" "}
          to turn a video into tracked variations.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left font-mono text-[11px] uppercase tracking-wider text-slate-500">
                <th className="py-1.5 pr-2">Compare</th>
                <th className="py-1.5 pr-2">Creative</th>
                <th className="py-1.5 pr-2">Clicks</th>
                <th className="py-1.5 pr-2">Signups</th>
                <th className="py-1.5 pr-2">Started a plan</th>
                <th className="py-1.5 pr-2">Paying</th>
                <th className="py-1.5 pr-2">Click→paid</th>
                <th className="py-1.5">Commission</th>
              </tr>
            </thead>
            <tbody>
              {creatives.map((c) => (
                <tr key={c.creativeId} className="border-t border-white/5 text-slate-300">
                  <td className="py-2 pr-2">
                    <input
                      type="checkbox"
                      checked={compare.includes(c.creativeId)}
                      onChange={(e) =>
                        setCompare((s) =>
                          e.target.checked ? [...s, c.creativeId].slice(-3) : s.filter((x) => x !== c.creativeId),
                        )
                      }
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <span className="text-white font-semibold">{c.title}</span>
                    <span className="block text-[11px] text-slate-500">
                      {c.projectTitle} · {c.direction.replace(/_/g, " ")} · {c.aspect} · {c.creativeId}
                      {c.postedPlatform ? ` · posted: ${c.postedPlatform}` : ""}
                    </span>
                  </td>
                  <td className="py-2 pr-2">{c.clicks}</td>
                  <td className="py-2 pr-2">{c.signups}</td>
                  <td className="py-2 pr-2">{c.startedPlan}</td>
                  <td className="py-2 pr-2">{c.paid}</td>
                  <td className="py-2 pr-2">{c.clickToPaidPct === null ? "—" : `${c.clickToPaidPct}%`}</td>
                  <td className="py-2">${(c.commissionCents / 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {compared.length >= 2 && (
        <div className="rounded-xl border border-sky-400/20 bg-sky-500/5 p-3.5">
          <div className="font-mono text-[11px] uppercase tracking-wider text-sky-300 mb-1.5">Side by side</div>
          <div className="grid md:grid-cols-3 gap-3">
            {compared.map((c) => (
              <div key={c.creativeId} className="text-[13px] text-slate-300">
                <div className="font-semibold text-white">{c.title}</div>
                <div>
                  {c.clicks} clicks · {c.signups} signups · {c.paid} paying ·{" "}
                  {c.clickToPaidPct === null ? "—" : `${c.clickToPaidPct}%`} click→paid · $
                  {(c.commissionCents / 100).toFixed(2)}
                </div>
                <div className="text-slate-500 text-[12px]">
                  {c.direction.replace(/_/g, " ")} · {c.aspect}
                  {c.campaignTag ? ` · campaign: ${c.campaignTag}` : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tags.length > 0 && (
        <div>
          <div className="font-mono text-[11px] uppercase tracking-wider text-slate-500 mb-1.5">
            Campaign tags (A/B reading)
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map(([tag, g]) => (
              <span key={tag} className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-[12px] text-slate-300">
                <span className="text-white font-semibold">{tag}</span> — {g.count} creatives · {g.clicks} clicks ·{" "}
                {g.signups} signups · {g.paid} paying
              </span>
            ))}
          </div>
          <p className="text-[12px] text-slate-500 mt-1.5">
            Tag projects in the Machine (project settings) to run deliberate A/B tests — same source, different tags,
            compare the rollups here.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-black/20 p-3.5 space-y-1.5">
        <div className="font-mono text-[11px] uppercase tracking-wider text-sky-300">Marketing Coach</div>
        {coach.map((line, i) => (
          <p key={i} className="text-[13px] text-slate-300 leading-relaxed">{line}</p>
        ))}
        <p className="text-[11.5px] text-slate-500">
          The coach only speaks when a pattern clears a minimum-data bar (30+ clicks) — otherwise it says so. For a
          written deep-dive, ask for an AI plan in the Machine (AI Content Planner, made to order by Cosmo).
        </p>
      </div>

      {dataNote && <p className="text-[12px] text-slate-500 leading-relaxed">{dataNote}</p>}
    </section>
  );
}
