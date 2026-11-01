"use client";

/**
 * Fraud Radar Phase 8 — case workspace (Payload P8-D,
 * PHASE8 §5.1). The detail surface renders ONLY through the
 * shipped P8-A/B/C APIs — case + events, leads, evidence,
 * claims + verifications, notes, usage — and renders a pinned
 * lead ONLY from its stored snapshot (§1.3 rule 2): the
 * snapshot panel carries its own dataset version and
 * provenance, and the clearly-separated "current published
 * record" link is the only live-data path, labelled as such.
 *
 * Isolation in the UI mirrors the API: a 401 renders the
 * sign-in state; a 404 — which is what the API returns for a
 * foreign case exactly as for a nonexistent one — renders a
 * plain not-found state whose copy does not distinguish the
 * two and leaks nothing about any other user's work.
 *
 * Copy discipline: system copy speaks of research leads and
 * published records only. Verdict words render with their
 * §4.2 definitions from claim-verdicts.ts, verbatim. The
 * §2.2 upload warning renders verbatim from
 * vault-constants.ts. Notes and claim statements are the
 * user's own words, rendered as theirs.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { WireCase, WireUsage } from "../CasesClient";
import { formatBytes } from "../CasesClient";
import { VERDICT_DEFINITIONS, isClaimVerdict } from "@/lib/fraud-radar/cases/claim-verdicts";
import { EVIDENCE_UPLOAD_WARNING } from "@/lib/fraud-radar/cases/vault-constants";

// ---------------------------------------------------------------------------
// Wire shapes (the P8-A/B/C API serialisation — route-helpers.ts).
// ---------------------------------------------------------------------------

export interface WireLead {
  id: string;
  caseId: string;
  kind: string;
  engine: string;
  entityKey: string;
  entityLabel: string;
  snapshot: unknown;
  snapshotSha256: string;
  sourceDataset: string;
  sourceDatasetVersion: string;
  ruleCode: string | null;
  pinnedById: string;
  pinnedAt: string;
  annotation: string | null;
}

export interface WireEvidence {
  id: string;
  caseId: string;
  kind: string;
  title: string;
  description: string | null;
  originalFilename: string | null;
  contentType: string | null;
  sizeBytes: string | null;
  sha256: string | null;
  storageState: string;
  artifactEnvelope: unknown;
  artifactSha256: string | null;
  processingStatus: string;
  processingPath: string | null;
  processorVersion: string | null;
  pageCount: number | null;
  uploadedById: string;
  createdAt: string;
  updatedAt: string;
}

export interface WireClaim {
  id: string;
  caseId: string;
  statement: string;
  subjectEngine: string | null;
  subjectEntityKey: string | null;
  createdById: string;
  createdAt: string;
}

export interface WireCitation {
  dataset: string;
  datasetVersion: string;
  grainKey: string;
  caveats?: string[];
}

export interface WireVerification {
  id: string;
  claimId: string;
  verdict: string;
  verdictDefinition: string | null;
  evidence: { citations?: WireCitation[]; figures?: unknown } | null;
  summary: string;
  validatorVerdict: string;
  corpusVersions: Record<string, string> | null;
  checkerVersion: string;
  model: string | null;
  promptVersion: string | null;
  createdById: string;
  createdAt: string;
}

export interface WireNote {
  id: string;
  caseId: string;
  leadId: string | null;
  evidenceId: string | null;
  claimId: string | null;
  body: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WireEvent {
  id: string;
  kind: string;
  actorId: string;
  detail: Record<string, unknown> | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Snapshot + live-record helpers.
// ---------------------------------------------------------------------------

interface SnapshotEnvelope {
  dataset?: string;
  datasetVersion?: string;
  grainKey?: string;
  sourceVintages?: { source: string; version: string }[];
  caveats?: string[];
  data?: unknown;
}

function asEnvelope(snapshot: unknown): SnapshotEnvelope {
  if (snapshot && typeof snapshot === "object") return snapshot as SnapshotEnvelope;
  return {};
}

/** The live profile for a lead's entity — the §1.3 rule 2
 *  "current published record", kept separate from the snapshot. */
