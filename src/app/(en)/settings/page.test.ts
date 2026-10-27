// Render pin for the settings page shell: it must carry .docs-root, which
// releases the global viewport lock (html/body overflow:hidden for the
// fullscreen globe). Without it the page is clipped to the first screen —
// the change-password form and its submit button sit below the fold on a
// phone and can never be reached.
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import SettingsPage from "./page";

describe("SettingsPage", () => {
  it("renders inside a .docs-root shell so the document scrolls", () => {
    const html = renderToString(SettingsPage()).replace(/<!-- -->/g, "");
    expect(html).toContain("docs-root");
  });
});
