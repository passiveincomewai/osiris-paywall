import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Dashboard → sync-runner dry-run requests (Stage E).
 *
 * The harvest sync is a generation-time tool that runs outside Vercel
 * (tools/sync-cameras.ts); the admin dashboard cannot run it, and this
 * module does not pretend otherwise. What the dashboard's button does —
 * all it does — is record a timestamped request in a small JSON file.
 * The sync runner reads that file before every run, treats a pending
 * request as satisfied by the run it is about to make, and stamps the
 * satisfaction time back. The run's report and verdict then reach the
 * dashboard through the committed sync artifacts.
 *
 * The file lives under .cache/camera-sync/ (never committed). On a
 * Vercel instance that directory is instance-local and ephemeral, so a
 * request recorded there is visible to that instance's dashboard only;
 * the runner on the catalogue machine keeps its own copy of the file
 * for requests recorded locally. The dashboard copy states this plainly.
 */
export interface SyncRequestFile {
  pending: { requestedAt: string; requestedBy: string } | null;
  lastSatisfiedAt: string | null;
}

export function syncRequestDir(): string {
  return process.env.OSIRIS_CAMERA_SYNC_DIR ?? join(process.cwd(), '.cache', 'camera-sync');
}

const requestPath = () => join(syncRequestDir(), 'requests.json');

export function readSyncRequests(): SyncRequestFile {
  try {
    if (!existsSync(requestPath())) return { pending: null, lastSatisfiedAt: null };
    const parsed = JSON.parse(readFileSync(requestPath(), 'utf8')) as SyncRequestFile;
    return { pending: parsed.pending ?? null, lastSatisfiedAt: parsed.lastSatisfiedAt ?? null };
  } catch {
    return { pending: null, lastSatisfiedAt: null };
  }
}

export function recordSyncRequest(requestedBy: string): SyncRequestFile {
  const current = readSyncRequests();
  const next: SyncRequestFile = {
    pending: current.pending ?? { requestedAt: new Date().toISOString(), requestedBy },
    lastSatisfiedAt: current.lastSatisfiedAt,
  };
  mkdirSync(syncRequestDir(), { recursive: true });
  writeFileSync(requestPath(), JSON.stringify(next, null, 2) + '\n');
  return next;
}
