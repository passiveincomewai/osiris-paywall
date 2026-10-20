// Render pins for the RouteCameras panel (node-only harness,
// renderToString — same pattern as the other component tests).
//
// The gate is the contract under test: subscribers get the feeds,
// everyone else gets the locked teaser — the route's honest camera
// count when the corridor produced one, the trial picker either way,
// and never a rendered feed. An empty corridor says so to Pro and
// stays generic for free.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import RouteCameras from "./RouteCameras";
import type { RouteCameraCandidate } from "@/lib/route-cameras";

const GEOMETRY = {
  coordinates: [
    [-112.0, 41.32],
    [-111.9, 41.32],
    [-111.8, 41.32],
  ] as [number, number][],
};

const mNorth = (m: number) => m / 111_320;

const CAMERAS: RouteCameraCandidate[] = [
  {
    id: "cam-a", name: "E 3200 N & Washington", city: "North Ogden", source: "UDOT",
    lat: 41.32, lng: -111.97, stream_type: "jpg", feed_url: "https://example.com/a.jpg",
  },
  {
    id: "cam-b", name: "Powder Mountain Rd", city: "Eden",
    lat: 41.32 + mNorth(800), lng: -111.85, stream_type: "jpg", feed_url: "https://example.com/b.jpg",
  },
  {
    id: "cam-far", name: "Far away", lat: 41.32 + mNorth(9_000), lng: -111.9,
    stream_type: "jpg", feed_url: "https://example.com/far.jpg",
  },
];

const render = (over: Partial<Parameters<typeof RouteCameras>[0]> = {}) =>
  renderToString(
    createElement(RouteCameras, {
      geometry: GEOMETRY,
      cameras: CAMERAS,
      catalogueSettled: true,
      isPro: true,
      ...over,
    }),
  ).replace(/<!-- -->/g, "");

describe("RouteCameras for subscribers", () => {
  it("renders the corridor feeds in route order, with names and progress", () => {
    const html = render();
    expect(html).toContain('data-route-camera="cam-a"');
    expect(html).toContain('data-route-camera="cam-b"');
    expect(html.indexOf('data-route-camera="cam-a"')).toBeLessThan(
      html.indexOf('data-route-camera="cam-b"'),
    );
    expect(html).toContain("E 3200 N &amp; Washington");
    expect(html).toContain("along the route");
    expect(html).not.toContain('data-route-camera="cam-far"');
    expect(html).not.toContain("Pro feature");
  });

  it("an empty corridor is an honest empty state", () => {
    const html = render({ cameras: [] });
    expect(html).toContain("No cameras along this route");
    expect(html).not.toContain("data-route-camera");
  });

  it("an unsettled catalogue says it is still looking, not that there are none", () => {
    const html = render({ cameras: [], catalogueSettled: false });
    expect(html).toContain("Looking for cameras along your route");
    expect(html).not.toContain("No cameras along this route");
  });
});

describe("RouteCameras for free visitors", () => {
  it("locks the feeds: honest count + trial picker, no feed rendered", () => {
    const html = render({ isPro: false });
    expect(html).toContain("cameras sit along this route");
    expect(html).toContain("Pro feature");
    expect(html).toContain("data-trial-picker");
    expect(html).not.toContain("data-route-camera");
    expect(html).not.toContain("example.com/a.jpg");
  });

  it("an empty corridor keeps the teaser generic — no borrowed count", () => {
    const html = render({ isPro: false, cameras: [] });
    expect(html).toContain("Live camera feeds along your route are a Pro feature.");
    expect(html).not.toContain("No cameras along this route");
    expect(html).not.toContain("data-route-camera");
  });
});

describe("RouteCameras without a route", () => {
  it("renders nothing", () => {
    expect(render({ geometry: null })).toBe("");
    expect(render({ geometry: { coordinates: [] } })).toBe("");
  });
});
