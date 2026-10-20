// Render smoke test: the harness is node-only (no DOM), and the card's
// visibility depends on localStorage it can only read in an effect — so
// the invariant a server render can pin is the important one: it renders
// NOTHING until the device's record has been read (no flash of the ask
// at visitors who already dismissed or subscribed). The show/hide rules
// themselves are pinned in lib/newsletter/capture.test.ts.
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
});
