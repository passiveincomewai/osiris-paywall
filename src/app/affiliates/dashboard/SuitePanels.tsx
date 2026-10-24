"use client";
// Affiliate-suite panels: live insights (range stats, funnel, retention,
// sources, creative, rank ladder), notification center, tracking links +
// UTM builder, the Cinematic Director switch, and plain-language help.
// Every number here comes from the affiliate APIs — real ledger data or
// an explicitly labelled sample in demo mode.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  StatCard, SectionTitle, Pill, CopyButton, fmtCents,
} from "@/components/affiliate/ui";
import { AreaChart } from "@/components/affiliate/charts";
import { buildTrackedUrl } from "@/lib/affiliate/insights";

export interface InsightsData {
  rangeTotals: { clicks: number; signups: number; conversions: number; earnedCents: number; range: string };
  series: { date: string; cents: number; clicks: number }[];
  granularity: string;
  funnel: { key: string; label: string; count: number; pctOfPrev: number | null; pctOfFirst: number }[];
  retention: {
    referredSubscribers: number; currentlyPaying: number; currentlyTrialing: number;
    pastDue: number; churned: number; trialToPaidPct: number; note: string;
  };
  sources: {
    byPlatform: { label: string; count: number; pct: number }[];
    byUtmSource: { label: string; count: number; pct: number }[];
    byUtmCampaign: { label: string; count: number; pct: number }[];
    byDevice: { label: string; count: number; pct: number }[];
    byOs: { label: string; count: number; pct: number }[];
    trackedShare: number;
    country: { tracked: boolean; note: string };
  };
  links: { id: string | null; label: string; slug: string; url: string; clicks: number; signups: number; primary: boolean }[];
  creative: {
    rows: { templateSlug: string; kind: string; creations: number; signups: number; signupsTracked: boolean }[];
    totalCreations: number; note: string;
  };
  ladder: {
    key: string; name: string; minXp: number; commissionPct: number; discountPct: number;
    color: string; badge: string; unlocks: string[]; reached: boolean; current: boolean;
  }[];
  rankHistory: { rankKey: string; rankName: string; reachedAt: string; xpTotal: number }[];
}

const card = "rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-4 md:p-5";
const input = "w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono outline-none focus:border-cyan-400/60";
const btnGhost = "px-3 py-1.5 rounded-lg text-xs font-mono border border-white/10 text-slate-300 hover:text-white hover:border-cyan-400/50";
const DEMO_MSG = "This is the read-only demo — join free to get a dashboard with your own numbers.";

async function api(path: string, init?: RequestInit) {
  const r = await fetch(path, init);
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, j };
}

