// ── Alert delivery decisions (items 13 + 14) ────────────────────────
// One pure decision used by both alert checkers (camera + event):
// should this alert go out, and by which channels? Rules: channel
// "none" suppresses everything; quiet hours suppress in the USER's
// timezone; "push" and "both" include the browser-push channel
// (src/lib/push) alongside or instead of email. The decision only
// says the user WANTS push — the send itself is inert until VAPID
// keys are configured, and the checkers fail closed on push (never
// reroute a push-only alert to email silently).

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
  /** Send a browser push now (inert until VAPID keys are configured). */
  push: boolean;
  /** Why not, when a channel is off: "channel_none" | "quiet_hours" | "push_only". */
  reason: string | null;
}

export function alertDeliveryDecision(
  prefs: Preferences,
  kind: "camera" | "event",
  now: Date,
): DeliveryDecision {
  const channel = kind === "camera" ? prefs.cameraAlertChannel : prefs.eventAlertChannel;
  if (channel === "none") return { email: false, push: false, reason: "channel_none" };
  if (isInQuietHours(now, prefs)) return { email: false, push: false, reason: "quiet_hours" };
  if (channel === "email") return { email: true, push: false, reason: null };
  if (channel === "both") return { email: true, push: true, reason: null };
  // channel === "push": push only — email stays off, exactly as the
  // settings copy promises ("we never silently reroute them").
  return { email: false, push: true, reason: "push_only" };
}
