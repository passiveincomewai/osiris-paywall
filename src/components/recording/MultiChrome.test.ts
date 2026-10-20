// Render pins for the multi-record page's chrome: the sign-in gate must
// read as a gate (not the recorder), and the control bar must show the
// 20-cap and live session counts a Pro user steers by. The locked view
// itself is the studio's shared UpgradeScreen, exercised elsewhere.
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { MultiControlBar, MultiSignInPrompt } from "./MultiChrome";

const strip = (html: string) => html.replace(/<!-- -->/g, "");

describe("MultiSignInPrompt", () => {
  it("gates signed-out visitors with a sign-in, never the recorder", () => {
    const html = strip(renderToString(createElement(MultiSignInPrompt)));
    expect(html).toContain("Sign in to record multiple cameras");
    expect(html).toContain("WorldEye Pro feature");
    expect(html).toContain("/api/auth/signin?callbackUrl=/recording/multi");
    expect(html).not.toContain("RECORD ALL");
  });
});

describe("MultiControlBar", () => {
  const base = {
    selected: 3,
    recording: 0,
    saving: 0,
    errors: 0,
    sessionElapsed: 0,
    canRecord: true,
    onRecordAll: vi.fn(),
    onStopAll: vi.fn(),
  };

  it("shows the cap and a record-all affordance when idle", () => {
    const html = strip(renderToString(createElement(MultiControlBar, base)));
    expect(html).toContain("3</span>/20 selected");
    expect(html).toContain("RECORD ALL");
    expect(html).toContain("STOP ALL");
    expect(html).not.toContain("recording ·");
  });

  it("shows live counts, the session timer and tile errors while recording", () => {
    const html = strip(
      renderToString(
        createElement(MultiControlBar, {
          ...base,
          selected: 20,
          recording: 2,
          saving: 1,
          errors: 1,
          sessionElapsed: 75,
        }),
      ),
    );
    expect(html).toContain("20</span>/20 selected");
    expect(html).toContain("2 recording · 01:15");
    expect(html).toContain("saving 1…");
    expect(html).toContain("1 tile needs attention");
  });
});
