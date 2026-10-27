/**
 * Photo Geolocation (Beta) — cost and abuse controls.
 *
 * Three controls, in the order the route applies them:
 *  1. A kill switch. GEOLOCATION_BETA_ENABLED=0 takes the tool down
 *     instantly, no deploy, and the page says so in plain words.
 *  2. A per-IP daily quota (3 analyses/day by default) — the tool is
 *     free and anonymous, so the IP is the only identity it has. The
 *     socket peer the edge observed (lib/ssrf-guard's getClientIp) is
 *     used, never the client-written end of X-Forwarded-For.
 *  3. A global daily vision-call budget. The vision pass is the only
 *     step that spends money; when the day's budget is gone the tool
 *     degrades to EXIF-only mode instead of failing or overspending
 *     (the Geo-Sleuth audit's circuit breaker, REPORT §6).
 *
 * HONEST LIMITS: both counters live in this process's memory. Vercel
 * runs several instances and recycles them, so the real ceiling is
 * (cap × live instances) and quotas reset when an instance dies. That
 * is acceptable for a beta whose expensive step is also gated by the
 * budget's order of magnitude — but it is not a billing-grade ledger,
 * and this file will not pretend otherwise. A durable store (the
 * Neon-backed counters other features use) is the upgrade path if the
 * beta graduates.
 */

const DAY_MS = 24 * 3_600_000;

export const DEFAULT_PER_IP_DAILY = 3;
export const DEFAULT_VISION_DAILY_CAP = 200;

const off = (v: string | undefined) => v === '0' || v === 'false' || v === 'off';

export function geolocationEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return !off(env.GEOLOCATION_BETA_ENABLED);
}

export function visionConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return !off(env.GEOLOCATION_VISION_ENABLED);
}

function envInt(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const n = Number(env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function perIpDailyLimit(env: NodeJS.ProcessEnv = process.env): number {
  return envInt(env, 'GEOLOCATION_PER_IP_DAILY', DEFAULT_PER_IP_DAILY);
}

export function visionDailyCap(env: NodeJS.ProcessEnv = process.env): number {
  return envInt(env, 'GEOLOCATION_VISION_DAILY_CAP', DEFAULT_VISION_DAILY_CAP);
}

/* ── Per-IP daily quota ──────────────────────────────────────────── */

interface Bucket { count: number; resetAt: number }
const ipBuckets = new Map<string, Bucket>();

export interface QuotaResult {
  allowed: boolean;
  /** Analyses left today after this call (0 when blocked). */
  remaining: number;
  limit: number;
}

/**
 * Consume one analysis slot for an IP. Called after the upload has
 * passed validation, before any work is spent on it.
 */
export function consumeIpQuota(ip: string, env: NodeJS.ProcessEnv = process.env): QuotaResult {
  const limit = perIpDailyLimit(env);
  const now = Date.now();
  const key = `geo-photo:${ip}`;
  const bucket = ipBuckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    ipBuckets.set(key, { count: 1, resetAt: now + DAY_MS });
    return { allowed: true, remaining: limit - 1, limit };
  }
  bucket.count += 1;
  if (ipBuckets.size > 5000 && Math.random() < 0.01) {
    for (const [k, v] of ipBuckets) if (v.resetAt <= now) ipBuckets.delete(k);
  }
  const allowed = bucket.count <= limit;
  return { allowed, remaining: Math.max(0, limit - bucket.count), limit };
}

/* ── Global daily vision budget ──────────────────────────────────── */

let visionDay = '';
let visionCount = 0;

function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Consume one vision call from today's global budget. */
export function consumeVisionBudget(env: NodeJS.ProcessEnv = process.env): boolean {
  const cap = visionDailyCap(env);
  const today = utcDay();
  if (today !== visionDay) {
    visionDay = today;
    visionCount = 0;
  }
  if (visionCount >= cap) return false;
  visionCount += 1;
  return true;
}

export function visionBudgetUsed(env: NodeJS.ProcessEnv = process.env): { used: number; cap: number } {
  if (utcDay() !== visionDay) return { used: 0, cap: visionDailyCap(env) };
  return { used: visionCount, cap: visionDailyCap(env) };
}

/** Test seam — forget both counters. */
export function resetGeolocationLimits(): void {
  ipBuckets.clear();
  visionDay = '';
  visionCount = 0;
}
