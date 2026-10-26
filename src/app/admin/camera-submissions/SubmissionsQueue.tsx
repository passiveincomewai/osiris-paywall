"use client";

// Admin review queue for /admin/camera-submissions. Rows arrive
// server-rendered from the page; decisions post to
// /api/admin/camera-submissions/[id] and update the row in place.
// The feed itself is never proxied or embedded here — "Open feed" links
// out to the submitted URL so the reviewer sees exactly what the public
// sees. Approve means cleared-for-import only (the catalogue import is a
// separate ops step) and the copy here says so.
import { useState } from "react";
import {
  cameraSubmissionKindLabel,
  cameraSubmissionCategoryLabel,
  REVIEWER_NOTES_MAX,
} from "@/lib/camera-submissions";

export interface CameraSubmissionView {
  id: string;
  kind: string;
  cameraName: string;
  url: string;
  category: string;
  city: string;
  country: string;
  lat: number | null;
  lng: number | null;
  notes: string | null;
  submitterName: string;
  submitterEmail: string;
  status: string;
  probeStatus: string;
  probeDetail: string | null;
  reviewerNotes: string | null;
  reviewedBy: string | null;
  createdAt: string;
  reviewedAt: string | null;
  receiptEmailedAt: string | null;
  decisionEmailedAt: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "border-amber-400/40 text-amber-200 bg-amber-400/10",
  approved: "border-emerald-400/40 text-emerald-200 bg-emerald-400/10",
  rejected: "border-red-400/40 text-red-200 bg-red-400/10",
};

const PROBE_STYLES: Record<string, string> = {
  reachable: "border-emerald-400/30 text-emerald-200/90 bg-emerald-400/[0.07]",
  unreachable: "border-red-400/30 text-red-200/90 bg-red-400/[0.07]",
  unknown: "border-white/15 text-white/55 bg-white/[0.04]",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function SubmissionCard({ sub }: { sub: CameraSubmissionView }) {
  const [row, setRow] = useState(sub);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "approve" | "reject") {
    if (busy) return;
    setBusy(decision);
    setError(null);
    try {
      const res = await fetch(`/api/admin/camera-submissions/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reviewerNotes: notes }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? `Something went wrong (${res.status}).`);
      setRow({
        ...row,
        status: j.status,
        reviewerNotes: notes.trim() || null,
        reviewedAt: new Date().toISOString(),
        decisionEmailedAt: j.decisionEmailed ? new Date().toISOString() : row.decisionEmailedAt,
      });
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "The decision didn't save. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-white leading-snug">{row.cameraName}</h2>
          <p className="text-sm text-white/50 mt-0.5">
            {row.city}, {row.country}
            {row.lat != null && row.lng != null ? (
              <span className="text-white/35"> · {row.lat.toFixed(5)}, {row.lng.toFixed(5)}</span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium ${STATUS_STYLES[row.status] ?? STATUS_STYLES.pending}`}>
            {row.status}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-white/15 text-xs text-white/60 bg-white/[0.04]">
            {cameraSubmissionKindLabel(row.kind)}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-white/15 text-xs text-white/60 bg-white/[0.04]">
            {cameraSubmissionCategoryLabel(row.category)}
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a
          href={row.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-3.5 py-2 rounded-lg bg-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition"
        >
          Open feed ↗
        </a>
        <span className={`inline-flex items-center px-2.5 py-1.5 rounded-lg border text-xs ${PROBE_STYLES[row.probeStatus] ?? PROBE_STYLES.unknown}`}>
          Probe: {row.probeStatus}
          {row.probeDetail ? <span className="text-white/40 ml-1.5">{row.probeDetail}</span> : null}
        </span>
      </div>
      <p className="mt-2 text-xs font-mono text-white/35 break-all">{row.url}</p>

      {row.notes ? (
        <p className="mt-4 text-sm text-white/65 leading-relaxed whitespace-pre-wrap rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
          {row.notes}
        </p>
      ) : null}

      <p className="mt-4 text-xs text-white/40 leading-relaxed">
        Submitted {fmtDate(row.createdAt)} by{" "}
        <span className="text-white/65">{row.submitterName}</span>{" "}
        &lt;<a href={`mailto:${row.submitterEmail}`} className="text-cyan-300/80 hover:underline">{row.submitterEmail}</a>&gt;
        {" · "}receipt {row.receiptEmailedAt ? "emailed" : "not emailed"}
        {row.reviewedAt ? (
          <>
            {" · "}reviewed {fmtDate(row.reviewedAt)}
            {row.reviewedBy ? <> by <span className="text-white/60">{row.reviewedBy}</span></> : null}
            {" · "}decision {row.decisionEmailedAt ? "emailed" : "not emailed"}
          </>
        ) : null}
      </p>

      {row.status !== "pending" && row.reviewerNotes ? (
        <p className="mt-3 text-sm text-white/55 leading-relaxed">
          <span className="text-white/40">Reviewer note:</span> {row.reviewerNotes}
        </p>
      ) : null}

      {row.status === "pending" ? (
        <div className="mt-4 border-t border-white/[0.07] pt-4">
          <label htmlFor={`reviewer-notes-${row.id}`} className="block text-sm font-medium text-white/70 mb-1.5">
            Reviewer notes <span className="text-white/35 font-normal">(saved on the submission; included in the decision email)</span>
          </label>
          <textarea
            id={`reviewer-notes-${row.id}`}
            rows={2}
            maxLength={REVIEWER_NOTES_MAX}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Feed verified live and public; operator confirmed by email."
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[15px] text-white placeholder:text-white/30 outline-none focus:border-[#D4AF37]/50 focus:bg-white/[0.05] transition resize-y"
          />
          {error && (
            <div className="mt-3 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200" role="alert">
              {error}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => decide("approve")}
              className="px-5 py-2.5 rounded-xl bg-emerald-400 text-black text-sm font-bold hover:brightness-110 disabled:opacity-60 disabled:cursor-wait transition"
            >
              {busy === "approve" ? "Approving…" : "Approve — cleared for import"}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => decide("reject")}
              className="px-5 py-2.5 rounded-xl border border-red-400/40 text-red-200 text-sm font-semibold hover:bg-red-400/10 disabled:opacity-60 disabled:cursor-wait transition"
            >
              {busy === "reject" ? "Rejecting…" : "Reject"}
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export default function SubmissionsQueue({
  initial,
  filter,
}: {
  initial: CameraSubmissionView[];
  filter: string;
}) {
  if (initial.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
        <div className="text-4xl mb-4" aria-hidden>📷</div>
        <p className="text-white/60 text-sm leading-relaxed max-w-md mx-auto">
          {filter === "pending"
            ? "No submissions are waiting for review. New ones from /submit-camera will appear here."
            : `No ${filter === "all" ? "" : `${filter} `}submissions to show.`}
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {initial.map((s) => (
        <SubmissionCard key={s.id} sub={s} />
      ))}
    </div>
  );
}
