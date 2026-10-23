// Render pin for the teaser card's first paint.
// Node-only renderToString harness, as everywhere here: effects never
// fire, so this pins the guarantee the whole design rests on — the
// card contributes NOTHING to server render / first paint (no layout
// shift, crawlers see today's homepage), whatever its props say. The
// card may only appear later, from effects, once flag + anonymity +
// arm + globe + onboarding gates have all passed.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import TeaserSignupCard from "./TeaserSignupCard";

describe("TeaserSignupCard", () => {
  it("renders nothing on first paint, globe ready or not", () => {
    expect(renderToString(createElement(TeaserSignupCard, { globeReady: true }))).toBe("");
    expect(renderToString(createElement(TeaserSignupCard, { globeReady: false }))).toBe("");
    expect(
      renderToString(createElement(TeaserSignupCard, { globeReady: true, isMobile: true })),
    ).toBe("");
  });
});
