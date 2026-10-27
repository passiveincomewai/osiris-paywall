"use client";

/**
 * /settings/alerts — camera alerts (Pro + VIP Pro).
 *
 * Members watch cameras with a plain-language condition — up to 2
 * active on Pro, up to 10 on VIP Pro; the server checks each camera's
 * latest photo about every 15 minutes and notifies (email + this
 * inbox) when the condition first shows. Copy stays honest: a check
 * is an AI look at one photo, not a guarantee.
 * Data: GET/POST /api/camera-alerts, PATCH/DELETE /api/camera-alerts/[id],
 * PUT /api/camera-alerts marks the inbox read.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  BellRing,
  Camera,
  Check,
  Crown,
  Loader2,
  Mail,
  Pause,
  Pencil,
  Play,
  Search,
  Trash2,
  X,
} from "lucide-react";
import TrialPicker from "@/components/TrialPicker";
import { cameraRecordStill } from "@/lib/camera-alerts/viewer";

const btnGold =
  "px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition disabled:opacity-60 inline-flex items-center justify-center gap-2";
const btnGhost =
  "px-4 py-2 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 transition disabled:opacity-60 inline-flex items-center gap-2";
const inputCls =
  "w-full rounded-xl bg-white/[0.04] border border-white/12 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#D4AF37]/60";

interface RuleView {
  id: string;
  cameraId: string;
  cameraName: string;
  condition: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  active: boolean;
  lastVerdict: string;
  lastCheckedAt: string | null;
  lastAlertedAt: string | null;
  createdAt: string;
}
interface EventView {
  id: string;
  ruleId: string;
  cameraId: string;
  cameraName: string;
  condition: string;
  observation: string;
  frameAt: string | null;
  imageUrl: string | null;
  emailSent: boolean;
  read: boolean;
  createdAt: string;
}
interface AlertsView {
  tier: string;
  vip: boolean;
  maxActive: number;
  activeCount: number;
  rules: RuleView[];
  events: EventView[];
  unreadCount: number;
}

type CatalogueCam = Record<string, unknown> & { id: string | number };
const camName = (c: Record<string, unknown>): string =>
  (typeof c.name === "string" && c.name) || (typeof c.title === "string" && c.title) || "Camera";
const camPlace = (c: Record<string, unknown>): string =>
  [c.city, c.country].filter((x): x is string => typeof x === "string" && !!x).join(", ");

const EXAMPLES = ["snow on the road", "flooding", "heavy traffic", "a crowd of people", "fog"];

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function verdictLine(r: RuleView): { text: string; gold: boolean } {
  if (!r.active) return { text: "Paused", gold: false };
  if (r.lastVerdict === "matches") return { text: `Condition seen — last checked ${fmtTime(r.lastCheckedAt)}`, gold: true };
  if (r.lastVerdict === "clear") return { text: `Not seen — last checked ${fmtTime(r.lastCheckedAt)}`, gold: false };
  if (!r.lastCheckedAt) return { text: "Waiting for the first check", gold: false };
  return { text: `Couldn't check last time (${fmtTime(r.lastCheckedAt)}) — will retry`, gold: false };
}

export default function AlertsClient() {
  const [view, setView] = useState<AlertsView | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/camera-alerts", { cache: "no-store" });
      if (res.status === 401) {
        setSignedOut(true);
        return;
      }
      if (!res.ok) throw new Error("load");
      setView((await res.json()) as AlertsView);
    } catch {
      setLoadError("Couldn't load your alerts. Refresh to try again.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patchRule = useCallback(
    async (id: string, patch: Record<string, unknown>): Promise<string | null> => {
      const res = await fetch(`/api/camera-alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        return body.error ?? "Something went wrong.";
      }
      await load();
      return null;
    },
    [load],
  );

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link href="/settings" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition mb-6">
        <ArrowLeft className="w-4 h-4" /> Account settings
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <BellRing className="w-7 h-7 text-[#D4AF37]" />
        <h1 className="text-2xl font-black tracking-tight">Camera alerts</h1>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#D4AF37]/40 text-[#D4AF37] text-[11px] font-bold tracking-wider">
          <Crown className="w-3.5 h-3.5" />{" "}
          {view?.vip ? "VIP PRO" : view?.tier === "pro" ? "PRO" : "PRO · VIP PRO"}
        </span>
      </div>
      <p className="text-sm text-white/55 leading-relaxed mb-8">
        Pick a camera, describe what to watch for — “snow on the road” — and we check its latest
        photo about every 15 minutes. When a check first sees your condition, we email you and post
        it here, with the photo it saw. A check is an AI look at a single photo, not a guarantee.
      </p>

      {signedOut ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <p className="text-sm text-white/70 mb-4">Sign in to manage your camera alerts.</p>
          <Link href="/signin?callbackUrl=/settings/alerts" className={btnGold}>Sign in</Link>
        </div>
      ) : loadError ? (
        <p className="text-sm text-red-300">{loadError}</p>
      ) : !view ? (
        <Loader2 className="w-6 h-6 animate-spin text-white/40" />
      ) : (
        <div className="space-y-10">
          {view.maxActive === 0 && (
            <section className="rounded-2xl border border-[#D4AF37]/25 bg-white/[0.03] p-6">
              <h2 className="font-bold mb-1.5">Camera alerts start with Pro</h2>
              <p className="text-sm text-white/55 leading-relaxed mb-5">
                {view.rules.length > 0
                  ? "Your plan isn't active right now, so your alerts are paused — nothing was deleted. They resume on their own when Pro or VIP Pro is back."
                  : "Camera alerts come with the paid plans: Pro watches up to 2 cameras, and VIP Pro (the annual plan) watches up to 10. Pick a plan below to start watching."}
              </p>
              <TrialPicker />
            </section>
          )}

          <RulesSection view={view} reload={load} patchRule={patchRule} notice={notice} setNotice={setNotice} />
          <EventsSection view={view} reload={load} />
        </div>
      )}
    </main>
  );
}

function RulesSection({
  view,
  reload,
  patchRule,
  notice,
  setNotice,
}: {
  view: AlertsView;
  reload: () => Promise<void>;
  patchRule: (id: string, patch: Record<string, unknown>) => Promise<string | null>;
  notice: string | null;
  setNotice: (s: string | null) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const act = async (id: string, patch: Record<string, unknown>) => {
    setBusyId(id);
    const err = await patchRule(id, patch);
    setBusyId(null);
    setNotice(err);
  };

  const remove = async (id: string) => {
    setBusyId(id);
    const res = await fetch(`/api/camera-alerts/${id}`, { method: "DELETE" });
    setBusyId(null);
    setConfirmDeleteId(null);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setNotice(body.error ?? "Couldn't delete that alert.");
      return;
    }
    setNotice(null);
    await reload();
  };

  return (
    <section>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-lg font-bold">Your watched cameras</h2>
        <span className="text-xs text-white/45">
          {view.activeCount} of {view.maxActive} active
        </span>
      </div>

      {notice && (
        <p className="text-sm text-amber-300 bg-amber-400/10 border border-amber-300/20 rounded-xl px-4 py-2.5 mb-4">{notice}</p>
      )}

      {view.rules.length === 0 ? (
        <p className="text-sm text-white/50 mb-6">No cameras watched yet. Add your first one below.</p>
      ) : (
        <ul className="space-y-3 mb-6">
          {view.rules.map((r) => {
            const v = verdictLine(r);
            const editing = editingId === r.id;
            return (
              <li key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{r.cameraName}</div>
                    <div className="text-sm text-white/70">Watching for “{r.condition}”</div>
                    <div className={`text-xs mt-1.5 ${v.gold ? "text-[#D4AF37]" : "text-white/45"}`}>{v.text}</div>
                    <div className="text-xs text-white/35 mt-1 flex items-center gap-3">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {r.emailEnabled ? "Email on" : "Email off"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Bell className="w-3 h-3" /> {r.inAppEnabled ? "In-app on" : "In-app off"}
                      </span>
                      {r.lastAlertedAt && <span>Last alert {fmtTime(r.lastAlertedAt)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      className={btnGhost}
                      disabled={busyId === r.id}
                      onClick={() => void act(r.id, { active: !r.active })}
                      title={r.active ? "Pause this alert" : "Resume this alert"}
                    >
                      {r.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button className={btnGhost} onClick={() => setEditingId(editing ? null : r.id)} title="Edit">
                      <Pencil className="w-4 h-4" />
                    </button>
                    {confirmDeleteId === r.id ? (
                      <button
                        className="px-4 py-2 rounded-xl bg-red-500/85 text-white text-sm font-semibold hover:bg-red-500 transition disabled:opacity-60"
                        disabled={busyId === r.id}
                        onClick={() => void remove(r.id)}
                      >
                        Confirm delete
                      </button>
                    ) : (
                      <button className={btnGhost} onClick={() => setConfirmDeleteId(r.id)} title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                {editing && (
                  <RuleEditor
                    rule={r}
                    onCancel={() => setEditingId(null)}
                    onSave={async (patch) => {
                      const err = await patchRule(r.id, patch);
                      if (err) setNotice(err);
                      else {
                        setNotice(null);
                        setEditingId(null);
                      }
                    }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {view.maxActive > 0 && <AddRuleForm view={view} reload={reload} setNotice={setNotice} />}
    </section>
  );
}

function RuleEditor({
  rule,
  onSave,
  onCancel,
}: {
  rule: RuleView;
  onSave: (patch: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [condition, setCondition] = useState(rule.condition);
  const [emailEnabled, setEmailEnabled] = useState(rule.emailEnabled);
  const [inAppEnabled, setInAppEnabled] = useState(rule.inAppEnabled);
  const [saving, setSaving] = useState(false);
  return (
    <div className="mt-4 border-t border-white/10 pt-4 space-y-3">
      <input className={inputCls} value={condition} maxLength={140} onChange={(e) => setCondition(e.target.value)} aria-label="Condition" />
      <div className="flex gap-5 text-sm text-white/70">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={emailEnabled} onChange={(e) => setEmailEnabled(e.target.checked)} /> Email me
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={inAppEnabled} onChange={(e) => setInAppEnabled(e.target.checked)} /> Post it here
        </label>
      </div>
      <div className="flex gap-2">
        <button
          className={btnGold}
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            await onSave({ condition, emailEnabled, inAppEnabled });
            setSaving(false);
          }}
        >
          <Check className="w-4 h-4" /> Save
        </button>
        <button className={btnGhost} onClick={onCancel}>
          <X className="w-4 h-4" /> Cancel
        </button>
      </div>
    </div>
  );
}

function AddRuleForm({
  view,
  reload,
  setNotice,
}: {
  view: AlertsView;
  reload: () => Promise<void>;
  setNotice: (s: string | null) => void;
}) {
  const [catalogue, setCatalogue] = useState<CatalogueCam[] | null>(null);
  const [catalogueFailed, setCatalogueFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<CatalogueCam | null>(null);
  const [condition, setCondition] = useState("");
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const atCap = view.activeCount >= view.maxActive;

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/cctv?sparse=1");
        if (!r.ok) throw new Error("sample");
        const j = (await r.json()) as { cameras?: CatalogueCam[] };
        if (Array.isArray(j.cameras)) setCatalogue(j.cameras);
        else setCatalogueFailed(true);
      } catch {
        setCatalogueFailed(true);
      }
    })();
  }, []);

  const results = useMemo(() => {
    if (!catalogue || picked || query.trim().length < 2) return [];
    const q = query.trim().toLowerCase();
    return catalogue
      .filter((c) => cameraRecordStill(c))
      .filter((c) => `${camName(c)} ${camPlace(c)}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [catalogue, query, picked]);

  const submit = async () => {
    if (!picked) return;
    setBusy(true);
    const res = await fetch("/api/camera-alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cameraId: String(picked.id), condition, emailEnabled, inAppEnabled }),
    });
    setBusy(false);
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setNotice(body.error ?? "Couldn't create that alert.");
      return;
    }
    setNotice(null);
    setPicked(null);
    setQuery("");
    setCondition("");
    await reload();
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h3 className="font-bold text-sm mb-3 inline-flex items-center gap-2">
        <Camera className="w-4 h-4 text-[#D4AF37]" /> Watch a new camera
      </h3>
      {atCap ? (
        <p className="text-sm text-amber-300">
          {view.vip ? (
            <>
              You have {view.maxActive} active alerts — the VIP Pro limit. Pause or remove one to
              add another.
            </>
          ) : (
            <>
              You have {view.maxActive} active alerts — your Pro limit. Pause or remove one to add
              another, or{" "}
              <Link href="/pricing" className="underline underline-offset-2">
                step up to VIP Pro for 10
              </Link>
              .
            </>
          )}
        </p>
      ) : (
        <div className="space-y-3">
          {picked ? (
            <div className="flex items-center justify-between rounded-xl bg-white/[0.05] border border-white/10 px-3.5 py-2.5">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{camName(picked)}</div>
                <div className="text-xs text-white/45">{camPlace(picked)}</div>
              </div>
              <button className={btnGhost} onClick={() => setPicked(null)}>
                <X className="w-4 h-4" /> Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="w-4 h-4 text-white/35 absolute left-3.5 top-3" />
              <input
                className={`${inputCls} pl-10`}
                placeholder="Search cameras — try “Powder”, “I-15”, “beach”…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {results.length > 0 && (
                <ul className="mt-2 rounded-xl border border-white/10 overflow-hidden">
                  {results.map((c) => (
                    <li key={String(c.id)}>
                      <button
                        className="w-full text-left px-3.5 py-2.5 hover:bg-white/5 transition border-b border-white/5 last:border-0"
                        onClick={() => setPicked(c)}
                      >
                        <span className="text-sm font-medium block truncate">{camName(c)}</span>
                        <span className="text-xs text-white/45">{camPlace(c)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {catalogueFailed ? (
                <p className="text-xs text-amber-300 mt-2">
                  The camera sample couldn’t load, so search is unavailable right now. You can
                  still set an alert from the globe: open any camera and tap Set alert.
                </p>
              ) : !catalogue ? (
                <p className="text-xs text-white/35 mt-2">Loading the camera sample…</p>
              ) : query.trim().length >= 2 && results.length === 0 ? (
                <p className="text-xs text-amber-300 mt-2">
                  No still-photo camera in the quick sample matches that search. The sample holds
                  about 2,000 of the full catalogue — open the camera on the globe and tap Set
                  alert instead.
                </p>
              ) : (
                <p className="text-xs text-white/35 mt-2">
                  Search covers the quick-load camera sample, still-photo cameras only; every
                  pick is checked against the full catalogue when you save.
                </p>
              )}
            </div>
          )}

          <input
            className={inputCls}
            placeholder="What should we watch for?"
            value={condition}
            maxLength={140}
            onChange={(e) => setCondition(e.target.value)}
            aria-label="Condition"
          />
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                className="px-2.5 py-1 rounded-full border border-white/12 text-xs text-white/60 hover:bg-white/5 transition"
                onClick={() => setCondition(ex)}
              >
                {ex}
              </button>
            ))}
          </div>
          <div className="flex gap-5 text-sm text-white/70">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={emailEnabled} onChange={(e) => setEmailEnabled(e.target.checked)} /> Email me
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={inAppEnabled} onChange={(e) => setInAppEnabled(e.target.checked)} /> Post it here
            </label>
          </div>
          <button className={btnGold} disabled={busy || !picked || condition.trim().length < 3} onClick={() => void submit()}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />} Start watching
          </button>
        </div>
      )}
    </div>
  );
}

function EventsSection({ view, reload }: { view: AlertsView; reload: () => Promise<void> }) {
  const [marking, setMarking] = useState(false);
  const markAll = async () => {
    setMarking(true);
    await fetch("/api/camera-alerts", { method: "PUT" });
    setMarking(false);
    await reload();
  };
  return (
    <section>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-lg font-bold">
          Notifications{" "}
          {view.unreadCount > 0 && (
            <span className="ml-1.5 px-2 py-0.5 rounded-full bg-[#D4AF37] text-black text-xs font-bold align-middle">
              {view.unreadCount} new
            </span>
          )}
        </h2>
        {view.unreadCount > 0 && (
          <button className="text-xs text-white/50 hover:text-white transition" disabled={marking} onClick={() => void markAll()}>
            Mark all read
          </button>
        )}
      </div>
      {view.events.length === 0 ? (
        <p className="text-sm text-white/50">
          Nothing yet. When a check sees one of your conditions, the photo and what it saw land here.
        </p>
      ) : (
        <ul className="space-y-3">
          {view.events.map((e) => (
            <li
              key={e.id}
              className={`rounded-2xl border p-4 flex gap-4 ${e.read ? "border-white/10 bg-white/[0.03]" : "border-[#D4AF37]/35 bg-[#D4AF37]/[0.05]"}`}
            >
              {/* Session-authed image route: the exact still this alert is based on. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/camera-alerts/events/${e.id}/image`}
                alt={`The checked photo from ${e.cameraName}`}
                className="w-28 h-20 object-cover rounded-lg border border-white/10 shrink-0 bg-white/5"
                loading="lazy"
              />
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">
                  {e.cameraName}
                  {!e.read && <span className="ml-2 text-[11px] font-bold text-[#D4AF37] tracking-wider">NEW</span>}
                </div>
                <div className="text-xs text-white/45">
                  Watching for “{e.condition}” · alerted {fmtTime(e.createdAt)}
                  {e.frameAt && <> · photo from {fmtTime(e.frameAt)}</>}
                  {e.emailSent && <> · also emailed</>}
                </div>
                <p className="text-sm text-white/75 mt-1.5 leading-relaxed">{e.observation}</p>
                <Link href={`/?camera=${encodeURIComponent(e.cameraId)}`} className="text-xs text-[#D4AF37] hover:underline mt-1.5 inline-block">
                  Open the live camera →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
