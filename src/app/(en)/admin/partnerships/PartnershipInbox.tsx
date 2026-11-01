"use client";

// Partnership CRM inbox: filter applications by status / type / search,
// open one to read the full proposal, then set its status, keep private
// notes and schedule the next follow-up. All mutations go through
// /api/admin/partnerships/[id] (admin-gated + audited). This CRM tracks
// work — it never sends anything; replies happen from the admin's own
// inbox via the mailto Reply button.
import { useMemo, useState } from "react";

export interface PartnerOption {
  value: string;
  label: string;
}

export interface PartnershipApplicationView {
  id: string;
  name: string;
  email: string;
  company: string;
  website: string;
  type: string;
  audienceSize: string | null;
  resources: string;
  seeking: string;
  proposal: string;
  opportunity: string | null;
  status: string;
  adminNotes: string | null;
  nextFollowUpAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const inputCls =
  "rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-[#D4AF37]/60 focus:outline-none [&>option]:bg-[#101014]";
const STATUS_STYLES: Record<string, string> = {
  new: "border-amber-300/40 text-amber-200",
  reviewing: "border-sky-300/40 text-sky-200",
  contacted: "border-violet-300/40 text-violet-200",
  "in-discussion": "border-[#D4AF37]/50 text-[#D4AF37]",
  accepted: "border-emerald-300/40 text-emerald-200",
  declined: "border-white/20 text-white/40",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default function PartnershipInbox({
  initial,
  types,
  statuses,
}: {
  initial: PartnershipApplicationView[];
  types: PartnerOption[];
  statuses: PartnerOption[];
}) {
  const typeLabel = (v: string) => types.find((t) => t.value === v)?.label ?? "Something else";
  const statusLabel = (v: string) => statuses.find((s) => s.value === v)?.label ?? "New";
  const [rows, setRows] = useState(initial);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (!q) return true;
      return `${r.name} ${r.email} ${r.company} ${r.website} ${r.proposal}`.toLowerCase().includes(q);
    });
  }, [rows, statusFilter, typeFilter, query]);

  const dueCount = useMemo(() => {
    const now = Date.now();
    return rows.filter(
      (r) => r.nextFollowUpAt && new Date(r.nextFollowUpAt).getTime() <= now && r.status !== "accepted" && r.status !== "declined",
    ).length;
  }, [rows]);

  async function patch(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/partnerships/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) throw new Error(String(data.error || "Update failed"));
      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: (data.status as string) ?? r.status,
                adminNotes: (data.adminNotes as string | null) ?? r.adminNotes,
                nextFollowUpAt: (data.nextFollowUpAt as string | null) ?? r.nextFollowUpAt,
              }
            : r,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string, company: string) {
    if (!window.confirm(`Delete the application from ${company}? This cannot be undone.`)) return;
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/partnerships/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputCls} aria-label="Filter by status">
          <option value="all">All statuses</option>
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={inputCls} aria-label="Filter by type">
          <option value="all">All types</option>
          {types.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, company, email…"
          className={`${inputCls} min-w-[220px] flex-1`}
          aria-label="Search applications"
        />
      </div>
      <p className="mt-3 text-sm text-white/40">
        {visible.length} of {rows.length} applications
        {dueCount > 0 ? <> · <span className="text-amber-300">{dueCount} follow-up{dueCount === 1 ? "" : "s"} due</span></> : null}
      </p>
      {error && (
        <p className="mt-3 rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-2.5 text-sm text-red-200" role="alert">{error}</p>
      )}

      <div className="mt-5 space-y-3">
        {visible.length === 0 && (
          <p className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-white/45">
            No applications match. New proposals from /partners land here (and in the owner&apos;s email) the moment they&apos;re submitted.
          </p>
        )}
        {visible.map((r) => {
          const open = openId === r.id;
          const due = r.nextFollowUpAt && new Date(r.nextFollowUpAt).getTime() <= Date.now() && r.status !== "accepted" && r.status !== "declined";
          return (
            <article key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : r.id)}
                className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 text-left"
                aria-expanded={open}
              >
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[r.status] ?? STATUS_STYLES.new}`}>
                  {statusLabel(r.status)}
                </span>
                <span className="font-semibold text-white/90">{r.company}</span>
                <span className="text-sm text-white/45">{typeLabel(r.type)}</span>
                {due ? <span className="text-xs font-semibold text-amber-300">follow-up due</span> : null}
                <span className="ml-auto text-xs text-white/35">{fmtDate(r.createdAt)}</span>
              </button>

              {open && (
                <div className="mt-4 border-t border-white/10 pt-4">
                  <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                    <div><dt className="text-white/40">Applicant</dt><dd className="text-white/80">{r.name} — {r.email}</dd></div>
                    <div><dt className="text-white/40">Website</dt><dd className="text-white/80 break-all">{r.website}</dd></div>
                    {r.audienceSize && <div><dt className="text-white/40">Audience size</dt><dd className="text-white/80">{r.audienceSize}</dd></div>}
                    {r.opportunity && <div><dt className="text-white/40">Opportunity clicked</dt><dd className="text-white/80">{r.opportunity}</dd></div>}
                  </dl>
                  <div className="mt-4 space-y-3 text-sm leading-relaxed">
                    <p><span className="font-medium text-white/70">They can contribute:</span> <span className="text-white/60">{r.resources}</span></p>
                    <p><span className="font-medium text-white/70">They&apos;re looking for:</span> <span className="text-white/60">{r.seeking}</span></p>
                    <p><span className="font-medium text-white/70">Proposal:</span> <span className="text-white/60">{r.proposal}</span></p>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-3">
                    <label className="block text-xs font-medium text-white/50">
                      Status
                      <select
                        value={r.status}
                        disabled={busyId === r.id}
                        onChange={(e) => patch(r.id, { status: e.target.value })}
                        className={`${inputCls} mt-1.5 w-full`}
                      >
                        {statuses.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-xs font-medium text-white/50">
                      Next follow-up
                      <input
                        type="date"
                        value={r.nextFollowUpAt ? r.nextFollowUpAt.slice(0, 10) : ""}
                        disabled={busyId === r.id}
                        onChange={(e) => patch(r.id, { nextFollowUpAt: e.target.value || null })}
                        className={`${inputCls} mt-1.5 w-full`}
                      />
                    </label>
                    <div className="flex items-end gap-2">
                      <a
                        href={`mailto:${r.email}?subject=${encodeURIComponent(`Re: Your WorldEye partnership proposal — ${r.company}`)}`}
                        className="rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black hover:bg-[#e5c65c]"
                      >
                        Reply
                      </a>
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => remove(r.id, r.company)}
                        className="rounded-lg border border-red-400/40 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-400/10 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <label className="mt-4 block text-xs font-medium text-white/50">
                    Admin notes (private)
                    <textarea
                      defaultValue={r.adminNotes ?? ""}
                      rows={3}
                      maxLength={5000}
                      placeholder="Calls, context, decisions — saved on blur."
                      className={`${inputCls} mt-1.5 w-full`}
                      onBlur={(e) => {
                        if (e.target.value !== (r.adminNotes ?? "")) patch(r.id, { adminNotes: e.target.value || null });
                      }}
                    />
                  </label>
                  <p className="mt-2 text-xs text-white/30">Updated {fmtDate(r.updatedAt)}{busyId === r.id ? " · saving…" : ""}</p>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
