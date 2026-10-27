"use client";

// Admin: Team Subscriptions. Metrics + org list come from
// GET /api/admin/teams (platform-admin gated server-side); the pricing
// form is prefilled from GET /api/team/pricing (the admin config route
// is PUT-only) and saved via PUT /api/admin/teams/config; suspend /
// unsuspend POST to /api/admin/teams/suspend. Funnel counts are passed
// in as props — the server page aggregates PageView rows by `event`
// for the last 30 days, the same table every other admin section reads.
//
// Money honesty: teamMrrCents / baseMrrCents from the API are
// NORMALIZED recurring revenue (weekly ×52/12, annual ÷12), not cash
// collected. They are labeled as such everywhere they appear.
import { useEffect, useMemo, useState } from "react";

type Cycle = "weekly" | "monthly" | "annual";
const CYCLES: Cycle[] = ["weekly", "monthly", "annual"];

interface TierBand {
  upTo: number | null;
  unitCents: number;
}

interface TeamMetrics {
  organizations: number;
  activePaidTeams: number;
  totalPurchasedSeats: number;
  totalOccupiedSeats: number;
  pendingInvitations: number;
  availableSeats: number;
  teamMrrCents: number;
  baseMrrCents: number;
  avgSeatsPerTeam: number;
  seatUtilization: number; // fraction 0–1
}

interface TeamOrg {
  id: string;
  name: string;
  ownerEmail: string | null;
  cycle: string;
  tier: string | null;
  purchasedSeats: number;
  members: number; // includes the owner
  pending: number;
  suspended: boolean;
  createdAt: string; // ISO
}

interface PricingConfig {
  maxSeats: number;
  inviteExpiryDays: number;
  tiers: Record<Cycle, TierBand[]>;
}

/** Editable band: dollars as typed; upTo as typed (ignored on the last, open-ended band). */
interface BandDraft {
  upTo: string;
  dollars: string;
}

const FUNNEL_STAGES: { event: string; label: string }[] = [
  { event: "team_pricing_viewed", label: "Viewed team pricing" },
  { event: "seat_slider_adjusted", label: "Adjusted seat slider" },
  { event: "team_checkout_initiated", label: "Checkout initiated" },
  { event: "team_checkout_completed", label: "Checkout completed" },
  { event: "invitation_created", label: "Invitation created" },
  { event: "invitation_accepted", label: "Invitation accepted" },
];

const inputCls =
  "rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400/50";
const labelCls = "text-[10px] font-bold tracking-[0.16em] text-white/35 uppercase";

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}
function money2(cents: number): string {
  return "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function pctOf(a: number, b: number): string {
  if (!b) return "—";
  return `${((100 * a) / b).toFixed(1)}%`;
}

function Stat({ label, value, sub, accent = "#38bdf8" }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="text-[10px] font-bold tracking-[0.18em] text-white/40 uppercase">{label}</div>
      <div className="mt-1.5 text-2xl font-extrabold text-white" style={{ textShadow: `0 0 18px ${accent}44` }}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-white/45">{sub}</div>}
    </div>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 mb-2 text-[11px] font-bold tracking-[0.2em] text-white/40 uppercase">{children}</div>;
}

function bandsToDraft(bands: TierBand[]): BandDraft[] {
  return bands.map((b) => ({
    upTo: b.upTo == null ? "" : String(b.upTo),
    dollars: (b.unitCents / 100).toFixed(2),
  }));
}

/** Returns an error message, or null when the whole form is saveable. */
function validateForm(
  maxSeats: string,
  inviteExpiryDays: string,
  drafts: Record<Cycle, BandDraft[]>,
): string | null {
  const ms = Number(maxSeats);
  if (!Number.isInteger(ms) || ms < 1 || ms > 10000) return "Max seats must be a whole number between 1 and 10,000.";
  const exp = Number(inviteExpiryDays);
  if (!Number.isInteger(exp) || exp < 1 || exp > 90) return "Invite expiry must be a whole number of days between 1 and 90.";
  for (const cycle of CYCLES) {
    const bands = drafts[cycle];
    if (!bands || bands.length === 0) return `${cycle}: at least one pricing band is required.`;
    let prevUpTo = 0;
    for (let i = 0; i < bands.length; i++) {
      const dollars = Number(bands[i].dollars);
      if (!Number.isFinite(dollars) || dollars <= 0) {
        return `${cycle} band ${i + 1}: unit price must be more than $0.`;
      }
      const isLast = i === bands.length - 1;
      if (!isLast) {
        const upTo = Number(bands[i].upTo);
        if (!Number.isInteger(upTo) || upTo <= prevUpTo) {
          return `${cycle} band ${i + 1}: “up to” seat counts must be positive whole numbers in ascending order.`;
        }
        prevUpTo = upTo;
      }
    }
  }
  return null;
}

