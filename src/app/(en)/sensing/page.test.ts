import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import SensingPage, { metadata } from "./page";

describe("/sensing page (public free tool)", () => {
  const html = renderToStaticMarkup(createElement(SensingPage));

  it("is a normal indexable tool page (no noindex — it is in the tools menu and sitemap)", () => {
    expect(metadata.robots).toBeUndefined();
    expect(metadata.alternates?.canonical).toBe("/sensing");
    expect(metadata.title).toContain("Free");
  });

  it("names all three real modes", () => {
    expect(html).toContain("RavenScope");
    expect(html).toContain("WiFi Link");
    expect(html).toContain("Camera");
  });

  it("marks the tool free with no account or plan gate in copy", () => {
    expect(html).toContain("Free to use");
    expect(html).toContain("no account, no plan");
  });

  it("states the limits plainly: motion/disturbance only, still person reads as still", () => {
    expect(html).toContain("perfectly still");
    expect(html).toContain("cannot count people");
  });

  it("states the camera privacy model: processed on-device, never uploaded", () => {
    expect(html).toContain("never");
    expect(html).toContain("uploaded");
  });

  it("carries the RavenScope MIT attribution", () => {
    expect(html).toContain("RavenScope");
    expect(html).toContain("MIT License");
  });

  it("makes no through-wall, accuracy or medical claims and offers no simulated mode", () => {
    const lower = html.toLowerCase();
    for (const banned of ["through-wall", "through walls", "fall detection", "heart rate monitoring", "100%", "clinically", "simulated feed", "simulation mode"]) {
      expect(lower).not.toContain(banned);
    }
  });
});
