"use client";
// Affiliate admin console: overview, affiliates, payouts, ledger, fraud, settings, audit.
import { useEffect, useState } from "react";
import { StatCard, SectionTitle, Pill, EmptyState, fmtCents } from "@/components/affiliate/ui";

type Tab = "overview" | "affiliates" | "payouts" | "ledger" | "fraud" | "settings" | "audit";

async function api(path: string, init?: RequestInit) {
  const r = await fetch(path, init);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
  return j;
}

const card = "rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-4 md:p-5";
const input = "w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-cyan-400/60";
const btn = "inline-flex items-center justify-center min-h-10 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors";

export default function AdminClient() {
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async (t: Tab = tab, query = q) => {
    setLoading(true);
    try {
      if (t === "overview") setData({ overview: await api("/api/admin/affiliates/manage?view=overview") });
      else if (t === "affiliates") setData({ list: await api(`/api/admin/affiliates?q=${encodeURIComponent(query)}&take=50`) });
      else if (t === "payouts") setData({ payouts: await api("/api/admin/affiliates/payouts") });
      else if (t === "ledger") setData({ ledger: await api("/api/admin/affiliates/manage?view=commissions") });
      else if (t === "fraud") setData({ fraud: await api("/api/admin/affiliates/manage?view=fraud") });
      else if (t === "settings") setData({ settings: (await api("/api/admin/affiliates/manage?view=overview")).settings });
      else if (t === "audit") setData({ audit: await api("/api/admin/affiliates/manage?view=audit") });
    } catch (e) { setData({ error: (e as Error).message }); }
    setLoading(false);
  };

  useEffect(() => { load("overview"); }, []);

  const switchTab = (t: Tab) => { setTab(t); load(t); };

  return (
    <div>
      <div className="flex gap-1.5 overflow-x-auto mb-6 pb-1">
        {(["overview", "affiliates", "payouts", "ledger", "fraud", "settings", "audit"] as Tab[]).map((t) => (
          <button key={t} onClick={() => switchTab(t)}
            className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-mono capitalize whitespace-nowrap border transition-colors ${tab === t ? "bg-cyan-400/15 border-cyan-400/50 text-cyan-200" : "border-white/10 text-slate-400 hover:text-white"}`}>
            {t}
          </button>
        ))}
      </div>

      {loading && <div className="text-slate-400 font-mono text-sm">Loading…</div>}
      {!loading && (data as { error?: string }).error && (
        <EmptyState title="Couldn't load" body={(data as { error: string }).error} />
      )}

      {!loading && tab === "overview" && <Overview d={(data.overview ?? {}) as Record<string, number>} />}
      {!loading && tab === "affiliates" && (
        <Affiliates d={(data.list ?? {}) as { total: number; affiliates: AffiliateRow[] }} q={q} setQ={setQ} reload={() => load("affiliates", q)} />
      )}
      {!loading && tab === "payouts" && <Payouts d={(data.payouts ?? {}) as { payouts: PayoutRow[] }} reload={() => load("payouts")} />}
      {!loading && tab === "ledger" && <Ledger d={(data.ledger ?? {}) as { commissions: CommRow[] }} />}
      {!loading && tab === "fraud" && <Fraud d={(data.fraud ?? {}) as { signals: Signal[] }} />}
      {!loading && tab === "settings" && <Settings s={(data.settings ?? {}) as SettingsShape} reload={() => load("settings")} />}
      {!loading && tab === "audit" && <Audit d={(data.audit ?? {}) as { audit: AuditRow[] }} />}
    </div>
  );
}

/* ── Overview ── */
function Overview({ d }: { d: Record<string, number> }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      <StatCard label="Affiliates" value={String(d.affiliates ?? 0)} sub={`${d.activeAffiliates ?? 0} active`} />
      <StatCard label="Commission liability" value={fmtCents(d.commissionLiabilityCents ?? 0)} sub="owed, not yet paid" accent="#fbbf24" />
      <StatCard label="Paid out" value={fmtCents(d.paidOutCents ?? 0)} sub="all time" accent="#34d399" />
      <StatCard label="Pending payouts" value={fmtCents(d.pendingPayoutCents ?? 0)} sub="awaiting approval" accent="#f472b6" />
    </div>
  );
}

/* ── Affiliates ── */
interface AffiliateRow { id: string; email: string; name: string; referralCode: string; customCode: string | null; status: string; xp: number; createdAt: string; lifetimeCents: number; }

function Affiliates({ d, q, setQ, reload }: { d: { total: number; affiliates: AffiliateRow[] }; q: string; setQ: (s: string) => void; reload: () => void }) {
  const [xpFor, setXpFor] = useState<string | null>(null);
  const [xpVal, setXpVal] = useState("");
  const [xpReason, setXpReason] = useState("");

  const setStatus = async (id: string, status: string) => {
    if (!confirm(`${status} this affiliate?`)) return;
    await api(`/api/admin/affiliates/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
    reload();
  };
  const adjustXp = async (id: string) => {
    const xp = Number(xpVal);
    if (!Number.isFinite(xp)) return;
    await api(`/api/admin/affiliates/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ xp, reason: xpReason }) });
    setXpFor(null); setXpVal(""); setXpReason(""); reload();
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input className={input} placeholder="Search email, name, code…" value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && reload()} />
        <button onClick={reload} className={`${btn} border-cyan-400/50 text-cyan-300`}>Search</button>
      </div>
      <div className="text-xs text-slate-400 font-mono mb-3">{d.total ?? 0} affiliates</div>
      <div className="space-y-2">
        {(d.affiliates ?? []).map((a) => (
          <div key={a.id} className={card}>
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="min-w-0">
                <div className="text-white font-bold truncate">{a.name || a.email}</div>
                <div className="text-xs text-slate-400 font-mono">/{a.customCode ?? a.referralCode} · {a.xp} XP · {fmtCents(a.lifetimeCents)} lifetime</div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Pill color={a.status === "active" ? "#34d399" : a.status === "pending" ? "#fbbf24" : "#f87171"}>{a.status}</Pill>
                {["active", "suspended", "banned"].map((s) => (
                  <button key={s} onClick={() => setStatus(a.id, s)} className={`${btn} border-white/15 text-slate-300 hover:text-white`}>{s}</button>
                ))}
                <button onClick={() => setXpFor(xpFor === a.id ? null : a.id)} className={`${btn} border-violet-400/50 text-violet-300`}>±XP</button>
              </div>
            </div>
            {xpFor === a.id && (
              <div className="mt-3 flex gap-2 flex-wrap">
                <input className={input + " !w-28"} placeholder="+/- XP" value={xpVal} onChange={(e) => setXpVal(e.target.value)} />
                <input className={input + " !w-48"} placeholder="Reason (audit log)" value={xpReason} onChange={(e) => setXpReason(e.target.value)} />
                <button onClick={() => adjustXp(a.id)} className={`${btn} border-cyan-400/50 text-cyan-300`}>Apply</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Payouts ── */
interface PayoutRow {
  id: string; amountCents: number; method: string; status: string; requestedAt: string;
  deadlineAt: string; lastEmailedStatus: string | null; providerRef: string | null;
  affiliate: { email: string; name: string; payoutEmail: string | null; venmoHandle: string | null };
}

function methodText(p: PayoutRow): string {
  if (p.method === "venmo") return p.affiliate.venmoHandle ? `Venmo @${p.affiliate.venmoHandle}` : "Venmo";
  if (p.method === "stripe_connect") return "Stripe Connect";
  if (p.method === "paypal") return "PayPal (historical)";
  return p.method;
}

function windowText(p: PayoutRow, now: number): { text: string; overdue: boolean } {
  const deadline = new Date(p.deadlineAt).getTime();
  const terminal = p.status === "paid" || p.status === "rejected";
  if (terminal) return { text: `requested ${new Date(p.requestedAt).toLocaleString()}`, overdue: false };
  const diff = deadline - now;
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 3600_000);
  const m = Math.floor((abs % 3600_000) / 60_000);
  const span = h >= 1 ? `${h}h ${m}m` : `${m}m`;
  return diff >= 0
    ? { text: `requested ${new Date(p.requestedAt).toLocaleString()} · ${span} left of the 48h window`, overdue: false }
    : { text: `requested ${new Date(p.requestedAt).toLocaleString()} · OVERDUE by ${span} (48h window)`, overdue: true };
}

function Payouts({ d, reload }: { d: { payouts: PayoutRow[] }; reload: () => void }) {
  const [ref, setRef] = useState("");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const act = async (payoutId: string, action: string) => {
    const providerRef = action === "mark_paid" ? (ref || prompt("Provider reference (transaction id):") || "") : undefined;
    if (action === "mark_paid" && !providerRef) return;
    await api("/api/admin/affiliates/payouts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ payoutId, action, providerRef }) });
    setRef(""); reload();
  };
  if (!(d.payouts ?? []).length) return <EmptyState title="No payouts yet" body="Payout requests will appear here as a queue with a 48-hour processing window." />;
  const statusColor = (s: string) => s === "paid" ? "#34d399" : s === "rejected" ? "#f87171" : s === "processing" ? "#38bdf8" : "#fbbf24";
  return (
    <div className="space-y-2">
      {(d.payouts ?? []).map((p) => {
        const w = windowText(p, now);
        return (
        <div key={p.id} className={card}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold font-mono">{fmtCents(p.amountCents)}</span>
                <Pill color={statusColor(p.status)}>{p.status}</Pill>
                {p.lastEmailedStatus !== p.status && <span className="text-[11px] text-amber-300 font-mono">status email not sent</span>}
              </div>
              <div className="text-xs text-slate-400">{p.affiliate.name || p.affiliate.email} · {p.affiliate.payoutEmail ?? p.affiliate.email} · {methodText(p)}</div>
              <div className={`text-xs font-mono ${w.overdue ? "text-red-300" : "text-slate-500"}`}>{w.text}</div>
              {p.providerRef && <div className="text-xs text-slate-500 font-mono">ref: {p.providerRef}</div>}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {p.status === "requested" && <>
                <button onClick={() => act(p.id, "approve")} className={`${btn} border-emerald-400/50 text-emerald-300`}>Approve</button>
                <button onClick={() => act(p.id, "reject")} className={`${btn} border-red-400/50 text-red-300`}>Reject</button>
              </>}
              {p.status === "approved" && <>
                <button onClick={() => act(p.id, "start_processing")} className={`${btn} border-sky-400/50 text-sky-300`}>Start processing</button>
                <button onClick={() => act(p.id, "mark_paid")} className={`${btn} border-cyan-400/50 text-cyan-300`}>Mark paid</button>
              </>}
              {p.status === "processing" && <>
                <button onClick={() => act(p.id, "mark_paid")} className={`${btn} border-cyan-400/50 text-cyan-300`}>Mark paid</button>
              </>}
              {p.lastEmailedStatus !== p.status && (
                <button onClick={() => act(p.id, "resend_email")} className={`${btn} border-white/25 text-slate-200`}>Send status email</button>
              )}
            </div>
          </div>
        </div>
        );
      })}
      <div className="text-xs text-slate-500 mt-2">Money moves via Venmo (or Stripe Connect / a manual arrangement) — then "Mark paid" with the transaction reference. Every status change emails the affiliate automatically. Rejecting returns the commissions to the affiliate's available balance.</div>
    </div>
  );
}

/* ── Ledger ── */
interface CommRow { id: string; affiliateEmail: string; level: number; amountCents: number; status: string; stripeInvoiceId: string | null; availableAt: string; createdAt: string; }

function Ledger({ d }: { d: { commissions: CommRow[] } }) {
  return (
    <div className={card + " overflow-x-auto"}>
      <table className="w-full text-sm min-w-[640px]">
        <thead><tr className="text-left text-[11px] font-mono text-slate-400 uppercase">
          <th className="pb-2">Date</th><th className="pb-2">Affiliate</th><th className="pb-2">Lvl</th><th className="pb-2">Amount</th><th className="pb-2">Status</th><th className="pb-2">Invoice</th>
        </tr></thead>
        <tbody>
          {(d.commissions ?? []).map((c) => (
            <tr key={c.id} className="border-t border-white/5 text-slate-300">
              <td className="py-2 font-mono text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
              <td className="py-2 text-xs">{c.affiliateEmail}</td>
              <td className="py-2"><Pill>L{c.level}</Pill></td>
              <td className="py-2 font-mono text-white">{fmtCents(c.amountCents)}</td>
              <td className="py-2"><Pill color={c.status === "reversed" ? "#f87171" : c.status === "paid" ? "#34d399" : "#38bdf8"}>{c.status}</Pill></td>
              <td className="py-2 font-mono text-xs text-slate-500">{c.stripeInvoiceId?.slice(-8) ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Fraud ── */
interface Signal { type: string; severity: string; detail: string; affiliateProfileId?: string; }

function Fraud({ d }: { d: { signals: Signal[] } }) {
  const color = (s: string) => s === "high" ? "#f87171" : s === "medium" ? "#fbbf24" : "#38bdf8";
  if (!(d.signals ?? []).length) return <EmptyState title="No fraud signals" body="Heuristics scan clicks, attributions, and account status weekly." />;
  return (
    <div className="space-y-2">
      {(d.signals ?? []).map((s, i) => (
        <div key={i} className={card + " flex items-center justify-between gap-3"}>
          <div>
            <div className="font-mono text-sm" style={{ color: color(s.severity) }}>{s.type} · {s.severity}</div>
            <div className="text-sm text-slate-300">{s.detail}</div>
          </div>
          {s.affiliateProfileId && <span className="text-xs font-mono text-slate-500">{s.affiliateProfileId.slice(0, 8)}…</span>}
        </div>
      ))}
    </div>
  );
}

/* ── Settings ── */
interface SettingsShape { ranks: { key: string; name: string; minXp: number; commissionPct: number }[]; overrideL2Pct: number; overrideL3Pct: number; attributionWindowDays: number; holdingPeriodDays: number; minPayoutCents: number; }

function Settings({ s, reload }: { s: SettingsShape; reload: () => void }) {
  const [form, setForm] = useState<SettingsShape | null>(null);
  useEffect(() => { if (s && !form) setForm(s); }, [s]);
  if (!form) return <div className="text-slate-400">Loading…</div>;
  const set = (k: keyof SettingsShape, v: number) => setForm({ ...form, [k]: v });
  const setRank = (i: number, k: "minXp" | "commissionPct", v: number) => {
    const ranks = form.ranks.map((r, j) => j === i ? { ...r, [k]: v } : r);
    setForm({ ...form, ranks });
  };
  const save = async () => {
    await api("/api/admin/affiliates/manage", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
    alert("Settings saved"); reload();
  };
  const num = (label: string, value: number, on: (v: number) => void, suffix = "") => (
    <label className="block">
      <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <input type="number" className={input + " !w-32"} value={value} onChange={(e) => on(Number(e.target.value))} />
        <span className="text-xs text-slate-500">{suffix}</span>
      </div>
    </label>
  );
  return (
    <div className="space-y-5">
      <div className={card}>
        <SectionTitle kicker="Program" title="Commission & policy" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {num("L2 override %", form.overrideL2Pct, (v) => set("overrideL2Pct", v), "%")}
          {num("L3 override %", form.overrideL3Pct, (v) => set("overrideL3Pct", v), "%")}
          {num("Attribution window", form.attributionWindowDays, (v) => set("attributionWindowDays", v), "days")}
          {num("Holding period", form.holdingPeriodDays, (v) => set("holdingPeriodDays", v), "days")}
          {num("Min payout (cents)", form.minPayoutCents, (v) => set("minPayoutCents", v), "¢")}
        </div>
      </div>
      <div className={card}>
        <SectionTitle kicker="Ranks" title="XP thresholds & commission rates" />
        <div className="space-y-2">
          {form.ranks.map((r, i) => (
            <div key={r.key} className="flex items-center gap-3 flex-wrap">
              <div className="w-28 text-white font-bold text-sm">{r.name}</div>
              <input type="number" className={input + " !w-28"} value={r.minXp} onChange={(e) => setRank(i, "minXp", Number(e.target.value))} />
              <span className="text-xs text-slate-500">XP →</span>
              <input type="number" className={input + " !w-24"} value={r.commissionPct} onChange={(e) => setRank(i, "commissionPct", Number(e.target.value))} />
              <span className="text-xs text-slate-500">%</span>
            </div>
          ))}
        </div>
      </div>
      <button onClick={save} className="px-6 py-2.5 rounded-xl font-mono font-bold text-[#04121f]"
        style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)", boxShadow: "0 0 20px rgba(0,150,255,.45)" }}>
        Save settings
      </button>
    </div>
  );
}

/* ── Audit ── */
interface AuditRow { id: string; action: string; actorUserId: string | null; targetType: string | null; targetId: string | null; details: unknown; createdAt: string; }

function Audit({ d }: { d: { audit: AuditRow[] } }) {
  return (
    <div className={card + " space-y-2 max-h-[70vh] overflow-y-auto"}>
      {(d.audit ?? []).map((a) => (
        <div key={a.id} className="text-xs font-mono text-slate-400 border-b border-white/5 pb-2">
          <span className="text-slate-500">{new Date(a.createdAt).toLocaleString()}</span>{" "}
          <span className="text-cyan-300">{a.action}</span>{" "}
          <span className="text-slate-500">{a.targetType}:{a.targetId?.slice(0, 8)}</span>
        </div>
      ))}
      {!(d.audit ?? []).length && <div className="text-slate-500 text-sm">No audit entries yet.</div>}
    </div>
  );
}
