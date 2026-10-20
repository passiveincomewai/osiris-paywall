"use client";

/**
 * /settings/team — Team Access dashboard.
 *
 * Workspace switcher (Personal / owned org / memberships) over the
 * /api/team/* contract, with seven functional tabs: Overview, Members,
 * Invitations, Shared Workspace, Billing, Settings, Activity.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Loader2, Users, Mail, FolderOpen, CreditCard, Settings as SettingsIcon,
  Activity as ActivityIcon, LayoutDashboard, Plus, Trash2, Video,
  type LucideIcon,
} from "lucide-react";
import SeatCalculator, { fmtCents, CYCLE_LABEL, CYCLE_SUFFIX } from "@/components/team/SeatCalculator";
import { trackAnalyticsEvent } from "@/components/AnalyticsTracker";
import {
  BASE_CENTS,
  DEFAULT_TIERS,
  type Cycle,
  type TierBand,
} from "@/lib/team/pricing";

/* ---------------- types (API contract) ---------------- */

interface OrgSummary {
  id: string;
  name: string;
  role: string;
  ownerName: string | null;
  memberCount: number;
  purchasedSeats: number;
}

interface OrgDetail {
  org: {
    id: string; name: string; logoUrl: string | null; description: string | null;
    defaultInviteRole: string; allowMemberInvites: boolean; suspended: boolean; createdAt: string;
  };
  myRole: string;
  owner: { name: string | null; email: string | null };
  plan: { cycle: Cycle; tier: string; baseCents: number };
  seats: {
    purchased: number; members: number; pendingInvites: number; available: number;
    pendingSeats: number | null; pendingSeatsAt: string | null;
  };
  totals: { seatCostCents: number; totalCents: number };
}

interface Member {
  userId: string; name: string | null; email: string | null; image: string | null;
  role: string; joinedAt: string;
}

interface Invitation {
  id: string; email: string; role: string; expiresAt: string; createdAt: string;
  invitedByName: string | null;
}

interface PricingConfig {
  maxSeats: number;
  tiers: Record<Cycle, TierBand[]>;
  baseCents: Record<Cycle, number>;
  inviteExpiryDays: number;
}

interface Quote {
  cycle: Cycle; baseCents: number; currentSeats: number; targetSeats: number;
  seatCostCents: number; totalCents: number; kind: string;
  immediateDueEstimateCents: number | null; effectiveDate: string | null;
  futureTotalCents: number | null; trialEndsAt: string | null; blockedReason: string | null;
}

interface BillingData {
  invoices: {
    id: string; number: string | null; status: string | null; amountPaidCents: number;
    totalCents: number; created: string; hostedInvoiceUrl: string | null; invoicePdf: string | null;
  }[];
  upcoming: { totalCents: number; seatCostCents: number; baseCents: number; periodEnd: string } | null;
  paymentMethodHint: { brand: string; last4: string } | null;
}

interface Collection {
  id: string; name: string; createdByName: string | null; itemCount: number; mine: boolean;
  items: { cameraId: string }[];
}

interface ActivityItem { id: string; type: string; actorName: string | null; detail: unknown; createdAt: string }

/* ---------------- shared helpers / styles ---------------- */

const inputCls = "w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-[#00E5FF]/60";
const labelCls = "block text-xs font-semibold tracking-wider text-white/40 mb-1.5";
const btnGold = "px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition disabled:opacity-60 inline-flex items-center justify-center gap-2";
const btnGhost = "px-4 py-2 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 transition disabled:opacity-60 inline-flex items-center gap-2";
const cardCls = "rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5 md:p-6";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data as { error?: string }).error || `Request failed (${res.status})`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return data as T;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function initials(name: string | null, email: string | null): string {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : src.slice(0, 2)).toUpperCase();
}

