/**
 * Mobile layout contract for the picker's per-card embed controls.
 *
 * Regression (2026-10-28): on a phone the control row — size select
 * (which sizes to its longest option label), snippet code box, and
 * the Copy button — sat in a single nowrap flex row wider than the
 * card, so the Copy button was pushed past the card's edge and
 * clipped by the page's overflow-x guard. The row must wrap, the
 * select must be allowed to shrink, and the code box must drop to
 * its own full-width row on small screens (returning to the middle
 * of the single row from sm up). Rendered with react-dom/server:
 * this pins the static classes that produce that layout.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import EmbedSnippet from "./EmbedSnippet";

const EMBED_URL = "https://worldeye.app/embed/camera/cam-1";

function render() {
  return renderToStaticMarkup(
    createElement(EmbedSnippet, {
      cameraId: "cam-1",
      name: "I-80 at Parleys Summit",
      embedUrl: EMBED_URL,
      showPreview: false,
    }),
  );
}

describe("EmbedSnippet control row (mobile)", () => {
  it("wraps instead of overflowing the card", () => {
    expect(render()).toContain("flex-wrap");
  });

  it("lets the size select shrink and caps it at the row width", () => {
    const html = render();
    expect(html).toContain("min-w-0");
    expect(html).toContain("max-w-full");
  });

  it("drops the code box to its own full-width row on small screens only", () => {
    const html = render();
    expect(html).toContain("order-3");
    expect(html).toContain("w-full");
    expect(html).toContain("sm:flex-1");
    expect(html).toContain("sm:order-none");
  });

  it("shows the responsive snippet by default, so a copied embed fits a phone", () => {
    const html = render();
    // The snippet is a text node in the code box, so SSR escapes its
    // quotes — assert the escaped form of the width attribute.
    expect(html).toContain("width=&quot;100%&quot;");
    expect(html).toContain("aspect-ratio:16/9");
  });
});
