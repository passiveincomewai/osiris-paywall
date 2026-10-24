// ── Alert delivery decisions (items 13 + 14) ────────────────────────
// One pure decision used by the camera-alert checker (and available to
// the event-alert sender): should this alert go out, and by email?
// Rules: channel "none" suppresses; quiet hours suppress in the USER's
// timezone; "push" never pretends to deliver — with no push
// subscription infrastructure in master it suppresses email and says
// why, rather than silently rerouting or faking a push.

import type { Preferences } from "./preferences";

export function minutesOfDayInTimezone(now: Date, timezone: string | null): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      ...(timezone ? { timeZone: timezone } : {}),
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(now);
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
    const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
    return hour * 60 + minute;
  } catch {
    return now.getHours() * 60 + now.getMinutes();
  }
}

function hhmmToMinutes(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function isInQuietHours(
  now: Date,
  prefs: Pick<Preferences, "quietHoursEnabled" | "quietHoursStart" | "quietHoursEnd" | "timezone">,
): boolean {
  if (!prefs.quietHoursEnabled) return false;
  const start = hhmmToMinutes(prefs.quietHoursStart);
  const end = hhmmToMinutes(prefs.quietHoursEnd);
  if (start === end) return false;
  const cur = minutesOfDayInTimezone(now, prefs.timezone);
  return start < end ? cur >= start && cur < end : cur >= start || cur < end;
}

export interface DeliveryDecision {
  /** Send the email now. */
  email: boolean;
  /** Why not, when email is false: "channel_none" | "quiet_hours" | "push_only_unavailable". */
  reason: string | null;
}

export function alertDeliveryDecision(
  prefs: Preferences,
  kind: "camera" | "event",
  now: Date,
): DeliveryDecision {
  const channel = kind === "camera" ? prefs.cameraAlertChannel : prefs.eventAlertChannel;
  if (channel === "none") return { email: false, reason: "channel_none" };
  if (isInQuietHours(now, prefs)) return { email: false, reason: "quiet_hours" };
  if (channel === "email" || channel === "both") return { email: true, reason: null };
  // channel === "push": no push delivery exists in master yet (the PWA
  // branch owns it). Suppress rather than fake it.
  return { email: false, reason: "push_only_unavailable" };
}
