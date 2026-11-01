/**
 * Powder Pass — Season-in-review email (2026-11 expansion, pick 11).
 *
 * Monthly "season so far" note to members who track a pass: the days
 * THEY logged, the resorts THEY logged them at, and the pass maths
 * from their own numbers (cost per day; value received and break-even
 * only when they entered a day-ticket price — computePassValueSummary
 * returns nulls otherwise and the email says nothing about value).
 * Nothing is estimated, modelled or benchmarked against anyone else:
 * if the user didn't log it, it isn't in the email.
 *
 * Audience: SkiPassSeason owners with ≥1 logged day AND ski access
 * (resolveSkiAccess — the only gate), opt-out honoured, once per user
 * per month via SkiEmailSendLog (kind 'season', key YYYY-MM).
 */
import { db } from "@/lib/db";
import { sendEmail, shell, escapeHtml, appUrl } from "@/lib/email";
import { getSkiResort } from "@/lib/ski-resorts";
import { resolveSkiAccess } from "./access-server";
import { getPassValueState, type PassValueState } from "./pass-value";
import { summariseLoggedDays } from "./season-review";
import {
  SKI_EMAIL_KINDS,
  skiEmailFooter,
  unsubscribeUrlFor,
  type SkiEmailUser,
} from "./ski-email";

export function formatMoneyCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function seasonReviewEmail(input: {
  name: string | null;
  seasonLabel: string;
  daysLogged: number;
  resortNames: string[];
  costPerDayCents: number | null;
  /** Only when the member entered a day-ticket price. */
  valueReceivedCents: number | null;
  daysToBreakEven: number | null;
  paidForItself: boolean;
  unsubscribeUrl: string | null;
}): { subject: string; html: string } {
  const first = input.name?.trim().split(/\s+/)[0] || "there";
  const dayWord = input.daysLogged === 1 ? "day" : "days";
  const resortLine =
    input.resortNames.length > 0
      ? ` at ${input.resortNames.map(n => escapeHtml(n)).join(", ")}`
      : "";
  const costLine =
    input.costPerDayCents != null
      ? `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Your ${escapeHtml(input.seasonLabel)} has cost you <strong style="color:#fff;">${formatMoneyCents(input.costPerDayCents)} per day</strong> so far, on your own numbers.</p>`
      : "";
  let valueLine = "";
  if (input.valueReceivedCents != null) {
    valueLine = input.paidForItself
      ? `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Against the day-ticket price you entered, that's <strong style="color:#fff;">${formatMoneyCents(input.valueReceivedCents)}</strong> of skiing logged — your pass has paid for itself.</p>`
      : `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Against the day-ticket price you entered, that's <strong style="color:#fff;">${formatMoneyCents(input.valueReceivedCents)}</strong> of skiing logged${input.daysToBreakEven != null ? ` — <strong style="color:#fff;">${input.daysToBreakEven} more ${input.daysToBreakEven === 1 ? "day" : "days"}</strong> and the pass has paid for itself` : ""}.</p>`;
  }
  return {
    subject: `Your season so far: ${input.daysLogged} ${dayWord}${resortLine ? `, ${input.resortNames.length} resort${input.resortNames.length === 1 ? "" : "s"}` : ""}`,
    html: shell(
      "Your season, so far",
      `${input.daysLogged} days logged on your ${input.seasonLabel}.`,
      `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Hi ${escapeHtml(first)},</p>
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">From your own ski log: <strong style="color:#fff;">${input.daysLogged} ${dayWord}</strong> this season${resortLine}. Every figure below comes from the days and prices you entered — nothing is estimated.</p>
       ${costLine}
       ${valueLine}
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Keep logging days as you ski — next month's review builds on the same log, and your cost-per-day only gets more honest.</p>
       ${skiEmailFooter(input.unsubscribeUrl)}`,
      { label: "Open My Powder", href: appUrl("/ski-webcams/my") },
    ),
  };
}

/* ── Runner ───────────────────────────────────────────────────────── */