function SourceTable({ title, rows }: { title: string; rows: { label: string; count: number; pct: number }[] }) {
  return (
    <div>
      <div className="text-[10px] font-mono tracking-[0.2em] text-slate-400 uppercase mb-2">{title}</div>
      {rows.length === 0 && <div className="text-xs text-slate-500">No clicks in this range yet.</div>}
      <div className="space-y-1.5">
        {rows.slice(0, 8).map((r) => (
          <div key={r.label} className="flex items-center gap-2 text-xs">
            <span className="flex-1 min-w-0 truncate text-slate-300">{r.label}</span>
            <span className="font-mono text-white">{r.count.toLocaleString()}</span>
            <span className="font-mono text-slate-500 w-12 text-right">{r.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClickBars({ data }: { data: { date: string; clicks: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.clicks));
  return (
    <div className="flex items-end gap-[2px] h-16 mt-2" aria-hidden>
      {data.map((d, i) => (
        <div key={i} className="flex-1 rounded-t bg-cyan-400/50" style={{ height: `${Math.max(2, (d.clicks / max) * 100)}%` }} title={`${d.date}: ${d.clicks} clicks`} />
      ))}
    </div>
  );
}

export function InsightsSection({ demoData }: { demoData?: InsightsData }) {
  const demo = !!demoData;
  const [range, setRange] = useState("30");
  const [granularity, setGranularity] = useState("day");
  const [data, setData] = useState<InsightsData | null>(demoData ?? null);
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const rangeRef = useRef(range);
  rangeRef.current = range;
  const granRef = useRef(granularity);
  granRef.current = granularity;

  const load = useCallback(async () => {
    if (demo) return;
    setLoading(true);
    const { ok, j } = await api(`/api/affiliate/insights?range=${rangeRef.current}&granularity=${granRef.current}`);
    if (ok) {
      setData(j as InsightsData);
      setUpdatedAt(new Date().toLocaleTimeString());
    }
    setLoading(false);
  }, [demo]);

  useEffect(() => { void load(); }, [load, range, granularity]);
  useEffect(() => {
    if (demo) return;
    const iv = setInterval(() => { void load(); }, 60000);
    return () => clearInterval(iv);
  }, [load, demo]);

  if (!data) return <div className={card + " text-sm text-slate-500"}>Loading insights…</div>;
  const rt = data.rangeTotals;

  return (
    <div className="space-y-6">
      {/* ── Live overview header ─────────────────────────────────── */}
      <div className={card}>
        <SectionTitle
          kicker="Live overview"
          title="Performance in range"
          right={
            <div className="flex flex-wrap items-center gap-1">
              {["7", "30", "90", "all"].map((r) => (
                <button key={r} onClick={() => setRange(r)} disabled={demo}
                  className={`px-3 py-1 rounded-lg text-xs font-mono border ${range === r ? "border-cyan-400/60 text-cyan-200 bg-cyan-400/10" : "border-white/10 text-slate-400"} ${demo ? "opacity-60 cursor-not-allowed" : ""}`}>
                  {r === "all" ? "ALL" : `${r}D`}
                </button>
              ))}
              <select value={granularity} onChange={(e) => setGranularity(e.target.value)} disabled={demo}
                className="px-2 py-1 rounded-lg text-xs font-mono bg-white/5 border border-white/10 text-slate-300 disabled:opacity-60" aria-label="Chart grouping">
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
              </select>
              {!demo && <button onClick={() => void load()} className={btnGhost}>{loading ? "…" : "↻ Refresh"}</button>}
            </div>
          }
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label={`Clicks (${range === "all" ? "all time" : `last ${range}d`})`} value={rt.clicks.toLocaleString()} accent="#22d3ee" />
          <StatCard label="Signups in range" value={rt.signups.toLocaleString()} accent="#818cf8" />
          <StatCard label="New paying in range" value={rt.conversions.toLocaleString()} accent="#34d399" />
          <StatCard label="Earned in range" value={fmtCents(rt.earnedCents)} accent="#fbbf24" />
        </div>
        <div className="mt-4">
          <div className="text-[10px] font-mono tracking-[0.2em] text-slate-400 uppercase mb-1">Earnings ({granularity})</div>
          {data.series.some((s) => s.cents > 0)
            ? <AreaChart data={data.series} height={140} />
            : <div className="text-sm text-slate-500 py-4">No earnings in this range yet — the chart lights up when referred subscriptions bill.</div>}
          <div className="text-[10px] font-mono tracking-[0.2em] text-slate-400 uppercase mt-3">Clicks ({granularity})</div>
          <ClickBars data={data.series} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <span>{demo ? "Sample figures — the demo refreshes nothing." : `Auto-refreshes every minute${updatedAt ? ` · last updated ${updatedAt}` : ""}.`}</span>
          {!demo && (
            <span className="flex gap-1 ml-auto">
              <span className="text-slate-400 font-mono mr-1">Export CSV:</span>
              {["clicks", "commissions", "payouts"].map((t) => (
                <a key={t} href={`/api/affiliate/export?type=${t}`} className={btnGhost + " !py-0.5"}>{t}</a>
              ))}
            </span>
          )}
        </div>
      </div>

      {/* ── Funnel + retention ───────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className={card}>
          <SectionTitle kicker="Funnel" title="Clicks → paying" />
          <div className="space-y-3">
            {data.funnel.map((s) => (
              <div key={s.key}>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">{s.label}</span>
                  <span className="font-mono text-white">{s.count.toLocaleString()}
                    {s.pctOfPrev !== null && <span className="text-slate-500"> · {s.pctOfPrev}% of previous</span>}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-white/10 mt-1 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, s.pctOfFirst)}%`, background: "linear-gradient(90deg,#0096FF,#22d3ee)" }} />
                </div>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-slate-500 mt-3">All-time cohort: of everyone who ever clicked your links, how far they got. Percentages are of the previous step.</div>
        </div>

        <div className={card}>
          <SectionTitle kicker="Retention" title="Your subscribers today" />
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Paying now" value={String(data.retention.currentlyPaying)} accent="#34d399" />
            <StatCard label="In trial now" value={String(data.retention.currentlyTrialing)} accent="#22d3ee" />
            <StatCard label="Past due" value={String(data.retention.pastDue)} accent="#fbbf24" />
            <StatCard label="Churned" value={String(data.retention.churned)} accent="#f87171" />
          </div>
          <div className="mt-3 text-sm text-slate-300">
            Trial → paid quality: <span className="font-mono font-bold text-white">{data.retention.trialToPaidPct}%</span>
            <span className="text-slate-500"> of referred users who started a plan became paying subscribers.</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2">{data.retention.note}</div>
        </div>
      </div>

      {/* ── Sources ──────────────────────────────────────────────── */}
      <div className={card}>
        <SectionTitle kicker="Sources" title="Where clicks come from" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <SourceTable title="Platform (referrer)" rows={data.sources.byPlatform} />
          <SourceTable title="UTM source" rows={data.sources.byUtmSource} />
          <SourceTable title="Device" rows={data.sources.byDevice} />
          <SourceTable title="Campaign (UTM)" rows={data.sources.byUtmCampaign} />
        </div>
        <div className="text-[11px] text-slate-500 mt-4 space-y-1">
          <div>{data.sources.country.note}</div>
          <div>
            Source tags are captured on new clicks as they happen
            {data.sources.trackedShare < 100 ? ` — ${data.sources.trackedShare}% of clicks in this range carry a tag so far; older clicks read "Not tracked".` : "."}
          </div>
        </div>
      </div>

      {/* ── Creative performance ─────────────────────────────────── */}
      <div className={card}>
        <SectionTitle kicker="Creative" title="Studio creative performance" />
        {data.creative.rows.length === 0 && <div className="text-sm text-slate-500">Nothing created in the Studio yet — your creations will show up here.</div>}
        <div className="space-y-2">
          {data.creative.rows.map((r, i) => (
            <div key={i} className="flex items-center justify-between gap-2 py-2 border-b border-white/5 text-sm">
              <span className="text-slate-300 min-w-0 truncate">{r.templateSlug} <span className="text-slate-500">({r.kind})</span></span>
              <span className="font-mono text-slate-400 text-xs">{r.creations} created · {r.signups} signups{r.signupsTracked ? "" : " (not tracked)"}</span>
            </div>
          ))}
        </div>
        <div className="text-[11px] text-slate-500 mt-3">{data.creative.note}</div>
      </div>

      {/* ── Rank ladder + history ────────────────────────────────── */}
      <div className={card}>
        <SectionTitle kicker="Ranks" title="The ladder — pay, unlocks & your history" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.ladder.map((r) => (
            <div key={r.key} className={`rounded-xl border p-3 ${r.current ? "bg-white/[0.05]" : "border-white/10 bg-black/20"}`}
              style={r.current ? { borderColor: r.color + "88" } : undefined}>
              <div className="flex items-center justify-between">
                <span className="font-bold" style={{ color: r.color }}>{r.badge} {r.name}</span>
                {r.current ? <Pill color={r.color}>YOU ARE HERE</Pill> : r.reached ? <Pill color="#34d399">REACHED</Pill> : <span className="text-[10px] font-mono text-slate-500">{r.minXp.toLocaleString()} XP</span>}
              </div>
              <ul className="mt-2 space-y-1 text-xs text-slate-400">
                {r.unlocks.map((u) => <li key={u}>• {u}</li>)}
              </ul>
            </div>
          ))}
        </div>
        {data.rankHistory.length > 0 && (
          <div className="mt-4">
            <div className="text-[10px] font-mono tracking-[0.2em] text-slate-400 uppercase mb-2">Your rank history</div>
            <div className="flex flex-wrap gap-2">
              {data.rankHistory.map((h, i) => (
                <span key={i} className="text-xs font-mono text-slate-300 border border-white/10 rounded-lg px-2.5 py-1.5">
                  {h.rankName} <span className="text-slate-500">· {new Date(h.reachedAt).toLocaleDateString()} · {h.xpTotal.toLocaleString()} XP</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Notifications ─────────────────────────────────────────────────── */

interface NotificationItem { id: string; type: string; title: string; body: string; href: string | null; read: boolean; createdAt: string }

export function NotificationsPanel({ demoItems }: { demoItems?: NotificationItem[] }) {
  const demo = !!demoItems;
  const [items, setItems] = useState<NotificationItem[]>(demoItems ?? []);
  const [unread, setUnread] = useState(demoItems ? demoItems.filter((i) => !i.read).length : 0);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (demo) return;
    const { ok, j } = await api("/api/affiliate/notifications");
    if (ok) { setItems(j.notifications); setUnread(j.unread); }
  }, [demo]);
  useEffect(() => { void load(); }, [load]);

  const markAll = async () => {
    if (demo) return;
    await api("/api/affiliate/notifications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) });
    void load();
  };

  const [marking, setMarking] = useState<ReadonlySet<string>>(new Set());

  const markOne = async (id: string) => {
    if (demo || marking.has(id)) return;
    setMarking((prev) => new Set(prev).add(id));
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read: true } : i)));
    setUnread((u) => Math.max(0, u - 1));
    try {
      const { ok } = await api("/api/affiliate/notifications", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      if (!ok) void load();
    } catch {
      void load();
    } finally {
      setMarking((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  return (
    <div className={card}>
      <div className="flex items-center justify-between gap-3">
        <SectionTitle kicker="Inbox" title="Notifications" />
        <div className="flex items-center gap-2 mb-4">
          {unread > 0 && <Pill color="#f472b6">{unread} NEW</Pill>}
          <button onClick={() => setOpen((o) => !o)} className={btnGhost}>{open ? "Hide" : "Show"}</button>
          {unread > 0 && !demo && <button onClick={markAll} className={btnGhost}>Mark all read</button>}
        </div>
      </div>
      {open && (
        items.length === 0
          ? <div className="text-sm text-slate-500">Nothing yet — signups, conversions and payouts will land here as they happen.</div>
          : <div className="space-y-2 max-h-80 overflow-y-auto">
              {items.map((n) => (
                <div key={n.id} className={`rounded-xl border px-3 py-2.5 ${n.read ? "border-white/5" : "border-cyan-400/30 bg-cyan-400/[0.04]"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-white min-w-0">{n.title}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      {!n.read && !demo && (
                        <button onClick={() => void markOne(n.id)} disabled={marking.has(n.id)} className={btnGhost + " !px-2 !py-0.5 !text-[10px] whitespace-nowrap disabled:opacity-50"}>Mark read</button>
                      )}
                      <span className="text-[10px] font-mono text-slate-500">{new Date(n.createdAt).toLocaleString()}</span>
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{n.body}</div>
                </div>
              ))}
            </div>
      )}
      {!open && items.length > 0 && (
        <div className="text-xs text-slate-500">Latest: {items[0].title} — {new Date(items[0].createdAt).toLocaleDateString()}</div>
      )}
    </div>
  );
}

/* ── Tracking links + UTM builder ──────────────────────────────────── */

interface TrackingLink { id: string; label: string; slug: string; url: string; clicks: number; createdAt: string }

export function TrackingLinksPanel({ referralLink, demoLinks }: { referralLink: string; demoLinks?: { label: string; slug: string; url: string; clicks: number; signups: number }[] }) {
  const demo = !!demoLinks;
  const [links, setLinks] = useState<TrackingLink[]>([]);
  const [label, setLabel] = useState("");
  const [slug, setSlug] = useState("");
  const [msg, setMsg] = useState("");
  const [utmBase, setUtmBase] = useState(referralLink);
  const [utm, setUtm] = useState({ source: "", medium: "", campaign: "" });

  const load = useCallback(async () => {
    if (demo) return;
    const { ok, j } = await api("/api/affiliate/links");
    if (ok) setLinks(j.links);
  }, [demo]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setUtmBase(referralLink); }, [referralLink]);

  const create = async () => {
    if (demo) { setMsg(DEMO_MSG); return; }
    const { ok, j } = await api("/api/affiliate/links", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ label, slug: slug || undefined }),
    });
    if (ok) { setLabel(""); setSlug(""); setMsg(`Created: ${j.link.url}`); void load(); }
    else setMsg(j.error ?? "Couldn't create the link.");
  };

  const remove = async (id: string) => {
    if (demo) { setMsg(DEMO_MSG); return; }
    await api("/api/affiliate/links", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
    void load();
  };

  const built = (() => {
    try { return buildTrackedUrl(utmBase || referralLink, utm); } catch { return referralLink; }
  })();

  const rows: { id?: string; label: string; url: string; clicks: number; signups?: number }[] = demo
    ? demoLinks!.map((l) => ({ label: l.label, url: l.url, clicks: l.clicks, signups: l.signups }))
    : links.map((l) => ({ id: l.id, label: l.label, url: l.url, clicks: l.clicks }));

  return (
    <div className={card}>
      <SectionTitle kicker="Tracking" title="Tracking links & UTM builder" />
      <div className="text-xs text-slate-400 mb-3">
        Your primary link always works. Add labeled links for channels — a newsletter, one specific video, a community —
        and each one reports its own clicks and signups here. The <span className="font-mono text-slate-200">?t=</span> tag rides on your primary code, so attribution never forks.
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm py-1.5 border-b border-white/5">
          <Pill color="#38bdf8">PRIMARY</Pill>
          <span className="flex-1 min-w-0 truncate font-mono text-xs text-slate-300">{referralLink}</span>
          <CopyButton text={referralLink} label="Copy" />
        </div>
        {rows.map((l, i) => (
          <div key={l.id ?? i} className="flex items-center gap-2 text-sm py-1.5 border-b border-white/5">
            <span className="text-slate-200 font-bold text-xs w-28 truncate">{l.label}</span>
            <span className="flex-1 min-w-0 truncate font-mono text-xs text-slate-400">{l.url}</span>
            <span className="font-mono text-xs text-slate-400">{l.clicks.toLocaleString()} clicks{l.signups !== undefined ? ` · ${l.signups} signups` : ""}</span>
            <CopyButton text={l.url} label="Copy" />
            {l.id && <button onClick={() => remove(l.id!)} className={btnGhost + " !border-red-400/30 !text-red-300"}>Delete</button>}
          </div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-2 mt-4">
        <input className={input} placeholder="Label — e.g. YouTube description" value={label} onChange={(e) => setLabel(e.target.value)} />
        <input className={input + " sm:!w-44"} placeholder="tag (optional)" value={slug} onChange={(e) => setSlug(e.target.value)} />
        <button onClick={create} disabled={!label.trim()} className={btnGhost + " whitespace-nowrap disabled:opacity-50"}>Add link</button>
      </div>
      {msg && <div className="text-xs text-cyan-200 mt-2">{msg}</div>}

      <div className="mt-5 pt-4 border-t border-white/10">
        <div className="text-[10px] font-mono tracking-[0.2em] text-slate-400 uppercase mb-2">UTM builder</div>
        <div className="grid sm:grid-cols-4 gap-2">
          <select className={input} value={utmBase} onChange={(e) => setUtmBase(e.target.value)} aria-label="Base link">
            <option value={referralLink}>Primary link</option>
            {rows.map((l, i) => <option key={i} value={l.url}>{l.label}</option>)}
          </select>
          <input className={input} placeholder="utm_source — e.g. youtube" value={utm.source} onChange={(e) => setUtm({ ...utm, source: e.target.value })} />
          <input className={input} placeholder="utm_medium — e.g. video" value={utm.medium} onChange={(e) => setUtm({ ...utm, medium: e.target.value })} />
          <input className={input} placeholder="utm_campaign — e.g. storm-season" value={utm.campaign} onChange={(e) => setUtm({ ...utm, campaign: e.target.value })} />
        </div>
        <div className="flex gap-2 mt-2">
          <input className={input} readOnly value={built} onFocus={(e) => e.target.select()} />
          <CopyButton text={built} label="Copy URL" />
        </div>
        <div className="text-[11px] text-slate-500 mt-2">UTM tags are captured on every click from now on and broken down in Sources above.</div>
      </div>
    </div>
  );
}

/* ── Cinematic Director switch ─────────────────────────────────────── */

export function DirectorCard({ enabled, onToggle, demo }: { enabled: boolean; onToggle: (next: boolean) => void; demo?: boolean }) {
  return (
    <div className={card}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <div className="text-[10px] font-mono tracking-[0.2em] text-slate-400 uppercase mb-1">Globe tools</div>
          <div className="text-white font-bold">Cinematic Director</div>
          <div className="text-sm text-slate-400 mt-1 max-w-lg">
            The globe&apos;s camera-scene tools — scripted flights, presets and WebM globe recording.
            They stay <span className="text-slate-200 font-bold">off by default</span>; switch them on here and the
            Director button on the globe unlocks for your account.
          </div>
        </div>
        <button
          onClick={() => onToggle(!enabled)}
          aria-pressed={enabled}
          className={`shrink-0 relative w-16 h-9 rounded-full border transition-colors ${enabled ? "bg-cyan-400/30 border-cyan-300/60" : "bg-white/5 border-white/15"}`}
        >
          <span className={`absolute top-1 w-6 h-6 rounded-full transition-all ${enabled ? "left-8 bg-cyan-300" : "left-1 bg-slate-400"}`} />
        </button>
      </div>
      <div className="text-xs font-mono mt-2" style={{ color: enabled ? "#22d3ee" : "#94a3b8" }}>
        {enabled ? "ON — Director tools are live on the globe for you." : "OFF — the globe shows the Director as locked."}
        {demo ? " (demo)" : ""}
      </div>
    </div>
  );
}

/* ── Help ──────────────────────────────────────────────────────────── */

export function HelpPanel() {
  const blocks: [string, string][] = [
    ["Pending", "A commission you earned that is still inside its holding period. It isn't payable yet — the hold is what lets refunds and chargebacks settle first."],
    ["Available", "Money you can withdraw. When your available balance reaches your payout threshold (the $25 program minimum, or higher if you set your own), the Request payout button unlocks."],
    ["Hold / holding period", "Commissions wait 30 days after the subscription payment clears before becoming available. If the subscriber refunds or disputes in that window, the commission reverses instead of paying out money that came back."],
    ["L1 / L2 / L3", "L1 is your direct commission — your rank rate (15–30%) on subscriptions from your own referrals. L2 (+5%) and L3 (+2%) are overrides on sales made by affiliates you recruited, and their recruits. Overrides are paid only on real paid subscriptions, never for recruiting alone."],
    ["XP and ranks", "XP is earned from real activity — signups, paying referrals, missions. XP unlocks ranks; ranks raise your commission rate and your audience discount code. XP has no cash value and can't be bought."],
    ["Attribution window", "When someone clicks your link, they're attributed to you for 30 days. If they subscribe in that window — on any visit — the sale is yours. A sale made with your discount code counts too, even without a click."],
    ["When you get paid", "Request a payout from the Payouts card once your available balance clears your threshold. Requests are reviewed by the team and paid to the method you set there. Commissions keep recurring on every renewal while your referrals stay subscribed."],
  ];
  return (
    <div className={card}>
      <SectionTitle kicker="Help" title="How it all works, in plain words" />
      <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
        {blocks.map(([t, b]) => (
          <div key={t}>
            <div className="text-sm font-bold text-white">{t}</div>
            <div className="text-sm text-slate-400 leading-relaxed mt-0.5">{b}</div>
          </div>
        ))}
      </div>
      <div className="text-xs text-slate-500 mt-4">
        The binding rules are in the <a href="/affiliates/terms" className="text-cyan-300 hover:underline">program terms</a>.
        Questions: use the contact page and mention your referral code.
      </div>
    </div>
  );
}
