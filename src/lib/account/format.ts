// ── Preference-aware formatting (items 8 + 9) ───────────────────────
// Pure helpers: every surface that prints a temperature, wind speed,
// distance or clock time should take the user's units / timezone /
// clock format from here instead of hardcoding imperial + UTC.

export type Units = "imperial" | "metric";

export function formatTemperature(celsius: number, units: Units): string {
  if (units === "metric") return `${Math.round(celsius)}°C`;
  return `${Math.round((celsius * 9) / 5 + 32)}°F`;
}

/** Wind speed stored as km/h (the weather layer's native unit). */
export function formatWindSpeed(kmh: number, units: Units): string {
  if (units === "metric") return `${Math.round(kmh)} km/h`;
  return `${Math.round(kmh * 0.621371)} mph`;
}

export function formatDistance(km: number, units: Units): string {
  if (units === "metric") {
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`;
  }
  const mi = km * 0.621371;
  return mi < 0.1 ? `${Math.round(km * 3280.84)} ft` : `${mi.toFixed(mi < 10 ? 1 : 0)} mi`;
}

export function formatAltitude(meters: number, units: Units): string {
  if (units === "metric") return `${Math.round(meters)} m`;
  return `${Math.round(meters * 3.28084).toLocaleString("en-US")} ft`;
}

/**
 * Format an instant in the user's timezone (or the viewer's local zone
 * when unset) honoring their 12/24h choice.
 */
export function formatDateTime(
  date: Date,
  opts: { timezone?: string | null; clockFormat?: string | null; withDate?: boolean } = {},
): string {
  const hour12 = opts.clockFormat !== "24";
  try {
    return new Intl.DateTimeFormat("en-US", {
      ...(opts.timezone ? { timeZone: opts.timezone } : {}),
      hour12,
      ...(opts.withDate ? { month: "short", day: "numeric", year: "numeric" } : {}),
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-US", { hour12, hour: "numeric", minute: "2-digit" }).format(date);
  }
}