export default function TeamSubscriptions({ funnel }: { funnel: Record<string, number> }) {
  const [metrics, setMetrics] = useState<TeamMetrics | null>(null);
  const [orgs, setOrgs] = useState<TeamOrg[]>([]);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [busyOrgId, setBusyOrgId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState("");

  const [maxSeats, setMaxSeats] = useState("");
  const [inviteExpiryDays, setInviteExpiryDays] = useState("");
  const [drafts, setDrafts] = useState<Record<Cycle, BandDraft[]> | null>(null);
  const [configError, setConfigError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  async function loadTeams() {
    const res = await fetch("/api/admin/teams");
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error ?? `Failed (${res.status})`);
    setMetrics(j.metrics as TeamMetrics);
    setOrgs(j.orgs as TeamOrg[]);
  }

  useEffect(() => {
    loadTeams().catch(() => setLoadError("Could not load team data."));
    fetch("/api/team/pricing")
      .then((r) => r.json())
      .then((d: PricingConfig) => {
        setMaxSeats(String(d.maxSeats));
        setInviteExpiryDays(String(d.inviteExpiryDays));
        setDrafts({
          weekly: bandsToDraft(d.tiers.weekly),
          monthly: bandsToDraft(d.tiers.monthly),
          annual: bandsToDraft(d.tiers.annual),
        });
      })
      .catch(() => setConfigError("Could not load the current pricing config."));
  }, []);

  const visibleOrgs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orgs;
    return orgs.filter(
      (o) => o.name.toLowerCase().includes(q) || (o.ownerEmail ?? "").toLowerCase().includes(q),
    );
  }, [orgs, search]);

  // Most common CURRENT purchased-seat counts, derived from the org list
  // the API returned (the API exposes no per-purchase seat history).
  const topSeatCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const o of orgs) counts.set(o.purchasedSeats, (counts.get(o.purchasedSeats) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 3);
  }, [orgs]);

  async function toggleSuspend(org: TeamOrg) {
    const next = !org.suspended;
    if (next && !confirm(`Suspend team “${org.name}”? Its members lose team access until it is unsuspended.`)) return;
    setBusyOrgId(org.id);
    setActionMsg("");
    try {
      const res = await fetch("/api/admin/teams/suspend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: org.id, suspended: next }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionMsg(j.error ?? `Failed (${res.status})`);
        return;
      }
      await loadTeams();
      setActionMsg(next ? `“${org.name}” suspended.` : `“${org.name}” unsuspended.`);
    } catch {
      setActionMsg("Network error — try again.");
    } finally {
      setBusyOrgId(null);
    }
  }

  const formError = drafts ? validateForm(maxSeats, inviteExpiryDays, drafts) : null;

  async function saveConfig() {
    if (!drafts || formError || saving) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const tiers = {} as Record<Cycle, TierBand[]>;
      for (const cycle of CYCLES) {
        tiers[cycle] = drafts[cycle].map((b, i, arr) => ({
          upTo: i === arr.length - 1 ? null : Number(b.upTo),
          unitCents: Math.round(Number(b.dollars) * 100),
        }));
      }
      const res = await fetch("/api/admin/teams/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxSeats: Number(maxSeats), inviteExpiryDays: Number(inviteExpiryDays), tiers }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveMsg(j.error ?? `Failed (${res.status})`);
        return;
      }
      // Re-prefill from the saved config the API returns.
      if (j.config) {
        setMaxSeats(String(j.config.maxSeats));
        setInviteExpiryDays(String(j.config.inviteExpiryDays));
        setDrafts({
          weekly: bandsToDraft(j.config.tiers.weekly),
          monthly: bandsToDraft(j.config.tiers.monthly),
          annual: bandsToDraft(j.config.tiers.annual),
        });
      }
      const rotated =
        Array.isArray(j.rotatedCycles) && j.rotatedCycles.length > 0
          ? ` New Stripe prices created for: ${j.rotatedCycles.join(", ")}.`
          : "";
      setSaveMsg(`Saved.${rotated} ${j.note ?? ""}`.trim());
    } catch {
      setSaveMsg("Network error — try again.");
    } finally {
      setSaving(false);
    }
  }

  function setBand(cycle: Cycle, idx: number, field: keyof BandDraft, value: string) {
    setDrafts((d) => {
      if (!d) return d;
      const bands = d[cycle].map((b, i) => (i === idx ? { ...b, [field]: value } : b));
      return { ...d, [cycle]: bands };
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-bold text-white">👥 Team Subscriptions</div>
        <div className="text-[11px] font-mono text-white/40">
          {metrics ? `${fmt(metrics.organizations)} organizations` : "loading…"}
        </div>
      </div>

      {loadError && <div className="mb-3 text-xs font-mono text-red-300">{loadError}</div>}
      {actionMsg && <div className="mb-3 text-xs font-mono text-cyan-300">{actionMsg}</div>}

      {/* Metrics */}
      {metrics ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          <Stat label="Organizations" value={fmt(metrics.organizations)} />
          <Stat label="Active paid teams" value={fmt(metrics.activePaidTeams)} sub="Owner subscription active" accent="#37e08b" />
          <Stat label="Purchased seats" value={fmt(metrics.totalPurchasedSeats)} accent="#37e08b" />
          <Stat label="Occupied seats" value={fmt(metrics.totalOccupiedSeats)} sub="Members beyond the owner" accent="#37e08b" />
          <Stat label="Pending invitations" value={fmt(metrics.pendingInvitations)} accent="#f7b80c" />
          <Stat label="Available seats" value={fmt(metrics.availableSeats)} sub="Purchased − occupied − pending" />
          <Stat
            label="Team MRR"
            value={money2(metrics.teamMrrCents)}
            sub="Normalized recurring, not cash collected"
            accent="#f7b80c"
          />
          <Stat
            label="Base-plan MRR · team owners"
            value={money2(metrics.baseMrrCents)}
            sub="Owners' own plans, normalized — kept separate from seat revenue"
            accent="#f7b80c"
          />
          <Stat label="Avg seats / team" value={metrics.avgSeatsPerTeam.toFixed(1)} />
          <Stat
            label="Seat utilization"
            value={`${(metrics.seatUtilization * 100).toFixed(1)}%`}
            sub="(Occupied + pending) ÷ purchased"
            accent="#c084fc"
          />
        </div>
      ) : (
        !loadError && <p className="text-sm text-white/40">Loading team metrics…</p>
      )}

      <p className="text-[11px] text-white/35 mt-3 leading-relaxed">
        <span className="text-white/60 font-semibold">Normalized recurring revenue</span> (the MRR figures above) restates
        every team&apos;s seat + base charges as a monthly amount — weekly × 52/12, annual ÷ 12 — so cycles can be compared.
        It is <span className="text-white/60 font-semibold">not cash collected</span>: actual cash received is what paid
        Stripe invoices show in the Revenue figures at the top of this dashboard, and it lands weekly / monthly / annually
        depending on each team&apos;s cycle. <span className="text-white/60 font-semibold">Annual contract value</span> is
        not shown: the teams API does not report each organization&apos;s billing status, so an honest ACV total can&apos;t
        be derived from what it returns.
      </p>

      {/* Conversion funnel */}
      <SubTitle>Team conversion funnel · last 30 days</SubTitle>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {FUNNEL_STAGES.map((s, i) => {
          const count = funnel[s.event] ?? 0;
          const prev = i > 0 ? funnel[FUNNEL_STAGES[i - 1].event] ?? 0 : 0;
          return (
            <div key={s.event} className="rounded-xl border border-white/10 bg-black/30 p-4 text-center">
              <div className="text-2xl font-extrabold text-white">{fmt(count)}</div>
              <div className="text-[11px] text-white/45 mt-1 uppercase tracking-wider">{s.label}</div>
              {i > 0 && <div className="text-[11px] text-white/40 mt-1">→ {pctOf(count, prev)} of previous step</div>}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-white/30 mt-3">
        Counts are PageView event rows (first-party analytics): pricing-view and slider events fire in the browser;
        checkout and invitation events are written server-side under a shared “server-event” session, so these are
        event counts, not unique people.
        {topSeatCounts.length > 0 && (
          <>
            {" "}Most common current purchased-seat counts:{" "}
            {topSeatCounts.map(([seats, n]) => `${fmt(seats)} seats × ${fmt(n)} team${n === 1 ? "" : "s"}`).join(" · ")}.
          </>
        )}
      </p>

      {/* Organizations */}
      <SubTitle>Organizations</SubTitle>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by team name or owner email…"
        className="w-full mb-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50"
      />
      {visibleOrgs.length === 0 ? (
        <p className="text-sm text-white/40">{orgs.length === 0 ? "No teams yet." : "No teams match that search."}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.15em] text-white/35">
                <th className="py-2 pr-3 font-semibold">Team</th>
                <th className="py-2 pr-3 font-semibold">Owner</th>
                <th className="py-2 pr-3 font-semibold">Plan</th>
                <th className="py-2 pr-3 font-semibold text-right">Seats occ. / purch.</th>
                <th className="py-2 pr-3 font-semibold text-right">Pending</th>
                <th className="py-2 pr-3 font-semibold">Status</th>
                <th className="py-2 pr-3 font-semibold">Created</th>
                <th className="py-2 font-semibold text-right">Manage</th>
              </tr>
            </thead>
            <tbody>
              {visibleOrgs.map((o) => (
                <tr key={o.id} className="border-t border-white/5">
                  <td className="py-2.5 pr-3 text-white font-semibold">{o.name}</td>
                  <td className="py-2.5 pr-3 text-white/60 truncate max-w-[200px]">{o.ownerEmail ?? "—"}</td>
                  <td className="py-2.5 pr-3 text-white/70 whitespace-nowrap capitalize">
                    {o.cycle}
                    {o.tier ? <span className="text-white/40"> · {o.tier}</span> : null}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-white tabular-nums">
                    {fmt(Math.max(0, o.members - 1))} / {fmt(o.purchasedSeats)}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-white/70 tabular-nums">{fmt(o.pending)}</td>
                  <td className="py-2.5 pr-3 whitespace-nowrap">
                    {o.suspended ? (
                      <span className="text-red-300 font-mono text-xs">suspended</span>
                    ) : (
                      <span className="text-emerald-300 font-mono text-xs">active</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-white/50 whitespace-nowrap">
                    {new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="py-2.5 text-right whitespace-nowrap">
                    <button
                      onClick={() => toggleSuspend(o)}
                      disabled={busyOrgId === o.id}
                      className={
                        o.suspended
                          ? "inline-flex items-center min-h-10 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-[#04121f] disabled:opacity-50"
                          : "inline-flex items-center min-h-10 px-3 py-1.5 rounded-lg text-xs font-mono border border-white/15 text-slate-300 hover:border-red-400/60 disabled:opacity-50"
                      }
                      style={o.suspended ? { background: "linear-gradient(135deg,#6ee7b7,#34d399)" } : undefined}>
                      {o.suspended ? "Unsuspend" : "Suspend"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pricing administration */}
      <SubTitle>Pricing administration</SubTitle>
      {configError && <div className="mb-3 text-xs font-mono text-red-300">{configError}</div>}
      {!drafts && !configError && <p className="text-sm text-white/40">Loading current pricing…</p>}
      {drafts && (
        <>
          <div className="flex flex-wrap gap-4 mb-4">
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Max seats per team</span>
              <input
                value={maxSeats}
                onChange={(e) => setMaxSeats(e.target.value)}
                inputMode="numeric"
                className={`${inputCls} w-28`}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Invite expiry (days)</span>
              <input
                value={inviteExpiryDays}
                onChange={(e) => setInviteExpiryDays(e.target.value)}
                inputMode="numeric"
                className={`${inputCls} w-28`}
              />
            </label>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            {CYCLES.map((cycle) => (
              <div key={cycle} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-[11px] font-bold tracking-[0.18em] text-white/40 uppercase mb-3">
                  {cycle} — per-seat price by band
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-white/35">
                      <th className="pb-2 pr-2 font-semibold">Band</th>
                      <th className="pb-2 pr-2 font-semibold">Up to seat</th>
                      <th className="pb-2 font-semibold">$ / seat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drafts[cycle].map((b, i) => {
                      const isLast = i === drafts[cycle].length - 1;
                      const prevUpTo = i === 0 ? 0 : Number(drafts[cycle][i - 1].upTo) || 0;
                      return (
                        <tr key={i} className="border-t border-white/5">
                          <td className="py-1.5 pr-2 text-white/50 whitespace-nowrap">
                            {prevUpTo + 1}–{isLast ? "∞" : b.upTo || "…"}
                          </td>
                          <td className="py-1.5 pr-2">
                            {isLast ? (
                              <span className="text-white/40">no limit</span>
                            ) : (
                              <input
                                value={b.upTo}
                                onChange={(e) => setBand(cycle, i, "upTo", e.target.value)}
                                inputMode="numeric"
                                className={`${inputCls} w-16`}
                              />
                            )}
                          </td>
                          <td className="py-1.5">
                            <input
                              value={b.dollars}
                              onChange={(e) => setBand(cycle, i, "dollars", e.target.value)}
                              inputMode="decimal"
                              className={`${inputCls} w-20`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {formError && <div className="mt-3 text-xs font-mono text-amber-300">{formError}</div>}
          {saveMsg && <div className="mt-3 text-xs font-mono text-cyan-300">{saveMsg}</div>}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={saveConfig}
              disabled={!!formError || saving}
              className="inline-flex items-center min-h-10 px-4 py-2 rounded-lg text-xs font-mono font-bold text-[#04121f] disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#6ee7b7,#34d399)" }}>
              {saving ? "Saving…" : "Save pricing"}
            </button>
            <p className="text-[11px] text-white/35">
              Saving creates new Stripe prices for any changed cycle. Changes apply to new seat purchases only;
              existing subscriptions keep their current Stripe price.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
