/**
 * Powder Pass — pass-value tracker (feature #8).
 *
 * USER-ENTERED DATA ONLY. The member types in what they paid for
 * their pass and, optionally, the day-ticket price they would
 * otherwise pay; then they log each day they ski. Every figure this
 * module computes comes from those inputs alone — no resort price,
 * day-ticket price or snow figure is ever looked up, estimated or
 * invented. Without a user-entered day price there is NO break-even
 * or value claim at all: only days logged and cost per day.
 *
 * Pure computation + validation live at the top (unit-tested without
 * a DB); the DB surface below is a narrow structural interface in the
 * style of lib/ski/follows, so tests inject an in-memory client and
 * production passes the real Prisma client (cast once here, because
 * the generated client's delegates only exist after `prisma generate`
 * runs against this schema).
 */
import { db } from "@/lib/db";
import { getSkiResort } from "@/lib/ski-resorts";

/* ── Labels ─────────────────────────────────────────────────────── */

/** Preset pass labels offered in the UI. "Other" = free text. */
export const PASS_LABEL_PRESETS = [
  "Ikon",
  "Epic",
  "Mountain Collective",
  "Indy",
  "Powder Pass",
  "Other",
] as const;

/* ── Validation ─────────────────────────────────────────────────── */

export class PassValueValidationError extends Error {
  field: string;
  constructor(field: string, message: string) {
    super(message);
    this.name = "PassValueValidationError";
    this.field = field;
  }
}

/** Cents must be a positive integer (and sanely bounded). */
export function isValidMoneyCents(v: unknown): v is number {
  return (
    typeof v === "number" &&
    Number.isInteger(v) &&
    v > 0 &&
    v <= 100_000_000 /* $1,000,000 — a season pass never costs more */
  );
}

export interface SeasonInput {
  label: string;
  costCents: number;
  dayPriceCents: number | null;
}

export function validateSeasonInput(raw: unknown): SeasonInput {
  const body = (raw ?? {}) as Record<string, unknown>;
  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (label.length < 1 || label.length > 60) {
    throw new PassValueValidationError(
      "label",
      "Pass label must be between 1 and 60 characters.",
    );
  }
  if (!isValidMoneyCents(body.costCents)) {
    throw new PassValueValidationError(
      "costCents",
      "Pass cost must be a positive whole number of cents.",
    );
  }
  let dayPriceCents: number | null = null;
  if (body.dayPriceCents !== null && body.dayPriceCents !== undefined) {
    if (!isValidMoneyCents(body.dayPriceCents)) {
      throw new PassValueValidationError(
        "dayPriceCents",
        "Day-ticket price must be a positive whole number of cents when given.",
      );
    }
    dayPriceCents = body.dayPriceCents;
  }
  return { label, costCents: body.costCents, dayPriceCents };
}

/**
 * Parse a "YYYY-MM-DD" calendar date to a UTC-midnight Date, or null.
 * Rejects impossible dates (2026-02-30), other formats, non-strings.
 */
export function parseSkiedOn(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  return d;
}

