// Render pins for the Layers panel's Pro upgrade embed (node-only
// renderToString harness): the pitch, the premium-layer chips it was
// handed, the plan mini-choice in pricing's words, the CTA naming the
// selected plan's trial, the hosted option — and no fake wallet
// button: the only purchase control is the upgrade button that opens
// the checkout sheet (which starts closed, so nothing of it renders).
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import ProUpgradeEmbed from "./ProUpgradeEmbed";
import { HOSTED_CHECKOUT_LABEL } from "./HostedCheckoutLink";

const render = (premiumLabels: string[]) =>
  renderToString(createElement(ProUpgradeEmbed, { premiumLabels }))
    .replace(/<!-- -->/g, "")
    .replace(/&#x27;/g, "'");

describe("ProUpgradeEmbed", () => {
  it("pitches Pro in one line with the premium layers as chips", () => {
    const html = render(["Maritime Lines", "Traffic"]);
    expect(html).toContain("data-pro-upgrade-embed");
    expect(html).toContain("WORLDEYE PRO");
    expect(html).toContain("One pass unlocks every premium layer on this board.");
    expect(html).toContain("Maritime Lines");
    expect(html).toContain("Traffic");
  });

  it("offers the three plans with pricing's prices and trial labels", () => {
    const html = render([]);
    for (const s of ["$7.99", "/week", "$13.99", "/month", "$74.99", "/year", "10 days free"]) {
      expect(html).toContain(s);
    }
  });

  it("the primary CTA is the selected plan's own (annual by default)", () => {
    const html = render([]);
    expect(html).toContain("Start 10-Day Free Trial");
    expect(html).toContain(HOSTED_CHECKOUT_LABEL);
    // No invented wallet-branded purchase button anywhere in the embed.
    expect(html).not.toContain("Buy with");
    expect(html).not.toContain("");
  });

  it("renders no checkout sheet until the CTA is clicked", () => {
    const html = render([]);
    expect(html).not.toContain("Loading secure checkout…");
  });
});
