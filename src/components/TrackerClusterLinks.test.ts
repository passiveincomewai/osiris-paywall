// Render pins for the tracker-cluster cross-link block (SEO item 6).
// The block exists so the seven tracker pages link to each other in body
// content as one cluster; these pin the full destination set, the claim
// discipline (free globe, no invented stats) and that a page never links
// to itself from the block.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import TrackerClusterLinks, { TRACKER_CLUSTER_LINKS } from "./TrackerClusterLinks";

const render = (current?: string) =>
  renderToString(createElement(TrackerClusterLinks, { current })).replace(
    /<!-- -->/g,
    "",
  );

describe("TrackerClusterLinks", () => {
  it("links the full seven-tracker cluster when no current page is given", () => {
    const html = render();
    expect(TRACKER_CLUSTER_LINKS).toHaveLength(7);
    for (const l of TRACKER_CLUSTER_LINKS) {
      expect(html).toContain(`href="${l.href}"`);
      expect(html).toContain(l.label);
    }
    expect(html).toContain("one live map");
  });

  it("omits the host page from its own block", () => {
    const html = render("/weather-tracker");
    expect(html).not.toContain('href="/weather-tracker"');
    expect(html).toContain('href="/live-flight-tracker"');
    expect(html).toContain('href="/space-station-tracker"');
  });

  it("keeps the copy to the free-globe claim — no counts, no prices", () => {
    const html = render();
    expect(html).toContain("same free 3D globe");
    expect(html).not.toMatch(/74,229|\$\d|signup/i);
  });
});