export function formatSkiedOn(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface DayInput {
  skiedOn: Date;
  resortSlug: string | null;
}

export function validateDayInput(raw: unknown): DayInput {
  const body = (raw ?? {}) as Record<string, unknown>;
  const skiedOn = parseSkiedOn(body.skiedOn);
  if (!skiedOn) {
    throw new PassValueValidationError(
      "skiedOn",
      "Ski day must be a real calendar date (YYYY-MM-DD).",
    );
  }
  let resortSlug: string | null = null;
  if (body.resortSlug !== null && body.resortSlug !== undefined && body.resortSlug !== "") {
    if (typeof body.resortSlug !== "string" || !getSkiResort(body.resortSlug)) {
      throw new PassValueValidationError(
        "resortSlug",
        `Unknown ski resort slug: ${String(body.resortSlug)}`,
      );
    }
    resortSlug = body.resortSlug;
  }
  return { skiedOn, resortSlug };
}

/* ── Pure computation (from user inputs only) ───────────────────── */

export interface PassValueSummary {
  daysLogged: number;
  /** passCost / daysLogged; null until at least one day is logged. */
  costPerDayCents: number | null;
  /** daysLogged × the user's own day price; null without a day price. */
  valueReceivedCents: number | null;
  /** ceil(passCost / dayPrice); null without a day price. */
  breakEvenDays: number | null;
  /**
   * The logged-day count at which cumulative value first reached the
   * pass cost — equal to breakEvenDays once that many days are
   * logged (each logged day adds the same user-entered day price);
   * null before that, and null without a day price.
   */
  paidForItselfOnDay: number | null;
  /** Days still needed to break even; null without a day price, 0 once there. */
  daysToBreakEven: number | null;
}

export function computePassValueSummary(
  season: { costCents: number; dayPriceCents: number | null },
  daysLogged: number,
): PassValueSummary {
  const costPerDayCents =
    daysLogged > 0 ? Math.round(season.costCents / daysLogged) : null;
  if (season.dayPriceCents == null) {
    return {
      daysLogged,
      costPerDayCents,
      valueReceivedCents: null,
      breakEvenDays: null,
      paidForItselfOnDay: null,
      daysToBreakEven: null,
    };
  }
  const breakEvenDays = Math.ceil(season.costCents / season.dayPriceCents);
  const reached = daysLogged >= breakEvenDays;
  return {
    daysLogged,
    costPerDayCents,
    valueReceivedCents: daysLogged * season.dayPriceCents,
    breakEvenDays,
    paidForItselfOnDay: reached ? breakEvenDays : null,
    daysToBreakEven: reached ? 0 : breakEvenDays - daysLogged,
  };
}

/* ── DB layer ───────────────────────────────────────────────────── */

export interface SkiPassSeasonRow {
  id: string;
  userId: string;
  label: string;
  costCents: number;
  dayPriceCents: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SkiPassDayRow {
  id: string;
  userId: string;
  skiedOn: Date;
  resortSlug: string | null;
  createdAt: Date;
}

/** The slice of the Prisma client this module uses. */
export interface SkiPassDb {
  skiPassSeason: {
    findUnique(args: {
      where: { userId: string };
    }): Promise<SkiPassSeasonRow | null>;
    upsert(args: {
      where: { userId: string };
      create: { userId: string; label: string; costCents: number; dayPriceCents: number | null };
      update: { label: string; costCents: number; dayPriceCents: number | null };
    }): Promise<SkiPassSeasonRow>;
  };
  skiPassDay: {
    findMany(args: {
      where: { userId: string };
      orderBy: { skiedOn: "asc" };
    }): Promise<SkiPassDayRow[]>;
    findFirst(args: {
      where: { userId: string; skiedOn: Date; resortSlug: string | null };
    }): Promise<SkiPassDayRow | null>;
    create(args: {
      data: { userId: string; skiedOn: Date; resortSlug: string | null };
    }): Promise<SkiPassDayRow>;
    deleteMany(args: {
      where: { id: string; userId: string };
    }): Promise<{ count: number }>;
  };
}

const defaultDb = db as unknown as SkiPassDb;

export interface PassValueState {
  season: SkiPassSeasonRow | null;
  days: SkiPassDayRow[];
  summary: PassValueSummary | null;
}

export async function getPassValueState(
  userId: string,
  client: SkiPassDb = defaultDb,
): Promise<PassValueState> {
  const season = await client.skiPassSeason.findUnique({ where: { userId } });
  const days = await client.skiPassDay.findMany({
    where: { userId },
    orderBy: { skiedOn: "asc" },
  });
  return {
    season,
    days,
    summary: season ? computePassValueSummary(season, days.length) : null,
  };
}

/** Create or replace the user's one tracked pass season. */
export async function upsertPassSeason(
  userId: string,
  raw: unknown,
  client: SkiPassDb = defaultDb,
): Promise<SkiPassSeasonRow> {
  const input = validateSeasonInput(raw);
  return client.skiPassSeason.upsert({
    where: { userId },
    create: { userId, ...input },
    update: { ...input },
  });
}

/**
 * Log a ski day. Idempotent per (user, date, resort): logging the
 * same day twice returns the existing row instead of duplicating —
 * the @@unique constraint backstops the slug case, and the explicit
 * findFirst covers the null-resort case (NULLs are distinct in a
 * Postgres unique index).
 */
export async function logPassDay(
  userId: string,
  raw: unknown,
  client: SkiPassDb = defaultDb,
): Promise<SkiPassDayRow> {
  const input = validateDayInput(raw);
  const existing = await client.skiPassDay.findFirst({
    where: { userId, skiedOn: input.skiedOn, resortSlug: input.resortSlug },
  });
  if (existing) return existing;
  return client.skiPassDay.create({ data: { userId, ...input } });
}

/** Remove one logged day by id. Returns true when a row was removed. */
export async function removePassDay(
  userId: string,
  dayId: unknown,
  client: SkiPassDb = defaultDb,
): Promise<boolean> {
  if (typeof dayId !== "string" || dayId.length === 0) {
    throw new PassValueValidationError("id", "A day id is required.");
  }
  const res = await client.skiPassDay.deleteMany({
    where: { id: dayId, userId },
  });
  return res.count > 0;
}
