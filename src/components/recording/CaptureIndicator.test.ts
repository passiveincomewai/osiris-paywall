// Render pins for the global capture indicator: a running session must
// be stoppable from anywhere, multi-session state must summarize, and a
// finished session's note must say what happened to the recording.
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { CaptureIndicatorView } from "./CaptureIndicator";
import type { CaptureSessionView, CompletedCapture } from "@/lib/recording/sessions";

const strip = (html: string) => html.replace(/<!-- -->/g, "");

const base = {
  open: false,
  nowMs: 1_000_000 + 65_000,
  onToggle: vi.fn(),
  onStop: vi.fn(),
  onDismissCompleted: vi.fn(),
  completed: null,
};

const clipSession: CaptureSessionView = {
  id: "clip:saved-1", kind: "clip", cameraId: "saved-1", cameraName: "Alta Ski Area",
  phase: "recording", startedAt: 1_000_000, frameCount: 0, segmentCount: 3,
  bytes: 12345, misses: 0, notice: null,
};

const tlSession: CaptureSessionView = {
  id: "tl:cam-2", kind: "timelapse", cameraId: "cam-2", cameraName: "Beach Pier",
  phase: "recording", startedAt: 1_000_000, frameCount: 42, segmentCount: 0,
  bytes: 0, misses: 0, notice: null,
};

describe("CaptureIndicatorView", () => {
  it("renders nothing when nothing is recording and nothing finished", () => {
    const html = renderToString(createElement(CaptureIndicatorView, { ...base, sessions: [] }));
    expect(html).toBe("");
  });

  it("shows one session with its name, elapsed time, and a stop control", () => {
    const html = strip(renderToString(
      createElement(CaptureIndicatorView, { ...base, sessions: [clipSession] }),
    ));
    expect(html).toContain("Alta Ski Area");
    expect(html).toContain("1:05");
    expect(html).toContain("STOP");
    expect(html).toContain("Stop recording Alta Ski Area");
  });

  it("summarizes multiple sessions and lists each with its own stop when open", () => {
    const closed = strip(renderToString(
      createElement(CaptureIndicatorView, { ...base, sessions: [clipSession, tlSession] }),
    ));
    expect(closed).toContain("2 RECORDING");
    const opened = strip(renderToString(
      createElement(CaptureIndicatorView, { ...base, sessions: [clipSession, tlSession], open: true }),
    ));
    expect(opened).toContain("Alta Ski Area");
    expect(opened).toContain("Beach Pier");
    expect(opened).toContain("42 FR");
    expect(opened).toContain("the tab must stay open");
  });

  it("reports a finished session and where the recording went", () => {
    const completed: CompletedCapture = {
      sessionId: "clip:saved-1", kind: "clip", cameraName: "Alta Ski Area",
      reason: "max-duration", endedAt: 2_000_000,
      detail: "Stopped at the 24-hour limit — the clip is in your clips library",
    };
    const html = strip(renderToString(
      createElement(CaptureIndicatorView, { ...base, sessions: [], completed }),
    ));
    expect(html).toContain("Alta Ski Area");
    expect(html).toContain("24-hour limit");
    expect(html).toContain("clips library");
  });
});
