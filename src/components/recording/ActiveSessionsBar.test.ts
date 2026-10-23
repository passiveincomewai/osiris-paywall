// Render pins for the "Recording now" bar: sessions started elsewhere
// must be visible and stoppable on the walls and the overview, with
// their real health (frames kept, missed checks) — the disconnect
// where the pill said "6 RECORDING" and the wall showed one camera.
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { ActiveSessionsBarView } from "./ActiveSessionsBar";
import type { CaptureSessionView } from "@/lib/recording/sessions";

const strip = (html: string) => html.replace(/<!-- -->/g, "");

const tl: CaptureSessionView = {
  id: "tl:cam-9", kind: "timelapse", cameraId: "cam-9", cameraName: "Rifle Snapshot",
  phase: "recording", startedAt: 1_000_000, frameCount: 7, segmentCount: 0,
  bytes: 0, misses: 2, lastFrameAt: 1_000_000, notice: null,
};

const clip: CaptureSessionView = {
  id: "clip:saved-1", kind: "clip", cameraId: "saved-1", cameraName: "Parachute Live",
  phase: "recording", startedAt: 1_000_000, frameCount: 0, segmentCount: 12,
  bytes: 2048, misses: 0, notice: null,
};

describe("ActiveSessionsBarView", () => {
  it("renders nothing when no session runs", () => {
    const html = renderToString(
      createElement(ActiveSessionsBarView, {
        sessions: [], nowMs: 1_060_000, title: "Recording now", onStop: vi.fn(),
      }),
    );
    expect(html).toBe("");
  });

  it("shows every running session with kind, health and a stop control", () => {
    const html = strip(renderToString(
      createElement(ActiveSessionsBarView, {
        sessions: [tl, clip], nowMs: 1_060_000, title: "Recording now", onStop: vi.fn(),
      }),
    ));
    expect(html).toContain("Recording now · 2");
    expect(html).toContain("Rifle Snapshot");
    expect(html).toContain("TIMELAPSE");
    expect(html).toContain("7 frames kept");
    expect(html).toContain("2 missed checks");
    expect(html).toContain("Parachute Live");
    expect(html).toContain("CLIP");
    expect(html).toContain("STOP");
  });

  it("names a stale timelapse instead of dressing it as healthy", () => {
    const stale: CaptureSessionView = {
      ...tl, misses: 0, lastFrameAt: 1_000_000,
    };
    const html = strip(renderToString(
      createElement(ActiveSessionsBarView, {
        sessions: [stale], nowMs: 1_000_000 + 26 * 60_000, title: "Recording now", onStop: vi.fn(),
      }),
    ));
    expect(html).toContain("no new frame for 26m");
  });
});
