// Render pins for the tracker-cluster cross-link block (SEO item 6;
// v2 cluster chunk C5). The block exists so the nine tracker pages
// link to each other in body content as one cluster; these pin the
// full destination set (hurricanes + tornadoes joined in v2), the
// claim discipline (free globe, no invented stats), that a page never
// links to itself from the block, and that each host renders its own
// topic lead instead of v1's identical intro.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import TrackerClusterLinks, {
  TRACKER_CLUSTER_LINKS,
  trackerClusterLead,
} from "./TrackerClusterLinks";

const render = (current?: string) =>
  renderToString(createElement(TrackerClusterLinks, { current })).replace(
    /<!-- -->/g,
    "",
  );

describe("TrackerClusterLinks", () => {
  it("links the full nine-tracker cluster when no current page is given", () => {
    const html = render();
    expect(TRACKER_CLUSTER_LINKS).toHaveLength(9);
    for (const l of TRACKER_CLUSTER_LINKS) {
      expect(html).toContain(`href="${l.href}"`);
      expect(html).toContain(l.label);
    }
    expect(html).toContain("one live map");
    expect(html).toContain('href="/hurricane-tracker"');
    expect(html).toContain('href="/tornado-tracker"');
  });

  it("omits the host page from its own block", () => {
    const html = render("/weather-tracker");
    expect(html).not.toContain('href="/weather-tracker"');
    expect(html).toContain('href="/live-flight-tracker"');
    expect(html).toContain('href="/space-station-tracker"');
    const hurricane = render("/hurricane-tracker");
    expect(hurricane).not.toContain('href="/hurricane-tracker"');
    expect(hurricane).toContain('href="/tornado-tracker"');
  });

  it("keeps the copy to the free-globe claim — no counts, no prices", () => {
    const html = render();
    expect(html).toContain("same free 3D globe");
    expect(html).not.toMatch(/74,229|\$\d|signup/i);
    for (const l of TRACKER_CLUSTER_LINKS) {
      expect(l.lead).toContain("free");
      expect(l.lead).not.toMatch(/74,229|\$\d|signup/i);
    }
  });

  it("renders a host-specific lead composed from the host's own topic", () => {
    const ship = render("/ship-tracker");
    expect(ship).toContain("Live vessel traffic is one layer of this globe");
    const flight = render("/live-flight-tracker");
    expect(flight).toContain("carries live flights");
    // No two hosts share a lead, and none falls back to the generic one.
    const leads = TRACKER_CLUSTER_LINKS.map((l) => trackerClusterLead(l.href));
    expect(new Set(leads).size).toBe(TRACKER_CLUSTER_LINKS.length);
    for (const l of TRACKER_CLUSTER_LINKS) {
      expect(render(l.href)).toContain(l.lead);
    }
    expect(trackerClusterLead(undefined)).toBeNull();
    expect(trackerClusterLead("/cyber-threat-map")).toBeNull();
  });

  it("keeps the intel family out of the cluster (deliberate, §5.4)", () => {
    const hrefs = TRACKER_CLUSTER_LINKS.map((l) => l.href);
    expect(hrefs).not.toContain("/cyber-threat-map");
  });
});
