// Render pins for the affiliates layout header + page shell:
//  - signed-in users get a "Back to Globe" button (href "/") in the header
//    action slot — the old "Command Deck" button is gone;
//  - the shell carries .docs-root, which releases the global viewport lock
//    (html/body overflow:hidden for the fullscreen globe) so affiliate pages
//    can actually scroll instead of clipping below the first screen.
// Node harness (renderToString), same pattern as CheckoutClient.test.ts.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(async () => null as { user?: { id?: string } } | null),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));

import AffiliatesLayout from "./layout";

async function renderLayout() {
  const el = await AffiliatesLayout({ children: createElement("div", null, "PAGE") });
  // React SSR splits interpolated text with <!-- --> markers; strip them
  // so assertions read the text a visitor sees.
  return renderToString(el).replace(/<!-- -->/g, "");
}

describe("AffiliatesLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("signed in: header action is Back to Globe (href /), Command Deck is gone", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u1" } });
    const html = await renderLayout();
    expect(html).toContain("← Back to Globe");
    expect(html).toContain('href="/"');
    expect(html).not.toContain("Command Deck");
  });

  it("signed out: header action stays Sign in, no Back to Globe button", async () => {
    mocks.auth.mockResolvedValue(null);
    const html = await renderLayout();
    expect(html).toContain("Sign in");
    expect(html).not.toContain("Command Deck");
  });

  it("shell releases the viewport lock via .docs-root so pages scroll", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u1" } });
    const html = await renderLayout();
    expect(html).toContain("docs-root");
  });
});
