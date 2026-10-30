/**
 * Powder Pass — shared plumbing for the ski email runners (dawn patrol
 * + Thursday powder digest).
 *
 * Both runners share: the audience (users who follow ≥1 resort AND have
 * ski access via resolveSkiAccess — never a new gate), the opt-out rule
 * (User.emailOptOut), the send log (SkiEmailSendLog — one row per
 * (user, kind, dedupeKey); the unique constraint is the never-send-twice
 * guarantee), and the mail furniture (brand shell, unsubscribe link,
 * CAN-SPAM postal line).
 *
 * The runner dependencies are a single injectable interface so unit
 * tests can drive the full run logic with fakes — no DB, no network,
 * no real sends. Production wires `defaultSkiEmailDeps()` once.
 */
import { db } from "@/lib/db";
import { sendEmail, escapeHtml } from "@/lib/email";
import { appBaseUrl } from "@/lib/app-url";
import { buildUnsubscribeUrl, unsubscribeSecret } from "@/lib/lifecycle/unsubscribe";
import { resolveSkiAccess } from "./access-server";
import { fetchResortSnow, type ResortSnowData } from "./openmeteo";
import type { SkiResort } from "@/lib/ski-resorts";

export const SKI_EMAIL_KINDS = { dawn: "dawn", digest: "digest" } as const;
export type SkiEmailKind = (typeof SKI_EMAIL_KINDS)[keyof typeof SKI_EMAIL_KINDS];

/** CAN-SPAM postal line (same line the affiliate payout mail carries). */
export const SKI_EMAIL_CAN_SPAM_LINE = "WorldEye · 555 E 3200 N, North Ogden, UT 84414";

export interface SkiEmailUser {
  id: string;
  email: string | null;
  name: string | null;
  emailOptOut: boolean;
}

export interface SkiEmailDeps {
  /** Every follow row in the table (the audience starts here). */
  listAllFollows(): Promise<{ userId: string; resortSlug: string }[]>;
  getUser(userId: string): Promise<SkiEmailUser | null>;
  hasSkiAccess(userId: string): Promise<boolean>;
  alreadySent(userId: string, kind: SkiEmailKind, dedupeKey: string): Promise<boolean>;
  recordSent(userId: string, kind: SkiEmailKind, dedupeKey: string): Promise<void>;
  send(to: string, subject: string, html: string): Promise<boolean>;
  fetchSnow(resort: SkiResort): Promise<ResortSnowData | null>;
  now(): Date;
}

/* ── Dedupe keys ──────────────────────────────────────────────────── */

/** UTC calendar date of the run, "YYYY-MM-DD" (dawn-patrol key). */
export function utcDateKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** ISO-8601 week key, e.g. "2026-W44" (powder-digest key). Same
 * algorithm as the newsletter digest's issue key. */
export function isoWeekKey(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // Thursday of this week
  const isoYear = d.getUTCFullYear();
  const jan1 = new Date(Date.UTC(isoYear, 0, 1));
  const dayOfYear = Math.floor((d.getTime() - jan1.getTime()) / 86400_000) + 1;
  const week = Math.ceil(dayOfYear / 7);
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

/* ── Shared run helpers ───────────────────────────────────────────── */

/** Group follow rows into userId -> slugs (first-seen order kept). */
export function groupFollowsByUser(
  rows: { userId: string; resortSlug: string }[],
): Map<string, string[]> {
  const byUser = new Map<string, string[]>();
  for (const row of rows) {
    const list = byUser.get(row.userId);
    if (list) list.push(row.resortSlug);
    else byUser.set(row.userId, [row.resortSlug]);
  }
  return byUser;
}

/**
 * Per-run resort snow cache: many users follow the same resort, and a
 * resort is fetched at most once per run. Failures cache as null too —
 * a dead resort is not retried once per follower.
 */
export function makeSnowCache(fetchSnow: SkiEmailDeps["fetchSnow"]) {
  const cache = new Map<string, Promise<ResortSnowData | null>>();
  return (resort: SkiResort): Promise<ResortSnowData | null> => {
    let pending = cache.get(resort.slug);
    if (!pending) {
      pending = fetchSnow(resort).catch(() => null);
      cache.set(resort.slug, pending);
    }
    return pending;
  };
}

/** Footer block every ski email carries: unsubscribe + postal line. */
export function skiEmailFooter(unsubscribeUrl: string | null): string {
  const unsub = unsubscribeUrl
    ? `<p style="font-size:12px;color:#52525b;margin-top:18px;">Don't want these ski emails? <a href="${escapeHtml(unsubscribeUrl)}" style="color:#71717a;">Unsubscribe</a> — you'll still get essential account emails.</p>`
    : "";
  return `${unsub}<p style="color:#52525b;font-size:12px;margin-top:14px;">${SKI_EMAIL_CAN_SPAM_LINE}</p>`;
}

export function unsubscribeUrlFor(userId: string): string | null {
  return buildUnsubscribeUrl(appBaseUrl(), userId, unsubscribeSecret());
}

/** "Fri, Oct 30, 2026, 12:00 PM UTC"-style fetch timestamp for copy. */
export function fetchedAtLabel(d: Date): string {
  return `${d.toLocaleString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })} UTC`;
}

/* ── Production wiring ────────────────────────────────────────────── */

interface SkiEmailLogDb {
  skiEmailSendLog: {
    findUnique(args: {
      where: { userId_kind_dedupeKey: { userId: string; kind: string; dedupeKey: string } };
      select: { id: true };
    }): Promise<{ id: string } | null>;
    create(args: {
      data: { userId: string; kind: string; dedupeKey: string };
    }): Promise<unknown>;
  };
}

export function defaultSkiEmailDeps(): SkiEmailDeps {
  const logDb = db as unknown as SkiEmailLogDb;
  return {
    async listAllFollows() {
      const rows = await db.skiResortFollow.findMany({
        orderBy: { createdAt: "asc" },
        select: { userId: true, resortSlug: true },
      });
      return rows;
    },
    async getUser(userId) {
      return db.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, emailOptOut: true },
      });
    },
    hasSkiAccess: resolveSkiAccess,
    async alreadySent(userId, kind, dedupeKey) {
      const row = await logDb.skiEmailSendLog.findUnique({
        where: { userId_kind_dedupeKey: { userId, kind, dedupeKey } },
        select: { id: true },
      });
      return !!row;
    },
    async recordSent(userId, kind, dedupeKey) {
      // Unique race (a concurrent run logged it first) is a success:
      // the guarantee we need is "a row exists", not "we wrote it".
      await logDb.skiEmailSendLog
        .create({ data: { userId, kind, dedupeKey } })
        .catch(() => {});
    },
    send: sendEmail,
    fetchSnow: resort =>
      fetchResortSnow(resort.lat, resort.lng, { pastDays: 2, forecastDays: 4 }),
    now: () => new Date(),
  };
}
