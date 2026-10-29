import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import SensingTool from "./SensingTool";

/**
 * Pins the mode-shell contract Jameson asked for (2026-10-29): WiFi Link
 * is the default mode on EVERY device — it is the first tab and the one
 * rendered selected — and RavenScope is an optional extra, never the
 * default. (The shell's mount effect no longer overrides the mode by
 * viewport width; it only probes for a local RavenScope in the
 * background and marks that tab "detected".)
 */
describe("SensingTool mode shell", () => {
  const html = renderToStaticMarkup(createElement(SensingTool));
  const buttons = html.split("<button").slice(1);

  it("orders the tabs WiFi Link, RavenScope, Camera", () => {
    expect(buttons).toHaveLength(3);
    expect(buttons[0]).toContain("WiFi Link");
    expect(buttons[1]).toContain("RavenScope");
    expect(buttons[2]).toContain("Camera");
  });

  it("renders WiFi Link as the selected tab in the first paint", () => {
    // The active tab carries the highlighted border/background classes.
    expect(buttons[0]).toContain("border-cyan-300/70");
    expect(buttons[1]).not.toContain("border-cyan-300/70");
    expect(buttons[2]).not.toContain("border-cyan-300/70");
    expect(html).toContain('aria-selected="true"');
  });

  it("shows the starting state card shell before hydration", () => {
    expect(html).toContain("STARTING…");
  });
});