function RoleBadge({ role }: { role: string }) {
  const styles =
    role === "owner"
      ? "bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/30"
      : role === "admin"
        ? "bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/30"
        : "bg-white/[0.04] text-white/55 border-white/10";
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${styles}`}>
      {role}
    </span>
  );
}

function detailText(detail: unknown): string {
  if (detail == null) return "";
  if (typeof detail === "string") return detail;
  if (typeof detail === "object") {
    return Object.entries(detail as Record<string, unknown>)
      .map(([k, v]) => `${k.replace(/_/g, " ")}: ${String(v)}`)
      .join(" · ");
  }
  return String(detail);
}

/* ---------------- main component ---------------- */

type TabId = "overview" | "members" | "invitations" | "workspace" | "billing" | "settings" | "activity";

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "members", label: "Members", icon: Users },
  { id: "invitations", label: "Invitations", icon: Mail },
  { id: "workspace", label: "Shared Workspace", icon: FolderOpen },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "settings", label: "Settings", icon: SettingsIcon },
  { id: "activity", label: "Activity", icon: ActivityIcon },
];

export default function TeamClient() {
  const [teamState, setTeamState] = useState<{ owned: OrgSummary | null; memberships: OrgSummary[] } | null>(null);
  const [selected, setSelected] = useState<string>("personal");
  const [detail, setDetail] = useState<OrgDetail | null>(null);
  const [tab, setTab] = useState<TabId>("overview");
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [myEmail, setMyEmail] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadState = useCallback(async () => {
    const s = await api<{ owned: OrgSummary | null; memberships: OrgSummary[] }>("/api/team/state");
    setTeamState(s);
    return s;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const s = await loadState();
        if (s.owned) setSelected(s.owned.id);
        else if (s.memberships.length > 0) setSelected(s.memberships[0].id);
      } catch {
        setLoadError("Couldn't load your team workspaces. Refresh to try again.");
      }
      try {
        const p = await fetch("/api/user/profile", { cache: "no-store" });
        if (p.ok) setMyEmail((await p.json()).email ?? null);
      } catch { /* self-matching is best-effort */ }
      try {
        setPricing(await api<PricingConfig>("/api/team/pricing"));
      } catch { /* calculator falls back to built-in defaults */ }
    })();
  }, [loadState]);

  const loadDetail = useCallback(async (orgId: string) => {
    setDetailLoading(true);
    try {
      setDetail(await api<OrgDetail>(`/api/team/org?orgId=${encodeURIComponent(orgId)}`));
    } catch {
      setDetail(null);
      setLoadError("Couldn't load that workspace. Refresh to try again.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selected !== "personal") loadDetail(selected);
    else setDetail(null);
  }, [selected, loadDetail]);

  const refreshDetail = useCallback(() => {
    if (selected !== "personal") return loadDetail(selected);
    return Promise.resolve();
  }, [selected, loadDetail]);

  const orgs: OrgSummary[] = [
    ...(teamState?.owned ? [teamState.owned] : []),
    ...(teamState?.memberships ?? []),
  ];
  const hasAnyOrg = orgs.length > 0;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 md:py-14">
      <Link href="/settings" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition mb-6">
        <ArrowLeft className="w-4 h-4" /> Account settings
      </Link>
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-6 h-6 text-[#D4AF37]" />
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Team Access</h1>
      </div>

      {loadError && <p role="alert" className="text-sm text-red-400 mb-4">{loadError}</p>}
      {!teamState && !loadError && (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#00E5FF]" /></div>
      )}

      {teamState && (
        <>
          {/* Workspace switcher */}
          <div className="mb-6">
            <label className={labelCls}>WORKSPACE</label>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              <button
                onClick={() => setSelected("personal")}
                className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                  selected === "personal"
                    ? "bg-[#D4AF37] text-black border-[#D4AF37]"
                    : "border-white/15 text-white/70 hover:bg-white/5"
                }`}
              >
                Personal Workspace
              </button>
              {orgs.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setSelected(o.id)}
                  className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                    selected === o.id
                      ? "bg-[#D4AF37] text-black border-[#D4AF37]"
                      : "border-white/15 text-white/70 hover:bg-white/5"
                  }`}
                >
                  {o.name} <span className="opacity-60 font-normal">· {o.role}</span>
                </button>
              ))}
            </div>
          </div>

          {selected === "personal" ? (
            hasAnyOrg ? (
              <section className={cardCls}>
                <h2 className="font-bold mb-1">Your personal workspace</h2>
                <p className="text-sm text-white/55">
                  Your personal workspace — switch to a team above to manage its members, seats and shared collections.
                  Everything here stays private to you.
                </p>
              </section>
            ) : (
              <CreateTeamPanel
                pricing={pricing}
                onCreated={async (orgId) => {
                  await loadState();
                  setSelected(orgId);
                  setTab("billing");
                }}
              />
            )
          ) : detailLoading && !detail ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#00E5FF]" /></div>
          ) : detail ? (
            <>
              {/* Tabs */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 mb-5" role="tablist">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => setTab(id)}
                    className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition ${
                      tab === id ? "bg-white/10 text-white border border-white/15" : "text-white/50 hover:text-white border border-transparent"
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {label}
                  </button>
                ))}
              </div>

              {tab === "overview" && (
                <OverviewTab detail={detail} onInvite={() => setTab("invitations")} onBuySeats={() => setTab("billing")} />
              )}
              {tab === "members" && (
                <MembersTab orgId={detail.org.id} myRole={detail.myRole} myEmail={myEmail} onChanged={refreshDetail} />
              )}
              {tab === "invitations" && (
                <InvitationsTab detail={detail} onChanged={refreshDetail} />
              )}
              {tab === "workspace" && (
                <WorkspaceTab orgId={detail.org.id} myRole={detail.myRole} />
              )}
              {tab === "billing" && (
                <BillingTab detail={detail} pricing={pricing} onChanged={refreshDetail} />
              )}
              {tab === "settings" && (
                <OrgSettingsTab detail={detail} onChanged={refreshDetail} />
              )}
              {tab === "activity" && <ActivityTab orgId={detail.org.id} />}
            </>
          ) : null}
        </>
      )}
    </main>
  );
}

/* ---------------- create-team panel (no org yet) ---------------- */

function CreateTeamPanel({
  pricing,
  onCreated,
}: {
  pricing: PricingConfig | null;
  onCreated: (orgId: string) => void;
}) {
  const [name, setName] = useState("");
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<{ text: string; status?: number } | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const org = await api<{ id: string }>("/api/team/organization", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      });
      onCreated(org.id);
    } catch (err) {
      const e2 = err as Error & { status?: number };
      setError({ text: e2.message, status: e2.status });
    } finally {
      setCreating(false);
    }
  }

  const tiers = pricing?.tiers?.[cycle] ?? DEFAULT_TIERS[cycle];
  const base = pricing?.baseCents?.[cycle] ?? BASE_CENTS[cycle];

  return (
    <div className="space-y-5">
      <section id="create-team-panel" className={cardCls}>
        <h2 className="font-bold mb-1">Create your team</h2>
        <p className="text-sm text-white/55 mb-5">
          Give your whole team WorldEye Pro under one subscription. A paid plan is required to create a team —
          seats are added to your existing subscription and priced with automatic volume discounts.
        </p>
        <form onSubmit={create} className="space-y-4">
          <div>
            <label className={labelCls}>TEAM NAME</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="e.g. Meridian Response Team"
              maxLength={80}
            />
          </div>
          {error && (
            <div role="alert" className="text-sm text-red-400">
              <p>{error.text}</p>
              {(error.status === 402 || error.status === 403) && (
                <p className="mt-1">
                  <Link href="/pricing" className="text-[#00E5FF] hover:underline font-semibold">
                    See Pro plans →
                  </Link>
                </p>
              )}
            </div>
          )}
          <button type="submit" disabled={creating || !name.trim()} className={btnGold}>
            {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : "Create team"}
          </button>
        </form>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-bold">What will seats cost?</h2>
          <div className="inline-flex p-1 rounded-xl bg-white/[0.04] border border-white/10">
            {(["weekly", "monthly", "annual"] as Cycle[]).map((c) => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  cycle === c ? "bg-[#D4AF37] text-black" : "text-white/55 hover:text-white"
                }`}
              >
                {CYCLE_LABEL[c]}
              </button>
            ))}
          </div>
        </div>
        <SeatCalculator
          cycle={cycle}
          tiers={tiers}
          baseCents={base}
          maxSeats={pricing?.maxSeats ?? 50}
          ctaLabel="Create Your Team"
          onCta={() => document.getElementById("create-team-panel")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          disabledReason={undefined}
        />
        <p className="text-xs text-white/35 mt-2">
          Create your team above first — you&apos;ll pick the exact seat count next, in the Billing tab.
        </p>
      </section>
    </div>
  );
}

