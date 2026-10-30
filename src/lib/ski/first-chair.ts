/**
 * Powder Pass — first-chair planner math.
 *
 * The planner answers one question: "to be at the resort by <target>,
 * when do I have to leave?" — leave-by = target − drive − buffer.
 *
 * Hard truth constraints (see the P8 evaluation in ski-expansion):
 *   - There is NO verified source for lift-open times anywhere, so
 *     this module contains no lift time, estimate or guess of one.
 *     The only anchored target it knows is SUNRISE, from Open-Meteo.
 *   - The drive time is the real routing duration the route tool
 *     stored with the saved route (saved-routes' durationMin). A
 *     missing or zero duration means "unavailable" — the distance is
 *     never converted into a time here.
 *
 * All arithmetic is WALL-CLOCK minutes on a calendar date, not epoch
 * instants: Open-Meteo returns sunrise in the resort's own local time
 * (timezone=auto), and a leave-by plan is a wall-clock plan. Doing the
 * subtraction in minutes keeps the resort's sunrise, the target and
 * the leave-by in one consistent wall frame with no timezone shift.
 */

export const DEFAULT_BUFFER_MIN = 30;
/** Buffer is the user's own prep allowance; cap keeps typos sane. */
export const MAX_BUFFER_MIN = 480;

/* ------------------------------------------------------------------ */
/* Sunrise (Open-Meteo forecast, modelled)                             */
/* ------------------------------------------------------------------ */

export interface SunriseDay {
  /** Resort-local calendar date, "YYYY-MM-DD". */
  date: string;
  /** Resort-local sunrise, "YYYY-MM-DDTHH:MM", or null when absent. */
  sunrise: string | null;
}

export function forecastSunriseUrl(
  lat: number,
  lng: number,
  startDate: string,
  endDate: string,
): string {
  const qs = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    daily: "sunrise",
    start_date: startDate,
    end_date: endDate,
    timezone: "auto",
  });
  return `https://api.open-meteo.com/v1/forecast?${qs.toString()}`;
}

/** Parse an Open-Meteo daily-sunrise payload; malformed = empty list. */
export function parseSunrises(json: unknown): SunriseDay[] {
  const daily = (json as { daily?: { time?: unknown; sunrise?: unknown } } | null)
    ?.daily;
  if (!Array.isArray(daily?.time) || !Array.isArray(daily?.sunrise)) return [];
  const out: SunriseDay[] = [];
  for (let i = 0; i < daily.time.length; i++) {
    const date = daily.time[i];
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const sunrise = daily.sunrise[i];
    out.push({
      date,
      sunrise:
        typeof sunrise === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(sunrise)
          ? sunrise.slice(0, 16)
          : null,
    });
  }
  return out;
}

/** The sunrise wall time for one date, or null when the model has none. */
export function sunriseForDate(json: unknown, date: string): string | null {
  return parseSunrises(json).find((d) => d.date === date)?.sunrise ?? null;
}

/* ------------------------------------------------------------------ */
/* Wall-clock helpers                                                  */
/* ------------------------------------------------------------------ */

/** "07:05" / "7:05" / a sunrise ISO "2026-10-31T07:05" → minutes of day. */
export function timeToMinutes(value: string): number | null {
  const m = /(?:T|^)(\d{1,2}):(\d{2})/.exec(value);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Minutes of day → "7:05 AM" / "12:30 PM" / "12:00 AM". */
export function minutesToClock(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h24 = Math.floor(m / 60);
  const min = m % 60;
  const suffix = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(min).padStart(2, "0")} ${suffix}`;
}

/** 150 → "2 h 30 min"; 45 → "45 min"; 120 → "2 h"; 0 → "0 min". */
export function formatDurationMin(totalMin: number): string {
  const t = Math.max(0, Math.round(totalMin));
  const h = Math.floor(t / 60);
  const m = t % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/** Shift a "YYYY-MM-DD" date by whole days (UTC math — no DST drift). */
export function shiftDate(date: string, deltaDays: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

/** The user's own prep buffer: non-finite → default, negative → 0. */
export function clampBufferMin(raw: number): number {
  if (!Number.isFinite(raw)) return DEFAULT_BUFFER_MIN;
  return Math.min(MAX_BUFFER_MIN, Math.max(0, Math.round(raw)));
}

/* ------------------------------------------------------------------ */
/* The plan                                                            */
/* ------------------------------------------------------------------ */

export interface LeaveByPlan {
  /** Calendar date the target falls on, "YYYY-MM-DD". */
  targetDate: string;
  /** Target wall time, minutes of day. */
  targetMinutes: number;
  targetClock: string;
  /** The real stored routing duration used. */
  driveMin: number;
  /** The user's buffer, after clamping. */
  bufferMin: number;
  /** drive + buffer — everything subtracted from the target. */
  totalSubtractMin: number;
  /** Calendar date to leave on (may be before targetDate). */
  leaveDate: string;
  leaveMinutes: number;
  leaveClock: string;
  /** True when leaving falls on an earlier calendar day than arrival. */
  isPreviousDay: boolean;
  /** How many whole days before the target date the leave date is. */
  daysBack: number;
}

/**
 * leave-by = target − drive − buffer.
 *
 * Returns null when there is no real drive duration to subtract
 * (missing, non-finite or <= 0): the planner shows "drive time
 * unavailable for this route" rather than estimating one.
 */
export function computeLeaveBy(input: {
  targetDate: string;
  targetMinutes: number;
  driveDurationMin: number | null | undefined;
  bufferMin: number;
}): LeaveByPlan | null {
  const drive = input.driveDurationMin;
  if (drive == null || !Number.isFinite(drive) || drive <= 0) return null;
  if (!Number.isFinite(input.targetMinutes)) return null;
  const bufferMin = clampBufferMin(input.bufferMin);
  const driveMin = Math.round(drive);
  const totalSubtractMin = driveMin + bufferMin;
  const absoluteTarget = input.targetMinutes;
  const absoluteLeave = absoluteTarget - totalSubtractMin;
  const daysBack = absoluteLeave < 0 ? Math.ceil(-absoluteLeave / 1440) : 0;
  const leaveMinutes = ((absoluteLeave % 1440) + 1440) % 1440;
  return {
    targetDate: input.targetDate,
    targetMinutes: input.targetMinutes,
    targetClock: minutesToClock(input.targetMinutes),
    driveMin,
    bufferMin,
    totalSubtractMin,
    leaveDate: shiftDate(input.targetDate, -daysBack),
    leaveMinutes,
    leaveClock: minutesToClock(leaveMinutes),
    isPreviousDay: daysBack > 0,
    daysBack,
  };
}
