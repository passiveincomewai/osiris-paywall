// Render smoke test: the harness is node-only (no DOM), and the timed
// placements' visibility depends on localStorage they can only read in
// an effect — so the invariant a server render can pin is the important
// one: they render NOTHING until the device's record has been read (no
// flash of the ask at visitors who already dismissed or subscribed).
// The page placement is the opposite invariant: static page furniture
// renders in full on the server. The show/hide rules themselves are
// pinned in lib/newsletter/capture.test.ts.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import EmailCaptureCard from "./EmailCaptureCard";

describe("EmailCaptureCard", () => {
  it("renders nothing before the device record is read (both placements)", () => {
    expect(renderToString(createElement(EmailCaptureCard, { placement: "camera" }))).toBe("");
    expect(renderToString(createElement(EmailCaptureCard, { placement: "pricing" }))).toBe("");
    expect(
      renderToString(createElement(EmailCaptureCard, { placement: "pricing", variant: "inline" })),
    ).toBe("");
  });

  it("renders the page placement immediately — it is page furniture, not a timed ask", () => {
    const html = renderToString(
      createElement(EmailCaptureCard, { placement: "page", variant: "inline" }),
    );
    expect(html).toContain("One email when the sky does something big");
    expect(html).toContain("Email updates");
    // No dismiss control: a static section is not dismissed like a card.
    expect(html).not.toContain("Dismiss");
  });
});
