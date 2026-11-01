"use client";

/**
 * Fraud Radar Phase 8 — case list surface (Payload P8-D,
 * PHASE8 §5.1). Renders ONLY through the shipped cases API:
 * the caller's own cases (title, status, updated, derived
 * counts) plus the usage posture (open cases vs limit,
 * storage used vs quota) from GET /api/fraud-radar/cases/usage
 * — every figure server-derived, never client-counted.
 *
 * Owner-only by construction: the API answers 401 signed-out
 * (rendered here as the sign-in state, the P7-C pattern) and
 * lists only the caller's cases; another user's cases are
 * simply absent, and no copy anywhere on this surface speaks
 * about any case but the caller's.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface WireCase {
  id: string;
  title: string;
  summary: string | null;
  status: string;
  visibility: string;
  teamRef: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  counts: { leads: number; evidence: number; notes: number; claims: number };
}

export interface WireUsage {
  tier: string;
  openCases: number;
  maxOpenCases: number | null;
  vaultEnabled: boolean;
  storageBytesUsed: string;
  maxVaultBytes: string | null;
  verificationsThisMonth: number;
  verificationsPerMonth: number | null;
  resetAt: string;
}

export function formatBytes(bytes: string | number): string {
  const n = typeof bytes === "string" ? Number(bytes) : bytes;
  if (!Number.isFinite(n)) return "—";
  if (n < 1000) return `${n} B`;
  if (n < 1_000_000) return `${(n / 1_000).toFixed(1)} KB`;
  if (n < 1_000_000_000) return `${(n / 1_000_000).toFixed(1)} MB`;
  return `${(n / 1_000_000_000).toFixed(2)} GB`;
}

export function UsageSummary({ usage }: { usage: WireUsage }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm">
      <h2 className="font-semibold">Your plan posture</h2>
      <dl className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-3">
        <div>
          <dt className="text-white/45">Open cases</dt>
          <dd className="mt-0.5 text-white/90">
            {usage.openCases}
            {usage.maxOpenCases !== null ? ` of ${usage.maxOpenCases}` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-white/45">Evidence storage used</dt>
          <dd className="mt-0.5 text-white/90">
            {formatBytes(usage.storageBytesUsed)}
            {usage.maxVaultBytes !== null
              ? ` of ${formatBytes(usage.maxVaultBytes)}`
              : ""}
            {!usage.vaultEnabled ? " — file uploads are not enabled on your plan; cases still hold leads, notes, claims and captured records." : ""}
          </dd>
        </div>
        <div>
          <dt className="text-white/45">Claim verifications this month</dt>
          <dd className="mt-0.5 text-white/90">
            {usage.verificationsThisMonth}
            {usage.verificationsPerMonth !== null
              ? ` of ${usage.verificationsPerMonth}`
              : ""}{" "}
            · resets {usage.resetAt.slice(0, 10)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function CaseCard({ c }: { c: WireCase }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold">
          <Link href={`/fraud-radar/cases/${c.id}`} className="hover:underline">
            {c.title}
          </Link>
        </h3>
        <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/70">
          {c.status}
        </span>
      </div>
      {c.summary && (
        <p className="mt-2 text-sm text-white/65 leading-relaxed">{c.summary}</p>
      )}
      <p className="mt-3 text-xs text-white/45">
        {c.counts.leads} leads · {c.counts.evidence} evidence ·{" "}
        {c.counts.claims} claims · {c.counts.notes} notes · updated{" "}
        {c.updatedAt.slice(0, 10)}
      </p>
    </article>
  );
}

export function CasesEmptyState() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="text-lg font-semibold">No cases yet</h2>
      <p className="mt-2 max-w-3xl text-sm text-white/65 leading-relaxed">
        A case is your private workspace for one research matter. Pin
        research leads from the provider, recipient and signals pages —
        each pin freezes the record with its method and data vintages
        exactly as published — add your own evidence files and notes,
        and check statements against the published corpus. A case is
        visible only to you, and its status describes your work, never a
        determination about its subjects.
      </p>
    </div>
  );
}

export function CasesSignInState() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="text-lg font-semibold">Sign in to use cases</h2>
      <p className="mt-2 text-sm text-white/65 leading-relaxed">
        Cases are private workspaces stored under your account.{" "}
        <Link href="/signin" className="text-cyan-300 hover:underline">
          Sign in →
        </Link>
      </p>
    </div>
  );
}

type LoadState =
  | { state: "loading" }
  | { state: "signed-out" }
  | { state: "error"; message: string }
  | { state: "ready"; cases: WireCase[]; usage: WireUsage | null };

export default function CasesClient() {
  const router = useRouter();
  const [load, setLoad] = useState<LoadState>({ state: "loading" });
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [casesRes, usageRes] = await Promise.all([
        fetch("/api/fraud-radar/cases", { headers: { accept: "application/json" } }),
        fetch("/api/fraud-radar/cases/usage", {
          headers: { accept: "application/json" },
        }),
      ]);
      if (casesRes.status === 401) {
        setLoad({ state: "signed-out" });
        return;
      }
      if (!casesRes.ok) {
        setLoad({ state: "error", message: `Could not load your cases (${casesRes.status}).` });
        return;
      }
      const casesData = (await casesRes.json()) as { cases: WireCase[] };
      const usage = usageRes.ok ? ((await usageRes.json()) as WireUsage) : null;
      setLoad({ state: "ready", cases: casesData.cases, usage });
    } catch {
      setLoad({ state: "error", message: "Could not load your cases." });
    }
  }, []);

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

  const createCase = useCallback(async () => {
    if (!title.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/fraud-radar/cases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          summary: summary.trim() ? summary.trim() : undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        case?: WireCase;
        error?: string;
      };
      if (!res.ok || !data.case) {
        setCreateError(data.error ?? `Could not create the case (${res.status}).`);
        return;
      }
      router.push(`/fraud-radar/cases/${data.case.id}`);
    } catch {
      setCreateError("Could not create the case.");
    } finally {
      setCreating(false);
    }
  }, [title, summary, router]);

  if (load.state === "loading") {
    return <p className="mt-8 text-sm text-white/50">Loading your cases…</p>;
  }
  if (load.state === "signed-out") {
    return (
      <div className="mt-8">
        <CasesSignInState />
      </div>
    );
  }
  if (load.state === "error") {
    return <p className="mt-8 text-sm text-red-200/90">{load.message}</p>;
  }

  return (
    <div className="mt-8 space-y-6">
      {load.usage && <UsageSummary usage={load.usage} />}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="font-semibold">New case</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Case title — in your own words"
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35"
          />
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Summary (optional)"
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35"
          />
          <button
            type="button"
            disabled={creating || !title.trim()}
            onClick={() => void createCase()}
            className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
          >
            Create case
          </button>
        </div>
        {createError && <p className="mt-2 text-sm text-red-200/90">{createError}</p>}
      </section>
      {load.cases.length === 0 ? (
        <CasesEmptyState />
      ) : (
        <div className="space-y-4">
          {load.cases.map((c) => (
            <CaseCard key={c.id} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}
