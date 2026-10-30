/**
 * Transit route email alerts — the shared decision logic.
 *
 * A visitor subscribes an email address to one transit route's service
 * alerts (today: MBTA, whose v3 API is the upstream). Alerts are FREE
 * for transit (owner order 2026-10-29) with one conversion mechanic:
 * an address with no WorldEye account receives at most
 * FREE_ALERT_EMAIL_LIMIT alert digest emails; after that the alerts
 * pause and a single conversion email invites the reader to create a
 * free account. Any address that belongs to an account — free tier
 * included — is never capped, and the cap lifts automatically the
 * first poll after the account exists.
 *
 * This module is the canonical, pure implementation of the cap and
 * dedupe rules (unit-tested in alertSubscriptions.test.ts). The
 * sending itself is done by the cron runner
 * (~/workspace/goals/worldeye-organic-growth-engine/hidden_files/
 * transit-alerts/runner.py), which mirrors these rules exactly:
 *   — an "alert email event" is a digest of every alert that is new
 *     or whose upstream `updated_at` changed since the last send
 *     (the ledger key below), never one email per alert;
 *   — `alertsSent` counts digest emails, and only for subscribers
 *     without an account.
 */

export const FREE_ALERT_EMAIL_LIMIT = 5;

export const TRANSIT_ALERTS_SITE = "https://worldeye.app";

// ── MBTA v3 alert normalization ────────────────────────────────────────

export interface MbtaAlertPeriod {
  start: Date | null;
  end: Date | null;
}

export interface NormalizedAlert {
  /** Upstream alert id (MBTA v3 resource id). */
  id: string;
  header: string;
  description: string;
  effect: string;
  severity: number | null;
  /** Upstream record's last-change instant — half of the dedupe key. */
  updatedAt: Date;
  periods: MbtaAlertPeriod[];
}

function toDate(v: unknown): Date | null {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Normalize one MBTA v3 JSON:API alert resource. Returns null for a
 * resource with no header or no usable updated_at — an alert we can't
 * dedupe honestly is never emailed.
 */
export function normalizeMbtaAlert(item: unknown): NormalizedAlert | null {
  const it = item as {
    id?: unknown;
    attributes?: Record<string, unknown>;
  } | null;
  if (!it || typeof it !== "object") return null;
  const a = it.attributes ?? {};
  const header = typeof a.header === "string" ? a.header.trim() : "";
  const updatedAt = toDate(a.updated_at);
  if (!header || !updatedAt) return null;
  const periods: MbtaAlertPeriod[] = [];
  if (Array.isArray(a.active_period)) {
    for (const p of a.active_period as Array<Record<string, unknown>>) {
      periods.push({ start: toDate(p?.start), end: toDate(p?.end) });
    }
  }
  return {
    id: String(it.id ?? ""),
    header,
    description: typeof a.description === "string" ? a.description.trim() : "",
    effect: typeof a.effect === "string" ? a.effect : "",
    severity: typeof a.severity === "number" ? a.severity : null,
    updatedAt,
    periods,
  };
}

// ── Dedupe ─────────────────────────────────────────────────────────────

/** Ledger key: an alert is "already sent" only at this exact version. */
export function alertLedgerKey(alert: NormalizedAlert): string {
  return `${alert.id}|${alert.updatedAt.toISOString()}`;
}

/**
 * An alert is emailable while it is not expired: at least one active
 * window is open-ended or ends in the future. An alert that states no
 * window is treated as active (the agency still lists it).
 */
export function isAlertEmailable(alert: NormalizedAlert, now: Date): boolean {
  if (alert.periods.length === 0) return true;
  return alert.periods.some((p) => p.end === null || p.end > now);
}

/** Alerts that are live and absent from the sent ledger. */
export function pendingAlerts(
  alerts: NormalizedAlert[],
  sentKeys: ReadonlySet<string>,
  now: Date,
): NormalizedAlert[] {
  return alerts.filter(
    (a) => isAlertEmailable(a, now) && !sentKeys.has(alertLedgerKey(a)),
  );
}

// ── The free-tier cap decision ─────────────────────────────────────────

export type AlertSendDecision =
  /** Send the digest. `finalFree` marks the 5th (last free) email. */
  | { action: "send"; finalFree: boolean }
  /** Cap reached, conversion email not yet sent: send it (once). */
  | { action: "convert" }
  /** Cap reached and conversion already sent: stay silent. */
  | { action: "skip" };

export function decideAlertSend(input: {
  /** Digest emails already sent to this non-account subscriber. */
  alertsSent: number;
  /** The address belongs to a WorldEye account (any tier). */
  hasAccount: boolean;
  /** The one conversion email has already gone out. */
  conversionEmailSent: boolean;
}): AlertSendDecision {
  if (input.hasAccount) return { action: "send", finalFree: false };
  if (input.alertsSent < FREE_ALERT_EMAIL_LIMIT) {
    return {
      action: "send",
      finalFree: input.alertsSent === FREE_ALERT_EMAIL_LIMIT - 1,
    };
  }
  return input.conversionEmailSent
    ? { action: "skip" }
    : { action: "convert" };
}

// ── URLs (shared by the API route, the form, and the runner's copy) ───

export function transitRouteUrl(agency: string, routeSlug: string): string {
  return `${TRANSIT_ALERTS_SITE}/transit/${agency}/routes/${routeSlug}`;
}

export function transitAlertSignupUrl(input: {
  email: string;
  agency: string;
  routeSlug: string;
}): string {
  const q = new URLSearchParams({
    email: input.email,
    callbackUrl: `/transit/${input.agency}/routes/${input.routeSlug}`,
  });
  return `${TRANSIT_ALERTS_SITE}/signup?${q.toString()}`;
}

export function transitAlertUnsubscribeUrl(unsubToken: string): string {
  return `${TRANSIT_ALERTS_SITE}/api/transit/alert-subscriptions/unsubscribe?token=${encodeURIComponent(unsubToken)}`;
}

/**
 * Human line for an alert's active window, in the agency's local
 * time. Null when the alert states no window.
 */
export function formatAlertPeriod(
  alert: NormalizedAlert,
  timeZone = "America/New_York",
): string | null {
  if (alert.periods.length === 0) return null;
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const parts: string[] = [];
  for (const p of alert.periods) {
    const s = p.start ? fmt.format(p.start) : null;
    const e = p.end ? fmt.format(p.end) : null;
    if (s && e) parts.push(`${s} – ${e}`);
    else if (s) parts.push(`from ${s}, until further notice`);
    else if (e) parts.push(`until ${e}`);
  }
  return parts.length ? parts.join("; ") : null;
}