/* ---------------- Overview ---------------- */

function OverviewTab({
  detail,
  onInvite,
  onBuySeats,
}: {
  detail: OrgDetail;
  onInvite: () => void;
  onBuySeats: () => void;
}) {
  const [usage, setUsage] = useState<{ cap: number; inUse: number; mine: number } | null>(null);
  const { org, plan, seats, totals } = detail;

  useEffect(() => {
    api<{ cap: number; inUse: number; mine: number }>(`/api/team/recording/usage?orgId=${encodeURIComponent(org.id)}`)
      .then(setUsage)
      .catch(() => setUsage(null));
  }, [org.id]);

  const stats: { label: string; value: string }[] = [
    { label: "Plan", value: `WorldEye ${CYCLE_LABEL[plan.cycle]}` },
    { label: "Owner", value: detail.owner.name || "—" },
    { label: "Owner email", value: detail.owner.email || "—" },
    { label: "Active members", value: String(seats.members) },
    { label: "Pending invitations", value: String(seats.pendingInvites) },
    { label: "Seats purchased", value: String(seats.purchased) },
    { label: "Seats available", value: String(seats.available) },
    {
      label: "Current recurring total",
      value: `${fmtCents(totals.totalCents)}${CYCLE_SUFFIX[plan.cycle]}`,
    },
  ];

  return (
    <div className="space-y-5">
      <section className={cardCls}>
        <div className="flex items-start gap-4">
          {org.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logoUrl} alt="" className="w-14 h-14 rounded-2xl object-cover border border-white/10 shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-[#D4AF37]">{initials(org.name, null)}</span>
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight break-words">{org.name}</h2>
            <p className="text-sm text-white/50">
              WorldEye {CYCLE_LABEL[plan.cycle]} · you are {detail.myRole === "owner" ? "the owner" : `a ${detail.myRole}`}
            </p>
            {org.description && <p className="text-sm text-white/60 mt-2">{org.description}</p>}
            {org.suspended && (
              <p role="alert" className="text-sm text-red-300 mt-2">This organization is currently suspended — contact the owner.</p>
            )}
          </div>
        </div>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5 min-w-0">
              <dt className="text-[11px] font-semibold tracking-wider text-white/40 uppercase">{s.label}</dt>
              <dd className="text-base font-bold mt-1 break-words">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {usage && (
        <section className={cardCls}>
          <div className="flex items-center gap-2 mb-1">
            <Video className="w-4.5 h-4.5 text-[#D4AF37]" />
            <h3 className="font-bold">Recording pool</h3>
          </div>
          <p className="text-sm text-white/60">
            Recording pool: {usage.inUse} of {usage.cap} cameras in use across your team
            {usage.mine > 0 ? ` (${usage.mine} by you)` : ""}.
          </p>
          <div className="mt-3 h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#00E5FF] to-[#D4AF37]"
              style={{ width: `${usage.cap > 0 ? Math.min(100, (usage.inUse / usage.cap) * 100) : 0}%` }}
            />
          </div>
        </section>
      )}

      <section className={cardCls}>
        <h3 className="font-bold mb-3">Quick actions</h3>
        <div className="flex flex-wrap gap-3">
          <button onClick={onInvite} className={btnGold}>
            <Mail className="w-4 h-4" /> Invite members
          </button>
          <button onClick={onBuySeats} className={btnGhost}>
            <CreditCard className="w-4 h-4" /> Buy seats
          </button>
          <Link href="/" className={btnGhost}>Open the globe</Link>
        </div>
      </section>
    </div>
  );
}

/* ---------------- Members ---------------- */

