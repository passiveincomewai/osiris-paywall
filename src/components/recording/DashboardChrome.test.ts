// Render pins for the recording dashboard's chrome: a Pro user must see
// the VIP upsell (never the room), the sign-in gate must read as a gate,
// and a live session card must show its real progress + a stop control.
// The ready room itself is assembled from lib/recording/dashboard,
// exercised by that module's tests.
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { DashboardSignInPrompt, SessionCard, VipUpsell } from "./DashboardChrome";
import type { CaptureSessionView } from "@/lib/recording/sessions";

const strip = (html: string) => html.replace(/<!-- -->/g, "");

describe("DashboardSignInPrompt", () => {
  it("gates signed-out visitors with a sign-in, never the room", () => {
    const html = strip(renderToString(createElement(DashboardSignInPrompt)));
    expect(html).toContain("Sign in to open the recording dashboard");
    expect(html).toContain("VIP Pro feature");
    expect(html).toContain("/api/auth/signin?callbackUrl=/recording/dashboard");
    expect(html).not.toContain("Recording now");
  });
});

describe("VipUpsell", () => {
  it("sells the VIP room to a Pro user and routes the switch in-house", () => {
    const html = strip(renderToString(createElement(VipUpsell)));
    expect(html).toContain("VIP PRO FEATURE");
    expect(html).toContain("Record up to 40 cameras at once");
    expect(html).toContain("Recording dashboard");
    // The switch is the in-house subscription page, not a fresh checkout.
    expect(html).toContain('href="/settings/subscription"');
    expect(html).toContain("Switch to VIP Pro");
    expect(html).not.toContain("RECORD ALL");
  });
});

describe("SessionCard", () => {
  const session: CaptureSessionView = {
    id: "clip:cam-a",
    kind: "clip",
    cameraId: "cam-a",
    cameraName: "Alta Canyon",
    phase: "recording",
    startedAt: 1_000_000,
    frameCount: 0,
    segmentCount: 12,
    bytes: 2_500_000,
    misses: 0,
    notice: null,
  };

  it("shows the session's real progress and a stop control", () => {
    const html = strip(
      renderToString(createElement(SessionCard, { session, elapsedSec: 75, onStop: vi.fn() })),
    );
    expect(html).toContain("Alta Canyon");
    expect(html).toContain("CLIP");
    expect(html).toContain("RECORDING · 01:15");
    expect(html).toContain("12 segments · 2.4 MB saved so far");
    expect(html).toContain("Stop &amp; save");
  });

  it("surfaces a session notice instead of hiding it", () => {
    const html = strip(
      renderToString(
        createElement(SessionCard, {
          session: { ...session, kind: "timelapse", frameCount: 3, misses: 2, notice: "Camera is answering slowly" },
          elapsedSec: 9,
          onStop: vi.fn(),
        }),
      ),
    );
    expect(html).toContain("TIMELAPSE");
    expect(html).toContain("3 frames kept · 2 missed checks");
    expect(html).toContain("Camera is answering slowly");
  });
});
