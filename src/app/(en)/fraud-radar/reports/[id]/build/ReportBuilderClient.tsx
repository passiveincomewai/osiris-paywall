"use client";

/**
 * Fraud Radar Phase 9 — the reduced builder surface (Payload
 * P9-C, PHASE9 §4.1 as cut by §7.2): TEMPLATE (locked) → PIN
 * → CREATE VERSION → EXPORT (on the report home).
 *
 * The pin step submits IDENTIFIERS ONLY (§2.1): case, lead,
 * evidence, note and claim ids from the author's own case;
 * entity engine + key pairs the server captures fresh at pin
 * time; verification runs by claim + verification id; dataset
 * slugs. The server captures the pin set — a pin body with
 * snapshot data is refused by the API, and this client never
 * sends one. The draft button runs the same assembly as
 * version creation without storing anything, and returns the
 * pin-diff against the previous version plus the §3.4
 * pre-check over the author's own text (warnings, never
 * edits — §0.1).
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getReportTemplate } from "@/lib/fraud-radar/reports/templates";

interface WireReport {
  id: string;
  caseId: string | null;
  templateId: string;
  title: string;
  status: string;
}

function lines(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const inputCls =
  "w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm";
const labelCls = "block text-sm font-medium text-white/80";

export default function ReportBuilderClient({
  reportId,
}: {
  reportId: string;
}) {
  const router = useRouter();
  const [report, setReport] = useState<WireReport | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [notMine, setNotMine] = useState(false);
  const [caseId, setCaseId] = useState("");
  const [leadIds, setLeadIds] = useState("");
  const [entityPins, setEntityPins] = useState("");
  const [verificationIds, setVerificationIds] = useState("");
  const [evidenceIds, setEvidenceIds] = useState("");
  const [noteIds, setNoteIds] = useState("");
  const [claimIds, setClaimIds] = useState("");
  const [datasetSlugs, setDatasetSlugs] = useState("");
  const [disabledSections, setDisabledSections] = useState<string[]>([]);
  const [userTexts, setUserTexts] = useState<Record<string, string>>({});
  const [draftInfo, setDraftInfo] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    const json = (await res.json()) as { report: WireReport };
    setReport(json.report);
    if (json.report.caseId) setCaseId(json.report.caseId);
  }, [reportId]);

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

  const def = report ? getReportTemplate(report.templateId) : null;

  function buildBody() {
    const pins: Record<string, unknown> = {};
    if (caseId.trim()) pins.caseId = caseId.trim();
    const leads = lines(leadIds);
    if (leads.length) pins.leadIds = leads;
    const entities = lines(entityPins)
      .map((line) => {
        const [engine, ...rest] = line.split(":");
        return engine && rest.length
          ? { engine: engine.trim(), entityKey: rest.join(":").trim() }
          : null;
      })
      .filter(Boolean);
    if (entities.length) pins.entityPins = entities;
    const verifications = lines(verificationIds)
      .map((line) => {
        const [claimId, verificationId] = line.split(":");
        return claimId && verificationId
          ? { claimId: claimId.trim(), verificationId: verificationId.trim() }
          : null;
      })
      .filter(Boolean);
    if (verifications.length) pins.verificationIds = verifications;
    const evidence = lines(evidenceIds);
    if (evidence.length) pins.evidenceIds = evidence;
    const notes = lines(noteIds);
    if (notes.length) pins.noteIds = notes;
    const claims = lines(claimIds);
    if (claims.length) pins.claimIds = claims;
    const datasets = lines(datasetSlugs);
    if (datasets.length) pins.datasetSlugs = datasets;

    const composition = def
      ? {
          sections: def.sections.map((s) => ({
            key: s.key,
            enabled: !disabledSections.includes(s.key),
            ...(userTexts[s.key] ? { userText: userTexts[s.key] } : {}),
          })),
        }
      : undefined;
    return { pins, ...(composition ? { composition } : {}) };
  }

  async function runDraft() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/fraud-radar/reports/${reportId}/draft`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildBody()),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        draftSha256?: string;
        preCheck?: {
          furnitureComplete: boolean;
          userTextWarnings: { sectionKey: string; phrases: string[] }[];
        };
      };
      if (!res.ok) {
        setMessage(json.error ?? "The draft check could not be run.");
        return;
      }
      const warnings = json.preCheck?.userTextWarnings ?? [];
      setDraftInfo(
        `Draft inputs hash ${json.draftSha256?.slice(0, 16)}… · honesty furniture ${
          json.preCheck?.furnitureComplete ? "complete" : "INCOMPLETE"
        }${
          warnings.length
            ? ` · your text in ${warnings
                .map((w) => w.sectionKey)
                .join(", ")} contains gated wording — it will be exported as your words, with the warning recorded`
            : ""
        }`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function createVersion() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/fraud-radar/reports/${reportId}/versions`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(buildBody()),
        },
      );
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        version?: { versionNo: number };
      };
      if (!res.ok || !json.version) {
        setMessage(json.error ?? "The version could not be created.");
        return;
      }
      setMessage(
        `Version ${json.version.versionNo} created and frozen. Opening the report home, where you can queue its generation.`,
      );
      router.push(`/fraud-radar/reports/${reportId}`);
    } finally {
      setBusy(false);
    }
  }

  if (signedOut) {
    return <p className="mt-8 text-white/70">Please sign in to build this report.</p>;
  }
  if (notMine) {
    return (
      <p className="mt-8 text-white/70">
        This report does not exist, or it is not yours.
      </p>
    );
  }
  if (!report || !def) {
    return <p className="mt-8 text-white/55">Loading…</p>;
  }

  return (
    <div className="mt-8">
      <p className="text-xs font-semibold tracking-[0.2em] text-cyan-300 uppercase">
        Builder
      </p>
      <h1 className="mt-3 text-3xl font-bold leading-tight">{report.title}</h1>

      <section className="mt-8">
        <h2 className="font-semibold">1 · Template (locked)</h2>
        <p className="mt-2 text-sm text-white/65 leading-relaxed">
          Template {def.id} — {def.title} (version {def.version}). The
          template is fixed for this report; a different template means a
          new report. Sections render in template order; reordering and
          the live preview step are not part of this deployment&apos;s
          builder — the generated version&apos;s preview appears on the
          report home after generation.
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          {def.sections.map((s) => (
            <li
              key={s.key}
              className="rounded-xl border border-white/10 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-4">
                <span>
                  {s.heading}
                  {s.locked ? (
                    <span className="ml-2 text-xs text-amber-200">
                      locked honesty furniture
                    </span>
                  ) : null}
                </span>
                {!s.locked && !s.required ? (
                  <label className="flex items-center gap-2 text-white/70">
                    <input
                      type="checkbox"
                      checked={!disabledSections.includes(s.key)}
                      onChange={(e) =>
                        setDisabledSections((prev) =>
                          e.target.checked
                            ? prev.filter((k) => k !== s.key)
                            : [...prev, s.key],
                        )
                      }
                    />
                    include
                  </label>
                ) : null}
              </div>
              {s.userText ? (
                <textarea
                  value={userTexts[s.key] ?? ""}
                  onChange={(e) =>
                    setUserTexts((prev) => ({ ...prev, [s.key]: e.target.value }))
                  }
                  rows={3}
                  placeholder="Your words — rendered attributed to you, exactly as written"
                  className={`${inputCls} mt-3`}
                />
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-semibold">2 · Pin the inputs</h2>
        <p className="mt-2 max-w-3xl text-sm text-white/65 leading-relaxed">
          A version is generated from exactly what you pin here — the
          server captures each input and records its hash, and later
          edits to the case or refreshes of the data never reach an
          existing version. Leave a field empty to use the template&apos;s
          defaults for the pinned case (all of its leads and claims).
          Evidence is pinned as an index of (id, hash) pairs; files
          themselves travel only in a ZIP bundle, and only where the
          template allows it and you opt in per version.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Case id</label>
            <input value={caseId} onChange={(e) => setCaseId(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Lead ids (comma or line separated)</label>
            <input value={leadIds} onChange={(e) => setLeadIds(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Entities to capture (engine:key per line)</label>
            <textarea value={entityPins} onChange={(e) => setEntityPins(e.target.value)} rows={2} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Verifications (claimId:verificationId per line)</label>
            <textarea value={verificationIds} onChange={(e) => setVerificationIds(e.target.value)} rows={2} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Evidence ids</label>
            <input value={evidenceIds} onChange={(e) => setEvidenceIds(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Note ids</label>
            <input value={noteIds} onChange={(e) => setNoteIds(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Claim ids</label>
            <input value={claimIds} onChange={(e) => setClaimIds(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Dataset slugs</label>
            <input value={datasetSlugs} onChange={(e) => setDatasetSlugs(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void runDraft()}
            className="rounded-lg border border-cyan-300/50 px-4 py-2 text-sm font-semibold text-cyan-200 disabled:opacity-50"
          >
            Check draft (pins + pre-check)
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void createVersion()}
            className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
          >
            Create frozen version
          </button>
        </div>
        {draftInfo ? (
          <p className="mt-4 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white/85">
            {draftInfo}
          </p>
        ) : null}
        {message ? (
          <p className="mt-4 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white/85">
            {message}
          </p>
        ) : null}
      </section>

      <section className="mt-10">
        <h2 className="font-semibold">3 · Export</h2>
        <p className="mt-2 max-w-3xl text-sm text-white/65 leading-relaxed">
          Export happens per version on the report home: choose formats
          there and queue generation. Generation usually takes a few
          minutes; downloads are named by version and never move.
        </p>
      </section>
    </div>
  );
}