function MembersTab({
  orgId,
  myRole,
  myEmail,
  onChanged,
}: {
  orgId: string;
  myRole: string;
  myEmail: string | null;
  onChanged: () => void;
}) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setMembers(await api<Member[]>(`/api/team/members?orgId=${encodeURIComponent(orgId)}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load members.");
    }
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const isSelf = (m: Member) => !!myEmail && !!m.email && m.email.toLowerCase() === myEmail.toLowerCase();

  function canEdit(target: Member): boolean {
    if (target.role === "owner") return false;
    if (myRole === "owner") return true;
    if (myRole === "admin") return target.role === "member";
    return false;
  }

  async function changeRole(m: Member, role: string) {
    setBusy(m.userId);
    setError(null);
    try {
      await api("/api/team/members", {
        method: "PATCH",
        body: JSON.stringify({ orgId, userId: m.userId, role }),
      });
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't change that role.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(m: Member) {
    setBusy(m.userId);
    setError(null);
    try {
      await api(`/api/team/members?orgId=${encodeURIComponent(orgId)}&userId=${encodeURIComponent(m.userId)}`, {
        method: "DELETE",
      });
      setConfirmRemove(null);
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't remove that member.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className={cardCls}>
      <h2 className="font-bold mb-1">Members</h2>
      <p className="text-sm text-white/50 mb-5">Everyone with access to this team workspace.</p>
      {error && <p role="alert" className="text-sm text-red-400 mb-4">{error}</p>}
      {!members ? (
        <Loader2 className="w-5 h-5 animate-spin text-white/40" />
      ) : (
        <ul className="space-y-3">
          {members.map((m) => {
            const editable = canEdit(m);
            const selfRemoveBlocked = isSelf(m) && m.role === "owner";
            const canRemove = editable || (isSelf(m) && m.role !== "owner");
            return (
              <li key={m.userId} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  {m.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.image} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0 text-sm font-bold text-white/70">
                      {initials(m.name, m.email)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm break-words">
                      {m.name || m.email || "Member"} {isSelf(m) && <span className="text-white/40 font-normal">(you)</span>}
                    </p>
                    <p className="text-xs text-white/45 break-all">{m.email}</p>
                    <p className="text-[11px] text-white/30 mt-0.5">Joined {fmtDate(m.joinedAt)}</p>
                  </div>
                  <RoleBadge role={m.role} />
                </div>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <select
                    value={m.role}
                    disabled={!editable || busy === m.userId}
                    title={
                      m.role === "owner"
                        ? "The owner's role can't be changed"
                        : !editable
                          ? myRole === "admin"
                            ? "Admins can only change member roles"
                            : "Only the owner or an admin can change roles"
                          : undefined
                    }
                    onChange={(e) => changeRole(m, e.target.value)}
                    className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs outline-none disabled:opacity-50"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    {m.role === "owner" && <option value="owner">Owner</option>}
                  </select>
                  {confirmRemove === m.userId ? (
                    <>
                      <span className="text-xs text-white/60">{isSelf(m) ? "Leave this team?" : `Remove ${m.name || m.email}?`}</span>
                      <button onClick={() => remove(m)} disabled={busy === m.userId} className="px-3 py-1.5 rounded-lg bg-red-500/85 text-white text-xs font-bold hover:bg-red-500 transition disabled:opacity-60">
                        {busy === m.userId ? "Removing…" : "Confirm"}
                      </button>
                      <button onClick={() => setConfirmRemove(null)} className={btnGhost + " !px-3 !py-1.5 !text-xs"}>Cancel</button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmRemove(m.userId)}
                      disabled={!canRemove || selfRemoveBlocked}
                      title={selfRemoveBlocked ? "The owner can't leave their own team" : !canRemove ? "You don't have permission to remove this member" : undefined}
                      className="px-3 py-1.5 rounded-lg border border-white/15 text-xs font-semibold text-white/70 hover:bg-white/5 hover:text-red-300 transition disabled:opacity-40 inline-flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> {isSelf(m) ? "Leave team" : "Remove"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ---------------- Invitations ---------------- */

function InvitationsTab({ detail, onChanged }: { detail: OrgDetail; onChanged: () => void }) {
  const orgId = detail.org.id;
  const [invites, setInvites] = useState<Invitation[] | null>(null);
  const [emailsText, setEmailsText] = useState("");
  const [role, setRole] = useState(detail.org.defaultInviteRole || "member");
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<{ email: string; ok: boolean; error?: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setInvites(await api<Invitation[]>(`/api/team/invitations?orgId=${encodeURIComponent(orgId)}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load invitations.");
    }
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const emails = emailsText.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    if (emails.length === 0) return;
    setSending(true);
    setError(null);
    setResults(null);
    try {
      const res = await api<{ email: string; ok: boolean; error?: string }[]>("/api/team/invitations", {
        method: "POST",
        body: JSON.stringify({ orgId, emails, role }),
      });
      setResults(res);
      if (res.some((r) => r.ok)) setEmailsText("");
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send invitations.");
    } finally {
      setSending(false);
    }
  }

  async function act(inv: Invitation, action: "revoke" | "resend") {
    setBusyId(inv.id);
    setError(null);
    try {
      await api(`/api/team/invitations/${action}`, {
        method: "POST",
        body: JSON.stringify({ orgId, invitationId: inv.id }),
      });
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Couldn't ${action} that invitation.`);
    } finally {
      setBusyId(null);
    }
  }

  const { purchased, available } = detail.seats;
  const reserved = Math.max(0, purchased - available);
  const canInvite = detail.myRole !== "member" || detail.org.allowMemberInvites;

  return (
    <div className="space-y-5">
      <section className={cardCls}>
        <h2 className="font-bold mb-1">Invite members</h2>
        <p className="text-sm text-white/55 mb-4">
          {reserved} of {purchased} seats reserved/used — {available} available incl. pending.
          Invitations expire after a few days; the invite link is emailed to each address.
        </p>
        {!canInvite ? (
          <p className="text-sm text-white/50">Only the owner and admins can invite members in this workspace.</p>
        ) : (
          <form onSubmit={send} className="space-y-4">
            <div>
              <label className={labelCls}>EMAIL ADDRESSES — ONE PER LINE, OR COMMA SEPARATED</label>
              <textarea
                value={emailsText}
                onChange={(e) => setEmailsText(e.target.value)}
                className={`${inputCls} min-h-24 resize-y`}
                placeholder={"teammate@example.com\nanother@example.com"}
              />
            </div>
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <label className={labelCls}>ROLE</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm outline-none"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button type="submit" disabled={sending || !emailsText.trim()} className={btnGold}>
                {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : "Send invitations"}
              </button>
            </div>
          </form>
        )}
        {results && (
          <ul className="mt-4 space-y-1.5 text-sm">
            {results.map((r) => (
              <li key={r.email} className={r.ok ? "text-emerald-300" : "text-red-300"}>
                {r.ok ? "✓" : "✗"} {r.email}{r.error ? ` — ${r.error}` : " — invitation sent"}
              </li>
            ))}
          </ul>
        )}
        {error && <p role="alert" className="text-sm text-red-400 mt-4">{error}</p>}
      </section>

      <section className={cardCls}>
        <h3 className="font-bold mb-4">Pending invitations</h3>
        {!invites ? (
          <Loader2 className="w-5 h-5 animate-spin text-white/40" />
        ) : invites.length === 0 ? (
          <p className="text-sm text-white/50">No pending invitations.</p>
        ) : (
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full text-sm min-w-[540px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-white/40 border-b border-white/10">
                  <th className="py-2 pr-3 font-semibold">Email</th>
                  <th className="py-2 pr-3 font-semibold">Role</th>
                  <th className="py-2 pr-3 font-semibold">Invited by</th>
                  <th className="py-2 pr-3 font-semibold">Expires</th>
                  <th className="py-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => (
                  <tr key={inv.id} className="border-b border-white/5 last:border-0">
                    <td className="py-2.5 pr-3 break-all">{inv.email}</td>
                    <td className="py-2.5 pr-3"><RoleBadge role={inv.role} /></td>
                    <td className="py-2.5 pr-3 text-white/60">{inv.invitedByName || "—"}</td>
                    <td className="py-2.5 pr-3 text-white/60 whitespace-nowrap">{fmtDate(inv.expiresAt)}</td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => act(inv, "resend")}
                        disabled={busyId === inv.id}
                        className="px-2.5 py-1.5 rounded-lg border border-white/15 text-xs font-semibold text-white/75 hover:bg-white/5 transition disabled:opacity-50 mr-2"
                      >
                        Resend
                      </button>
                      <button
                        onClick={() => act(inv, "revoke")}
                        disabled={busyId === inv.id}
                        className="px-2.5 py-1.5 rounded-lg border border-white/15 text-xs font-semibold text-white/75 hover:bg-white/5 hover:text-red-300 transition disabled:opacity-50"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------------- Shared Workspace ---------------- */

function WorkspaceTab({ orgId, myRole }: { orgId: string; myRole: string }) {
  const [collections, setCollections] = useState<Collection[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newCameras, setNewCameras] = useState("");
  const [creating, setCreating] = useState(false);
  const [addInputs, setAddInputs] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ collections: Collection[] }>(`/api/team/workspace?orgId=${encodeURIComponent(orgId)}`);
      setCollections(data.collections);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load shared collections.");
    }
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const cameraIds = newCameras.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
      await api("/api/team/workspace/collections", {
        method: "POST",
        body: JSON.stringify({ orgId, name: newName.trim(), ...(cameraIds.length ? { cameraIds } : {}) }),
      });
      setNewName("");
      setNewCameras("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create that collection.");
    } finally {
      setCreating(false);
    }
  }

  async function itemOp(collectionId: string, cameraId: string, op: "add" | "remove") {
    setBusyId(collectionId);
    setError(null);
    try {
      await api("/api/team/workspace/collections/items", {
        method: "POST",
        body: JSON.stringify({ orgId, collectionId, cameraId, op }),
      });
      setAddInputs((s) => ({ ...s, [collectionId]: "" }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that collection.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeCollection(collectionId: string) {
    setBusyId(collectionId);
    setError(null);
    try {
      await api(`/api/team/workspace/collections?orgId=${encodeURIComponent(orgId)}&collectionId=${encodeURIComponent(collectionId)}`, {
        method: "DELETE",
      });
      setConfirmDelete(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete that collection.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className={cardCls}>
        <h2 className="font-bold mb-1">Shared collections</h2>
        <p className="text-sm text-white/55 mb-5">
          Camera collections shared with the whole team. They appear in every member&apos;s{" "}
          <Link href="/" className="text-[#00E5FF] hover:underline">globe</Link> — your personal collections stay private and aren&apos;t shown here.
        </p>
        {error && <p role="alert" className="text-sm text-red-400 mb-4">{error}</p>}
        {!collections ? (
          <Loader2 className="w-5 h-5 animate-spin text-white/40" />
        ) : collections.length === 0 ? (
          <p className="text-sm text-white/50">No shared collections yet — create the first one below.</p>
        ) : (
          <ul className="space-y-3">
            {collections.map((c) => {
              const canDelete = c.mine || myRole === "owner" || myRole === "admin";
              return (
                <li key={c.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm break-words">{c.name}</p>
                      <p className="text-xs text-white/45">
                        {c.itemCount} camera{c.itemCount === 1 ? "" : "s"} · created by {c.createdByName || "a teammate"}
                        {c.mine ? " (you)" : ""}
                      </p>
                    </div>
                    {confirmDelete === c.id ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="text-xs text-white/60">Delete this collection?</span>
                        <button onClick={() => removeCollection(c.id)} disabled={busyId === c.id} className="px-3 py-1.5 rounded-lg bg-red-500/85 text-white text-xs font-bold hover:bg-red-500 transition disabled:opacity-60">
                          Confirm
                        </button>
                        <button onClick={() => setConfirmDelete(null)} className={btnGhost + " !px-3 !py-1.5 !text-xs"}>Cancel</button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(c.id)}
                        disabled={!canDelete}
                        title={canDelete ? undefined : "Only the creator or an admin can delete this collection"}
                        className="px-3 py-1.5 rounded-lg border border-white/15 text-xs font-semibold text-white/70 hover:bg-white/5 hover:text-red-300 transition disabled:opacity-40 inline-flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    )}
                  </div>
                  {c.items.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {c.items.map((it) => (
                        <li key={it.cameraId} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] pl-3 pr-1.5 py-1 text-xs font-mono text-white/70 max-w-full">
                          <span className="truncate">{it.cameraId}</span>
                          <button
                            onClick={() => itemOp(c.id, it.cameraId, "remove")}
                            disabled={busyId === c.id}
                            aria-label={`Remove camera ${it.cameraId}`}
                            className="w-5 h-5 rounded-full hover:bg-white/10 text-white/50 hover:text-red-300 transition shrink-0"
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const v = (addInputs[c.id] ?? "").trim();
                      if (v) itemOp(c.id, v, "add");
                    }}
                    className="flex gap-2 mt-3"
                  >
                    <input
                      value={addInputs[c.id] ?? ""}
                      onChange={(e) => setAddInputs((s) => ({ ...s, [c.id]: e.target.value }))}
                      placeholder="Add a camera ID"
                      className="flex-1 min-w-0 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs outline-none focus:border-[#00E5FF]/60"
                    />
                    <button type="submit" disabled={busyId === c.id || !(addInputs[c.id] ?? "").trim()} className={btnGhost + " !px-3 !py-1.5 !text-xs"}>
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={cardCls}>
        <h3 className="font-bold mb-4">New shared collection</h3>
        <form onSubmit={create} className="space-y-4">
          <div>
            <label className={labelCls}>COLLECTION NAME</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} className={inputCls} placeholder="e.g. Border crossings watch" maxLength={80} />
          </div>
          <div>
            <label className={labelCls}>CAMERA IDS (OPTIONAL, COMMA SEPARATED)</label>
            <input value={newCameras} onChange={(e) => setNewCameras(e.target.value)} className={inputCls} placeholder="camera-id-1, camera-id-2" />
          </div>
          <button type="submit" disabled={creating || !newName.trim()} className={btnGold}>
            {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : "Create collection"}
          </button>
        </form>
      </section>
    </div>
  );
}

/* ---------------- Billing (owner only) ---------------- */

function BillingTab({
  detail,
  pricing,
  onChanged,
}: {
  detail: OrgDetail;
  pricing: PricingConfig | null;
  onChanged: () => void;
}) {
  const orgId = detail.org.id;
  const cycle = detail.plan.cycle;
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancellingPending, setCancellingPending] = useState(false);

  const loadBilling = useCallback(async () => {
    try {
      setBilling(await api<BillingData>(`/api/team/billing?orgId=${encodeURIComponent(orgId)}`));
    } catch {
      setBilling(null);
    }
  }, [orgId]);

  useEffect(() => { loadBilling(); }, [loadBilling]);

  if (detail.myRole !== "owner") {
    return (
      <section className={cardCls}>
        <h2 className="font-bold mb-1">Billing</h2>
        <p className="text-sm text-white/55">Billing is managed by the organization owner ({detail.owner.name || detail.owner.email || "the owner"}).</p>
      </section>
    );
  }

  const tiers = pricing?.tiers?.[cycle] ?? DEFAULT_TIERS[cycle];
  const base = detail.plan.baseCents || pricing?.baseCents?.[cycle] || BASE_CENTS[cycle];
  const { seats } = detail;

  async function requestQuote(targetSeats: number) {
    setQuoting(true);
    setError(null);
    setSuccess(null);
    setQuote(null);
    try {
      const q = await api<Quote>("/api/team/seats/quote", {
        method: "POST",
        body: JSON.stringify({ orgId, seats: targetSeats }),
      });
      setQuote(q);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't get a quote for that seat count.");
    } finally {
      setQuoting(false);
    }
  }

  async function confirmSeats() {
    if (!quote) return;
    setConfirming(true);
    setError(null);
    trackAnalyticsEvent("team_checkout_initiated", String(quote.targetSeats));
    try {
      const res = await api<{ ok: boolean; kind: string; scheduled?: boolean; effectiveDate?: string; trial?: boolean; trialEndsAt?: string }>(
        "/api/team/seats",
        { method: "POST", body: JSON.stringify({ orgId, seats: quote.targetSeats }) },
      );
      trackAnalyticsEvent("team_checkout_completed", String(quote.targetSeats));
      setQuote(null);
      setSuccess(
        res.trial && res.trialEndsAt
          ? `Seats updated. Your plan is in its free trial — team billing begins ${fmtDate(res.trialEndsAt)}, no charge today.`
          : res.scheduled && res.effectiveDate
            ? `Seat decrease scheduled — it takes effect ${fmtDate(res.effectiveDate)}.`
            : "Seats updated. Stripe applies any proration to your subscription.",
      );
      await loadBilling();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update seats. Nothing was changed.");
    } finally {
      setConfirming(false);
    }
  }

  async function cancelPending() {
    setCancellingPending(true);
    setError(null);
    try {
      await api("/api/team/seats/cancel-pending", { method: "POST", body: JSON.stringify({ orgId }) });
      setSuccess("Pending seat change cancelled — your seat count stays as it is.");
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't cancel the pending change.");
    } finally {
      setCancellingPending(false);
    }
  }

  const isDecrease = quote ? quote.targetSeats < quote.currentSeats : false;

  return (
    <div className="space-y-5">
      {seats.pendingSeats !== null && (
        <section className="rounded-3xl border border-[#D4AF37]/30 bg-[#D4AF37]/[0.05] p-5 md:p-6">
          <h3 className="font-bold mb-1">Seat change scheduled</h3>
          <p className="text-sm text-white/65">
            Your seats change to <strong className="text-white">{seats.pendingSeats}</strong>
            {seats.pendingSeatsAt ? <> effective <strong className="text-white">{fmtDate(seats.pendingSeatsAt)}</strong></> : null}.
            Until then, your current {seats.purchased} seats stay active.
          </p>
          <button onClick={cancelPending} disabled={cancellingPending} className={`${btnGhost} mt-3`}>
            {cancellingPending ? "Cancelling…" : "Cancel pending change"}
          </button>
        </section>
      )}

      <section className={cardCls}>
        <h2 className="font-bold mb-1">Seats & plan</h2>
        <p className="text-sm text-white/55 mb-5">
          WorldEye {CYCLE_LABEL[cycle]} · currently {seats.purchased} purchased seats ({seats.members} members, {seats.available} available) ·
          current total {fmtCents(detail.totals.totalCents)}{CYCLE_SUFFIX[cycle]}.
        </p>
        <SeatCalculator
          cycle={cycle}
          tiers={tiers}
          baseCents={base}
          maxSeats={pricing?.maxSeats ?? 50}
          initialSeats={seats.purchased}
          ctaLabel={quoting ? "Getting your quote…" : "Update seats"}
          onCta={requestQuote}
        />
        {error && <p role="alert" className="text-sm text-red-400 mt-4">{error}</p>}
        {success && <p className="text-sm text-emerald-300 mt-4">{success}</p>}

        {quote && (
          <div className="mt-5 rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/[0.04] p-5">
            <h3 className="font-bold mb-3">
              {isDecrease ? "Decrease" : "Update"} seats: {quote.currentSeats} → {quote.targetSeats}
            </h3>
            {quote.trialEndsAt && (
              <p className="text-sm text-emerald-200 bg-emerald-400/10 border border-emerald-400/25 rounded-xl px-3.5 py-2.5 mb-3">
                Your plan is in its free trial — team billing begins {fmtDate(quote.trialEndsAt)}, no charge today.
              </p>
            )}
            <dl className="space-y-2 text-sm mb-4">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-white/55">Base plan</dt>
                <dd className="font-semibold">{fmtCents(quote.baseCents)}{CYCLE_SUFFIX[quote.cycle]}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-white/55">Seat cost ({quote.targetSeats} seats)</dt>
                <dd className="font-semibold">{fmtCents(quote.seatCostCents)}{CYCLE_SUFFIX[quote.cycle]}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-white/55">New recurring total</dt>
                <dd className="font-bold">{fmtCents(quote.totalCents)}{CYCLE_SUFFIX[quote.cycle]}</dd>
              </div>
              {!isDecrease && quote.immediateDueEstimateCents !== null && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-white/55">Due today (estimated)</dt>
                  <dd className="font-semibold">{fmtCents(quote.immediateDueEstimateCents)}</dd>
                </div>
              )}
              {isDecrease && (
                <>
                  {quote.effectiveDate && (
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-white/55">Takes effect</dt>
                      <dd className="font-semibold">{fmtDate(quote.effectiveDate)}</dd>
                    </div>
                  )}
                  {quote.futureTotalCents !== null && (
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-white/55">Future recurring total</dt>
                      <dd className="font-semibold">{fmtCents(quote.futureTotalCents)}{CYCLE_SUFFIX[quote.cycle]}</dd>
                    </div>
                  )}
                </>
              )}
            </dl>
            {!isDecrease && quote.immediateDueEstimateCents !== null && (
              <p className="text-xs text-white/40 mb-4">Estimated — Stripe calculates the exact prorated amount.</p>
            )}
            {quote.blockedReason ? (
              <p role="alert" className="text-sm text-red-300 mb-4">{quote.blockedReason}</p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <button onClick={confirmSeats} disabled={confirming || !!quote.blockedReason} className={btnGold}>
                {confirming ? <><Loader2 className="w-4 h-4 animate-spin" /> Applying…</> : "Confirm seat change"}
              </button>
              <button onClick={() => setQuote(null)} disabled={confirming} className={btnGhost}>
                Keep {seats.purchased} seats
              </button>
            </div>
          </div>
        )}
      </section>

      {billing?.upcoming && (
        <section className={cardCls}>
          <h3 className="font-bold mb-3">Next invoice</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-white/55">Base plan</dt>
              <dd className="font-semibold">{fmtCents(billing.upcoming.baseCents)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-white/55">Seats</dt>
              <dd className="font-semibold">{fmtCents(billing.upcoming.seatCostCents)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-white/55">Total due {fmtDate(billing.upcoming.periodEnd)}</dt>
              <dd className="font-bold">{fmtCents(billing.upcoming.totalCents)}</dd>
            </div>
          </dl>
        </section>
      )}

      <section className={cardCls}>
        <h3 className="font-bold mb-1">Payment method</h3>
        {billing?.paymentMethodHint ? (
          <p className="text-sm text-white/60 mb-3">
            {billing.paymentMethodHint.brand} ending in {billing.paymentMethodHint.last4} — team seats bill to the same card as your subscription.
          </p>
        ) : (
          <p className="text-sm text-white/60 mb-3">Team seats bill to the same payment method as your subscription.</p>
        )}
        <Link href="/settings/subscription" className="text-sm font-semibold text-[#00E5FF] hover:underline">
          Manage subscription & payment →
        </Link>
      </section>

      <section className={cardCls}>
        <h3 className="font-bold mb-4">Invoices</h3>
        {!billing ? (
          <Loader2 className="w-5 h-5 animate-spin text-white/40" />
        ) : billing.invoices.length === 0 ? (
          <p className="text-sm text-white/50">No invoices yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {billing.invoices.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {inv.number || "Invoice"} · {fmtCents(inv.amountPaidCents || inv.totalCents)}
                  </p>
                  <p className="text-xs text-white/45 capitalize">
                    {inv.status || ""} · {fmtDate(inv.created)}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {inv.hostedInvoiceUrl && (
                    <a href={inv.hostedInvoiceUrl} target="_blank" rel="noreferrer" className={btnGhost + " !px-3 !py-1.5 !text-xs"}>View</a>
                  )}
                  {inv.invoicePdf && (
                    <a href={inv.invoicePdf} target="_blank" rel="noreferrer" className={btnGhost + " !px-3 !py-1.5 !text-xs"}>PDF</a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ---------------- Org Settings ---------------- */

function OrgSettingsTab({ detail, onChanged }: { detail: OrgDetail; onChanged: () => void }) {
  const canEdit = detail.myRole === "owner" || detail.myRole === "admin";
  const [name, setName] = useState(detail.org.name);
  const [logoUrl, setLogoUrl] = useState(detail.org.logoUrl ?? "");
  const [description, setDescription] = useState(detail.org.description ?? "");
  const [defaultInviteRole, setDefaultInviteRole] = useState(detail.org.defaultInviteRole || "member");
  const [allowMemberInvites, setAllowMemberInvites] = useState(detail.org.allowMemberInvites);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(detail.org.name);
    setLogoUrl(detail.org.logoUrl ?? "");
    setDescription(detail.org.description ?? "");
    setDefaultInviteRole(detail.org.defaultInviteRole || "member");
    setAllowMemberInvites(detail.org.allowMemberInvites);
  }, [detail.org]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await api("/api/team/org", {
        method: "PATCH",
        body: JSON.stringify({
          orgId: detail.org.id,
          name: name.trim(),
          logoUrl: logoUrl.trim() || null,
          description: description.trim() || null,
          defaultInviteRole,
          allowMemberInvites,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className={cardCls}>
        <h2 className="font-bold mb-1">Organization settings</h2>
        {!canEdit && (
          <p className="text-sm text-white/50 mb-4">Members can view these settings — only the owner and admins can change them.</p>
        )}
        <form onSubmit={save} className="space-y-4 mt-3">
          <fieldset disabled={!canEdit} className="space-y-4 disabled:opacity-70">
            <div>
              <label className={labelCls}>TEAM NAME</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} maxLength={80} />
            </div>
            <div>
              <label className={labelCls}>LOGO URL</label>
              <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className={inputCls} placeholder="https://…" inputMode="url" />
            </div>
            <div>
              <label className={labelCls}>DESCRIPTION</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputCls} min-h-20 resize-y`} maxLength={500} />
            </div>
            <div>
              <label className={labelCls}>DEFAULT INVITE ROLE</label>
              <select value={defaultInviteRole} onChange={(e) => setDefaultInviteRole(e.target.value)} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm outline-none">
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <label className="flex items-center gap-3 text-sm text-white/75 cursor-pointer">
              <input
                type="checkbox"
                checked={allowMemberInvites}
                onChange={(e) => setAllowMemberInvites(e.target.checked)}
                className="w-4.5 h-4.5 accent-[#D4AF37]"
              />
              Allow members to invite new members
            </label>
          </fieldset>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          {canEdit && (
            <button type="submit" disabled={saving} className={btnGold}>
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save settings"}
            </button>
          )}
        </form>
      </section>

      <section className="rounded-3xl border border-red-400/20 bg-red-400/[0.03] p-5 md:p-6">
        <h3 className="font-bold text-red-200 mb-1">Danger zone</h3>
        <p className="text-sm text-white/55">
          Cancelling your team runs through your subscription: team seats are part of your WorldEye subscription,
          so cancelling it there ends the plan and the team seats together at the end of the billing period.
        </p>
        <Link href="/settings/subscription" className="inline-block mt-3 text-sm font-semibold text-red-300 hover:underline">
          Manage or cancel subscription →
        </Link>
      </section>
    </div>
  );
}

/* ---------------- Activity ---------------- */

function ActivityTab({ orgId }: { orgId: string }) {
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<ActivityItem[]>(`/api/team/activity?orgId=${encodeURIComponent(orgId)}`)
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't load activity."));
  }, [orgId]);

  return (
    <section className={cardCls}>
      <h2 className="font-bold mb-4">Activity</h2>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {!items ? (
        <Loader2 className="w-5 h-5 animate-spin text-white/40" />
      ) : items.length === 0 ? (
        <p className="text-sm text-white/50">Nothing here yet — invites, seat changes and member updates will show up.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li key={a.id} className="flex gap-3">
              <div className="w-2 h-2 rounded-full bg-[#D4AF37] mt-2 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-white/80">
                  <span className="font-semibold">{a.actorName || "Someone"}</span>{" "}
                  {a.type.replace(/_/g, " ")}
                  {detailText(a.detail) ? <span className="text-white/55"> — {detailText(a.detail)}</span> : null}
                </p>
                <p className="text-xs text-white/35">
                  {new Date(a.createdAt).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