export function currentRecordHref(engine: string, entityKey: string): string | null {
  const bare = entityKey.includes(":") ? entityKey.split(":").slice(1).join(":") : entityKey;
  if (engine === "healthcare") return `/fraud-radar/healthcare/providers/${bare}`;
  if (engine === "care") return `/fraud-radar/care/medicare/${bare}`;
  if (engine === "grants") return `/fraud-radar/grants/recipients/${bare}`;
  if (engine === "cross") return "/fraud-radar/signals";
  return null;
}

export function citationLabel(c: WireCitation): string {
  return `${c.dataset}@${c.datasetVersion} · ${c.grainKey}`;
}

export function citationHref(c: WireCitation): string | null {
  const idx = c.grainKey.indexOf(":");
  if (idx < 0) return null;
  const kind = c.grainKey.slice(0, idx);
  const value = c.grainKey.slice(idx + 1);
  if (kind === "NPI" && c.dataset === "medicaid-provider-aggregates") {
    return `/fraud-radar/healthcare/providers/${value}`;
  }
  if (kind === "NPI" && c.dataset === "care-program-aggregates") {
    return `/fraud-radar/care/medicare/${value}`;
  }
  if (kind === "UEI" && c.dataset === "grants-aggregates") {
    return `/fraud-radar/grants/recipients/${value}`;
  }
  if (c.dataset === "research-signals") return "/fraud-radar/signals";
  return null;
}

