"use client";

/**
 * Fraud Radar Phase 9 — report home surface (Payload P9-C,
 * PHASE9 §5.1). Renders ONLY through the shipped reports API:
 * the report, its version summaries, and — per selected
 * version — the full version detail with exports and
 * generation jobs. Downloads go through the gated download
 * route (never a storage URL); the preview opens the gated
 * preview route in a sandboxed iframe and is labelled as
 * what it is: the post-generation rendering of a frozen
 * version, not a live view of current data.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

interface WireReport {
  id: string;
  caseId: string | null;
  templateId: string;
  title: string;
  status: string;
  versionCount: number;
  createdAt: string;
  updatedAt: string;
}

interface WireVersionSummary {
  id: string;
  versionNo: number;
  templateVersion: string;
  generatorVersion: string;
  contentSha256: string | null;
  validationVerdict: string | null;
  createdAt: string;
}

interface WireExport {
  id: string;
  format: string;
  sizeBytes: string;
  sha256: string;
  contentSha256: string;
  createdAt: string;
}

interface WireJob {
  id: string;
  formats: unknown;
  status: string;
  attempts: number;
  error: string | null;
  createdAt: string;
}

interface WireVersionDetail {
  version: WireVersionSummary & {
    pinDiff: { summary?: string[] } | unknown;
    manifest: { exports?: { format: string }[] } | null;
  };
  exports: WireExport[];
  jobs: WireJob[];
}

const FORMAT_OPTIONS = ["json", "csv", "zip", "docx", "pdf"] as const;

export default function ReportDetailClient({
  reportId,
}: {
  reportId: string;
}) {
  const [report, setReport] = useState<WireReport | null>(null);
  const [versions, setVersions] = useState<WireVersionSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<WireVersionDetail | null>(null);
  const [formats, setFormats] = useState<string[]>(["json", "csv", "zip"]);
  const [message, setMessage] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [notMine, setNotMine] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadDetail = useCallback(
    async (versionId: string) => {
      const res = await fetch(
        `/api/fraud-radar/reports/${reportId}/versions/${versionId}`,
      );
      if (!res.ok) return;
      setDetail((await res.json()) as WireVersionDetail);
    },
    [reportId],
  );

  const load = useCallback(async () => {
    const res = await fetch(`/api/fraud-radar/reports/${reportId}`);
    if (res.status === 401) {
      setSignedOut(true);
      return;
    }
    if (res.status === 404) {
      setNotMine(true);
      return;
    }
    if (!res.ok) return;
    const json = (await res.json()) as {
      report: WireReport;
      versions: WireVersionSummary[];
    };
    setReport(json.report);
    setVersions(json.versions);
    const latest = json.versions[json.versions.length - 1];
    if (latest) {
      setSelected(latest.id);
      await loadDetail(latest.id);
    }
  }, [reportId, loadDetail]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      void cancelled;
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  // Poll the selected version while a job is queued or
  // processing — generation usually takes a few minutes.
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    const inFlight = detail?.jobs.some(
      (j) => j.status === "queued" || j.status === "processing",
    );
    if (inFlight && selected) {
      pollRef.current = setInterval(() => void loadDetail(selected), 5000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [detail, selected, loadDetail]);

  async function generate() {
    if (!selected) return;
    setMessage(null);
    const res = await fetch(
      `/api/fraud-radar/reports/${reportId}/versions/${selected}/generate`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ formats }),
      },
    );
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (res.status === 202) {
      setMessage(
        "Generation queued. The worker validates the document before any file is written; this usually takes a few minutes.",
      );
      await loadDetail(selected);
    } else {
      setMessage(json.error ?? "Generation could not be queued.");
    }
  }

  if (signedOut) {
    return <p className="mt-8 text-white/70">Please sign in to see this report.</p>;
  }
  if (notMine) {
    return (
      <p className="mt-8 text-white/70">
        This report does not exist, or it is not yours.
      </p>
    );
  }
  if (!report) {
    return <p className="mt-8 text-white/55">Loading…</p>;
  }

  const generated =
    detail !== null &&
    detail.version.contentSha256 !== null &&
    (detail.version.validationVerdict ?? "").startsWith("pass");

  return (
    <div className="mt-8">
      <p className="text-xs font-semibold tracking-[0.2em] text-cyan-300 uppercase">
        Template {report.templateId} · {report.status}
      </p>
      <h1 className="mt-3 text-3xl font-bold leading-tight">{report.title}</h1>
      <div className="mt-4 flex gap-4 text-sm">
        <Link
          href={`/fraud-radar/reports/${report.id}/build`}
          className="text-cyan-300 hover:underline"
        >
          New version from current data →
        </Link>
      </div>

      {message ? (
        <p className="mt-5 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white/85">
          {message}
        </p>
      ) : null}

      <h2 className="mt-10 text-xl font-semibold">Versions</h2>
      {versions.length === 0 ? (
        <p className="mt-3 text-white/55">
          No versions yet. Open the builder to pin this report&apos;s inputs
          and create version 1.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {versions.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => {
                  setSelected(v.id);
                  void loadDetail(v.id);
                }}
                className={`w-full rounded-xl border px-4 py-3 text-left text-sm ${
                  selected === v.id
                    ? "border-cyan-300/60 bg-cyan-300/10"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                Version {v.versionNo} · template {v.templateVersion} ·
                generator {v.generatorVersion} ·{" "}
                {v.validationVerdict
                  ? `validation: ${v.validationVerdict}`
                  : "not generated yet"}{" "}
                · {v.createdAt.slice(0, 10)}
                {v.contentSha256
                  ? ` · content ${v.contentSha256.slice(0, 12)}…`
                  : ""}
              </button>
            </li>
          ))}
        </ul>
      )}

      {detail ? (
        <div className="mt-8 space-y-8">
          <section>
            <h3 className="font-semibold">Generate exports</h3>
            <p className="mt-2 max-w-3xl text-sm text-white/60 leading-relaxed">
              Generation runs on the worker, not in this page: the document
              is validated — every number traced to a pinned input, the
              honesty furniture checked verbatim — before any file is
              written. A failed validation produces no exports at all.
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              {FORMAT_OPTIONS.map((f) => (
                <label key={f} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formats.includes(f)}
                    onChange={(e) =>
                      setFormats((prev) =>
                        e.target.checked
                          ? [...prev, f]
                          : prev.filter((x) => x !== f),
                      )
                    }
                  />
                  {f.toUpperCase()}
                </label>
              ))}
            </div>
            <p className="mt-2 max-w-3xl text-xs text-white/45 leading-relaxed">
              PDF is not available on this deployment yet: requesting it
              records the request, and the finished version&apos;s manifest
              will show it as unavailable — no PDF file will be produced or
              promised.
            </p>
            <button
              type="button"
              onClick={() => void generate()}
              className="mt-3 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950"
            >
              Generate this version
            </button>
            {detail.jobs.length > 0 ? (
              <ul className="mt-4 space-y-1 text-sm text-white/65">
                {detail.jobs.map((j) => (
                  <li key={j.id}>
                    Job {j.createdAt.slice(0, 16).replace("T", " ")} ·{" "}
                    {j.status}
                    {j.error ? ` · ${j.error}` : ""}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section>
            <h3 className="font-semibold">Exports</h3>
            {detail.exports.length === 0 ? (
              <p className="mt-2 text-sm text-white/55">
                No exports yet for this version.
              </p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {detail.exports.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3"
                  >
                    <span>
                      {e.format.toUpperCase()} ·{" "}
                      {Number(e.sizeBytes).toLocaleString()} bytes · sha256{" "}
                      {e.sha256.slice(0, 12)}…
                    </span>
                    <a
                      href={`/api/fraud-radar/reports/${reportId}/versions/${detail.version.id}/exports/${e.id}/download`}
                      className="text-cyan-300 hover:underline"
                    >
                      Download v{detail.version.versionNo}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {generated ? (
            <section>
              <h3 className="font-semibold">Preview</h3>
              <p className="mt-2 text-sm text-white/55">
                The generated rendering of this frozen version — the same
                document the exports were made from.
              </p>
              <iframe
                title={`Report version ${detail.version.versionNo} preview`}
                src={`/api/fraud-radar/reports/${reportId}/versions/${detail.version.id}/preview`}
                sandbox=""
                className="mt-3 h-[480px] w-full rounded-xl border border-white/10 bg-white"
              />
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
