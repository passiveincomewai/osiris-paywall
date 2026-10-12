"use client";

// Admin: Studio report — creations by kind, credits issued vs consumed,
// top templates, top creators, campaign participation, badge counts.
// Data: GET /api/admin/studio/report. Rendered defensively: any section
// the API doesn't return is shown as "not reported" rather than faked.
import { useEffect, useState } from "react";

interface ReportShape {
  creationsByKind?: Record<string, number>;
  creations?: { total?: number; byKind?: Record<string, number> };
  credits?: {
    issued?: number;
    issuedByReason?: Record<string, number>;
    consumed?: number;
    earned?: number;
    spent?: number;
    refunded?: number;
    campaignRewards?: number;
  };
  creditsIssued?: number;
  creditsConsumed?: number;
  topTemplates?: { slug?: string; title?: string; count?: number; creations?: number }[];
  topCreators?: { name?: string; code?: string; profileId?: string; count?: number; creations?: number; xp?: number }[];
  campaigns?: { id?: string; campaignId?: string; name?: string; joined?: number; completed?: number; participations?: number }[];
  campaignParticipation?: { campaignId?: string; name?: string; joined?: number; completed?: number; participations?: number }[] | { joined?: number; completed?: number; total?: number };
  badges?: Record<string, number>;
  badgeCounts?: Record<string, number>;
  [key: string]: unknown;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-white/40 mb-2">{title}</div>
      {children}
    </div>
  );
}

function KeyValues({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return <p className="text-sm text-white/40">Nothing yet.</p>;
  return (
    <ul className="space-y-1 text-sm">
      {entries.map(([k, v]) => (
        <li key={k} className="flex justify-between gap-3">
          <span className="font-mono text-white/70 truncate">{k}</span>
          <span className="font-mono font-bold text-white tabular-nums">{v.toLocaleString()}</span>
        </li>
      ))}
    </ul>
  );
}

const notReported = <p className="text-sm text-white/35">Not reported by the API.</p>;

export default function StudioReport() {
  const [report, setReport] = useState<ReportShape | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/studio/report", { cache: "no-store" });
        const j = await res.json().catch(() => ({}));
        if (res.ok) setReport(j as ReportShape);
        else setMsg(typeof j.error === "string" ? j.error : `Couldn't load the report (${res.status})`);
      } catch {
        setMsg("Network error loading the report.");
      }
      setLoading(false);
    })();
  }, []);

  const byKind = report?.creationsByKind ?? report?.creations?.byKind;
  const issuedByReason = report?.credits?.issuedByReason;
  const creditsIssued =
    report?.credits?.issued ??
    report?.credits?.earned ??
    report?.creditsIssued ??
    (issuedByReason ? Object.values(issuedByReason).reduce((sum, v) => sum + v, 0) : undefined);
  const creditsConsumed = report?.credits?.consumed ?? report?.credits?.spent ?? report?.creditsConsumed;
  const participation = report?.campaignParticipation ?? report?.campaigns;
  const badgeCounts = report?.badgeCounts ?? report?.badges;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
      <div className="text-sm font-bold text-white">📊 Studio report</div>
      {msg && <div className="text-xs font-mono text-red-300">{msg}</div>}
      {loading ? (
        <p className="text-sm text-white/40">Loading the report…</p>
      ) : !report ? (
        <p className="text-sm text-white/40">Report unavailable.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <Section title="Creations by kind">
            {byKind ? <KeyValues data={byKind} /> : notReported}
            {typeof report.creations?.total === "number" && (
              <div className="mt-2 text-xs font-mono text-white/40">Total: {report.creations.total.toLocaleString()}</div>
            )}
          </Section>

          <Section title="Credits">
            {creditsIssued === undefined && creditsConsumed === undefined ? (
              notReported
            ) : (
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/35">Issued</div>
                  <div className="text-2xl font-bold font-mono text-emerald-300">{(creditsIssued ?? 0).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/35">Consumed</div>
                  <div className="text-2xl font-bold font-mono text-white">{(creditsConsumed ?? 0).toLocaleString()}</div>
                </div>
              </div>
            )}
            {issuedByReason && (
              <div className="mt-3">
                <KeyValues data={issuedByReason} />
              </div>
            )}
          </Section>

          <Section title="Top templates">
            {Array.isArray(report.topTemplates) && report.topTemplates.length > 0 ? (
              <ol className="space-y-1 text-sm list-decimal list-inside">
                {report.topTemplates.map((t, i) => (
                  <li key={t.slug ?? t.title ?? i} className="text-white/70">
                    <span className="font-semibold text-white">{t.title ?? t.slug ?? "Template"}</span>{" "}
                    <span className="font-mono text-xs text-white/40">{(t.count ?? t.creations ?? 0).toLocaleString()} creations</span>
                  </li>
                ))}
              </ol>
            ) : (
              notReported
            )}
          </Section>

          <Section title="Top creators">
            {Array.isArray(report.topCreators) && report.topCreators.length > 0 ? (
              <ol className="space-y-1 text-sm list-decimal list-inside">
                {report.topCreators.map((c, i) => (
                  <li key={c.profileId ?? c.code ?? i} className="text-white/70">
                    <span className="font-semibold text-white">{c.name ?? c.code ?? "Creator"}</span>{" "}
                    <span className="font-mono text-xs text-white/40">
                      {(c.creations ?? c.count ?? 0).toLocaleString()} creations
                      {typeof c.xp === "number" ? ` · ${c.xp.toLocaleString()} XP` : ""}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              notReported
            )}
          </Section>

          <Section title="Campaign participation">
            {Array.isArray(participation) ? (
              participation.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {participation.map((p, i) => (
                    <li key={p.campaignId ?? ("id" in p ? (p as { id?: string }).id : undefined) ?? i} className="flex justify-between gap-3">
                      <span className="text-white/70 truncate">{p.name ?? "Campaign"}</span>
                      <span className="font-mono text-xs text-white/50 shrink-0">
                        {(p.joined ?? p.participations ?? 0).toLocaleString()} joined · {(p.completed ?? 0).toLocaleString()} completed
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-white/40">No campaigns yet.</p>
              )
            ) : participation ? (
              <p className="text-sm text-white/70 font-mono">
                {(participation.joined ?? participation.total ?? 0).toLocaleString()} joined ·{" "}
                {(participation.completed ?? 0).toLocaleString()} completed
              </p>
            ) : (
              notReported
            )}
          </Section>

          <Section title="Badge counts">
            {badgeCounts ? <KeyValues data={badgeCounts} /> : notReported}
          </Section>
        </div>
      )}
    </div>
  );
}