/** Structured snapshot data, rendered as data (escaped by React). */
function SnapshotData({ data }: { data: unknown }) {
  if (data === null || data === undefined) return null;
  return (
    <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/30 p-3 font-mono text-xs leading-relaxed text-white/75">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

// ---------------------------------------------------------------------------
// Presentational sections (fixture-rendered by the surface tests).
// ---------------------------------------------------------------------------

export function LeadCard({
  lead,
  onSaveAnnotation,
  onRemove,
}: {
  lead: WireLead;
  onSaveAnnotation?: (leadId: string, annotation: string) => void;
  onRemove?: (leadId: string) => void;
}) {
  const env = asEnvelope(lead.snapshot);
  const liveHref = currentRecordHref(lead.engine, lead.entityKey);
  const [draft, setDraft] = useState(lead.annotation ?? "");
  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold text-white/90">{lead.entityLabel}</h3>
        <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/70">
          {lead.kind}
          {lead.ruleCode ? ` · ${lead.ruleCode}` : ""}
        </span>
      </div>
      <p className="mt-1 font-mono text-xs text-white/40">
        {lead.engine} · {lead.entityKey} · pinned {lead.pinnedAt.slice(0, 10)}
      </p>
      {lead.kind === "candidate" && (
        <p className="mt-2 inline-block rounded bg-amber-300/15 px-2.5 py-1 text-xs text-amber-200">
          candidate — human review
        </p>
      )}
      <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/70 leading-relaxed">
        <p className="font-semibold text-white/85">
          Snapshot as pinned — {lead.sourceDataset}@{lead.sourceDatasetVersion}
        </p>
        <p className="mt-1">
          This panel renders the record exactly as captured at pin time,
          from the stored snapshot. Dataset refreshes do not change it.
        </p>
        {env.dataset && (
          <p className="mt-1 font-mono text-xs text-white/50">
            {env.dataset}@{env.datasetVersion} · {env.grainKey}
          </p>
        )}
        {env.sourceVintages && env.sourceVintages.length > 0 && (
          <p className="mt-1 text-xs text-white/50">
            Source vintages:{" "}
            {env.sourceVintages.map((v) => `${v.source} ${v.version}`).join(" · ")}
          </p>
        )}
        {env.caveats && env.caveats.length > 0 && (
          <p className="mt-1 font-mono text-xs text-white/45">
            Caveats: {env.caveats.join(", ")}
          </p>
        )}
        <p className="mt-1 font-mono text-xs text-white/40">
          Snapshot SHA-256: {lead.snapshotSha256}
        </p>
        <SnapshotData data={env.data ?? lead.snapshot} />
      </div>
      {liveHref && (
        <p className="mt-3 text-sm">
          <Link href={liveHref} className="text-cyan-300 hover:underline">
            Current published record (live) →
          </Link>{" "}
          <span className="text-white/45">
            — the live profile, which may show a newer vintage than the
            snapshot above.
          </span>
        </p>
      )}
      <div className="mt-3">
        <label className="text-xs font-semibold text-white/55">
          Your annotation on this pin
        </label>
        <div className="mt-1 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Annotation (your words)"
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-sm text-white placeholder:text-white/35"
          />
          {onSaveAnnotation && (
            <button
              type="button"
              onClick={() => onSaveAnnotation(lead.id, draft)}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/85 hover:bg-white/5"
            >
              Save
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(lead.id)}
              className="rounded-lg border border-red-300/30 px-3 py-1.5 text-xs text-red-200/90 hover:bg-red-300/10"
            >
              Remove pin
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function processingLabel(item: WireEvidence): string {
  if (item.processingStatus === "processed") {
    return item.processingPath === "docling"
      ? "Structured extraction (Docling)"
      : item.processingPath === "text_extract"
        ? "Text extraction (basic — tables and layout may be incomplete)"
        : "Processed";
  }
  return item.processingStatus.replace(/_/g, " ");
}

export function EvidenceRow({
  item,
  caseId,
  verifyState,
  onVerify,
  onProcess,
  onRemove,
}: {
  item: WireEvidence;
  caseId: string;
  verifyState?: string | null;
  onVerify?: (evidenceId: string) => void;
  onProcess?: (evidenceId: string) => void;
  onRemove?: (evidenceId: string) => void;
}) {
  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold text-white/90">{item.title}</h3>
        <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/70">
          {item.kind}
        </span>
      </div>
      <p className="mt-1 text-xs text-white/45">
        {item.contentType ?? "captured record"}
        {item.sizeBytes !== null ? ` · ${formatBytes(item.sizeBytes)}` : ""}
        {` · added ${item.createdAt.slice(0, 10)}`}
        {item.storageState === "deletion_pending" ? " · deletion pending" : ""}
      </p>
      {item.description && (
        <p className="mt-2 text-sm text-white/65 leading-relaxed">{item.description}</p>
      )}
      {item.sha256 && (
        <p className="mt-2 font-mono text-xs text-white/45">
          SHA-256: {item.sha256.slice(0, 16)}…
        </p>
      )}
      {item.artifactSha256 && (
        <p className="mt-2 font-mono text-xs text-white/45">
          Captured-record SHA-256: {item.artifactSha256.slice(0, 16)}…
        </p>
      )}
      <p className="mt-1 text-sm text-white/60">
        Processing: {processingLabel(item)}
        {item.processorVersion ? ` · ${item.processorVersion}` : ""}
        {item.pageCount !== null ? ` · ${item.pageCount} pages` : ""}
      </p>
      {item.processingStatus === "processed" && (
        <p className="mt-1 text-xs text-white/45">
          Machine-extracted — check figures against the original document.
        </p>
      )}
      {verifyState && <p className="mt-1 text-sm text-white/75">{verifyState}</p>}
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {item.kind === "upload" && item.storageState === "present" && (
          <a
            href={`/api/fraud-radar/cases/${caseId}/evidence/${item.id}/download`}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-white/85 hover:bg-white/5"
          >
            Download
          </a>
        )}
        {item.kind === "upload" && onVerify && (
          <button
            type="button"
            onClick={() => onVerify(item.id)}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-white/85 hover:bg-white/5"
          >
            Verify integrity
          </button>
        )}
        {item.kind === "upload" && onProcess && (
          <button
            type="button"
            onClick={() => onProcess(item.id)}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-white/85 hover:bg-white/5"
          >
            {item.processingStatus === "not_requested" ? "Process document" : "Re-process"}
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="rounded-lg border border-red-300/30 px-3 py-1.5 text-red-200/90 hover:bg-red-300/10"
          >
            Delete
          </button>
        )}
      </div>
    </article>
  );
}

export function VerificationView({ v }: { v: WireVerification }) {
  const citations = v.evidence?.citations ?? [];
  const definition = isClaimVerdict(v.verdict)
    ? VERDICT_DEFINITIONS[v.verdict]
    : v.verdictDefinition;
  return (
    <article className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <p className="text-sm">
        <span className="font-mono font-semibold text-white/90">{v.verdict}</span>{" "}
        <span className="text-white/45">
          · {v.createdAt.slice(0, 10)} · checker {v.checkerVersion}
        </span>
      </p>
      {definition && (
        <p className="mt-1 text-sm text-white/60 leading-relaxed">{definition}</p>
      )}
      <p className="mt-2 whitespace-pre-wrap text-sm text-white/80 leading-relaxed">
        {v.summary}
      </p>
      {citations.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-semibold text-white/50">Sources cited in this check</p>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {citations.map((c, i) => {
              const href = citationHref(c);
              const label = citationLabel(c);
              return (
                <li
                  key={`${label}-${i}`}
                  className="rounded bg-white/8 px-2 py-1 font-mono text-[11px] text-cyan-100/85"
                >
                  {href ? (
                    <Link href={href} className="hover:underline">
                      {label}
                    </Link>
                  ) : (
                    label
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {v.corpusVersions && Object.keys(v.corpusVersions).length > 0 && (
        <p className="mt-2 font-mono text-xs text-white/40">
          Corpus:{" "}
          {Object.entries(v.corpusVersions)
            .map(([k, ver]) => `${k}@${ver}`)
            .join(" · ")}
        </p>
      )}
    </article>
  );
}

export function ClaimView({
  claim,
  verifications,
  onVerify,
  onRemove,
}: {
  claim: WireClaim;
  verifications: WireVerification[];
  onVerify?: (claimId: string) => void;
  onRemove?: (claimId: string) => void;
}) {
  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <p className="whitespace-pre-wrap text-sm text-white/85 leading-relaxed">
        {claim.statement}
      </p>
      <p className="mt-1 text-xs text-white/45">
        Your statement, as written
        {claim.subjectEntityKey
          ? ` · subject: ${claim.subjectEngine ?? ""} ${claim.subjectEntityKey}`
          : ""}
        {` · added ${claim.createdAt.slice(0, 10)}`}
      </p>
      <div className="mt-3 flex gap-2 text-xs">
        {onVerify && (
          <button
            type="button"
            onClick={() => onVerify(claim.id)}
            className="rounded-lg bg-cyan-400 px-3 py-1.5 font-semibold text-slate-950 hover:bg-cyan-300"
          >
            Verify against the published corpus
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={() => onRemove(claim.id)}
            className="rounded-lg border border-red-300/30 px-3 py-1.5 text-red-200/90 hover:bg-red-300/10"
          >
            Delete claim
          </button>
        )}
      </div>
      {verifications.length === 0 ? (
        <p className="mt-3 text-sm text-white/50">
          Not yet verified against the published corpus.
        </p>
      ) : (
        <div>
          {verifications.map((v) => (
            <VerificationView key={v.id} v={v} />
          ))}
        </div>
      )}
    </article>
  );
}

export function NoteView({
  note,
  onRemove,
}: {
  note: WireNote;
  onRemove?: (noteId: string) => void;
}) {
  const anchor = note.leadId
    ? "on a pinned lead"
    : note.evidenceId
      ? "on an evidence item"
      : note.claimId
        ? "on a claim"
        : "on this case";
  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <p className="whitespace-pre-wrap text-sm text-white/85 leading-relaxed">{note.body}</p>
      <p className="mt-1 text-xs text-white/45">
        {anchor} · {note.createdAt.slice(0, 10)}
        {note.updatedAt !== note.createdAt ? ` · edited ${note.updatedAt.slice(0, 10)}` : ""}
      </p>
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(note.id)}
          className="mt-2 rounded-lg border border-red-300/30 px-3 py-1.5 text-xs text-red-200/90 hover:bg-red-300/10"
        >
          Delete note
        </button>
      )}
    </article>
  );
}

export function ActivityView({ events }: { events: WireEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-white/50">No activity recorded yet.</p>;
  }
  return (
    <ul className="space-y-2">
      {events.map((e) => (
        <li key={e.id} className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-sm">
          <span className="font-mono text-xs text-white/60">{e.kind}</span>{" "}
          <span className="text-white/45">· {e.createdAt.slice(0, 10)}</span>
          {typeof e.detail?.title === "string" && (
            <span className="text-white/70"> · {e.detail.title}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function CaseNotFoundState() {
  return (
    <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="text-lg font-semibold">Case not found</h2>
      <p className="mt-2 text-sm text-white/65 leading-relaxed">
        This case could not be found. It may have been deleted, or the
        link may be incorrect.{" "}
        <Link href="/fraud-radar/cases" className="text-cyan-300 hover:underline">
          Back to your cases →
        </Link>
      </p>
    </div>
  );
}

export function CaseSignInState() {
  return (
    <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="text-lg font-semibold">Sign in to open this case</h2>
      <p className="mt-2 text-sm text-white/65 leading-relaxed">
        Cases are private workspaces stored under your account.{" "}
        <Link href="/signin" className="text-cyan-300 hover:underline">
          Sign in →
        </Link>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The workspace: loads every section through the case APIs and
// wires the mutations (settings, annotation, upload, process,
// verify, claims, notes, deletes). All state renders from the
// API responses — the persisted record is the source of truth.
// ---------------------------------------------------------------------------

interface DetailData {
  caseRow: WireCase;
  events: WireEvent[];
  leads: WireLead[];
  evidence: WireEvidence[];
  claims: WireClaim[];
  verificationsByClaim: Record<string, WireVerification[]>;
  notes: WireNote[];
  usage: WireUsage | null;
}

type LoadState =
  | { state: "loading" }
  | { state: "signed-out" }
  | { state: "not-found" }
  | { state: "error"; message: string }
  | { state: "ready"; data: DetailData };

async function apiJson<T>(url: string, init?: RequestInit): Promise<{ status: number; body: T | null }> {
  const res = await fetch(url, { headers: { accept: "application/json" }, ...init });
  const body = (await res.json().catch(() => null)) as T | null;
  return { status: res.status, body };
}

export default function CaseDetailClient({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [load, setLoad] = useState<LoadState>({ state: "loading" });
  const [actionError, setActionError] = useState<string | null>(null);
  const [verifyStates, setVerifyStates] = useState<Record<string, string>>({});
  const [noteBody, setNoteBody] = useState("");
  const [noteAnchor, setNoteAnchor] = useState("");
  const [claimStatement, setClaimStatement] = useState("");
  const [claimSubject, setClaimSubject] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [settings, setSettings] = useState({ title: "", summary: "", status: "open", visibility: "private" });

  const refresh = useCallback(async () => {
    try {
      const detail = await apiJson<{ case: WireCase; events: WireEvent[] }>(
        `/api/fraud-radar/cases/${caseId}`,
      );
      if (detail.status === 401) return setLoad({ state: "signed-out" });
      if (detail.status === 404 || !detail.body) return setLoad({ state: "not-found" });
      const [leadsR, evidenceR, claimsR, notesR, usageR] = await Promise.all([
        apiJson<{ leads: WireLead[] }>(`/api/fraud-radar/cases/${caseId}/leads`),
        apiJson<{ evidence: WireEvidence[] }>(`/api/fraud-radar/cases/${caseId}/evidence`),
        apiJson<{ claims: WireClaim[] }>(`/api/fraud-radar/cases/${caseId}/claims`),
        apiJson<{ notes: WireNote[] }>(`/api/fraud-radar/cases/${caseId}/notes`),
        apiJson<WireUsage>(`/api/fraud-radar/cases/usage`),
      ]);
      const claims = claimsR.body?.claims ?? [];
      const verificationsByClaim: Record<string, WireVerification[]> = {};
      await Promise.all(
        claims.map(async (c) => {
          const vr = await apiJson<{ verifications: WireVerification[] }>(
            `/api/fraud-radar/cases/${caseId}/claims/${c.id}/verifications`,
          );
          verificationsByClaim[c.id] = vr.body?.verifications ?? [];
        }),
      );
      const caseRow = detail.body.case;
      setSettings({
        title: caseRow.title,
        summary: caseRow.summary ?? "",
        status: caseRow.status,
        visibility: caseRow.visibility,
      });
      setLoad({
        state: "ready",
        data: {
          caseRow,
          events: detail.body.events,
          leads: leadsR.body?.leads ?? [],
          evidence: evidenceR.body?.evidence ?? [],
          claims,
          verificationsByClaim,
          notes: notesR.body?.notes ?? [],
          usage: usageR.body,
        },
      });
    } catch {
      setLoad({ state: "error", message: "Could not load this case." });
    }
  }, [caseId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refresh();
      void cancelled;
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const act = useCallback(
    async (fn: () => Promise<{ status: number; body: { error?: string } | null }>) => {
      setActionError(null);
      const r = await fn();
      if (r.status >= 400) {
        setActionError(r.body?.error ?? `Action failed (${r.status}).`);
        return false;
      }
      await refresh();
      return true;
    },
    [refresh],
  );

  if (load.state === "loading") return <p className="mt-8 text-sm text-white/50">Loading this case…</p>;
  if (load.state === "signed-out") return <CaseSignInState />;
  if (load.state === "not-found") return <CaseNotFoundState />;
  if (load.state === "error") return <p className="mt-8 text-sm text-red-200/90">{load.message}</p>;

  const d = load.data;
  const c = d.caseRow;

  return (
    <div className="mt-8 space-y-10">
      {actionError && <p className="text-sm text-red-200/90">{actionError}</p>}

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-2xl font-bold">{c.title}</h2>
          <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/70">{c.status}</span>
        </div>
        {c.summary && <p className="mt-2 text-sm text-white/65 leading-relaxed">{c.summary}</p>}
        <p className="mt-2 text-xs text-white/45">
          {c.counts.leads} leads · {c.counts.evidence} evidence · {c.counts.claims} claims ·{" "}
          {c.counts.notes} notes · updated {c.updatedAt.slice(0, 10)}
          {d.usage ? ` · storage used ${formatBytes(d.usage.storageBytesUsed)}` : ""}
        </p>
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-cyan-200">Case settings</summary>
          <div className="mt-3 space-y-2">
            <input
              value={settings.title}
              onChange={(e) => setSettings({ ...settings, title: e.target.value })}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white"
              aria-label="Case title"
            />
            <input
              value={settings.summary}
              onChange={(e) => setSettings({ ...settings, summary: e.target.value })}
              placeholder="Summary (your words)"
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35"
              aria-label="Case summary"
            />
            <div className="flex flex-wrap gap-2">
              <select
                value={settings.status}
                onChange={(e) => setSettings({ ...settings, status: e.target.value })}
                className="rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-white"
                aria-label="Case status"
              >
                <option value="open">open</option>
                <option value="paused">paused</option>
                <option value="closed">closed</option>
              </select>
              <select
                value={settings.visibility}
                onChange={(e) => setSettings({ ...settings, visibility: e.target.value })}
                className="rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-white"
                aria-label="Case visibility"
              >
                <option value="private">private</option>
                <option value="team">team</option>
              </select>
              <button
                type="button"
                className="rounded-lg bg-cyan-400 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
                onClick={() =>
                  void act(() =>
                    apiJson(`/api/fraud-radar/cases/${caseId}`, {
                      method: "PATCH",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({
                        title: settings.title,
                        summary: settings.summary || null,
                        status: settings.status,
                        visibility: settings.visibility,
                      }),
                    }),
                  )
                }
              >
                Save settings
              </button>
              <button
                type="button"
                className="rounded-lg border border-red-300/30 px-3 py-1.5 text-sm text-red-200/90 hover:bg-red-300/10"
                onClick={() => {
                  if (
                    window.confirm(
                      `This permanently deletes the case, its leads' annotations, notes, claims, and ${c.counts.evidence} evidence file(s). This cannot be undone.`,
                    )
                  ) {
                    void (async () => {
                      const ok = await act(() =>
                        apiJson(`/api/fraud-radar/cases/${caseId}`, { method: "DELETE" }),
                      );
                      if (ok) router.push("/fraud-radar/cases");
                    })();
                  }
                }}
              >
                Delete case
              </button>
            </div>
            <p className="text-xs text-white/45 leading-relaxed">
              Team sharing activates with Teams: in this version a
              team-visible case is still visible only to you. Closing a
              case never deletes it; deletion is the separate action
              above and is permanent.
            </p>
          </div>
        </details>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Leads — pinned snapshots</h2>
        <p className="mt-1 text-sm text-white/55 leading-relaxed">
          Each lead renders from the snapshot captured at pin time, with
          its provenance. Pin new leads from the provider, recipient and
          signals pages.
        </p>
        <div className="mt-4 space-y-3">
          {d.leads.length === 0 ? (
            <p className="text-sm text-white/50">No leads pinned yet.</p>
          ) : (
            d.leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onSaveAnnotation={(leadId, annotation) =>
                  void act(() =>
                    apiJson(`/api/fraud-radar/cases/${caseId}/leads/${leadId}`, {
                      method: "PATCH",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ annotation }),
                    }),
                  )
                }
                onRemove={(leadId) =>
                  void act(() =>
                    apiJson(`/api/fraud-radar/cases/${caseId}/leads/${leadId}`, {
                      method: "DELETE",
                    }),
                  )
                }
              />
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Evidence — your vault</h2>
        <p className="mt-3 max-w-3xl rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100/90 leading-relaxed">
          {EVIDENCE_UPLOAD_WARNING}
        </p>
        <p className="mt-2 text-sm text-white/55 leading-relaxed">
          Files are stored privately and type-checked, hashed at upload
          (SHA-256), and downloaded only through this case. Evidence is
          never part of the public corpus. Files up to 25 MB: PDF, DOCX,
          XLSX, CSV, plain text, JSON, PNG, JPEG or WebP. Evidence stays
          until you delete it.
        </p>
        {d.usage && !d.usage.vaultEnabled && (
          <p className="mt-2 text-sm text-white/60 leading-relaxed">
            File uploads are not enabled on your current plan; captured
            records and the rest of this case still work.
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="file"
            onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            className="text-sm text-white/70"
            aria-label="Evidence file"
          />
          <input
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            placeholder="Title (optional)"
            className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-sm text-white placeholder:text-white/35"
          />
          <button
            type="button"
            disabled={!uploadFile}
            className="rounded-lg bg-cyan-400 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
            onClick={() => {
              if (!uploadFile) return;
              void (async () => {
                setActionError(null);
                const form = new FormData();
                form.append("file", uploadFile);
                if (uploadTitle.trim()) form.append("title", uploadTitle.trim());
                const res = await fetch(`/api/fraud-radar/cases/${caseId}/evidence`, {
                  method: "POST",
                  body: form,
                });
                if (!res.ok) {
                  const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
                  setActionError(
                    body.code === "STORAGE_UNAVAILABLE" || body.error === "storage_unavailable"
                      ? "Evidence uploads aren't configured on this deployment yet."
                      : (body.error ?? `Upload failed (${res.status}).`),
                  );
                  return;
                }
                setUploadFile(null);
                setUploadTitle("");
                await refresh();
              })();
            }}
          >
            Upload evidence
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {d.evidence.length === 0 ? (
            <p className="text-sm text-white/50">No evidence in this case yet.</p>
          ) : (
            d.evidence.map((item) => (
              <EvidenceRow
                key={item.id}
                item={item}
                caseId={caseId}
                verifyState={verifyStates[item.id] ?? null}
                onVerify={(evidenceId) =>
                  void (async () => {
                    const r = await apiJson<{ ok: boolean }>(
                      `/api/fraud-radar/cases/${caseId}/evidence/${evidenceId}/verify`,
                    );
                    setVerifyStates((s) => ({
                      ...s,
                      [evidenceId]:
                        r.body?.ok === true
                          ? "Integrity verified — the stored file's SHA-256 matches the hash recorded at upload."
                          : r.body?.ok === false
                            ? "Integrity failure — the stored file's hash does not match the hash recorded at upload."
                            : "Integrity could not be checked for this item.",
                    }));
                  })()
                }
                onProcess={(evidenceId) =>
                  void act(() =>
                    apiJson(`/api/fraud-radar/cases/${caseId}/evidence/${evidenceId}/process`, {
                      method: "POST",
                    }),
                  )
                }
                onRemove={(evidenceId) =>
                  void act(() =>
                    apiJson(`/api/fraud-radar/cases/${caseId}/evidence/${evidenceId}`, {
                      method: "DELETE",
                    }),
                  )
                }
              />
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Claims — checked against the published corpus</h2>
        <p className="mt-1 max-w-3xl text-sm text-white/55 leading-relaxed">
          Write a statement in your own words and run it against the
          published corpus. A verdict describes how the
          statement&apos;s checkable figures stand against the corpus — it is never a
          determination about any person or organization.
        </p>
        <div className="mt-3 space-y-2">
          <textarea
            value={claimStatement}
            onChange={(e) => setClaimStatement(e.target.value)}
            placeholder="Your statement, exactly as you want it checked"
            rows={3}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35"
          />
          <div className="flex gap-2">
            <input
              value={claimSubject}
              onChange={(e) => setClaimSubject(e.target.value)}
              placeholder="Subject (optional — e.g. UEI:… or NPI:…)"
              className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-sm text-white placeholder:text-white/35"
            />
            <button
              type="button"
              disabled={!claimStatement.trim()}
              className="rounded-lg bg-cyan-400 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
              onClick={() => {
                const subject = claimSubject.trim();
                const sep = subject.indexOf(":");
                const body: Record<string, unknown> = { statement: claimStatement.trim() };
                if (subject) {
                  if (sep > 0) {
                    const keyType = subject.slice(0, sep).toUpperCase();
                    body.subjectEngine =
                      keyType === "UEI" ? "grants" : keyType === "EIN" ? "cross" : "healthcare";
                    body.subjectEntityKey = subject;
                  } else {
                    body.subjectEntityKey = subject;
                  }
                }
                void (async () => {
                  const ok = await act(() =>
                    apiJson(`/api/fraud-radar/cases/${caseId}/claims`, {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify(body),
                    }),
                  );
                  if (ok) {
                    setClaimStatement("");
                    setClaimSubject("");
                  }
                })();
              }}
            >
              Add claim
            </button>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {d.claims.length === 0 ? (
            <p className="text-sm text-white/50">No claims in this case yet.</p>
          ) : (
            d.claims.map((claim) => (
              <ClaimView
                key={claim.id}
                claim={claim}
                verifications={d.verificationsByClaim[claim.id] ?? []}
                onVerify={(claimId) =>
                  void act(() =>
                    apiJson(`/api/fraud-radar/cases/${caseId}/claims/${claimId}/verify`, {
                      method: "POST",
                    }),
                  )
                }
                onRemove={(claimId) =>
                  void act(() =>
                    apiJson(`/api/fraud-radar/cases/${caseId}/claims/${claimId}`, {
                      method: "DELETE",
                    }),
                  )
                }
              />
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Notes</h2>
        <div className="mt-3 flex gap-2">
          <textarea
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            placeholder="A note — your words"
            rows={2}
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35"
          />
          <div className="flex flex-col gap-2">
            <select
              value={noteAnchor}
              onChange={(e) => setNoteAnchor(e.target.value)}
              className="rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-white"
              aria-label="Note anchor"
            >
              <option value="">On this case</option>
              {d.leads.map((l) => (
                <option key={`lead:${l.id}`} value={`lead:${l.id}`}>
                  Lead: {l.entityLabel}
                </option>
              ))}
              {d.evidence.map((ev) => (
                <option key={`evidence:${ev.id}`} value={`evidence:${ev.id}`}>
                  Evidence: {ev.title}
                </option>
              ))}
              {d.claims.map((cl) => (
                <option key={`claim:${cl.id}`} value={`claim:${cl.id}`}>
                  Claim: {cl.statement.slice(0, 40)}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!noteBody.trim()}
              className="rounded-lg bg-cyan-400 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
              onClick={() => {
                const body: Record<string, unknown> = { body: noteBody.trim() };
                if (noteAnchor) {
                  const [kind, id] = noteAnchor.split(/:(.+)/).filter(Boolean);
                  if (kind === "lead") body.leadId = id;
                  if (kind === "evidence") body.evidenceId = id;
                  if (kind === "claim") body.claimId = id;
                }
                void (async () => {
                  const ok = await act(() =>
                    apiJson(`/api/fraud-radar/cases/${caseId}/notes`, {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify(body),
                    }),
                  );
                  if (ok) {
                    setNoteBody("");
                    setNoteAnchor("");
                  }
                })();
              }}
            >
              Add note
            </button>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {d.notes.length === 0 ? (
            <p className="text-sm text-white/50">No notes yet.</p>
          ) : (
            d.notes.map((note) => (
              <NoteView
                key={note.id}
                note={note}
                onRemove={(noteId) =>
                  void act(() =>
                    apiJson(`/api/fraud-radar/cases/${caseId}/notes/${noteId}`, {
                      method: "DELETE",
                    }),
                  )
                }
              />
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Activity</h2>
        <div className="mt-3">
          <ActivityView events={d.events} />
        </div>
      </section>
    </div>
  );
}
