// Content-calendar helpers (spec §10): pure functions for StudioPost
// scheduling — ICS export and reminder due-calculation. Kept DOM- and
// DB-free so the rules are unit-testable.

export const POST_PLATFORMS = [
  "tiktok",
  "instagram",
  "youtube",
  "facebook",
  "x",
  "threads",
  "snapchat",
  "linkedin",
  "pinterest",
] as const;

export type PostPlatform = (typeof POST_PLATFORMS)[number];

/** Reminder offsets the UI offers, in minutes before the post time. */
export const REMINDER_OFFSETS = [1440, 120, 30] as const;

export function reminderLabel(offsetMin: number): string {
  if (offsetMin >= 1440) return `${Math.round(offsetMin / 1440)} day before`;
  if (offsetMin >= 60) return `${Math.round(offsetMin / 60)} hours before`;
  return `${offsetMin} minutes before`;
}

/** Offsets due for a post at `now`, excluding ones already delivered. */
export function dueReminderOffsets(
  scheduledAt: Date,
  offsetsMin: number[],
  alreadyReminded: number[],
  now: Date,
): number[] {
  return offsetsMin.filter(
    (off) =>
      !alreadyReminded.includes(off) &&
      now.getTime() >= scheduledAt.getTime() - off * 60_000,
  );
}

function icsEscape(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** A single-event .ics the affiliate can drop into any calendar app. */
export function buildIcs(opts: {
  uid: string;
  title: string;
  description: string;
  start: Date;
  url?: string | null;
}): string {
  const end = new Date(opts.start.getTime() + 15 * 60_000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WorldEye Studio//Content Calendar//EN",
    "BEGIN:VEVENT",
    `UID:${opts.uid}@worldeye.app`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(opts.start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsEscape(opts.title)}`,
    `DESCRIPTION:${icsEscape(opts.description)}`,
    ...(opts.url ? [`URL:${opts.url}`] : []),
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Time to post",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}