export interface SeasonReviewDeps {
  listSeasonOwners(): Promise<string[]>;
  getUser(userId: string): Promise<SkiEmailUser | null>;
  hasSkiAccess(userId: string): Promise<boolean>;
  getState(userId: string): Promise<PassValueState>;
  alreadySent(userId: string, kind: string, dedupeKey: string): Promise<boolean>;
  recordSent(userId: string, kind: string, dedupeKey: string): Promise<void>;
  send(to: string, subject: string, html: string): Promise<boolean>;
  now(): Date;
}

export function monthKey(now: Date): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function defaultSeasonReviewDeps(): SeasonReviewDeps {
  // Same structural cast ski-email.ts uses for the send log.
  const logDb = db as unknown as {
    skiEmailSendLog: {
      findUnique(args: {
        where: { userId_kind_dedupeKey: { userId: string; kind: string; dedupeKey: string } };
        select: { id: true };
      }): Promise<{ id: string } | null>;
      create(args: {
        data: { userId: string; kind: string; dedupeKey: string };
      }): Promise<unknown>;
    };
  };
  return {
    async listSeasonOwners() {
      const rows = await db.skiPassSeason.findMany({ select: { userId: true } });
      return rows.map(r => r.userId);
    },
    async getUser(userId) {
      return db.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, emailOptOut: true },
      });
    },
    hasSkiAccess: resolveSkiAccess,
    getState: userId => getPassValueState(userId),
    async alreadySent(userId, kind, dedupeKey) {
      const row = await logDb.skiEmailSendLog.findUnique({
        where: { userId_kind_dedupeKey: { userId, kind, dedupeKey } },
        select: { id: true },
      });
      return !!row;
    },
    async recordSent(userId, kind, dedupeKey) {
      await logDb.skiEmailSendLog
        .create({ data: { userId, kind, dedupeKey } })
        .catch(() => {});
    },
    send: sendEmail,
    now: () => new Date(),
  };
}

export interface SeasonReviewSummary {
  dryRun: boolean;
  owners: number;
  sent: number;
  skipped: Record<string, number>;
}

export async function runSeasonReview(
  opts: { dryRun?: boolean; deps?: SeasonReviewDeps } = {},
): Promise<SeasonReviewSummary> {
  const deps = opts.deps ?? defaultSeasonReviewDeps();
  const now = deps.now();
  const key = monthKey(now);
  const summary: SeasonReviewSummary = { dryRun: !!opts.dryRun, owners: 0, sent: 0, skipped: {} };
  const skip = (reason: string) => {
    summary.skipped[reason] = (summary.skipped[reason] ?? 0) + 1;
  };

  const owners = await deps.listSeasonOwners();
  summary.owners = owners.length;
  for (const userId of owners) {
    const user = await deps.getUser(userId);
    if (!user?.email) {
      skip("no_email");
      continue;
    }
    if (user.emailOptOut) {
      skip("opted_out");
      continue;
    }
    if (!(await deps.hasSkiAccess(userId))) {
      skip("no_ski_access");
      continue;
    }
    const state = await deps.getState(userId);
    if (!state.season || !state.summary) {
      skip("no_season");
      continue;
    }
    const logged = summariseLoggedDays(state.days);
    if (logged.daysLogged === 0) {
      skip("no_days_logged");
      continue;
    }
    if (await deps.alreadySent(userId, SKI_EMAIL_KINDS.season, key)) {
      skip("already_sent");
      continue;
    }
    const resortNames = logged.distinctResortSlugs
      .map(slug => getSkiResort(slug)?.name ?? slug)
      .slice(0, 6);
    const rendered = seasonReviewEmail({
      name: user.name,
      seasonLabel: state.season.label,
      daysLogged: logged.daysLogged,
      resortNames,
      costPerDayCents: state.summary.costPerDayCents,
      valueReceivedCents: state.summary.valueReceivedCents,
      daysToBreakEven: state.summary.daysToBreakEven,
      paidForItself: state.summary.paidForItselfOnDay != null,
      unsubscribeUrl: unsubscribeUrlFor(userId),
    });
    if (summary.dryRun) {
      summary.sent++;
      continue;
    }
    const ok = await deps.send(user.email, rendered.subject, rendered.html);
    if (!ok) {
      skip("send_failed");
      continue;
    }
    await deps.recordSent(userId, SKI_EMAIL_KINDS.season, key);
    summary.sent++;
  }
  return summary;
}
