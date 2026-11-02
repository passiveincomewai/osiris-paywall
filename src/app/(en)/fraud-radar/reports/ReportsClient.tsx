"use client";

/**
 * Fraud Radar Phase 9 — report list + template gallery
 * (Payload P9-C, PHASE9 §5.1). Renders ONLY through the
 * shipped reports API: the caller's own reports and their
 * usage posture — every figure server-derived, never
 * client-counted. The gallery is rendered from the template
 * registry passed in by the server page; templates the
 * registry marks unavailable are shown as "not yet available
 * in this deployment" — an honest absence, never a stub.
 *
 * Owner-only by construction: the API answers 401 signed-out
 * (rendered here as the sign-in state) and lists only the
 * caller's reports.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface WireReport {
  id: string;
  caseId: string | null;
  templateId: string;
  title: string;
  status: string;
  versionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WireUsage {
  tier: string;
  reportsUsed: number;
  maxReports: number | null;
  generationsThisMonth: number;
  generationsPerMonth: number | null;
  resetAt: string;
}

export interface GalleryTemplate {
  id: string;
  version: string;
  title: string;
  purpose: string;
  audience: string;
  requiredPins: string[];
  optionalPins: string[];
  available: boolean;
}

export default function ReportsClient({
  templates,
}: {
  templates: GalleryTemplate[];
}) {
  const router = useRouter();
  const [reports, setReports] = useState<WireReport[] | null>(null);
  const [usage, setUsage] = useState<WireUsage | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState("B");
  const [title, setTitle] = useState("");
  const [caseId, setCaseId] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const [listRes, usageRes] = await Promise.all([
      fetch("/api/fraud-radar/reports"),
      fetch("/api/fraud-radar/reports/usage"),
    ]);
    if (listRes.status === 401) {
      setSignedOut(true);
      return;
    }
    if (!listRes.ok) {
      setError("Your reports could not be loaded. Please try again.");
      return;
    }
    const list = (await listRes.json()) as { reports: WireReport[] };
    setReports(list.reports);
    if (usageRes.ok) setUsage((await usageRes.json()) as WireUsage);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (cancelled) return;
      // Entry points (§5.1) deep-link the gallery with
      // identifiers only — ?template=A&caseId=… pre-fills the
      // create form; the server still captures everything
      // from those identifiers.
      const params = new URLSearchParams(window.location.search);
      const t = params.get("template");
      if (t) setTemplateId(t);
      const c = params.get("caseId");
      if (c) setCaseId(c);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function createReport() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/fraud-radar/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          templateId,
          title: title.trim(),
          ...(caseId.trim() ? { caseId: caseId.trim() } : {}),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        report?: WireReport;
      };
      if (!res.ok || !json.report) {
        setError(json.error ?? "The report could not be created.");
        return;
      }
      router.push(`/fraud-radar/reports/${json.report.id}/build`);
    } finally {
      setCreating(false);
    }
  }

  if (signedOut) {
    return (
      <p className="mt-8 text-white/70">
        Please sign in to see your reports.
      </p>
    );
  }

  return (
    <div className="mt-10 space-y-10">
      {error ? (
        <p className="rounded-xl border border-red-300/30 bg-red-300/10 px-4 py-3 text-sm text-red-100">
          {error}
        </p>
      ) : null}

      <section>
        <h2 className="text-xl font-semibold">Your reports</h2>
        {usage ? (
          <p className="mt-2 text-sm text-white/55">
            {usage.reportsUsed}
            {usage.maxReports !== null ? ` of ${usage.maxReports}` : ""}{" "}
            reports · {usage.generationsThisMonth}
            {usage.generationsPerMonth !== null
              ? ` of ${usage.generationsPerMonth}`
              : ""}{" "}
            generations this month · resets {usage.resetAt.slice(0, 10)}
          </p>
        ) : null}
        {reports === null ? (
          <p className="mt-4 text-white/55">Loading…</p>
        ) : reports.length === 0 ? (
          <p className="mt-4 text-white/55">
            No reports yet. Pick a template below to start one — a report
            begins as a draft and becomes a citable document only when you
            pin its inputs and generate a version.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-white/10 rounded-2xl border border-white/10">
            {reports.map((r) => (
              <li key={r.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <Link
                    href={`/fraud-radar/reports/${r.id}`}
                    className="font-medium text-cyan-200 hover:underline"
                  >
                    {r.title}
                  </Link>
                  <p className="mt-0.5 text-sm text-white/50">
                    Template {r.templateId} · {r.status} · {r.versionCount}{" "}
                    version{r.versionCount === 1 ? "" : "s"} · updated{" "}
                    {r.updatedAt.slice(0, 10)}
                  </p>
                </div>
                <Link
                  href={`/fraud-radar/reports/${r.id}/build`}
                  className="text-sm text-cyan-300 hover:underline"
                >
                  Build →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold">New report</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={!t.available}
              onClick={() => setTemplateId(t.id)}
              className={`rounded-2xl border p-5 text-left ${
                templateId === t.id
                  ? "border-cyan-300/60 bg-cyan-300/10"
                  : "border-white/10 bg-white/[0.03]"
              } ${t.available ? "" : "opacity-55"}`}
            >
              <p className="font-semibold">
                Template {t.id} — {t.title}
              </p>
              <p className="mt-2 text-sm text-white/65 leading-relaxed">
                {t.purpose}
              </p>
              <p className="mt-2 text-xs text-white/45">
                For: {t.audience} · Needs:{" "}
                {t.requiredPins.length > 0 ? t.requiredPins.join(", ") : "—"}
                {t.available
                  ? ""
                  : " · Not yet available in this deployment"}
              </p>
            </button>
          ))}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Report title (your words)"
            className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm sm:col-span-1"
          />
          <input
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
            placeholder="Home case id (if any)"
            className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm sm:col-span-1"
          />
          <button
            type="button"
            disabled={creating || title.trim().length === 0}
            onClick={() => void createReport()}
            className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create report"}
          </button>
        </div>
      </section>
    </div>
  );
}
