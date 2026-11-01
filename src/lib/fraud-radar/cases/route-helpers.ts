/**
 * Fraud Radar Phase 8 — shared API-route helpers: session
 * resolution + wire serialisation. Route order of checks is
 * fixed by PHASE8 §5.1 and implemented in each route: flag
 * (404) → session (401) → case access (404) → entitlement /
 * quota (429) → work.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { SessionLike } from "./entitlements";
import { getCaseStore, type CaseRecord, type LeadRecord, type NoteRecord } from "./store";
import { loadAccessibleCase, type CaseAccess } from "./access";

export interface CaseSession {
  userId: string;
  email: string | null;
  session: SessionLike;
}

/** The signed-in user, or null (routes answer 401). */
export async function caseSession(): Promise<CaseSession | null> {
  const session = (await auth().catch(() => null)) as SessionLike | null;
  const userId = session?.user?.id ?? null;
  if (!userId) return null;
  return { userId, email: session?.user?.email ?? null, session: session as SessionLike };
}

/** Platform admin (ADMIN_EMAILS) — used only by the admin
 *  candidate pin path; admins see no case content (§1.5). */
export function isPlatformAdmin(
  email: string | null,
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (!email) return false;
  const admins = (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}

export function notFound() {
  return NextResponse.json({ error: "not_found" }, { status: 404 });
}

export function signInRequired() {
  return NextResponse.json(
    { error: "Sign in to use cases.", code: "SIGN_IN_REQUIRED" },
    { status: 401 },
  );
}

/**
 * Load a case through resolveCaseAccess for a route. Null means
 * 404 — foreign and nonexistent cases are indistinguishable.
 * Write routes pass write: true (owner-only in v1).
 */
export async function loadCaseForRoute(
  userId: string,
  caseId: string,
  opts?: { write?: boolean },
): Promise<{ caseRow: CaseRecord; access: CaseAccess } | null> {
  return loadAccessibleCase(getCaseStore(), {
    userId,
    caseId,
    write: opts?.write ?? false,
  });
}

export function serializeCase(c: CaseRecord) {
  return {
    id: c.id,
    title: c.title,
    summary: c.summary,
    status: c.status,
    visibility: c.visibility,
    teamRef: c.teamRef,
    closedAt: c.closedAt ? c.closedAt.toISOString() : null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    counts: c.counts,
  };
}

export function serializeLead(l: LeadRecord) {
  return {
    id: l.id,
    caseId: l.caseId,
    kind: l.kind,
    engine: l.engine,
    entityKey: l.entityKey,
    entityLabel: l.entityLabel,
    // Rendered from the snapshot, never from live data (§1.3 rule 2).
    snapshot: l.snapshot,
    snapshotSha256: l.snapshotSha256,
    sourceDataset: l.sourceDataset,
    sourceDatasetVersion: l.sourceDatasetVersion,
    ruleCode: l.ruleCode,
    pinnedById: l.pinnedById,
    pinnedAt: l.pinnedAt.toISOString(),
    annotation: l.annotation,
  };
}

export function serializeNote(n: NoteRecord) {
  return {
    id: n.id,
    caseId: n.caseId,
    leadId: n.leadId,
    evidenceId: n.evidenceId,
    claimId: n.claimId,
    body: n.body,
    authorId: n.authorId,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  };
}
