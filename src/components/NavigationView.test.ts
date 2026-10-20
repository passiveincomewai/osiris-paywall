// Render pins for NavigationView's no-fix states (node-only harness,
// renderToString — same pattern as the other component tests).
//
// The bug these pin: the banner used to say "navigation needs HTTPS
// or localhost" for EVERY position failure, because the parent's
// watch swallowed all errors and this view had exactly one message.
// On the HTTPS production site that sent drivers hunting for a
// protocol problem when the real cause was a denied permission.
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import NavigationView, { type NavRoute } from "./NavigationView";
import { classifyGeoError } from "@/lib/geo-position";
import type { NavFix } from "@/lib/navigation";

const ROUTE: NavRoute = {
  distance: 12_000,
  duration: 900,
  geometry: {
    type: "LineString",
    coordinates: [
      [-111.97, 41.32],
      [-111.95, 41.31],
      [-111.93, 41.30],
    ],
  },
  steps: [
    { instruction: "Drive southeast on East 3200 North.", distance: 800, duration: 90, location: [-111.97, 41.32], type: "depart" },
    { instruction: "Turn left onto Powder Mountain Road.", distance: 4000, duration: 300, location: [-111.95, 41.31], type: "turn-left" },
    { instruction: "You have arrived.", distance: 0, duration: 0, location: [-111.93, 41.30], type: "arrive" },
  ],
};

const render = (fix: NavFix | null, positionIssue?: ReturnType<typeof classifyGeoError> | null) =>
  renderToString(
    createElement(NavigationView, {
      route: ROUTE,
      destinationLabel: "Powder Mountain Ski Resort",
      fix,
      onExit: vi.fn(),
      onReroute: vi.fn(),
      positionIssue: positionIssue ?? null,
      onRetryPosition: vi.fn(),
    }),
  ).replace(/<!-- -->/g, "");

describe("NavigationView without a fix", () => {
  it("a denied permission names its real remedy, with a retry", () => {
    const html = render(null, classifyGeoError({ code: 1 }, { secureContext: true }));
    expect(html).toContain("Location is off for this site");
    expect(html).toContain("site settings");
    expect(html).toContain("Try again");
    expect(html).not.toContain("needs HTTPS");
  });

  it("a plain wait blames nothing — and labels itself a preview, not navigation", () => {
    const html = render(null, null);
    expect(html).toContain("Waiting for a position fix");
    expect(html).not.toContain("HTTPS");
    expect(html).toContain("not live navigation yet");
  });

  it("a timeout says the device is still looking", () => {
    const html = render(null, classifyGeoError({ code: 3 }, { secureContext: true }));
    expect(html).toContain("Position is taking a long time");
  });

  it("an insecure context is the one place HTTPS is mentioned — and retry is not offered", () => {
    const html = render(null, classifyGeoError({ code: 1 }, { secureContext: false }));
    expect(html).toContain("secure connection");
    expect(html).not.toContain("Try again");
  });

  it("the error states label the fallback as a start-point preview", () => {
    const html = render(null, classifyGeoError({ code: 2 }, { secureContext: true }));
    expect(html).toContain("preview from the route’s start point");
    expect(html).toContain("live turn-by-turn begins when your position is available");
  });
});

describe("NavigationView with a fix", () => {
  it("shows no waiting or error banner", () => {
    const html = render({ lat: 41.32, lng: -111.97 }, classifyGeoError({ code: 1 }));
    expect(html).not.toContain("Waiting for a position fix");
    expect(html).not.toContain("Location is off for this site");
  });
});
