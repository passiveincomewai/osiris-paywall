/**
 * Render contract for the public embed player: the attribution the
 * free embed exists to carry must be IN the rendered HTML — the
 * agency credit line, the camera name linking back to the camera on
 * WorldEye, and the POWERED BY WORLDEYE mark linking to the homepage.
 * If any of these disappear, the embed has silently gone white-label
 * and this test is the alarm. Rendered with react-dom/server (node
 * env): effects don't run, so this pins the static chrome, which is
 * exactly the part that must never be removable.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PublicCameraPlayer from "./PublicCameraPlayer";
import type { PublicEmbedCamera } from "@/lib/embed/public";

const ORIGIN = "https://worldeye.app";

function cam(over: Partial<PublicEmbedCamera>): PublicEmbedCamera {
  return {
    id: "cam-1",
    name: "I-80 at Parleys Summit",
    city: "Park City",
    country: "United States",
    lat: 40.6,
    lng: -111.5,
    source: "UDOT",
    streamUrl: null,
    streamType: null,
    snapshotUrl: `${ORIGIN}/api/cctv/frame?id=cam-1`,
    attribution: "Utah Department of Transportation via WorldEye",
    basis: "US public-agency traveller-information feed — CLEAR.",
    ...over,
  };
}

describe("PublicCameraPlayer rendered HTML", () => {
  it("carries the Powered by WorldEye mark, linked to the homepage", () => {
    const html = renderToStaticMarkup(createElement(PublicCameraPlayer, { cam: cam({}) }));
    expect(html).toContain("POWERED BY");
    expect(html).toContain("WORLDEYE");
    expect(html).toContain(`href="${ORIGIN}"`);
  });

  it("carries the agency attribution line", () => {
    const html = renderToStaticMarkup(createElement(PublicCameraPlayer, { cam: cam({}) }));
    expect(html).toContain("Utah Department of Transportation via WorldEye");
    expect(html).toContain("Park City, United States");
  });

  it("links the camera name back to the camera on WorldEye", () => {
    const html = renderToStaticMarkup(createElement(PublicCameraPlayer, { cam: cam({}) }));
    expect(html).toContain(`href="${ORIGIN}/?camera=cam-1"`);
    expect(html).toContain("I-80 at Parleys Summit");
  });

  it("plays the still through WorldEye's frame route, not the raw feed", () => {
    const html = renderToStaticMarkup(createElement(PublicCameraPlayer, { cam: cam({}) }));
    expect(html).toContain(`${ORIGIN}/api/cctv/frame?id=cam-1`);
    expect(html).toContain("<img");
  });

  it("stacks the caption on narrow frames so the mark never squeezes the name out", () => {
    // Regression (mobile): in a phone-width frame the caption was one
    // row — name block vs the shrink-0 POWERED BY mark — and the name
    // truncated to a sliver. The caption must stack below sm and only
    // go side-by-side from sm up, with the mark present either way.
    const html = renderToStaticMarkup(createElement(PublicCameraPlayer, { cam: cam({}) }));
    expect(html).toContain("flex-col");
    expect(html).toContain("sm:flex-row");
    expect(html).toContain("POWERED BY");
    expect(html).toContain("I-80 at Parleys Summit");
  });

  it("keeps the attribution chrome on an HLS-only camera too", () => {
    const html = renderToStaticMarkup(
      createElement(PublicCameraPlayer, {
        cam: cam({
          snapshotUrl: null,
          streamUrl: "https://udot.example/cam1.m3u8",
          streamType: "hls",
        }),
      }),
    );
    expect(html).toContain("<video");
    expect(html).toContain("POWERED BY");
    expect(html).toContain("Utah Department of Transportation via WorldEye");
    expect(html).toContain(`href="${ORIGIN}/?camera=cam-1"`);
  });
});
