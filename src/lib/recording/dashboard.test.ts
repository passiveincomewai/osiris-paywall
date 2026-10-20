import { describe, expect, it } from "vitest";
import {
  assembleLibrary,
  assembleRoster,
  dashboardGateView,
  formatBytes,
  formatClock,
  sessionDetailLine,
  sessionKindLabel,
  sessionPhaseLabel,
  type DashboardClip,
} from "./dashboard";
import type { CaptureSessionView } from "./sessions";

describe("dashboard gate", () => {
  it("VIP gets the room; Pro gets the upsell; free gets the studio lock", () => {
    expect(dashboardGateView({ statusLoaded: false, signedIn: false, tier: "free" })).toBe("loading");
    expect(dashboardGateView({ statusLoaded: true, signedIn: false, tier: "free" })).toBe("signin");
    expect(dashboardGateView({ statusLoaded: true, signedIn: true, tier: "free" })).toBe("locked");
    expect(dashboardGateView({ statusLoaded: true, signedIn: true, tier: "pro" })).toBe("upsell");
    expect(dashboardGateView({ statusLoaded: true, signedIn: true, tier: "vip" })).toBe("ready");
  });
});

const clip = (over: Partial<DashboardClip>): DashboardClip => ({
  id: "clip-1",
  cameraName: "Cam",
  savedCameraId: null,
  startedAt: "2026-10-20T08:00:00.000Z",
  durationSec: 60,
  sizeBytes: 1_000_000,
  mimeType: "video/webm",
  ...over,
});

describe("library assembly", () => {
  it("takes totals from the account aggregate and device bytes from the store", () => {
    const clips = [
      clip({ id: "c3", startedAt: "2026-10-20T10:00:00.000Z" }),
      clip({ id: "c2", startedAt: "2026-10-20T09:00:00.000Z" }),
      clip({ id: "c1", startedAt: "2026-10-20T08:00:00.000Z" }),
    ];
    const lib = assembleLibrary({
      totals: { count: 42, durationSec: 3661, sizeBytes: 123_000_000 },
      clips,
      deviceBytes: 98_500_000,
      newestCount: 2,
    });
    expect(lib.count).toBe(42);
    expect(lib.totalSecs).toBe(3661);
    expect(lib.metaBytes).toBe(123_000_000);
    // The device figure is the IndexedDB store's, not the metadata's.
    expect(lib.deviceBytes).toBe(98_500_000);
    expect(lib.newest.map((c) => c.id)).toEqual(["c3", "c2"]);
  });

  it("an empty library is zeroes, not nulls", () => {
    const lib = assembleLibrary({
      totals: { count: 0, durationSec: 0, sizeBytes: 0 },
      clips: [],
      deviceBytes: 0,
    });
    expect(lib).toMatchObject({ count: 0, totalSecs: 0, deviceBytes: 0, newest: [] });
  });
});

describe("roster assembly", () => {
  const cameras = [
    { id: "cam-a", name: "Alta Canyon", group: "Ski" },
    { id: "cam-b", name: "Harbor", group: "Ungrouped" },
    { id: "cam-c", name: "Never recorded", group: "Ski" },
  ];

  it("joins clips by savedCameraId and finds each camera's latest", () => {
    const clips = [
      clip({ id: "1", savedCameraId: "cam-a", startedAt: "2026-10-19T08:00:00.000Z", durationSec: 30 }),
      clip({ id: "2", savedCameraId: "cam-a", startedAt: "2026-10-20T08:00:00.000Z", durationSec: 95 }),
      clip({ id: "3", savedCameraId: "cam-b", startedAt: "2026-10-18T08:00:00.000Z", durationSec: 12 }),
      // A clip with no saved camera (e.g. a viewer timelapse) joins nothing.
      clip({ id: "4", savedCameraId: null, startedAt: "2026-10-20T09:00:00.000Z", durationSec: 500 }),
    ];
    const roster = assembleRoster(cameras, clips);
    expect(roster[0]).toEqual({
      id: "cam-a", name: "Alta Canyon", group: "Ski",
      clipCount: 2, totalSecs: 125,
      lastRecordedAt: "2026-10-20T08:00:00.000Z", lastDurationSec: 95,
    });
    expect(roster[1]).toMatchObject({ clipCount: 1, lastDurationSec: 12 });
    expect(roster[2]).toEqual({
      id: "cam-c", name: "Never recorded", group: "Ski",
      clipCount: 0, totalSecs: 0, lastRecordedAt: null, lastDurationSec: null,
    });
  });

  it("keeps the roster in the cameras' own order", () => {
    const roster = assembleRoster(cameras, []);
    expect(roster.map((r) => r.id)).toEqual(["cam-a", "cam-b", "cam-c"]);
  });
});

const sessionView = (over: Partial<CaptureSessionView>): CaptureSessionView => ({
  id: "clip:cam-a",
  kind: "clip",
  cameraId: "cam-a",
  cameraName: "Alta Canyon",
  phase: "recording",
  startedAt: 1_000_000,
  frameCount: 0,
  segmentCount: 0,
  bytes: 0,
  misses: 0,
  notice: null,
  ...over,
});

describe("session display lines", () => {
  it("labels kinds and phases plainly", () => {
    expect(sessionKindLabel(sessionView({ kind: "clip" }))).toBe("CLIP");
    expect(sessionKindLabel(sessionView({ kind: "timelapse" }))).toBe("TIMELAPSE");
    expect(sessionPhaseLabel(sessionView({ phase: "starting" }))).toBe("STARTING");
    expect(sessionPhaseLabel(sessionView({ phase: "recording" }))).toBe("RECORDING");
    expect(sessionPhaseLabel(sessionView({ phase: "saving" }))).toBe("SAVING");
  });

  it("a clip session reports segments and banked bytes", () => {
    expect(sessionDetailLine(sessionView({ segmentCount: 12, bytes: 2_500_000 }))).toBe(
      "12 segments · 2.4 MB saved so far",
    );
    expect(sessionDetailLine(sessionView({ segmentCount: 1, bytes: 512 }))).toBe(
      "1 segment · 512 B saved so far",
    );
  });

  it("a timelapse session reports frames kept and missed checks", () => {
    expect(sessionDetailLine(sessionView({ kind: "timelapse", frameCount: 41 }))).toBe("41 frames kept");
    expect(sessionDetailLine(sessionView({ kind: "timelapse", frameCount: 1, misses: 2 }))).toBe(
      "1 frame kept · 2 missed checks",
    );
  });
});

describe("formatting", () => {
  it("formats bytes and clocks the way the dashboard shows them", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(3 * 1024 ** 3)).toBe("3.00 GB");
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(75)).toBe("01:15");
    expect(formatClock(3661)).toBe("1:01:01");
  });
});
