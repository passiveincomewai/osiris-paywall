"use client";

/**
 * Fraud Radar Phase 8 — the shared "Pin to case" affordance
 * (Payload P8-D, PHASE8 §5.1 cross-link contract).
 *
 * ONE component, used identically from every surface that can
 * originate a lead: entity profile pages (grants recipient,
 * healthcare provider, care-programs Medicare provider) and
 * the shared ResearchSignalsSection (per research lead and
 * per screening record). It carries IDENTIFIERS ONLY —
 * (engine, entityKey, ruleCode?, kind) — and POSTs them to
 * the pin route; the server captures the snapshot from the
 * published data layers (PHASE8 §1.3 rule 3). This component
 * never receives, holds, or submits record data, so surfaces
 * cannot drift into submitting different "versions" of a
 * record, and a fabricated lead cannot be injected from the
 * client.
 *
 * Visibility contract (§5.1): the affordance exists only for
 * signed-in users while the flag is on. Both facts are
 * established by the cases API itself — the component loads
 * the caller's case list and renders NOTHING until that load
 * succeeds (signed-out visitors, and every visitor while the
 * flag is off, see no pin affordance at all; the API 404s
 * flag-off and 401s signed-out).
 *
 * S-06 discipline (§1.3 rule 4): candidate pairs pin ONLY
 * through the admin path. This component refuses the
 * `candidate` kind outright unless the caller passes an
 * explicit admin context — and no non-admin surface passes
 * one. (S-06 pairs never render in ResearchSignalsSection at
 * all; the data layer filters them from every public read.)
 */

import { useCallback, useEffect, useState } from "react";

export type PinKind = "signal" | "screening" | "candidate" | "entity";

export interface PinIdentifiers {
  engine: string;
  entityKey: string;
  ruleCode?: string | null;
  kind: PinKind;
}

export interface PinCaseOption {
  id: string;
  title: string;
}

/**
 * The request body for the pin route — identifiers only, by
 * construction. A snapshot body is never built here; the
 * route refuses one if it ever arrived (§1.3 rule 3).
 */
export function buildPinBody(ids: PinIdentifiers): Record<string, unknown> {
  const body: Record<string, unknown> = {
    kind: ids.kind,
    engine: ids.engine,
    entityKey: ids.entityKey,
  };
  if (ids.ruleCode) body.ruleCode = ids.ruleCode;
  return body;
}

/** The S-06 gate, in one place: candidate pins need an admin context. */
export function pinKindAllowed(kind: PinKind, adminContext: boolean): boolean {
  if (kind === "candidate") return adminContext;
  return true;
}

type PinStatus =
  | { state: "idle" }
  | { state: "pinning" }
  | { state: "pinned"; caseTitle: string; created: boolean }
  | { state: "error"; message: string };

/**
 * The presentational picker (exported for the surface tests):
 * a "Pin to case" button that opens the caller's case list
 * plus a new-case option, and reports the pin outcome. All
 * fetching lives in the default component below.
 */
