/**
 * Aurora alert email — the one message a subscription can produce per
 * night. Rendered in the house shell (lib/email), copy held to the
 * same honesty standard as the northern-lights page: a forecast is a
 * reason to look, never a promise of a sighting.
 */
import { appUrl, escapeHtml, shell } from "@/lib/email";
import { formatKp, kpToGScale } from "./logic";

export function auroraAlertEmail(input: {
  name: string | null;
  placeName: string;
  /** Human label of the night, e.g. "Saturday, October 24". */
  nightLabel: string;
  tonightKp: number;
  requiredKp: number;
}): { subject: string; html: string } {
  const first = input.name?.trim().split(/\s+/)[0];
  const g = kpToGScale(input.tonightKp);
  const subject = `Aurora likely tonight over ${input.placeName} — Kp ${formatKp(input.tonightKp)} forecast`;
  const body = `
<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#d4d4d8;">${first ? `Hi ${escapeHtml(first)} — ` : ""}NOAA's Space Weather Prediction Center forecasts Kp <strong style="color:#fff;">${formatKp(input.tonightKp)}</strong>${g ? ` (a ${g} geomagnetic storm)` : ""} during tonight's dark hours over <strong style="color:#fff;">${escapeHtml(input.placeName)}</strong> — at or above the Kp ${formatKp(input.requiredKp)} a display there usually needs.</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#d4d4d8;">Worth a look on the cameras tonight, ${escapeHtml(input.nightLabel)} — and worth stepping outside if you're there. Two honest caveats: the aurora also needs a clear, dark sky, which no Kp index can promise; and forecasts this far ahead can strengthen, fade, or shift by a few hours.</p>
<p style="margin:0;font-size:13px;line-height:1.6;color:#a1a1aa;">You subscribed to aurora alerts for ${escapeHtml(input.placeName)} on WorldEye. One email per night per place, only when the forecast crosses your place's level. Manage or unsubscribe from the northern lights page. Forecast data: NOAA SWPC.</p>`;
  return {
    subject,
    html: shell(escapeHtml(subject), `Kp ${formatKp(input.tonightKp)} forecast over ${escapeHtml(input.placeName)} tonight`, body, {
      label: "Watch the aurora cameras",
      href: appUrl("/northern-lights-webcams"),
    }, { why: "You're receiving this because aurora alerts are on for a place you follow on WorldEye." }),
  };
}
