/**
 * Admin read model for the Fraud Radar Data Source Registry (spec §5
 * + §32 health view). Fail-soft by design: before the registry
 * migration is applied (or if the DB is unreachable) the admin view
 * renders an honest empty state instead of crashing — the registry
 * being absent is a fact an operator needs to see, not a 500.
 */
import { db } from "@/lib/db";

export interface RegistrySourceRow {
  slug: string;
  name: string;
  engine: string;
  status: string;
  accessType: string;
  cadence: string;
  sourceVersion: string | null;
  lastPublishedAt: Date | null;
  lastImportedAt: Date | null;
  lastVerifiedAt: Date | null;
  completeness: string | null;
  lastError: string | null;
}

export interface RegistryRunRow {
  id: string;
  sourceSlug: string;
  status: string;
  datasetVersion: string | null;
  startedAt: Date;
  finishedAt: Date | null;
  rowsProcessed: string | null; // BigInt rendered as string
  artifactSha256: string | null;
  error: string | null;
}

export interface RegistryHealth {
  /** false when the registry tables could not be read at all. */
  available: boolean;
  sources: RegistrySourceRow[];
  recentRuns: RegistryRunRow[];
}

export async function getRegistryHealth(): Promise<RegistryHealth> {
  try {
    const [sources, runs] = await Promise.all([
      db.frDataSource.findMany({ orderBy: [{ engine: "asc" }, { name: "asc" }] }),
      db.frImportRun.findMany({
        orderBy: { startedAt: "desc" },
        take: 20,
        include: { source: { select: { slug: true } } },
      }),
    ]);
    return {
      available: true,
      sources: sources.map((s) => ({
        slug: s.slug,
        name: s.name,
        engine: s.engine,
        status: s.status,
        accessType: s.accessType,
        cadence: s.cadence,
        sourceVersion: s.sourceVersion,
        lastPublishedAt: s.lastPublishedAt,
        lastImportedAt: s.lastImportedAt,
        lastVerifiedAt: s.lastVerifiedAt,
        completeness: s.completeness,
        lastError: s.lastError,
      })),
      recentRuns: runs.map((r) => ({
        id: r.id,
        sourceSlug: r.source.slug,
        status: r.status,
        datasetVersion: r.datasetVersion,
        startedAt: r.startedAt,
        finishedAt: r.finishedAt,
        rowsProcessed: r.rowsProcessed?.toString() ?? null,
        artifactSha256: r.artifactSha256,
        error: r.error,
      })),
    };
  } catch {
    return { available: false, sources: [], recentRuns: [] };
  }
}