export function PinToCasePicker({
  identifiers,
  cases,
  status,
  onPin,
  onCreateAndPin,
}: {
  identifiers: PinIdentifiers;
  cases: PinCaseOption[];
  status: PinStatus;
  onPin: (caseId: string) => void;
  onCreateAndPin: (title: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  if (status.state === "pinned") {
    return (
      <p className="text-xs text-emerald-200/90">
        {status.created
          ? `Pinned to case “${status.caseTitle}”.`
          : `Already pinned in case “${status.caseTitle}”.`}
      </p>
    );
  }
  return (
    <div className="text-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-cyan-300/30 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-300/10"
        aria-expanded={open}
      >
        Pin to case
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-white/10 bg-black/30 p-3">
          <p className="text-xs text-white/55 leading-relaxed">
            The record is captured by the server from the published data,
            with its provenance, exactly as published now. Pinning saves
            that snapshot into your case; later data refreshes do not
            change it.
          </p>
          {cases.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {cases.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    disabled={status.state === "pinning"}
                    onClick={() => onPin(c.id)}
                    className="w-full rounded-lg border border-white/10 px-3 py-1.5 text-left text-xs text-white/85 hover:bg-white/5 disabled:opacity-50"
                  >
                    Pin to “{c.title}”
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-white/55">
              You have no cases yet — create one to pin this record.
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="New case title"
              className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder:text-white/35"
            />
            <button
              type="button"
              disabled={status.state === "pinning" || !newTitle.trim()}
              onClick={() => onCreateAndPin(newTitle.trim())}
              className="rounded-lg bg-cyan-400 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
            >
              Create + pin
            </button>
          </div>
          {status.state === "pinning" && (
            <p className="mt-2 text-xs text-white/50">Pinning…</p>
          )}
          {status.state === "error" && (
            <p className="mt-2 text-xs text-red-200/90">{status.message}</p>
          )}
          {/* identifiers echo for assistive/debug clarity — ids only */}
          <p className="mt-2 font-mono text-[11px] text-white/35">
            {identifiers.engine} · {identifiers.entityKey}
            {identifiers.ruleCode ? ` · ${identifiers.ruleCode}` : ""} ·{" "}
            {identifiers.kind}
          </p>
        </div>
      )}
    </div>
  );
}

export default function PinToCase({
  engine,
  entityKey,
  ruleCode,
  kind,
  adminContext = false,
}: PinIdentifiers & { adminContext?: boolean }) {
  const allowed = pinKindAllowed(kind, adminContext);
  const [cases, setCases] = useState<PinCaseOption[] | null>(null);
  const [status, setStatus] = useState<PinStatus>({ state: "idle" });

  useEffect(() => {
    if (!allowed) return;
    let live = true;
    (async () => {
      try {
        const res = await fetch("/api/fraud-radar/cases", {
          headers: { accept: "application/json" },
        });
        if (!res.ok) return; // 401 signed-out / 404 flag-off: no affordance
        const data = (await res.json()) as {
          cases?: { id: string; title: string }[];
        };
        if (live) {
          setCases((data.cases ?? []).map((c) => ({ id: c.id, title: c.title })));
        }
      } catch {
        /* network failure: no affordance, the profile stands on its own */
      }
    })();
    return () => {
      live = false;
    };
  }, [allowed]);

  const pinTo = useCallback(
    async (caseId: string, caseTitle: string) => {
      setStatus({ state: "pinning" });
      try {
        const res = await fetch(`/api/fraud-radar/cases/${caseId}/leads`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(buildPinBody({ engine, entityKey, ruleCode, kind })),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          created?: boolean;
        };
        if (!res.ok) {
          setStatus({
            state: "error",
            message: data.error ?? `Pin failed (${res.status}).`,
          });
          return;
        }
        setStatus({ state: "pinned", caseTitle, created: data.created !== false });
      } catch {
        setStatus({ state: "error", message: "Pin failed — please try again." });
      }
    },
    [engine, entityKey, ruleCode, kind],
  );

  const createAndPin = useCallback(
    async (title: string) => {
      setStatus({ state: "pinning" });
      try {
        const res = await fetch("/api/fraud-radar/cases", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          case?: { id: string; title: string };
          error?: string;
        };
        if (!res.ok || !data.case) {
          setStatus({
            state: "error",
            message: data.error ?? `Could not create the case (${res.status}).`,
          });
          return;
        }
        await pinTo(data.case.id, data.case.title);
      } catch {
        setStatus({ state: "error", message: "Could not create the case." });
      }
    },
    [pinTo],
  );

  // S-06 gate + signed-in gate: render nothing until the caller's
  // cases have loaded for an allowed kind.
  if (!allowed || cases === null) return null;

  return (
    <PinToCasePicker
      identifiers={{ engine, entityKey, ruleCode, kind }}
      cases={cases}
      status={status}
      onPin={(caseId) => {
        const found = cases.find((c) => c.id === caseId);
        void pinTo(caseId, found?.title ?? "case");
      }}
      onCreateAndPin={(title) => void createAndPin(title)}
    />
  );
}
