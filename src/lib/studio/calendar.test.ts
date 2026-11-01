import { describe, it, expect } from "vitest";
import { buildIcs, dueReminderOffsets, reminderLabel } from "./calendar";

describe("dueReminderOffsets", () => {
  const start = new Date("2026-11-10T15:00:00Z");
  it("returns offsets whose time has come, excluding delivered ones", () => {
    const now = new Date("2026-11-10T14:45:00Z");
    expect(dueReminderOffsets(start, [1440, 120, 30], [], now)).toEqual([1440, 120, 30]);
    expect(dueReminderOffsets(start, [1440, 120, 30], [1440, 120], now)).toEqual([30]);
  });
  it("returns nothing before the earliest offset", () => {
    const now = new Date("2026-11-08T14:00:00Z");
    expect(dueReminderOffsets(start, [1440, 120, 30], [], now)).toEqual([]);
  });
  it("labels read naturally", () => {
    expect(reminderLabel(1440)).toContain("day");
    expect(reminderLabel(120)).toContain("hours");
    expect(reminderLabel(30)).toContain("minutes");
  });
});

describe("buildIcs", () => {
  it("produces a valid single-event calendar with escaping", () => {
    const ics = buildIcs({
      uid: "post1",
      title: "Post to tiktok; bring caption, link",
      description: "Line one\nLine two",
      start: new Date("2026-11-10T15:00:00Z"),
      url: "https://worldeye.app/affiliates/studio/calendar",
    });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("UID:post1@worldeye.app");
    expect(ics).toContain("DTSTART:20261110T150000Z");
    expect(ics).toContain("tiktok\\; bring caption\\, link");
    expect(ics).toContain("Line one\\nLine two");
    expect(ics).toContain("BEGIN:VALARM");
  });
});
