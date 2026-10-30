// Render smoke test (node-only harness, no DOM): the popup is an
// event-driven overlay — it can only open after NewsletterForm reports
// a subscribe in a live browser — so the invariant a server render can
// pin is that it renders NOTHING on its own: never on page load, and
// never when the Google provider is unconfigured. The show/dismiss
// rules themselves are pinned in lib/newsletter/popup.test.ts.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import NewsletterAccountPopup from "./NewsletterAccountPopup";

describe("NewsletterAccountPopup", () => {
  it("renders nothing until a subscribe event opens it", () => {
    expect(
      renderToString(createElement(NewsletterAccountPopup, { googleEnabled: true })),
    ).toBe("");
    expect(
      renderToString(createElement(NewsletterAccountPopup, { googleEnabled: false })),
    ).toBe("");
  });
});
